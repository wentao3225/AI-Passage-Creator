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
                <!-- 阶段切换（带过渡动画） -->
                <Transition name="fade-slide" mode="out-in">
                    <!-- 输入状态 -->
                    <div v-if="currentPhase === 'INPUT'" key="input" class="input-state">
                        <div class="input-card">
                            <div class="input-header">
                                <h1 class="input-title">创作新文章</h1>
                                <p class="input-subtitle">输入选题，AI 帮你生成爆款文章</p>
                            </div>

                            <div class="input-area">
                                <a-textarea v-model:value="topic" placeholder="请输入您想创作的文章选题，例如：2026年AI如何改变职场" :rows="6"
                                    :maxlength="500" show-count class="topic-textarea" />

                                <!-- 文章风格选择 -->
                                <div class="style-section">
                                    <div class="section-header">
                                        <span class="section-title">文章风格</span>
                                        <span class="section-tip">（不选择使用默认风格）</span>
                                    </div>
                                    <a-radio-group v-model:value="selectedStyle" class="style-group">
                                        <a-radio value="">默认</a-radio>
                                        <a-radio value="tech">科技风格</a-radio>
                                        <a-radio value="emotional">情感风格</a-radio>
                                        <a-radio value="educational">教育风格</a-radio>
                                        <a-radio value="humorous">轻松幽默</a-radio>
                                    </a-radio-group>
                                </div>

                                <!-- 配图方式选择 -->
                                <div class="image-methods-section">
                                    <div class="section-header">
                                        <span class="section-title">允许使用的配图方式</span>
                                        <span class="section-tip">（不选择表示允许所有方式）</span>
                                    </div>
                                    <a-checkbox-group v-model:value="selectedImageMethods" class="methods-group">
                                        <a-checkbox value="PEXELS">Pexels</a-checkbox>
                                        <a-checkbox value="MERMAID">Mermaid</a-checkbox>
                                        <a-checkbox value="ICONIFY">Iconify</a-checkbox>
                                        <a-checkbox value="EMOJI_PACK">表情包</a-checkbox>
                                        <a-checkbox value="SVG_DIAGRAM">SVG</a-checkbox>
                                    </a-checkbox-group>
                                </div>

                                <a-button type="primary" size="large" :loading="isCreating" @click="startCreate"
                                    class="create-btn">
                                    <template #icon>
                                        <RocketOutlined />
                                    </template>
                                    {{ isCreating ? '正在生成标题中...' : '开始创作' }}
                                </a-button>
                            </div>
                        </div>
                    </div>

                    <!-- 标题生成中 -->
                    <div v-else-if="currentPhase === 'TITLE_GENERATING'" key="title-generating" class="loading-stage">
                        <a-spin size="large" />
                        <h3>AI 正在生成标题方案...</h3>
                        <p>稍等片刻，即将为您呈现多个精彩标题</p>
                    </div>

                    <!-- 标题选择阶段 -->
                    <TitleSelectingStage v-else-if="currentPhase === 'TITLE_SELECTING'" key="title-selecting"
                        :title-options="titleOptions" :loading="confirmLoading"
                        :regenerate-loading="regenerateTitleLoading" @confirm="handleConfirmTitle"
                        @regenerate="handleRegenerateTitles" />

                    <!-- 大纲生成中（流式展示） -->
                    <div v-else-if="currentPhase === 'OUTLINE_GENERATING'" key="outline-generating"
                        class="outline-generating-state">
                        <!-- 标题预览 -->
                        <div v-if="article.mainTitle" class="preview-header">
                            <h1 class="article-title">{{ article.mainTitle }}</h1>
                            <p class="article-subtitle">{{ article.subTitle }}</p>
                        </div>

                        <!-- 大纲流式展示 -->
                        <div class="outline-preview">
                            <div class="section-label">
                                <BulbOutlined />
                                <span>AI 正在规划文章大纲</span>
                                <span class="typing-cursor">|</span>
                            </div>
                            <div v-if="parsedOutline.length > 0" class="outline-list">
                                <div v-for="item in parsedOutline" :key="item.section" class="outline-item fade-in">
                                    <div class="outline-title">{{ item.section }}. {{ item.title }}</div>
                                    <ul class="outline-points">
                                        <li v-for="(point, idx) in item.points" :key="idx">{{ point }}</li>
                                    </ul>
                                </div>
                            </div>
                            <div v-else class="outline-loading">
                                <a-spin />
                                <span>正在构建文章结构...</span>
                            </div>
                        </div>
                    </div>

                    <!-- 大纲编辑阶段 -->
                    <OutlineEditingStage v-else-if="currentPhase === 'OUTLINE_EDITING'" key="outline-editing"
                        :outline="outline" :loading="confirmLoading" :task-id="taskId"
                        @confirm="handleConfirmOutline" />

                    <!-- 正文生成阶段 -->
                    <div v-else-if="currentPhase === 'CONTENT_GENERATING'" key="content-generating"
                        class="creating-state">
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

                        <!-- 在正文预览之前，插入搜索状态指示 -->
                        <div v-if="isSearching" class="search-indicator">
                            <a-spin size="small" />
                            <span class="search-text">
                                <span class="search-label">调用工具</span>
                                <code class="search-tool">web_search</code>
                                <span class="search-query">{{ currentSearchQuery }}</span>
                            </span>
                            <span class="search-status">第 {{ currentReactRound }}/3 轮</span>
                        </div>

                        <!-- 正文预览（流式输出） -->
                        <div v-if="article.content" class="content-preview">
                            <div v-html="markdownToHtml(article.content)" class="markdown-body"></div>
                            <span v-if="isStreaming" class="typing-cursor">|</span>
                        </div>

                        <!-- 配图进度 -->
                        <div v-if="currentStep >= 4 && currentStep <= 5 && totalImages > 0" class="image-progress-box">
                            <div class="progress-header">
                                <PictureOutlined />
                                <span>{{ currentStep === 5 ? '配图生成完成，正在合成图文' : '正在生成配图' }}</span>
                            </div>
                            <a-progress :percent="imageProgress" :status="currentStep === 5 ? 'success' : 'active'"
                                :stroke-color="{ from: '#22C55E', to: '#16A34A' }" />
                            <p class="progress-hint">
                                {{ currentStep === 5
                                    ? `${imageCount}/${totalImages} 张图片已完成，正在合成正文`
                                    : `${imageCount}/${totalImages} 张图片已完成` }}
                            </p>
                        </div>

                        <!-- 加载占位 -->
                        <div v-if="currentStep === 0 && !article.mainTitle" class="loading-placeholder">
                            <a-spin size="large" />
                            <p>AI 正在构思标题...</p>
                        </div>
                    </div>

                    <!-- 创作完成 -->
                    <div v-else-if="currentPhase === 'COMPLETED'" key="completed" class="completed-state">
                        <div class="success-header">
                            <CheckCircleFilled class="success-icon" />
                            <span>文章创作完成！</span>
                        </div>

                        <div class="preview-header">
                            <h1 class="article-title">{{ article.mainTitle }}</h1>
                            <p class="article-subtitle">{{ article.subTitle }}</p>
                        </div>
                        <div class="content-preview">
                            <div v-html="markdownToHtml(completedArticleMarkdown)" class="markdown-body"></div>
                        </div>
                    </div>
                </Transition>
            </main>

            <!-- 右侧：辅助面板 -->
            <aside class="sidebar-right">

                <!-- 热门选题 -->
                <div v-if="currentPhase === 'INPUT'" class="panel-section">
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
                <div v-if="currentPhase === 'INPUT'" class="panel-section">
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

                <!-- 创作进行中的提示（所有创作阶段） -->
                <div v-if="isCreating || currentPhase === 'TITLE_SELECTING' || currentPhase === 'OUTLINE_EDITING'"
                    class="panel-section">
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
                    <div v-if="isCreating" class="progress-tip">
                        <InfoCircleOutlined />
                        <span>AI 正在努力创作中，请耐心等待...</span>
                    </div>
                    <div v-else class="progress-tip waiting">
                        <InfoCircleOutlined />
                        <span>等待您的确认...</span>
                    </div>
                </div>

                <!-- 实时执行日志 -->
                <div v-if="realtimeLogs.length > 0" class="panel-section realtime-logs-section">
                    <h4 class="panel-title">
                        <FileTextOutlined />
                        执行日志
                    </h4>
                    <div class="logs-container">
                        <div v-for="(log, index) in realtimeLogs" :key="index" :class="['log-entry', log.level]">
                            <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                            <span class="log-message">{{ log.message }}</span>
                        </div>
                    </div>
                </div>

                <!-- 当前选题提示 -->
                <div v-if="currentPhase !== 'INPUT' && currentPhase !== 'COMPLETED' && topic" class="panel-section">
                    <h4 class="panel-title">
                        <BulbOutlined />
                        创作选题
                    </h4>
                    <div class="topic-display">
                        <p>{{ topic }}</p>
                    </div>
                </div>

                <!-- 阶段提示 -->
                <div v-if="currentPhase === 'TITLE_GENERATING'" class="panel-section tips-section">
                    <h4 class="panel-title">
                        <StarOutlined />
                        提示
                    </h4>
                    <div class="tips-list">
                        <div class="tip-item">
                            <div class="tip-icon">💡</div>
                            <div class="tip-content">
                                <div class="tip-desc">AI 正在分析您的选题，生成多个吸引眼球的标题方案</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentPhase === 'TITLE_SELECTING'" class="panel-section tips-section">
                    <h4 class="panel-title">
                        <StarOutlined />
                        提示
                    </h4>
                    <div class="tips-list">
                        <div class="tip-item">
                            <div class="tip-icon">✅</div>
                            <div class="tip-content">
                                <div class="tip-desc">选择最符合您期望的标题，或添加补充描述让 AI 更好地理解您的需求</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentPhase === 'OUTLINE_GENERATING'" class="panel-section tips-section">
                    <h4 class="panel-title">
                        <StarOutlined />
                        提示
                    </h4>
                    <div class="tips-list">
                        <div class="tip-item">
                            <div class="tip-icon">📝</div>
                            <div class="tip-content">
                                <div class="tip-desc">AI 正在为您规划文章结构，构建清晰的章节脉络</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentPhase === 'OUTLINE_EDITING'" class="panel-section tips-section">
                    <h4 class="panel-title">
                        <StarOutlined />
                        编辑技巧
                    </h4>
                    <div class="tips-list">
                        <div class="tip-item">
                            <div class="tip-icon">1</div>
                            <div class="tip-content">
                                <div class="tip-title">拖动排序</div>
                                <div class="tip-desc">点击章节左侧拖动图标可调整章节顺序</div>
                            </div>
                        </div>
                        <div class="tip-item">
                            <div class="tip-icon">2</div>
                            <div class="tip-content">
                                <div class="tip-title">AI 助手</div>
                                <div class="tip-desc">使用 AI 助手快速修改大纲结构</div>
                            </div>
                        </div>
                        <div class="tip-item">
                            <div class="tip-icon">3</div>
                            <div class="tip-content">
                                <div class="tip-title">添加章节</div>
                                <div class="tip-desc">根据需要添加或删除章节和要点</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div v-if="currentPhase === 'COMPLETED'" class="panel-section">
                    <h4 class="panel-title">
                        <ThunderboltOutlined />
                        快捷操作
                    </h4>
                    <div class="action-list">
                        <a-button block @click="copyContent" class="action-btn">
                            <CopyOutlined />
                            复制全文
                        </a-button>
                        <a-button block @click="viewArticle" class="action-btn">
                            <EyeOutlined />
                            查看详情
                        </a-button>
                        <a-button block type="primary" @click="resetCreate" class="action-btn primary">
                            <RedoOutlined />
                            再创作一篇
                        </a-button>
                    </div>
                </div>

                <!-- 完成后的统计 -->
                <div v-if="currentPhase === 'COMPLETED'" class="panel-section stats-section">
                    <h4 class="panel-title">
                        <BarChartOutlined />
                        文章统计
                    </h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">{{ (article.fullContent || article.content || '').length }}</div>
                            <div class="stat-label">字数</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ article.images?.length || 0 }}</div>
                            <div class="stat-label">配图</div>
                        </div>
                    </div>
                </div>

                <!-- 底部帮助链接 -->
                <div class="panel-footer">
                    <a class="help-link">
                        <QuestionCircleOutlined />
                        使用帮助
                    </a>
                    <a class="help-link">
                        <MessageOutlined />
                        反馈建议
                    </a>
                </div>
            </aside>
        </div>

        <!-- 错误提示 -->
        <a-modal v-model:open="errorVisible" title="创作失败" @ok="errorVisible = false">
            <p>{{ errorMessage }}</p>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// @ts-ignore: ant-design-vue declaration file missing in current project setup
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/loginUser'
import {
    RocketOutlined,
    LoadingOutlined,
    CheckCircleOutlined,
    CheckCircleFilled,
    CopyOutlined,
    EyeOutlined,
    RedoOutlined,
    ThunderboltOutlined,
    BulbOutlined,
    StarOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
    BarChartOutlined,
    QuestionCircleOutlined,
    MessageOutlined,
    PictureOutlined,
    FileTextOutlined
} from '@ant-design/icons-vue'
import { createArticle, confirmTitle, confirmOutline, regenerateTitles } from '@/api/articleController'
import { connectSSE, closeSSE, type SSEMessage } from '@/utils/sse'
import { buildArticleMarkdown, markdownToHtml } from '@/utils/markdown'
import TitleSelectingStage from './components/TitleSelectingStage.vue'
import OutlineEditingStage from './components/OutlineEditingStage.vue'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

