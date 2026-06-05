"""
PRONOKIF — Driver photo processing service.

Normalizes uploaded driver headshots to match the F1 CDN visual style:
  1. Centre-crop to square (1:1)
  2. Resize to TARGET_SIZE (1024x1024)
  3. Auto-contrast normalization (gentle — preserves skin tones)
  4. Team-gradient overlay (team color fading from bottom to transparent)
  5. Re-encode as high-quality JPEG

The result is visually consistent with the official F1 media headshots
used by the other 20 drivers.
"""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageEnhance

TARGET_SIZE = 1024

# Team primary colours — same palette as the frontend TEAM_COLORS dict
TEAM_COLORS: dict[str, tuple[int, int, int]] = {
    "McLaren":         (255, 128, 0),
    "Mercedes":        (39, 244, 210),
    "Ferrari":         (232, 0, 45),
    "Red Bull Racing": (54, 113, 198),
    "Williams":        (100, 196, 255),
    "Racing Bulls":    (102, 146, 255),
    "Aston Martin":    (34, 153, 113),
    "Haas":            (182, 186, 189),
    "Alpine":          (255, 135, 188),
    "Audi":            (82, 226, 82),
    "Cadillac":        (200, 200, 200),
}


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert '#RRGGBB' to (R, G, B)."""
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _team_rgb(team: str | None) -> tuple[int, int, int]:
    """Resolve a team name to its primary RGB colour."""
    if not team:
        return (100, 100, 100)
    t = team.strip()
    if t in TEAM_COLORS:
        return TEAM_COLORS[t]
    # Fuzzy match
    lower = t.lower()
    for key, rgb in TEAM_COLORS.items():
        if key.lower() in lower or lower in key.lower():
            return rgb
    return (100, 100, 100)


def centre_crop_square(img: Image.Image) -> Image.Image:
    """Crop the centre of the image to a 1:1 square."""
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def apply_gradient_overlay(
    img: Image.Image,
    color: tuple[int, int, int],
    strength: float = 0.45,
    coverage: float = 0.40,
) -> Image.Image:
    """Apply a team-colour gradient from the bottom edge upward.

    Args:
        color: RGB team colour.
        strength: max opacity of the gradient (0-1). 0.45 = visible but not
            overwhelming, matching the F1 CDN style.
        coverage: fraction of image height that the gradient covers (0-1).
    """
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    gradient_h = int(h * coverage)
    for y in range(gradient_h):
        progress = y / max(gradient_h - 1, 1)  # 0 at top of gradient, 1 at bottom
        alpha = int(255 * strength * progress)
        draw.line([(0, h - gradient_h + y), (w, h - gradient_h + y)], fill=(*color, alpha))

    # Composite onto the image
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return Image.alpha_composite(img, overlay)


def normalize_contrast(img: Image.Image, factor: float = 1.08) -> Image.Image:
    """Gently boost contrast. factor=1.0 is no change, 1.08 is subtle."""
    enhancer = ImageEnhance.Contrast(img)
    return enhancer.enhance(factor)


def normalize_brightness(img: Image.Image, factor: float = 1.04) -> Image.Image:
    """Gently boost brightness. Compensates for dark team suits."""
    enhancer = ImageEnhance.Brightness(img)
    return enhancer.enhance(factor)


def process_driver_photo(
    image_bytes: bytes,
    team: str | None = None,
    *,
    apply_team_gradient: bool = True,
    target_size: int = TARGET_SIZE,
    jpeg_quality: int = 92,
) -> bytes:
    """Process a raw driver photo into the Pronokif standard format.

    Returns JPEG bytes ready to be stored in the media collection.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert palette / grayscale to RGBA
    if img.mode in ("P", "L", "LA") or img.mode != "RGBA":
        img = img.convert("RGBA")

    # 1. Centre-crop to square
    img = centre_crop_square(img)

    # 2. Resize to target
    img = img.resize((target_size, target_size), Image.LANCZOS)

    # 3. Gentle contrast + brightness normalization
    img = normalize_contrast(img.convert("RGBA"), factor=1.08)
    img = normalize_brightness(img, factor=1.04)

    # 4. Team gradient overlay (bottom 40%, 45% max opacity)
    if apply_team_gradient and team:
        color = _team_rgb(team)
        img = apply_gradient_overlay(img, color, strength=0.45, coverage=0.40)

    # 5. Flatten to RGB + encode as JPEG
    final = Image.new("RGB", img.size, (11, 13, 18))  # pk-carbon background
    final.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)

    buf = io.BytesIO()
    final.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
    return buf.getvalue()
