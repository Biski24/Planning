# Planning Agence (Next.js + Supabase)

Application web production-ready (MVP) pour gérer des plannings d'agence en cycles de 4 semaines, avec authentification locale (identifiant + mot de passe), rôles, historique et export iCalendar (.ics).

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres + RLS)
- Export agenda: iCalendar via `ical-generator`
- Déploiement: Vercel

## Fonctionnalités implémentées

- Auth locale identifiant/password (connexion + déconnexion)
- Rôles `admin | manager | employee`
- Pages protégées via middleware
- `/plannings`: cycles + semaines ISO cliquables
- `/planning/[isoWeek]`: vue semaine par jour
- `/manager/[isoWeek]`: couverture besoins vs shifts (vue manager type Excel)
- `/me`: export ICS semaine + feed ICS privé
- `/admin` (admin uniquement):
  - création d'utilisateurs locaux (`identifiant + mot de passe`)
  - création cycle 4 semaines depuis un lundi
  - génération automatique des 4 weeks ISO
  - besoins par créneau (activité + volume à couvrir)
  - CRUD shifts simple (create + delete, update endpoint prêt)
- `/admin/planning` (nouveau module Excel-like):
  - onglet Employés (CRUD + seed liste conseillers/alternants)
  - onglet Cycles 4 semaines (création + activation)
  - onglet Besoins (grille 30 min jour x créneau x activité, bulk upsert)
  - route `/admin/planning/[isoWeek]` pour éditer les affectations par employé/créneau
  - calcul couverture/différentiel visible sur `/planning/[isoWeek]`
- `/admin/import`:
  - upload `.xlsm/.xlsx`
  - création/import d’un cycle historique 4 semaines
  - import affectations 30 min (lun-sam, 08:00-19:30)
  - résumé import (employés créés, assignments, vides ignorés, activités inconnues)
  - stub import CSV (`/api/admin/import-csv`)
- ICS sécurisé par token long non devinable (`calendar_feed_token`)
  - `GET /api/ics/feed?token=...`
  - `GET /api/ics/week?week=XX&year=YYYY&token=...`

## Arborescence

- `app/` pages App Router + API routes
- `components/` composants UI (navbar, badges, vue semaine)
- `lib/` helpers auth/supabase/iso/ics
- `supabase/migrations/` migrations SQL schema + RLS
- `supabase/seed/seed.sql` seed optionnel

## 1) Setup Supabase

1. Créer un projet Supabase.
2. Dans SQL Editor, appliquer les migrations de `supabase/migrations/*.sql`, y compris:
   - `20260217235500_week_needs.sql`
   - `20260218001000_planning_editor_mvp.sql`
   - `20260218010000_assignment_category_other.sql`
3. Exécuter le seed optionnel `supabase/seed/seed.sql` pour créer les données de base + utilisateur `bastien / Test`.
4. Se connecter avec cet identifiant ou créer de nouveaux utilisateurs via `/admin`.

## 2) Variables d’environnement

Copier `.env.example` vers `.env.local`:

```bash
cp .env.example .env.local
```

Renseigner:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SESSION_SECRET` (secret de signature cookie session)
- `NEXT_PUBLIC_APP_URL` (URL publique app, ex. Vercel)

## 3) Lancer en local

```bash
npm i
npm run dev
```

App locale: `http://localhost:3000`

## Flow test (module planning)

1. Aller sur `/admin/planning?tab=employees` puis cliquer `Seed employés par défaut`.
2. Aller sur `/admin/planning?tab=cycles` et créer un cycle 4 semaines.
3. Aller sur `/admin/planning?tab=needs` et saisir les besoins par créneau.
4. Ouvrir `/admin/planning/[isoWeek]` depuis le bouton `Ouvrir planning editor`.
5. Affecter les activités par employé et sauvegarder le jour.
6. Vérifier la vue finale sur `/planning/[isoWeek]` (affectations + extrait besoins vs couverture).

## Import Excel (historique)

1. Aller sur `/admin/import`.
2. Uploader le fichier `.xlsm` contenant les onglets `Semaine 1..4`.
3. Renseigner:
   - soit `date début cycle (lundi)`,
   - soit `année ISO + semaine ISO de départ`,
   - `cycle_number`.
4. Lancer `Importer`.
5. Le cycle est créé en `is_active=false` (historique) avec 4 semaines ISO et les affectations associées.
6. Vérifier dans `/plannings` que le cycle importé apparaît dans l’historique.

## 4) Déployer sur Vercel

1. Push repository sur GitHub.
2. Importer projet dans Vercel.
3. Ajouter les mêmes variables d’environnement.
4. Déployer.

## 5) Utiliser ICS (Google / Apple / iCloud)

Depuis `/me`:

- Téléchargement semaine: bouton semaine active
- Abonnement continu: URL feed `.../api/ics/feed?token=...`

Google Calendar:

1. Paramètres > Ajouter un agenda > Depuis l’URL
2. Coller l’URL feed ICS

Apple Calendar (macOS/iOS):

1. Fichier > Nouvel abonnement à un calendrier
2. Coller l’URL feed ICS

## Sécurité

- RLS activé sur toutes les tables métier.
- Les routes ICS utilisent la `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement.
- Les routes ICS ne dépendent pas de session et vérifient strictement `calendar_feed_token`.

## Notes MVP

- UI admin fournie en version simple et opérationnelle.
- Endpoint update shift déjà prévu (`action=update`) pour brancher une modal d’édition plus tard.
- Endpoint import CSV présent en stub pour implémentation future.
