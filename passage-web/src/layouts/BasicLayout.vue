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
    background-image: repeating-linear-gradient(
      90deg,
      rgba(17, 48, 86, 0.04) 0,
      rgba(17, 48, 86, 0.04) 1px,
      transparent 1px,
      transparent 18px
    );
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

  .main-content > :deep(*) {
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
