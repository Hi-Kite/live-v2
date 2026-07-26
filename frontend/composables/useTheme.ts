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
    // A pre-hydration head script may already have applied the `dark`
    // class before Vue mounted — treat the DOM as a signal so isDark does
    // not desync from what is on screen.
    const domDark = document.documentElement.classList.contains('dark');
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('theme');
    } catch {
      // ignore
    }
    const dark = saved
      ? saved === 'dark'
      : domDark || window.matchMedia('(prefers-color-scheme: dark)').matches;
    apply(dark);
  }

  function toggle() {
    apply(!isDark.value);
  }

  return { isDark, apply, init, toggle };
}
