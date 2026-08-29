# erp-mini-market

Aplikasi Manajemen Minimarket (PO, Penerimaan Barang, Stock Opname, Mutasi antar unit, Dashboard) — monorepo satu repo.

## Stack

| Bagian | Teknologi |
|---|---|
| Backend | NestJS + Prisma + PostgreSQL (`apps/backend`, port 3000) |
| Frontend | Vue 3 + Vite + Tailwind CSS (`apps/frontend`, port 5173) |
| Swagger | `http://localhost:3000/api/docs` |
| Auth | JWT (access + refresh), RBAC |

## Prerequisite

- **Docker + Docker Compose** (opsi A) **ATAU** **Node.js 20+ + PostgreSQL lokal** (opsi B).

## Cara Menjalankan

Ada dua cara: **menggunakan Docker** atau **langsung tanpa Docker**. Pilih salah satu.

### Opsi A — Menggunakan Docker (recommended)

Tanpa perlu install Node/PostgreSQL. Postgres, backend, dan frontend jalan di container.

```bash
# 1. Jalankan seluruh stack (build image dulu)
docker compose up --build -d

# 2. Seed data simulasi
docker compose exec backend npm run prisma:seed
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- PostgreSQL: localhost:5432

Migrasi database otomatis berjalan saat backend start. Variabel env (mis. `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`) bisa diatur lewat file `.env` di root project.

Menghentikan stack:

```bash
docker compose down          # hentikan container
docker compose down -v       # hentikan + hapus volume DB (data di-reset)
```

### Opsi B — Tanpa Docker (langsung)

Butuh **Node.js 20+** dan **PostgreSQL berjalan lokal**.

```bash
# 1. Install dependensi (dari root)
npm install

# 2. Atur koneksi DB di apps/backend/.env (copy dari .env.example)
#    contoh: DATABASE_URL="postgresql://postgres:password@localhost:5432/erp_mini_market?schema=public"

# 3. Migrasi + seed
npm run prisma:migrate -w @erp/backend
npm run prisma:seed -w @erp/backend

# 4. Jalankan backend + frontend bersama
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs

### Akun seed

| Email | Password | Role |
|---|---|---|
| admin@minierp.id | admin123 | ADMIN |
| manager@minierp.id | admin123 | MANAGER |
| gudang@minierp.id | admin123 | STAFF_GUDANG |
| kasir@minierp.id | admin123 | STAFF_KASIR |
| kasircabang@minierp.id | admin123 | STAFF_KASIR |

## Struktur

```
apps/backend/src/
├── common/          # helpers, guards, decorators, interceptors, filters
├── modules/
│   ├── auth/        # login, refresh, RBAC
│   ├── master/      # unit, supplier, product (+batch FEFO)
│   ├── transaction/ # po, receiving, opname, mutation (atomic $transaction)
│   ├── audit/       # audit log service
│   └── dashboard/   # ringkasan, low-stock, expiry, trend
└── prisma/          # schema, migrations, seed

apps/frontend/src/
├── api/             # axios + interceptor (JWT, 401, unwrap response helper)
├── components/      # layout (sidebar/bottom-nav) + ui (StatCard, StatusBadge)
├── stores/          # Pinia (auth)
├── router/
└── views/           # login, dashboard, stock, po, receiving, opname, mutation, settings
```

## Test & Lint

```bash
npm test -w @erp/backend    # unit test helper + service
npm run lint -w @erp/backend
```
