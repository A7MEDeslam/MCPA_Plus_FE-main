import { signal, DestroyRef, inject } from '@angular/core';

export function useDynamicPagination(options?: { offset?: number; rowHeight?: number }) {
  const offset = options?.offset ?? 380;
  const rowHeight = options?.rowHeight ?? 48;

  const currentPage = signal(1);
  const pageSize = signal(10);

  const calculatePageSize = () => {
    const availableHeight = window.innerHeight - offset;
    const count = Math.floor(availableHeight / rowHeight);
    pageSize.set(Math.max(5, count));
  };

  // Run initial calculation in client
  if (typeof window !== 'undefined') {
    calculatePageSize();
  }

  // Handle window resize
  const resizeListener = () => calculatePageSize();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeListener);
  }

  // Clean up listener when the component is destroyed
  const destroyRef = inject(DestroyRef);
  destroyRef.onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeListener);
    }
  });

  return {
    currentPage,
    pageSize,
    resetPage: () => currentPage.set(1)
  };
}
