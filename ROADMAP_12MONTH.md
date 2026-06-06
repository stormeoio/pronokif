# Pronokif — Feuille de route 12 mois vers le lancement bêta F1 2027
**Objectif** : Application prête pour la production supportant 1 000+ utilisateurs simultanés
**Lancement** : Mars 2027 (avant l'ouverture de la saison F1 2027)
**Budget** : 150 000 € - 250 000 € (équipe à plein temps + infrastructure)
**Dernière mise à jour livrables** : 6 juin 2026, 05:00 CEST

---

## Journal des livrables réalisés

### 30 mai 2026 — Parcours pronostics
- [x] Polish UX/UI du parcours pronostics multi-étapes — livré le 30 mai 2026 (`851620a`)
- [x] Pipeline de pronostics compact en accordéon vertical — livré le 30 mai 2026 (`ebc8a45`, `9e0091d`)
- [x] Fix du scroll automatique après validation d'étape wizard — livré le 30 mai 2026 (`d2b91ea`)
- [x] Couverture des parcours pronostics : sauvegarde complète, bonus, sprint complet, suppression existante — livré le 30 mai 2026 (`2c100c8`, `b33d72d`, `5b0538b`, `5d9dd6b`)

### 31 mai 2026 — Back office admin métier, médias et RAG
- [x] KPIs dashboard admin sur une seule ligne compacte — livré le 31 mai 2026 (`f953420`)
- [x] Médiathèque admin avec dossiers, uploads de vignettes et réutilisation des médias — livré le 31 mai 2026 (`5a1cfed`, `a81e819`)
- [x] Sélecteurs médias admin pour branding, icône PWA et avatars utilisateurs — livré le 31 mai 2026 (`4687bb6`, `5d5ec08`, `3447845`)
- [x] Logo Pronokif admin relié au dashboard home — livré le 31 mai 2026 (`dd1366a`)
- [x] Dashboard home enrichi avec derniers inscrits, derniers pronostics et derniers logs — livré le 31 mai 2026 (`4d6c7e5`, `1ea1de1`)
- [x] Deep links admin vers fiches pronostics, courses, scoring et utilisateurs — livré le 31 mai 2026 (`21f3f31`, `e798541`)
- [x] Watchlist courses métier avec GP à surveiller et actions restantes — livré le 31 mai 2026 (`fcd26d9`)
- [x] Raccourcis dashboard vers pronostics verrouillés, à revoir, 7 jours et 24h — livré le 31 mai 2026 (`9eeb19b`, `a8adcd4`)
- [x] Horodatage de dépôt pronostic basé sur le dernier marqueur d'activité — livré le 31 mai 2026 (`b2e5a6f`, `a8adcd4`)
- [x] Visuels médias exposés dans les entités de connaissance et briefs RAG — livré le 31 mai 2026 (`3d52e88`, `b9907ed`)

### 31 mai 2026 — Release, branding et documentation
- [x] Section branding admin pour logos, favicon, icônes PWA et couleurs de thème — livré le 31 mai 2026 (`b2a8c3e`)
- [x] Nom d'application figé et non modifiable côté admin — livré le 31 mai 2026 (`b2a8c3e`)
- [x] Footer admin avec numéro de version cliquable vers le changelog — livré le 31 mai 2026 (`7672fa0`)
- [x] Onglets DevOps réorganisés : Audit, Roadmap, Beta, Légal & PWA, Base RAG, Traductions — livré le 31 mai 2026 (`746f45b`)
- [x] Traductions limitées à l'UI front, contenus utilisateurs exclus, back-office 100 % français — livré le 31 mai 2026 (`f5789fc`)
- [x] Deep links admin `/admin/:tab`, `/bo-admin/:tab`, `/admin-bo/:tab` sans 404 — livré le 31 mai 2026 (`301451b`)
- [x] Smoke test prod final : health, branding endpoint, bundle, `/admin/settings`, `/mentions-legales` — livré le 31 mai 2026 (`301451b`)
- [x] Documentation projet, changelog, audit, runbook et fiche back-office actualisés — livré le 31 mai 2026 (`docs`)

### 5-6 juin 2026 — Visuels pilotes, dark/light admin et mobile-first
- [x] Dark/light mode admin complet (372 overrides CSS) — livré le 5 juin 2026 (`3713989`)
- [x] Upload photos pilotes dark/light dans l'admin (backend + frontend + resolver) — livré le 5 juin 2026 (`a7431c1`)
- [x] Refonte page pilote immersive (hero bandeau, radar chart SVG, cercles de progression) — livré le 6 juin 2026 (`6390a5c`)
- [x] Viewport mobile-first max-w-md sur desktop + PWA install CTA profil — livré le 6 juin 2026 (`d3c8785`)
- [x] Photos admin dans le classement championnat — livré le 6 juin 2026 (`6c08bed`)
- [x] Photos admin sur l'API publique (get_details + get_all async) — livré le 6 juin 2026 (`07f537b`)
- [x] Hero photo absolute positioning pour PNG detourees — livré le 6 juin 2026 (`2f799f4`)
- [x] Fix toast erreur upload + dead code cleanup — livré le 6 juin 2026 (`fe11352`)
- [x] Bottom nav + ScrollToTop contraints au viewport mobile — livré le 6 juin 2026 (`c26cb2d`)
- [ ] Carrousel "Derniers résultats" sur fiche pilote (données API manquantes)
- [ ] Dark/light mode étendu à l'app publique (gros chantier, après validation admin)

## Contexte stratégique

Pronokif vise à capter la **communauté de niche des fans de F1** (estimée à 500K-1M en UE/UK) en proposant une **plateforme de sport fantasy** combinant pronostics, ligues, mini-jeux et compétition en temps réel.

**Critères de succès** :
- ✅ 1 000+ utilisateurs actifs d'ici mars 2027
- ✅ 99,5 % de disponibilité pendant les événements de course
- ✅ <500 ms de temps de réponse (p95)
- ✅ Adéquation produit-marché avec NPS >30
- ✅ Zéro vulnérabilité de sécurité critique

---

## Phase 1 : Fondation (Mois 1-3, Avril-Juin 2026)

### 1.1 Objectifs
- Corriger les vulnérabilités de sécurité critiques
- Compléter l'audit UI/UX et le design system
- Établir l'infrastructure de développement
- Préparer la bêta avec 25 utilisateurs

### 1.2 Livrables

#### Logiciel
- [x] Correctifs de sécurité P0/P1 historiques (auth, cookies, magic links, rate limits, CORS) — livré en mai 2026
- [ ] Documentation du design system + Storybook
- [ ] Architecture de composants refactorisée
- [x] Correction du flux d'onboarding (45 % d'abandon) — livré le 30 mai 2026 (`05d6d75`)
- [ ] Error boundaries et page d'erreur 500
- [x] Pipeline CI/CD GitHub Actions — livré en mai 2026 (`.github/workflows/ci.yml`, `.github/workflows/cd.yml`)
- [x] Intégration du suivi d'erreurs Sentry — livré en mai 2026 (`backend/server.py`, `frontend/src/lib/sentry.ts`)
- [ ] Intégration Google Analytics