// 智能体步骤（对应后端 6 个步骤）
const agentSteps = [
    { title: '生成标题', description: 'AI 分析选题，生成吸睛标题' },
    { title: '规划大纲', description: '构建文章结构，理清脉络' },
    { title: '撰写正文', description: '流式生成高质量文章内容' },
    { title: '内容评估', description: 'AI 评估正文质量' },
    { title: '内容增强', description: '针对薄弱环节优化' },
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
    '对日开发转国内开发',
    '健康饮食指南',
]

// 阶段状态
const currentPhase = ref<string>('INPUT')  // INPUT, TITLE_SELECTING, OUTLINE_EDITING, CONTENT_GENERATING, COMPLETED

// 状态
const topic = ref('')
const selectedStyle = ref('')  // 选中的文章风格（空字符串表示默认）
const selectedImageMethods = ref<string[]>([])  // 允许使用的配图方式（空数组表示允许全部）
const isCreating = ref(false)
const isCompleted = ref(false)
const isStreaming = ref(false)
const isOutlineStreaming = ref(false)
const currentStep = ref(0)
const taskId = ref('')
const errorVisible = ref(false)
const errorMessage = ref('')
const confirmLoading = ref(false)
const regenerateTitleLoading = ref(false)
// ReAct 工具调用相关状态
const currentReactSection = ref('')
const currentReactRound = ref(0)
const isSearching = ref(false)
const currentSearchQuery = ref('')

