export interface LocalizedCircuitText {
  fr: string;
  en: string;
}

export type CircuitFeatureKind = "start" | "corner" | "sector" | "drs";

export interface CircuitMapFeature {
  id: string;
  kind: CircuitFeatureKind;
  x: number;
  y: number;
  label: LocalizedCircuitText;
  note: LocalizedCircuitText;
  turn?: number;
}

export interface CircuitMapZone {
  id: string;
  kind: "sector" | "drs";
  path: string;
  label: LocalizedCircuitText;
  note: LocalizedCircuitText;
}

export interface CircuitMapData {
  key: string;
  circuitName: string;
  aliases: string[];
  fallbackImageUrl: string;
  viewBox: string;
  trackPath?: string;
  racingLinePath?: string;
  features: CircuitMapFeature[];
  zones: CircuitMapZone[];
}

export const CIRCUIT_IMAGES: Record<string, string> = {
  "Albert Park":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Albert_Park_Circuit_2021.svg/400px-Albert_Park_Circuit_2021.svg.png",
  Shanghai:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Shanghai_International_Racing_Circuit_track_map.svg/400px-Shanghai_International_Racing_Circuit_track_map.svg.png",
  Suzuka:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Suzuka_circuit_map--2005.svg/400px-Suzuka_circuit_map--2005.svg.png",
  Sakhir:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Bahrain_International_Circuit--Grand_Prix_Layout.svg/400px-Bahrain_International_Circuit--Grand_Prix_Layout.svg.png",
  Jeddah:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Jeddah_Street_Circuit_2021.svg/400px-Jeddah_Street_Circuit_2021.svg.png",
  Miami:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Miami_International_Autodrome_track_map.svg/400px-Miami_International_Autodrome_track_map.svg.png",
  Imola:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Imola_2009.svg/400px-Imola_2009.svg.png",
  Monaco:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Monte_Carlo_Formula_1_track_map.svg/400px-Monte_Carlo_Formula_1_track_map.svg.png",
  Barcelona:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Circuit_Catalunya_2021.svg/400px-Circuit_Catalunya_2021.svg.png",
  Montreal:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Circuit_Gilles_Villeneuve.svg/400px-Circuit_Gilles_Villeneuve.svg.png",
  "Red Bull Ring":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Circuit_Red_Bull_Ring.svg/400px-Circuit_Red_Bull_Ring.svg.png",
  Silverstone:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Circuit_Silverstone_2020.svg/400px-Circuit_Silverstone_2020.svg.png",
  "Spa-Francorchamps":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Circuit_de_Spa-Francorchamps_2022.svg/400px-Circuit_de_Spa-Francorchamps_2022.svg.png",
  Hungaroring:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Hungaroring.svg/400px-Hungaroring.svg.png",
  Zandvoort:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Circuit_Zandvoort_layout_2020.svg/400px-Circuit_Zandvoort_layout_2020.svg.png",
  Monza:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Autodromo_Nazionale_Monza_track_map.svg/400px-Autodromo_Nazionale_Monza_track_map.svg.png",
  "Marina Bay":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Marina_Bay_Circuit_2023.svg/400px-Marina_Bay_Circuit_2023.svg.png",
  COTA: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Circuit_of_the_Americas_track_map.svg/400px-Circuit_of_the_Americas_track_map.svg.png",
  "Hermanos Rodríguez":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg/400px-Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg.png",
  Interlagos:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg/400px-Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg.png",
  "Las Vegas":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Las_Vegas_Street_Circuit_2023.svg/400px-Las_Vegas_Street_Circuit_2023.svg.png",
  Lusail:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lusail_International_Circuit_Formula_One_layout_2023.svg/400px-Lusail_International_Circuit_Formula_One_layout_2023.svg.png",
  "Yas Marina":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Yas_Marina_Circuit_2021.svg/400px-Yas_Marina_Circuit_2021.svg.png",
  Baku: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Baku_Formula_One_circuit_map.svg/400px-Baku_Formula_One_circuit_map.svg.png",
  Madrid:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Madrid_Grand_Prix_circuit.svg/400px-Madrid_Grand_Prix_circuit.svg.png",
};

const mapText = (fr: string, en: string): LocalizedCircuitText => ({ fr, en });

