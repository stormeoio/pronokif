import { CIRCUIT_GEOMETRY } from "./circuitGeometry";

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

export interface CircuitFirstCorner {
  hotspotId: string;
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
  firstCorner?: CircuitFirstCorner;
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

const firstCorner = (hotspotId: string, fr: string, en: string): CircuitFirstCorner => ({
  hotspotId,
  label: mapText(fr, en),
  note: mapText(
    "Repère canonique utilisé pour les statistiques pilotes au premier virage.",
    "Canonical reference used for driver first-corner statistics.",
  ),
});

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
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 112,
        y: 126,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier point de freinage avant l'entrée dans les Esses.",
          "First braking reference before the entry into the Esses.",
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
    key: "barcelona",
    circuitName: "Barcelona",
    aliases: [
      "Barcelona",
      "Circuit de Barcelona-Catalunya",
      "Circuit Catalunya",
      "Spanish Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.Barcelona,
    viewBox: "0 0 420 280",
    trackPath:
      "M83 196 C94 129 129 77 196 74 C268 71 328 104 337 154 C347 211 294 238 244 213 C211 196 201 166 166 181 C132 195 114 231 86 215 C79 211 80 203 83 196 Z",
    racingLinePath:
      "M98 192 C109 137 139 93 198 89 C255 86 309 111 321 153 C335 200 289 220 250 201 C213 183 205 152 163 168 C135 179 119 211 99 202 C95 200 95 196 98 192 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 99,
        y: 191,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Longue accélération vers le premier freinage : aspiration immédiate et départ critique.",
          "Long launch toward the first braking zone: instant slipstream and a critical start.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 84,
        y: 196,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Principal point de dépassement, central pour les lectures de premier tour.",
          "Primary overtaking point, central to opening-lap reads.",
        ),
      },
      {
        id: "turn-3",
        kind: "corner",
        turn: 3,
        x: 196,
        y: 74,
        label: mapText("Virage 3", "Turn 3"),
        note: mapText(
          "Long appui à droite qui révèle très vite l'équilibre aero.",
          "Long loaded right-hander that quickly reveals aero balance.",
        ),
      },
      {
        id: "la-caixa",
        kind: "corner",
        turn: 10,
        x: 337,
        y: 154,
        label: mapText("La Caixa", "La Caixa"),
        note: mapText(
          "Freinage lent après la ligne opposée, souvent décisif pour les attaques DRS.",
          "Slow braking zone after the back straight, often decisive for DRS attacks.",
        ),
      },
      {
        id: "final-sector",
        kind: "sector",
        x: 244,
        y: 213,
        label: mapText("Dernier secteur", "Final sector"),
        note: mapText(
          "Retour vers la ligne où la traction conditionne la défense dans la ligne droite.",
          "Run back to the line where traction shapes the defence on the straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M244 213 C211 196 201 166 166 181 C132 195 114 231 86 215 C79 211 80 203 83 196",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La longue ligne droite concentre les attaques les plus lisibles.",
          "The long pit straight concentrates the clearest attacks.",
        ),
      },
      {
        id: "fast-balance-sector",
        kind: "sector",
        path: "M112 115 C135 85 164 76 196 74 C245 72 292 88 319 119",
        label: mapText("Secteur d'appui", "Downforce sector"),
        note: mapText(
          "Portion rapide où les écarts de rythme sont rarement artificiels.",
          "Fast section where pace gaps are rarely artificial.",
        ),
      },
    ],
  },
  {
    key: "montreal",
    circuitName: "Montreal",
    aliases: [
      "Montreal",
      "Montréal",
      "Circuit Gilles-Villeneuve",
      "Circuit Gilles Villeneuve",
      "Canadian Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.Montreal,
    viewBox: "0 0 420 280",
    trackPath:
      "M74 184 C95 135 132 109 183 109 C230 109 260 84 304 74 C348 64 370 94 347 127 C326 158 278 149 259 181 C238 216 282 237 318 215 C349 196 362 223 331 241 C286 266 215 233 200 188 C189 154 146 149 123 182 C102 212 61 214 74 184 Z",
    racingLinePath:
      "M90 180 C110 140 139 124 183 123 C231 122 260 99 300 89 C333 81 349 100 334 121 C315 146 273 138 250 174 C227 210 281 224 312 203 C334 188 341 213 319 226 C280 249 226 222 214 183 C202 142 148 136 111 180 C95 199 83 196 90 180 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 91,
        y: 179,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ vers la chicane Senna, où les écarts de réaction se paient vite.",
          "Launch toward the Senna chicane, where reaction gaps are punished quickly.",
        ),
      },
      {
        id: "senna-s",
        kind: "corner",
        turn: 1,
        x: 75,
        y: 184,
        label: mapText("Chicane Senna", "Senna chicane"),
        note: mapText(
          "Entrée serrée et sortie piégeuse : point fort pour prédire les incidents de départ.",
          "Tight entry and tricky exit: strong marker for start-incident predictions.",
        ),
      },
      {
        id: "hairpin",
        kind: "corner",
        turn: 10,
        x: 259,
        y: 181,
        label: mapText("Épingle", "Hairpin"),
        note: mapText(
          "Freinage le plus évident pour lancer une attaque avant la longue pleine charge.",
          "Clearest braking zone to launch an attack before the long full-throttle run.",
        ),
      },
      {
        id: "wall-of-champions",
        kind: "corner",
        turn: 14,
        x: 331,
        y: 241,
        label: mapText("Mur des champions", "Wall of Champions"),
        note: mapText(
          "Dernière chicane, toujours utile pour lire le risque d'erreur sous pression.",
          "Final chicane, always useful for reading error risk under pressure.",
        ),
      },
      {
        id: "island-flow",
        kind: "sector",
        x: 304,
        y: 74,
        label: mapText("Section île Notre-Dame", "Notre-Dame island flow"),
        note: mapText(
          "Enchaînement stop-and-go où freinage et traction priment sur l'appui pur.",
          "Stop-and-go sequence where braking and traction beat pure downforce.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-back-straight",
        kind: "drs",
        path: "M259 181 C238 216 282 237 318 215 C349 196 362 223 331 241",
        label: mapText("DRS ligne opposée", "Back straight DRS"),
        note: mapText(
          "Fenêtre d'aspiration majeure entre l'épingle et la dernière chicane.",
          "Major slipstream window between the hairpin and final chicane.",
        ),
      },
    ],
  },
  {
    key: "red-bull-ring",
    circuitName: "Red Bull Ring",
    aliases: ["Red Bull Ring", "Spielberg", "Austrian Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Red Bull Ring"],
    viewBox: "0 0 420 280",
    trackPath:
      "M88 202 C84 153 102 96 154 76 C206 56 272 67 322 103 C365 134 354 183 314 197 C275 211 252 179 218 196 C176 216 118 240 88 202 Z",
    racingLinePath:
      "M103 197 C101 157 116 111 160 91 C205 72 263 81 310 113 C342 135 337 169 307 181 C273 195 249 163 211 183 C171 202 124 221 103 197 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 103,
        y: 197,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ en montée vers le premier virage, avec une forte prime à la motricité.",
          "Uphill launch toward turn one, with traction heavily rewarded.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 88,
        y: 202,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Sortie capitale pour survivre à la montée vers Remus.",
          "Critical exit to survive the uphill run to Remus.",
        ),
      },
      {
        id: "remus",
        kind: "corner",
        turn: 3,
        x: 154,
        y: 76,
        label: mapText("Remus", "Remus"),
        note: mapText(
          "Gros freinage en bout de montée : point d'attaque évident et souvent tendu.",
          "Heavy braking at the top of the climb: obvious and often tense attack point.",
        ),
      },
      {
        id: "schlossgold",
        kind: "corner",
        turn: 4,
        x: 322,
        y: 103,
        label: mapText("Schlossgold", "Schlossgold"),
        note: mapText(
          "Deuxième grosse zone de freinage, idéale pour lire les écarts de vitesse de pointe.",
          "Second major braking zone, ideal for reading top-speed gaps.",
        ),
      },
      {
        id: "rindt",
        kind: "corner",
        turn: 9,
        x: 314,
        y: 197,
        label: mapText("Rindt", "Rindt"),
        note: mapText(
          "Virage rapide de fin de tour, révélateur de confiance en pneus chargés.",
          "Fast late-lap corner that reveals confidence on loaded tyres.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-uphill",
        kind: "drs",
        path: "M88 202 C84 153 102 96 154 76",
        label: mapText("DRS montée Remus", "Remus uphill DRS"),
        note: mapText(
          "La montée vers Remus est la fenêtre de dépassement la plus franche.",
          "The climb to Remus is the clearest overtaking window.",
        ),
      },
      {
        id: "drs-back",
        kind: "drs",
        path: "M154 76 C206 56 272 67 322 103",
        label: mapText("DRS arrière", "Back DRS"),
        note: mapText(
          "Deuxième activation qui maintient la pression jusqu'au virage 4.",
          "Second activation that keeps pressure high into turn four.",
        ),
      },
    ],
  },
  {
    key: "hungaroring",
    circuitName: "Hungaroring",
    aliases: ["Hungaroring", "Hungarian Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Hungaroring,
    viewBox: "0 0 420 280",
    trackPath:
      "M90 190 C72 145 94 98 139 82 C181 67 215 86 239 118 C266 154 322 126 344 161 C367 198 323 236 273 219 C236 207 218 177 185 194 C150 212 109 226 90 190 Z",
    racingLinePath:
      "M105 185 C91 149 110 111 145 96 C177 82 204 99 226 126 C258 166 318 139 330 165 C345 195 313 216 277 204 C239 191 221 162 181 181 C147 197 119 207 105 185 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 105,
        y: 185,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ vers une longue descente jusqu'au premier freinage, souvent la meilleure chance d'attaque.",
          "Launch toward a long downhill run to turn one, often the best attack chance.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 90,
        y: 190,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Gros freinage en bout de ligne droite, clé pour les scénarios de départ.",
          "Heavy braking at the end of the straight, key for start scenarios.",
        ),
      },
      {
        id: "turn-2",
        kind: "corner",
        turn: 2,
        x: 139,
        y: 82,
        label: mapText("Virage 2", "Turn 2"),
        note: mapText(
          "Long gauche technique où la patience compte plus que la vitesse de pointe.",
          "Long technical left-hander where patience matters more than top speed.",
        ),
      },
      {
        id: "chicane",
        kind: "corner",
        turn: 6,
        x: 239,
        y: 118,
        label: mapText("Chicane", "Chicane"),
        note: mapText(
          "Séquence lente qui casse le rythme et met les pneus arrière à contribution.",
          "Slow sequence that breaks rhythm and stresses rear tyres.",
        ),
      },
      {
        id: "final-corner",
        kind: "corner",
        turn: 14,
        x: 273,
        y: 219,
        label: mapText("Dernier virage", "Final corner"),
        note: mapText(
          "Sortie décisive pour rester dans la fenêtre DRS vers le virage 1.",
          "Decisive exit to stay inside the DRS window toward turn one.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M273 219 C236 207 218 177 185 194 C150 212 109 226 90 190",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La ligne droite de stands concentre l'essentiel des tentatives.",
          "The pit straight concentrates most overtaking attempts.",
        ),
      },
      {
        id: "middle-sector",
        kind: "sector",
        path: "M139 82 C181 67 215 86 239 118 C266 154 322 126 344 161",
        label: mapText("Secteur sinueux", "Twisty sector"),
        note: mapText(
          "Portion de rythme où l'air sale complique les dépassements.",
          "Rhythm section where dirty air makes overtaking difficult.",
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
        id: "abbey",
        kind: "corner",
        turn: 1,
        x: 103,
        y: 111,
        label: mapText("Abbey", "Abbey"),
        note: mapText(
          "Premier virage très rapide : l'engagement à froid y pèse lourd.",
          "Very fast first corner where cold-tyre commitment matters.",
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
    key: "zandvoort",
    circuitName: "Zandvoort",
    aliases: ["Zandvoort", "Circuit Zandvoort", "Dutch Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Zandvoort,
    viewBox: "0 0 420 280",
    trackPath:
      "M88 186 C72 151 83 104 122 78 C159 53 211 62 234 91 C250 112 232 137 203 130 C178 124 173 96 197 82 C229 63 287 65 323 96 C360 128 362 178 329 207 C294 238 228 236 187 212 C154 193 119 218 88 186 Z",
    racingLinePath:
      "M103 181 C88 152 98 113 130 91 C162 69 202 75 221 97 C231 111 218 122 203 118 C190 115 187 100 204 91 C231 76 281 80 312 106 C341 131 342 170 316 193 C286 218 232 216 197 197 C156 174 129 204 103 181 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 96,
        y: 182,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Lancement court vers Tarzan, où la position au premier freinage pèse lourd.",
          "Short launch toward Tarzan, where first-braking position matters heavily.",
        ),
      },
      {
        id: "tarzan",
        kind: "corner",
        turn: 1,
        x: 84,
        y: 150,
        label: mapText("Tarzanbocht", "Tarzanbocht"),
        note: mapText(
          "Principal point d'attaque du circuit, utile pour lire le leader au premier virage.",
          "Primary attack point on the circuit, useful for first-corner leader reads.",
        ),
      },
      {
        id: "hugenholtz",
        kind: "corner",
        turn: 3,
        x: 203,
        y: 129,
        label: mapText("Hugenholtz", "Hugenholtz"),
        note: mapText(
          "Virage relevé qui récompense la traction et la confiance dès le premier secteur.",
          "Banked corner rewarding traction and confidence from the first sector.",
        ),
      },
      {
        id: "scheivlak",
        kind: "sector",
        x: 319,
        y: 98,
        label: mapText("Scheivlak", "Scheivlak"),
        note: mapText(
          "Passage rapide dans les dunes, révélateur de l'engagement et du rythme pur.",
          "Fast dune section that exposes commitment and pure pace.",
        ),
      },
      {
        id: "arie-luyendyk",
        kind: "corner",
        turn: 14,
        x: 327,
        y: 207,
        label: mapText("Arie Luyendyk", "Arie Luyendyk"),
        note: mapText(
          "Dernier banking, clé pour ouvrir le DRS et préparer l'attaque vers Tarzan.",
          "Final banking, key to opening DRS and setting up the run to Tarzan.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M329 207 C294 238 228 236 187 212 C154 193 119 218 88 186 C76 174 72 160 83 142",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La ligne droite depuis le dernier banking concentre la meilleure fenêtre de dépassement.",
          "The straight from the final banking carries the best overtaking window.",
        ),
      },
      {
        id: "dune-sector",
        kind: "sector",
        path: "M197 82 C229 63 287 65 323 96 C348 118 357 148 348 174",
        label: mapText("Secteur des dunes", "Dune sector"),
        note: mapText(
          "Portion fluide où l'appui et la précision changent vite la hiérarchie.",
          "Flowing section where downforce and precision quickly change the order.",
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
  {
    key: "madrid",
    circuitName: "Madrid",
    aliases: ["Madrid", "Madring", "IFEMA Madrid", "Madrid Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Madrid,
    viewBox: "0 0 420 280",
    trackPath:
      "M82 188 C95 129 139 87 199 79 C252 72 303 94 335 132 C367 170 347 218 300 229 C263 238 235 215 207 190 C178 164 142 201 108 213 C88 220 77 207 82 188 Z",
    racingLinePath:
      "M98 184 C112 137 148 101 200 94 C245 88 289 106 318 139 C344 169 329 202 295 211 C259 221 236 198 214 178 C184 151 148 187 115 199 C102 204 94 197 98 184 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 98,
        y: 184,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Point de référence pour une piste nouvelle où les repères de départ restent à construire.",
          "Reference point for a new venue where start patterns are still being built.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 82,
        y: 188,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier freinage attendu comme zone de vérité pour les écarts au lancement.",
          "First braking zone expected to reveal launch gaps.",
        ),
      },
      {
        id: "ifema-section",
        kind: "sector",
        x: 199,
        y: 79,
        label: mapText("Section IFEMA", "IFEMA section"),
        note: mapText(
          "Portion urbaine rapide à surveiller pour les écarts de confiance.",
          "Fast urban-style section to watch for confidence gaps.",
        ),
      },
      {
        id: "valdebebas",
        kind: "sector",
        x: 335,
        y: 132,
        label: mapText("Valdebebas", "Valdebebas"),
        note: mapText(
          "Enchaînement de transition où les différences de traction peuvent peser.",
          "Transition sequence where traction differences can matter.",
        ),
      },
      {
        id: "final-sector",
        kind: "corner",
        x: 300,
        y: 229,
        label: mapText("Dernier secteur", "Final sector"),
        note: mapText(
          "Retour vers la ligne, utile pour contextualiser les scénarios DRS.",
          "Run back to the line, useful context for DRS scenarios.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M300 229 C263 238 235 215 207 190 C178 164 142 201 108 213 C88 220 77 207 82 188",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Fenêtre principale à calibrer lorsque les premières données de course arriveront.",
          "Primary window to calibrate once the first race data lands.",
        ),
      },
    ],
  },
  {
    key: "baku",
    circuitName: "Baku",
    aliases: ["Baku", "Baku City Circuit", "Azerbaijan Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Baku,
    viewBox: "0 0 420 280",
    trackPath:
      "M76 196 C96 122 151 86 220 91 C271 95 308 75 337 105 C365 134 341 174 303 167 C270 161 258 130 229 145 C193 164 230 218 184 235 C138 252 67 231 76 196 Z",
    racingLinePath:
      "M92 191 C111 133 158 104 219 105 C272 106 303 90 325 112 C344 131 325 153 301 151 C261 149 253 116 220 133 C178 154 220 204 181 218 C142 233 87 217 92 191 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 92,
        y: 191,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ vers un gros freinage urbain, avec aspiration immédiate.",
          "Launch toward a heavy street-circuit braking zone, with immediate slipstream.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 76,
        y: 196,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier angle à 90 degrés, souvent le point de décision du départ.",
          "First 90-degree corner, often the decision point at the start.",
        ),
      },
      {
        id: "castle",
        kind: "corner",
        turn: 8,
        x: 229,
        y: 145,
        label: mapText("Section château", "Castle section"),
        note: mapText(
          "Portion étroite où la précision compte plus que l'agressivité.",
          "Narrow section where precision matters more than aggression.",
        ),
      },
      {
        id: "seaside",
        kind: "sector",
        x: 337,
        y: 105,
        label: mapText("Front de mer", "Seaside run"),
        note: mapText(
          "Pleine charge exposée, idéale pour lire vitesse de pointe et aspiration.",
          "Exposed full-throttle run, ideal for top-speed and slipstream reads.",
        ),
      },
      {
        id: "turn-16",
        kind: "corner",
        turn: 16,
        x: 184,
        y: 235,
        label: mapText("Virage 16", "Turn 16"),
        note: mapText(
          "Sortie capitale avant l'immense section à fond vers la ligne.",
          "Critical exit before the huge flat-out section back to the line.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M184 235 C138 252 67 231 76 196",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "La ligne droite finale transforme souvent une petite aspiration en dépassement net.",
          "The final straight often turns a small tow into a clear pass.",
        ),
      },
      {
        id: "castle-sector",
        kind: "sector",
        path: "M303 167 C270 161 258 130 229 145 C193 164 230 218 184 235",
        label: mapText("Secteur château", "Castle sector"),
        note: mapText(
          "Séquence de précision qui peut ruiner une course en une seule erreur.",
          "Precision sequence that can ruin a race with one mistake.",
        ),
      },
    ],
  },
  {
    key: "marina-bay",
    circuitName: "Marina Bay",
    aliases: ["Marina Bay", "Marina Bay Street Circuit", "Singapore Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Marina Bay"],
    viewBox: "0 0 420 280",
    trackPath:
      "M82 188 C101 132 145 100 202 100 C248 100 285 78 326 96 C364 113 363 156 332 179 C300 203 252 183 238 217 C224 250 162 246 125 221 C100 204 75 210 82 188 Z",
    racingLinePath:
      "M98 184 C116 140 153 116 201 115 C251 114 284 94 316 108 C344 120 345 149 321 166 C287 191 247 169 225 207 C209 235 167 230 136 209 C113 194 93 200 98 184 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 98,
        y: 184,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ nocturne vers un premier freinage étroit, propice aux écarts de réaction.",
          "Night-race launch toward a tight first braking zone, prone to reaction gaps.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 82,
        y: 188,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier enchaînement serré, souvent décisif pour verrouiller une position.",
          "Tight opening sequence, often decisive for locking position.",
        ),
      },
      {
        id: "anderson-bridge",
        kind: "sector",
        x: 202,
        y: 100,
        label: mapText("Anderson Bridge", "Anderson Bridge"),
        note: mapText(
          "Portion urbaine de précision où le rythme dépend beaucoup de la confiance.",
          "Precision street section where rhythm depends heavily on confidence.",
        ),
      },
      {
        id: "bayfront",
        kind: "sector",
        x: 326,
        y: 96,
        label: mapText("Bayfront", "Bayfront"),
        note: mapText(
          "Zone plus ouverte qui révèle la motricité et la stabilité au freinage.",
          "More open section revealing traction and braking stability.",
        ),
      },
      {
        id: "final-corners",
        kind: "corner",
        x: 238,
        y: 217,
        label: mapText("Derniers virages", "Final corners"),
        note: mapText(
          "Sortie importante pour préparer la ligne droite et défendre le tour suivant.",
          "Important exit to prepare the straight and defend the next lap.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M238 217 C224 250 162 246 125 221 C100 204 75 210 82 188",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Fenêtre principale sur un circuit où les dépassements doivent être construits tôt.",
          "Primary window on a circuit where overtakes must be built early.",
        ),
      },
      {
        id: "city-sector",
        kind: "sector",
        path: "M145 100 C202 100 248 100 285 78 C305 68 321 83 326 96",
        label: mapText("Secteur urbain", "Street sector"),
        note: mapText(
          "Séquence de murs proches, utile pour lire le risque d'erreur sous fatigue.",
          "Close-wall sequence, useful for reading error risk under fatigue.",
        ),
      },
    ],
  },
  {
    key: "cota",
    circuitName: "COTA",
    aliases: [
      "COTA",
      "Circuit of the Americas",
      "Circuit of The Americas",
      "Austin",
      "United States Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.COTA,
    viewBox: "0 0 420 280",
    trackPath:
      "M83 195 C86 143 121 92 176 78 C228 65 283 81 322 117 C358 150 346 195 306 211 C268 227 232 199 203 217 C165 240 106 236 83 195 Z",
    racingLinePath:
      "M99 190 C104 150 131 109 181 94 C223 82 269 95 304 126 C332 150 326 181 298 193 C262 209 232 182 196 203 C161 224 113 219 99 190 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 100,
        y: 190,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Montée spectaculaire vers le virage 1, parfaite pour les lectures de départ.",
          "Dramatic climb to turn one, perfect for start reads.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 83,
        y: 195,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Freinage en montée très large, souvent propice aux trajectoires multiples.",
          "Wide uphill braking zone, often inviting multiple lines.",
        ),
      },
      {
        id: "esses",
        kind: "sector",
        x: 176,
        y: 78,
        label: mapText("Esses", "Esses"),
        note: mapText(
          "Enchaînement rapide inspiré des grands classiques, révélateur d'appui.",
          "Fast sequence inspired by classic circuits, a downforce marker.",
        ),
      },
      {
        id: "back-straight",
        kind: "drs",
        x: 322,
        y: 117,
        label: mapText("Ligne droite arrière", "Back straight"),
        note: mapText(
          "Longue pleine charge où l'aspiration peut changer un duel.",
          "Long full-throttle run where slipstream can flip a duel.",
        ),
      },
      {
        id: "stadium",
        kind: "sector",
        x: 306,
        y: 211,
        label: mapText("Stadium", "Stadium"),
        note: mapText(
          "Section lente de fin de tour, importante pour les pneus et la traction.",
          "Slow late-lap section, important for tyres and traction.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-back",
        kind: "drs",
        path: "M176 78 C228 65 283 81 322 117 C342 135 350 153 346 169",
        label: mapText("DRS ligne arrière", "Back straight DRS"),
        note: mapText(
          "La grande fenêtre d'attaque du circuit, souvent décisive en course.",
          "The circuit's major attack window, often decisive in race trim.",
        ),
      },
      {
        id: "first-sector",
        kind: "sector",
        path: "M83 195 C86 143 121 92 176 78",
        label: mapText("Premier secteur", "First sector"),
        note: mapText(
          "Montée puis esses rapides : un résumé brutal de motricité et d'appui.",
          "Climb then fast esses: a sharp test of traction and downforce.",
        ),
      },
    ],
  },
  {
    key: "hermanos-rodriguez",
    circuitName: "Hermanos Rodríguez",
    aliases: [
      "Hermanos Rodríguez",
      "Hermanos Rodriguez",
      "Autódromo Hermanos Rodríguez",
      "Autodromo Hermanos Rodriguez",
      "Mexico City Grand Prix",
      "Mexican Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES["Hermanos Rodríguez"],
    viewBox: "0 0 420 280",
    trackPath:
      "M76 196 C92 128 145 82 212 82 C276 82 338 113 346 164 C354 216 300 238 252 211 C217 191 205 157 171 176 C136 196 95 232 76 196 Z",
    racingLinePath:
      "M92 191 C108 137 153 97 212 98 C268 98 321 122 330 163 C338 200 295 218 259 197 C219 174 208 143 166 162 C136 176 103 213 92 191 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 92,
        y: 191,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Très longue aspiration vers le virage 1, un classique des départs animés.",
          "Very long tow to turn one, a classic setup for dramatic starts.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 76,
        y: 196,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Gros freinage après la plus longue pleine charge du tour.",
          "Heavy braking after the lap's longest full-throttle run.",
        ),
      },
      {
        id: "esses",
        kind: "sector",
        x: 212,
        y: 82,
        label: mapText("Esses", "Esses"),
        note: mapText(
          "Séquence technique où l'altitude rend l'appui plus rare.",
          "Technical sequence where altitude makes downforce scarcer.",
        ),
      },
      {
        id: "stadium",
        kind: "sector",
        x: 346,
        y: 164,
        label: mapText("Stade", "Stadium"),
        note: mapText(
          "Passage iconique et lent où la traction ressort fortement.",
          "Iconic slow section where traction stands out.",
        ),
      },
      {
        id: "peraltada",
        kind: "corner",
        turn: 17,
        x: 252,
        y: 211,
        label: mapText("Peraltada", "Peraltada"),
        note: mapText(
          "Dernière courbe, clé pour préparer l'immense ligne droite.",
          "Final curve, key to preparing the huge straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M252 211 C217 191 205 157 171 176 C136 196 95 232 76 196",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Fenêtre majeure grâce à l'aspiration et à la ligne droite interminable.",
          "Major window thanks to slipstream and the endless straight.",
        ),
      },
      {
        id: "stadium-sector",
        kind: "sector",
        path: "M276 82 C338 113 346 164 354 216 C323 229 285 226 252 211",
        label: mapText("Secteur stade", "Stadium sector"),
        note: mapText(
          "Portion lente où une petite erreur ruine la sortie vers la ligne.",
          "Slow section where a small mistake ruins the exit to the line.",
        ),
      },
    ],
  },
  {
    key: "interlagos",
    circuitName: "Interlagos",
    aliases: [
      "Interlagos",
      "Autódromo José Carlos Pace",
      "Autodromo Jose Carlos Pace",
      "Brazilian Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.Interlagos,
    viewBox: "0 0 420 280",
    trackPath:
      "M82 194 C93 135 137 91 196 82 C252 73 317 100 338 150 C358 198 319 237 267 224 C226 214 214 176 177 190 C139 205 103 232 82 194 Z",
    racingLinePath:
      "M98 188 C111 142 146 105 198 97 C246 91 300 113 320 152 C337 185 309 211 271 207 C230 202 216 160 172 176 C140 187 110 211 98 188 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 99,
        y: 187,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ en montée avant le plongeon vers le S de Senna, souvent explosif.",
          "Uphill launch before diving into Senna S, often explosive.",
        ),
      },
      {
        id: "senna-s",
        kind: "corner",
        turn: 1,
        x: 82,
        y: 194,
        label: mapText("S de Senna", "Senna S"),
        note: mapText(
          "Enchaînement d'ouverture idéal pour lire agressivité et défense.",
          "Opening complex ideal for reading aggression and defence.",
        ),
      },
      {
        id: "descida-do-lago",
        kind: "sector",
        x: 196,
        y: 82,
        label: mapText("Descida do Lago", "Descida do Lago"),
        note: mapText(
          "Portion fluide où la sortie du S de Senna se paie immédiatement.",
          "Flowing section where Senna S exit quality pays off immediately.",
        ),
      },
      {
        id: "pinheirinho",
        kind: "corner",
        turn: 9,
        x: 338,
        y: 150,
        label: mapText("Pinheirinho", "Pinheirinho"),
        note: mapText(
          "Virage lent qui expose la traction et les pneus arrière.",
          "Slow corner exposing traction and rear tyres.",
        ),
      },
      {
        id: "juncao",
        kind: "corner",
        turn: 12,
        x: 267,
        y: 224,
        label: mapText("Junção", "Junção"),
        note: mapText(
          "Sortie capitale vers la montée finale et le DRS.",
          "Critical exit toward the final climb and DRS.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M267 224 C226 214 214 176 177 190 C139 205 103 232 82 194",
        label: mapText("DRS montée finale", "Final climb DRS"),
        note: mapText(
          "Fenêtre principale pour transformer une bonne sortie de Junção en attaque.",
          "Primary window to turn a good Junção exit into an attack.",
        ),
      },
      {
        id: "middle-sector",
        kind: "sector",
        path: "M196 82 C252 73 317 100 338 150 C348 174 343 194 329 209",
        label: mapText("Miolo", "Infield"),
        note: mapText(
          "Secteur sinueux où la gestion des pneus change rapidement la hiérarchie.",
          "Twisty sector where tyre management quickly changes the order.",
        ),
      },
    ],
  },
  {
    key: "las-vegas",
    circuitName: "Las Vegas",
    aliases: ["Las Vegas", "Las Vegas Street Circuit", "Las Vegas Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Las Vegas"],
    viewBox: "0 0 420 280",
    trackPath:
      "M70 196 C92 120 154 86 236 88 C309 90 356 122 350 166 C344 210 286 222 238 198 C203 181 182 212 137 220 C98 226 61 218 70 196 Z",
    racingLinePath:
      "M87 190 C111 132 166 104 234 103 C298 102 333 127 333 160 C333 191 286 203 245 183 C203 162 181 196 136 204 C105 209 82 205 87 190 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 88,
        y: 190,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ urbain vers une forte zone de freinage, sous températures souvent fraîches.",
          "Street launch toward a heavy braking zone, often in cool temperatures.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 70,
        y: 196,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier gros freinage, point clé pour les erreurs de pneus froids.",
          "First heavy braking zone, key for cold-tyre mistakes.",
        ),
      },
      {
        id: "sphere",
        kind: "sector",
        x: 236,
        y: 88,
        label: mapText("Sphere", "Sphere"),
        note: mapText(
          "Repère visuel du tour, utile pour situer la transition vers les pleines charges.",
          "Visual lap marker, useful for locating the transition to full-throttle runs.",
        ),
      },
      {
        id: "strip",
        kind: "drs",
        x: 350,
        y: 166,
        label: mapText("The Strip", "The Strip"),
        note: mapText(
          "Longue ligne droite où vitesse de pointe et aspiration dominent.",
          "Long straight where top speed and slipstream dominate.",
        ),
      },
      {
        id: "harmon",
        kind: "corner",
        x: 238,
        y: 198,
        label: mapText("Harmon", "Harmon"),
        note: mapText(
          "Retour technique vers la ligne, où une mauvaise sortie coûte cher.",
          "Technical return toward the line, where a poor exit is costly.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-strip",
        kind: "drs",
        path: "M236 88 C309 90 356 122 350 166",
        label: mapText("DRS Strip", "Strip DRS"),
        note: mapText(
          "La plus grande fenêtre d'attaque de Las Vegas.",
          "The biggest attack window in Las Vegas.",
        ),
      },
      {
        id: "final-sector",
        kind: "sector",
        path: "M350 166 C344 210 286 222 238 198 C203 181 182 212 137 220",
        label: mapText("Secteur final", "Final sector"),
        note: mapText(
          "Retour plus technique qui prépare ou annule l'attaque suivante.",
          "More technical return that sets up or cancels the next attack.",
        ),
      },
    ],
  },
  {
    key: "lusail",
    circuitName: "Lusail",
    aliases: ["Lusail", "Lusail International Circuit", "Qatar Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Lusail,
    viewBox: "0 0 420 280",
    trackPath:
      "M88 190 C92 128 137 82 204 76 C277 70 337 111 346 169 C355 225 297 241 246 213 C207 192 196 158 161 178 C126 198 86 223 88 190 Z",
    racingLinePath:
      "M104 185 C109 137 148 99 205 92 C265 85 318 119 330 168 C342 209 293 222 253 199 C212 175 199 145 157 164 C129 177 104 205 104 185 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 105,
        y: 185,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Long départ vers le virage 1, principale opportunité d'attaque.",
          "Long launch to turn one, the main attack opportunity.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 88,
        y: 190,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Freinage clé après la ligne droite, central pour les pronos de départ.",
          "Key braking zone after the straight, central to start predictions.",
        ),
      },
      {
        id: "flowing-sector",
        kind: "sector",
        x: 204,
        y: 76,
        label: mapText("Secteur rapide", "Flowing sector"),
        note: mapText(
          "Enchaînement à haute vitesse où l'appui et les pneus font la différence.",
          "High-speed sequence where downforce and tyres make the difference.",
        ),
      },
      {
        id: "back-section",
        kind: "sector",
        x: 346,
        y: 169,
        label: mapText("Section arrière", "Back section"),
        note: mapText(
          "Portion exigeante qui peut faire monter la dégradation.",
          "Demanding section that can increase degradation.",
        ),
      },
      {
        id: "final-corner",
        kind: "corner",
        turn: 16,
        x: 246,
        y: 213,
        label: mapText("Dernier virage", "Final corner"),
        note: mapText(
          "Sortie déterminante pour rester dans l'aspiration en ligne droite.",
          "Decisive exit to stay in the tow on the straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M246 213 C207 192 196 158 161 178 C126 198 86 223 88 190",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Fenêtre majeure vers le virage 1, souvent la plus lisible du tour.",
          "Major window toward turn one, often the clearest of the lap.",
        ),
      },
      {
        id: "high-speed-sector",
        kind: "sector",
        path: "M137 82 C204 76 277 70 337 111 C348 128 351 149 346 169",
        label: mapText("Secteur haute vitesse", "High-speed sector"),
        note: mapText(
          "Séquence qui récompense la stabilité plus que l'agressivité.",
          "Sequence rewarding stability more than aggression.",
        ),
      },
    ],
  },
  {
    key: "yas-marina",
    circuitName: "Yas Marina",
    aliases: ["Yas Marina", "Yas Marina Circuit", "Abu Dhabi Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES["Yas Marina"],
    viewBox: "0 0 420 280",
    trackPath:
      "M84 194 C96 126 148 84 214 82 C281 80 341 116 350 168 C359 220 310 242 260 219 C222 202 205 169 169 185 C132 201 95 229 84 194 Z",
    racingLinePath:
      "M100 188 C113 136 158 100 214 98 C271 96 322 125 333 167 C342 204 305 221 266 204 C225 186 208 155 166 171 C136 183 106 209 100 188 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 101,
        y: 188,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ de finale de saison, souvent chargé en pression stratégique.",
          "Season-finale launch, often heavy with strategic pressure.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 84,
        y: 194,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Premier freinage pour sécuriser la position avant les longues lignes droites.",
          "First braking zone to secure position before the long straights.",
        ),
      },
      {
        id: "hairpin",
        kind: "corner",
        turn: 5,
        x: 214,
        y: 82,
        label: mapText("Épingle", "Hairpin"),
        note: mapText(
          "Sortie cruciale vers une grande zone DRS.",
          "Crucial exit toward a major DRS zone.",
        ),
      },
      {
        id: "back-straight",
        kind: "drs",
        x: 350,
        y: 168,
        label: mapText("Ligne droite arrière", "Back straight"),
        note: mapText(
          "Fenêtre d'attaque majeure, surtout avec avantage pneus.",
          "Major attack window, especially with tyre advantage.",
        ),
      },
      {
        id: "marina-sector",
        kind: "sector",
        x: 260,
        y: 219,
        label: mapText("Secteur marina", "Marina sector"),
        note: mapText(
          "Fin de tour technique qui punit les pneus arrière usés.",
          "Technical late-lap sector that punishes worn rear tyres.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-back",
        kind: "drs",
        path: "M214 82 C281 80 341 116 350 168",
        label: mapText("DRS arrière", "Back DRS"),
        note: mapText(
          "La grande ligne droite qui structure les stratégies d'attaque.",
          "The long straight that shapes attack strategies.",
        ),
      },
      {
        id: "final-sector",
        kind: "sector",
        path: "M350 168 C359 220 310 242 260 219 C222 202 205 169 169 185",
        label: mapText("Secteur final", "Final sector"),
        note: mapText(
          "Portion de défense et de gestion pour conclure le tour.",
          "Defence and management section to complete the lap.",
        ),
      },
    ],
  },
  {
    key: "shanghai",
    circuitName: "Shanghai",
    aliases: [
      "Shanghai",
      "Shanghai International Circuit",
      "Chinese Grand Prix",
      "China Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.Shanghai,
    viewBox: "0 0 420 280",
    trackPath:
      "M92 178 C74 142 87 98 129 82 C173 65 238 72 258 111 C278 151 228 174 190 150 C151 126 157 82 210 69 C278 52 345 82 358 138 C372 199 315 229 246 218 C190 209 121 235 92 178 Z",
    racingLinePath:
      "M106 174 C91 143 104 109 137 96 C173 82 226 86 244 116 C261 145 226 159 197 141 C167 122 174 91 216 82 C270 70 329 95 342 139 C356 188 308 211 249 201 C195 192 125 217 106 174 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 107,
        y: 174,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ piégeux avant le long premier virage en escargot.",
          "Tricky launch before the long snail-shaped opening corner.",
        ),
      },
      {
        id: "snail",
        kind: "corner",
        turn: 1,
        x: 129,
        y: 82,
        label: mapText("Escargot T1-T2", "T1-T2 snail"),
        note: mapText(
          "Entrée longue et dégressive qui use l'avant gauche et crée des écarts de trajectoire.",
          "Long tightening entry that stresses the front-left and creates line variation.",
        ),
      },
      {
        id: "technical-middle",
        kind: "sector",
        x: 238,
        y: 124,
        label: mapText("Milieu technique", "Technical middle"),
        note: mapText(
          "Portion de patience où la remise des gaz conditionne la ligne droite arrière.",
          "Patience section where throttle timing shapes the back straight.",
        ),
      },
      {
        id: "hairpin",
        kind: "corner",
        turn: 14,
        x: 358,
        y: 138,
        label: mapText("Épingle T14", "T14 hairpin"),
        note: mapText(
          "Le gros point de freinage et la fenêtre d'attaque la plus lisible du tour.",
          "The big braking point and the clearest attack window of the lap.",
        ),
      },
      {
        id: "final-corner",
        kind: "corner",
        turn: 16,
        x: 246,
        y: 218,
        label: mapText("Dernier virage", "Final corner"),
        note: mapText(
          "Sortie clé pour valider le tour ou préparer une défense sur la ligne.",
          "Key exit to complete the lap or prepare a defence on the straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-back",
        kind: "drs",
        path: "M258 111 C296 95 345 100 358 138",
        label: mapText("DRS arrière", "Back DRS"),
        note: mapText(
          "La longue ligne droite vers T14 concentre l'essentiel des dépassements.",
          "The long run to T14 concentrates most overtakes.",
        ),
      },
      {
        id: "sector-one",
        kind: "sector",
        path: "M92 178 C74 142 87 98 129 82 C173 65 238 72 258 111",
        label: mapText("Secteur 1", "Sector 1"),
        note: mapText(
          "Enchaînement lent et chargé en appui pour lire l'équilibre des monoplaces.",
          "Slow, loaded sequence that reveals car balance.",
        ),
      },
    ],
  },
  {
    key: "sakhir",
    circuitName: "Sakhir",
    aliases: [
      "Sakhir",
      "Bahrain International Circuit",
      "Bahrain Grand Prix",
      "Bahrein Grand Prix",
    ],
    fallbackImageUrl: CIRCUIT_IMAGES.Sakhir,
    viewBox: "0 0 420 280",
    trackPath:
      "M82 193 C99 131 153 86 219 81 C281 76 331 112 340 165 C350 224 288 232 247 204 C214 181 227 145 263 153 C297 160 305 199 270 216 C220 241 154 229 125 204 C101 184 73 223 82 193 Z",
    racingLinePath:
      "M98 188 C115 138 160 101 219 96 C271 92 313 120 324 164 C335 207 291 215 255 191 C226 171 237 150 263 163 C285 174 285 197 263 206 C220 224 163 214 137 193 C115 176 93 205 98 188 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 98,
        y: 188,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ critique sous forte chaleur, avec aspiration directe vers T1.",
          "Critical launch in high heat, with immediate tow toward T1.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 82,
        y: 193,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Gros freinage où les paris leader premier virage peuvent basculer.",
          "Heavy braking where first-corner leader picks can swing.",
        ),
      },
      {
        id: "turn-4",
        kind: "corner",
        turn: 4,
        x: 219,
        y: 81,
        label: mapText("Virage 4", "Turn 4"),
        note: mapText(
          "Deuxième vraie opportunité après la ligne droite DRS.",
          "Second real opportunity after the DRS straight.",
        ),
      },
      {
        id: "middle-sector",
        kind: "sector",
        x: 263,
        y: 153,
        label: mapText("Secteur traction", "Traction sector"),
        note: mapText(
          "Séquence qui met les pneus arrière sous tension et pèse sur les relais longs.",
          "Sequence that loads the rear tyres and shapes long stints.",
        ),
      },
      {
        id: "final-corner",
        kind: "corner",
        turn: 15,
        x: 270,
        y: 216,
        label: mapText("Dernier virage", "Final corner"),
        note: mapText(
          "Sortie décisive pour l'attaque ou la défense sur la ligne principale.",
          "Decisive exit for attack or defence on the main straight.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-main",
        kind: "drs",
        path: "M270 216 C220 241 154 229 125 204 C101 184 73 223 82 193",
        label: mapText("DRS principal", "Main DRS"),
        note: mapText(
          "Zone principale de dépassement et de validation des stratégies pneus.",
          "Main overtaking zone and tyre strategy validation point.",
        ),
      },
      {
        id: "drs-turn-4",
        kind: "drs",
        path: "M82 193 C99 131 153 86 219 81",
        label: mapText("DRS vers T4", "DRS to T4"),
        note: mapText(
          "Deuxième fenêtre d'attaque quand la sortie de T1 est propre.",
          "Second attack window when the T1 exit is clean.",
        ),
      },
    ],
  },
  {
    key: "jeddah",
    circuitName: "Jeddah",
    aliases: ["Jeddah", "Jeddah Corniche Circuit", "Saudi Arabian Grand Prix", "Saudi Grand Prix"],
    fallbackImageUrl: CIRCUIT_IMAGES.Jeddah,
    viewBox: "0 0 420 280",
    trackPath:
      "M77 199 C96 151 119 111 169 86 C218 62 296 59 338 99 C381 140 352 201 293 218 C228 237 179 202 196 160 C210 125 260 118 277 146 C294 177 250 202 204 191 C157 180 113 219 77 199 Z",
    racingLinePath:
      "M92 194 C111 154 133 121 176 100 C221 78 286 76 323 108 C357 138 335 184 289 199 C236 216 198 190 211 163 C222 140 253 136 263 152 C274 171 246 185 209 176 C163 166 125 204 92 194 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 92,
        y: 194,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ tendu avant une séquence très rapide entre murs.",
          "Tense launch before a very fast wall-lined sequence.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 77,
        y: 199,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Freinage où il faut survivre sans casser la vitesse du premier secteur.",
          "Braking point where drivers must survive without killing sector-one speed.",
        ),
      },
      {
        id: "esses",
        kind: "sector",
        x: 169,
        y: 86,
        label: mapText("Esses rapides", "Fast esses"),
        note: mapText(
          "Zone de confiance où le rythme pur et les drapeaux jaunes changent les pronostics.",
          "Confidence zone where raw pace and yellow flags can reshape predictions.",
        ),
      },
      {
        id: "corniche",
        kind: "sector",
        x: 338,
        y: 99,
        label: mapText("Corniche", "Corniche"),
        note: mapText(
          "Longue portion rapide bordée de murs, sensible aux erreurs et neutralisations.",
          "Long fast wall-lined section, sensitive to mistakes and neutralisations.",
        ),
      },
      {
        id: "final-hairpin",
        kind: "corner",
        turn: 27,
        x: 293,
        y: 218,
        label: mapText("Épingle finale", "Final hairpin"),
        note: mapText(
          "Dernière grosse opportunité de freinage avant la ligne.",
          "Final heavy braking opportunity before the line.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-corniche",
        kind: "drs",
        path: "M296 59 C338 99 381 140 352 201",
        label: mapText("DRS corniche", "Corniche DRS"),
        note: mapText(
          "Aspiration majeure sur une piste où le timing d'attaque compte énormément.",
          "Major tow zone on a track where attack timing matters hugely.",
        ),
      },
      {
        id: "high-speed-sector",
        kind: "sector",
        path: "M119 111 C169 86 218 62 296 59",
        label: mapText("Secteur haute vitesse", "High-speed sector"),
        note: mapText(
          "Portion d'engagement qui sépare les voitures stables des voitures nerveuses.",
          "Committed section separating stable cars from nervous ones.",
        ),
      },
    ],
  },
  {
    key: "miami",
    circuitName: "Miami",
    aliases: ["Miami", "Miami International Autodrome", "Miami Grand Prix", "Hard Rock Stadium"],
    fallbackImageUrl: CIRCUIT_IMAGES.Miami,
    viewBox: "0 0 420 280",
    trackPath:
      "M90 190 C104 124 153 81 214 77 C281 73 334 105 349 160 C365 220 314 240 253 221 C202 205 171 169 194 137 C217 105 280 122 275 163 C270 207 196 224 139 205 C111 196 83 224 90 190 Z",
    racingLinePath:
      "M105 185 C119 134 162 96 215 92 C270 89 316 116 331 160 C345 205 306 222 258 207 C216 194 192 166 210 142 C226 121 262 132 258 160 C254 190 197 207 146 191 C121 183 100 207 105 185 Z",
    features: [
      {
        id: "start",
        kind: "start",
        x: 105,
        y: 185,
        label: mapText("Ligne de départ", "Start line"),
        note: mapText(
          "Départ avec longue accélération vers un premier virage de patience.",
          "Launch with a long run toward a patient first corner.",
        ),
      },
      {
        id: "turn-1",
        kind: "corner",
        turn: 1,
        x: 90,
        y: 190,
        label: mapText("Virage 1", "Turn 1"),
        note: mapText(
          "Point de friction classique pour les scénarios de premier tour.",
          "Classic friction point for first-lap scenarios.",
        ),
      },
      {
        id: "stadium",
        kind: "sector",
        x: 214,
        y: 77,
        label: mapText("Hard Rock Stadium", "Hard Rock Stadium"),
        note: mapText(
          "Repère visuel central du tracé, utile pour situer les phases de rythme.",
          "Central visual landmark, useful for reading pace phases.",
        ),
      },
      {
        id: "tight-section",
        kind: "sector",
        x: 194,
        y: 137,
        label: mapText("Section lente", "Tight section"),
        note: mapText(
          "Enchaînement lent où la traction et la chauffe des pneus arrière dominent.",
          "Slow sequence where traction and rear tyre temperature dominate.",
        ),
      },
      {
        id: "back-straight",
        kind: "drs",
        x: 349,
        y: 160,
        label: mapText("Ligne droite arrière", "Back straight"),
        note: mapText(
          "Fenêtre DRS majeure pour les remontées et les undercuts réussis.",
          "Major DRS window for comebacks and successful undercuts.",
        ),
      },
    ],
    zones: [
      {
        id: "drs-back",
        kind: "drs",
        path: "M281 73 C309 85 334 105 349 160",
        label: mapText("DRS arrière", "Back DRS"),
        note: mapText(
          "La zone la plus claire pour transformer un avantage de rythme en dépassement.",
          "The clearest zone to turn a pace advantage into an overtake.",
        ),
      },
      {
        id: "stadium-sector",
        kind: "sector",
        path: "M90 190 C104 124 153 81 214 77 C267 73 329 103 349 160",
        label: mapText("Secteur stadium", "Stadium sector"),
        note: mapText(
          "Début de tour qui combine appui, grip de piste et gestion de température.",
          "Opening sector combining downforce, track grip and temperature management.",
        ),
      },
    ],
  },
];

