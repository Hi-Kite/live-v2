/**
 * 浮层（Modal/Toast）的 Teleport 目标：默认 body，但页面处于元素全屏时
 * 必须挂到 fullscreenElement 内——否则浮层渲染在全屏顶层之外完全不可见。
 */
export function useOverlayTarget() {
  const target = ref<HTMLElement | string>('body');

  function update() {
    target.value = (document.fullscreenElement as HTMLElement | null) ?? 'body';
  }

  onMounted(() => {
    update();
    document.addEventListener('fullscreenchange', update);
  });
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', update);
  });

  return target;
}