export const CIRCUIT_MAPS: CircuitMapData[] = [
  {
    key: "albert-park",
    circuitName: "Albert Park",
    aliases: ["Albert Park", "Albert Park Circuit", "Australian Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Albert Park"],
    viewBox: "0 0 420 280",
    trackPath:
      "M95 198 C78 170 83 126 112 94 C143 60 198 53 245 70 C292 87 333 118 337 158 C341 200 302 225 254 218 C218 213 204 190 173 205 C142 221 111 224 95 198 Z",
    racingLinePath:
      "M105 191 C91 168 96 130 120 102 C150 68 197 64 240 79 C281 94 320 121 323 156 C326 189 294 208 254 203 C215 198 201 178 170 194 C143 208 117 211 105 191 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 102,
        y: 187,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Point de départ des lectures premier virage et des scénarios d'ouverture.",
          "Reference point for turn-one reads and opening-lap scenarios.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 86,
        y: 151,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Freinage dense après la ligne droite : zone clé pour le leader au premier virage.",
          "Heavy braking after the straight: key zone for the first-corner leader pick.",
        ),
      },
      {
        id: "lakeside",
        kind: "sector",
        x: 250,
        y: 76,
        label: mapText("Portion rapide", "Fast section"),
        note: mapText(
          "Enchaînement fluide où le rythme pur pèse davantage que la traction.",
          "Flowing section where pure pace matters more than traction.",
        ),
      },
      {
        id: "drs-main",
        kind: "drs",
        x: 260,
        y: 214,
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Zone de dépassement prioritaire, utile pour contextualiser les remontées.",
          "Primary overtaking zone, useful context for comeback scenarios.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main-zone",
        kind: "drs",
        path: "M190 215 C220 205 235 215 266 218 C294 221 317 211 331 190",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La ligne droite de retour concentre l'essentiel des attaques.",
          "The back straight concentrates most attacks.",
        ),
      },
    ],
  },
  {
    key: "suzuka",
    circuitName: "Suzuka",
    aliases: ["Suzuka", "Suzuka International Racing Course", "Japanese Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Suzuka,
    viewBox: "0 0 420 280",
    trackPath:
      "M75 171 C96 120 130 91 178 90 C230 89 270 124 249 159 C229 190 169 175 173 132 C177 86 224 55 285 72 C347 89 363 139 326 176 C292 211 233 210 205 186 C178 164 144 168 113 202 C97 219 72 203 75 171 Z",
    racingLinePath:
      "M90 169 C110 127 137 105 177 104 C217 103 247 126 233 152 C220 176 181 163 186 132 C191 96 230 73 280 86 C331 100 342 137 313 165 C287 191 236 190 214 172 C185 148 143 166 120 194 C105 212 88 197 90 169 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 91,
        y: 169,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ exposé avant un premier freinage très engagé.",
          "Exposed start before a committed first braking zone.",
        ),
      },
      {
        id: "esses",
        kind: "sector",
        x: 161,
        y: 93,
        label: mapText("Esses", "Esses"),
        note: mapText(
          "Séquence de précision qui révèle l'équilibre aero-mécanique.",
          "Precision sequence that reveals aero-mechanical balance.",
        ),
      },
      {
        id: "hairpin",
        kind: "corner",
        turn: 11,
        x: 249,
        y: 160,
        label: mapText("Épingle", "Hairpin"),
        note: mapText(
          "Point de traction et de patience, propice aux écarts de rythme.",
          "Traction and patience point, prone to pace differences.",
        ),
      },
      {
        id: "130r",
        kind: "corner",
        turn: 15,
        x: 320,
        y: 177,
        label: mapText("130R", "130R"),
        note: mapText(
          "Repère iconique de vitesse avant la chicane finale.",
          "Iconic speed marker before the final chicane.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main-zone",
        kind: "drs",
        path: "M87 172 C105 128 133 100 177 99",
        label: mapText("DRS ligne droite", "Pit straight DRS"),
        note: mapText(
          "Activation principale vers le premier virage.",
          "Main activation toward turn one.",
        ),
      },
    ],
  },
  {
    key: "monaco",
    circuitName: "Monaco",
    aliases: ["Monaco", "Circuit de Monaco", "Monte Carlo", "Monaco Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Monaco,
    viewBox: "0 0 420 280",
    trackPath:
      "M78 190 C96 160 119 133 151 124 C177 116 191 91 202 67 C216 38 259 39 280 66 C295 85 282 108 254 116 C232 122 229 142 252 156 C283 175 324 154 340 181 C359 214 313 237 268 222 C233 210 211 230 178 222 C145 214 103 232 80 208 C73 201 72 196 78 190 Z",
    racingLinePath:
      "M91 187 C107 161 127 140 155 132 C188 122 193 84 212 65 C229 48 259 52 271 70 C281 85 269 98 249 103 C213 112 216 147 247 166 C282 187 320 169 327 188 C336 212 302 223 270 211 C231 197 213 218 181 211 C147 203 113 218 91 202 C84 197 86 193 91 187 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 92,
        y: 187,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "La courte accélération rend le placement initial critique.",
          "The short launch makes initial positioning critical.",
        ),
      },
      {
        id: "sainte-devote",
        kind: "corner",
        turn: 1,
        x: 79,
        y: 191,
        label: mapText("Sainte-Dévote", "Sainte Devote"),
        note: mapText(
          "Premier virage très serré, central pour les bonus de départ.",
          "Tight first corner, central to start-related bonuses.",
        ),
      },
      {
        id: "hairpin",
        kind: "corner",
        turn: 6,
        x: 255,
        y: 116,
        label: mapText("Épingle Fairmont", "Fairmont Hairpin"),
        note: mapText(
          "Point le plus lent du calendrier, souvent décisif pour le trafic.",
          "Slowest point of the calendar, often decisive for traffic.",
        ),
      },
      {
        id: "tunnel",
        kind: "sector",
        x: 332,
        y: 180,
        label: mapText("Tunnel", "Tunnel"),
        note: mapText(
          "Transition haute vitesse avant le freinage de la Nouvelle Chicane.",
          "High-speed transition before the Nouvelle Chicane braking zone.",
        ),
      },
      {
        id: "piscine",
        kind: "sector",
        x: 221,
        y: 217,
        label: mapText("Piscine", "Swimming Pool"),
        note: mapText(
          "Séquence de précision où la moindre erreur coûte cher.",
          "Precision sequence where every mistake is expensive.",
        ),
      },
    ],
    zones: [
      {
        id: "sector-portier-tunnel",
        kind: "sector",
        path: "M250 116 C229 123 229 143 252 156 C282 174 319 155 337 178",
        label: mapText("Portier - Tunnel", "Portier to Tunnel"),
        note: mapText(
          "Portion d'élan qui conditionne le freinage suivant.",
          "Momentum section that sets up the next braking zone.",
        ),
      },
    ],
  },
  {
    key: "silverstone",
    circuitName: "Silverstone",
    aliases: ["Silverstone", "Silverstone Circuit", "British Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Silverstone,
    viewBox: "0 0 420 280",
    trackPath:
      "M73 161 C83 105 124 75 179 82 C224 88 233 118 273 102 C315 86 357 111 351 153 C345 197 295 206 260 184 C232 166 209 183 195 215 C180 250 118 235 105 200 C96 176 68 190 73 161 Z",
    racingLinePath:
      "M89 160 C96 116 129 92 177 97 C226 102 235 133 277 117 C309 105 338 122 337 152 C336 181 297 190 267 169 C226 141 204 176 190 207 C178 234 133 222 120 193 C109 168 86 180 89 160 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 91,
        y: 161,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ vers Abbey, avec une très forte charge en pneus froids.",
          "Launch toward Abbey, with high load on cold tyres.",
        ),
      },
      {
        id: "maggotts",
        kind: "sector",
        x: 272,
        y: 104,
        label: mapText("Maggotts-Becketts", "Maggotts-Becketts"),
        note: mapText(
          "La signature du circuit : vitesse, appui et engagement.",
          "The circuit signature: speed, downforce and commitment.",
        ),
      },
      {
        id: "stowe",
        kind: "corner",
        turn: 15,
        x: 350,
        y: 153,
        label: mapText("Stowe", "Stowe"),
        note: mapText(
          "Freinage à haute vitesse après Hangar Straight.",
          "High-speed braking after Hangar Straight.",
        ),
      },
      {
        id: "club",
        kind: "corner",
        turn: 18,
        x: 199,
        y: 214,
        label: mapText("Club", "Club"),
        note: mapText(
          "Sortie capitale pour défendre ou attaquer dans la ligne droite.",
          "Critical exit to attack or defend on the straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-hangar",
        kind: "drs",
        path: "M278 104 C314 88 356 112 351 153",
        label: mapText("DRS Hangar Straight", "Hangar Straight DRS"),
        note: mapText(
          "Fenêtre d'attaque majeure avant Stowe.",
          "Major attack window before Stowe.",
        ),
      },
    ],
  },
  {
    key: "spa-francorchamps",
    circuitName: "Spa-Francorchamps",
    aliases: ["Spa-Francorchamps", "Circuit de Spa-Francorchamps", "Belgian Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Spa-Francorchamps"],
    viewBox: "0 0 420 280",
    trackPath:
      "M74 192 C92 141 132 141 155 93 C177 47 230 38 274 67 C314 93 319 138 286 162 C255 184 241 223 198 231 C157 238 119 224 99 214 C83 206 68 210 74 192 Z",
    racingLinePath:
      "M90 188 C107 148 141 143 164 96 C184 57 229 53 265 76 C299 98 301 133 276 151 C243 175 232 209 196 217 C161 225 127 213 107 202 C93 195 85 202 90 188 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 91,
        y: 188,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ court avant La Source puis la montée vers l'Eau Rouge.",
          "Short launch before La Source and the climb to Eau Rouge.",
        ),
      },
      {
        id: "la-source",
        kind: "corner",
        turn: 1,
        x: 73,
        y: 192,
        label: mapText("La Source", "La Source"),
        note: mapText(
          "Épingle de départ, fréquente source d'écarts au premier tour.",
          "Opening hairpin, often a source of lap-one gaps.",
        ),
      },
      {
        id: "eau-rouge",
        kind: "sector",
        x: 156,
        y: 94,
        label: mapText("Eau Rouge / Raidillon", "Eau Rouge / Raidillon"),
        note: mapText(
          "Montée mythique qui conditionne toute la ligne de Kemmel.",
          "Iconic climb that sets up the Kemmel straight.",
        ),
      },
      {
        id: "pouhon",
        kind: "corner",
        turn: 10,
        x: 286,
        y: 162,
        label: mapText("Pouhon", "Pouhon"),
        note: mapText(
          "Grand appui rapide, excellent révélateur du rythme course.",
          "Fast high-load corner, a strong race-pace indicator.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-kemmel",
        kind: "drs",
        path: "M157 93 C179 47 231 40 274 67",
        label: mapText("DRS Kemmel", "Kemmel DRS"),
        note: mapText(
          "Zone d'aspiration et de dépassement la plus évidente.",
          "The clearest slipstream and overtaking zone.",
        ),
      },
    ],
  },
  {
    key: "monza",
    circuitName: "Monza",
    aliases: ["Monza", "Autodromo Nazionale Monza", "Italian Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Monza,
    viewBox: "0 0 420 280",
    trackPath:
      "M78 198 C91 116 131 55 206 55 C293 55 338 111 318 157 C298 202 235 185 213 224 C193 260 106 247 82 217 C77 211 76 204 78 198 Z",
    racingLinePath:
      "M93 195 C106 125 139 71 206 71 C279 71 317 114 303 151 C289 187 238 172 222 211 C207 244 132 233 99 211 C92 206 91 201 93 195 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 94,
        y: 195,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Longue pleine charge vers Rettifilo : aspiration immédiate.",
          "Long full-throttle run to Rettifilo: instant slipstream.",
        ),
      },
      {
        id: "rettifilo",
        kind: "corner",
        turn: 1,
        x: 79,
        y: 198,
        label: mapText("Variante del Rettifilo", "Rettifilo chicane"),
        note: mapText(
          "Freinage le plus important du tour, capital pour le premier virage.",
          "The lap's biggest braking zone, crucial for turn-one picks.",
        ),
      },
      {
        id: "lesmo",
        kind: "sector",
        x: 319,
        y: 156,
        label: mapText("Lesmo", "Lesmo"),
        note: mapText(
          "Double droite où la vitesse minimale prépare Ascari.",
          "Double right-hander where minimum speed sets up Ascari.",
        ),
      },
      {
        id: "parabolica",
        kind: "corner",
        turn: 11,
        x: 213,
        y: 223,
        label: mapText("Parabolica", "Parabolica"),
        note: mapText(
          "Sortie décisive pour l'attaque suivante en ligne droite.",
          "Decisive exit for the next straight-line attack.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M217 223 C196 259 108 246 82 217 C77 210 76 204 78 198",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La pleine charge la plus punitive pour les défenses fragiles.",
          "Full throttle section that punishes fragile defending.",
        ),
      },
    ],
  },
];

const normalizeCircuitKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const mapLookup = new Map<string, CircuitMapData>();

for (const circuitMap of CIRCUIT_MAPS) {
  for (const alias of [circuitMap.circuitName, ...circuitMap.aliases]) {
    mapLookup.set(normalizeCircuitKey(alias), circuitMap);
  }
}

export function getCircuitMapData(circuitName?: string | null): CircuitMapData | null {
  if (!circuitName) return null;
  return mapLookup.get(normalizeCircuitKey(circuitName)) ?? null;
}

export function getCircuitImageUrl(circuitName?: string | null): string | undefined {
  if (!circuitName) return undefined;
  const normalized = normalizeCircuitKey(circuitName);
  const direct = Object.entries(CIRCUIT_IMAGES).find(
    ([name]) => normalizeCircuitKey(name) === normalized,
  );
  return direct?.[1] ?? getCircuitMapData(circuitName)?.fallbackImageUrl;
}

export function circuitText(text: LocalizedCircuitText, locale: "fr" | "en" = "fr") {
  return text[locale] || text.fr;
}
