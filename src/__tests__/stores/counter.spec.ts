import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCounterStore } from '../../stores/counter';

describe('useCounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with count = 0', () => {
    const store = useCounterStore();
    expect(store.count).toBe(0);
  });

  it('has doubleCount = 0 initially', () => {
    const store = useCounterStore();
    expect(store.doubleCount).toBe(0);
  });

  it('increments count', () => {
    const store = useCounterStore();
    store.increment();
    expect(store.count).toBe(1);
  });

  it('doubleCount reflects twice the count', () => {
    const store = useCounterStore();
    store.increment();
    store.increment();
    store.increment();
    expect(store.count).toBe(3);
    expect(store.doubleCount).toBe(6);
  });
});
