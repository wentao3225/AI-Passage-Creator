<template>
  <section class="manage-page">
    <div class="manage-head">
      <div>
        <h2>用户管理</h2>
        <p>管理平台用户账号、角色与资料信息。</p>
      </div>
      <a-button type="primary" @click="openAddModal">新增用户</a-button>
    </div>

    <a-card :bordered="false" class="filter-card">
      <div class="filter-row">
        <a-input v-model:value="queryParams.userAccount" placeholder="按账号搜索" allow-clear class="filter-item" />
        <a-input v-model:value="queryParams.userName" placeholder="按昵称搜索" allow-clear class="filter-item" />
        <a-select v-model:value="queryParams.userRole" placeholder="角色" allow-clear class="filter-item">
          <a-select-option value="user">普通用户</a-select-option>
          <a-select-option value="admin">管理员</a-select-option>
        </a-select>
        <div class="filter-actions">
          <a-button @click="resetQuery">重置</a-button>
          <a-button type="primary" @click="doSearch">查询</a-button>
        </div>
      </div>
    </a-card>

    <a-card :bordered="false" class="manage-card">
      <a-table :columns="columns" :data-source="rows" :loading="loading" :pagination="pagination" row-key="id"
        @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'userRole'">
            <a-tag :color="record.userRole === 'admin' ? 'gold' : 'green'">
              {{ record.userRole === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDate(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="openEditModal(record)">编辑</a-button>
              <a-popconfirm title="确认删除该用户吗？" ok-text="确认" cancel-text="取消" @confirm="doDeleteUser(record)">
                <a-button type="link" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="modalVisible" :title="modalMode === 'add' ? '新增用户' : '编辑用户'" :confirm-loading="submitLoading"
      @ok="submitUser" @cancel="resetModal">
      <a-form layout="vertical">
        <a-form-item label="账号" required>
          <a-input v-model:value="formState.userAccount" placeholder="请输入账号（至少4位）" />
        </a-form-item>
        <a-form-item v-if="modalMode === 'add'" label="密码" required>
          <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码（至少8位）" />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model:value="formState.userName" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item label="头像地址">
          <a-input v-model:value="formState.userAvatar" placeholder="请输入头像 URL" />
        </a-form-item>
        <a-form-item label="用户简介">
          <a-textarea v-model:value="formState.userProfile" :rows="3" placeholder="请输入用户简介" />
        </a-form-item>
        <a-form-item label="角色" required>
          <a-select v-model:value="formState.userRole">
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { addUser, deleteUser, listUserByPage, updateUser } from '@/api/userController'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { onMounted, reactive, ref } from 'vue'

type TableChangePagination = {
  current?: number
  pageSize?: number
}

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '账号', dataIndex: 'userAccount', key: 'userAccount', width: 220 },
  { title: '昵称', dataIndex: 'userName', key: 'userName', width: 180 },
  { title: '角色', dataIndex: 'userRole', key: 'userRole', width: 120 },
  { title: '简介', dataIndex: 'userProfile', key: 'userProfile', ellipsis: true },
  { title: '注册时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' },
]

const loading = ref(false)
const submitLoading = ref(false)
const rows = ref<API.UserManageVO[]>([])

const queryParams = reactive<API.UserQueryRequest>({
  userAccount: '',
  userName: '',
  userRole: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const modalVisible = ref(false)
const modalMode = ref<'add' | 'edit'>('add')

const formState = reactive<{
  id?: number
  userAccount: string
  userPassword: string
  userName: string
  userAvatar: string
  userProfile: string
  userRole: string
}>({
  id: undefined,
  userAccount: '',
  userPassword: '',
  userName: '',
  userAvatar: '',
  userProfile: '',
  userRole: 'user',
})

/**
 * 拉取用户分页数据。
 */
const loadUsers = async () => {
  // 进入加载态并请求后端分页接口
  loading.value = true
  try {
    const res = await listUserByPage({
      current: pagination.current,
      pageSize: pagination.pageSize,
      userAccount: queryParams.userAccount,
      userName: queryParams.userName,
      userRole: queryParams.userRole,
    })
    const pageData = res.data.data
    rows.value = pageData?.records || []
    pagination.total = pageData?.totalRow || 0
  } catch (error) {
    message.error((error as Error).message || '加载用户列表失败')
  } finally {
    // 请求结束后关闭加载态
    loading.value = false
  }
}

/**
 * 执行查询并重置到第一页。
 */
const doSearch = () => {
  // 搜索条件变化后统一回到第一页
  pagination.current = 1
  loadUsers()
}

/**
 * 重置查询条件并刷新列表。
 */
const resetQuery = () => {
  // 清空所有筛选项
  queryParams.userAccount = ''
  queryParams.userName = ''
  queryParams.userRole = undefined
  pagination.current = 1
  loadUsers()
}

/**
 * 表格分页变化处理。
 */
const handleTableChange = (pag: TableChangePagination) => {
  // 同步分页参数并重新查询
  pagination.current = pag.current || 1
  pagination.pageSize = pag.pageSize || 10
  loadUsers()
}

/**
 * 打开新增用户弹窗。
 */
const openAddModal = () => {
  // 切换为新增模式并重置表单
  modalMode.value = 'add'
  resetModal()
  modalVisible.value = true
}

/**
 * 打开编辑用户弹窗。
 */
const openEditModal = (record: API.UserManageVO) => {
  // 切换为编辑模式并回填已有数据
  modalMode.value = 'edit'
  formState.id = record.id
  formState.userAccount = record.userAccount || ''
  formState.userPassword = ''
  formState.userName = record.userName || ''
  formState.userAvatar = record.userAvatar || ''
  formState.userProfile = record.userProfile || ''
  formState.userRole = record.userRole || 'user'
  modalVisible.value = true
}

/**
 * 重置弹窗表单状态。
 */
const resetModal = () => {
  // 清空表单，避免上一次操作数据残留
  formState.id = undefined
  formState.userAccount = ''
  formState.userPassword = ''
  formState.userName = ''
  formState.userAvatar = ''
  formState.userProfile = ''
  formState.userRole = 'user'
  modalVisible.value = false
}

/**
 * 新增或编辑用户。
 */
const submitUser = async () => {
  if (!formState.userAccount || formState.userAccount.trim().length < 4) {
    message.warning('请输入至少 4 位账号')
    return
  }
  if (modalMode.value === 'add' && formState.userPassword.length < 8) {
    message.warning('请输入至少 8 位密码')
    return
  }

  // 提交期间锁定按钮
  submitLoading.value = true
  try {
    if (modalMode.value === 'add') {
      // 新增用户
      await addUser({
        userAccount: formState.userAccount.trim(),
        userPassword: formState.userPassword,
        userName: formState.userName,
        userAvatar: formState.userAvatar,
        userProfile: formState.userProfile,
        userRole: formState.userRole,
      })
      message.success('新增用户成功')
    } else {
      // 编辑用户
      await updateUser({
        id: formState.id,
        userAccount: formState.userAccount.trim(),
        userName: formState.userName,
        userAvatar: formState.userAvatar,
        userProfile: formState.userProfile,
        userRole: formState.userRole,
      })
      message.success('更新用户成功')
    }

    resetModal()
    loadUsers()
  } catch (error) {
    message.error((error as Error).message || '提交失败')
  } finally {
    // 无论成功与否都关闭提交 loading
    submitLoading.value = false
  }
}

/**
 * 删除用户。
 */
const doDeleteUser = async (record: API.UserManageVO) => {
  if (!record.id) {
    message.warning('用户 ID 不存在')
    return
  }
  try {
    // 调用删除接口并刷新列表
    await deleteUser({ id: record.id })
    message.success('删除成功')
    // 若当前页删空且不是第一页，自动回退一页
    if (rows.value.length === 1 && pagination.current > 1) {
      pagination.current -= 1
    }
    loadUsers()
  } catch (error) {
    message.error((error as Error).message || '删除失败')
  }
}

/**
 * 格式化时间展示。
 */
const formatDate = (date?: string) => {
  // 空值时展示占位符
  if (!date) return '--'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  // 页面初始化后加载用户列表
  loadUsers()
})
</script>

<style scoped>
.manage-page {
  width: min(1180px, calc(100% - 32px));
  margin: 28px auto 46px;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.manage-head h2 {
  margin: 0;
  font-size: 34px;
  color: #0f2d52;
}

.manage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.manage-head p {
  margin: 8px 0 18px;
  color: #62768d;
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 14px;
  border: 1px solid rgba(17, 48, 86, 0.14);
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr)) auto;
  gap: 12px;
  align-items: center;
}

.filter-item {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.manage-card {
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(253, 254, 255, 0.99), rgba(241, 247, 253, 0.99));
  border: 1px solid rgba(17, 48, 86, 0.14);
  box-shadow: 0 14px 30px rgba(10, 31, 57, 0.14);
}

.manage-card :deep(.ant-table-wrapper),
.manage-card :deep(.ant-table),
.manage-card :deep(.ant-table-container) {
  background: transparent;
}

.manage-card :deep(.ant-table-thead > tr > th) {
  background: rgba(29, 79, 145, 0.08);
  color: #1d3654;
  border-bottom: 1px solid rgba(17, 48, 86, 0.16);
  font-weight: 700;
}

.manage-card :deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid rgba(17, 48, 86, 0.1);
  color: #3f556f;
}

.manage-card :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(29, 79, 145, 0.06);
}

@media (max-width: 980px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: flex-start;
  }
}
</style>
