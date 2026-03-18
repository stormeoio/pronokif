# AUDIT DE SÉCURITÉ - PRONOKIF

**Date de l'audit:** 18 Mars 2026  
**Version de l'application:** 1.0  
**Auditeur:** E1 Agent  

---

## RÉSUMÉ EXÉCUTIF

| Catégorie | Niveau de Risque | Score |
|-----------|------------------|-------|
| Configuration | CRITIQUE | 4/10 |
| Authentification | MOYEN | 6/10 |
| Autorisation | BON | 7/10 |
| Données sensibles | MOYEN | 6/10 |
| Protection CSRF/XSS | MOYEN | 6/10 |
| **Score Global** | **MOYEN** | **5.8/10** |

---

## VULNÉRABILITÉS PAR ORDRE DE PRIORITÉ

---

### P0 - CRITIQUE (À corriger immédiatement)

#### 1. Secret JWT avec valeur par défaut prévisible

**Fichier:** `backend/server.py` ligne 38  
**Code vulnérable:**
```python
JWT_SECRET = os.environ.get('JWT_SECRET', 'pronokif-secret-key-2026')
```

**Risque:** Si la variable d'environnement `JWT_SECRET` n'est pas définie en production, un secret par défaut prévisible est utilisé. Un attaquant pourrait:
- Forger des tokens JWT valides
- Se connecter en tant que n'importe quel utilisateur
- Obtenir un accès administrateur

**Impact:** CRITIQUE - Compromission totale de l'authentification

**Correction recommandée:**
```python
JWT_SECRET = os.environ['JWT_SECRET']  # Lève une erreur si non défini
```

**Action:** Ajouter `JWT_SECRET` dans `/app/backend/.env` avec une valeur aléatoire de 64+ caractères.

---

#### 2. CORS trop permissif (allow_origins: *)

**Fichier:** `backend/server.py` ligne 3210 et `backend/.env` ligne 3  
**Code vulnérable:**
```python
allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')
```
```
CORS_ORIGINS="*"
```

**Risque:** Permet les requêtes cross-origin depuis n'importe quel domaine. Un site malveillant pourrait:
- Exécuter des requêtes authentifiées au nom de l'utilisateur
- Voler des données sensibles via CSRF
- Effectuer des actions non autorisées

**Impact:** CRITIQUE - Attaques CSRF possibles

**Correction recommandée:**
```
CORS_ORIGINS="https://votre-domaine.com,https://www.votre-domaine.com"
```

---

#### 3. Absence de rate limiting sur l'authentification

**Endpoints concernés:**
- `POST /api/auth/login`
- `POST /api/auth/register`

**Risque:** Sans limitation du nombre de requêtes, un attaquant peut:
- Effectuer des attaques par force brute sur les mots de passe
- Créer massivement des comptes (spam)
- Saturer le serveur (DoS)

**Impact:** CRITIQUE - Brute force et DoS possibles

**Correction recommandée:**
Installer et configurer `slowapi`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin):
    ...
```

---

### P1 - ÉLEVÉ (À corriger sous 1 semaine)

#### 4. Absence de validation de complexité du mot de passe

**Fichier:** `backend/server.py` ligne 443-465  
**Code vulnérable:**
```python
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    # Aucune vérification de la complexité du mot de passe
    user = {
        "password_hash": hash_password(data.password),  # Accepte "123"
        ...
    }
```

**Risque:** Les utilisateurs peuvent créer des mots de passe faibles facilement devinables.

**Impact:** ÉLEVÉ - Comptes facilement compromis

**Correction recommandée:**
```python
import re

def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    return True

@api_router.post("/auth/register")
async def register(data: UserCreate):
    if not validate_password(data.password):
        raise HTTPException(400, "Mot de passe trop faible (min 8 caractères, 1 majuscule, 1 chiffre)")
