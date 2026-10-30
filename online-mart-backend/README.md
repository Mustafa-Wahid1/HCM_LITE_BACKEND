# OnlineMart Backend

Production-ready Node.js backend for a UK-style online grocery store (GBP).

## Tech Stack

- Express 4 + MongoDB 7 / Mongoose
- JWT + bcryptjs (cost 12)
- express-validator, helmet, cors, express-rate-limit
- node-cron, dotenv, pino, swagger-jsdoc / swagger-ui-express
- Jest + Supertest

## Quick Start

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET (>=32 chars), PAYMENT_WEBHOOK_SECRET (>=16), ADMIN_* 

npm install
# Ensure MongoDB is running locally (or update MONGODB_URI)

npm run seed   # creates the single ADMIN user
npm run dev    # starts on PORT (default 3000)
```

- Health: `GET /v1/health`
- Swagger (non-prod): `http://localhost:3000/api-docs`

## Project Structure

See the prompt specification. Key areas:

- `src/config` — fail-fast env validation, DB
- `src/middlewares` — JWT (deny-by-default), roles, rate limits, errors
- `src/models` — User, Address, Category, Product, Inventory, Cart, Order, Payment, Counter + indexes
- `src/services` — all business logic (auth, addresses, catalog, cart, order creation/status/cancel, payments)
- `src/jobs` — payment timeout + refund retry crons
- `src/infrastructure/payment` — mock gateway behind interface

## Security Rules Enforced

- Global JWT; public only: health, auth register/login, catalog, webhook
- Role always loaded from DB (not token)
- Ownership → 404 (never 403)
- Rate limits: 150/min global, 10/min auth, 20/min orders, 5/min payment initiate
- Money always returned as strings `"12.50"`
- `passwordHash` never serialized
- Exactly one ADMIN via partial unique index

## Critical Flows

1. **Register** — always CUSTOMER; role in body → 400
2. **Order create** — single transaction: stock deduct + CONSUMED ledger + order + clear cart
3. **Payment webhook** — HMAC verified; success → PAID + CONFIRMED
4. **Payment timeout cron** — PENDING expired → cancel + restore stock
5. **Paid cancel** → REFUND_PENDING → refund → CANCELLED + totalSpent restored

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Nodemon development      |
| `npm start`    | Production start         |
| `npm run seed` | Seed single admin        |
| `npm test`     | Jest + Supertest         |

## Environment

See `.env.example`. Missing/short `JWT_SECRET` or `PAYMENT_WEBHOOK_SECRET` causes process exit on boot.

## Implementation Status

- Phase 1: Setup, env, DB, error handler, health, swagger, core models & middlewares ✅
- Phase 2: Auth + User + JWT + seed admin (core complete) ✅
- Phase 3–10: Address service complete; remaining modules (categories, products, inventory, cart, orders, payments, crons) structured with models ready — implement services/controllers following the exact business rules in the original prompt.

Continue implementation by filling remaining services under `src/services/` and wiring controllers/routes. Prefer transactions for multi-document ops. Follow exact error messages from section 7 of the prompt.
