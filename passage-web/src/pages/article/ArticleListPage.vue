<template>
  <div class="article-list-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-container">
        <div class="header-content">
          <h1 class="page-title">历史记录</h1>
          <p class="page-subtitle">管理您创作的所有文章</p>
        </div>
        <a-button type="primary" size="large" @click="goToCreate" class="create-btn">
          <template #icon>
            <PlusOutlined />
          </template>
          创作新文章
        </a-button>
      </div>
    </div>

    <div class="container">
      <!-- 搜索筛选栏 -->
      <div class="filter-bar">
        <div class="filter-left">
          <a-input-search v-model:value="searchKeyword" placeholder="搜索文章标题..." style="width: 280px"
            @search="handleSearch" @change="handleSearchChange" allow-clear class="search-input">
            <template #prefix>
              <SearchOutlined class="search-icon" />
            </template>
          </a-input-search>

          <a-range-picker v-model:value="dateRange" :placeholder="['开始日期', '结束日期']" @change="handleDateChange"
            class="date-picker" />

          <a-select v-model:value="statusFilter" placeholder="全部状态" style="width: 120px" allow-clear
            @change="handleStatusChange" class="status-select">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="COMPLETED">已完成</a-select-option>
            <a-select-option value="PROCESSING">生成中</a-select-option>
            <a-select-option value="PENDING">等待中</a-select-option>
            <a-select-option value="FAILED">失败</a-select-option>
          </a-select>
        </div>

        <div class="filter-right">
          <span class="total-count">共 {{ pagination.total }} 篇文章</span>
        </div>
      </div>

      <!-- 表格卡片 -->
      <a-card :bordered="false" class="table-card">
        <div ref="tableScrollSyncRef" class="table-scroll-sync">
          <div ref="topScrollbarRef" class="table-top-scrollbar" @scroll="handleTopScrollbarScroll">
            <div ref="topScrollbarInnerRef" class="table-top-scrollbar-inner"></div>
          </div>

          <a-table :columns="columns" :data-source="dataSource" :loading="loading" :pagination="pagination"
            :scroll="{ x: 'max-content' }" @change="handleTableChange" row-key="id" class="article-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                <div class="title-cell" @click="viewArticle(record)">
                  <div class="main-title">{{ record.mainTitle || record.topic || '-' }}</div>
                  <div class="sub-title">{{ record.subTitle || '-' }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'status'">
                <span :class="['status-badge', `status-${record.status?.toLowerCase()}`]">
                  <span class="status-dot"></span>
                  {{ getStatusText(record.status) }}
                </span>
              </template>

              <template v-else-if="column.key === 'style'">
                <span class="style-badge">{{ getStyleText(record.style) }}</span>
              </template>

              <template v-else-if="column.key === 'phase'">
                <span :class="['phase-badge', `phase-${record.phase?.toLowerCase()}`]">
                  {{ getPhaseText(record.phase) }}
                </span>
              </template>

              <template v-else-if="column.key === 'imageCount'">
                <span class="count-text">{{ record.images?.length ?? 0 }}</span>
              </template>

              <template v-else-if="column.key === 'createTime'">
                <span class="time-text">{{ formatDate(record.createTime) }}</span>
              </template>

              <template v-else-if="column.key === 'completedTime'">
                <span class="time-text">{{ formatDate(record.completedTime) }}</span>
              </template>

              <template v-else-if="column.key === 'errorMessage'">
                <a-tooltip :title="record.errorMessage || '-'">
                  <span :class="['error-text', { empty: !record.errorMessage }]">
                    {{ record.errorMessage || '-' }}
                  </span>
                </a-tooltip>
              </template>

              <template v-else-if="column.key === 'action'">
                <div class="action-group">
                  <a-button type="link" size="small" @click="viewArticle(record)" class="action-btn view-btn">
                    <EyeOutlined />
                    查看
                  </a-button>
                  <a-button v-if="record.status === 'FAILED'" type="link" size="small" @click="retryArticle(record)"
                    class="action-btn retry-btn">
                    <RedoOutlined />
                    重试
                  </a-button>
                  <a-button v-else type="link" size="small" @click="exportArticle(record)"
                    class="action-btn export-btn">
                    <DownloadOutlined />
                    导出
                  </a-button>
                  <a-popconfirm title="确定要删除这篇文章吗?" ok-text="确定" cancel-text="取消" @confirm="deleteArticle(record)">
                    <a-button type="link" size="small" danger class="action-btn delete-btn">
                      <DeleteOutlined />
                      删除
                    </a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>

            <!-- 空状态 -->
            <template #emptyText>
              <div class="empty-state">
                <FileTextOutlined class="empty-icon" />
                <p class="empty-title">暂无文章</p>
                <p class="empty-desc">开始创作您的第一篇文章吧</p>
                <a-button type="primary" @click="goToCreate">
                  <PlusOutlined />
                  创作新文章
                </a-button>
              </div>
            </template>
          </a-table>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  RedoOutlined
} from '@ant-design/icons-vue'
import { listArticle, deleteArticle as deleteArticleApi, getArticle } from '@/api/articleController'
import dayjs, { type Dayjs } from 'dayjs'

