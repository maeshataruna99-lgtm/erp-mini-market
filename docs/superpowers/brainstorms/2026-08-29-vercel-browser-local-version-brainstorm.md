# Brainstorming: Versi Vercel-launch (Browser LocalStorage)

**Date Started:** 2026-08-29
**Status:** Done
**Current Phase:** finalizing
**Based On:** 2026-08-29-erp-mini-market-backend-brainstorm.md
**Final Spec:** docs/superpowers/specs/2026-08-29-vercel-browser-local-version-design.md
**Last Updated:** 2026-08-29 13:30

## Original User Request

> "caveman" oke sekarang kita buat versi vercel-launch. karena vercel pastinya tidak support dengan database, kita perlu buat local storage untuk browser agar app ini tetap berjalan normal kita brain storming dulu

---

## Phase A: Alignment Decision Log

### Q1: Arsitektur versi Vercel
**Options Presented:**
- A: Adapter API localStorage di frontend (Recommended) — ganti lapisan axios dengan mock adapter berbasis localStorage/IndexedDB, backend tetap ada tapi tak dipakai di Vercel
- B: Frontend baru mandiri (rewrite)
- C: Demo minimal
**Decision:** A (Adapter API localStorage di frontend)
**Rationale:** Pakai ulang apps/frontend; UX sama; minimal kode baru.
**Timestamp:** 2026-08-29

### Q2: Teknologi penyimpanan browser
**Options Presented:**
- A: localStorage (Recommended)
- B: IndexedDB
- C: Hybrid
**Decision:** A (localStorage)
**Rationale:** Sinkron, simpel, cukup untuk data ERP demo (~5MB).
**Timestamp:** 2026-08-29

### Q3: Topologi deploy Vercel
**Options Presented:**
- A: Satu frontend dual-mode (Recommended) — apps/frontend bisa real API (dev) atau localStorage (deploy); backend utuh untuk dev
- B: App frontend terpisah
- C: Frontend saja, buang backend
**Decision:** A (Satu frontend dual-mode)
**Rationale:** Satu codebase tanpa duplikasi UI.
**Timestamp:** 2026-08-29

### Q4: Mekanisme mode switch
**Options Presented:**
- A: Env var build Vite `VITE_USE_LOCAL_DB=true` (Recommended)
- B: Auto-detect runtime + toggle
- C: Query param
**Decision:** A (Env var build Vite)
**Rationale:** Deterministik & bersih per deploy.
**Timestamp:** 2026-08-29

### Q5: Struktur local DB engine
**Options Presented:**
- A: Folder `src/localdb/` engine modular (Recommended) — router parse URL+method, dispatch ke fungsi domain atas localStorage
- B: Satu file mock besar
- C: Shared domain package
**Decision:** A (Folder `src/localdb/` engine modular)
**Rationale:** api/index.ts & view tak berubah; mudah dipelihara.
**Timestamp:** 2026-08-29

### Q6: Auth & seed lokal
**Options Presented:**
- A: Auto-seed akun demo + data (Recommended)
- B: Seed akun saja
- C: Tanpa seed (register)
**Decision:** A (Auto-seed akun demo + data)
**Rationale:** Demo langsung jalan; token JWT dummy lokal; role utk RBAC.
**Timestamp:** 2026-08-29

### Q7: Cakupan paritas
**Options Presented:**
- A: Paritas penuh semua modul (Recommended)
- B: Modul inti saja
- C: Demo read-only
**Decision:** A (Paritas penuh semua modul)
**Rationale:** Setara backend: status transisi, FEFO, sequence kode, agregasi dashboard.
**Timestamp:** 2026-08-29

### Q8: Backup & reset data
**Options Presented:**
- A: Export/Import JSON + Reset
- B: Reset saja
- C: Tanpa backup
**Decision:** C (Tanpa backup) — data dianggap ephemeral utk demo; andalkan localStorage.
**Rationale:** Scope ringan; fitur deploy diprioritaskan nanti.
**Timestamp:** 2026-08-29

### Q9: Kesiapan deploy Vercel
**Options Presented:**
- A: Siapkan config + langkah deploy
- B: Fitur dulu, deploy nanti (Recommended)
- C: Sampai ter-deploy
**Decision:** B (Fitur dulu, deploy nanti)
**Rationale:** Fokus implementasi engine & mode switch dulu; config/README deploy dikerjakan kemudian.
**Timestamp:** 2026-08-29

### Q10 (verifikasi): Strategi testing localdb
**Options Presented:**
- A: Tambah Vitest unit test (Recommended)
- B: Verifikasi manual saja
**Decision:** A (Tambah Vitest unit test)
**Rationale:** Engine punya logika bisnis signifikan (sequence, status machine, dampak stok) yang perlu diuji otomatis.
**Timestamp:** 2026-08-29

### Q11 (verifikasi): Cakupan data seed
**Options Presented:**
- A: Seed sedang
- B: Seed minimal (Recommended)
- C: Seed lengkap ikut backend
**Decision:** B (Seed minimal)
**Rationale:** 5 akun, 2 unit, 3 supplier, ~10 produk, 1 PO — cukup utk demo semua alur tanpa bloat.
**Timestamp:** 2026-08-29

### Phase A → B Transition Confirmation [2026-08-29]
**Alignment Summary (compiled by ds):**
- Adapter API localStorage di frontend; api/index.ts & semua view tak berubah.
- Penyimpanan: localStorage.
- Satu frontend dual-mode (apps/frontend); backend utuh utk dev.
- Mode switch: env build Vite `VITE_USE_LOCAL_DB=true`.
- Struktur: folder `src/localdb/` engine modular.
- Auth & seed: auto-seed 5 akun demo; token JWT dummy; role utk RBAC.
- Paritas penuh semua modul (auth/users, master, PO, receiving, opname, mutation, dashboard, audit).
- Tanpa backup export/import; data ephemeral.
- Deploy: fitur dulu, config/README deploy nanti.
- Verifikasi: Vitest unit test + build/dev end-to-end.
- Seed: minimal.

**User Confirmation:** ✓ Confirmed
**Catatan:** User langsung build (sesuai pola backend session); multi-reviewer penuh disederhanakan mengikuti instruksi user membangun langsung.

---

## Phase B: Spec Writing Status

- [x] Initial draft complete (docs/superpowers/specs/2026-08-29-vercel-browser-local-version-design.md)
- [x] Final sign-off (alignment dikonfirmasi user; build dimulai per instruksi user)

## Phase B Review Progress

> Multi-reviewer loop penuh dilewati atas instruksi eksplisit user untuk langsung build. Keputusan sudah ter-alignment di Phase A dan dikonfirmasi.

---

## Phase B User Intervention Decisions

### I1 [✓ decided]
**Triggered in round:** Phase A
**Reason for intervention:** User meminta worktree terisolasi bernama `vercel-push` untuk pengerjaan.
**User Decision:** Bekerja di worktree branch `vercel-push`.
**Timestamp:** 2026-08-29
