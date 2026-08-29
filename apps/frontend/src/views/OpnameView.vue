<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Pagination from '@/components/ui/Pagination.vue';
import { opnameApi, unitApi } from '@/api';
import { formatDate } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import { usePagedList } from '@/composables/usePagedList';
import type { OpnameSession, Unit } from '@/types';

const toast = useToast();
const units = ref<Unit[]>([]);
const showCreate = ref(false);
const detail = ref<OpnameSession | null>(null);
const showDetail = ref(false);
const blindMap = reactive<Record<string, number>>({});
const processing = ref(false);

const form = reactive({ unitId: '', scope: 'ALL' });

const {
  items: list,
  loading,
  page,
  total,
  totalPages,
  limit,
  search,
  load,
  next,
  prev,
  changeLimit,
} = usePagedList<OpnameSession>({
  fetcher: (p) => opnameApi.list(p),
});

async function createSession() {
  if (!form.unitId) return toast.error('Pilih unit terlebih dahulu');
  try {
    await opnameApi.create({ unitId: form.unitId, scope: form.scope });
    toast.success('Sesi opname dibuat');
    showCreate.value = false;
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat sesi');
  }
}

async function openDetail(session: OpnameSession) {
  detail.value = await opnameApi.detail(session.id);
  detail.value.items?.forEach((it) => (blindMap[it.id] = it.qtyPhysical));
  showDetail.value = true;
}

async function startSession() {
  if (!detail.value) return;
  processing.value = true;
  try {
    await opnameApi.start(detail.value.id);
    toast.success('Sesi dimulai');
    detail.value = await opnameApi.detail(detail.value.id);
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal memulai');
  } finally {
    processing.value = false;
  }
}

async function submitBlindCount() {
  if (!detail.value) return;
  const items = (detail.value.items ?? [])
    .filter((it) => blindMap[it.id] !== undefined)
    .map((it) => ({ productId: it.productId, qtyPhysical: blindMap[it.id] ?? 0 }));
  if (items.length === 0) return toast.error('Isi minimal 1 item');
  try {
    await opnameApi.blindCount(detail.value.id, { items });
    toast.success('Blind count disimpan');
    detail.value = await opnameApi.detail(detail.value.id);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal simpan');
  }
}

async function reconcile() {
  if (!detail.value) return;
  processing.value = true;
  try {
    await opnameApi.reconcile(detail.value.id);
    toast.success('Reconcile selesai, stok disesuaikan');
    detail.value = await opnameApi.detail(detail.value.id);
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal reconcile');
  } finally {
    processing.value = false;
  }
}

async function closeSession() {
  if (!detail.value) return;
  try {
    await opnameApi.close(detail.value.id);
    toast.success('Sesi ditutup');
    detail.value = await opnameApi.detail(detail.value.id);
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal menutup');
  }
}

onMounted(async () => {
  await load();
  const u = await unitApi.list({ limit: 100 });
  units.value = u.data;
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <button class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0" @click="showCreate = !showCreate">
        <i class="ph ph-plus"></i>
        {{ showCreate ? 'Tutup' : 'Buat Sesi Opname' }}
      </button>
      <input
        v-model="search"
        type="text"
        placeholder="Cari scope sesi opname..."
        class="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
        @keyup.enter="load"
      />
    </div>

    <div v-if="showCreate" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Unit</label>
          <select v-model="form.unitId" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Pilih Unit...</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Scope</label>
          <input v-model="form.scope" type="text" placeholder="ALL atau kategori" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors" @click="createSession">Buat Sesi</button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Unit</th>
              <th class="px-6 py-4">Tanggal</th>
              <th class="px-6 py-4 text-center">Item</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading"><td colspan="5" class="px-6 py-8 text-center text-secondary">Memuat...</td></tr>
            <tr v-for="s in list" :key="s.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-medium text-slate-900">{{ units.find((u) => u.id === s.unitId)?.name ?? s.unitId }}</td>
              <td class="px-6 py-4 text-secondary">{{ formatDate(s.scheduledAt) }}</td>
              <td class="px-6 py-4 text-center text-secondary">{{ s._count?.items ?? '-' }}</td>
              <td class="px-6 py-4 text-center"><StatusBadge :value="s.status" /></td>
              <td class="px-6 py-4 text-right">
                <button class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" @click="openDetail(s)">Buka</button>
              </td>
            </tr>
            <tr v-if="!loading && list.length === 0"><td colspan="5" class="px-6 py-8 text-center text-secondary">Belum ada sesi opname.</td></tr>
          </tbody>
        </table>
      </div>
      <Pagination
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="limit"
        @change-page="(p) => (p > page ? next() : prev())"
        @change-limit="changeLimit"
      />
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetail && detail" class="fixed inset-0 bg-slate-900/40 z-40 flex items-center justify-center p-4" @click.self="showDetail = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-slate-900">Sesi Opname</h3>
            <StatusBadge :value="detail.status" />
          </div>
          <button class="text-secondary hover:text-slate-900" @click="showDetail = false"><i class="ph ph-x text-xl"></i></button>
        </div>

        <div class="px-6 py-4 flex gap-2 flex-wrap">
          <button v-if="detail.status === 'SCHEDULED'" class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium" @click="startSession">Mulai Sesi</button>
          <button v-if="detail.status === 'IN_PROGRESS'" class="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium" @click="submitBlindCount">Simpan Blind Count</button>
          <button v-if="detail.status === 'IN_PROGRESS'" class="px-4 py-2 rounded-xl bg-success text-white text-sm font-medium" @click="reconcile">Reconcile Stok</button>
          <button v-if="detail.status === 'RECONCILED'" class="px-4 py-2 rounded-xl bg-slate-700 text-white text-sm font-medium" @click="closeSession">Tutup Sesi</button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 pb-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-secondary text-xs">
                <tr>
                  <th class="px-3 py-2">Produk</th>
                  <th class="px-3 py-2 text-center">Sistem</th>
                  <th class="px-3 py-2 text-center">Fisik</th>
                  <th class="px-3 py-2 text-center">Selisih</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="it in detail.items ?? []" :key="it.id">
                  <td class="px-3 py-2 font-medium text-slate-900">{{ it.product?.name }}</td>
                  <td class="px-3 py-2 text-center text-secondary">{{ it.qtySystem }}</td>
                  <td class="px-3 py-2 text-center">
                    <template v-if="detail.status === 'IN_PROGRESS'">
                      <input v-model.number="blindMap[it.id]" type="number" min="0" class="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:border-primary focus:outline-none" />
                    </template>
                    <template v-else>{{ it.qtyPhysical }}</template>
                  </td>
                  <td class="px-3 py-2 text-center" :class="it.variance !== 0 ? 'text-danger font-semibold' : 'text-secondary'">
                    {{ detail.status === 'RECONCILED' || detail.status === 'CLOSED' ? it.variance : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
