<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Pagination from '@/components/ui/Pagination.vue';
import { productApi } from '@/api';
import { formatNumber } from '@/utils/format';
import { usePagedList } from '@/composables/usePagedList';
import type { Product } from '@/types';

const filters = reactive({
  stockStatus: 'all' as 'all' | 'low' | 'ok' | 'out',
  category: 'all',
});

const {
  items: products,
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
  applyFilter,
} = usePagedList<Product>({
  fetcher: (p) =>
    productApi.list({
      ...p,
      stockStatus: filters.stockStatus === 'all' ? undefined : filters.stockStatus,
      category: filters.category === 'all' ? undefined : filters.category,
    }),
});

function totalQty(p: Product): number {
  return p.stockLevels?.reduce((a, s) => a + s.qty, 0) ?? 0;
}

function statusOf(p: Product): 'Tersedia' | 'Rendah' | 'Habis' {
  const qty = totalQty(p);
  if (qty === 0) return 'Habis';
  if (qty < p.minStock) return 'Rendah';
  return 'Tersedia';
}

onMounted(load);
</script>

<template>
  <div class="space-y-4">
    <!-- Search -->
    <div class="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div class="relative flex-1">
        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-secondary"></i>
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama produk atau SKU..."
          class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          @keyup.enter="load"
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="filters.stockStatus"
          class="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-secondary focus:outline-none focus:border-primary cursor-pointer"
          @change="applyFilter"
        >
          <option value="all">Semua Status</option>
          <option value="low">Stok Rendah</option>
          <option value="ok">Tersedia</option>
          <option value="out">Habis</option>
        </select>
        <button
          class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          @click="load"
        >
          <i class="ph ph-magnifying-glass"></i>
          Cari
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Nama Produk</th>
              <th class="px-6 py-4">SKU</th>
              <th class="px-6 py-4 text-center">Jumlah</th>
              <th class="px-6 py-4 text-center">Min</th>
              <th class="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading" class="hover:bg-slate-50/50 transition-colors">
              <td colspan="5" class="px-6 py-8 text-center text-secondary">Memuat data...</td>
            </tr>
            <tr v-for="p in products" :key="p.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-medium text-slate-900">{{ p.name }}</td>
              <td class="px-6 py-4 text-secondary font-mono text-xs">{{ p.sku }}</td>
              <td class="px-6 py-4 text-center font-bold" :class="{ 'text-danger': totalQty(p) === 0, 'text-warning': totalQty(p) > 0 && totalQty(p) < p.minStock }">
                {{ formatNumber(totalQty(p)) }}
              </td>
              <td class="px-6 py-4 text-center text-secondary text-xs">{{ p.minStock }}</td>
              <td class="px-6 py-4 text-center">
                <StatusBadge :value="statusOf(p)" />
              </td>
            </tr>
            <tr v-if="!loading && products.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-secondary">Tidak ada produk ditemukan.</td>
            </tr>
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
