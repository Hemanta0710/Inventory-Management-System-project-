# Build Process and Why We Did Each Step

## 1) Foundation first
What we did:
- Created a backend and frontend structure in one repository.

Why:
- Clear boundaries reduce confusion and make deployment easier.

What it does:
- Lets teams work on Java API and web UI independently.

## 2) Reliable local infrastructure
What we did:
- Added Docker Compose for PostgreSQL and Redis.

Why:
- Most startup issues come from machine differences. Docker removes that variability.

What it does:
- Gives consistent local services with known ports and credentials.

## 3) Spring Boot backend with Flyway
What we did:
- Configured Spring Boot, JPA, PostgreSQL driver, Flyway migration.
- Added first migration to create products table.

Why:
- Schema migrations keep database changes versioned and reproducible.

What it does:
- On startup, app checks and applies SQL migration files automatically.

## 4) Health endpoints
What we did:
- Added actuator health and custom API ping endpoint.

Why:
- Fastest way to confirm whether app is alive and whether DB dependency is working.

What it does:
- `/actuator/health` shows overall status.
- `/actuator/health/db` confirms database connectivity.
- `/api/health/ping` confirms controller path works.

## 5) First business endpoint
What we did:
- Added Product entity, repository, and create/list endpoints.

Why:
- A real CRUD path validates JPA mapping, SQL schema, and JSON API together.

What it does:
- `POST /api/products` creates a product.
- `GET /api/products` returns products.

## 6) Frontend starter
What we did:
- Added Next.js app that fetches products from backend.

Why:
- End-to-end feedback is critical early; backend-only development delays UI validation.

What it does:
- Dashboard page shows products and verifies API integration.

## 7) Why this is mobile ready later
What we did:
- Kept backend API-first and frontend loosely coupled via base URL.

Why:
- Mobile app can reuse same API contracts.

What it does:
- Future React Native app can call existing endpoints with minimal backend changes.
