# Design System — PronoKif F1

## Product Context
- **What this is:** App de pronostics F1 gamifiee (qualifications + course, ligues, mini-jeux, classements temps reel)
- **Who it's for:** Fans F1 competitifs EU/UK (500K-1M potentiel), 18-35 ans, mobile-first
- **Space/industry:** Fantasy sports / F1, concurrents : F1 Fantasy officiel, GridRival, Sorare
- **Project type:** Web app gamifiee (dashboard + social + jeu) — React 19 + Vite + Tailwind + shadcn/ui + Framer Motion
- **Tagline:** Pronostiquez. Defiez. Vivez.
- **Memorable thing:** "Plus fun que l'officiel" — chaque interaction doit donner envie de revenir le weekend de course suivant

## Aesthetic Direction
- **Direction:** Broadcast Premium — ambiance retransmission F1 haut de gamme, cinematique, immersive
- **Decoration level:** Intentional — glow effects sur CTAs et scores live, subtle grain texture (2-3% opacity) sur les surfaces, gradients radiaux subtils rouge sur les cartes hero. Pas de carbon fiber, pas de textures lourdes.
- **Mood:** La sensation de regarder un Grand Prix en nocturne depuis le muret des stands. Serieux dans l'execution, fun dans l'experience. Premium mais accessible.
- **Reference sites:** GridRival (gridrival.com), F1 Fantasy (fantasy.formula1.com), Sorare (sorare.com)
- **Dark mode:** ONLY. Pas de mode clair. Le noir est une decision de design, pas une option.

## Typography
- **Display/Hero:** Racing Sans One — la font signature de PronoKif. Uppercase only, letter-spacing 1px. Utilisee pour tous les titres h1-h3, noms de GP, classements.
- **Body:** Chivo (variable, 100-900) — lisible, polyvalente, italique disponible pour l'emphase. Utilisee pour le texte courant, descriptions, paragraphes.
- **UI/Labels:** Chivo 500 ou JetBrains Mono 10-11px uppercase tracking 0.15em — pour les labels de section, captions, metadata.
- **Data/Tables:** JetBrains Mono (tabular-nums obligatoire) — pour tous les chiffres : scores, rangs, pourcentages, timers, ecarts. Font-feature-settings: "tnum" pour l'alignement des colonnes.
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN
  ```
  https://fonts.googleapis.com/css2?family=Racing+Sans+One&family=Chivo:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:wght@400;500;600;700&display=swap
  ```
- **Scale:**
  - h1 hero: 48-96px (clamp responsive)
  - h1: 32px
  - h2: 22px
  - h3: 18px
  - body: 15px
  - caption: 10-11px
  - data large: 32-48px
  - data default: 13-16px

## Color
- **Approach:** Balanced — rouge racing dominant pour l'identite, vert/ambre pour la semantique, or/argent/bronze pour le podium

### Palette officielle (charte de marque)
- **Rouge Vitesse:** `#E10600` — couleur signature PK, CTAs, accents, selections, liens actifs, border-left des cartes
- **Blanc Piste:** `#F4F4F4` — texte principal sur fond sombre, contrastes forts
- **Noir Carbone:** `#0B0D12` — background principal, fondation de l'interface
- **Gris Titane:** `#5F6673` — texte secondaire, labels, metadata
- **Anthracite:** `#1A1D24` — surfaces elevees, inputs, hovers, menus

### Application UI
- **Background:** `#0B0D12` (Noir Carbone) — noir profond, pas navy, pas gris
- **Surface:** `#121418` — cartes, panels, modales (derive du Noir Carbone)
- **Surface raised:** `#1A1D24` (Anthracite) — inputs, hovers, menus
- **Glass surface:** `rgba(26, 29, 36, 0.85)` + `backdrop-blur: 20px` — bottom nav, overlays
- **Primary (Rouge Vitesse):** `#E10600` — CTAs, accents, selections, liens actifs, border-left des cartes. Usage parcimonieux pour maintenir l'impact.
- **Primary hover:** `#C00500`
- **Primary glow:** `rgba(225, 6, 0, 0.4)` — box-shadow sur les boutons et elements selectionnes
- **Primary subtle:** `rgba(225, 6, 0, 0.08)` — backgrounds de lignes selectionnees, cartes actives
- **Secondary (Emerald):** `#10b981` — succes, points gagnes, progressions positives
- **Accent (Amber):** `#f59e0b` — warnings, accents secondaires, precision stats
- **Podium:** Gold `#FFD700`, Silver `#C0C0C0`, Bronze `#CD7F32` — top 3 dans les classements uniquement
- **Text:** `#F4F4F4` (Blanc Piste) — titres, texte principal
- **Text secondary:** `#a1a1aa` — texte body, descriptions
- **Text muted:** `#5F6673` (Gris Titane) — labels, captions, metadata
- **Border:** `rgba(255, 255, 255, 0.08)` — separateurs, contours de cartes
- **Border hover:** `rgba(255, 255, 255, 0.15)`
- **Error:** `#DC2626`
- **Warning:** `#f59e0b`
- **Info:** `#3b82f6`
- **Dark mode strategy:** N/A — dark only, pas de mode clair a gerer

