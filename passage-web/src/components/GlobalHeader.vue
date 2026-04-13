<template>
  <header class="global-header">
    <div class="header-shell">
      <router-link to="/" class="brand" aria-label="回到首页">
        <div class="brand-mark">AI</div>
        <div class="brand-text">
          <h1 class="brand-title">AI文章创作器</h1>
          <p class="brand-subtitle">AI-Powered Writing Studio</p>
        </div>
      </router-link>

      <nav class="desktop-nav" aria-label="主导航">
        <a-menu mode="horizontal" :selected-keys="[selectedMenuKey]" :items="menuItems" @click="onMenuClick"
          class="menu" />
      </nav>

      <div class="header-actions">
        <a-dropdown v-if="isLoggedIn" trigger="click">
          <span class="user-info" role="button" aria-label="打开用户菜单">
            <a-avatar class="user-avatar">{{ userName.slice(0, 1) }}</a-avatar>
            <span class="user-name">{{ userName }}</span>
            <span class="user-caret">▼</span>
          </span>
          <template #overlay>
            <a-menu @click="onUserMenuClick">
              <a-menu-item key="logout">退出登录</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <a-button v-else type="primary" class="auth-btn" @click="toggleLogin">登录</a-button>

        <button class="mobile-menu-btn" type="button" aria-label="打开菜单" @click="drawerOpen = true">
          菜单
        </button>
      </div>
    </div>

    <a-drawer v-model:open="drawerOpen" placement="right" :width="260" :closable="false"
      :body-style="{ padding: '20px 16px' }" class="mobile-drawer">
      <div class="drawer-brand">AI文章创作器</div>
      <a-menu mode="inline" :selected-keys="[selectedMenuKey]" :items="menuItems" @click="onMobileMenuClick" />

      <div class="drawer-user">
        <p class="drawer-user-label">当前状态</p>
        <p class="drawer-user-value">{{ isLoggedIn ? `已登录：${userName}` : '未登录' }}</p>
        <a-button type="primary" block @click="toggleLogin">
          {{ isLoggedIn ? '退出当前账号' : '去登录' }}
        </a-button>
      </div>
    </a-drawer>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { userLogout } from '@/api/userController'
import { DEFAULT_USERNAME, USER_ROLE_ADMIN } from '@/constants/user'
import { useLoginUserStore } from '@/stores/loginUser'

type HeaderMenuKey = 'home' | 'admin'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()
const { loginUser } = storeToRefs(loginUserStore)

const drawerOpen = ref(false)
const isLoggedIn = computed(() => Boolean(loginUser.value?.id))
const userName = computed(() => loginUser.value?.userName || DEFAULT_USERNAME)
const isAdmin = computed(() => loginUser.value?.userRole === USER_ROLE_ADMIN)

const menuItems = computed(() => {
  const items: Array<{ key: HeaderMenuKey; label: string }> = [{ key: 'home', label: '首页' }]
  if (isAdmin.value) {
    items.push({ key: 'admin', label: '管理' })
  }
  return items
})

const selectedMenuKey = computed<HeaderMenuKey>(() => {
  if (route.path.startsWith('/admin')) {
    return 'admin'
  }
  return 'home'
})

const menuRouteMap: Record<HeaderMenuKey, string> = {
  home: '/',
  admin: '/admin/userManage',
}

const goToMenu = (key: HeaderMenuKey) => {
  router.push(menuRouteMap[key])
}

const onMenuClick = ({ key }: { key: HeaderMenuKey }) => {
  goToMenu(key)
}

const onMobileMenuClick = ({ key }: { key: HeaderMenuKey }) => {
  goToMenu(key)
  drawerOpen.value = false
}

const doLogout = async () => {
  try {
    const res = await userLogout()
    if (res.data.code !== 0) {
      message.error(res.data.message || '退出登录失败，请稍后重试')
      return
    }
    message.success('已退出登录')
  } catch (error) {
    message.error('退出登录失败，请稍后重试')
    return
  }
  loginUserStore.resetLoginUser()
  drawerOpen.value = false
  await router.push('/user/login')
}

const onUserMenuClick = ({ key }: { key: string }) => {
  if (key === 'logout') {
    confirmLogout()
  }
}

const confirmLogout = () => {
  Modal.confirm({
    title: '确认退出登录？',
    content: '退出后需要重新登录才能继续使用账号能力。',
    okText: '确认退出',
    cancelText: '取消',
    onOk: doLogout,
  })
}

