export type DanmakuSize = 'sm' | 'md' | 'lg';

export const DANMAKU_SIZES: Record<DanmakuSize, { label: string; rem: string }> = {
  sm: { label: '小', rem: '0.875rem' },
  md: { label: '中', rem: '1.0625rem' },
  lg: { label: '大', rem: '1.375rem' },
};

const STORAGE_KEY = 'danmaku-size';

/** 弹幕字号偏好：全局共享、localStorage 持久化 */
export function useDanmakuSize() {
  const size = useState<DanmakuSize>('danmaku-size', () => 'md');

  if (import.meta.client) {
    const sync = () => {
      const saved = localStorage.getItem(STORAGE_KEY) as DanmakuSize | null;
      if (saved && saved in DANMAKU_SIZES && saved !== size.value) size.value = saved;
    };
    // 组件 setup 期间延迟到挂载后再读 localStorage，避免 SSR 水合不匹配
    if (getCurrentInstance()) onMounted(sync);
    else sync();
  }

  function set(v: DanmakuSize) {
    size.value = v;
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, v);
  }

  const fontSize = computed(() => DANMAKU_SIZES[size.value].rem);

  return { size, set, fontSize };
}