#### Infrastructure
- [ ] Configuration VPS DigitalOcean (2 vCPU, 8 Go RAM)
- [ ] Configuration MongoDB Atlas (palier gratuit)
- [x] DNS/SSL production `pronokif.eu` — vérifié le 31 mai 2026
- [ ] Sauvegardes quotidiennes automatisées
- [x] Monitoring via health check `/api/health` — vérifié le 31 mai 2026

#### Documentation
- [ ] Architecture decision records (ADRs)
- [x] Documentation API OpenAPI/Swagger via FastAPI `/docs` — disponible en mai 2026
- [x] Runbook de déploiement — actualisé le 31 mai 2026 (`docs/RUNBOOK.md`, `docs/DEPLOY.md`)
- [x] Politique de sécurité et plan de réponse aux incidents — documentés en mai 2026 (`SECURITY.md`)

### 1.3 Besoins en ressources

**Équipe** :
- 1x Ingénieur Full-Stack Senior (1 FTE) — Architecture principale, sécurité
- 1x Ingénieur Frontend (1 FTE) — Refactoring UI/UX, design system
- 1x Ingénieur Backend (0,5 FTE) — Correctifs de sécurité, optimisation API
- 1x Product Manager (0,3 FTE) — Sélection utilisateurs bêta, feedback
- 1x QA/DevOps (0,3 FTE) — Tests, infrastructure

