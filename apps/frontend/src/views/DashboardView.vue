<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { dashboardApi } from '@/api';
import { formatDate, formatNumber } from '@/utils/format';
import type { AuditLog, DashboardSummary, Product, ProductBatch } from '@/types';

const router = useRouter();
const summary = ref<DashboardSummary | null>(null);
const trend = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
const lowStock = ref<Product[]>([]);
const expiring = ref<ProductBatch[]>([]);
const audits = ref<AuditLog[]>([]);

const maxTrend = ref(1);

onMounted(async () => {
  const [s, t, low, exp, logs] = await Promise.all([
    dashboardApi.summary(),
    dashboardApi.trend(7),
    dashboardApi.lowStock({ limit: 5 }),
    dashboardApi.expiry({ limit: 5 }),
    dashboardApi.auditLogs(8),
  ]);
  summary.value = s;
  trend.value = t;
  lowStock.value = low;
  expiring.value = exp;
  audits.value = logs;
  maxTrend.value = Math.max(1, ...t.values);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Nilai Inventaris"
        :value="formatNumber(summary?.inventoryQty) + ' pcs'"
        icon="ph-package"
        iconBg="bg-blue-50"
        iconColor="text-primary"
      />
      <StatCard
        title="Peringatan Stok"
        :value="summary?.lowStock ?? 0"
        icon="ph-warning"
        iconBg="bg-orange-50"
        iconColor="text-warning"
        badge="Butuh PO"
        badgeClass="bg-warning/10 text-warning"
      />
      <StatCard
        title="PO Tertunda"
        :value="summary?.pendingPo ?? 0"
        icon="ph-shopping-cart"
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
        badge="Approval"
        badgeClass="bg-primary/10 text-primary"
      />
      <StatCard
        title="Penerimaan Hari Ini"
        :value="summary?.receivingsToday ?? 0"
        icon="ph-truck"
        iconBg="bg-green-50"
        iconColor="text-success"
        badge="On Time"
      />
    </div>

    <!-- Chart & Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-slate-900">Aktivitas Stok Mingguan</h3>
          <span class="text-sm text-secondary">7 Hari</span>
        </div>
        <div class="h-48 flex items-end justify-between gap-2 px-2">
          <div
            v-for="(v, i) in trend.values"
            :key="i"
            class="w-full bg-primary/10 rounded-t-lg relative group"
            :style="{ height: `${Math.max(8, (v / maxTrend) * 100)}%` }"
          >
            <div
              class="absolute bottom-0 w-full bg-primary rounded-t-lg h-full transition-all group-hover:bg-primary/80"
              :style="{ height: `${Math.max(8, (v / maxTrend) * 100)}%` }"
              :title="`${v} aktivitas`"
            ></div>
          </div>
        </div>
        <div class="flex justify-between mt-4 text-xs text-secondary">
          <span v-for="(l, i) in trend.labels" :key="i">{{ l }}</span>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
        <h3 class="font-bold text-slate-900 mb-2">Aksi Cepat</h3>
        <button
          class="flex items-center gap-3 p-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
          @click="router.push('/po')"
        >
          <i class="ph ph-plus-circle text-lg"></i> Buat PO Baru
        </button>
        <button
          class="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
          @click="router.push('/stock')"
        >
          <i class="ph ph-package text-lg"></i> Lihat Stok
        </button>
        <button
          class="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
          @click="router.push('/mutation')"
        >
          <i class="ph ph-arrows-left-right text-lg"></i> Mutasi Barang
        </button>
      </div>
    </div>

    <!-- Warnings -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-bold text-slate-900 mb-4">Stok Rendah</h3>
        <div v-if="lowStock.length === 0" class="text-sm text-secondary">Tidak ada stok rendah.</div>
        <ul class="divide-y divide-slate-50">
          <li v-for="p in lowStock" :key="p.id" class="py-2 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-900">{{ p.name }}</p>
              <p class="text-xs text-secondary font-mono">{{ p.sku }}</p>
            </div>
            <StatusBadge :value="p.stockLevels?.reduce((a, s) => a + s.qty, 0) === 0 ? 'Habis' : 'Rendah'" />
          </li>
        </ul>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 class="font-bold text-slate-900 mb-4">Kadaluarsa Mendekat</h3>
        <div v-if="expiring.length === 0" class="text-sm text-secondary">Tidak ada batch mendekati kadaluarsa.</div>
        <ul class="divide-y divide-slate-50">
          <li v-for="b in expiring" :key="b.id" class="py-2 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-900">{{ b.product?.name }}</p>
              <p class="text-xs text-secondary">{{ b.batchNo ?? 'Tanpa batch' }}</p>
            </div>
            <span class="text-xs font-semibold text-warning">{{ formatDate(b.expiryDate) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Audit Logs -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100">
        <h3 class="font-bold text-slate-900">Aktivitas Terakhir</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <tbody class="divide-y divide-slate-50">
            <tr v-for="log in audits" :key="log.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-3 font-medium text-slate-900">{{ log.user?.name }}</td>
              <td class="px-6 py-3">
                <StatusBadge :value="log.action" :map="{ PO_APPROVED: 'blue', STOCK_ADJUSTMENT: 'amber', MUTATION_APPROVED: 'green', DISCREPANCY_ALERT: 'red', OPNAME_RECONCILED: 'green' }" />
              </td>
              <td class="px-6 py-3 text-secondary text-xs">{{ log.entity }} · {{ log.entityId.slice(0, 8) }}</td>
              <td class="px-6 py-3 text-secondary text-right text-xs">{{ formatDate(log.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
