<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'ph-squares-four', short: 'Dashboard' },
  { path: '/stock', label: 'Stok Barang', icon: 'ph-package', short: 'Stok' },
  { path: '/po', label: 'Pembelian', icon: 'ph-shopping-cart', short: 'Beli' },
  { path: '/receiving', label: 'Penerimaan', icon: 'ph-tray-arrow-down', short: 'Terima' },
  { path: '/opname', label: 'Stock Opname', icon: 'ph-clipboard-text', short: 'Opname' },
  { path: '/mutation', label: 'Mutasi', icon: 'ph-arrows-left-right', short: 'Mutasi' },
  { path: '/settings', label: 'Pengaturan', icon: 'ph-gear', short: 'Setting' },
];

const title = computed(() => String(route.meta.title ?? 'Dashboard'));

const initials = computed(() => {
  const name = auth.user?.name ?? 'AD';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

function isActive(path: string) {
  return route.path === path;
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="bg-background text-slate-800 h-screen overflow-hidden flex flex-col md:flex-row">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-64 bg-white border-r border-slate-200 flex-shrink-0 flex-col h-full z-20 shadow-sm">
      <div class="p-6 flex items-center gap-3 border-b border-slate-100">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
        <span class="font-bold text-xl tracking-tight text-slate-900">MiniERP</span>
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          :class="isActive(item.path) ? 'bg-primary/10 text-primary' : 'text-secondary hover:bg-slate-50 hover:text-slate-900'"
        >
          <i class="ph text-xl" :class="item.icon"></i>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-slate-100">
        <div class="bg-slate-50 rounded-xl p-4">
          <p class="text-xs text-secondary mb-2">Status Sistem</p>
          <div class="flex items-center gap-2 text-success text-sm font-semibold">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            Online
          </div>
        </div>
        <button
          class="mt-3 w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          @click="logout"
        >
          <i class="ph ph-sign-out text-lg"></i>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col h-full relative overflow-hidden">
      <!-- Header -->
      <header class="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
        <div class="flex items-center gap-4">
          <h1 id="page-title" class="text-lg font-bold text-slate-900">{{ title }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <button
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-secondary hover:border-primary hover:text-primary transition-colors"
            @click="toast.info('Bahasa dipilih')"
          >
            <i class="ph ph-translate text-lg"></i>
            <span>Bahasa</span>
          </button>

          <button class="relative p-2 text-secondary hover:text-slate-900 transition-colors">
            <i class="ph ph-bell text-xl"></i>
            <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-white"></span>
          </button>

          <div
            class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer"
            :title="auth.user?.name"
          >
            {{ initials }}
          </div>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
        <div class="max-w-6xl mx-auto">
          <RouterView v-slot="{ Component }">
            <Transition name="view-fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div class="flex justify-around items-center h-16">
          <RouterLink
            v-for="item in navItems.filter((_, i) => [0, 1, 2, 6].includes(i))"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center justify-center w-full h-full gap-1 relative"
            :class="isActive(item.path) ? 'text-primary' : 'text-secondary'"
          >
            <i class="ph text-2xl" :class="item.icon"></i>
            <span class="text-[10px] font-medium">{{ item.short }}</span>
            <span v-if="isActive(item.path)" class="absolute top-2 w-1 h-1 bg-primary rounded-full"></span>
          </RouterLink>
        </div>
      </nav>

      <!-- Mobile FAB -->
      <button
        class="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-20 active:scale-90 transition-transform"
        @click="router.push('/po')"
      >
        <i class="ph ph-plus text-2xl"></i>
      </button>
    </main>
  </div>
</template>