**Total** : 3,1 FTE

**Coût** :
```
Salaires ingénieurs (3,1 FTE) :    150 000 € (3 mois)
├─ Senior : 70 €/h × 40 h/semaine × 13 semaines = 36 400 €
├─ Frontend : 50 €/h × 40 h/semaine × 13 semaines = 26 000 €
├─ Backend : 35 €/h × 20 h/semaine × 13 semaines = 9 100 €
├─ PM : 45 €/h × 12 h/semaine × 13 semaines = 7 020 €
└─ QA/DevOps : 35 €/h × 12 h/semaine × 13 semaines = 5 460 €

Infrastructure :              600 €
├─ VPS : 100 €/mois × 3 = 300 €
├─ MongoDB Atlas : 45 €/mois × 3 = 135 €
└─ Domaine : 1 €/mois × 3 = 3 €

Outils et services :          500 €
├─ Sentry : Gratuit (0 $)
├─ GitHub : Gratuit (0 $)
├─ Cloudflare : Gratuit (0 $)
└─ Outils de design (Figma) : 100 €/mois × 3 = 300 €

Tests/QA :                  1 000 €
├─ Outils de test de charge
└─ Tests navigateur

─────────────────────────────
TOTAL PHASE 1 :             ~152 600 €
```

### 1.4 Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| L'audit de sécurité révèle des bugs critiques | Élevée | Critique | Commencer immédiatement, allouer 30 % du sprint |
| Retards d'implémentation du design system | Moyenne | Élevé | Utiliser un template (shadcn/ui), prioriser le MVP |
| La montée en compétence de l'équipe ralentit la vélocité | Moyenne | Moyen | Pair programming, syncs quotidiennes |
| Problèmes d'infrastructure | Faible | Moyen | Utiliser des services managés (Atlas, Cloudflare) |

---

## Phase 2 : Finalisation MVP (Mois 4-6, Juillet-Septembre 2026)

### 2.1 Objectifs
- Publier la bêta auprès de 25 utilisateurs initiaux
- Valider les fonctionnalités clés (pronostics, ligues, scoring)
- Recueillir les retours produit
- Préparer la montée en charge

### 2.2 Livrables

#### Fonctionnalités
- [x] Système complet de pronostics (qualifications + course + sprint) — livré le 30 mai 2026 (`2c100c8`, `5b0538b`)
- [ ] Gestion des ligues (créer, rejoindre, inviter, chat)
- [ ] Classements en temps réel
- [ ] Mini-jeux (réaction, batak)
- [ ] Profils utilisateurs et succès
- [ ] Système de notifications (in-app + email)
- [ ] Responsive mobile (navigateur iOS/Android)

#### Qualité
- [ ] 90 % de couverture de tests unitaires (backend)
- [ ] 50 % de couverture de tests d'intégration
- [ ] Audit d'accessibilité (WCAG 2.1 AA)
- [ ] Optimisation des performances (test de charge 100 utilisateurs)
- [ ] Pentest de sécurité (externe si le budget le permet)

#### Opérations
- [ ] Mise en place monitoring et alerting (Sentry + DataDog)
- [ ] Runbook pour problèmes courants
- [ ] Email/formulaire de support pour les retours utilisateurs
- [x] Tableau de bord analytics personnalisé admin — livré le 31 mai 2026 (`4d6c7e5`, `1ea1de1`, `a8adcd4`)
- [ ] Intégration Google Analytics / tracking acquisition

### 2.3 Priorité d'implémentation des fonctionnalités

**Semaines 1-2** (Essentiel) :
- [x] Création et soumission de pronostics — livré le 30 mai 2026 (`2c100c8`, `b33d72d`)
- [ ] Calendrier des courses et détails des événements
- [ ] Classements de ligues
- [ ] Authentification et profils utilisateurs

**Semaines 3-4** (Valeur fondamentale) :
- [ ] Intégration des mini-jeux
- [ ] Chat de ligue (temps réel)
- [ ] Algorithme de scoring et attribution de points
- [ ] Classement du championnat

**Semaines 5-6** (Finition) :
- [ ] Notifications (push + email)
- [x] Optimisation mobile du parcours pronostics — livré le 30 mai 2026 (`851620a`, `ebc8a45`)
- [ ] Corrections d'accessibilité
- [ ] Optimisation des performances
- [x] Supports d'onboarding utilisateurs bêta — livré le 30 mai 2026 (`05d6d75`)

