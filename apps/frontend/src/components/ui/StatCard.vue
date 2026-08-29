<script setup lang="ts">
defineProps<{
  title: string;
  value: string | number;
  icon: string;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  badgeClass?: string;
}>();
</script>

<template>
  <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start mb-4">
      <div class="p-2 rounded-xl" :class="iconBg ?? 'bg-blue-50'">
        <i class="ph text-xl" :class="[icon, iconColor ?? 'text-primary']"></i>
      </div>
      <span v-if="badge" class="text-xs font-semibold px-2 py-1 rounded-full" :class="badgeClass ?? 'bg-success/10 text-success'">
        {{ badge }}
      </span>
    </div>
    <h3 class="text-2xl font-bold text-slate-900">{{ value }}</h3>
    <p class="text-sm text-secondary mt-1">{{ title }}</p>
  </div>
</template>