// 实时日志
interface RealtimeLog {
    timestamp: number
    level: string
    message: string
}
const realtimeLogs = ref<RealtimeLog[]>([])
const hasLoggedOutlineStart = ref(false)
const hasLoggedContentStart = ref(false)
const hasLoggedImageAnalysisStart = ref(false)
const hasLoggedImageGenerationStart = ref(false)

// 标题方案
const titleOptions = ref<Array<{ mainTitle: string, subTitle: string }>>([])

// 大纲数据
const outline = ref<Array<{ section: number, title: string, points: string[] }>>([])

// 大纲数据（流式）
const outlineRaw = ref('')

// 大纲项类型
interface OutlineItem {
    title: string
    points: string[]
    section: number
}

// 解析大纲 JSON（格式为 { "sections": [...] }）
const parsedOutline = computed<OutlineItem[]>(() => {
    if (!outlineRaw.value) return []

    const str = outlineRaw.value.trim()

    // 尝试解析完整的 JSON
    try {
        const parsed = JSON.parse(str)
        if (parsed && Array.isArray(parsed.sections)) {
            return parsed.sections
        }
        return []
    } catch {
        // JSON 不完整时，尝试解析已完成的部分
        try {
            // 找到最后一个完整的 section 对象 }
            // 格式: { "sections": [ {...}, {...} ] }
            const sectionsMatch = str.match(/"sections"\s*:\s*\[/)
            if (!sectionsMatch) return []

            const sectionsStart = str.indexOf('[', sectionsMatch.index)
            if (sectionsStart === -1) return []

            // 从 sections 数组开始，找到最后一个完整的 }
            const afterStart = str.substring(sectionsStart)
            const lastBrace = afterStart.lastIndexOf('}')

            if (lastBrace > 0) {
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

// 内容区域引用（用于自动滚动）
const mainContentRef = ref<HTMLElement | null>(null)

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

const completedArticleMarkdown = computed(() => buildArticleMarkdown(article.value))

let eventSource: EventSource | null = null

// 自动滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        if (mainContentRef.value) {
            mainContentRef.value.scrollTop = mainContentRef.value.scrollHeight
        }
    })
}

// 开始创作
const startCreate = async () => {
    if (!topic.value.trim()) {
        message.warning('请输入选题')
        return
    }

    isCreating.value = true
    currentStep.value = 0
    realtimeLogs.value = []
    resetStageLogFlags()
    addLog('开始创建文章任务...', 'info')

    try {
        // 创建任务
        const res = await createArticle({
            topic: topic.value,
            style: selectedStyle.value || undefined,
            enabledImageMethods: selectedImageMethods.value.length > 0 ? selectedImageMethods.value : undefined
        })
        const newTaskId = res.data.data
        if (!newTaskId) {
            throw new Error('创建任务失败：未返回任务ID')
        }
        taskId.value = newTaskId
        addLog(`任务创建成功，ID: ${newTaskId}`, 'success')

        // 建立 SSE 连接
        addLog('已建立实时连接，开始生成...', 'info')
        eventSource = connectSSE(taskId.value, {
            onMessage: handleSSEMessage,
            onError: handleSSEError,
            onComplete: handleSSEComplete,
        })
    } catch (error) {
        const err = error as Error
        message.error(err.message || '创建任务失败')
        isCreating.value = false
    }
}

// 添加日志
const addLog = (message: string, level: string = 'info') => {
    realtimeLogs.value.push({
        timestamp: Date.now(),
        level,
        message
    })
    // 限制日志数量，最多保留 50 条
    if (realtimeLogs.value.length > 50) {
        realtimeLogs.value.shift()
    }
}

const resetStageLogFlags = () => {
    hasLoggedOutlineStart.value = false
    hasLoggedContentStart.value = false
    hasLoggedImageAnalysisStart.value = false
    hasLoggedImageGenerationStart.value = false
}

// 格式化日志时间
const formatLogTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour12: false })
}