### 2.4 Besoins en ressources

**Équipe** (Élargir pour la vélocité des features) :
- 1x Full-Stack Senior (1 FTE)
- 1x Frontend (1 FTE)
- 1x Backend (1 FTE)
- 1x QA/DevOps (0,5 FTE)
- 1x Product Manager (0,5 FTE)

**Total** : 4 FTE

**Coût** :
```
Salaires (4 FTE) :            240 000 € (3 mois)
├─ Senior : 70 €/h × 13 semaines × 40 h = 36 400 €
├─ Frontend : 50 €/h × 13 semaines × 40 h = 26 000 €
├─ Backend : 50 €/h × 13 semaines × 40 h = 26 000 €
├─ QA : 35 €/h × 13 semaines × 20 h = 9 100 €
└─ PM : 45 €/h × 13 semaines × 20 h = 11 700 €

Infrastructure :              2 700 €
├─ Upgrade VPS : 150 €/mois × 3 = 450 €
├─ MongoDB Atlas : 75 €/mois × 3 = 225 €
├─ Cache Redis : 50 €/mois × 3 = 150 €
├─ DataDog : 50 €/mois × 3 = 150 €
└─ SendGrid : 30 €/mois × 3 = 90 €

Tests et QA :                 2 000 €
├─ Outils de load testing
├─ Pentest de sécurité (partiel)
└─ Services de tests navigateur

Marketing et outreach :       2 000 €
├─ Recrutement utilisateurs bêta
└─ Landing page (simple)

─────────────────────────────
TOTAL PHASE 2 :              ~246 700 €
```

### 2.5 Sélection des utilisateurs bêta

**Critères** (25 utilisateurs) :
- Fans de F1 actifs (followers Twitter/Reddit)
- Culture technique (capables de remonter des bugs clairement)
- Diversité géographique (UE + UK + US)
- Mix d'utilisateurs occasionnels et hardcore
- Engagement : 1 h+/semaine pendant la bêta

**Recrutement** :
- Subreddit F1 (r/formula1) : Post épinglé + DMs
- Communauté Twitter F1 : Publicités payantes + organique
- Serveurs Discord F1 : Contact direct
- Réseau personnel : Recommandations

**Boucle de feedback** :
- Interviews hebdomadaires en 1-on-1 (5 utilisateurs/semaine)
- Formulaire de feedback in-app
- Canal communautaire Discord
- Appels bi-hebdomadaires de revue produit

---

## Phase 3 : Montée en charge et stabilisation (Mois 7-9, Octobre-Décembre 2026)

### 3.1 Objectifs
- Étendre à 500 utilisateurs actifs
- Atteindre 99,5 % de disponibilité
- Optimiser les performances pour la montée en charge
- Préparer la production

### 3.2 Livrables

#### Fonctionnalités
- [ ] Palier premium (si monétisation) : supporter à 5 €/mois
- [ ] Statistiques et analytics avancés
- [ ] Outil de comparaison de pilotes
- [ ] Système de succès et badges
- [ ] Brackets de tournoi (optionnel)
- [ ] API pour intégrations tierces
- [ ] Application mobile (PWA installable)

#### Infrastructure
- [ ] Configuration en load balancing (2-3 serveurs)
- [ ] MongoDB Atlas (palier payant)
- [ ] Couche de caching Redis
- [ ] Optimisation CDN
- [ ] Optimisation base de données (index, requêtes)

#### Fiabilité
- [ ] 99,5 % de disponibilité (objectif)
- [ ] <500 ms de temps de réponse (p95)
- [ ] Auto-scaling configuré
- [ ] Plan de reprise après sinistre
- [ ] Tests de sauvegarde et restauration

### 3.3 Besoins en ressources

**Équipe** :
- 1x Full-Stack Senior (1 FTE)
- 1x Frontend (1 FTE)
- 1x Backend (1 FTE)
- 1x DevOps/Infrastructure (0,5 FTE)
- 1x QA (0,5 FTE)
- 1x Product Manager (0,5 FTE)
- 1x Designer (0,3 FTE) — Raffinements restants

