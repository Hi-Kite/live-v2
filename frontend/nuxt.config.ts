export default defineNuxtConfig({
  compatibilityDate: '2024-08-01',
  devtools: { enabled: true },
  ssr: true,

  runtimeConfig: {
    // 仅服务端可见：SSR 期间经容器内网直连后端（docker-compose 注入 NUXT_API_INTERNAL）
    apiInternal: process.env.NUXT_API_INTERNAL || '',
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
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'LIVE — 现代化直播平台' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      script: [
        {
          // 首屏前应用暗色主题，避免暗色用户每次导航白闪
          innerHTML:
            "(function(){try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()",
        },
      ],
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