## Logo & Brand Identity
### Sources du kit logo
| Asset                                                               | Dimensions       | Usage canonique                                                               |
| ------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `_0-WORK/BRANDING/LOGO V2/SVG/logo-pronokif-icone-black-red.svg`    | 297x297 viewBox  | Icône app officielle v1 : favicon, PWA, notifications, splash compact         |
| `_0-WORK/BRANDING/LOGO V2/SVG/logo-pronokif-markdown-white-red.svg` | 1139x187 viewBox | Wordmark horizontal sur fond sombre : menus, headers, splash, auth            |
| `_0-WORK/BRANDING/LOGO V2/SVG/logo-pronokif-markdown-black-red.svg` | 1139x187 viewBox | Wordmark horizontal sur fond clair : documents, exports, supports partenaires |
| `_0-WORK/BRANDING/LOGO V2/SVG/logo-pronokif-symbole-white-red.svg`  | 405x338 viewBox  | Symbole seul sur fond sombre : UI compacte, avatars internes                  |
| `_0-WORK/BRANDING/LOGO V2/SVG/logo-pronokif-symbole-black-red.svg`  | 405x338 viewBox  | Symbole seul sur fond clair : print, docs, exports                            |

### Logo principal
- **Construction:** symbole Pronokif stylise + wordmark horizontal, avec accent Rouge Vitesse. Le rendu logo est un asset de marque : ne pas le recreer avec une font web ou du CSS.
- **Extension F1:** la v1 officielle n'integre pas de mention F1 dans le lockup. Si le contexte l'exige, ajouter la categorie en texte UI adjacent, jamais dans le fichier logo.
- **App UI:** dans les surfaces applicatives repetitives, preferer le wordmark horizontal `markdown-white-red` pour les menus/headers et l'icône app pour les contextes compacts.
- **Fond minimum:** utiliser le logo sur Noir Carbone `#0B0D12`, Anthracite `#1A1D24`, ou sur fond clair uniquement avec la variante dediee. Sur photo/video, ajouter un overlay sombre avant d'afficher le logo.

### Symbole Pronokif
- **Forme:** symbole dynamique inspire par la vitesse, avec contre-forme blanche/noire selon variante et accent Rouge Vitesse.
- **Usage:** icônes compactes, avatar reseaux sociaux, app icon, favicon, boutons d'identite, splash compact.
- **Lisibilite:** a 16px/32px, utiliser le symbole seul. Le wordmark complet n'est pas assez lisible en favicon ou micro UI.
- **Zone de protection:** espace minimum autour du logo = hauteur de l'accent rouge mesure dans le symbole. Aucun texte, badge, bordure ou autre element graphique ne doit empieter sur cette zone.

### Variantes du logo
| Variante             | Usage                                                  | Fond                                             |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| **Sur fond sombre**  | Interface app, headers, splash, videos avec overlay    | Noir Carbone `#0B0D12` / Anthracite `#1A1D24`    |
| **Sur fond clair**   | Partenariats, documents, supports print clairs         | Blanc Piste `#F4F4F4`                            |
| **Monochrome blanc** | Filigrane, overlays video, UI compacte sur fond sombre | Transparent ou fond sombre                       |
| **Monochrome noir**  | Documents clairs, exports admin, print monochrome      | Fond clair uniquement                            |
| **Icône app**        | PWA, favicon, notifications, app install, homescreen   | Tuile noire glossy arrondie + halo Rouge Vitesse |

### Tailles et lisibilite
| Contexte               | Taille                | Notes                                                            |
| ---------------------- | --------------------- | ---------------------------------------------------------------- |
| Hero / Splash          | 128-220px             | Lockup principal ou badge selon surface, avec animation d'entree |
| Header desktop         | 32-48px hauteur       | Wordmark horizontal si l'espace le permet                        |
| Header mobile          | 24-32px hauteur       | Symbole seul ou wordmark court                                   |
| Avatar reseaux sociaux | 512px source          | Symbole en crop circulaire avec bord rouge                       |
| Favicon navigateur     | 16px / 32px           | Icône app depuis `logo-pronokif-icone-black-red`                 |
| PWA / App install      | 180px / 192px / 512px | Exports depuis `logo-pronokif-icone-black-red.png`               |

