# GRINDSET — CLAUDE.md

> Ce fichier est le contexte complet du projet pour Claude Code.
> À placer à la racine de `C:\Users\kelli\lift-tracker\`.

---

## 🏋️ Identité du projet

**Grindset** est une app web de suivi de musculation pour un groupe d'amis.
- **URL live** : https://grindset-two.vercel.app
- **GitHub** : GundanGraph1/lift-tracker (public)
- **Projet local** : `C:\Users\kelli\lift-tracker\`

### Membres du groupe
Gundan (id:7), Albatar, Matys (id:11), Seb (id:9), Aurelien (id:10), Natsuke (id:14), Moon (id:16), Oozeyard (id:18), Yanis (id:17)

---

## 🛠 Stack technique

| Outil | Version / Détail |
|-------|-----------------|
| Framework | Next.js 16.1.6 avec **Turbopack** |
| Backend | **Supabase** (PostgreSQL + RLS) |
| Déploiement | **Vercel** |
| State | Store Zustand-like custom (`lib/store.js`) |
| Style | CSS global (`app/globals.css`) + inline styles |

### IDs importants
- **Vercel Project ID** : `prj_ld7HRAPnm3s3rr2DRiw3aqyzrQZn`
- **Vercel Team ID** : `team_gtISijPBqu0oe0FrgewaEgtj`
- **Supabase Project ID** : `ufiinnhwzzlazezgadyq`
- **Supabase URL** : `https://ufiinnhwzzlazezgadyq.supabase.co`

---

## 📁 Architecture des fichiers

```
app/
  layout.js
  page.js
  globals.css
  favicon.ico / favicon.svg
  components/
    AppShell.js        ← shell principal, loadAll(), checkBadgesGlobal(), nav 4 onglets
    Logo.js            ← LogoIcon (G seul) + LogoFull (G + "Grindset")
    Toast.js           ← notifications légères (showToast)
    BadgeUnlock.js     ← popup badge débloqué, export showBadgeUnlock
    ShareStory.js      ← canvas story 1080×1920
    EditProfile.js     ← édition profil
    LoginScreen.js     ← écran connexion PIN
    UpdateBanner.js    ← bannière mise à jour
    NavEditor.js       ← éditeur nav avec boutons ▲▼
    ThemePicker.js     ← sélecteur thème
    MonthlyRecap.js    ← recap mensuel (1er du mois)
    pages/
      SaisiePage.js       ← saisie séance (979 lignes)
      JournalPage.js      ← historique + calendrier (switcher pill)
      ExplorePage.js      ← tabs : Stats / Feed / Top
      ProfilPage.js       ← profil / santé / badges / thème
      HistoriquePage.js   ← historique séances avec édition
      FeedPage.js         ← feed communautaire
      LeaderboardPage.js  ← classement avec cache TTL 5min
      StatsPage.js        ← stats + PRs + graphes
      CalendrierPage.js   ← calendrier couleurs musculaires
      SantePage.js        ← santé / TDEE
lib/
  store.js       ← state global pub/sub (sessions, currentUser, PRs, badges…)
  supabase.js    ← client Supabase (export: db)
  constants.js   ← BADGES, MUSCLE_GROUPS, MUSCLE_LABELS, MUSCLE_SHORTCUTS, ALL_EXERCISES
  themes.js      ← THEMES (8 standard + premium)
```

---

## 🎨 Branding

```css
--bg: #131210        /* fond principal */
--s1: #1a1917        /* surface 1 */
--s2: #211f1d        /* surface 2 */
--s3: #2a2825        /* surface 3 */
--border: #2e2c29
--text: #f3eae3
--text2: #d0c8c3
--text3: #6b6560
--red: #ff073b       /* accent principal */
--green: #22c55e
--blue: #3b82f6
--orange: #f97316
--gold: #fbbf24
--purple: #a78bfa
--fm: 'Barlow Condensed'
--fb: 'Barlow'
```

