<template>
  <section class="auth-page">
    <div class="auth-card">
      <h2>创建账号</h2>
      <p>注册后即可开启你的 AI 高效写作流程。</p>

      <a-form layout="vertical" :model="formState" @finish="handleSubmit">
        <a-form-item
          label="账号"
          name="account"
          :rules="[
            { required: true, message: '请输入账号' },
            { min: 4, message: '账号长度至少 4 位' },
          ]"
        >
          <a-input v-model:value="formState.account" placeholder="请输入邮箱或手机号" size="large" />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码长度至少 8 位' },
          ]"
        >
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" size="large" />
        </a-form-item>

        <a-form-item label="确认密码" name="checkPassword" :rules="[{ required: true, message: '请再次输入密码' }]">
          <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" size="large" />
        </a-form-item>

        <a-button type="primary" html-type="submit" size="large" :loading="submitting" block>
          注册并开始使用
        </a-button>
      </a-form>

      <div class="bottom-link">
        已有账号？
        <router-link to="/user/login">去登录</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { userRegister } from '@/api/userController'

const router = useRouter()
const submitting = ref(false)

const formState = reactive({
  account: '',
  password: '',
  checkPassword: '',
})

const handleSubmit = async () => {
  if (formState.password !== formState.checkPassword) {
    message.error('两次输入密码不一致')
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    const res = await userRegister({
      userAccount: formState.account.trim(),
      userPassword: formState.password,
      checkPassword: formState.checkPassword,
    })
    if (res.data.code !== 0) {
      message.error(res.data.message || '注册失败')
      return
    }
    message.success('注册成功，请登录')
    await router.replace('/user/login')
  } catch (error) {
    message.error('注册失败，请稍后重试')
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
  width: min(480px, 100%);
  border-radius: 18px;
  padding: 30px 24px;
  background:
    radial-gradient(circle at 90% -10%, rgba(198, 169, 107, 0.2), rgba(198, 169, 107, 0) 34%),
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
