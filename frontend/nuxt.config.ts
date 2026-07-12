export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  devtools: { enabled: true },
  ssr: true,

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
      wsBase: process.env.NUXT_PUBLIC_WS_BASE || 'ws://localhost:3001',
      appName: process.env.APP_NAME || 'LIVE',
      // —— 备案号（留空则不显示；国内服务器运营需填写自有备案号）——
      icpNumber: process.env.NUXT_PUBLIC_ICP_NUMBER || '',
      icpUrl: process.env.NUXT_PUBLIC_ICP_URL || 'https://beian.miit.gov.cn',
      mpsNumber: process.env.NUXT_PUBLIC_MPS_NUMBER || '',
      mpsUrl: process.env.NUXT_PUBLIC_MPS_URL || 'http://www.beian.gov.cn',
    },
  },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'LIVE — 现代化直播平台' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
