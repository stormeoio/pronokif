# Back-office admin Pronokif

Derniere mise a jour : 31 mai 2026.
Version de reference : `v0.4.2` / commit `301451b`.

## Objectif

Le back-office Pronokif transforme l'application en outil exploitable par des admins non developpeurs. Il centralise la gestion sportive F1, les joueurs, les pronostics, les medias, les contenus legaux/PWA, le RAG, les releases et les controles DevOps.

## Acces et securite

- Route canonique : `/admin`.
- Authentification admin separee de l'app utilisateur.
- Magic link admin par email, template en francais.
- TOTP 2FA apres magic link.
- Session persistante par device token/cookie.
- Routes legacy supportees : `/bo-admin`, `/admin-bo`.
- Deep links d'onglets supportes : `/admin/settings`, `/admin/users`, `/admin/predictions`, etc., avec redirection vers `/admin?tab=...`.
- Hors session admin, les deep links renvoient vers `/admin/auth` sans 404.

## Navigation et shell admin

- Layout admin dedie avec sidebar, header, preview panel et footer.
- Logo Pronokif en haut a gauche relie au dashboard home.
- Footer du corps BO avec numero de version cliquable vers le changelog.
- Recherche profonde admin `Cmd/Ctrl+F` pour retrouver modules, entites, joueurs, courses, circuits, RAG et sections DevOps.
- Onglets DevOps reorganises : Audit, Roadmap, Beta, Legal & PWA, Base RAG, Traductions.

## Dashboard home

- KPIs admin compacts sur une seule ligne.
- Derniers inscrits.
- Derniers pronostics deposes par les utilisateurs.
- Derniers logs d'activite.
- Raccourcis vers utilisateurs, pronostics, courses et scoring.
- Watchlist courses : GP a surveiller, pronostics verrouilles, pronostics a revoir, fenetres 7 jours et 24 heures.

## Gestion des joueurs

- Noms des joueurs associes a leurs avatars dans le front et le back-office.
- Fiche joueur admin avec details, activity logs, pronostics, scores, notifications et feedback/support.
- Acces direct depuis les listes et tokens utilisateurs.
- Actions manuelles :
  - renvoyer un lien magique ;
  - envoyer une invitation de ligue ;
  - consulter le fil de notifications ;
  - suivre feedbacks et discussions support.

## Pronostics et scoring

- Onglet d'administration des pronostics.
- Fiches pronostics avec statut, joueur, course, selections et horodatage.
- Horodatage de depot base sur le dernier marqueur d'activite connu.
- Deep links vers les pronostics, courses et zones scoring.
- Statistiques utilisateurs et controles d'exploitation pour les admins.

## Courses, championnats et entites F1

- Creation du championnat F1 2026 et rattachement des courses.
- Gestion des courses, circuits, villes, pays, lieux, adresses et liens utiles.
- Gestion des pilotes, constructeurs, ecuries, equipes techniques et entites associees.
- Entity tokens reutilisables pour pilotes, ecuries, courses, circuits, annees, championnats et joueurs.
- Initiales pilotes dans les interfaces denses, avec infowindow au survol et navigation vers la fiche pilote au clic.

## Circuits interactifs

- Cartes circuits interactives avec hotspots exploitables.
- Premier virage canonique identifie pour les circuits seedes.
- Tests garantissant la presence d'un `firstCorner` et d'un hotspot de virage 1.
- Back-office de revue des cartes : statut, priorite, proprietaire, notes et historique.
- Optimisation des changements de circuit pour reduire les saccades de rendu.

## Mediatheque

- Upload d'images par les admins.
- Organisation des images par dossier.
- Images stockees et reutilisables depuis la mediatheque.
- Remplacement des vignettes de fiches par drag/drop ou selection media, sans saisie manuelle d'URL.
- Selecteurs medias pour branding, icones PWA, avatars et vignettes metier.

## Legal, PWA et branding

- Onglet Legal/PWA pour administrer mentions legales, CGU, confidentialite et configuration PWA.
- Page publique `/mentions-legales` servie et verifiee.
- Section branding dans `admin/settings` :
  - logos Pronokif ;
  - favicon ;
  - apple touch icon ;
  - icones PWA 192/512 ;
  - couleur principale ;
  - couleur d'accent.
- Nom d'application fige : `PronoKif`, non editable par les admins.
- Les couleurs branding alimentent le theme front et back-office.

## RAG, knowledge base et MCP

- Base de connaissance F1 2026 initialisee.
- Entites knowledge administrables.
- Visuels medias exposes dans les entites de connaissance et les briefs RAG.
- Serveur MCP PronoKif Knowledge ajoute dans `mcp/pronokif-knowledge-mcp-server`.
- Recherche hybride admin et briefs course/equipe/pilote exposes.

## Roadmap, audit et DevOps

- Onglet Audit avec scores techniques, metriques et dette restante.
- Onglet Roadmap avec taches cochees, phases, priorites, categories et dates de livraison.
- Onglet Changelog connecte au numero de version du footer admin.
- Onglet DevOps centre sur les statuts reels : CI, prod, release reliability et checks post-deploy.
- Smoke final du 31 mai 2026 :
  - typecheck OK ;
  - build OK ;
  - lint sans erreur ;
  - 159 tests front OK ;
  - health prod OK ;
  - branding endpoint OK ;
  - deep link `/admin/settings` OK.

## Points restant a tester avec session admin active

- Upload reel de medias dans la mediatheque et reutilisation depuis plusieurs fiches.
- Edition branding complete puis controle front/back-office.
- Actions manuelles joueur : renvoi magic link et invitation ligue.
- Filtres pronostics/scoring avec volumes reels.
- Publication/validation de cartes circuits avec `firstCorner`.
