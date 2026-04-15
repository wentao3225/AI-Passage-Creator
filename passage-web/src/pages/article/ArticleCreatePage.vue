<template>
    <div class="article-create-page">
        <!-- 三栏布局容器 -->
        <div class="create-layout">
            <!-- 左侧：智能体流程可视化 -->
            <aside class="sidebar-left">
                <div class="sidebar-header">
                    <h3 class="sidebar-title">创作流程</h3>
                    <p class="sidebar-subtitle">智能体协作可视化</p>
                </div>

                <div class="flow-timeline">
                    <div v-for="(step, index) in agentSteps" :key="index" :class="['flow-item', {
                        'active': currentStep === index,
                        'completed': currentStep > index,
                        'pending': currentStep < index
                    }]">
                        <div class="flow-indicator">
                            <LoadingOutlined v-if="currentStep === index && isCreating" class="spin-icon" />
                            <CheckCircleOutlined v-else-if="currentStep > index" />
                            <span v-else class="step-number">{{ index + 1 }}</span>
                        </div>

                        <div class="flow-content">
                            <div class="flow-title">{{ step.title }}</div>
                            <div class="flow-desc">{{ step.description }}</div>
                            <div v-if="currentStep === index && isCreating" class="flow-status">
                                <span class="status-dot"></span>
                                执行中...
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- 中间：主内容区 -->
            <main ref="mainContentRef" class="main-content">
                <!-- 输入状态 -->
                <div v-if="!isCreating && !isCompleted" class="input-state">
                    <div class="input-card">
                        <div class="input-header">
                            <h1 class="input-title">创作新文章</h1>
                            <p class="input-subtitle">输入选题，AI 帮你生成爆款文章</p>
                        </div>

                        <div class="input-area">
                            <a-textarea v-model:value="topic" placeholder="请输入您想创作的文章选题，例如：2026年AI如何改变职场" :rows="6"
                                :maxlength="500" show-count class="topic-textarea" />
                            <a-button type="primary" size="large" :loading="isCreating" :disabled="!topic.trim()"
                                @click="startCreate" class="create-btn">
                                <template #icon>
                                    <RocketOutlined />
                                </template>
                                开始创作
                            </a-button>
                        </div>
                    </div>
                </div>
                <!-- 创作进行中 -->
                <div v-if="isCreating && !isCompleted" class="creating-state">
                    <!-- 标题预览 -->
                    <div v-if="article.mainTitle" class="preview-header">
                        <h1 class="article-title">{{ article.mainTitle }}</h1>
                        <p class="article-subtitle">{{ article.subTitle }}</p>
                    </div>

                    <!-- 大纲预览（流式解析展示） -->
                    <div v-if="outlineRaw" class="outline-preview">
                        <div class="section-label">
                            <BulbOutlined />
                            <span>文章大纲</span>
                            <span v-if="isOutlineStreaming" class="typing-cursor">|</span>
                        </div>

                        <div class="outline-list">
                            <div v-for="item in parsedOutline" :key="item.section" class="outline-item">
                                <div class="outline-title">{{ item.section }}. {{ item.title }}</div>
                                <ul class="outline-points">
                                    <li v-for="(point, idx) in item.points" :key="idx">{{ point }}</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- 正文预览（流式输出） -->
                    <div v-if="article.content" class="content-preview">
                        <div v-html="markdownToHtml(article.content)" class="markdown-body"></div>
                        <span v-if="isStreaming" class="typing-cursor">|</span>
                    </div>

                    <!-- 配图进度 -->
                    <div v-if="currentStep === 4 && imageProgress > 0" class="image-progress-box">
                        <div class="progress-header">
                            <PictureOutlined />
                            <span>正在生成配图</span>
                        </div>
                        <a-progress :percent="imageProgress" status="active"
                            :stroke-color="{ from: '#22C55E', to: '#16A34A' }" />
                        <p class="progress-hint">{{ imageCount }}/{{ totalImages }} 张图片已完成</p>
                    </div>

                    <!-- 加载占位 -->
                    <div v-if="currentStep === 0 && !article.mainTitle" class="loading-placeholder">
                        <a-spin size="large" />
                        <p>AI 正在构思标题...</p>
                    </div>
                </div>
                <!-- 创作完成 -->
                <div v-if="isCompleted" class="completed-state">
                    <div class="success-header">
                        <CheckCircleFilled class="success-icon" />
                        <span>文章创作完成！</span>

                    </div>

                    <div class="preview-header">
                        <h1 class="article-title">{{ article.mainTitle }}</h1>

                        <p class="article-subtitle">{{ article.subTitle }}</p>

                    </div>

                    <div class="content-preview">
                        <div v-html="markdownToHtml(article.fullContent || article.content)" class="markdown-body">
                        </div>
                    </div>

                </div>
            </main>
            <!-- 右侧：辅助面板 -->
            <aside class="sidebar-right">
                <!-- 热门选题 -->
                <div v-if="!isCreating && !isCompleted" class="panel-section">
                    <h4 class="panel-title">
                        <BulbOutlined />
                        热门选题
                    </h4>

                    <div class="hot-tags">
                        <span v-for="example in exampleTopics" :key="example" class="hot-tag" @click="topic = example">
                            {{ example }}
                        </span>
                    </div>
                </div>

                <!-- 创作技巧 -->
                <div v-if="!isCreating && !isCompleted" class="panel-section">
                    <h4 class="panel-title">
                        <StarOutlined />
                        爆款技巧
                    </h4>
                    <div class="tips-list">
                        <div class="tip-item">
                            <div class="tip-icon">1</div>
                            <div class="tip-content">
                                <div class="tip-title">抓住痛点</div>
                                <div class="tip-desc">直击用户最关心的问题</div>
                            </div>
                        </div>

                        <div class="tip-item">
                            <div class="tip-icon">2</div>
                            <div class="tip-content">
                                <div class="tip-title">制造悬念</div>
                                <div class="tip-desc">让读者产生好奇心</div>
                            </div>
                        </div>

                        <div class="tip-item">
                            <div class="tip-icon">3</div>
                            <div class="tip-content">
                                <div class="tip-title">数字吸引</div>
                                <div class="tip-desc">使用具体数据增加说服力</div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 创作进行中的提示 -->
                <div v-if="isCreating && !isCompleted" class="panel-section">
                    <h4 class="panel-title">
                        <ClockCircleOutlined />
                        创作进度
                    </h4>

                    <div class="progress-info">
                        <div class="progress-step">
                            <span class="step-label">当前步骤</span>
                            <span class="step-value">{{ agentSteps[currentStep]?.title }}</span>
                        </div>
                        <div class="progress-step">
                            <span class="step-label">已完成</span>
                            <span class="step-value">{{ currentStep }}/{{ agentSteps.length }}</span>
                        </div>
                    </div>

                    <div class="progress-tip">
                        <InfoCircleOutlined />
                        <span>AI 正在努力创作中，请耐心等待...</span>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
