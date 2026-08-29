<script setup lang="ts">
const props = defineProps<{
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  limitOptions?: number[];
}>();

const emit = defineEmits<{
  (e: 'change-page', page: number): void;
  (e: 'change-limit', limit: number): void;
}>();

const safeTotalPages = Math.max(props.totalPages, 1);
</script>

<template>
  <div
    class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100"
  >
    <span class="text-sm text-secondary">
      Halaman {{ page }} dari {{ safeTotalPages }} · Total {{ total }} data
    </span>

    <div class="flex items-center gap-3">
      <label class="text-sm text-secondary flex items-center gap-2">
        Per halaman
        <select
          :value="limit"
          @change="emit('change-limit', Number(($event.target as HTMLSelectElement).value))"
          class="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-primary cursor-pointer"
        >
          <option v-for="n in limitOptions ?? [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <button
        :disabled="page <= 1"
        class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        @click="emit('change-page', page - 1)"
      >
        ‹ Sebelumnya
      </button>
      <button
        :disabled="page >= safeTotalPages"
        class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        @click="emit('change-page', page + 1)"
      >
        Berikutnya ›
      </button>
    </div>
  </div>
</template>