### Signature
- Format principal : wordmark horizontal officiel v1 (`logo-pronokif-markdown-*`).
- Signature verbale : `PRONOSTIQUEZ. DEFIEZ. VIVEZ.` avec `VIVEZ.` en Rouge Vitesse.
- Espacement entre symbole et wordmark : utiliser les proportions natives de l'asset, sans separateur improvise.
- Le nom "PronoKif" s'ecrit toujours avec P et K majuscules

### Interdits
- Ne pas etirer, incliner davantage, recadrer dans la zone de protection ou recoloriser le logo.
- Ne pas poser le logo metallique sur une image chargee sans overlay sombre.
- Ne pas reconstruire le wordmark avec Racing Sans One : utiliser l'asset officiel pour toute presence de marque.
- Ne pas utiliser l'icône app comme simple carte decorative dans l'UI : elle est reservee a l'identite produit, PWA, notifications et splash.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Container padding:** `p-4 md:p-8 lg:p-12`
- **Section gap:** `gap-8 md:gap-12`
- **Item gap:** `gap-3 md:gap-4`

## Layout
- **Approach:** Hybrid — grille disciplinee pour dashboards/classements/data, creative pour hero/marketing
- **Grid:** 1 col mobile, 2-3 col tablette, 3-4 col desktop (bento-style pour le dashboard)
- **Max content width:** 1200px
- **Border radius:** sm: 2px (boutons, badges), md: 6px (cartes, inputs), lg: 12px (modales, countdown cards), xl: 16px (hero cards), full: 9999px (avatars, pills)
- **Navigation:**
  - Mobile: bottom nav fixe (`position: fixed; bottom: 0`) avec backdrop-blur, 5 items : Accueil, Pronostics, Direct, Classements, Profil
  - Desktop: sidebar gauche 64-240px
- **Card pattern:** `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md)` + hover: `border-color: var(--border-hover); transform: translateY(-2px)`
- **Featured card pattern:** Ajouter `border-left: 3px solid var(--primary)` et un radial-gradient rouge subtil en ::before

## Motion
- **Approach:** Expressive — c'est ici que "plus fun que l'officiel" se materialise. Les animations sont un investissement UX, pas de la decoration.
- **Library:** Framer Motion (deja installe)
- **Easing:** enter: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out overshoot), exit: `ease-in`, move: `ease-in-out`
- **Duration:** micro(80ms) short(200ms) medium(350ms) long(600ms)
- **Animations cles:**
  - **Page transitions:** slide + fade, 300ms ease-out
  - **Score counter:** nombre qui increment avec glow vert, translateY animate
  - **Countdown pulse:** text-shadow rouge qui pulse toutes les 3s sur le timer pre-course
  - **Stagger reveal:** classement, listes — chaque ligne apparait avec 50-80ms de delai, translateX(-12px) vers 0
  - **Selection driver:** glow rouge (box-shadow 0 0 20px primary-glow), scale 1.02, transition 300ms
  - **CTA hover:** scale 1.05 + sweep lumineux (::after translateX) + box-shadow intensifie
  - **Live badge:** dot rouge qui pulse (opacity 1 -> 0.3, 1.5s infinite)
  - **Feux de depart:** 5 cercles qui s'allument en sequence (600ms delay entre chaque), background + box-shadow animate. Pour le countdown pre-course et le hero marketing.
  - **Celebration victoire:** confetti + trophee 3D (a implementer avec Three.js ou Lottie)
- **Performance:** Toutes les animations doivent utiliser `transform` et `opacity` uniquement (GPU-accelerated). Tester sur mobile bas de gamme. `will-change` sur les elements animes frequemment. `prefers-reduced-motion: reduce` doit desactiver les animations non-essentielles.

