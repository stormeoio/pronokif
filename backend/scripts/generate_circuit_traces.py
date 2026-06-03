"""
Generate accurate F1 2026 circuit traces (SVG paths) from official GPS layouts.

Source of truth for track geometry: the `bacinger/f1-circuits` dataset, which
stores GPS-traced centerlines of every circuit as GeoJSON LineStrings. We
project each trace into the fixed 420x280 SVG coordinate space used by the
`CircuitMap` component, smooth it, then re-anchor the *curated* editorial
hotspots (corner names + FR/EN notes) onto the new geometry via curvature-based
corner detection and the authored turn numbers.

Editorial content (labels, notes, turn numbers, ids, aliases) stays human-owned
in `circuit_maps.py` / `circuitMaps.ts`. This script only (re)generates geometry:

    - backend/data/circuit_geometry.json   (loaded by circuit_maps.py)
    - frontend/src/lib/circuitGeometry.ts   (imported by circuitMaps.ts)

Both artifacts are produced from a single computation so the Python and
TypeScript layers stay in perfect parity.

Usage:
    python backend/scripts/generate_circuit_traces.py
    python backend/scripts/generate_circuit_traces.py --no-fetch   # use cache only
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.request
from pathlib import Path

# --- make `backend` importable when run directly ------------------------------
BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.data.circuit_maps import CIRCUIT_MAPS  # noqa: E402
from backend.data.f1_data import F1_CIRCUITS  # noqa: E402

# --- configuration ------------------------------------------------------------

BACINGER_BASE = "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits"
CACHE_DIR = Path("/tmp/f1_geojson_cache")

JSON_OUT = BACKEND_ROOT / "data" / "circuit_geometry.json"
TS_OUT = REPO_ROOT / "frontend" / "src" / "lib" / "circuitGeometry.ts"

# Fixed SVG frame (must match CircuitMap stroke widths tuned for this box).
VIEW_W, VIEW_H = 420.0, 280.0
PADDING = 38.0  # keep the trace clear of the card edges

# circuit_maps key -> bacinger circuit id
CIRCUIT_BACINGER_ID: dict[str, str] = {
    "albert-park": "au-1953",
    "shanghai": "cn-2004",
    "suzuka": "jp-1962",
    "sakhir": "bh-2002",
    "jeddah": "sa-2021",
    "miami": "us-2022",
    "imola": "it-1953",
    "monaco": "mc-1929",
    "barcelona": "es-1991",
    "montreal": "ca-1978",
    "red-bull-ring": "at-1969",
    "silverstone": "gb-1948",
    "spa-francorchamps": "be-1925",
    "hungaroring": "hu-1986",
    "zandvoort": "nl-1948",
    "monza": "it-1922",
    "madrid": "es-2026",
    "baku": "az-2016",
    "marina-bay": "sg-2008",
    "cota": "us-2012",
    "hermanos-rodriguez": "mx-1962",
    "interlagos": "br-1940",
    "las-vegas": "us-2023",
    "lusail": "qa-2004",
    "yas-marina": "ae-2009",
}

# circuit_maps key -> F1_CIRCUITS name (for the official turn count)
CIRCUIT_INFO_NAME: dict[str, str] = {
    "albert-park": "Albert Park",
    "shanghai": "Shanghai",
    "suzuka": "Suzuka",
    "sakhir": "Sakhir",
    "jeddah": "Jeddah",
    "miami": "Miami",
    "imola": "Imola",
    "monaco": "Monaco",
    "barcelona": "Barcelona",
    "montreal": "Montreal",
    "red-bull-ring": "Red Bull Ring",
    "silverstone": "Silverstone",
    "spa-francorchamps": "Spa-Francorchamps",
    "hungaroring": "Hungaroring",
    "zandvoort": "Zandvoort",
    "monza": "Monza",
    "madrid": "Madrid",
    "baku": "Baku",
    "marina-bay": "Marina Bay",
    "cota": "COTA",
    "hermanos-rodriguez": "Hermanos Rodríguez",
    "interlagos": "Interlagos",
    "las-vegas": "Las Vegas",
    "lusail": "Lusail",
    "yas-marina": "Yas Marina",
}

Point = tuple[float, float]


# --- fetching -----------------------------------------------------------------


def fetch_geojson(bacinger_id: str, allow_fetch: bool) -> dict:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{bacinger_id}.geojson"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    if not allow_fetch:
        raise FileNotFoundError(f"No cache for {bacinger_id} and --no-fetch set")
    url = f"{BACINGER_BASE}/{bacinger_id}.geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "pronokif-circuit-gen/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 (trusted host)
        data = resp.read().decode("utf-8")
    cache_file.write_text(data)
    return json.loads(data)


def extract_coords(geojson: dict) -> list[Point]:
    """Return the longest ring of [lng, lat] coordinates from the GeoJSON."""
    candidates: list[list[Point]] = []

    def collect(geom: dict) -> None:
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        if gtype == "LineString":
            candidates.append([(float(c[0]), float(c[1])) for c in coords])
        elif gtype == "MultiLineString":
            for ring in coords:
                candidates.append([(float(c[0]), float(c[1])) for c in ring])
        elif gtype == "Polygon":
            for ring in coords:
                candidates.append([(float(c[0]), float(c[1])) for c in ring])
        elif gtype == "MultiPolygon":
            for poly in coords:
                for ring in poly:
                    candidates.append([(float(c[0]), float(c[1])) for c in ring])

    if geojson.get("type") == "FeatureCollection":
        for feat in geojson.get("features", []):
            collect(feat.get("geometry", {}))
    elif geojson.get("type") == "Feature":
        collect(geojson.get("geometry", {}))
    else:
        collect(geojson)

    if not candidates:
        raise ValueError("No line geometry found in GeoJSON")
    return max(candidates, key=len)


# --- geometry helpers ---------------------------------------------------------


def project_and_fit(coords: list[Point]) -> list[Point]:
    """Equirectangular projection then fit into the padded 420x280 box (y flipped)."""
    lat0 = sum(lat for _, lat in coords) / len(coords)
    k = math.cos(math.radians(lat0))
    planar = [(lng * k, lat) for lng, lat in coords]

    xs = [p[0] for p in planar]
    ys = [p[1] for p in planar]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    w = max(maxx - minx, 1e-9)
    h = max(maxy - miny, 1e-9)

    avail_w = VIEW_W - 2 * PADDING
    avail_h = VIEW_H - 2 * PADDING
    scale = min(avail_w / w, avail_h / h)

    draw_w = w * scale
    draw_h = h * scale
    off_x = (VIEW_W - draw_w) / 2
    off_y = (VIEW_H - draw_h) / 2

    out: list[Point] = []
    for x, y in planar:
        sx = off_x + (x - minx) * scale
        sy = off_y + (maxy - y) * scale  # flip: north is up
        out.append((sx, sy))
    return out


def _dist(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def ensure_open_loop(pts: list[Point]) -> list[Point]:
    """Drop a duplicated closing vertex so resampling treats it as a clean loop."""
    if len(pts) > 2 and _dist(pts[0], pts[-1]) < 1e-6:
        return pts[:-1]
    return pts


def resample_uniform(pts: list[Point], n: int) -> list[Point]:
    """Resample a closed polyline to n points evenly spaced by arc length."""
    loop = pts + [pts[0]]
    seg = [_dist(loop[i], loop[i + 1]) for i in range(len(loop) - 1)]
    total = sum(seg)
    if total <= 0:
        return pts[:]
    step = total / n
    out: list[Point] = []
    d_target = 0.0
    i = 0
    acc = 0.0
    for _ in range(n):
        while i < len(seg) and acc + seg[i] < d_target:
            acc += seg[i]
            i += 1
        if i >= len(seg):
            out.append(loop[-1])
            continue
        remain = d_target - acc
        t = remain / seg[i] if seg[i] > 0 else 0.0
        a, b = loop[i], loop[i + 1]
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        d_target += step
    return out


def smooth_closed(pts: list[Point], window: int = 2, passes: int = 1) -> list[Point]:
    """Light circular moving-average to tame GPS jitter without rounding corners."""
    out = pts[:]
    n = len(out)
    for _ in range(passes):
        nxt: list[Point] = []
        for i in range(n):
            sx = sy = 0.0
            cnt = 0
            for k in range(-window, window + 1):
                px, py = out[(i + k) % n]
                sx += px
                sy += py
                cnt += 1
            nxt.append((sx / cnt, sy / cnt))
        out = nxt
    return out


def turn_angle(prev: Point, cur: Point, nxt: Point) -> float:
    """Absolute heading change at `cur` in radians."""
    v1 = (cur[0] - prev[0], cur[1] - prev[1])
    v2 = (nxt[0] - cur[0], nxt[1] - cur[1])
    a1 = math.atan2(v1[1], v1[0])
    a2 = math.atan2(v2[1], v2[0])
    d = a2 - a1
    while d > math.pi:
        d -= 2 * math.pi
    while d < -math.pi:
        d += 2 * math.pi
    return abs(d)


def detect_corner_fractions(pts: list[Point]) -> list[float]:
    """Return lap fractions [0,1) of detected corners, ordered along the lap."""
    n = len(pts)
    angles = [turn_angle(pts[(i - 1) % n], pts[i], pts[(i + 1) % n]) for i in range(n)]
    # accumulate heading change over a small window to merge multi-apex corners
    win = max(2, n // 90)
    score = []
    for i in range(n):
        s = 0.0
        for k in range(-win, win + 1):
            s += angles[(i + k) % n]
        score.append(s)

    threshold = math.radians(22)
    min_gap = max(3, n // 40)
    peaks: list[tuple[int, float]] = []
    for i in range(n):
        if score[i] < threshold:
            continue
        # local maximum within +/- min_gap
        is_peak = True
        for k in range(1, min_gap + 1):
            if score[(i - k) % n] > score[i] or score[(i + k) % n] > score[i]:
                is_peak = False
                break
        if is_peak:
            peaks.append((i, score[i]))

    # de-duplicate peaks that are too close, keeping the sharpest
    peaks.sort(key=lambda t: t[0])
    merged: list[int] = []
    for idx, _ in peaks:
        if merged and (idx - merged[-1]) < min_gap:
            if score[idx] > score[merged[-1]]:
                merged[-1] = idx
            continue
        merged.append(idx)
    return [idx / n for idx in merged]


def point_at_fraction(pts: list[Point], frac: float) -> Point:
    n = len(pts)
    f = frac % 1.0
    pos = f * n
    i = int(pos) % n
    t = pos - int(pos)
    a, b = pts[i], pts[(i + 1) % n]
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def rdp(pts: list[Point], epsilon: float) -> list[Point]:
    """Ramer-Douglas-Peucker simplification of an open polyline."""
    if len(pts) < 3:
        return pts[:]
    start, end = pts[0], pts[-1]
    dmax, index = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = _perp_dist(pts[i], start, end)
        if d > dmax:
            dmax, index = d, i
    if dmax > epsilon:
        left = rdp(pts[: index + 1], epsilon)
        right = rdp(pts[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def _perp_dist(p: Point, a: Point, b: Point) -> float:
    if a == b:
        return _dist(p, a)
    num = abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1]))
    return num / _dist(a, b)


def simplify_closed(pts: list[Point], epsilon: float) -> list[Point]:
    """RDP on a closed loop (anchor the split at the start vertex)."""
    simplified = rdp(pts + [pts[0]], epsilon)
    if len(simplified) > 1 and _dist(simplified[0], simplified[-1]) < 1e-6:
        simplified = simplified[:-1]
    return simplified


def catmull_rom_closed_path(pts: list[Point]) -> str:
    """Smooth closed SVG path (cubic Bezier) through all points."""
    n = len(pts)

    def r(v: float) -> float:
        return round(v, 1)

    d = f"M{r(pts[0][0])} {r(pts[0][1])}"
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]
        c1x = p1[0] + (p2[0] - p0[0]) / 6.0
        c1y = p1[1] + (p2[1] - p0[1]) / 6.0
        c2x = p2[0] - (p3[0] - p1[0]) / 6.0
        c2y = p2[1] - (p3[1] - p1[1]) / 6.0
        d += f" C{r(c1x)} {r(c1y)} {r(c2x)} {r(c2y)} {r(p2[0])} {r(p2[1])}"
    d += " Z"
    return d


def polyline_window_path(dense: list[Point], f0: float, f1: float) -> str:
    """An M/L sub-path of the dense trace between two lap fractions (for zones)."""
    n = len(dense)
    i0 = int((f0 % 1.0) * n)
    i1 = int((f1 % 1.0) * n)

    def r(v: float) -> float:
        return round(v, 1)

    idxs: list[int] = []
    i = i0
    # walk forward (wrapping) until we reach i1
    guard = 0
    while True:
        idxs.append(i % n)
        if i % n == i1 % n:
            break
        i += 1
        guard += 1
        if guard > n:
            break
    pts = [dense[i] for i in idxs]
    if len(pts) < 2:
        pts = [dense[i0 % n], dense[(i0 + 1) % n]]
    d = f"M{r(pts[0][0])} {r(pts[0][1])}"
    for p in pts[1:]:
        d += f" L{r(p[0])} {r(p[1])}"
    return d


# --- re-anchoring -------------------------------------------------------------


def map_turn_to_fraction(turn: int, total_turns: int, detected: list[float]) -> float:
    if detected:
        denom = max(total_turns - 1, 1)
        ratio = (turn - 1) / denom
        idx = round(ratio * (len(detected) - 1))
        idx = max(0, min(len(detected) - 1, idx))
        return detected[idx]
    return ((turn - 0.5) / max(total_turns, 1)) % 1.0


def anchor_features(
    features: list[dict],
    total_turns: int,
    detected: list[float],
) -> dict[int, float]:
    """Assign a lap fraction to every curated feature (by index)."""
    anchors: dict[int, float] = {}
    for idx, feat in enumerate(features):
        kind = feat.get("kind")
        if kind == "start":
            anchors[idx] = 0.0
        elif kind == "corner" and feat.get("turn"):
            anchors[idx] = map_turn_to_fraction(int(feat["turn"]), total_turns, detected)

    # Interpolate the rest (sector / drs / unnumbered corners) between anchored
    # neighbours, preserving the authored lap order of the features array.
    n = len(features)
    for idx in range(n):
        if idx in anchors:
            continue
        prev_idx = next((j for j in range(idx - 1, -1, -1) if j in anchors), None)
        next_idx = next((j for j in range(idx + 1, n) if j in anchors), None)
        prev_f = anchors[prev_idx] if prev_idx is not None else 0.0
        next_f = anchors[next_idx] if next_idx is not None else 1.0
        if next_f <= prev_f:
            next_f = prev_f + 0.12
        # how many unanchored in this gap, and where does idx sit?
        gap_start = (prev_idx + 1) if prev_idx is not None else 0
        gap_end = (next_idx - 1) if next_idx is not None else (n - 1)
        span = gap_end - gap_start + 1
        rank = idx - gap_start + 1
        anchors[idx] = prev_f + (next_f - prev_f) * (rank / (span + 1))
    return anchors


# --- main generation ----------------------------------------------------------


def generate(allow_fetch: bool) -> dict[str, dict]:
    geometry: dict[str, dict] = {}
    summary: list[str] = []

    for circuit_map in CIRCUIT_MAPS:
        key = circuit_map["key"]
        bid = CIRCUIT_BACINGER_ID.get(key)
        if not bid:
            summary.append(f"  SKIP {key}: no bacinger id mapping")
            continue
        try:
            gj = fetch_geojson(bid, allow_fetch)
            raw = extract_coords(gj)
        except Exception as exc:  # noqa: BLE001
            summary.append(f"  FAIL {key} ({bid}): {exc}")
            continue

        fitted = project_and_fit(raw)
        loop = ensure_open_loop(fitted)
        dense = smooth_closed(resample_uniform(loop, 360), window=2, passes=1)

        detected = detect_corner_fractions(dense)
        info_name = CIRCUIT_INFO_NAME.get(key, "")
        total_turns = int(F1_CIRCUITS.get(info_name, {}).get("turns") or 0) or max(
            (int(f.get("turn") or 0) for f in circuit_map.get("features", [])),
            default=len(detected) or 1,
        )

        # Build a compact smooth path from a simplified version of the dense loop.
        simplified = simplify_closed(dense, epsilon=1.1)
        if len(simplified) < 12:
            simplified = resample_uniform(loop, 80)
        track_path = catmull_rom_closed_path(simplified)

        # Re-anchor features and zones onto the dense (accurate) trace.
        features = circuit_map.get("features", [])
        anchors = anchor_features(features, total_turns, detected)
        feature_xy: dict[str, list[float]] = {}
        for idx, feat in enumerate(features):
            x, y = point_at_fraction(dense, anchors[idx])
            feature_xy[feat["id"]] = [round(x, 1), round(y, 1)]

        # Zones become highlighted spans around their estimated lap fraction.
        zones = circuit_map.get("zones", [])
        zone_paths: dict[str, str] = {}
        # estimate a fraction per zone by matching its id/kind to nearby features
        for z_index, zone in enumerate(zones):
            center = _estimate_zone_fraction(zone, features, anchors, z_index, len(zones))
            half = 0.045 if zone.get("kind") == "drs" else 0.085
            zone_paths[zone["id"]] = polyline_window_path(dense, center - half, center + half)

        geometry[key] = {
            "viewBox": f"0 0 {int(VIEW_W)} {int(VIEW_H)}",
            "trackPath": track_path,
            "racingLinePath": track_path,
            "features": feature_xy,
            "zones": zone_paths,
        }
        summary.append(
            f"  OK   {key:<20} pts={len(simplified):<3} corners={len(detected):<2} "
            f"turns={total_turns:<2} feat={len(features)} zones={len(zones)}"
        )

    print("\n".join(summary))
    return geometry


def _estimate_zone_fraction(
    zone: dict,
    features: list[dict],
    anchors: dict[int, float],
    z_index: int,
    z_total: int,
) -> float:
    """Pick a lap fraction for a zone, biased toward a feature of the same kind."""
    zone_kind = zone.get("kind")
    same_kind = [anchors[i] for i, f in enumerate(features) if f.get("kind") == zone_kind]
    if same_kind:
        # spread multiple zones of the same kind across their feature anchors
        return same_kind[min(z_index, len(same_kind) - 1)]
    if z_total > 0:
        return (z_index + 0.5) / z_total
    return 0.5


# --- serialization ------------------------------------------------------------


def write_json(geometry: dict[str, dict]) -> None:
    JSON_OUT.write_text(json.dumps(geometry, ensure_ascii=False, indent=2) + "\n")
    print(f"  wrote {JSON_OUT.relative_to(REPO_ROOT)}")


def write_ts(geometry: dict[str, dict]) -> None:
    header = (
        "// AUTO-GENERATED by backend/scripts/generate_circuit_traces.py\n"
        "// Do not edit by hand. Geometry is derived from official GPS circuit traces\n"
        "// (bacinger/f1-circuits) and overlaid onto curated editorial data in circuitMaps.ts.\n\n"
        "export interface CircuitGeometry {\n"
        "  viewBox: string;\n"
        "  trackPath: string;\n"
        "  racingLinePath: string;\n"
        "  features: Record<string, [number, number]>;\n"
        "  zones: Record<string, string>;\n"
        "}\n\n"
        "export const CIRCUIT_GEOMETRY: Record<string, CircuitGeometry> = "
    )
    body = json.dumps(geometry, ensure_ascii=False, indent=2)
    TS_OUT.write_text(header + body + ";\n")
    print(f"  wrote {TS_OUT.relative_to(REPO_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate F1 circuit traces")
    parser.add_argument("--no-fetch", action="store_true", help="use cached GeoJSON only")
    args = parser.parse_args()

    print("Generating circuit traces from official GPS layouts...")
    geometry = generate(allow_fetch=not args.no_fetch)
    print(f"\nGenerated geometry for {len(geometry)} circuits.")
    write_json(geometry)
    write_ts(geometry)


if __name__ == "__main__":
    main()
