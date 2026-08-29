# Spec: Versi Vercel-launch (Browser LocalStorage Engine)

**Date:** 2026-08-29
**Status:** Approved
**Branch:** vercel-push

## Problem

Vercel hanya bisa serve static frontend — tidak ada backend NestJS + PostgreSQL yang persisten. Agar ERP Mini-Market tetap berjalan penuh saat di-deploy ke Vercel, seluruh logika bisnis & data harus berjalan di sisi browser tanpa server database.

## Goals

- Frontend `apps/frontend` tetap satu codebase yang bisa berjalan **dual-mode**: real API (dev) atau localStorage (Vercel).
- `src/api/index.ts` dan seluruh view **tidak diubah**.
- Paritas fungsional penuh dengan backend: auth, master, PO, receiving, opname, mutation, dashboard, audit.
- Deployable sebagai static build; auto-seed data demo.

## Non-Goals

- Export/Import JSON backup (diputuskan "tanpa backup").
- Config `vercel.json` & langkah deploy (fitur dulu, deploy nanti).
- Shared domain package antara backend & frontend.
- Perubahan apa pun pada backend.

## Design Principles

1. **Satu seam transport** — hanya `src/api/http.ts` yang berubah; 5 helper (`get/paginated/post/patch/remove`) menjaga signature identik.
2. **api/index.ts & view tak tersentuh** — adapter mengembalikan bentuk data denormalisasi yang sama dengan backend.
3. **Dual-mode via env build** — `VITE_USE_LOCAL_DB=true` aktifkan engine lokal; tanpa var = axios ke backend.
4. **RBAC & status machine setara backend** — role guard, transisi status, dampak stok direplikasi persis.
5. **localStorage sinkron** — operasi baca/tulis langsung; ID generik; sequence counter monoton.

## Acceptance Scenarios

```gherkin
Feature: Versi Vercel-launch berjalan penuh di browser

  Scenario: Login akun demo berhasil
    Given localStorage kosong saat pertama kali dibuka
    When user membuka halaman login dan masuk dengan admin@minierp.id / admin123
    Then system auto-seed data demo dan user dialihkan ke dashboard
    And akses menu sesuai role ADMIN

  Scenario: Pembuatan & lifecycle PO
    Given user ADMIN login di mode lokal
    When membuat PO baru lalu submit, approve, dan send
    Then nomor PO berbentuk PO-<tahun>-NNNN
    And PO dapat diterima (receiving) setelah berstatus SENT

  Scenario: Receiving menambah stok
    Given PO berstatus SENT
    When membuat receiving dan confirm item
    Then stok unit bertambah sebesar qtyReceived
    And PO berubah ke PARTIAL atau COMPLETED
    And discrepansi > 5% menandai hasDiscrepancy

  Scenario: Opname menyesuaikan stok
    Given ada sesi opname SCHEDULED
    When start, input blind count, lalu reconcile
    Then stok unit di-overwrite ke qtyPhysical utk item bervariansi

  Scenario: Mutasi memindahkan stok antar unit
    Given mutasi REQUESTED dari unit A ke unit B
    When approve, pick, lalu receive
    Then stok unit A berkurang dan unit B bertambah sebesar qty
    And mutasi berstatus RECEIVED
```

## Design

### Mode switch (`src/api/http.ts`)
```ts
const localMode = import.meta.env.VITE_USE_LOCAL_DB === 'true';
// bila localMode → re-export get/paginated/post/patch/remove dari src/localdb/index.ts
// bila tidak → perilaku axios saat ini (interceptor JWT/refresh tetap)
```