**Total** : 5,3 FTE

**Coût** :
```
Salaires (5,3 FTE) :          318 000 € (3 mois)

Infrastructure :              8 000 €
├─ Serveurs en load balancing : 250 €/mois × 3 = 750 €
├─ MongoDB Atlas : 150 €/mois × 3 = 450 €
├─ Redis : 100 €/mois × 3 = 300 €
├─ DataDog : 100 €/mois × 3 = 300 €
├─ Sauvegardes (AWS S3) : 50 €/mois × 3 = 150 €
└─ CDN (Cloudflare Pro) : 20 €/mois × 3 = 60 €

Tests et DevOps :             5 000 €
├─ Test de charge (professionnel)
├─ Audit de sécurité (complet)
└─ Optimisation des performances

─────────────────────────────
TOTAL PHASE 3 :              ~331 000 €
```

### 3.4 Préparation pré-saison

**Tâches de décembre** :
- [ ] Audit complet de l'infrastructure
- [ ] Test de charge (1 000+ utilisateurs simultanés)
- [ ] Pentest de sécurité (final)
- [ ] Migration/nettoyage des données
- [ ] Mises à jour documentation
- [ ] Formation on-call
- [ ] Exercices de réponse aux incidents

---

## Phase 4 : Lancement et opérations (Mois 10-12, Janvier-Mars 2027)

### 4.1 Objectifs
- **Lancement public** (bêta ouverte → production)
- Supporter 1 000+ utilisateurs simultanés
- Atteindre les métriques d'adéquation produit-marché
- Préparer la saison F1 2027

### 4.2 Calendrier

**Janvier 2027** :
- Semaine 1 : Tests de charge internes
- Semaine 2 : Extension de la bêta fermée (100 utilisateurs)
- Semaine 3 : Annonce du lancement public
- Semaine 4 : Onboarding et acquisition utilisateurs

**Février 2027** :
- Surveiller les performances pendant les tests de Bahrain
- Optimiser en fonction des patterns de trafic réel
- Élargir les efforts marketing
- Engagement communautaire

**Mars 2027** :
- **Ouverture de la saison F1 2027 (Bahrain Grand Prix)**
- Pic attendu : 500-1 000 utilisateurs simultanés
- Monitoring en direct et réponse aux incidents
- Célébrer le lancement ! 🎉

### 4.3 Plan de croissance utilisateurs

**Objectifs** :
```
Janvier :   100 utilisateurs (20 actifs/jour)
Février :   300 utilisateurs (50 actifs/jour)
Mars :      1 000+ utilisateurs (200+ actifs/jour pendant les courses)
```

**Canaux d'acquisition** :
1. **Organique** (50 %) :
   - Reddit (r/formula1, subreddits de niche)
   - Twitter (comptes @F1, communautés)
   - Serveurs Discord F1

2. **Payant** (30 %) :
   - Publicités Facebook/Instagram (2 000 €/mois)
   - Google Ads (1 000 €/mois)
   - Publicités Reddit (500 €/mois)

3. **Partenariats** (20 %) :
   - Podcasts F1 (sponsorings)
   - Chaînes YouTube F1 (placement produit)
   - Communautés Discord (partenariats)

**Objectif CAC** : 5-10 € par utilisateur (retour sur investissement en 3-6 mois si monétisation)

### 4.4 Besoins en ressources

**Équipe** :
- 1x Full-Stack Senior (1 FTE)
- 1x Frontend (1 FTE)
- 1x Backend (1 FTE)
- 1x DevOps/SRE (1 FTE) — On-call 24/7 pendant les courses
- 1x QA (0,5 FTE)
- 1x Product Manager (1 FTE)
- 1x Community Manager (0,5 FTE)
- 1x Marketing (0,5 FTE)

**Total** : 7 FTE

**Coût** :
```
Salaires (7 FTE) :            420 000 € (3 mois)

Infrastructure :              12 000 €
├─ Serveurs de production : 400 €/mois × 3 = 1 200 €
├─ MongoDB Atlas : 300 €/mois × 3 = 900 €
├─ Redis : 200 €/mois × 3 = 600 €
├─ DataDog : 200 €/mois × 3 = 600 €
├─ Autres services : 300 €/mois × 3 = 900 €

Marketing et croissance :     8 000 €
├─ Publicités payantes (Facebook/Google) : 2 500 €/mois × 3 = 7 500 €
└─ Création de contenu (guest posts, etc.)

─────────────────────────────
TOTAL PHASE 4 :              ~440 000 €
```

