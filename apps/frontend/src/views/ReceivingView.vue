<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { poApi, receivingApi, unitApi } from '@/api';
import { formatDate } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import type { GoodsReceiving, PurchaseOrder, ReceivingItem, Unit } from '@/types';

const toast = useToast();
const list = ref<GoodsReceiving[]>([]);
const units = ref<Unit[]>([]);
const sentPos = ref<PurchaseOrder[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const showConfirm = ref(false);

const createForm = reactive({ poId: '', unitId: '' });
const confirming = ref(false);
const currentReceiving = ref<GoodsReceiving | null>(null);
const qtyMap = reactive<Record<string, number>>({});
const confirmingItems = ref<ReceivingItem[]>([]);

async function load() {
  loading.value = true;
  try {
    const res = await receivingApi.list({ limit: 50 });
    list.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  showCreate.value = !showCreate.value;
  if (showCreate.value) {
    const [u, poRes] = await Promise.all([unitApi.list({ limit: 100 }), poApi.list({ status: 'SENT', limit: 100 })]);
    units.value = u.data;
    sentPos.value = poRes.data;
  }
}

async function createReceiving() {
  if (!createForm.poId || !createForm.unitId) return toast.error('Pilih PO dan unit penerima');
  try {
    const rcv = await receivingApi.create({ poId: createForm.poId, unitId: createForm.unitId });
    toast.success('Sesi penerimaan dibuat');
    showCreate.value = false;
    await load();
    openConfirm(rcv);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat penerimaan');
  }
}

async function openConfirm(rcv: GoodsReceiving) {
  const detail = await receivingApi.detail(rcv.id);
  currentReceiving.value = detail;
  confirmingItems.value = detail.items ?? [];
  confirmingItems.value.forEach((it) => (qtyMap[it.id] = it.qtyReceived));
  showConfirm.value = true;
}

async function confirmReceiving() {
  if (!currentReceiving.value) return;
  confirming.value = true;
  try {
    await receivingApi.confirm(
      currentReceiving.value.id,
      { items: confirmingItems.value.map((it) => ({ id: it.id, qtyReceived: qtyMap[it.id] ?? 0 })) },
    );
    toast.success('Penerimaan dikonfirmasi, stok diperbarui');
    showConfirm.value = false;
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal konfirmasi');
  } finally {
    confirming.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <button
      class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
      @click="openCreate"
    >
      <i class="ph ph-plus"></i>
      {{ showCreate ? 'Tutup' : 'Buat Penerimaan' }}
    </button>

    <div v-if="showCreate" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">PO (berstatus SENT)</label>
          <select v-model="createForm.poId" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Pilih PO...</option>
            <option v-for="p in sentPos" :key="p.id" :value="p.id">{{ p.poNumber }} — {{ p.supplier?.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Unit Penerima</label>
          <select v-model="createForm.unitId" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Pilih Unit...</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors" @click="createReceiving">
          Buat Sesi
        </button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">PO</th>
              <th class="px-6 py-4">Supplier</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-center">Selisih</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="r in list" :key="r.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-mono text-xs font-medium text-slate-900">{{ r.po?.poNumber }}</td>
              <td class="px-6 py-4 text-slate-900">{{ r.po?.supplier?.name }}</td>
              <td class="px-6 py-4 text-center"><StatusBadge :value="r.status" /></td>
              <td class="px-6 py-4 text-center">
                <span v-if="r.hasDiscrepancy" class="text-xs font-semibold text-danger">Ada selisih</span>
                <span v-else class="text-xs text-secondary">Aman</span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="r.status !== 'COMPLETED'"
                  class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                  @click="openConfirm(r)"
                >
                  Konfirmasi
                </button>
              </td>
            </tr>
            <tr v-if="list.length === 0"><td colspan="5" class="px-6 py-8 text-center text-secondary">Belum ada penerimaan.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Confirm Modal -->
    <div v-if="showConfirm && currentReceiving" class="fixed inset-0 bg-slate-900/40 z-40 flex items-center justify-center p-4" @click.self="showConfirm = false">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900">Konfirmasi Penerimaan</h3>
            <p class="text-xs text-secondary">{{ currentReceiving.po?.poNumber }} · {{ formatDate(currentReceiving.createdAt) }}</p>
          </div>
          <button class="text-secondary hover:text-slate-900" @click="showConfirm = false"><i class="ph ph-x text-xl"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-secondary text-xs">
                <tr>
                  <th class="px-3 py-2">Produk</th>
                  <th class="px-3 py-2 text-center">Order</th>
                  <th class="px-3 py-2 text-center">Diterima</th>
                  <th class="px-3 py-2 text-center">Selisih %</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="it in confirmingItems" :key="it.id">
                  <td class="px-3 py-2 font-medium text-slate-900">{{ it.product?.name }}</td>
                  <td class="px-3 py-2 text-center text-secondary">{{ it.qtyOrdered }}</td>
                  <td class="px-3 py-2 text-center">
                    <input v-model.number="qtyMap[it.id]" type="number" min="0" class="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:border-primary focus:outline-none" />
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span :class="it.qtyOrdered > 0 && (it.qtyOrdered - (qtyMap[it.id] ?? 0)) / it.qtyOrdered * 100 > 5 ? 'text-danger font-semibold' : 'text-secondary'">
                      {{ it.qtyOrdered > 0 ? (((it.qtyOrdered - (qtyMap[it.id] ?? 0)) / it.qtyOrdered) * 100).toFixed(0) : 0 }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button class="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-secondary hover:bg-slate-50" @click="showConfirm = false">Batal</button>
          <button
            class="px-6 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-60"
            :disabled="confirming"
            @click="confirmReceiving"
          >
            {{ confirming ? 'Memproses...' : 'Konfirmasi & Update Stok' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
