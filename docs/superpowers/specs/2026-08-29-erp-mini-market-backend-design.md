# Spesifikasi — ERP Mini-Market Backend + Frontend (Monorepo)

**Date:** 2026-08-29
**Status:** Approved (alignment dikonfirmasi user)
**Based on:** dokumen spesifikasi teknis PostgreSQL + Prisma (suplai user) + desain HTML frontend (suplai user)

---

## 1. Problem

Minimarket butuh sistem manajemen stok multi-modul (PO, Penerimaan, Stock Opname, Mutasi antar unit, Dashboard) dengan stok real-time, approval workflow, dan audit trail. Aplikasi harus mudah di-maintain (arsitektur modular rapih), satu repo untuk backend & frontend, responsive di mobile & desktop.

## 2. Goals

- Backend monolitik modular (NestJS) + Prisma/PostgreSQL sebagai single source of truth.
- Struktur folder rapih: modul per entitas di dalam folder domain; routing via Module (Controller terdaftar di Module).
- Direktori helper khusus (`src/common/helpers/`) untuk menstandarkan development.
- REST API lengkap dengan Swagger (`/api/docs`).
- Frontend Vue 3 + Tailwind mengikuti desain HTML yang disetujui, responsive device-first.
- Satu repo npm workspaces; `npm run dev` menjalankan backend & frontend bersama.
- Unit tests (Jest) untuk helper & service; seed script.

## 3. Non-Goals

- Tidak membangun WebSocket real-time penuh (pakai polling/ETag/SSE di masa depan).
- Tidak membangun POS/kasir terintegrasi barcode scanner hardware.
- Tidak ada multi-branch approval yang rumit (cukup 1 level approval).
- Tidak ada frontend mobile native terpisah (cukup responsive web).

## 4. Design Principles

- **Modularity**: setiap entitas = Module + Controller + Service + DTO.
- **Consistency**: semua response API memakai Response Helper (unwrapped oleh TransformInterceptor).
- **Atomicity**: semua mutasi stok (receiving, mutasi, reconcile opname) di dalam `prisma.$transaction`.
- **Security**: JWT + RBAC, approval hanya untuk role MANAGER/ADMIN.
- **Auditability**: setiap adjustment/mutasi tercatat di AuditLog (before/after JSON).
- **Developer experience**: helper terpusat, Swagger lengkap, seed untuk data awal.

## 5. Acceptance Scenarios

### Feature: Auth
```gherkin
Scenario: Staff login dengan kredensial valid
  Given user admin di-seed dengan email dan password
  When user POST /api/v1/auth/login dengan kredensial benar
  Then response berisi { success: true } dengan data accessToken & refreshToken
  And Swagger /api/docs menampilkan endpoint auth

Scenario: Akses endpoint tanpa token ditolak
  Given tidak ada token JWT
  When user GET /api/v1/products
  Then response 401 dengan format Response Helper
```

### Feature: Purchase Order
```gherkin
Scenario: Kasir membuat PO lalu manager menyetujui
  Given user STAFF_KASIR login
  When POST /api/v1/po dengan items (produk + qty + harga)
  Then PO tersimpan dengan status DRAFT dan nomor PO-YYYY-NNNN
  And manager PATCH /api/v1/po/:id/approve
  Then status menjadi APPROVED dan tercatat di AuditLog
```

### Feature: Goods Receiving
```gherkin
Scenario: Konfirmasi penerimaan mengupdate stok atomik
  Given PO berstatus SENT dengan items
  When POST /api/v1/receiving/:id/confirm dengan qtyReceived
  Then stockLevel produk di unit bertambah sesuai qtyReceived
  And jika selisih qty > 5% dibuat AuditLog DISCREPANCY_ALERT
```

### Feature: Stock Opname
```gherkin
Scenario: Blind count lalu reconcile menyesuaikan stok
  Given sesi opname di unit tertentu
  When submit blind-count lalu POST /api/v1/opname/sessions/:id/reconcile
  Then qtySystem & variance terhitung
  And jika variance != 0, stockLevel disesuaikan dan AuditLog STOCK_ADJUSTMENT dibuat
```

### Feature: Stock Mutation
```gherkin
Scenario: Mutasi antar unit atomik
  Given ada unit gudang pusat dan unit cabang
  When request mutasi lalu approve lalu confirm receive
  Then stok unit asal berkurang dan unit tujuan bertambah dalam satu $transaction
```

### Feature: Frontend
```gherkin
Scenario: Login lalu melihat dashboard
  Given backend berjalan di :3000 dan frontend di :5173
  When user login dari halaman /login
  Then redirect ke / dan menampilkan statistik dashboard
  And layout menyesuaikan device: sidebar (desktop) atau bottom-nav + FAB (mobile)
```

## 6. Design

### 6.1 Monorepo
```
erp-mini-market/
├── package.json            # workspaces ["apps/*"] + scripts (dev via concurrently)
├── .gitignore
└── apps/
    ├── backend/            # NestJS :3000
    └── frontend/           # Vue 3 + Vite :5173
```

