<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/composables/useAuth';
import { useTheme } from '~/composables/useTheme';

const theme = useTheme();
const auth = useAuthStore();

onMounted(() => {
  theme.init();
  auth.init().catch(() => {});
});
</script>
