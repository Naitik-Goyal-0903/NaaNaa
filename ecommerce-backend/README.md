# ecommerce-backend (demo)

This is a minimal Express + Mongoose backend included for local development and testing.

Quick start:

1. Install dependencies

```bash
cd ecommerce-backend
npm install
```

2. Create `.env` from `.env.example` and set `MONGODB_URI` (or run a local MongoDB)

3. Seed admin + sample products

```bash
npm run seed
```

4. Run server

```bash
npm run dev
```

API endpoints:
- `POST /api/auth/register` — body: { name, email, username, password }
- `POST /api/auth/login` — body: { identifier, password }
- `GET /api/products` — list products

Notes:
- Admin seeded with username `NaitikNitya` and password `13022025`.
- This is a demo; move admin credential checks and JWT secret to secure server environments when deploying.
