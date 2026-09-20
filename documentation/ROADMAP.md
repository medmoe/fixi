# Fixi — Project Roadmap

**Target market:** Algeria (DZ)
**Currency:** Algerian Dinar (DZD / DA)
**Languages:** Arabic (primary, RTL), French (secondary), Tamazight (future)

---

## System Overview

Fixi is a worker marketplace platform — customers post skilled-trade jobs, workers apply, customers accept. Think Uber for Algerian tradespeople (plumbers, electricians, masons, carpenters, painters, HVAC technicians).

```
Customer → Post Job → Workers Apply → Customer Accepts → Job Done → Review
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL + PostGIS + Alembic |
| Auth | JWT (access + refresh tokens) + SMS OTP |
| Frontend | React + TypeScript + Vite |
| Mobile | React Native (Expo) |
| State | Redux Toolkit + React Query |
| Real-time | WebSockets (job status, notifications) |
| Payments | Chargily Pay (CIB + Edahabia) + cash-on-delivery |
| Notifications | Mailjet (email) + Firebase (push) + SMS (Twilio/local aggregator) |
| Maps | OpenStreetMap + Nominatim (free, no billing) |
| File Storage | AWS S3 or OVH Object Storage (EU-West, low latency to DZ) |
| Containerization | Docker + Docker Compose |
| Hosting | OVH Roubaix (France) or AWS eu-south-1 (Milan) — best ping to Algeria |

### Algeria-specific decisions

- **Payments**: Stripe is not available in Algeria. We use [Chargily Pay](https://chargily.com/), which supports CIB (bank cards) and Edahabia (Algeria Poste digital wallet). Cash-on-delivery is supported as a fallback since it dominates Algeria's market.
- **No Stripe escrow**: Platform commission is collected via a subscription or flat fee from workers, not per-transaction escrow.
- **SMS OTP**: Phone-based verification is more reliable than email for the Algerian general public. Djezzy, Mobilis, and Ooredoo coverage must be tested.
- **RTL support**: Full Arabic right-to-left layout required. French is left-to-right. The UI must switch direction dynamically.
- **Maps**: Nominatim (OpenStreetMap) is already integrated — no Google Maps billing.
- **Data compliance**: Algerian law 18-07 on personal data protection (equivalent to GDPR). Data stored in EU is acceptable; no requirement for local hosting yet.
- **ID verification**: Workers are verified via CNI (Carte Nationale d'Identité) document upload — stored in S3 with restricted access.

---

## Database Schema

### Users & Roles

```sql
users
├── id
├── email
├── phone              -- required for SMS OTP
├── password_hash
├── role               -- "customer" | "worker" | "admin"
├── full_name
├── avatar_url
├── is_verified
├── preferred_language -- "ar" | "fr"
├── created_at

worker_profiles
├── id
├── user_id            → users.id
├── trade_category_id  → trade_categories.id
├── bio
├── hourly_rate        -- in DZD
├── years_experience
├── display_location   -- city/commune text
├── lat / lng
├── service_radius_km
├── is_available
├── is_verified        -- CNI checked by admin
├── avg_rating
├── total_jobs

worker_certifications
├── id
├── worker_id          → worker_profiles.id
├── cert_name
├── cert_doc_url       -- S3 key
├── verified_at

trade_categories
├── id
├── name_ar            -- e.g. سباك
├── name_fr            -- e.g. Plombier
├── slug               -- "plumber"
```

### Jobs & Applications

```sql
jobs
├── id
├── customer_id        → users.id
├── trade_category_id  → trade_categories.id
├── title
├── description
├── display_location
├── lat / lng
├── budget_min / budget_max  -- in DZD
├── status             -- "open" | "assigned" | "completed" | "cancelled"
├── created_at

job_applications
├── id
├── job_id             → jobs.id
├── worker_id          → worker_profiles.id
├── status             -- "pending" | "accepted" | "rejected"
├── message
├── created_at

reviews
├── id
├── job_id             → jobs.id
├── reviewer_id        → users.id
├── reviewee_id        → users.id
├── rating             -- 1–5
├── comment
├── created_at
```

---

## API Surface

### Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/otp/send      -- SMS OTP to phone
POST   /auth/otp/verify
```

### Workers
```
GET    /workers                    -- search (trade, location, radius, rating)
GET    /workers/:id
GET    /worker-profile             -- own profile
PUT    /worker-profile
```

### Jobs
```
POST   /jobs
GET    /jobs/my                    -- customer's own jobs
GET    /jobs/:id
PATCH  /jobs/:id
DELETE /jobs/:id
GET    /jobs                       -- worker browse (open jobs near them)
POST   /jobs/:id/apply
GET    /jobs/:id/applications
PATCH  /jobs/:id/applications/:appId   -- accept / reject
```