---

## Récapitulatif complet du budget 12 mois

| Phase | Mois | Nom | Équipe | Coût | Cumulé |
|-------|------|-----|--------|------|--------|
| **Phase 1** | 1-3 | Fondation | 3,1 FTE | 153 K€ | 153 K€ |
| **Phase 2** | 4-6 | Finalisation MVP | 4 FTE | 247 K€ | 400 K€ |
| **Phase 3** | 7-9 | Montée en charge | 5,3 FTE | 331 K€ | 731 K€ |
| **Phase 4** | 10-12 | Lancement | 7 FTE | 440 K€ | **1,171 M€** |

**Investissement total sur 12 mois** : **~1,17 M€** (incluant tous les salaires, infrastructure, marketing)

---

## Répartition par catégorie de coûts

| Catégorie | Total | Pourcentage |
|-----------|-------|-------------|
| **Personnel** (salaires) | 828 K€ | 71 % |
| **Infrastructure** (serveurs, bases de données, CDN) | 23 K€ | 2 % |
| **Outils et services** (Sentry, DataDog, frais Stripe, etc.) | 12 K€ | 1 % |
| **Tests et QA** | 8 K€ | 0,7 % |
| **Marketing et croissance** | 10 K€ | 0,9 % |
| **Design et documentation** | 5 K€ | 0,4 % |
| **Contingence (10 %)** | 100 K€ | 8,5 % |
| **Buffer (6 %)** | 73 K€ | 6,2 % |
| **Non encore alloué** | ~121 K€ | 10 % |
| **TOTAL** | **1 171 K€** | **100 %** |

---

## Scénarios de budget alternatifs

### Scénario Lean (750 K€ - Mode startup)

**Approche** : Équipe minimale, freelances pour les travaux spécialisés

```
Phase 1 (3 mois) :    80 K€ (2 FTE : Ingénieur Sr + Designer)
Phase 2 (3 mois) :    120 K€ (2,5 FTE + QA freelance)
Phase 3 (3 mois) :    200 K€ (3 FTE + prestataire DevOps)
Phase 4 (3 mois) :    250 K€ (4 FTE + bénévole communauté)
Infrastructure :      30 K€ (services managés)
Marketing :           5 K€ (organique + grassroots)
───────────────────────────
TOTAL :               685 K€
```

**Risques** : Moins de tests, problèmes de qualité potentiels, risque de burnout plus élevé

### Scénario Premium (1,5 M€ - Bien financé)

**Approche** : Équipe plus large, prestataires externes pour l'expertise

```
Phase 1 : 200 K€ (4 FTE + consultants)
Phase 2 : 350 K€ (5 FTE + laboratoire QA)
Phase 3 : 450 K€ (6 FTE + équipe DevOps)
Phase 4 : 500 K€ (8 FTE + équipe marketing)
Infrastructure : 50 K€ (services best-in-class)
Services externes : 50 K€ (audit sécurité, branding, etc.)
───────────────────────────
TOTAL :  1 500 K€
```

**Bénéfices** : Qualité supérieure, calendrier plus rapide, moins de risques

---

## Dépendances et contraintes clés

### 1. Disponibilité de l'API OpenF1
- **Risque** : Données de course indisponibles pendant la course (mises à jour de course retardées)
- **Mitigation** : Cache local, implémenter un fallback des données, tester face aux pannes d'OpenF1
- **Impact calendrier** : Élevé - bloque les mises à jour de résultats de course en Phase 2

### 2. Disponibilité de l'équipe
- **Risque** : Membres clés de l'équipe indisponibles (vacances, autres projets)
- **Mitigation** : Tout documenter, cross-training, chevauchement des embauches
- **Impact calendrier** : Élevé - 1 mois de retard par personne perdue

### 3. Dates du calendrier F1 2027
- **Risque** : Modifications du calendrier F1, dates de test, etc.
- **Mitigation** : Suivre le calendrier F1 officiel, intégrer de la flexibilité dans l'API
- **Impact calendrier** : Faible - adaptation rapide possible

