import { getLoginUser } from '@/api/userController'
import { DEFAULT_USERNAME, USER_ROLE_USER } from '@/constants/user'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const getDefaultLoginUser = (): API.LoginUserVO => ({
  userName: DEFAULT_USERNAME,
  userRole: USER_ROLE_USER,
})

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>(getDefaultLoginUser())

  // 获取登录用户信息
  async function fetchLoginUser() {
    try {
      const res = await getLoginUser()
      if (res.data.code === 0 && res.data.data) {
        loginUser.value = {
          ...getDefaultLoginUser(),
          ...res.data.data,
        }
        return
      }
      loginUser.value = getDefaultLoginUser()
    } catch (error) {
      loginUser.value = getDefaultLoginUser()
    }
  }

  // 更新登录用户信息
  function setLoginUser(newLoginUser: API.LoginUserVO) {
    loginUser.value = {
      ...getDefaultLoginUser(),
      ...newLoginUser,
    }
  }

  function resetLoginUser() {
    loginUser.value = getDefaultLoginUser()
  }

  return { loginUser, fetchLoginUser, setLoginUser, resetLoginUser }
})