import { createArticle } from '@/api/articleController';
import { closeSSE, connectSSE } from '@/utils/sse';
import type { SSEMessage } from '@/utils/sse';
import { message } from 'ant-design-vue';
import { marked } from 'marked';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter()
const route = useRoute()

// 智能体步骤（对应后端 6 个步骤）
const agentSteps = [
    { title: '生成标题', description: 'AI 分析选题，生成吸睛标题' },
    { title: '规划大纲', description: '构建文章结构，理清脉络' },
    { title: '撰写正文', description: '流式生成高质量文章内容' },
    { title: '分析配图', description: '智能分析配图需求和位置' },
    { title: '生成配图', description: '自动匹配高清无版权图片' },
    { title: '图文合成', description: '将配图插入正文，完美呈现' },
]

// 示例选题
const exampleTopics = [
    '2026年AI如何改变职场',
    '程序员如何提升竞争力',
    '远程办公的利与弊',
    '如何培养深度思考',
    '新能源汽车趋势',
    '健康饮食指南',
]

// 页面状态
const topic = ref('')
const isCreating = ref(false)
const isCompleted = ref(false)
const isStreaming = ref(false)
const isOutlineStreaming = ref(false)
const currentStep = ref(0)
const taskId = ref('')
const errorVisible = ref(false)
const errorMessage = ref('')

