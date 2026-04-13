<template>
  <section class="auth-page">
    <div class="auth-card">
      <h2>欢迎登录</h2>
      <p>登录后可保存创作记录并同步多端内容。</p>

      <a-form layout="vertical" :model="formState" @finish="handleSubmit">
        <a-form-item label="账号" name="account" :rules="[{ required: true, message: '请输入账号' }]">
          <a-input v-model:value="formState.account" placeholder="请输入邮箱或手机号" size="large" />
        </a-form-item>

        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" size="large" />
        </a-form-item>

        <a-button type="primary" html-type="submit" size="large" :loading="submitting" block>
          立即登录
        </a-button>
      </a-form>

      <div class="bottom-link">
        没有账号？
        <router-link to="/user/register">去注册</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { message } from 'ant-design-vue'
  import { useRoute, useRouter } from 'vue-router'
  import { userLogin } from '@/api/userController'
  import { useLoginUserStore } from '@/stores/loginUser'

  const router = useRouter()
  const route = useRoute()
  const loginUserStore = useLoginUserStore()
  const submitting = ref(false)

  const formState = reactive({
    account: '',
    password: '',
  })

  const handleSubmit = async () => {
    if (submitting.value) {
      return
    }
    submitting.value = true
    try {
      const res = await userLogin({
        userAccount: formState.account.trim(),
        userPassword: formState.password,
      })
      if (res.data.code !== 0 || !res.data.data) {
        message.error(res.data.message || '登录失败')
        return
      }
      loginUserStore.setLoginUser(res.data.data)
      message.success('登录成功')
      const redirect = typeof route.query.redirect === 'string' ? decodeURIComponent(route.query.redirect) : '/'
      await router.replace(redirect.startsWith('/') ? redirect : '/')
    } catch (error) {
      message.error('登录失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
  .auth-page {
    min-height: calc(100vh - 200px);
    display: grid;
    place-items: center;
    padding: 28px 16px;
    font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }

  .auth-card {
    width: min(460px, 100%);
    border-radius: 18px;
    padding: 30px 24px;
    background:
      radial-gradient(circle at 6% -12%, rgba(29, 79, 145, 0.16), rgba(29, 79, 145, 0) 34%),
      linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(241, 247, 253, 0.98));
    border: 1px solid rgba(17, 48, 86, 0.16);
    box-shadow: 0 18px 40px rgba(10, 31, 57, 0.16);
  }

  .auth-card h2 {
    margin: 0;
    font-size: 30px;
    color: #0f2d52;
  }

  .auth-card p {
    margin: 8px 0 20px;
    color: #667a92;
  }

  .auth-card :deep(.ant-form-item-label > label) {
    color: #425a76;
    font-weight: 600;
  }

  .auth-card :deep(.ant-input),
  .auth-card :deep(.ant-input-affix-wrapper) {
    background: #ffffff;
    border-color: rgba(17, 48, 86, 0.24);
    border-radius: 12px;
  }

  .auth-card :deep(.ant-input:focus),
  .auth-card :deep(.ant-input-focused),
  .auth-card :deep(.ant-input-affix-wrapper:focus),
  .auth-card :deep(.ant-input-affix-wrapper-focused) {
    border-color: #1d4f91;
    box-shadow: 0 0 0 2px rgba(29, 79, 145, 0.16);
  }

  .auth-card :deep(.ant-btn-primary) {
    border: none;
    border-radius: 12px;
    background: linear-gradient(140deg, #1d4f91, #153d72);
    box-shadow: 0 10px 20px rgba(13, 37, 67, 0.28);
  }

  .bottom-link {
    margin-top: 16px;
    text-align: center;
    color: #667a92;
  }

  .bottom-link a {
    color: #1d4f91;
    text-decoration: none;
    font-weight: 600;
  }
</style>
