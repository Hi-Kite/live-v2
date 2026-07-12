export function useTheme() {
  const isDark = useState<boolean>('theme-dark', () => false);

  function apply(dark: boolean) {
    if (import.meta.server) return;
    const cls = document.documentElement.classList;
    if (dark) cls.add('dark');
    else cls.remove('dark');
    isDark.value = dark;
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }

  function init() {
    if (import.meta.server) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('theme');
    } catch {
      // ignore
    }
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    apply(prefersDark);
  }

  function toggle() {
    apply(!isDark.value);
  }

  return { isDark, apply, init, toggle };
}
