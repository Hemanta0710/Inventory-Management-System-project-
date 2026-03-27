<<<<<<< HEAD
# Inventory Management System

This repository contains:
- backend: Spring Boot API (Java 21)
- frontend: Next.js web application (TypeScript)
- docker-compose.yml: local PostgreSQL and Redis

## Why this setup
- Java backend for scalable business logic and integrations
- PostgreSQL for reliable transactional inventory data
- Next.js for responsive web app now and mobile app reuse later
- Docker for predictable local development

## Quick start
1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start databases:
   - `docker compose up -d`
3. Run backend:
   - `cd backend`
   - `mvn spring-boot:run`
4. Run frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Important first endpoint checks
- Backend health: `http://localhost:8080/actuator/health`
- Database health: `http://localhost:8080/actuator/health/db`
- API ping: `http://localhost:8080/api/health/ping`

## Frontend authentication
- Login URL: `http://localhost:3000/login`
- Protected routes: `/` and `/cart`
- Default credentials:
   - Manager -> Username: `admin`, Password: `admin123`
   - Employee -> Username: `employee`, Password: `employee123`
- To override credentials for local development, set these env vars before starting frontend:
   - Manager credentials: `IMS_MANAGER_USER`, `IMS_MANAGER_PASSWORD`
   - Employee credentials: `IMS_EMPLOYEE_USER`, `IMS_EMPLOYEE_PASSWORD`
   - Backward compatibility: `IMS_AUTH_USER`, `IMS_AUTH_PASSWORD` still work as manager fallback.

## New manager and employee features
- Employee cart supports picture-based product selection.
- Cart checkout supports payment (`cash/card/upi`) and auto-generates a bill.
- Manager dashboard includes:
   - Sales by product chart
   - Daily, weekly, and monthly sales report views

## Learn data entry and system management
- Read `docs/system-operations-guide.md` for step-by-step instructions on:
   - Adding products
   - Employee shopping flow
   - Checkout and bill generation
   - Using manager reports

## Project roadmap
- Phase 1: Inventory products and stock tracking
- Phase 2: Low stock alerts
- Phase 3: Employee cart workflow
- Phase 4: Sales prediction
- Phase 5: Multi-store management

See `docs/database-connection-guide.md` for a detailed database troubleshooting guide.
=======
# Inventory-Management-System-project-
This is the project for my Seventh semester in BIT as we need to submit at final of the semester.
>>>>>>> 7ef7101c91a9749c53e7feaa76e6d0acf2f87bd9