### Reviews
```
POST   /reviews
GET    /workers/:id/reviews
```

---

## Matching Algorithm

Worker search ranks results by:

1. **Trade match** — exact category filter
2. **Distance** — PostGIS `ST_DWithin`, within worker's `service_radius_km`
3. **Score** = `rating × 0.40 + proximity_score × 0.30 + price_fit × 0.30`

---

## Payment Model (Algeria)

No per-transaction escrow (Stripe not available).

```
Worker pays a monthly/quarterly subscription to be listed → platform revenue
                    OR
Platform takes a flat commission invoice after job completion (manual transfer via CIB)

Customer pays worker directly:
  └── Cash (dominant in Algeria)
  └── CIB card / Edahabia via Chargily Pay (online jobs)

Future: Chargily Pay split payments when their marketplace API matures
```

---

## Notification Channels

| Event | Channel |
|---|---|
| New job application | In-app + push (Firebase) |
| Application accepted/rejected | In-app + SMS + push |
| Job status change | In-app + push |
| New review received | In-app + email (Mailjet) |
| Worker verification approved | SMS + email |

---

## Build Timeline

### Phase 1 — Core Auth & Profiles `COMPLETE`
- User registration / login (customer + worker roles)
- JWT access + refresh token flow
- Worker profile CRUD
- Trade categories seed data (Arabic + French names)

### Phase 2 — Jobs & Applications `COMPLETE`
- Customer: post, edit, delete jobs
- Worker: browse open jobs, apply
- Customer: view applications, accept / reject
- Optimistic UI updates on status change

### Phase 3 — Search & Discovery `COMPLETE`
- Worker search by trade category
- Geo-based search with Nominatim + PostGIS radius filter
- Customer and worker dashboards

### Phase 4 — Testing & Stability `COMPLETE`
- Vitest unit tests for all hooks and components
- Cypress E2E tests: full job posting workflow, auth flows
- GitHub Actions CI on pull requests (lint, type-check, unit tests, E2E)

### Phase 5 — Reviews & Ratings `COMPLETE`
- Post-job review form (customer reviews worker, worker reviews customer)
- Star rating aggregation on worker profile
- Review list on public worker profile page

### Phase 6 — Notifications `Oct–Nov 2026`
- In-app notification feed (WebSocket)
- Firebase push notifications (web + mobile)
- Email via Mailjet (Arabic + French templates)
- SMS OTP for phone verification (Twilio with DZ number testing)

### Phase 7 — i18n & RTL `Nov 2026`
- Arabic (ar) + French (fr) language files
- RTL layout switching for Arabic
- Number and date formatting for DZ locale (e.g. DA currency symbol)
- Trade category names displayed in user's preferred language

### Phase 8 — Payments `Dec 2026`
- Chargily Pay integration (CIB + Edahabia checkout)
- Worker subscription billing
- Invoice generation (PDF, Arabic + French)
- Admin panel: subscription status, manual commission tracking

### Phase 9 — Admin & Verification `Dec 2026–Jan 2027`
- Admin panel: user management, worker CNI verification queue
- Flagged review moderation
- Platform analytics (jobs posted, applications, conversion rate)

### Phase 10 — Production Deployment `Jan 2027`
- OVH Roubaix VPS or AWS eu-south-1 (Milan)
- Nginx reverse proxy + SSL (Let's Encrypt)
- PostgreSQL with daily backups to S3
- Docker Compose production config with secrets management
- Domain: `.dz` TLD registration (via ANIC)
- Load testing for Algerian peak hours (Ramadan traffic spikes)

### Phase 11 — Mobile App Polish `Feb 2027`
- React Native (Expo) — iOS + Android
- Arabic RTL on mobile
- Offline-tolerant (poor connectivity in rural wilayas)
- App Store + Google Play submission

---

## Algeria Launch Checklist

- [ ] All UI text available in Arabic (Darija-friendly MSA) and French
- [ ] RTL layout fully tested on Arabic
- [ ] Chargily Pay sandbox + production credentials configured
- [ ] SMS OTP tested on Djezzy, Mobilis, and Ooredoo SIM cards
- [ ] Trade category list reviewed by local tradespeople (wilaya coverage)
- [ ] Privacy policy compliant with Algerian law 18-07
- [ ] Terms of service in Arabic and French
- [ ] `.dz` domain registered via ANIC
- [ ] Support contact: local phone number (not +1/+44)
- [ ] Load test simulating Algerian traffic patterns
