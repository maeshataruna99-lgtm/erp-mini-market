import { onUnmounted, ref, watch } from 'vue';
import type { ApiMeta } from '@/types';

export interface PagedParams {
  page: number;
  limit: number;
  search?: string;
}

interface Options<T> {
  fetcher: (params: PagedParams) => Promise<{ data: T[]; meta: ApiMeta }>;
  initialLimit?: number;
  debounceMs?: number;
}

export function usePagedList<T>({ fetcher, initialLimit = 10, debounceMs = 300 }: Options<T>) {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const page = ref(1);
  const limit = ref(initialLimit);
  const total = ref(0);
  const totalPages = ref(0);
  const search = ref('');

  let timer: ReturnType<typeof setTimeout> | undefined;

  async function load() {
    loading.value = true;
    try {
      const res = await fetcher({
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
      });
      items.value = res.data;
      total.value = res.meta.total ?? 0;
      totalPages.value = res.meta.totalPages ?? 0;
    } finally {
      loading.value = false;
    }
  }

  watch(search, () => {
    page.value = 1;
    if (timer) clearTimeout(timer);
    timer = setTimeout(load, debounceMs);
  });

  function next() {
    if (page.value < totalPages.value) {
      page.value += 1;
      load();
    }
  }

  function prev() {
    if (page.value > 1) {
      page.value -= 1;
      load();
    }
  }

  function changeLimit(v: number) {
    if (v !== limit.value) {
      limit.value = v;
      page.value = 1;
      load();
    }
  }

  function applyFilter() {
    page.value = 1;
    load();
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
  });

  return {
    items,
    loading,
    page,
    limit,
    total,
    totalPages,
    search,
    load,
    next,
    prev,
    changeLimit,
    applyFilter,
  };
}