// 处理 SSE 消息
const handleSSEMessage = (msg: SSEMessage) => {
    console.log('SSE消息:', msg)

    switch (msg.type) {
        case 'AGENT1_COMPLETE':
            // 智能体1完成，进入标题生成阶段（显示加载）
            if (!regenerateTitleLoading.value) {
                currentPhase.value = 'TITLE_GENERATING'
            }
            currentStep.value = 1
            addLog(regenerateTitleLoading.value ? '智能体1：新一批标题方案生成完成' : '智能体1：标题方案生成完成', 'success')
            break

        case 'TITLES_GENERATED':
            // 标题方案生成完成，切换到选择标题阶段
            const wasRegeneratingTitles = regenerateTitleLoading.value
            currentPhase.value = 'TITLE_SELECTING'
            titleOptions.value = msg.titleOptions || []
            isCreating.value = false
            regenerateTitleLoading.value = false
            addLog(wasRegeneratingTitles
                ? `已生成新一批标题方案，共 ${msg.titleOptions?.length || 0} 个`
                : `生成了 ${msg.titleOptions?.length || 0} 个标题方案`, 'success')
            break

        case 'AGENT2_STREAMING':
            // 大纲流式输出（显示生成中状态）
            currentPhase.value = 'OUTLINE_GENERATING'
            isOutlineStreaming.value = true
            if (!hasLoggedOutlineStart.value) {
                hasLoggedOutlineStart.value = true
                addLog('智能体2：开始生成大纲', 'info')
            }
            outlineRaw.value += msg.content || ''
            scrollToBottom()
            break

        case 'OUTLINE_GENERATED':
            // 大纲生成完成，切换到编辑大纲阶段
            currentPhase.value = 'OUTLINE_EDITING'
            outline.value = msg.outline || []
            isCreating.value = false
            isOutlineStreaming.value = false
            addLog('智能体2：大纲生成完成，等待确认', 'success')
            // 保持在步骤1（规划大纲），用户编辑大纲时仍处于此阶段
            break

        case 'AGENT2_COMPLETE':
            // 大纲完成（内部处理，已在 OUTLINE_GENERATED 中切换阶段）
            // 不改变 currentStep，保持在步骤1，等用户确认大纲后才进入步骤2
            break

        case 'AGENT3_STREAMING':
            // 正文流式输出，进入步骤2（撰写正文）
            currentPhase.value = 'CONTENT_GENERATING'
            currentStep.value = 2
            isStreaming.value = true
            if (!hasLoggedContentStart.value) {
                hasLoggedContentStart.value = true
                addLog('智能体3：开始生成正文', 'info')
            }
            article.value.content += msg.content || ''
            scrollToBottom()
            break

        case 'AGENT3_COMPLETE':
            // 正文完成，进入配图分析步骤
            isStreaming.value = false
            currentStep.value = 3
            message.info('正文生成完成，正在分析配图...')
            addLog('智能体3：正文生成完成', 'success')
            if (!hasLoggedImageAnalysisStart.value) {
                hasLoggedImageAnalysisStart.value = true
                addLog('智能体4：开始分析配图需求', 'info')
            }
            break

        case 'AGENT4_COMPLETE':
            // 配图分析完成，进入配图生成步骤
            currentStep.value = 4
            imageCount.value = 0
            imageProgress.value = 0
            totalImages.value = msg.imageTotal ?? msg.imageRequirements?.length ?? 5
            addLog(`智能体4：配图需求分析完成，共 ${totalImages.value} 张`, 'success')
            if (!hasLoggedImageGenerationStart.value) {
                hasLoggedImageGenerationStart.value = true
                addLog('智能体5：开始生成配图', 'info')
            }
            break

        case 'IMAGE_COMPLETE':
            // 单张配图完成
            imageCount.value++
            imageProgress.value = Math.round((imageCount.value / totalImages.value) * 100)
            addLog(`智能体5：配图生成中 ${imageCount.value}/${totalImages.value}`, 'info')
            break

        case 'AGENT5_COMPLETE':
            // 所有配图完成，进入图文合成步骤
            currentStep.value = 5
            article.value.images = msg.images
            message.success('配图生成完成，正在合成图文...')
            addLog('智能体5：所有配图生成完成', 'success')
            break

        case 'MERGE_COMPLETE':
            // 图文合成完成
            article.value.fullContent = msg.fullContent
            scrollToBottom()
            addLog('图文合成完成', 'success')
            break

        case 'ALL_COMPLETE':
            // 全部完成
            currentPhase.value = 'COMPLETED'
            currentStep.value = 6
            isCompleted.value = true
            isCreating.value = false
            message.success('文章创作完成!')
            addLog('✨ 文章创作完成！', 'success')
            break

        case 'REACT_SECTION_START':
            currentReactSection.value = msg.content || ''
            currentReactRound.value = 0
            isSearching.value = false
            addLog(`📝 开始撰写章节：${msg.content}`, 'info')
            break

        case 'REACT_THOUGHT': {
            const roundMatch = (msg.content || '').match(/round=(\d+)/)
            currentReactRound.value = roundMatch ? parseInt(roundMatch[1]) : 0
            addLog(`🤔 第 ${currentReactRound.value} 轮：评估是否需要搜索资料`, 'info')
            break
        }

        case 'REACT_TOOL_CALL': {
            isSearching.value = true
            const toolMatch = (msg.content || '').match(/tool=([^,]+)/)
            const queryMatch = (msg.content || '').match(/query=([^,]+)/)
            currentSearchQuery.value = queryMatch ? decodeURIComponent(queryMatch[1]) : ''
            const toolName = toolMatch ? toolMatch[1] : 'web_search'
            addLog(`🔍 [${toolName}] 搜索: ${currentSearchQuery.value}`, 'info')
            // 搜索开始时，将搜索指示器滚动到可视区域
            nextTick(() => {
                document.querySelector('.search-indicator')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            })
            break
        }

        case 'REACT_TOOL_RESULT': {
            // 延迟隐藏搜索指示器，避免因搜索太快（300ms）导致用户看不到
            setTimeout(() => { isSearching.value = false }, 1500)
            const successMatch = (msg.content || '').match(/success=(true|false)/)
            const searchSuccess = successMatch ? successMatch[1] === 'true' : false
            addLog(searchSuccess ? '✅ 搜索完成' : '⚠️ 搜索未返回有效结果', searchSuccess ? 'success' : 'warning')
            break
        }

        case 'AGENT_EVALUATING':
            addLog('📊 正在评估内容质量...', 'info')
            break

        case 'AGENT_ENHANCING':
            addLog('🔧 发现可优化空间，正在增强内容...', 'info')
            break

        case 'AGENT4_ANALYZING':
            addLog('智能体4：正在分析配图需求...', 'info')
            break


        case 'ERROR':
            errorMessage.value = msg.message || '创作失败'
            errorVisible.value = true
            isCreating.value = false
            regenerateTitleLoading.value = false
            currentPhase.value = 'INPUT'
            addLog(`创作失败: ${msg.message || '未知错误'}`, 'error')
            break
    }
}