## Assets 3D & Video
### Inventaire des assets de marque
| Asset                   | Format                                | Usage                                                      |
| ----------------------- | ------------------------------------- | ---------------------------------------------------------- |
| **Kit logo v1**         | SVG + PNG                             | Reference officielle pour variantes, favicon, PWA et menus |
| **Wordmark horizontal** | SVG prioritaire, PNG fallback         | Menus, headers, splash, auth, supports externes            |
| **Icône app**           | PNG source, exports 16/32/180/192/512 | Source favicon, PWA, notifications, homescreen             |
| **Cinematic trailer**   | MP4, 9:16                             | Splash screen, onboarding, landing page hero               |
| **Jingle intro**        | M4A                                   | Splash screen audio, notifications sonores, branding audio |
| **Modeles 3D**          | glTF/GLB                              | Transitions, celebrations podium, animations hero          |
| **Videos de marque**    | MP4, 9:16                             | Login background, pages marketing, teasing GP              |

### Guidelines video
- **Splash screen:** Video 9:16 plein ecran (`/video/splash-trailer.mp4`, 1080x1920, 12.1s, H.264+AAC). Autoplay muted, unmute au premier tap. Fondu audio progressif sur les 2 dernieres secondes. Bouton "Passer" en haut a droite (pill glass). Barre de progression rouge en bas. Transition de sortie : sweep rouge horizontal + flash blanc-rouge + fade vers le formulaire auth. Skip au tap ou a la fin de la video. `prefers-reduced-motion` : pas de splash, affichage direct du formulaire.
- **Login / onboarding:** Video loop ambient en background, muted, overlay gradient Noir Carbone 60-80% pour lisibilite du formulaire.
- **Pages marketing / teasing:** Video hero autoplay avec parallax leger sur scroll.
- **Implementation:** `<video autoplay muted loop playsinline>` avec `object-fit: cover`. Prevoir un fallback image statique (premier frame exporté) pour les connexions lentes. Lazy-load les videos hors viewport. Timeout securite : splash max 14s.

### Guidelines audio
- **Jingle intro:** Jouer uniquement au premier lancement ou splash screen. Respecter les preferences systeme (mode silencieux, `prefers-reduced-motion`). Ne jamais jouer en boucle.
- **Feedback sonore:** Sons courts (<500ms) pour les interactions cles : validation de pronostic, gain de points, podium. Volume a 30% max par defaut, configurable dans les settings utilisateur.
- **Implementation:** Web Audio API pour les sons courts, `<audio>` pour le jingle. Toujours gerer le cas ou l'autoplay audio est bloque par le navigateur (interaction utilisateur requise).

### Guidelines 3D
- **Modeles 3D:** Disponibles pour animations de transition entre ecrans majeurs et celebrations (victoire en ligue, podium).
- **Implementation:** Three.js pour les elements interactifs, Lottie pour les animations pre-rendues plus legeres. Toujours fournir un fallback 2D.
- **Performance:** Limiter les modeles a <2MB chacun. Utiliser Draco compression pour les glTF. Charger en async, ne jamais bloquer le rendu initial.

### Hero backgrounds
- Parallax leger sur scroll (translateY a 50% de la vitesse de scroll), gradient overlay Noir Carbone pour garantir la lisibilite du texte.

## Component Patterns
### Boutons
- **Primary:** `bg-primary hover:bg-[#C00500] text-white shadow-[0_0_15px_rgba(225,6,0,0.4)] transition-all duration-300 hover:scale-105` — Racing Sans One uppercase
- **Effet lumineux bordure v2 (CTA critiques):** variante inspiree de ReactBits Border Glow : le glow reagit a la proximite du pointeur avec une bordure mesh-gradient rouge/blanc et un halo externe directionnel. Appliquer via le composant `BorderGlowButton` et la classe `.btn-pk-glow` aux actions determinantes uniquement : login, creation de compte, finalisation/enregistrement des pronostics, paiement/validation future.
- **Effet lumineux bordure (Primary legacy):** Conic-gradient rotatif (`@property --pk-border-angle`) qui cree un point de lumiere blanc-rose voyageant autour du bouton en boucle (4s linear). Sweep lumineux interne (::before, 60% width, 4s interval). Les deux effets ensemble donnent un bouton "vivant" sans etre agressif.
- **Effet lumineux bordure (Outline):** Meme principe mais plus subtil (opacity 0.12-0.22), visible uniquement au hover (6s rotation).
- **Classes CSS:** `.btn-pk` (primary), `.btn-pk-glow` (primary v2 critique), `.btn-pk-outline` (outline), `.btn-pk-ghost` (ghost)
- **Outline:** `bg-transparent border border-white/8 text-white hover:border-white/15 hover:bg-white/3` + border light au hover
- **Ghost:** `bg-transparent text-zinc-500 hover:text-white`

