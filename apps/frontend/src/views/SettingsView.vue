<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { authApi, dashboardApi, unitApi } from '@/api';
import { formatDateTime } from '@/utils/format';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import type { AuditLog, Unit, User } from '@/types';

const toast = useToast();
const auth = useAuthStore();
const users = ref<User[]>([]);
const audits = ref<AuditLog[]>([]);
const units = ref<Unit[]>([]);
const showCreate = ref(false);

const form = reactive({ name: '', email: '', password: '', role: 'STAFF_KASIR', unitId: '' });

async function load() {
  try {
    const [u, a] = await Promise.all([authApi.users(), dashboardApi.auditLogs(15)]);
    users.value = u;
    audits.value = a;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal memuat data');
  }
}

async function createUser() {
  if (!form.name || !form.email || !form.password) return toast.error('Lengkapi form');
  try {
    await authApi.createUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      unitId: form.unitId || undefined,
    });
    toast.success('User berhasil dibuat');
    showCreate.value = false;
    form.name = '';
    form.email = '';
    form.password = '';
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Gagal membuat user');
  }
}

onMounted(async () => {
  await load();
  const u = await unitApi.list({ limit: 100 });
  units.value = u.data;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Users -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-bold text-slate-900">Manajemen User</h3>
        <button v-if="auth.isAdmin" class="text-xs font-medium px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1" @click="showCreate = !showCreate">
          <i class="ph ph-plus"></i> {{ showCreate ? 'Tutup' : 'Tambah User' }}
        </button>
      </div>

      <div v-if="showCreate" class="p-6 border-b border-slate-100 bg-slate-50/50">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input v-model="form.name" placeholder="Nama lengkap" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
          <input v-model="form.email" type="email" placeholder="Email" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
          <input v-model="form.password" type="password" placeholder="Password" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
          <select v-model="form.role" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary">
            <option value="STAFF_KASIR">STAFF_KASIR</option>
            <option value="STAFF_GUDANG">STAFF_GUDANG</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select v-model="form.unitId" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary">
            <option value="">Tanpa Unit</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <button class="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium" @click="createUser">Simpan</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Nama</th>
              <th class="px-6 py-4">Email</th>
              <th class="px-6 py-4 text-center">Role</th>
              <th class="px-6 py-4">Unit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 font-medium text-slate-900">{{ u.name }}</td>
              <td class="px-6 py-4 text-secondary">{{ u.email }}</td>
              <td class="px-6 py-4 text-center"><StatusBadge :value="u.role" :map="{ ADMIN: 'red', MANAGER: 'amber', STAFF_GUDANG: 'blue', STAFF_KASIR: 'slate' }" /></td>
              <td class="px-6 py-4 text-secondary">{{ u.unitName ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Audit Logs -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100">
        <h3 class="font-bold text-slate-900">Audit Log</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-100 text-secondary font-medium">
            <tr>
              <th class="px-6 py-4">Waktu</th>
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Aksi</th>
              <th class="px-6 py-4">Entitas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="log in audits" :key="log.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4 text-secondary text-xs">{{ formatDateTime(log.createdAt) }}</td>
              <td class="px-6 py-4 font-medium text-slate-900">{{ log.user?.name }}</td>
              <td class="px-6 py-4"><StatusBadge :value="log.action" /></td>
              <td class="px-6 py-4 text-secondary text-xs">{{ log.entity }} · {{ log.entityId.slice(0, 8) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