### Engine `src/localdb/`
- `helpers.ts` — id generator (cuid-like), envelope ApiResponse, `buildMeta` pagination (default page 1 / limit 20 / max 100), date-key, SHA-256 via Web Crypto.
- `sequence.ts` — `PO-<tahun>-NNNN`, `MUT-<tahun>-NNNN` (counter monoton per prefix/tahun).
- `db.ts` — lapisan localStorage: key per koleksi, load/save, dan **assembler denormalisasi** (`po.supplier.name`, `product.stockLevels`, `user.unitName`, `batch.product`, `_count.items`).
- `seed.ts` — auto-seed saat localStorage kosong: 5 akun, 2 unit (1 central), 3 supplier, ~10 produk (variasi kategori, sebagian perishable + minStock), stok awal, 1 PO sample, audit awal.
- `auth.ts` — `login` (validasi hash, token JWT dummy base64), `refresh` (rotate), `me`, `users`, `createUser` (min 6 char, email duplikat → 409). RBAC.
- `master.ts` — unit/supplier/product CRUD + filter (search, category, `stockStatus` low/ok/out), `addBatch` + `listBatches` FEFO (expiry asc, received desc).
- `po.ts` — status machine `DRAFT→PENDING_APPROVAL→APPROVED→SENT→(PARTIAL|COMPLETED)` + `CANCELLED`; `assertCanEdit` (creator atau ADMIN/MANAGER).
- `receiving.ts` — create (PO harus SENT), confirm → increment `StockLevel`, `discrepancyPct`, `hasDiscrepancy > 5%`, set PO PARTIAL/COMPLETED.
- `opname.ts` — `SCHEDULED→IN_PROGRESS→RECONCILED→CLOSED`; start buat item per produk (filter scope); blind-count; reconcile **overwrite** stok ke qtyPhysical + audit `STOCK_ADJUSTMENT` tiap varian.
- `mutation.ts` — `REQUESTED→APPROVED→IN_TRANSIT→RECEIVED` + `REJECTED`; receive → decrement asal / increment tujuan, cek stok cukup.
- `dashboard.ts` — summary (lowStock, pendingPo, receivingsToday −1 hari, expiringSoon 30 hari, productCount, totalStock), lowStock, expiry, trend 7 hari (label id-ID), auditLogs.
- `router.ts` — dispatch `(method, url, body, params, currentUser)` → modul di atas; enforce RBAC + status; throw `Error(message)` bahasa Indonesia sesuai backend.
- `index.ts` — re-export `get/paginated/post/patch/remove` signature identik `http.ts`.

### RBAC matrix (direplikasi)
| Aksi | Role |
|---|---|
| approve PO/mutasi, reject mutasi | MANAGER, ADMIN |
| create/update unit, supplier, product, addBatch | ADMIN, MANAGER |
| delete unit/supplier/product, createUser | ADMIN |
| listUsers | ADMIN, MANAGER |
| sisanya (login, me, list, PO submit/send/cancel by creator, receiving, opname, mutation request/pick/receive) | authenticated |

ADMIN bypass semua guard.

### Dampak stok & konstanta
- receiving confirm → increment `StockLevel.qty`; discrepansi threshold **5%**.
- opname reconcile → set absolut `StockLevel.qty = qtyPhysical`; varian ≠ 0 → audit `STOCK_ADJUSTMENT`.
- mutation receive → decrement unit asal / increment unit tujuan; cek stok cukup.
- expiry window **30 hari**; receivingsToday window **−1 hari**.
- kode hanya utk PO & MUT (GR/OPN pakai id).

## Implementation Phases

1. `helpers.ts` + `sequence.ts` + `db.ts` + `seed.ts`
2. `auth.ts`
3. `master.ts`
4. `po.ts` → `receiving.ts` → `opname.ts` → `mutation.ts`
5. `dashboard.ts`
6. `router.ts` + `index.ts` + seam `http.ts`
7. Vitest unit test
8. Build + dev end-to-end `VITE_USE_LOCAL_DB=true`

## Testing Strategy

- **Vitest** (devDependency frontend): unit test engine — sequence, auth/RBAC, PO lifecycle, receiving→stok, opname reconcile, mutation transfer.
- Verifikasi manual: `npm run build -w @erp/frontend`; `npm run dev` dengan `VITE_USE_LOCAL_DB=true` mencoba tiap alur view.

## File Inventory

**Baru:** `apps/frontend/src/localdb/{helpers,sequence,db,seed,auth,master,po,receiving,opname,mutation,dashboard,router,index}.ts` + `apps/frontend/src/localdb/*.spec.ts` + `apps/frontend/vitest.config.ts`.

**Diubah:** `apps/frontend/src/api/http.ts`; `apps/frontend/package.json` (devDep vitest + script `test:localdb`).

## Out of Scope

Export/Import backup; `vercel.json` & README deploy; shared domain package; perubahan backend; role-filter menu (parity: menu tetap tidak difilter role seperti saat ini).
