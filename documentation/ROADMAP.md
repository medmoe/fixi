Here's a comprehensive system design for a **Worker Marketplace Platform** — think Uber but for skilled trades.

---

## 🏗️ System Overview

```
Customer → Search/Book Worker → Worker Accepts → Job Done → Review
```

---

## 📁 Project Structure

```
worker-marketplace/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── customers.py
│   │   │       ├── workers.py
│   │   │       ├── jobs.py
│   │   │       ├── bookings.py
│   │   │       └── reviews.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── worker.py
│   │   │   ├── job.py
│   │   │   ├── booking.py
│   │   │   └── review.py
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── matching.py
│   │   │   ├── notification.py
│   │   │   └── payment.py
│   │   └── main.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Search.tsx
│   │   │   ├── WorkerProfile.tsx
│   │   │   ├── BookingFlow.tsx
│   │   │   └── Dashboard/
│   │   │       ├── CustomerDashboard.tsx
│   │   │       └── WorkerDashboard.tsx
│   │   ├── components/
│   │   └── store/
└── docker-compose.yml
```

---

## 🗄️ Database Schema

### Users & Roles
```sql
-- Base user (shared by customers and workers)
users
├── id (UUID)
├── email
├── password_hash
├── phone
├── role         -- "customer" | "worker" | "admin"
├── full_name
├── avatar_url
├── is_verified
├── created_at

-- Worker-specific profile
worker_profiles
├── id (UUID)
├── user_id      → users.id
├── trade        -- "bricklayer" | "carpenter" | "electrician" | "cook" ...
├── bio
├── hourly_rate
├── years_experience
├── location     -- city/region
├── lat / lng    -- for geo-based search
├── is_available
├── avg_rating
├── total_jobs

-- Worker certifications/skills
worker_skills
├── id
├── worker_id    → worker_profiles.id
├── skill_name
├── certified    -- bool
├── cert_doc_url
```

### Jobs & Bookings
```sql
-- Job posted by customer
jobs
├── id (UUID)
├── customer_id  → users.id
├── title
├── description
├── trade_needed -- "electrician" etc.
├── location
├── lat / lng
├── budget
├── status       -- "open" | "assigned" | "in_progress" | "completed" | "cancelled"
├── scheduled_at
├── created_at

-- Booking = worker assigned to job
bookings
├── id (UUID)
├── job_id       → jobs.id
├── worker_id    → users.id
├── customer_id  → users.id
├── status       -- "pending" | "accepted" | "rejected" | "completed"
├── agreed_rate
├── started_at
├── completed_at
├── payment_status -- "unpaid" | "paid" | "refunded"

-- Reviews (both directions)
reviews
├── id (UUID)
├── booking_id   → bookings.id
├── reviewer_id  → users.id
├── reviewee_id  → users.id
├── rating       -- 1–5
├── comment
├── created_at
```

---

## 🔌 API Endpoints

### Auth
```
POST   /auth/register          -- customer or worker signup
POST   /auth/login             -- returns JWT
POST   /auth/refresh           -- refresh token
```

### Workers
```
GET    /workers                -- search workers (filter by trade, location, rating)
GET    /workers/:id            -- worker public profile
GET    /workers/me/profile     -- worker's own dashboard
PUT    /workers/me/profile     -- update availability, rate, bio
GET    /workers/me/bookings    -- incoming job requests
PUT    /workers/me/bookings/:id/accept
PUT    /workers/me/bookings/:id/reject
```

### Jobs
```
POST   /jobs                   -- customer posts a job
GET    /jobs                   -- customer sees their jobs
GET    /jobs/:id
PUT    /jobs/:id/cancel
```

### Bookings
```
POST   /bookings               -- customer books a worker
PUT    /bookings/:id/complete  -- mark job done
```

### Reviews
```
POST   /reviews                -- submit review after job complete
GET    /workers/:id/reviews    -- public reviews for a worker
```

---

## ⚙️ Core Services

### 1. Matching Service
```python
# services/matching.py
# When a customer searches, rank workers by:

def rank_workers(trade, lat, lng, budget):
    # 1. Filter by trade + availability
        # 2. Filter by distance (PostGIS or Haversine formula)
            # 3. Score by: rating (40%) + proximity (30%) + price fit (30%)
                # 4. Return ranked list
                ```

### 2. Notification Service
```
Trigger notifications for:
- Worker: new booking request
- Customer: worker accepted/rejected
- Both: job status changes
- Both: new review received

Channels: Email (SendGrid) + Push (Firebase) + In-app (WebSocket)
```

### 3. Payment Flow
```
Customer pays upfront → held in escrow
    ↓
    Job completed + confirmed
        ↓
        Funds released to worker (minus platform fee ~10–15%)
            ↓
            Receipt emailed to both

            Provider: Stripe Connect (handles marketplace payouts natively)
            ```

            ---

## 🔄 Core User Flows

### Customer Flow
```
Register → Browse Workers (filter by trade/location/price)
        → View Worker Profile (reviews, skills, rate)
                → Post a Job OR Direct Book
                        → Worker Accepts → Job In Progress
                                → Mark Complete → Pay → Leave Review
                                ```

### Worker Flow
```
Register → Build Profile (trade, skills, certs, rate, location)
         → Set Availability
                  → Receive Booking Requests
                           → Accept/Reject → Do the Job
                                    → Get Paid → Receive Review
                                    ```

                                    ---

## 🧱 Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend | FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL + Alembic migrations |
| Auth | JWT (access + refresh tokens) |
| Frontend | React + TypeScript + Vite |
| State | Zustand |
| Real-time | WebSockets (job status, chat) |
| Payments | Stripe Connect |
| Notifications | SendGrid (email) + Firebase (push) |
| Search | PostGIS for geo queries |
| Containerization | Docker + Docker Compose |
| File Storage | AWS S3 (avatars, cert docs) |

---

## 🚀 Build Order

1. **Week 1** — Auth system (register/login for both roles), user profiles
2. **Week 2** — Worker profiles, trade categories, availability toggling
3. **Week 3** — Job posting, worker search + filtering, geo-based ranking
4. **Week 4** — Booking flow (request → accept/reject → in progress)
5. **Week 5** — Payments via Stripe Connect + escrow logic
6. **Week 6** — Reviews, ratings, worker score recalculation
7. **Week 7** — Notifications (email + real-time WebSocket)
8. **Week 8** — Polish: dashboards, admin panel, testing, Docker prod setup

---

Want me to go deeper on any specific part — like the database models in SQLAlchemy, the matching algorithm, the Stripe Connect integration, or the React booking flow?