const router = useRouter()

const tableScrollSyncRef = ref<HTMLElement | null>(null)
const topScrollbarRef = ref<HTMLElement | null>(null)
const topScrollbarInnerRef = ref<HTMLElement | null>(null)
let tableHorizontalScroller: HTMLElement | null = null
let isSyncingFromTop = false
let isSyncingFromTable = false

// 搜索筛选
const searchKeyword = ref('')
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const statusFilter = ref<string>('')

const columns = [
  {
    title: '选题',
    dataIndex: 'topic',
    key: 'topic',
    width: 180,
    ellipsis: true,
  },
  {
    title: '标题',
    key: 'title',
    width: 280,
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
  },
  {
    title: '风格',
    key: 'style',
    width: 110,
  },
  {
    title: '阶段',
    key: 'phase',
    width: 130,
  },
  {
    title: '配图数',
    key: 'imageCount',
    width: 90,
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 160,
  },
  {
    title: '完成时间',
    key: 'completedTime',
    width: 160,
  },
  {
    title: '错误消息',
    key: 'errorMessage',
    width: 240,
  },
  {
    title: '操作',
    key: 'action',
    width: 260,
    fixed: 'right' as const,
  },
]

const loading = ref(false)
const dataSource = ref<API.ArticleVO[]>([])
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50', '100']
})

// 加载数据
/**
 * 加载文章分页数据，并在前端执行筛选条件。
 */
const loadData = async () => {
  // 进入加载态，防止重复触发
  loading.value = true
  try {
    // 拉取当前分页数据
    const res = await listArticle({
      current: pagination.value.current,
      pageSize: pagination.value.pageSize,
      // 如果后端支持，可以传递搜索参数
      // keyword: searchKeyword.value,
      // status: statusFilter.value,
    })
    const pageData = res.data.data
    let records = pageData?.records || []

    // 前端过滤（如果后端不支持）
    if (searchKeyword.value) {
      // 标题与选题字段统一按小写匹配
      const keyword = searchKeyword.value.toLowerCase()
      records = records.filter((item: API.ArticleVO) =>
        item.mainTitle?.toLowerCase().includes(keyword) ||
        item.topic?.toLowerCase().includes(keyword)
      )
    }

    if (statusFilter.value) {
      // 状态精确匹配
      records = records.filter((item: API.ArticleVO) => item.status === statusFilter.value)
    }

    if (dateRange.value) {
      // 按起止日期过滤创建时间
      const [start, end] = dateRange.value
      records = records.filter((item: API.ArticleVO) => {
        const createTime = dayjs(item.createTime)
        return createTime.isAfter(start.startOf('day')) && createTime.isBefore(end.endOf('day'))
      })
    }

    dataSource.value = records
    // 总条数仍以后端分页返回为准
    pagination.value.total = pageData?.totalRow || 0
  } catch (error: any) {
    message.error(error.message || '加载失败')
  } finally {
    // 请求结束后关闭加载态
    loading.value = false
    syncTableScrollbars()
  }
}

const getHorizontalScroller = () => {
  if (!tableScrollSyncRef.value) {
    return null
  }

  const candidates = tableScrollSyncRef.value.querySelectorAll<HTMLElement>(
    '.ant-table-content, .ant-table-body'
  )

  for (const el of candidates) {
    if (el.scrollWidth > el.clientWidth) {
      return el
    }
  }

  return candidates[0] ?? null
}

const handleTableScrollerScroll = () => {
  if (!tableHorizontalScroller || !topScrollbarRef.value) {
    return
  }
  if (isSyncingFromTop) {
    return
  }

  isSyncingFromTable = true
  topScrollbarRef.value.scrollLeft = tableHorizontalScroller.scrollLeft
  isSyncingFromTable = false
}

const handleTopScrollbarScroll = () => {
  if (!tableHorizontalScroller || !topScrollbarRef.value) {
    return
  }
  if (isSyncingFromTable) {
    return
  }

  isSyncingFromTop = true
  tableHorizontalScroller.scrollLeft = topScrollbarRef.value.scrollLeft
  isSyncingFromTop = false
}

const syncTableScrollbars = () => {
  nextTick(() => {
    const nextScroller = getHorizontalScroller()

    if (tableHorizontalScroller && tableHorizontalScroller !== nextScroller) {
      tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll)
    }

    tableHorizontalScroller = nextScroller

    if (!tableHorizontalScroller || !topScrollbarRef.value || !topScrollbarInnerRef.value) {
      return
    }

    tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll)
    tableHorizontalScroller.addEventListener('scroll', handleTableScrollerScroll, { passive: true })

    topScrollbarInnerRef.value.style.width = `${tableHorizontalScroller.scrollWidth}px`
    const hasHorizontalOverflow = tableHorizontalScroller.scrollWidth > tableHorizontalScroller.clientWidth + 1
    topScrollbarRef.value.style.display = hasHorizontalOverflow ? 'block' : 'none'
    topScrollbarRef.value.scrollLeft = tableHorizontalScroller.scrollLeft
  })
}

