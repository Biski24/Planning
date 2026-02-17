# Planning Agence (Next.js + Supabase)

Application web production-ready (MVP) pour gérer des plannings d'agence en cycles de 4 semaines, avec authentification, rôles, historique et export iCalendar (.ics).

## Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Supabase (Auth + Postgres + RLS)
- Export agenda: iCalendar via `ical-generator`
- Déploiement: Vercel

## Fonctionnalités implémentées

- Auth email/password (connexion + déconnexion)
- Rôles `admin | manager | employee`
- Pages protégées via middleware
- `/plannings`: cycles + semaines ISO cliquables
- `/planning/[isoWeek]`: vue semaine par jour
- `/me`: export ICS semaine + feed ICS privé
- `/admin` (admin uniquement):
  - création cycle 4 semaines depuis un lundi
  - génération automatique des 4 weeks ISO
  - CRUD shifts simple (create + delete, update endpoint prêt)
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
2. Dans SQL Editor, appliquer les migrations de `supabase/migrations/*.sql`.
3. Créer des utilisateurs dans Supabase Auth (email/password).
4. Donner les rôles dans `public.profiles`:

```sql
update public.profiles set role = 'admin' where id = '...';
update public.profiles set role = 'manager', team_id = '...' where id = '...';
update public.profiles set role = 'employee', team_id = '...' where id = '...';
```

5. Optionnel: exécuter `supabase/seed/seed.sql`.

## 2) Variables d’environnement

Copier `.env.example` vers `.env.local`:

```bash
cp .env.example .env.local
```

Renseigner:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_APP_URL` (URL publique app, ex. Vercel)

## 3) Lancer en local

```bash
npm i
npm run dev
```

App locale: `http://localhost:3000`

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
