<template>
  <section class="manage-page">
    <div class="manage-head">
      <h2>用户管理</h2>
      <p>管理平台用户数据与账号状态（演示数据）。</p>
    </div>

    <a-card :bordered="false" class="manage-card">
      <a-table :columns="columns" :data-source="rows" :pagination="{ pageSize: 6 }" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '正常' ? 'green' : 'orange'">{{ record.status }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<script setup lang="ts">
  type UserRow = {
    id: number
    username: string
    account: string
    role: string
    status: '正常' | '禁用'
    createdAt: string
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '账号', dataIndex: 'account', key: 'account' },
    { title: '角色', dataIndex: 'role', key: 'role' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  ]

  const rows: UserRow[] = [
    { id: 1, username: '张三', account: 'zhangsan@example.com', role: '管理员', status: '正常', createdAt: '2026-03-01 10:01' },
    { id: 2, username: '李四', account: 'lisi@example.com', role: '普通用户', status: '正常', createdAt: '2026-03-02 11:23' },
    { id: 3, username: '王五', account: 'wangwu@example.com', role: '普通用户', status: '禁用', createdAt: '2026-03-04 09:08' },
    { id: 4, username: '赵六', account: 'zhaoliu@example.com', role: '普通用户', status: '正常', createdAt: '2026-03-08 15:40' },
  ]
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

  .manage-head p {
    margin: 8px 0 18px;
    color: #62768d;
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
</style>