### 4. Réglementaire (RGPD, etc.)
- **Risque** : Exigences de conformité RGPD pour les utilisateurs UE
- **Mitigation** : Intégré dans l'audit de sécurité de la Phase 1
- **Impact calendrier** : Moyen - ajoute ~2 semaines

### 5. SLA des services tiers
- **Risque** : Pannes MongoDB, Stripe, SendGrid
- **Mitigation** : Fallbacks multi-fournisseurs, caching local
- **Impact calendrier** : Faible - gérable avec une architecture appropriée

---

## Métriques de succès par phase

### Phase 1 (Fondation)
- ✅ Toutes les vulnérabilités de sécurité P0 corrigées
- ✅ Design system documenté (Storybook fonctionnel)
- ✅ Pipeline CI/CD fonctionnel
- ✅ Plan de réponse aux incidents documenté
- ✅ Équipe intégrée et vélocité >20 story points/sprint

### Phase 2 (MVP)
- ✅ 25 utilisateurs bêta inscrits
- ✅ 90 % des fonctionnalités clés fonctionnelles
- ✅ NPS >20 des utilisateurs bêta
- ✅ <1 % de taux d'erreur dans Sentry
- ✅ <500 ms de latence p95
- ✅ ≥80 % de couverture de tests unitaires

### Phase 3 (Montée en charge)
- ✅ 500 utilisateurs actifs
- ✅ 99,5 % de disponibilité (mesurée)
- ✅ Auto-scaling activé et validé
- ✅ Test de charge (1 000 simultanés) réussi
- ✅ Palier premium fonctionnel (si monétisation)
- ✅ Responsive mobile >90 % Lighthouse

### Phase 4 (Lancement)
- ✅ 1 000+ utilisateurs actifs dès le jour 1
- ✅ <10 bugs critiques post-lancement
- ✅ 99,9 % de disponibilité pendant le Bahrain GP
- ✅ <500 ms de latence pendant le pic de trafic
- ✅ Engagement communautaire (Discord 500+ membres)
- ✅ Indicateurs d'adéquation produit-marché (NPS >50, rétention >60 %)

---

## Matrice de mitigation des risques

### Éléments à haut risque (Peuvent impacter le calendrier)

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Retards d'embauche de l'équipe | Élevée | Critique | Démarrer le recrutement immédiatement (Mois -1) |
| Dérive du périmètre | Élevée | Élevé | Définir strictement le MVP, imposer un contrôle des changements |
| Vulnérabilités de sécurité découvertes | Moyenne | Critique | Ingénieur sécurité dédié en Phase 1 |
| Coûts d'infrastructure dépassant le budget | Moyenne | Élevé | Utiliser des services managés, implémenter des alertes de coût |
| Acquisition utilisateurs plus lente qu'attendu | Moyenne | Moyen | Démarrer le marketing tôt (Phase 2), partenariats |
| Changements d'API tierce (OpenF1) | Faible | Moyen | Monitorer les APIs, construire des adaptateurs, versionner les endpoints |
| Départ d'un membre clé de l'équipe | Moyenne | Élevé | Chevauchement des embauches, tout documenter, backup 2x |

### Éléments à risque moyen (Gérables)

| Risque | Mitigation |
|--------|-----------|
| Dégradation des performances à l'échelle | Tests de charge hebdomadaires, profiling, optimisation |
| Problèmes de scalabilité base de données | Connection pooling, optimisation des requêtes, plan de sharding |
| Complexité de l'infrastructure WebSocket | POC en Phase 1, ingénieur DevOps dédié |
| Application mobile (si ajoutée) | Reporter à la Phase 5, se concentrer sur la PWA |

---

## Vue d'ensemble Gantt des jalons

```
Q2 2026 (Avr-Juin) : Phase 1 Fondation
  Semaine 1-4 :   ████ Audit et correctifs de sécurité
  Semaine 5-8 :   ██████ Design system et refactoring
  Semaine 9-13 :  ████ Configuration infrastructure et CI/CD

Q3 2026 (Juil-Sept) : Phase 2 Finalisation MVP
  Semaine 1-6 :   ████████████ Développement des fonctionnalités
  Semaine 7-10 :  ████████ Tests et QA
  Semaine 11-13 : ████ Recrutement utilisateurs bêta

Q4 2026 (Oct-Déc) : Phase 3 Montée en charge
  Semaine 1-6 :   ████████████ Load balancing et optimisation
  Semaine 7-10 :  ████████ Fonctionnalités premium et intégrations
  Semaine 11-13 : ████ Préparation pré-saison et tests

Q1 2027 (Jan-Mars) : Phase 4 Lancement
  Semaine 1-4 :   ████ Extension bêta fermée
  Semaine 5-9 :   ████████ Lancement public et marketing
  Semaine 10-13 : ████████████ Saison F1 2027 🏁
```