const handleRegenerateTitles = async () => {
    if (!taskId.value) {
        return
    }

    regenerateTitleLoading.value = true
    addLog('正在重新生成标题方案...', 'info')

    try {
        await regenerateTitles({
            taskId: taskId.value,
        })
    } catch (error) {
        regenerateTitleLoading.value = false
        const err = error as Error
        message.error(err.message || '重新生成标题失败')
        addLog(`重新生成标题失败: ${err.message || '未知错误'}`, 'error')
    }
}

// 确认标题
const handleConfirmTitle = async (data: { mainTitle: string, subTitle: string, userDescription: string }) => {
    confirmLoading.value = true
    try {
        await confirmTitle({
            taskId: taskId.value,
            selectedMainTitle: data.mainTitle,
            selectedSubTitle: data.subTitle,
            userDescription: data.userDescription
        })
        // 保存标题信息，用于大纲生成阶段展示
        article.value.mainTitle = data.mainTitle
        article.value.subTitle = data.subTitle
        // 不直接切换阶段，等待 SSE 消息 OUTLINE_GENERATED
        message.success('标题已确认，正在生成大纲...')
        hasLoggedOutlineStart.value = true
        addLog('智能体2：开始生成大纲', 'info')
    } catch (error) {
        const err = error as Error
        message.error(err.message || '确认标题失败')
    } finally {
        confirmLoading.value = false
    }
}