### Cartes
- **Base:** `bg-surface border border-white/8 rounded-md` + hover: `border-white/15 translateY(-2px) shadow-xl`
- **Featured:** Ajouter `border-l-3 border-primary` + radial-gradient rouge subtil
- **Selected:** `border-primary shadow-[0_0_20px_rgba(225,6,0,0.4)] bg-primary/8`

### Inputs
- **Style:** `bg-zinc-950/50 border border-white/8 rounded-sm focus:border-primary focus:ring-1 focus:ring-primary/15 h-12 font-body`

### Navigation mobile
- **Bottom bar:** `fixed bottom-0 bg-zinc-950/92 backdrop-blur-xl border-t border-white/8 h-16 z-50`
- **Icons:** Lucide React, `stroke-width: 1.5`, 22px
- **Labels:** JetBrains Mono, 8-9px, uppercase, tracking 0.1em
- **Active state:** color primary

### Classement
- **Position top 3:** Gold/Silver/Bronze
- **User row:** `bg-primary/8` background subtil, nom en primary, font-weight 600
- **Animation:** Stagger reveal 50ms entre chaque ligne

### Live Race
- **Badge "En Direct":** dot rouge animé + texte uppercase + border rouge subtile
- **Team colors:** bande verticale 3px de la couleur de l'ecurie a gauche de chaque ligne
- **Intervals:** vert pour positif (derriere), rouge pour negatif (perte de positions)

## Universal Rules
- Toujours utiliser `data-testid` sur les elements interactifs
- Dark mode is NOT optional. It is the only mode.
- Le Rouge Vitesse `#E10600` est reserve aux actions primaires. L'utiliser avec parcimonie pour maintenir son impact.
- Les bordures sont subtiles (opacity 8-15%) sauf en etat actif/focus.
- La hierarchie typographique est stricte : Racing Sans One pour l'impact, Chivo pour la lecture, JetBrains Mono pour la data.
- Pas de gradients sur le texte. La lisibilite des donnees est prioritaire.
- Mobile-first : les touch targets font au minimum 44px.
- Utiliser Lucide React pour les icones, stroke-width 1.5.
- Utiliser Sonner pour les toasts.
- Les photos de pilotes et circuits sont des assets essentiels — ne pas les remplacer par des placeholders generiques en production.

## Decisions Log
| Date       | Decision                                                                  | Rationale                                                                                                                        |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-22 | Design system "Broadcast Premium" cree                                    | Formalise la direction artistique existante des mockups PronoKif F1                                                              |
| 2026-05-22 | Racing Sans One conserve comme display font                               | Font signature du projet, deja presente dans le branding et les mockups                                                          |
| 2026-05-22 | Dark-only confirme                                                        | Tous les concurrents sont dark/dark-first, les fans F1 s'y attendent, cohérent avec l'ambiance broadcast nocturne                |
| 2026-05-22 | Motion expressive choisie                                                 | Differenciation "plus fun que l'officiel" — les animations sont l'investissement UX principal                                    |
| 2026-05-22 | Assets 3D et video 9:16 integres au design system                         | Le fondateur dispose de modeles 3D et videos de marque, les guidelines d'implementation sont documentees                         |
| 2026-05-22 | Or/Argent/Bronze pour le podium                                           | Medailles visuelles pour le top 3 dans les classements, pattern des mockups existants                                            |
| 2026-05-22 | Palette officielle integree (Rouge Vitesse #E10600, Noir Carbone #0B0D12) | Alignement sur la charte de marque officielle — remplace les couleurs provisoires (#EF4444, #09090b)                             |
| 2026-05-22 | Section Logo & Brand Identity ajoutee                                     | PK monogramme, variantes, tailles, zone de protection — formalise les regles d'usage du logo                                     |
| 2026-05-22 | Assets audio documentes (jingle, feedback sonore)                         | Le fondateur dispose d'un jingle intro, guidelines d'implementation audio ajoutees                                               |
| 2026-05-22 | Splash screen video integre                                               | Video cinematique 12.1s en splash avec fondu audio, transition dynamique sweep rouge, skip button                                |
| 2026-05-22 | Effets lumineux bordure boutons                                           | Conic-gradient rotatif CSS Houdini sur .btn-pk (primary) et .btn-pk-outline (hover), sweep lumineux interne                      |
| 2026-05-23 | Theme v2 CTA Border Glow ajoute                                           | Adapte ReactBits Border Glow aux CTA critiques avec palette PronoKif, halo directionnel pointer-aware et fallback motion reduite |
| 2026-05-27 | Branding officiel v1 integre                                              | Les assets `LOGO V2` deviennent les references pour favicon, PWA, wordmark horizontal et symboles UI                             |