Logo : G stylisé (`logo_seul.svg`) + typo complète (`logo_typo.svg`)

---

## 🗄 Schéma Supabase

### Table `users`
```sql
id, username, avatar, pin, gender ('male'|'female'),
weight_kg, height_cm, birth_year,
theme, font, is_private,
daily_steps_avg integer,     -- TDEE
sessions_per_week integer,   -- TDEE
lifestyle_type text,         -- TDEE
featured_badges text[]       -- badges affichés profil (max 5)
```

### Table `sessions`
```sql
id, user_id, session_date, session_time,
muscle text,           -- ex: "Dos+Pec"
notes text,
exercises jsonb,       -- JSON stringifié (voir structure ci-dessous)
total_volume numeric,
preset_id integer, preset_name text
```

### Table `cardio_sessions`
```sql
id, user_id, session_id, session_date,
type text, duration_min, distance_km,
avg_speed_kmh, avg_hr, calories_burned,
incline_pct numeric, resistance integer, notes
```

### Autres tables
`custom_exercises`, `presets`, `prs`, `badges`,
`monthly_recap_seen`, `monthly_champions`

### Structure JSON exercice
```json
{
  "id": 1234567890,
  "name": "Leg Curl",
  "unilateral": true,
  "sets": [
    { "id": 111, "r": "", "w": "", "rL": "12", "wL": "23", "rR": "11", "wR": "23" }
  ]
}
```

---

## ⚠️ RÈGLES CRITIQUES TURBOPACK

Ces règles provoquent des erreurs de build si non respectées :

1. **Apostrophes dans du JSX visible** → toujours `&apos;`
   ```jsx
   // ❌  <p>c'est bon</p>
   // ✅  <p>c&apos;est bon</p>
   ```

2. **`useStore` jamais dans le JSX** → déclarer au top du composant
   ```jsx
   // ❌  <div>{useStore(s => s.sessions).length}</div>
   // ✅  const sessions = useStore(s => s.sessions)
   ```

3. **`localStorage` jamais au top-level** → uniquement dans `useEffect`

4. **Pas de double `export default function`** dans un même fichier

5. **Imports inutilisés** (`useCallback`, etc.) → erreur de build, toujours nettoyer

6. **`LogoWelcome` n'existe plus** → utiliser `LogoFull`

---

## 🦾 MODE UNILATÉRAL (CRITIQUE)

Les exos unilatéraux stockent dans `rL/wL/rR/wR`. Les champs `r` et `w` sont vides (`""`).

```js
// ✅ Calcul volume correct
ex.unilateral
  ? (parseFloat(st.rL||st.r)||0) * (parseFloat(st.wL||st.w)||0)
    + (parseFloat(st.rR||st.r)||0) * (parseFloat(st.wR||st.w)||0)
  : (parseFloat(st.r)||0) * (parseFloat(st.w)||0)

// ✅ Série valide
ex.unilateral
  ? (parseFloat(st.rL||st.r)||parseFloat(st.rR||st.r)) > 0
    && (parseFloat(st.wL||st.w)||parseFloat(st.wR||st.w)) > 0
  : (parseFloat(st.r)||0) > 0 && (parseFloat(st.w)||0) > 0

// ✅ Poids max série
ex.unilateral
  ? Math.max(parseFloat(st.wL||st.w)||0, parseFloat(st.wR||st.w)||0)
  : parseFloat(st.w)||0
```

---

## 💪 ALIASES MUSCULAIRES (CRITIQUE)

Les muscles en base ne correspondent pas toujours aux clés canoniques :

| En base (`sessions.muscle`) | Clé canonique |
|-----------------------------|---------------|
| `BrasBi` | `Biceps` |
| `BrasTri` | `Triceps` |
| `Pec` | `Pectoraux` |
| `Epaule` | `Épaules` |
| `Quad` | `Quadriceps` |

