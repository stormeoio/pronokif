# Audit des doublons `server*.py`

**Date** : 2026-05-16
**Sprint** : S0-1 (cleanup)
**Auteur** : Refacto A2 (Claude Code)

## TL;DR

| Fichier | Lignes | Verdict | Action |
|---|---:|---|---|
| `server.py` | 2 210 | ✅ **CANONIQUE** — version active, partiellement refactorisée | Conserver |
| `server_backup.py` | 4 092 | 🔴 Ancien monolithe pré-refacto, tout extrait dans `routes/` ou `server.py` | **Supprimer** |
| `server_new.py` | 127 | 🔴 Stub intermédiaire identique à `server.py` jusqu'à L~124 puis tronqué | **Supprimer** |
| `server_refactored.py` | 68 | 🔴 Template descriptif obsolète (commentaires "TODO" sur routes déjà extraites) | **Supprimer** |

---

## Détail de l'analyse

### `server.py` (canonique)
- 2 210 lignes
- Importe et `include_router` les 5 modules extraits : `auth`, `leagues`, `predictions`, `races`, `minigames`
- Contient encore **36 endpoints non extraits** (admin, feedback, notifications, results, avatars, missions, leaderboards, custom-predictions, drivers) → **objectif Sprint 1**

### `server_backup.py`
- 4 092 lignes — **ancien monolithe complet pré-refacto**
- Contient les ~91 endpoints AVANT extraction
- Vérifications croisées (S0-1) :
  - Tous les endpoints `/auth/*` du backup → présents dans `routes/auth.py` ✅
  - Tous les endpoints `/leagues/*` du backup → présents dans `routes/leagues.py` ✅
  - Tous les endpoints `/predictions/*` du backup → présents dans `routes/predictions.py` ✅
  - Tous les endpoints `/races/*` du backup → présents dans `routes/races.py` ✅
  - Tous les endpoints `/minigames/*` du backup → présents dans `routes/minigames.py` ✅
- ⚠️ **Quelques chemins ont changé pendant la refacto** (à valider en S1) :
  - `/custom-predictions` (backup) → `/predictions/custom` (routes/predictions.py)
  - `/minigames/reaction` + `/minigames/batak` (backup) → `/minigames/result` (routes/minigames.py)
  - Risque : si le frontend appelle encore les anciens chemins → 404
- **Aucun code unique non porté détecté**.

### `server_new.py`
- 127 lignes — stub d'une tentative intermédiaire de refacto
- Header : `# PRONOKIF - Main Server (Refactored)`
- Contenu strictement identique à `server.py` jusqu'aux `include_router`, puis tronqué
- Termine sur un commentaire de TODO listant les sections restant à extraire (mêmes que server.py canonique)
- **Aucune valeur résiduelle**.

### `server_refactored.py`
- 68 lignes — template descriptif
- Header : `This is a template for the fully refactored version. Currently, the original server.py is still in use.`
- Contient une arborescence cible (déjà partiellement réalisée) en commentaire
- Routes commentées avec `# TODO` alors qu'elles sont déjà extraites dans routes/
- **Document mort, contenu informatif déjà repris dans `PLAN_REFACTO.md`**.

---

## Risques de la suppression

| Risque | Probabilité | Mitigation |
|---|---|---|
| Endpoint perdu non détecté | 🟢 Faible | Cross-check exhaustif fait, tests existants seront rejoués post-suppression |
| Référence externe (CI, scripts) à un fichier supprimé | 🟢 Faible | `grep -r "server_backup\|server_new\|server_refactored"` dans tout le repo avant suppression |
| Perte d'historique de refacto | 🟢 Nulle | Git conserve tout |

---

## Action S0-2

```bash
# Pré-vérification : aucune référence externe
grep -r "server_backup\|server_new\|server_refactored" \
  --include="*.py" --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.sh" --include="Dockerfile*" --include="Makefile" \
  --exclude-dir=node_modules --exclude-dir=.git .

# Si 0 résultat (hors ce fichier d'audit) → suppression
git rm backend/server_backup.py backend/server_new.py backend/server_refactored.py
git commit -m "chore(backend): remove legacy server_backup/new/refactored doubles"
```

## Suite

- **S0-3** : créer `.env.example` backend + frontend
- **S0-4** : rotation `JWT_SECRET` + bannir le fallback hardcodé
- **S0-5** : purger l'historique git des `.env` commités