// Overlay machine-generated SVG geometry (official GPS traces) onto the curated
// editorial data above. Track shapes, racing lines and hotspot coordinates come
// from scripts/generate_circuit_traces.py -> circuitGeometry.ts. Editorial
// content (labels/notes/turns) stays the source of truth here.
for (const circuitMap of CIRCUIT_MAPS) {
  const geo = CIRCUIT_GEOMETRY[circuitMap.key];
  if (!geo) continue;
  if (geo.viewBox) circuitMap.viewBox = geo.viewBox;
  if (geo.trackPath) circuitMap.trackPath = geo.trackPath;
  if (geo.racingLinePath) circuitMap.racingLinePath = geo.racingLinePath;
  for (const feature of circuitMap.features) {
    const xy = geo.features[feature.id];
    if (xy) {
      feature.x = xy[0];
      feature.y = xy[1];
    }
  }
  for (const zone of circuitMap.zones) {
    const path = geo.zones[zone.id];
    if (path) zone.path = path;
  }
}

const FIRST_CORNERS_BY_KEY: Record<string, CircuitFirstCorner> = {
  "albert-park": firstCorner("turn-1", "Virage 1", "Turn 1"),
  suzuka: firstCorner("turn-1", "Virage 1", "Turn 1"),
  monaco: firstCorner("sainte-devote", "Sainte-Dévote", "Sainte-Dévote"),
  barcelona: firstCorner("turn-1", "Virage 1", "Turn 1"),
  montreal: firstCorner("senna-s", "Chicane Senna", "Senna chicane"),
  "red-bull-ring": firstCorner("turn-1", "Virage 1", "Turn 1"),
  hungaroring: firstCorner("turn-1", "Virage 1", "Turn 1"),
  silverstone: firstCorner("abbey", "Abbey", "Abbey"),
  "spa-francorchamps": firstCorner("la-source", "La Source", "La Source"),
  zandvoort: firstCorner("tarzan", "Tarzanbocht", "Tarzanbocht"),
  monza: firstCorner("rettifilo", "Variante del Rettifilo", "Variante del Rettifilo"),
  madrid: firstCorner("turn-1", "Virage 1", "Turn 1"),
  baku: firstCorner("turn-1", "Virage 1", "Turn 1"),
  "marina-bay": firstCorner("turn-1", "Virage 1", "Turn 1"),
  cota: firstCorner("turn-1", "Virage 1", "Turn 1"),
  "hermanos-rodriguez": firstCorner("turn-1", "Virage 1", "Turn 1"),
  interlagos: firstCorner("senna-s", "S de Senna", "Senna S"),
  "las-vegas": firstCorner("turn-1", "Virage 1", "Turn 1"),
  lusail: firstCorner("turn-1", "Virage 1", "Turn 1"),
  "yas-marina": firstCorner("turn-1", "Virage 1", "Turn 1"),
  shanghai: firstCorner("snail", "Escargot T1-T2", "T1-T2 snail"),
  sakhir: firstCorner("turn-1", "Virage 1", "Turn 1"),
  jeddah: firstCorner("turn-1", "Virage 1", "Turn 1"),
  miami: firstCorner("turn-1", "Virage 1", "Turn 1"),
};

for (const circuitMap of CIRCUIT_MAPS) {
  const firstCornerMeta = FIRST_CORNERS_BY_KEY[circuitMap.key];
  if (firstCornerMeta) {
    circuitMap.firstCorner = firstCornerMeta;
  }
}

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