---

## Points de décision

**Décisions Go/No-Go** :

### Fin de la Phase 1 (30 juin)
**Décision** : Passer au MVP ou pivoter ?
- ✅ **GO si** : Tous les correctifs de sécurité P0 complets, design system solide, équipe stable
- ❌ **NO-GO si** : Problèmes de sécurité non résolus, départs dans l'équipe, problèmes d'infrastructure

### Fin de la Phase 2 (30 septembre)
**Décision** : Étendre à 500 utilisateurs ou prolonger la bêta ?
- ✅ **GO si** : NPS >20, <1 % de taux d'erreur, fonctionnalités clés stables
- ❌ **NO-GO si** : Bugs majeurs, plaintes utilisateurs, préoccupations de scalabilité

### Fin de la Phase 3 (31 décembre)
**Décision** : Lancement public en janvier ou report ?
- ✅ **GO si** : 99,5 % de disponibilité atteints, test de charge réussi, équipe confiante
- ❌ **NO-GO si** : Problèmes critiques, pannes d'infrastructure, burnout de l'équipe

### Pré-F1 2027 (17 mars)
**Décision** : Lancement officiel ou soft launch ?
- ✅ **FULL GO** : Tous les systèmes stables, communauté prête
- ⚠️ **SOFT GO** : Lancement limité, marketing en attente

---

## Feuille de route post-lancement (2027-2028)

### Q2 2027 (Avril-Juin) : Consolidation et croissance
- Applications mobiles natives (iOS/Android)
- Statistiques avancées et modèles de pronostics
- Suggestions de pronostics propulsées par IA
- Mode tournoi (ligue-vs-ligue)
- Intégration merchandising

### Q3 2027 (Juillet-Septembre) : Internationalisation
- Support multi-langue (français, espagnol, allemand)
- Paiement localisé (devises locales)
- Poussée marketing régionale

### Q4 2027 (Octobre-Décembre) : Monétisation et entreprise
- Abonnements premium (10 $/mois)
- Partenariats d'affiliation (merchandising)
- B2B (ligues d'entreprise)
- API analytics pour pros

### 2028 : Mise à l'échelle et sortie
- Objectif 10 000+ utilisateurs actifs
- Levée de fonds Série A (si poursuivie)
- Acquisition potentielle par une plateforme sportive plus large
- Expansion mondiale au-delà de la F1 (autres sports mécaniques)

---

## Conclusion

**Le chemin du succès pour Pronokif** nécessite :

1. **Exécution disciplinée** : Tenir le calendrier 12 mois malgré les tentations de dérive du périmètre
2. **Équipe solide** : Embaucher tôt des ingénieurs expérimentés, bâtir une culture
3. **Feedback utilisateurs** : Engager activement les utilisateurs bêta, itérer rapidement
4. **Discipline financière** : Suivre le burn rate hebdomadairement, optimiser les coûts
5. **Focus qualité** : Ne pas livrer de fonctionnalités cassées ; la finition est un avantage concurrentiel

**Probabilité de succès estimée** : **70-80 %** (bien documenté, périmètre atteignable, calendrier clair)

**ROI estimé** (en cas de succès) :
- Coût d'acquisition par utilisateur : 5-10 €
- Valeur vie (premium) : 100-500 €
- Période de retour sur investissement : 2-6 mois
- NPV (Année 1) : Équilibre à 100 K€ (selon la monétisation)

**Prêt à avancer ?** Confirmer avec Baptiste via BRIEF_ASSISTANT.html, puis verrouiller le calendrier de la Phase 1.

---

**Document créé** : 2026-04-17
**Prochaine étape** : Présenter à Baptiste + sécuriser l'approbation du budget
**Début du calendrier** : 1er avril 2026
