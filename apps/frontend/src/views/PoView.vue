<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { poApi, productApi, supplierApi } from '@/api';
import { formatRupiah } from '@/utils/format';
import { useToast } from '@/composables/useToast';
import type { Product, PurchaseOrder, Supplier } from '@/types';

const toast = useToast();
const list = ref<PurchaseOrder[]>([]);
const loading = ref(false);
const statusFilter = ref('all');
const showCreate = ref(false);

const suppliers = ref<Supplier[]>([]);
const products = ref<Product[]>([]);

const form = reactive({
  supplierId: '',
  notes: '',
  items: [] as { productId: string; qtyOrder: number; price: number }[],
});

const creating = ref(false);

const itemTotal = computed(() =>
  form.items.reduce((a, it) => a + (it.price || 0) * (it.qtyOrder || 0), 0),
);

async function load() {
  loading.value = true;
  try {
    const res = await poApi.list({
      status: statusFilter.value === 'all' ? undefined : (statusFilter.value as never),
      limit: 50,
    });
    list.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  showCreate.value = !showCreate.value;
  if (showCreate.value) {
    const [s, p] = await Promise.all([
      supplierApi.list({ limit: 100 }),
      productApi.list({ limit: 100 }),
    ]);
    suppliers.value = s.data;
    products.value = p.data;
    addItem();
  }
}

function addItem() {
  form.items.push({ productId: '', qtyOrder: 1, price: 0 });
}

function removeItem(i: number) {
  form.items.splice(i, 1);
}

function onProductChange(item: { productId: string; price: number }) {
  const product = products.value.find((p) => p.id === item.productId);
  if (product && item.price === 0) item.price = product.costPrice;
}

async function submitForm() {
  if (!form.supplierId) return toast.error('Pilih supplier terlebih dahulu');
  if (form.items.some((it) => !it.productId || it.qtyOrder < 1)) {
    return toast.error('Isi semua item dengan benar');
  }
  creating.value = true;
  try {
    await poApi.create({
      supplierId: form.supplierId,
      notes: form.notes || undefined,
      items: form.items.map((it) => ({ productId: it.productId, qtyOrder: it.qtyOrder, price: it.price })),
    });
    toast.success('PO berhasil dibuat');
    showCreate.value = false;
    form.items = [];
    form.supplierId = '';
    form.notes = '';
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat PO');
  } finally {
    creating.value = false;
  }
}

async function runAction(action: 'submit' | 'approve' | 'send' | 'cancel' | 'remove', po: PurchaseOrder) {
  try {
    await poApi[action](po.id);
    toast.success('Aksi berhasil');
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Aksi gagal');
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <button
        class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        @click="openCreate"
      >
        <i class="ph ph-plus"></i>
        {{ showCreate ? 'Tutup Form' : 'Buat PO Baru' }}
      </button>
      <select
        v-model="statusFilter"
        class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-secondary focus:outline-none focus:border-primary cursor-pointer"
        @change="load"
      >
        <option value="all">Semua Status</option>
        <option value="DRAFT">DRAFT</option>
        <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
        <option value="APPROVED">APPROVED</option>
        <option value="SENT">SENT</option>
        <option value="PARTIAL">PARTIAL</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
    </div>

    <!-- Create Form -->
    <div v-if="showCreate" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 class="font-bold text-slate-900 mb-4">Pesanan Pembelian Baru</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Supplier</label>
          <select
            v-model="form.supplierId"
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Pilih Supplier...</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Catatan</label>
          <input
            v-model="form.notes"
            type="text"
            placeholder="Catatan pesanan"
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div class="mt-4 border border-slate-200 rounded-xl overflow-hidden">
        <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span class="text-sm font-semibold text-slate-700">Item Pesanan</span>
          <button type="button" class="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1" @click="addItem">
            <i class="ph ph-plus"></i> Tambah Item
          </button>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="(item, i) in form.items" :key="i" class="p-4 grid grid-cols-12 gap-3 items-center">
            <div class="col-span-12 md:col-span-5">
              <select
                v-model="item.productId"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:outline-none"
                @change="onProductChange(item)"
              >
                <option value="">Pilih Produk...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
              </select>
            </div>
            <div class="col-span-4 md:col-span-2">
              <input v-model.number="item.qtyOrder" type="number" min="1" placeholder="Qty"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:outline-none text-center" />
            </div>
            <div class="col-span-4 md:col-span-3">
              <input v-model.number="item.price" type="number" min="0" placeholder="Harga"
                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-primary focus:outline-none text-right" />
            </div>
            <div class="col-span-4 md:col-span-2 flex justify-end">
              <button type="button" class="text-danger/60 hover:text-danger p-2 rounded-lg hover:bg-danger/5 transition-colors" @click="removeItem(i)">
                <i class="ph ph-trash text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-100 mt-4 items-end justify-between">
        <p class="text-sm text-secondary">Total: <span class="font-bold text-slate-900">{{ formatRupiah(itemTotal) }}</span></p>
        <div class="flex gap-3">
          <button class="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-secondary hover:bg-slate-50 transition-colors" @click="showCreate = false">
            Batal
          </button>
          <button
            class="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
            :disabled="creating"
            @click="submitForm"
          >
            {{ creating ? 'Menyimpan...' : 'Simpan Pesanan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Nomor PO</th>
              <th class="px-6 py-4">Supplier</th>
              <th class="px-6 py-4 text-center">Item</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading"><td colspan="5" class="px-6 py-8 text-center text-secondary">Memuat...</td></tr>
            <tr v-for="po in list" :key="po.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-mono text-xs font-medium text-slate-900">{{ po.poNumber }}</td>
              <td class="px-6 py-4 text-slate-900">{{ po.supplier?.name }}</td>
              <td class="px-6 py-4 text-center text-secondary">{{ po._count?.items ?? '-' }}</td>
              <td class="px-6 py-4 text-center"><StatusBadge :value="po.status" /></td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 flex-wrap">
                  <button v-if="po.status === 'DRAFT'" class="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" @click="runAction('submit', po)">Submit</button>
                  <button v-if="po.status === 'PENDING_APPROVAL'" class="text-xs px-2 py-1 rounded-lg bg-success/10 text-success hover:bg-success/20" @click="runAction('approve', po)">Approve</button>
                  <button v-if="po.status === 'APPROVED'" class="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" @click="runAction('send', po)">Kirim</button>
                  <button v-if="po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL'" class="text-xs px-2 py-1 rounded-lg bg-danger/10 text-danger hover:bg-danger/20" @click="runAction('cancel', po)">Batal</button>
                  <button v-if="po.status === 'DRAFT'" class="text-secondary hover:text-danger p-1 rounded-lg" @click="runAction('remove', po)">
                    <i class="ph ph-trash text-lg"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && list.length === 0"><td colspan="5" class="px-6 py-8 text-center text-secondary">Belum ada PO.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
