<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const form = reactive({ email: '', password: '' });
const loading = ref(false);

async function submit() {
  if (!form.email || !form.password) {
    toast.error('Email dan password wajib diisi');
    return;
  }
  loading.value = true;
  try {
    const data = await authApi.login(form.email, form.password);
    auth.login(data);
    toast.success(`Selamat datang, ${data.user.name}!`);
    router.push(String(route.query.redirect ?? '/'));
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Login gagal');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">M</div>
          <div>
            <h1 class="font-bold text-xl text-slate-900 leading-tight">MiniERP</h1>
            <p class="text-xs text-secondary">Manajemen Minimarket</p>
          </div>
        </div>

        <h2 class="text-lg font-bold text-slate-900 mb-1">Masuk</h2>
        <p class="text-sm text-secondary mb-6">Gunakan akun yang diberikan administrator</p>

        <form @submit.prevent="submit" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Email</label>
            <div class="relative">
              <i class="ph ph-at absolute left-3 top-1/2 -translate-y-1/2 text-secondary"></i>
              <input
                v-model="form.email"
                type="email"
                placeholder="admin@minierp.id"
                autocomplete="email"
                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Password</label>
            <div class="relative">
              <i class="ph ph-lock absolute left-3 top-1/2 -translate-y-1/2 text-secondary"></i>
              <input
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <p class="text-xs text-secondary mt-6 text-center">
          Demo: <span class="font-mono">admin@minierp.id / admin123</span>
        </p>
      </div>
    </div>
  </div>
</template>
