<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-[1720px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