// 大纲数据（流式）
const outlineRaw = ref('')

// 配图进度
const imageCount = ref(0)
const totalImages = ref(5)
const imageProgress = ref(0)

// 文章数据
const article = ref<Partial<API.ArticleVO>>({
    mainTitle: '',
    subTitle: '',
    content: '',
    fullContent: '',
    images: [],
})

// SSE 连接实例
let eventSource: EventSource | null = null

// 内容区域引用（用于自动滚动）
const mainContentRef = ref<HTMLElement | null>(null)

// 大纲项类型
interface OutlineItem {
    title: string
    points: string[]
    section: number
}

// 解析大纲 JSON（格式为 { "sections": [...] }）
const parsedOutline = computed<OutlineItem[]>(() => {
    // 还没有任何流式内容时直接返回空数组
    if (!outlineRaw.value) return []

    const str = outlineRaw.value.trim()

    // 尝试解析完整的 JSON
    try {
        const parsed = JSON.parse(str)
        if (parsed && Array.isArray(parsed.sections)) {
            // 完整结构下直接返回 sections
            return parsed.sections
        }
        return []
    } catch {
        // JSON 不完整时，尝试解析已完成的部分
        try {
            const sectionsMatch = str.match(/"sections"\s*:\s*\[/)
            if (!sectionsMatch) return []

            const sectionsStart = str.indexOf('[', sectionsMatch.index)
            if (sectionsStart === -1) return []

            const afterStart = str.substring(sectionsStart)
            const lastBrace = afterStart.lastIndexOf('}')

            if (lastBrace > 0) {
                // 将已闭合的对象片段拼成数组，提升流式阶段可视化体验
                const partialArray = afterStart.substring(0, lastBrace + 1) + ']'
                const parsed = JSON.parse(partialArray)
                if (Array.isArray(parsed)) {
                    return parsed
                }
            }
            return []
        } catch {
            return []
        }
    }
})


// Markdown 转 HTML
/**
 * 将 Markdown 文本转换为可渲染 HTML。
 */
const markdownToHtml = (markdown?: string) => {
    // marked 允许空串输入，这里统一兜底为空字符串
    return marked(markdown ?? '')
}

// 自动滚动到底部
/**
 * 在下一次 DOM 刷新后滚动主内容区到底部。
 */
const scrollToBottom = () => {
    nextTick(() => {
        if (mainContentRef.value) {
            // 保持流式输出时视口始终跟随最新内容
            mainContentRef.value.scrollTop = mainContentRef.value.scrollHeight
        }
    })
}

// 开始创作
/**
 * 创建文章任务并建立 SSE 连接。
 */
const startCreate = async () => {
    // 选题为空时不发请求
    if (!topic.value.trim()) {
        message.warning('请输入选题')
        return
    }

    // 初始化页面进度状态
    isCreating.value = true
    currentStep.value = 0

    try {
        // 创建任务
        const res = await createArticle({ topic: topic.value })
        taskId.value = res.data.data ?? ''

        // 建立 SSE 连接
        eventSource = connectSSE(taskId.value, {
            onMessage: handleSSEMessage,
            onError: handleSSEError,
            onComplete: handleSSEComplete,
        })
    } catch (error: any) {
        // 请求失败时退出创作态，允许用户重试
        message.error(error.message || '创建任务失败')
        isCreating.value = false
    }
}

// 处理 SSE 消息
/**
 * 按消息类型驱动页面状态机。
 */
const handleSSEMessage = (msg: SSEMessage) => {
    console.log('SSE消息:', msg)

    switch (msg.type) {
        case 'AGENT1_COMPLETE':
            // 标题生成完成
            currentStep.value = 1
            article.value.mainTitle = msg.title?.mainTitle
            article.value.subTitle = msg.title?.subTitle
            break

        case 'AGENT2_STREAMING':
            // 大纲流式输出
            isOutlineStreaming.value = true
            outlineRaw.value += msg.content || ''
            scrollToBottom()
            break

        case 'AGENT2_COMPLETE':
            // 大纲完成
            isOutlineStreaming.value = false
            currentStep.value = 2
            break

        case 'AGENT3_STREAMING':
            // 正文流式输出
            isStreaming.value = true
            article.value.content += msg.content || ''
            scrollToBottom()
            break

        case 'AGENT3_COMPLETE':
            // 正文完成
            isStreaming.value = false
            currentStep.value = 3
            break

        case 'AGENT4_COMPLETE':
            // 配图分析完成
            currentStep.value = 4
            totalImages.value = msg.imageRequirements?.length || 5
            break

        case 'IMAGE_COMPLETE':
            // 单张配图完成
            imageCount.value++
            imageProgress.value = Math.round((imageCount.value / totalImages.value) * 100)
            break

        case 'AGENT5_COMPLETE':
            // 所有配图完成
            currentStep.value = 5
            article.value.images = msg.images
            break

        case 'MERGE_COMPLETE':
            // 图文合成完成
            article.value.fullContent = msg.fullContent
            scrollToBottom()
            break

        case 'ALL_COMPLETE':
            // 全部完成
            currentStep.value = 6
            isCompleted.value = true
            message.success('文章创作完成!')
            break

        case 'ERROR':
            // 发生错误时终止创作流程并展示错误信息
            errorMessage.value = msg.message || '创作失败'
            errorVisible.value = true
            isCreating.value = false
            break
    }
}

// 处理 SSE 错误
/**
 * 处理 SSE 链路异常并提示用户。
 */
const handleSSEError = (error: Event) => {
    console.error('SSE错误:', error)
    // 连接异常时允许 EventSource 自动重连，避免任务仍在后台执行但前端提前失败
    message.warning({ content: '连接波动，正在自动重连...', key: 'sse-reconnect', duration: 1.5 })
}

// 处理 SSE 完成
/**
 * SSE 连接结束回调。
 */
const handleSSEComplete = () => {
    // 仅记录连接结束，业务完成由消息类型决定
    console.log('SSE连接关闭')
}

// 复制全文
/**
 * 复制最终内容到系统剪贴板。
 */
const copyContent = async () => {
    // 优先复制含配图版本，其次正文版本
    const content = article.value.fullContent || article.value.content || ''
    try {
        await navigator.clipboard.writeText(content)
        message.success('已复制到剪贴板')
    } catch {
        // 浏览器权限或环境不支持时给出失败提示
        message.error('复制失败')
    }
}

// 查看文章详情
/**
 * 跳转到当前任务对应的详情页。
 */
const viewArticle = () => {
    // 使用 taskId 定位当前文章详情
    router.push(`/article/${taskId.value}`)
}

// 重新创作
/**
 * 重置页面状态，回到初始输入态。
 */
const resetCreate = () => {
    // 逐项重置可观察状态，避免残留历史数据
    topic.value = ''
    isCreating.value = false
    isCompleted.value = false
    isStreaming.value = false
    isOutlineStreaming.value = false
    currentStep.value = 0
    imageCount.value = 0
    imageProgress.value = 0
    outlineRaw.value = ''
    article.value = {
        mainTitle: '',
        subTitle: '',
        content: '',
        fullContent: '',
        images: [],
    }
}

// 组件挂载时检查路由参数
onMounted(() => {
    // 允许通过路由参数预填选题
    if (route.query.topic) {
        topic.value = route.query.topic as string
    }
})

// 组件卸载前关闭 SSE
onBeforeUnmount(() => {
    // 释放 EventSource 连接，避免内存泄露
    closeSSE(eventSource)
})

</script>
<style scoped lang="scss">
@use './css/articleCreate.scss';
</style>
