<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ value: string | undefined; map?: Record<string, string> }>();

const defaultMap: Record<string, string> = {
  DRAFT: 'slate',
  PENDING_APPROVAL: 'amber',
  APPROVED: 'blue',
  SENT: 'blue',
  PARTIAL: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
  REQUESTED: 'amber',
  IN_TRANSIT: 'blue',
  RECEIVED: 'green',
  REJECTED: 'red',
  SCHEDULED: 'slate',
  IN_PROGRESS: 'amber',
  RECONCILED: 'green',
  CLOSED: 'slate',
  low: 'amber',
  out: 'red',
  ok: 'green',
  Tersedia: 'green',
  Rendah: 'amber',
  Habis: 'red',
};

const palette: Record<string, string> = {
  green: 'bg-success/10 text-success',
  amber: 'bg-warning/10 text-warning',
  red: 'bg-danger/10 text-danger',
  blue: 'bg-primary/10 text-primary',
  slate: 'bg-slate-100 text-slate-600',
};

const color = computed(() => palette[props.map?.[props.value ?? ''] ?? defaultMap[props.value ?? ''] ?? 'slate']);
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
    :class="color"
  >
    {{ value }}
  </span>
</template>
