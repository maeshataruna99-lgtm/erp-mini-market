<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, remove } = useToast();
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="view-fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px] max-w-sm bg-white text-slate-800"
        :class="{
          'border-primary/20': t.type === 'info',
          'border-success/20': t.type === 'success',
          'border-danger/20': t.type === 'error',
        }"
      >
        <i
          class="ph text-xl"
          :class="{
            'ph-info text-primary': t.type === 'info',
            'ph-check-circle text-success': t.type === 'success',
            'ph-warning-circle text-danger': t.type === 'error',
          }"
        ></i>
        <div class="flex-1">
          <p class="text-sm font-medium">{{ t.message }}</p>
        </div>
        <button class="text-secondary hover:text-slate-900" @click="remove(t.id)">
          <i class="ph ph-x text-sm"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