**Toujours utiliser ce mapping dans les filtres :**
```js
const MUSCLE_ALIASES = {
  Biceps:    ['Biceps','BrasBi','Bras'],
  Triceps:   ['Triceps','BrasTri','Bras'],
  Pectoraux: ['Pectoraux','Pec'],
  Épaules:   ['Épaules','Epaule','Épaule'],
  Jambes:    ['Jambes','Quad','Ischio','Quadriceps'],
  Abdominaux:['Abdominaux','Abdos'],
}
```

---

## 🔄 Workflow Git

```bash
# Dev normal
git add . && git commit -m "message" && git push origin dev

# Merge vers main (après vérif deploy dev sur Vercel)
git checkout main && git merge dev && git push origin main && git checkout dev

# Push direct sur main depuis n'importe quelle branche
git push origin HEAD:main

# Si conflit au checkout
git add . && git stash && git checkout <branche> && git stash pop
```

**Règle absolue** : vérifier le deploy `dev` sur Vercel avant de merger sur `main`.

---

## 🏗 Patterns importants

### Store global
```js
// Lire
const sessions = useStore(s => s.sessions)

// Écrire
actions.setSessions([...])
actions.setCurrentUser(user)
// autres: setCustomExercises, setPresets, setUserPRs, setUserBadges, setCardioSessions, setCurrentPage
```

### Toast
```js
import { showToast } from '../Toast'
showToast('Message', 'var(--green)') // couleur optionnelle
```

### Badge unlock popup
```js
import { showBadgeUnlock } from '../BadgeUnlock'
showBadgeUnlock(badge) // badge = objet depuis BADGES
```

### Supabase
```js
import { db } from '../../../lib/supabase'
const { data, error } = await db.from('sessions').select('*').eq('user_id', id)
```

---

## 📊 Optimisations en place

- **LeaderboardPage** : cache TTL 5min dans localStorage (`lb_cache`), bouton ↺ pour forcer refresh
- **checkBadges** : centralisé dans `AppShell.checkBadgesGlobal()`, appelé une seule fois après `loadAll()`
- **Inputs mobiles** : `inputMode="decimal"` sur poids, `inputMode="numeric"` sur reps partout
- **CSS mobile** : `overscroll-behavior: none`, `-webkit-overflow-scrolling: touch`, `scale(0.97)` au tap sur boutons

---

## 📋 TODO (priorités)

### Avant lancement public (bloquant)
- [ ] **Migration auth PIN → Supabase Auth**
- [ ] **Wrapping Android avec Capacitor**
- [ ] **PWA manifest** peaufiné pour iPhone

### Features
- [ ] Timer de repos — bulle flottante persistante pendant la séance
- [ ] Progression inline par exercice pendant la saisie (afficher PR actuel)
- [ ] Notifications push PWA (rappel entraînement)
- [ ] Recherche dans l'historique par exercice
- [ ] Export CSV des séances
- [ ] Challenges entre amis (leaderboard hebdo)
- [ ] Programmation de cycles dans le calendrier

### Nice to have
- [ ] Domaine custom `grindset.app`
- [ ] Dépôt marque INPI classes 41+42

---

## 🐛 Bugs connus résolus (référence)

| Bug | Fix |
|-----|-----|
| `ex is not defined` dans FeedPage | variable s'appelle `e` pas `ex` dans le scope des maps |
| `MUSCLE_LABELS is not defined` dans LeaderboardPage | import manquant depuis constants.js |
| Séries vides comptées dans la story | filtrer avant calcul |
| Volume 0kg exos unilatéraux | utiliser `wL/wR` au lieu de `w` |
| Muscles BrasBi/BrasTri invisibles dans filtres | utiliser les aliases |
| Double `export default` après merge Git | toujours remplacer depuis le ZIP source |
| Page perdue au refresh | `localStorage` init dans `store.js` |
| Drag-and-drop cassé sur mobile | remplacé par boutons ▲▼ dans NavEditor |
