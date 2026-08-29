<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Pagination from '@/components/ui/Pagination.vue';
import { mutationApi, productApi, unitApi } from '@/api';
import { useToast } from '@/composables/useToast';
import { usePagedList } from '@/composables/usePagedList';
import type { Product, StockMutation, Unit } from '@/types';

const toast = useToast();
const units = ref<Unit[]>([]);
const products = ref<Product[]>([]);
const showCreate = ref(false);

const form = reactive({
  fromUnitId: '',
  toUnitId: '',
  items: [] as { productId: string; qty: number }[],
});

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
} = usePagedList<StockMutation>({
  fetcher: (p) => mutationApi.list(p),
});

async function openCreate() {
  showCreate.value = !showCreate.value;
  if (showCreate.value) {
    const [u, p] = await Promise.all([unitApi.list({ limit: 100 }), productApi.list({ limit: 100 })]);
    units.value = u.data;
    products.value = p.data;
    addItem();
  }
}

function addItem() {
  form.items.push({ productId: '', qty: 1 });
}

function removeItem(i: number) {
  form.items.splice(i, 1);
}

async function submitForm() {
  if (!form.fromUnitId || !form.toUnitId) return toast.error('Pilih unit asal dan tujuan');
  if (form.fromUnitId === form.toUnitId) return toast.error('Unit asal dan tujuan tidak boleh sama');
  if (form.items.some((it) => !it.productId || it.qty < 1)) return toast.error('Isi semua item');
  try {
    await mutationApi.create({
      fromUnitId: form.fromUnitId,
      toUnitId: form.toUnitId,
      items: form.items.map((it) => ({ productId: it.productId, qty: it.qty })),
    });
    toast.success('Mutasi dibuat');
    showCreate.value = false;
    form.items = [];
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat mutasi');
  }
}

async function runAction(action: 'approve' | 'reject' | 'pick' | 'receive', m: StockMutation) {
  try {
    await mutationApi[action](m.id);
    toast.success('Aksi berhasil');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Aksi gagal');
  }
}

const unitName = (id: string) => units.value.find((u) => u.id === id)?.name ?? id;

onMounted(async () => {
  await load();
  const u = await unitApi.list({ limit: 100 });
  units.value = u.data;
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <button class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0" @click="openCreate">
        <i class="ph ph-plus"></i>
        {{ showCreate ? 'Tutup' : 'Buat Mutasi' }}
      </button>
      <input
        v-model="search"
        type="text"
        placeholder="Cari nomor mutasi atau unit..."
        class="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
        @keyup.enter="load"
      />
    </div>

    <div v-if="showCreate" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Unit Asal</label>
          <select v-model="form.fromUnitId" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Pilih...</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Unit Tujuan</label>
          <select v-model="form.toUnitId" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Pilih...</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>

      <div class="mt-4 border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span class="text-sm font-semibold text-slate-700">Item Mutasi</span>
          <button class="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1" @click="addItem">
            <i class="ph ph-plus"></i> Tambah Item
          </button>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="(item, i) in form.items" :key="i" class="p-4 grid grid-cols-12 gap-3 items-center">
            <div class="col-span-7 md:col-span-8">
              <select v-model="item.productId" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:outline-none">
                <option value="">Pilih Produk...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
              </select>
            </div>
            <div class="col-span-3">
              <input v-model.number="item.qty" type="number" min="1" placeholder="Qty" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:outline-none text-center" />
            </div>
            <div class="col-span-2 flex justify-end">
              <button class="text-danger/60 hover:text-danger p-2 rounded-lg hover:bg-danger/5 transition-colors" @click="removeItem(i)"><i class="ph ph-trash text-lg"></i></button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button class="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors" @click="submitForm">Buat Mutasi</button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Nomor</th>
              <th class="px-6 py-4">Asal → Tujuan</th>
              <th class="px-6 py-4 text-center">Item</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading"><td colspan="5" class="px-6 py-8 text-center text-secondary">Memuat...</td></tr>
            <tr v-for="m in list" :key="m.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-mono text-xs font-medium text-slate-900">{{ m.mutationNumber }}</td>
              <td class="px-6 py-4 text-slate-900">
                {{ unitName(m.fromUnitId) }} <i class="ph ph-arrow-right text-secondary"></i> {{ unitName(m.toUnitId) }}
              </td>
              <td class="px-6 py-4 text-center text-secondary">{{ m._count?.items ?? '-' }}</td>
              <td class="px-6 py-4 text-center"><StatusBadge :value="m.status" /></td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 flex-wrap">
                  <button v-if="m.status === 'REQUESTED'" class="text-xs px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20" @click="runAction('approve', m)">Approve</button>
                  <button v-if="m.status === 'REQUESTED'" class="text-xs px-2 py-1 rounded-lg bg-danger/10 text-danger hover:bg-danger/20" @click="runAction('reject', m)">Tolak</button>
                  <button v-if="m.status === 'APPROVED'" class="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" @click="runAction('pick', m)">Pick</button>
                  <button v-if="m.status === 'IN_TRANSIT'" class="text-xs px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20" @click="runAction('receive', m)">Terima</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && list.length === 0"><td colspan="5" class="px-6 py-8 text-center text-secondary">Belum ada mutasi.</td></tr>
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
  </div>
</template>
