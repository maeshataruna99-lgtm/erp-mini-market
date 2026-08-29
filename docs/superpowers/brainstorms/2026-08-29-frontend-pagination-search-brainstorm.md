# Brainstorming: Frontend Pagination & Search (List Content)

**Date Started:** 2026-08-29
**Status:** In Progress
**Current Phase:** alignment
**Based On:** 2026-08-29-erp-mini-market-backend-brainstorm.md
**Final Spec:** <spec path, filled when Status becomes Done>
**Last Updated:** 2026-08-29

## Original User Request

> oke saya sudah lihat semuanya ini fatal ya harusnya dibuat pagination untuk konten data tidak perlu limit, limit default 10 untuk setiap page, contoh data stok barang ini sangat banyak harus scroll kebawah ini sangat tidak efisien dan membuat load data berat gunakan juga search general dengan baik

---

## Prior Discussion (basis for this new round)

Sesi induk (Done) menetapkan stack NestJS + Prisma + PostgreSQL (backend) + Vue 3/Vite/Tailwind (frontend) dalam monorepo npm workspaces. Backend sudah menyediakan pagination (`PaginationHelper`, `meta: { page, limit, total, totalPages }`) dan search per-endpoint (e.g. product.search via OR name/SKU). Frontend `api/index.ts` sudah punya helper `paginated<T>()` yang mengembalikan `{ data, meta }`. Namun seluruh list view saat ini memuat data dalam satu gulir besar: `StockView`/`PoView`/`ReceivingView`/`OpnameView`/`MutationView` memanggil `list({ limit: 50 })` (atau 100) dan merender semua baris tanpa kontrol halaman; search per-view ada tapi belum "general" dan belum terhubung ke pagination server-side.

Task ini: menambahkan pagination UI (default 10 per halaman) pada setiap daftar konten, memastikan loading ringan (server-side page fetch, bukan muat semua), dan menyempurnakan search general agar terhubung ke pencarian server-side dengan debounce.

---

## Phase A: Alignment Decision Log

### Q1: Scope — which list pages get pagination + search
**Options Presented:**
- A: All list views (Stock, PO, Receiving, Opname, Mutation, Settings units/suppliers)
- B: Stock only first
**Decision:** A — All list views
**Rationale:** User wants consistency; current data is large everywhere (esp. stock).
**Timestamp:** 2026-08-29

### Q2: Pagination strategy
**Options Presented:**
- A: Server-side page fetch (page/limit + meta.totalPages)
- B: Client-side slice of full fetch
**Decision:** A — Server-side page fetch
**Rationale:** Light load, scales with big data; matches complaint about heavy loading.
**Timestamp:** 2026-08-29

### Q3: Page size
**Options Presented:**
- A: Default 10 + selector 10/25/50/100
- B: Fixed 10
**Decision:** A — Default 10 + size selector
**Rationale:** Default 10 per user; selector gives flexibility.
**Timestamp:** 2026-08-29

### Q4: Search behavior & backend scope
**Options Presented:**
- A: Debounced search box wired server-side on every list page; extend backend search to unit/supplier/receiving/opname/mutation
- B: Search only where backend already supports (product, PO)
**Decision:** A — general search, per-module, single search bar; extend backend
**Rationale:** "general search hanya berlaku permodul… cukup satu search bar di setiap module" — one bar per module auto-searches across relevant fields (name/SKU/supplier/poNumber/etc.), no field picker. Requires backend search on endpoints lacking it.
**Timestamp:** 2026-08-29

### Q5: Pagination UI style
**Options Presented:**
- A: Numbered pages + prev/next + ellipsis + info text
- B: Only prev/next buttons
**Decision:** B — only prev/next, plus small "Page X of Y · total N" counter
**Rationale:** User prefers minimal; a small counter added so navigation is not ambiguous.
**Timestamp:** 2026-08-29

### Q6: Reuse — shared vs inline code
**Options Presented:**
- A: Shared Pagination.vue component + debounced search composable
- B: Inline per view
**Decision:** A — Shared components
**Rationale:** DRY, consistent UI/behavior across all list views.
**Timestamp:** 2026-08-29

### Phase A → B Transition Confirmation [2026-08-29]
**Alignment Summary (compiled by ds):**
- Decision 1: Apply pagination + search to all list views (Stock, PO, Receiving, Opname, Mutation, Settings units/suppliers).
- Decision 2: Server-side page fetch using page/limit + meta.totalPages (no full-load).
- Decision 3: Default 10 rows/page with a 10/25/50/100 size selector.
- Decision 4: Single debounced search bar per module, auto-searching multiple fields (no field picker); extend backend `search` to unit/supplier/receiving/opname/mutation.
- Decision 5: Pagination UI = prev/next buttons + small "Page X of Y · total N" counter.
- Decision 6: Shared `Pagination.vue` component + reusable debounced-search composable.

**User Confirmation:** ✓ Confirmed (2026-08-29 — user requested direct implementation, skipped spec ceremony)

---

## Phase B: Spec Writing Status

- [ ] Initial draft complete
- [ ] Round 1 revision
- [ ] Round 2 revision
- [ ] Round 3 revision
- [ ] Final sign-off

## Phase B Review Progress

### Round 1 [⏳ in progress / ✓ complete]

**Dispatched reviewers (N):**

**Receipt Status:**

**Round metadata:**

**Findings:**

| ID | Sev | Location | Reviewer | Problem | Arbiter | Status |
|----|-----|----------|----------|---------|---------|--------|

**Arbiter Output:**

### Appendix (NITs)

---

## Phase B User Intervention Decisions