// 搜索处理
/**
 * 触发关键词搜索，并回到第一页。
 */
const handleSearch = () => {
  // 新搜索从第一页开始展示
  pagination.value.current = 1
  loadData()
}

/**
 * 监听搜索框变化，清空时自动恢复全量数据。
 */
const handleSearchChange = () => {
  // 如果搜索框清空，也触发搜索
  if (!searchKeyword.value) {
    handleSearch()
  }
}

/**
 * 日期范围变化后刷新列表。
 */
const handleDateChange = () => {
  // 日期筛选变化后重置到第一页
  pagination.value.current = 1
  loadData()
}

/**
 * 状态筛选变化后刷新列表。
 */
const handleStatusChange = () => {
  // 状态筛选变化后重置到第一页
  pagination.value.current = 1
  loadData()
}

// 表格变化
/**
 * 同步表格分页参数并重新加载数据。
 */
const handleTableChange = (pag: any) => {
  // 更新分页参数
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  // 根据新分页重新查询
  loadData()
}

// 查看文章
/**
 * 跳转到文章详情页。
 */
const viewArticle = (record: API.ArticleVO) => {
  // 使用 taskId 跳转详情页
  router.push(`/article/${record.taskId}`)
}

// 导出文章
/**
 * 拉取详情后导出 Markdown 文件。
 */
const exportArticle = async (record: API.ArticleVO) => {
  try {
    // 使用 taskId 获取最新文章详情
    const res = await getArticle({ taskId: record.taskId || '' })
    const article = res.data.data
    if (!article) {
      message.error('文章数据不存在')
      return
    }

    let markdown = `# ${article.mainTitle}\n\n`
    markdown += `> ${article.subTitle}\n\n`

    // 优先导出带配图的完整正文
    if (article.fullContent) {
      markdown += article.fullContent
    } else {
      markdown += article.content || ''
    }

    // 创建下载链接并触发浏览器下载
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.mainTitle || '文章'}.md`
    a.click()
    URL.revokeObjectURL(url)

    message.success('导出成功')
  } catch (error) {
    message.error((error as Error).message || '导出失败')
  }
}

// 删除文章
/**
 * 删除指定文章并刷新列表。
 */
const deleteArticle = async (record: API.ArticleVO) => {
  try {
    // 调用删除接口（按主键 id）
    await deleteArticleApi({ id: record.id })
    message.success('删除成功')
    // 删除成功后重新加载当前页
    loadData()
  } catch (error) {
    message.error((error as Error).message || '删除失败')
  }
}

// 重试文章（重新创建）
/**
 * 打开确认框并带选题跳转至创作页。
 */
const retryArticle = (record: API.ArticleVO) => {
  Modal.confirm({
    title: '确认重试',
    content: `将使用相同的选题"${record.topic}"重新创建文章，是否继续？`,
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      // 复用历史记录中的选题与附加描述
      router.push({
        path: '/create',
        query: {
          topic: record.topic || '',
          style: record.style || ''
        }
      })
    }
  })
}

// 跳转创作页面
/**
 * 跳转到文章创作页。
 */
const goToCreate = () => {
  // 进入创作页开始新任务
  router.push('/create')
}

// 格式化日期
/**
 * 统一列表时间展示格式。
 */
const formatDate = (date?: string) => {
  if (!date) {
    return '-'
  }
  // 列表页使用分钟级展示
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取状态文本
/**
 * 将状态码转换为中文标签。
 */
const getStatusText = (status: string) => {
  // 后端状态码映射为前端展示文案
  const textMap: Record<string, string> = {
    PENDING: '等待中',
    PROCESSING: '生成中',
    COMPLETED: '已完成',
    FAILED: '失败',
  }
  return textMap[status] || status
}

// 获取风格文本
/**
 * 将风格编码转换为中文标签。
 */
const getStyleText = (style?: string) => {
  const textMap: Record<string, string> = {
    tech: '科技',
    emotional: '情感',
    educational: '教育',
    humorous: '幽默',
  }
  if (!style) {
    return '默认'
  }
  return textMap[style] || style
}

// 获取阶段文本
/**
 * 将阶段编码转换为中文标签。
 */
const getPhaseText = (phase?: string) => {
  const textMap: Record<string, string> = {
    PENDING: '等待中',
    TITLE_GENERATING: '生成标题',
    TITLE_SELECTING: '选择标题',
    OUTLINE_GENERATING: '生成大纲',
    OUTLINE_EDITING: '编辑大纲',
    CONTENT_GENERATING: '生成正文',
    COMPLETED: '已完成',
  }
  if (!phase) {
    return '-'
  }
  return textMap[phase] || phase
}

onMounted(() => {
  // 首次进入页面自动加载数据
  loadData()
  window.addEventListener('resize', syncTableScrollbars)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncTableScrollbars)
  if (tableHorizontalScroller) {
    tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll)
  }
})
</script>

<style scoped lang="scss">
@use './css/articleList.scss';
</style>