// 确认大纲
const handleConfirmOutline = async (outlineData: Array<{ section: number, title: string, points: string[] }>) => {
    if (confirmLoading.value) return
    confirmLoading.value = true
    isCreating.value = true
    try {
        await confirmOutline({
            taskId: taskId.value,
            outline: outlineData
        })
        // 更新 outlineRaw 为用户修改后的大纲，确保 CONTENT_GENERATING 阶段展示正确的大纲
        outlineRaw.value = JSON.stringify({ sections: outlineData })
        // 不直接切换阶段，等待后端开始生成正文并推送 AGENT3_STREAMING
        message.success('大纲已确认，正在生成正文...')
        hasLoggedContentStart.value = true
        hasLoggedImageAnalysisStart.value = false
        hasLoggedImageGenerationStart.value = false
        addLog('智能体3：开始生成正文', 'info')
    } catch (error) {
        const err = error as Error
        message.error(err.message || '确认大纲失败')
    } finally {
        confirmLoading.value = false
    }
}

// 处理 SSE 错误
const handleSSEError = (error: Event) => {
    console.error('SSE错误:', error)
    message.error('连接失败,请重试')
    isCreating.value = false
    regenerateTitleLoading.value = false
}

// 处理 SSE 完成
const handleSSEComplete = () => {
    console.log('SSE连接关闭')
}

// 复制全文
const copyContent = async () => {
    const content = completedArticleMarkdown.value
    try {
        await navigator.clipboard.writeText(content)
        message.success('已复制到剪贴板')
    } catch {
        message.error('复制失败')
    }
}

// 查看文章详情
const viewArticle = () => {
    router.push(`/article/${taskId.value}`)
}

// 重新创作
const resetCreate = () => {
    currentPhase.value = 'INPUT'
    topic.value = ''
    selectedStyle.value = ''
    titleOptions.value = []
    outline.value = []
    isCreating.value = false
    isCompleted.value = false
    isStreaming.value = false
    isOutlineStreaming.value = false
    currentStep.value = 0
    imageCount.value = 0
    imageProgress.value = 0
    outlineRaw.value = ''
    confirmLoading.value = false
    regenerateTitleLoading.value = false
    realtimeLogs.value = []
    resetStageLogFlags()
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
    if (route.query.topic) {
        topic.value = route.query.topic as string
    }
})

// 组件卸载前关闭 SSE
onBeforeUnmount(() => {
    closeSSE(eventSource)
})
</script>

<style scoped lang="scss">
@use './css/articleCreate.scss';
</style>