const toggleLogin = () => {
  if (isLoggedIn.value) {
    confirmLogout()
    return
  }
  drawerOpen.value = false
  const redirect = encodeURIComponent(route.fullPath)
  router.push(`/user/login?redirect=${redirect}`)
}
</script>

<style scoped>
.global-header {
  --header-accent: #1d4f91;
  --header-accent-strong: #153d72;
  --header-gold: #c6a96b;
  --header-secondary: #0a2748;
  --header-surface: rgba(247, 250, 255, 0.9);
  --header-text-main: #102743;
  --header-text-sub: #61748b;
  --header-border: rgba(17, 48, 86, 0.14);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.global-header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--header-border);
  background: linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(238, 244, 252, 0.9));
  box-shadow: 0 10px 28px rgba(12, 35, 63, 0.12);
}

.header-shell {
  width: min(1180px, calc(100% - 32px));
  min-height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  min-width: 0;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: linear-gradient(135deg, #1d4f91 0%, #0a2748 100%);
  box-shadow: 0 10px 22px rgba(13, 37, 67, 0.32);
}

.brand-text {
  line-height: 1.15;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  color: var(--header-text-main);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-subtitle {
  margin: 3px 0 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--header-text-sub);
}

.desktop-nav {
  flex: 1;
  min-width: 260px;
  display: flex;
  justify-content: center;
}

.menu {
  border-bottom: none;
  background: transparent;
}

.menu:deep(.ant-menu-item),
.menu:deep(.ant-menu-submenu-title) {
  color: var(--header-text-sub);
  font-weight: 600;
}

.menu:deep(.ant-menu-item:hover),
.menu:deep(.ant-menu-submenu-title:hover) {
  color: var(--header-accent);
}

.menu:deep(.ant-menu-item-selected) {
  color: var(--header-secondary);
  font-weight: 700;
}

.menu:deep(.ant-menu-horizontal > .ant-menu-item-selected::after),
.menu:deep(.ant-menu-horizontal > .ant-menu-submenu-selected::after) {
  border-bottom: 2px solid var(--header-accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  background: rgba(29, 79, 145, 0.12);
  border: 1px solid rgba(29, 79, 145, 0.24);
  text-decoration: none;
  cursor: pointer;
}

.user-avatar {
  color: #1d4f91;
  background: #f6f9ff;
  border: 1px solid rgba(29, 79, 145, 0.3);
}

.user-name {
  font-size: 13px;
  color: var(--header-text-main);
  font-weight: 600;
  max-width: 108px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-caret {
  font-size: 11px;
  color: var(--header-text-sub);
  line-height: 1;
}

.auth-btn {
  border-radius: 10px;
  min-width: 86px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--header-accent), var(--header-accent-strong));
  border: none;
  box-shadow: 0 9px 18px rgba(13, 37, 67, 0.26);
}

.auth-btn:hover {
  filter: brightness(1.06);
}

.mobile-menu-btn {
  display: none;
  border: 1px solid var(--header-border);
  background: #f7faff;
  color: var(--header-text-main);
  border-radius: 10px;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.drawer-brand {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--header-accent-strong);
}

.drawer-user {
  margin-top: 18px;
  border-top: 1px solid var(--header-border);
  padding-top: 14px;
}

.drawer-user-label {
  margin: 0;
  font-size: 12px;
  color: var(--header-text-sub);
}

.drawer-user-value {
  margin: 4px 0 12px;
  color: var(--header-text-main);
  font-size: 14px;
  font-weight: 600;
}

:deep(.mobile-drawer .ant-drawer-content) {
  background: linear-gradient(180deg, #f8fbff 0%, #edf3fb 100%);
}

:deep(.mobile-drawer .ant-menu) {
  background: transparent;
}

:deep(.ant-dropdown-menu) {
  border: 1px solid rgba(17, 48, 86, 0.14);
  border-radius: 10px;
  box-shadow: 0 12px 24px rgba(12, 35, 63, 0.14);
}

@media (max-width: 960px) {

  .desktop-nav,
  .user-info,
  .auth-btn {
    display: none;
  }

  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .header-shell {
    min-height: 64px;
  }

  .brand-title {
    font-size: 18px;
  }

  .brand-subtitle {
    display: none;
  }
}

@media (max-width: 520px) {
  .header-shell {
    width: calc(100% - 20px);
    gap: 8px;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 12px;
  }

  .brand-title {
    font-size: 16px;
  }
}
</style>
