<template>
    <div class="article-detail-page">
        <div class="page-header">
            <div class="header-container">
                <div class="header-actions">
                    <a-button @click="goBack" class="back-btn">
                        <template #icon>
                            <ArrowLeftOutlined />
                        </template>
                        返回
                    </a-button>
                    <div class="right-actions">
                        <a-button v-if="canRetryCurrentPhase" type="primary" @click="handleRetryCurrentPhase"
                            class="retry-btn">
                            <template #icon>
                                <RedoOutlined />
                            </template>
                            重试当前阶段
                        </a-button>
                        <a-button v-if="canRestartOutline" @click="handleRestartOutline">
                            <template #icon>
                                <RedoOutlined />
                            </template>
                            从大纲重跑
                        </a-button>
                        <a-button v-if="canRestartContent" @click="handleRestartContent">
                            <template #icon>
                                <RedoOutlined />
                            </template>
                            从正文重跑
                        </a-button>
                        <a-button type="primary" @click="exportMarkdown" class="export-btn">
                            <template #icon>
                                <DownloadOutlined />
                            </template>
                            导出 Markdown
                        </a-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <a-spin :spinning="loading" tip="加载中...">
                <a-card :bordered="false" v-if="article" class="article-card">
                    <!-- 标题 -->
                    <div class="title-section">
                        <h1 class="main-title">{{ article.mainTitle }}</h1>
                        <p class="sub-title">{{ article.subTitle }}</p>
                        <div class="meta-info">
                            <a-tag :color="getStatusColor(article.status ?? '')" class="status-tag">
                                {{ getStatusText(article.status ?? '') }}
                            </a-tag>
                            <span class="time">创建于 {{ article.createTime ? formatDate(article.createTime) : '' }}</span>
                        </div>
                    </div>

                    <a-divider />

                    <!-- 执行日志面板 -->
                    <div v-if="executionStats && executionStats.logs && executionStats.logs.length > 0"
                        class="execution-logs-section">
                        <div class="logs-header" @click="showExecutionLogs = !showExecutionLogs">
                            <h2 class="section-title">
                                <ClockCircleOutlined class="section-icon" />
                                执行日志
                                <a-tag :color="getStatusColor(executionStats.overallStatus ?? '')"
                                    class="status-tag-small">
                                    {{ executionStats.overallStatus ?? '' }}
                                </a-tag>
                            </h2>
                            <ThunderboltOutlined :class="['toggle-icon', { expanded: showExecutionLogs }]" />
                        </div>

                        <div :class="['logs-collapse-wrapper', { expanded: showExecutionLogs }]">
                            <div class="logs-content">
                                <!-- 统计概览 -->
                                <div class="stats-summary">
                                    <div class="stat-item">
                                        <span class="label">总耗时</span>
                                        <span class="value">{{ executionStats.totalDurationMs ?? 0 }}ms</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="label">智能体数量</span>
                                        <span class="value">{{ executionStats.agentCount ?? 0 }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="label">平均耗时</span>
                                        <span class="value">
                                            {{ executionStats.agentCount && executionStats.totalDurationMs ?
                                                Math.round(executionStats.totalDurationMs / executionStats.agentCount) : 0
                                            }}ms
                                        </span>
                                    </div>
                                </div>

                                <!-- 智能体时间线 -->
                                <div class="agent-timeline">
                                    <div v-for="log in executionStats.logs" :key="log.id"
                                        :class="['timeline-item', log.status?.toLowerCase()]">
                                        <div class="timeline-indicator">
                                            <CheckCircleOutlined v-if="log.status === 'SUCCESS'" class="icon success" />
                                            <CloseCircleOutlined v-else-if="log.status === 'FAILED'"
                                                class="icon failed" />
                                            <LoadingOutlined v-else class="icon running" />
                                        </div>
                                        <div class="timeline-content">
                                            <div class="timeline-header">
                                                <span class="agent-name">{{ getAgentDisplayName(log.agentName ?? '')
                                                }}</span>
                                                <span class="duration">{{ log.durationMs ?? 0 }}ms</span>
                                            </div>
                                            <div class="timeline-time">
                                                {{ log.startTime ? formatDate(log.startTime) : '' }}
                                            </div>
                                            <div v-if="log.errorMessage" class="error-message">
                                                <CloseCircleOutlined /> {{ log.errorMessage }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- 大纲 -->
                    <div v-if="article.outline && article.outline.length > 0" class="outline-section">
                        <h2 class="section-title">
                            <OrderedListOutlined class="section-icon" />
                            文章大纲
                        </h2>
                        <div class="outline-list">
                            <div v-for="item in article.outline" :key="item.section" class="outline-item">
                                <div class="outline-title">{{ item.section }}. {{ item.title }}</div>
                                <ul class="outline-points">
                                    <li v-for="(point, idx) in item.points" :key="idx">{{ point }}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <a-divider v-if="article.outline && article.outline.length > 0" />

                    <!-- 完整图文（优先展示） -->
                    <div v-if="articleMarkdown" class="content-section">
                        <h2 class="section-title">
                            <FileTextOutlined class="section-icon" />
                            完整图文
                        </h2>
                        <div v-html="markdownToHtml(articleMarkdown)" class="markdown-content"></div>
                    </div>

                    <!-- 配图（仅在没有 fullContent 时单独展示） -->
                    <div v-if="!articleMarkdown && article.images && article.images.length > 0" class="images-section">
                        <h2 class="section-title">
                            <PictureOutlined class="section-icon" />
                            文章配图
                        </h2>
                        <div class="images-grid">
                            <div v-for="image in article.images" :key="image.position" class="image-item">
                                <img :src="image.url" :alt="image.description" />
                                <div class="image-info">
                                    <span class="badge">{{ image.method }}</span>
                                    <span class="keywords">{{ image.keywords }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </a-card>
            </a-spin>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
    ArrowLeftOutlined,
    DownloadOutlined,
    OrderedListOutlined,
    FileTextOutlined,
    PictureOutlined,
    RedoOutlined,
} from '@ant-design/icons-vue'
import { getArticle, getExecutionLogs, restartPhase as restartArticlePhase } from '@/api/articleController'
import { buildArticleMarkdown, markdownToHtml, resolveArticleCoverImage } from '@/utils/markdown'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const article = ref<API.ArticleVO | null>(null)
const executionStats = ref<API.AgentExecutionStats | null>(null)
const logsLoading = ref(false)
const showExecutionLogs = ref(false)
let pollingTimer: ReturnType<typeof window.setInterval> | null = null

const articleMarkdown = computed(() => buildArticleMarkdown(article.value))
const restartablePhases = ['TITLE_GENERATING', 'OUTLINE_GENERATING', 'CONTENT_GENERATING']

const canRetryCurrentPhase = computed(() => {
    return article.value?.status === 'FAILED' && restartablePhases.includes(article.value?.phase ?? '')
})

const canRestartOutline = computed(() => {
    return article.value?.status !== 'PROCESSING'
        && !!article.value?.mainTitle
        && !!article.value?.subTitle
})

const canRestartContent = computed(() => {
    return canRestartOutline.value && !!article.value?.outline?.length
})

// 加载文章
/**
 * 根据路由 taskId 拉取文章详情。
 */
const loadArticle = async (showLoading = true, silent = false) => {
    const taskId = route.params.taskId as string
    if (!taskId) {
        if (!silent) {
            message.error('文章ID不存在')
        }
        return
    }

    // 打开加载态，避免重复点击与空白闪烁
    if (showLoading) {
        loading.value = true
    }
    try {
        // 请求后端文章详情接口
        const res = await getArticle({ taskId })
        // 兼容空数据返回
        article.value = res.data.data || null
        // 自动加载执行日志
        await loadExecutionLogs(taskId)
    } catch (error) {
        if (!silent) {
            message.error((error as Error).message || '加载失败')
        }
    } finally {
        // 无论成功失败都关闭加载态
        if (showLoading) {
            loading.value = false
        }
        syncPollingState()
    }
}

// 加载执行日志

const loadExecutionLogs = async (taskId: string) => {
    logsLoading.value = true
    try {
        const res = await getExecutionLogs({ taskId })
        executionStats.value = res.data.data || null
    } catch (error) {
        console.error('加载执行日志失败:', error)
    } finally {
        logsLoading.value = false
    }
}

/**
 * 停止轮询，避免离开页面后继续请求。
 */
const stopPolling = () => {
    if (pollingTimer) {
        window.clearInterval(pollingTimer)
        pollingTimer = null
    }
}

/**
 * 文章处于处理中时，详情页定时刷新状态和日志。
 */
const syncPollingState = () => {
    if (article.value?.status !== 'PROCESSING') {
        stopPolling()
        return
    }
    if (pollingTimer) {
        return
    }
    pollingTimer = window.setInterval(() => {
        loadArticle(false, true)
    }, 3000)
}


// 返回
/**
 * 返回上一页。
 */
const goBack = () => {
    // 沿用浏览器历史栈返回
    router.back()
}

// 导出 Markdown
/**
 * 导出当前文章为 Markdown 文件。
 */
const exportMarkdown = () => {
    // 无文章数据时不执行导出
    if (!article.value) return

    // 组装文件头部内容
    let markdown = `# ${article.value.mainTitle}\n\n`
    markdown += `> ${article.value.subTitle}\n\n`
    const coverImage = resolveArticleCoverImage(article.value)

    // 优先使用完整图文
    if (article.value.fullContent) {
        markdown += buildArticleMarkdown(article.value)
    } else {
        if (article.value.outline && article.value.outline.length > 0) {
            markdown += `## 目录\n\n`
            article.value.outline.forEach(item => {
                // 输出目录编号与标题
                markdown += `${item.section}. ${item.title}\n`
            })
            markdown += `\n---\n\n`
        }

        markdown += buildArticleMarkdown(article.value)

        if (article.value.images && article.value.images.length > 0) {
            markdown += `\n\n## 配图\n\n`
            article.value.images
                .filter(image => image.position !== 1 && image.url !== coverImage)
                .forEach(image => {
                    // 将配图拼接为 markdown 图片语法
                    markdown += `![${image.description}](${image.url})\n\n`
                })
        }
    }

    // 通过 Blob 触发浏览器下载
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${article.value.mainTitle}.md`
    a.click()
    URL.revokeObjectURL(url)

    message.success('导出成功')
}

// 格式化日期
/**
 * 格式化时间字符串用于页面展示。
 */
const formatDate = (date: string) => {
    // 详情页使用秒级精度
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取状态颜色
/**
 * 将后端状态映射为标签颜色。
 */
const getStatusColor = (status: string) => {
    // 状态与标签色的映射表
    const colorMap: Record<string, string> = {
        PENDING: 'default',
        PROCESSING: 'processing',
        COMPLETED: 'success',
        FAILED: 'error',
    }
    return colorMap[status] || 'default'
}

// 获取状态文本
/**
 * 将状态码映射为中文文案。
 */
const getStatusText = (status: string) => {
    // 状态与中文文案映射
    const textMap: Record<string, string> = {
        PENDING: '等待中',
        PROCESSING: '生成中',
        COMPLETED: '已完成',
        FAILED: '失败',
    }
    return textMap[status] || status
}

// 获取智能体显示名称
/**
 * 将执行节点名称转换为用户可读文本。
 */
const getAgentDisplayName = (agentName: string) => {
    // 执行节点英文名与展示名映射
    const nameMap: Record<string, string> = {
        'agent1_generate_titles': '生成标题',
        'agent2_generate_outline': '生成大纲',
        'agent3_generate_content': '生成正文',
        'agent4_analyze_image_requirements': '分析配图需求',
        'agent5_generate_images': '生成配图',
        'agent6_merge_content': '图文合成',
        'ai_modify_outline': 'AI修改大纲'
    }
    return nameMap[agentName] || agentName
}

// 从指定阶段重跑
/**
 * 复用当前任务，从指定生成阶段重新开始。
 */
const triggerPhaseRestart = (targetPhase: string, title: string, content: string) => {
    if (!article.value?.taskId) return

    Modal.confirm({
        title,
        content,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
            try {
                await restartArticlePhase({
                    taskId: article.value?.taskId,
                    targetPhase,
                })
                message.success('任务已重新启动')
                await loadArticle(false, true)
            } catch (error) {
                message.error((error as Error).message || '重跑失败')
            }
        }
    })
}

/**
 * 失败任务直接按当前生成阶段重试。
 */
const handleRetryCurrentPhase = () => {
    if (!article.value?.phase) return
    triggerPhaseRestart(
        article.value.phase,
        '确认重试当前阶段',
        '将保留当前任务，清空当前阶段的旧结果并重新执行，是否继续？'
    )
}

/**
 * 从大纲阶段重跑，适合想保留标题但重做后续内容的场景。
 */
const handleRestartOutline = () => {
    triggerPhaseRestart(
        'OUTLINE_GENERATING',
        '确认从大纲重跑',
        '将保留已确认标题，清空旧大纲、正文和配图结果，并重新生成后续内容。是否继续？'
    )
}

/**
 * 从正文阶段重跑，适合保留标题和大纲，只重做正文与配图。
 */
const handleRestartContent = () => {
    triggerPhaseRestart(
        'CONTENT_GENERATING',
        '确认从正文重跑',
        '将保留当前标题和大纲，清空旧正文与配图结果，并重新生成图文。是否继续？'
    )
}

onMounted(() => {
    // 页面进入时自动拉取详情
    loadArticle()
})

onUnmounted(() => {
    stopPolling()
})
</script>

<style scoped lang="scss">
@use './css/articleDetail.scss';
</style>