```

---

#### 5. Token JWT avec durée de vie trop longue

**Fichier:** `backend/server.py` ligne 40  
**Code vulnérable:**
```python
JWT_EXPIRATION_HOURS = 24 * 7  # 7 jours
```

**Risque:** Si un token est volé (XSS, appareil perdu, etc.), l'attaquant a accès au compte pendant 7 jours.

**Impact:** ÉLEVÉ - Fenêtre d'exploitation prolongée

**Correction recommandée:**
```python
JWT_EXPIRATION_HOURS = 24  # 24 heures
# Ou implémenter un système de refresh tokens
```

---

#### 6. Stockage du token JWT en localStorage

**Fichier:** `frontend/src/App.js` lignes 53, 102  
**Code vulnérable:**
```javascript
localStorage.setItem("token", res.data.access_token);
const token = localStorage.getItem("token");
```

**Risque:** `localStorage` est accessible via JavaScript. Une faille XSS permettrait de voler le token.

**Impact:** ÉLEVÉ - Vol de session via XSS

**Correction recommandée:**
Migrer vers des cookies `HttpOnly`:
```python
# Backend
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=True,
    samesite="strict",
    max_age=86400
)
```

---

### P2 - MOYEN (À corriger sous 1 mois)

#### 7. Absence de vérification d'email à l'inscription

**Fichier:** `backend/server.py` ligne 443-465

**Risque:** N'importe qui peut créer un compte avec n'importe quel email, même:
- Des emails inexistants
- Des emails appartenant à d'autres personnes

**Impact:** MOYEN - Usurpation d'identité, spam

**Correction recommandée:**
Implémenter une vérification par email avec lien de confirmation.

---

#### 8. Identification admin par email uniquement

**Fichier:** `backend/server.py` lignes 1041-1043  
**Code vulnérable:**
```python
async def check_is_admin(user: dict) -> bool:
    return user.get("email", "").lower() == ADMIN_EMAIL.lower()
```

**Risque:** L'admin est identifié uniquement par son email. Si l'email admin est compromis ou usurpé, l'attaquant obtient un accès admin.

**Impact:** MOYEN - Escalade de privilèges potentielle

**Correction recommandée:**
```python
async def check_is_admin(user: dict) -> bool:
    return user.get("is_admin", False) == True
```
Et ajouter un champ `is_admin: true` en base de données pour les administrateurs.

---

#### 9. Absence de logs d'audit pour les actions sensibles

**Actions non tracées:**
- Modifications de mot de passe
- Actions administrateur (suppression compte, etc.)
- Tentatives de connexion échouées

**Impact:** MOYEN - Difficulté à détecter les intrusions

**Correction recommandée:**
Créer une collection `audit_logs` pour tracer les actions sensibles.

---

### P3 - FAIBLE (Améliorations recommandées)

#### 10. Absence de politique de renouvellement de mot de passe

**Risque:** Les utilisateurs peuvent garder le même mot de passe indéfiniment.

**Correction recommandée:**
Suggérer (sans forcer) un changement de mot de passe tous les 6 mois.

---

#### 11. Pas de détection de connexions suspectes

**Risque:** Les connexions depuis des localisations inhabituelles ne sont pas détectées.

**Correction recommandée:**
Alerter l'utilisateur en cas de connexion depuis un nouvel appareil/IP.

---

#### 12. Absence de 2FA (authentification à deux facteurs)

**Risque:** La compromission du mot de passe suffit pour accéder au compte.

**Correction recommandée:**
Proposer une option 2FA via email ou application authenticator.

---

## POINTS POSITIFS

| Bonne pratique | Détail |
|----------------|--------|
| Hachage bcrypt | Mots de passe correctement hachés avec bcrypt |
| JWT signé | Tokens signés avec algorithme HS256 |
| Exclusion password_hash | `{"_id": 0, "password_hash": 0}` dans les queries |
| Validation Pydantic | Entrées validées via modèles Pydantic |
| HTTPS forcé | Trafic chiffré via Kubernetes ingress |
| Sessions enregistrées | Historique de connexion avec IP et User-Agent |
| UUID pour les IDs | IDs non prédictibles (UUID v4) |

---

## PLAN D'ACTION

### Phase 1 - Immédiat (1-2 jours)
- [ ] Définir JWT_SECRET obligatoire en variable d'environnement
- [ ] Restreindre CORS aux domaines de production
- [ ] Ajouter validation mot de passe (min 8 chars, 1 majuscule, 1 chiffre)

### Phase 2 - Court terme (1 semaine)
- [ ] Implémenter rate limiting sur /api/auth/*
- [ ] Réduire durée JWT à 24h
- [ ] Ajouter champ is_admin en base de données

### Phase 3 - Moyen terme (1 mois)
- [ ] Implémenter vérification email à l'inscription
- [ ] Ajouter fonctionnalité "Mot de passe oublié"
- [ ] Créer logs d'audit pour actions sensibles
- [ ] Migrer vers cookies HttpOnly (optionnel)

### Phase 4 - Long terme (3 mois)
- [ ] Proposer option 2FA
- [ ] Détection de connexions suspectes
- [ ] Politique de renouvellement mot de passe

---

## RESSOURCES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

*Cet audit doit être renouvelé après chaque modification majeure de l'application.*
