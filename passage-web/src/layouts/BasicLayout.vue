<template>
  <a-layout class="basic-layout">
    <!-- 顶部导航栏 -->
    <GlobalHeader v-if="!hideGlobalChrome" />

    <!-- 主要内容区域 -->
    <a-layout-content class="main-content" :class="{ 'main-content-full': hideGlobalChrome }">
      <router-view />
    </a-layout-content>

    <!-- 底部版权信息 -->
    <GlobalFooter v-if="!hideGlobalChrome" />
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const route = useRoute()
// 根据路由元信息决定是否隐藏全局头尾（登录/注册页等）
const hideGlobalChrome = computed(() => Boolean(route.meta.hideGlobalChrome))
</script>

<style scoped>
.basic-layout {
  --tone-bg: #edf2f8;
  --tone-paper: #ffffff;
  --tone-ink: #0f2440;
  --tone-muted: #607288;
  --tone-primary: #1d4f91;
  --tone-primary-strong: #153d72;
  --tone-secondary: #0a2748;
  --tone-accent: #c6a96b;
  --tone-border: rgba(22, 46, 78, 0.16);
  /* 页面主题变量，供各页面统一复用 */
  --color-background: #f6f9fe;
  --color-background-secondary: #edf3fb;
  --color-background-tertiary: #e2e9f3;
  --color-text: #0f2440;
  --color-text-secondary: #4b6079;
  --color-text-muted: #657a93;
  --color-border: rgba(22, 46, 78, 0.16);
  --color-primary: #1d4f91;
  --color-primary-dark: #153d72;
  --color-primary-light: #4f78ac;
  --gradient-primary: linear-gradient(135deg, #1d4f91 0%, #153d72 100%);
  --gradient-hero: radial-gradient(circle at 14% -20%, rgba(29, 79, 145, 0.22), rgba(29, 79, 145, 0) 48%), radial-gradient(circle at 92% -12%, rgba(198, 169, 107, 0.22), rgba(198, 169, 107, 0) 40%), linear-gradient(180deg, #f6f9fe 0%, #eaf1fa 100%);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 26px;
  --radius-full: 999px;
  --shadow-lg: 0 14px 34px rgba(10, 31, 57, 0.14);
  --shadow-xl: 0 20px 44px rgba(10, 31, 57, 0.18);
  --shadow-green: 0 12px 24px rgba(21, 61, 114, 0.3);
  --shadow-card-hover: 0 12px 28px rgba(10, 31, 57, 0.14);
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  min-height: 100vh;
  color: var(--tone-ink);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(circle at 12% -16%, rgba(29, 79, 145, 0.24), rgba(29, 79, 145, 0) 44%),
    radial-gradient(circle at 88% 0%, rgba(198, 169, 107, 0.24), rgba(198, 169, 107, 0) 35%),
    linear-gradient(180deg, #f5f8fd 0%, #e8eef6 100%);
  position: relative;
  overflow: hidden;
}

.basic-layout::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(90deg,
      rgba(17, 48, 86, 0.04) 0,
      rgba(17, 48, 86, 0.04) 1px,
      transparent 1px,
      transparent 18px);
  opacity: 0.35;
}

.main-content {
  position: relative;
  z-index: 1;
  width: 100%;
  flex: 1;
  padding: 0;
  background: none;
  margin: 0;
}

.main-content> :deep(*) {
  animation: page-reveal 0.55s ease;
}

.main-content-full {
  min-height: 100vh;
}

@keyframes page-reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
