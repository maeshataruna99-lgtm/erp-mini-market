import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Login' },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
      { path: 'stock', name: 'stock', component: () => import('@/views/StockView.vue'), meta: { title: 'Stok Barang' } },
      { path: 'po', name: 'po', component: () => import('@/views/PoView.vue'), meta: { title: 'Pembelian (PO)' } },
      { path: 'receiving', name: 'receiving', component: () => import('@/views/ReceivingView.vue'), meta: { title: 'Penerimaan Barang' } },
      { path: 'opname', name: 'opname', component: () => import('@/views/OpnameView.vue'), meta: { title: 'Stock Opname' } },
      { path: 'mutation', name: 'mutation', component: () => import('@/views/MutationView.vue'), meta: { title: 'Mutasi Barang' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: 'Pengaturan' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  document.title = `${String(to.meta.title ?? 'MiniERP')} - MiniERP`;
  return true;
});

export default router;
