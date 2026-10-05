# BrainBooked Backend

API for the [BrainBooked](../brain_booked) tutoring marketplace front-end, implementing `BACKEND_REQUIREMENTS.md`.

**Stack:** Node.js + TypeScript, Express 5, Prisma + PostgreSQL, Socket.IO (real-time messaging), JWT in an httpOnly cookie for auth, local-disk file storage (via Multer).

## Decisions made on the open questions

The requirements doc flagged several things as needing a product decision before backend work could start. These were resolved as follows for this build:

1. **Payments** — out of scope. Booking confirms immediately with no payment step, matching the current front-end.
2. **Video hosting** — external embed link only (`introVideoUrl` stays a YouTube/Vimeo-style embeddable URL). No native video upload/transcoding.
3. **Messaging transport** — real-time via Socket.IO (WebSockets). See [Real-time messaging](#real-time-messaging) below.
4. **Timezones** — every tutor has a `timezone` field (IANA name, e.g. `America/Chicago`). All `AvailabilitySlot`/`Session`/`TimeOff` times are naive `HH:MM` / `YYYY-MM-DD` values interpreted in *that tutor's* timezone — the server never converts them. Converting to the viewing student's local time for display is a front-end concern; `GET /tutors/:id` now includes `timezone` in the response for it to use.
5. **Availability-edit conflicts** — blocked, not silently allowed. `PUT /tutors/:id/availability` and `PUT /tutors/:id/time-off` reject (`409`) if the change would orphan an existing `upcoming` session, returning the conflicting session ids so the tutor can resolve them first.
6. **Reschedule** — not implemented as a distinct endpoint; front-end should do cancel + rebook (`PATCH /sessions/:id` with `status: "cancelled"`, then `POST /sessions`), consistent with "cancel is the only mutation available" in the current UI.

## Getting started

```bash
cp .env.example .env     # defaults work with the docker-compose Postgres below
docker compose up -d     # starts Postgres on localhost:5432
npm install
npm run prisma:migrate   # creates the schema
npm run seed              # loads demo tutors/sessions/messages
npm run dev                # starts the API on http://localhost:4000
```

No Docker? Point `DATABASE_URL` in `.env` at any Postgres 14+ instance instead.

### Demo accounts (after `npm run seed`)

All seeded accounts use password `password123`.

- Student: `student@brainbooked.dev`
- Tutor: `maria.chen@brainbooked.dev` (or any `firstname.lastname@brainbooked.dev` from the 8 seeded tutors — see `prisma/seed.ts`)

### Connecting the Vite front-end

The front-end currently makes no network calls (`src/context/AppContext.tsx` holds everything in React state). To wire it up:

- Point API calls at `http://localhost:4000` (override via `CLIENT_ORIGIN` in `.env` if the dev server doesn't run on the default `http://localhost:5173`).
- Every `fetch` must pass `credentials: 'include'` — auth is a cookie (`bb_token`), not a bearer token.
- The Socket.IO client connects to the same origin and authenticates via the same cookie (`io('http://localhost:4000', { withCredentials: true })`).

## Project layout

```
prisma/schema.prisma   data model (see §1 below)
prisma/seed.ts          demo data matching the front-end's mock dataset
src/app.ts               Express app wiring
src/index.ts             HTTP + Socket.IO server entry point
src/routes/               one file per resource group
src/services/             business logic + validation (routes stay thin)
src/middleware/          auth, error handling, file upload (Multer)
src/utils/                 JWT, password-less helpers, enum<->API string mappers, date/time math
src/websocket/            Socket.IO setup + room-based message broadcast
```

## Data model vs. front-end types

`src/types.ts` on the front-end uses lowercase/kebab/Title-Case string unions (`'in-person'`, `'Middle School'`, `'Mon'`). Postgres enums need valid identifiers, so the DB stores `SCREAMING_SNAKE_CASE` and `src/utils/mappers.ts` translates at the API boundary — every JSON response matches the front-end's existing `Tutor`/`Session`/etc. shapes exactly (with one addition: `Tutor.timezone`, see above).

## API

All endpoints are JSON unless noted. `requireAuth` means a valid `bb_token` cookie; role-gated endpoints return `403` for the wrong role or someone else's resource.

**Auth**
- `POST /auth/signup` `{ email, password, name, role }` → sets cookie, returns the user
- `POST /auth/login` `{ email, password }` → sets cookie
- `POST /auth/logout`
- `GET /me` — current user + `tutorId` if a tutor

**Tutors**
- `GET /tutors` — `search, subjects[], gradeLevels[], format, minRating, maxRate, day, sort, page, pageSize`
- `GET /tutors/:id`
- `PATCH /tutors/:id` — tutor-auth, own profile only
- `PUT /tutors/:id/availability` — full-list replace; validates no internal overlaps and no orphaned upcoming sessions
- `PUT /tutors/:id/time-off` — same, checked against upcoming sessions
- `POST /tutors/:id/photo` — multipart `photo` field, 5MB/jpeg·png·webp limit
- `GET /tutors/:id/reviews`
- `POST /tutors/:id/reviews` — student-auth; requires a completed session with that tutor; one review per student per tutor

**Subjects**
- `GET /subjects` — distinct list across all tutors

**Sessions**
- `POST /sessions` `{ tutorId, subject, date, time, durationMins, format }` — validates against the tutor's availability, time-off, and existing bookings
- `GET /sessions?status=upcoming|completed|cancelled` — scoped to the current user's role; `upcoming` sessions past their end time are lazily flipped to `completed` on read
- `PATCH /sessions/:id` `{ status: "cancelled" | "completed" }` — either party cancels; only the tutor marks completed
- `PATCH /sessions/:id/notes` — tutor-auth, own sessions only
- `POST /sessions/:id/homework` — multipart `file` field, student-auth, 20MB limit (pdf/doc/docx/image/txt)
- `PATCH /sessions/:id/homework/:homeworkId` `{ feedback }` — tutor-auth
- `GET /sessions/:id/homework/:homeworkId/file` — authenticated download; only the tutor and student on that session can fetch it

**Conversations / messages**
- `GET /conversations` — current user's threads, each with a `lastMessage` preview
- `POST /conversations` `{ tutorId }` — student-auth, get-or-create (also happens automatically on first booking)
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages` `{ text }` — persists and broadcasts over the socket below

## Real-time messaging

On connect, the Socket.IO client is authenticated via the `bb_token` cookie and auto-joined to a room per conversation it's part of. `POST /conversations/:id/messages` broadcasts a `message:new` event (the same shape as the REST response) to that conversation's room — the other party sees it without polling. If a conversation is created after the socket connects, emit `conversation:join` with its id to join that room too.

## File storage

Uploads are written to local disk (`uploads/photos`, `uploads/homework`) rather than S3, to keep local dev dependency-free. Tutor photos are served as public static files; homework files are **not** statically exposed — they're only reachable through the authenticated `GET /sessions/:id/homework/:homeworkId/file` route, which checks the requester is the tutor or student on that session. Swapping in S3-compatible storage later means replacing `src/middleware/upload.ts`'s disk storage with an S3 multer-storage engine and `filePath` with an object key — nothing else in the request/response contract changes.

## Known limitations

- `GET /tutors` filters mostly push down to SQL, but `minRating` and `sort=rating` run in-memory after the query (rating is a derived aggregate, not a column) — fine at current/seed scale, worth revisiting with a materialized rating column if the tutor count grows large.
- `search` matches subjects via exact (case-sensitive) array membership, not substring — a minor gap versus name/tagline matching, which are case-insensitive substring matches.
- No automated test suite yet.
