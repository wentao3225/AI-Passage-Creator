import { message } from "ant-design-vue"
import { USER_ROLE_ADMIN } from "./constants/user"
import router from "./router"
import { useLoginUserStore } from "./stores/loginUser"

// 登录用户信息预取任务（避免重复请求）
let loginUserFetchPromise: Promise<void> | null = null

const startFetchLoginUser = () => {
  if (!loginUserFetchPromise) {
    const loginUserStore = useLoginUserStore()
    loginUserFetchPromise = loginUserStore.fetchLoginUser().finally(() => {
      loginUserFetchPromise = null
    })
  }
  return loginUserFetchPromise
}

/**
 * 全局权限校验
 */
router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  const toUrl = to.fullPath

  // 普通页面不阻塞渲染；后台路由需要先拿到登录态再做权限校验
  if (toUrl.startsWith('/admin')) {
    await startFetchLoginUser()
  } else {
    void startFetchLoginUser()
  }
  
  const loginUser = loginUserStore.loginUser
  // 管理员页面权限校验
  if (toUrl.startsWith('/admin')) {
    if (!loginUser || loginUser.userRole !== USER_ROLE_ADMIN) {
      message.error('没有权限')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
  }
  next()
})
