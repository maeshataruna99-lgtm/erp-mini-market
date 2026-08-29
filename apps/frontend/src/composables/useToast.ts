import { reactive } from 'vue';

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] });
let counter = 0;

function push(type: ToastType, message: string) {
  const id = ++counter;
  state.toasts.push({ id, type, message });
  setTimeout(() => remove(id), 4000);
}

function remove(id: number) {
  const idx = state.toasts.findIndex((t) => t.id === id);
  if (idx !== -1) state.toasts.splice(idx, 1);
}

export function useToast() {
  return {
    toasts: state.toasts,
    info: (message: string) => push('info', message),
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    remove,
  };
}