### 6.2 Backend — struktur
```
apps/backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── main.ts             # bootstrap, prefix /api/v1, Swagger, ValidationPipe, CORS
    ├── app.module.ts
    ├── prisma/             # PrismaModule, PrismaService
    ├── common/
    │   ├── helpers/        # response, pagination, date, sequence, crypto, notification, excel
    │   ├── guards/         # jwt-auth.guard, roles.guard
    │   ├── decorators/     # public.decorator, roles.decorator
    │   ├── interceptors/   # transform.interceptor, logging.interceptor
    │   └── filters/        # http-exception.filter
    └── modules/
        ├── auth/           # controller, service, dto, jwt.strategy
        ├── master/         # supplier/, product/, unit/
        ├── transaction/    # po/, receiving/, opname/, mutation/
        └── dashboard/      # dashboard.module, audit-log module
```

### 6.3 Prisma schema
Memakai schema dari dokumen spesifikasi: User, Unit, Supplier, Product, ProductBatch, StockLevel, PurchaseOrder(+Item), GoodsReceiving(+Item), StockOpnameSession(+Item), StockMutation(+Item), AuditLog + enum Role/POStatus/ReceivingStatus/OpnameStatus/MutationStatus.

Transaksi atomik wajib: confirm receiving, mutation receive, reconcile opname.

### 6.4 Common helpers
- `response.helper` — format `{ success, message, data, meta, timestamp, errors }`
- `pagination.helper` — page/limit/total/totalPages
- `date.helper` — format & kalkulasi tanggal/FEFO
- `sequence.helper` — generator kode transaksi (PO/MUT/OPN) berbasis counter
- `crypto.helper` — hash & token
- `notification.helper` — stub notifikasi
- `excel.helper` — export CSV/Excel

### 6.5 API Surface (ringkas)
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/v1/auth/login | Login JWT |
| GET | /api/v1/units, /suppliers, /products | List master (pagination + filter) |
| CRUD | /api/v1/products | Master produk + batch |
| POST/PATCH | /api/v1/po ... | PO + workflow approval |
| POST | /api/v1/receiving/:id/confirm | Konfirmasi terima (atomik) |
| POST | /api/v1/opname/sessions/:id/reconcile | Reconcile stok (atomik) |
| PATCH | /api/v1/mutations/:id/receive | Terima mutasi (atomik) |
| GET | /api/v1/dashboard/low-stock, /expiry | Dashboard |

### 6.6 Frontend — struktur
```
apps/frontend/
├── vite.config.ts          # proxy /api/v1 → :3000
├── tailwind.config.js      # palet desain HTML
├── index.html
└── src/
    ├── main.ts, App.vue
    ├── router/index.ts     # /login, /, /stock, /po, /receiving, /opname, /mutation, /settings
    ├── stores/             # auth, stock, po (Pinia)
    ├── api/                # axios instance + interceptor (JWT, 401, unwrap)
    ├── components/layout/  # AppSidebar, AppHeader, AppBottomNav, AppToast
    ├── components/ui/      # StatCard, StatusBadge, DataTable, SearchBar
    └── views/              # Login, Dashboard, Stock, PO, Receiving, Opname, Mutation, Settings
```

Desain: palet `primary #2563eb`, `secondary #64748b`, `success #10b981`, `warning #f59e0b`, `danger #ef4444`, `background #f8fafc`; font Inter; Phosphor Icons; responsive (sidebar desktop ↔ bottom-nav + FAB mobile).

## 7. Implementation Phases

| Fase | Isi |
|---|---|
| 0 | Scaffold monorepo (root package.json, .gitignore) |
| 1 | Scaffold backend NestJS + Prisma + schema + migrate + seed + common/ + bootstrap |
| 2 | Auth (JWT + RBAC) |
| 3 | Master: unit, supplier, product (+batch) |
| 4 | Transaction: po, receiving, opname, mutation |
| 5 | Dashboard + AuditLog |
| 6 | Verify backend (test + lint) |
| 7 | Scaffold frontend (Vite + Vue3 + Tailwind + router + pinia + axios + proxy) |
| 8 | Layout & komponen + Login |
| 9 | Views per modul |
| 10 | Integrasi & verifikasi `npm run dev` |

## 8. Testing Strategy

- Jest unit tests: semua helper (response, pagination, date, sequence, crypto) + service transaksi.
- Prisma validate + migrate deploy.
- Manual: `npm run dev`, login seed user, cek flow PO→Receiving→Stock.

## 9. File Inventory

- `docs/superpowers/brainstorms/2026-08-29-erp-mini-market-backend-brainstorm.md`
- `docs/superpowers/specs/2026-08-29-erp-mini-market-backend-design.md` (ini)
- Root: `package.json`, `.gitignore`
- `apps/backend/**`, `apps/frontend/**` per struktur di atas.

## 10. Out of Scope

- WebSocket penuh, POS/barcode hardware, multi-approval berjenjang, native mobile app.
