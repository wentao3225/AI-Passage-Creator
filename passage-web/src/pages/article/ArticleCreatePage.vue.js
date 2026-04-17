import { ref, onBeforeUnmount, onMounted, nextTick, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import { useLoginUserStore } from '@/stores/loginUser';
import { RocketOutlined, LoadingOutlined, CheckCircleOutlined, CheckCircleFilled, CopyOutlined, EyeOutlined, RedoOutlined, ThunderboltOutlined, BulbOutlined, StarOutlined, ClockCircleOutlined, InfoCircleOutlined, BarChartOutlined, QuestionCircleOutlined, MessageOutlined, PictureOutlined, FileTextOutlined } from '@ant-design/icons-vue';
import { createArticle, confirmTitle, confirmOutline } from '@/api/articleController';
import { connectSSE, closeSSE } from '@/utils/sse';
import { marked } from 'marked';
import TitleSelectingStage from './components/TitleSelectingStage.vue';
import OutlineEditingStage from './components/OutlineEditingStage.vue';
const router = useRouter();
const route = useRoute();
const loginUserStore = useLoginUserStore();
// 智能体步骤（对应后端 6 个步骤）
const agentSteps = [
    { title: '生成标题', description: 'AI 分析选题，生成吸睛标题' },
    { title: '规划大纲', description: '构建文章结构，理清脉络' },
    { title: '撰写正文', description: '流式生成高质量文章内容' },
    { title: '分析配图', description: '智能分析配图需求和位置' },
    { title: '生成配图', description: '自动匹配高清无版权图片' },
    { title: '图文合成', description: '将配图插入正文，完美呈现' },
];
// 示例选题
const exampleTopics = [
    '2026年AI如何改变职场',
    '程序员如何提升竞争力',
    '远程办公的利与弊',
    '如何培养深度思考',
    '新能源汽车趋势',
    '健康饮食指南',
];
// 阶段状态
const currentPhase = ref('INPUT'); // INPUT, TITLE_SELECTING, OUTLINE_EDITING, CONTENT_GENERATING, COMPLETED
// 状态
const topic = ref('');
const selectedStyle = ref(''); // 选中的文章风格（空字符串表示默认）
const selectedImageMethods = ref([]); // 选中的配图方式（空数组表示全部）
const isCreating = ref(false);
const isCompleted = ref(false);
const isStreaming = ref(false);
const isOutlineStreaming = ref(false);
const currentStep = ref(0);
const taskId = ref('');
const errorVisible = ref(false);
const errorMessage = ref('');
const confirmLoading = ref(false);
const realtimeLogs = ref([]);
// 标题方案
const titleOptions = ref([]);
// 大纲数据
const outline = ref([]);
// 大纲数据（流式）
const outlineRaw = ref('');
// 解析大纲 JSON（格式为 { "sections": [...] }）
const parsedOutline = computed(() => {
    if (!outlineRaw.value)
        return [];
    const str = outlineRaw.value.trim();
    // 尝试解析完整的 JSON
    try {
        const parsed = JSON.parse(str);
        if (parsed && Array.isArray(parsed.sections)) {
            return parsed.sections;
        }
        return [];
    }
    catch {
        // JSON 不完整时，尝试解析已完成的部分
        try {
            // 找到最后一个完整的 section 对象 }
            // 格式: { "sections": [ {...}, {...} ] }
            const sectionsMatch = str.match(/"sections"\s*:\s*\[/);
            if (!sectionsMatch)
                return [];
            const sectionsStart = str.indexOf('[', sectionsMatch.index);
            if (sectionsStart === -1)
                return [];
            // 从 sections 数组开始，找到最后一个完整的 }
            const afterStart = str.substring(sectionsStart);
            const lastBrace = afterStart.lastIndexOf('}');
            if (lastBrace > 0) {
                const partialArray = afterStart.substring(0, lastBrace + 1) + ']';
                const parsed = JSON.parse(partialArray);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
            return [];
        }
        catch {
            return [];
        }
    }
});
// 内容区域引用（用于自动滚动）
const mainContentRef = ref(null);
// 配图进度
const imageCount = ref(0);
const totalImages = ref(5);
const imageProgress = ref(0);
// 文章数据
const article = ref({
    mainTitle: '',
    subTitle: '',
    content: '',
    fullContent: '',
    images: [],
});
let eventSource = null;
// Markdown 转 HTML
const markdownToHtml = (markdown) => {
    return marked(markdown || '');
};
// 自动滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        if (mainContentRef.value) {
            mainContentRef.value.scrollTop = mainContentRef.value.scrollHeight;
        }
    });
};
// 开始创作
const startCreate = async () => {
    if (!topic.value.trim()) {
        message.warning('请输入选题');
        return;
    }
    isCreating.value = true;
    currentStep.value = 0;
    realtimeLogs.value = [];
    addLog('开始创建文章任务...', 'info');
    try {
        // 创建任务
        const res = await createArticle({
            topic: topic.value,
            style: selectedStyle.value || undefined,
            enabledImageMethods: selectedImageMethods.value.length > 0 ? selectedImageMethods.value : undefined
        });
        const newTaskId = res.data.data;
        if (!newTaskId) {
            throw new Error('创建任务失败：未返回任务ID');
        }
        taskId.value = newTaskId;
        addLog(`任务创建成功，ID: ${newTaskId}`, 'success');
        // 刷新用户信息（更新配额）
        await loginUserStore.fetchLoginUser();
        // 建立 SSE 连接
        addLog('已建立实时连接，开始生成...', 'info');
        eventSource = connectSSE(taskId.value, {
            onMessage: handleSSEMessage,
            onError: handleSSEError,
            onComplete: handleSSEComplete,
        });
    }
    catch (error) {
        const err = error;
        message.error(err.message || '创建任务失败');
        isCreating.value = false;
    }
};
// 添加日志
const addLog = (message, level = 'info') => {
    realtimeLogs.value.push({
        timestamp: Date.now(),
        level,
        message
    });
    // 限制日志数量，最多保留 50 条
    if (realtimeLogs.value.length > 50) {
        realtimeLogs.value.shift();
    }
};
// 格式化日志时间
const formatLogTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
};
// 处理 SSE 消息
const handleSSEMessage = (msg) => {
    console.log('SSE消息:', msg);
    switch (msg.type) {
        case 'AGENT1_COMPLETE':
            // 智能体1完成，进入标题生成阶段（显示加载）
            currentPhase.value = 'TITLE_GENERATING';
            currentStep.value = 1;
            addLog('智能体1：标题方案生成完成', 'success');
            break;
        case 'TITLES_GENERATED':
            // 标题方案生成完成，切换到选择标题阶段
            currentPhase.value = 'TITLE_SELECTING';
            titleOptions.value = msg.titleOptions || [];
            isCreating.value = false;
            addLog(`生成了 ${msg.titleOptions?.length || 0} 个标题方案`, 'success');
            break;
        case 'AGENT2_STREAMING':
            // 大纲流式输出（显示生成中状态）
            currentPhase.value = 'OUTLINE_GENERATING';
            isOutlineStreaming.value = true;
            outlineRaw.value += msg.content || '';
            scrollToBottom();
            break;
        case 'OUTLINE_GENERATED':
            // 大纲生成完成，切换到编辑大纲阶段
            currentPhase.value = 'OUTLINE_EDITING';
            outline.value = msg.outline || [];
            isCreating.value = false;
            isOutlineStreaming.value = false;
            addLog('大纲生成完成，等待确认', 'success');
            // 保持在步骤1（规划大纲），用户编辑大纲时仍处于此阶段
            break;
        case 'AGENT2_COMPLETE':
            // 大纲完成（内部处理，已在 OUTLINE_GENERATED 中切换阶段）
            // 不改变 currentStep，保持在步骤1，等用户确认大纲后才进入步骤2
            break;
        case 'AGENT3_STREAMING':
            // 正文流式输出，进入步骤2（撰写正文）
            currentPhase.value = 'CONTENT_GENERATING';
            currentStep.value = 2;
            isStreaming.value = true;
            article.value.content += msg.content || '';
            scrollToBottom();
            break;
        case 'AGENT3_COMPLETE':
            // 正文完成，进入配图分析步骤
            isStreaming.value = false;
            currentStep.value = 3;
            addLog('正文生成完成', 'success');
            break;
        case 'AGENT4_COMPLETE':
            // 配图分析完成，进入配图生成步骤
            currentStep.value = 4;
            totalImages.value = msg.imageRequirements?.length || 5;
            addLog(`配图需求分析完成，共 ${totalImages.value} 张`, 'success');
            break;
        case 'IMAGE_COMPLETE':
            // 单张配图完成
            imageCount.value++;
            imageProgress.value = Math.round((imageCount.value / totalImages.value) * 100);
            addLog(`配图生成中 ${imageCount.value}/${totalImages.value}`, 'info');
            break;
        case 'AGENT5_COMPLETE':
            // 所有配图完成，进入图文合成步骤
            currentStep.value = 5;
            article.value.images = msg.images;
            addLog('所有配图生成完成', 'success');
            break;
        case 'MERGE_COMPLETE':
            // 图文合成完成
            article.value.fullContent = msg.fullContent;
            scrollToBottom();
            addLog('图文合成完成', 'success');
            break;
        case 'ALL_COMPLETE':
            // 全部完成
            currentPhase.value = 'COMPLETED';
            currentStep.value = 6;
            isCompleted.value = true;
            message.success('文章创作完成!');
            addLog('✨ 文章创作完成！', 'success');
            break;
        case 'ERROR':
            errorMessage.value = msg.message || '创作失败';
            errorVisible.value = true;
            isCreating.value = false;
            currentPhase.value = 'INPUT';
            addLog(`创作失败: ${msg.message || '未知错误'}`, 'error');
            break;
    }
};
// 确认标题
const handleConfirmTitle = async (data) => {
    confirmLoading.value = true;
    try {
        await confirmTitle({
            taskId: taskId.value,
            selectedMainTitle: data.mainTitle,
            selectedSubTitle: data.subTitle,
            userDescription: data.userDescription
        });
        // 保存标题信息，用于大纲生成阶段展示
        article.value.mainTitle = data.mainTitle;
        article.value.subTitle = data.subTitle;
        // 不直接切换阶段，等待 SSE 消息 OUTLINE_GENERATED
        message.success('标题已确认，正在生成大纲...');
    }
    catch (error) {
        const err = error;
        message.error(err.message || '确认标题失败');
    }
    finally {
        confirmLoading.value = false;
    }
};
// 确认大纲
const handleConfirmOutline = async (outlineData) => {
    confirmLoading.value = true;
    try {
        await confirmOutline({
            taskId: taskId.value,
            outline: outlineData
        });
        // 更新 outlineRaw 为用户修改后的大纲，确保 CONTENT_GENERATING 阶段展示正确的大纲
        outlineRaw.value = JSON.stringify({ sections: outlineData });
        // 不直接切换阶段，等待后端开始生成正文并推送 AGENT3_STREAMING
        message.success('大纲已确认，正在生成正文...');
    }
    catch (error) {
        const err = error;
        message.error(err.message || '确认大纲失败');
    }
    finally {
        confirmLoading.value = false;
    }
};
// 处理 SSE 错误
const handleSSEError = (error) => {
    console.error('SSE错误:', error);
    message.error('连接失败,请重试');
    isCreating.value = false;
};
// 处理 SSE 完成
const handleSSEComplete = () => {
    console.log('SSE连接关闭');
};
// 复制全文
const copyContent = async () => {
    const content = article.value.fullContent || article.value.content || '';
    try {
        await navigator.clipboard.writeText(content);
        message.success('已复制到剪贴板');
    }
    catch {
        message.error('复制失败');
    }
};
// 查看文章详情
const viewArticle = () => {
    router.push(`/article/${taskId.value}`);
};
// 重新创作
const resetCreate = () => {
    currentPhase.value = 'INPUT';
    topic.value = '';
    selectedStyle.value = '';
    titleOptions.value = [];
    outline.value = [];
    isCreating.value = false;
    isCompleted.value = false;
    isStreaming.value = false;
    isOutlineStreaming.value = false;
    currentStep.value = 0;
    imageCount.value = 0;
    imageProgress.value = 0;
    outlineRaw.value = '';
    confirmLoading.value = false;
    realtimeLogs.value = [];
    article.value = {
        mainTitle: '',
        subTitle: '',
        content: '',
        fullContent: '',
        images: [],
    };
};
// 组件挂载时检查路由参数
onMounted(() => {
    if (route.query.topic) {
        topic.value = route.query.topic;
    }
});
// 组件卸载前关闭 SSE
onBeforeUnmount(() => {
    closeSSE(eventSource);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "article-create-page" },
});
/** @type {__VLS_StyleScopedClasses['article-create-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "create-layout" },
});
/** @type {__VLS_StyleScopedClasses['create-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar-left" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-left']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-header" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "sidebar-title" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "sidebar-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flow-timeline" },
});
/** @type {__VLS_StyleScopedClasses['flow-timeline']} */ ;
for (const [step, index] of __VLS_vFor((__VLS_ctx.agentSteps))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (index),
        ...{ class: (['flow-item', {
                    'active': __VLS_ctx.currentStep === index,
                    'completed': __VLS_ctx.currentStep > index,
                    'pending': __VLS_ctx.currentStep < index
                }]) },
    });
    /** @type {__VLS_StyleScopedClasses['flow-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['completed']} */ ;
    /** @type {__VLS_StyleScopedClasses['pending']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flow-indicator" },
    });
    /** @type {__VLS_StyleScopedClasses['flow-indicator']} */ ;
    if (__VLS_ctx.currentStep === index && __VLS_ctx.isCreating) {
        let __VLS_0;
        /** @ts-ignore @type {typeof __VLS_components.LoadingOutlined} */
        LoadingOutlined;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            ...{ class: "spin-icon" },
        }));
        const __VLS_2 = __VLS_1({
            ...{ class: "spin-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        /** @type {__VLS_StyleScopedClasses['spin-icon']} */ ;
    }
    else if (__VLS_ctx.currentStep > index) {
        let __VLS_5;
        /** @ts-ignore @type {typeof __VLS_components.CheckCircleOutlined} */
        CheckCircleOutlined;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({}));
        const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "step-number" },
        });
        /** @type {__VLS_StyleScopedClasses['step-number']} */ ;
        (index + 1);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flow-content" },
    });
    /** @type {__VLS_StyleScopedClasses['flow-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flow-title" },
    });
    /** @type {__VLS_StyleScopedClasses['flow-title']} */ ;
    (step.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flow-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['flow-desc']} */ ;
    (step.description);
    if (__VLS_ctx.currentStep === index && __VLS_ctx.isCreating) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flow-status" },
        });
        /** @type {__VLS_StyleScopedClasses['flow-status']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "status-dot" },
        });
        /** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
    }
    // @ts-ignore
    [agentSteps, currentStep, currentStep, currentStep, currentStep, currentStep, currentStep, isCreating, isCreating,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ref: "mainContentRef",
    ...{ class: "main-content" },
});
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
let __VLS_10;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    name: "fade-slide",
    mode: "out-in",
}));
const __VLS_12 = __VLS_11({
    name: "fade-slide",
    mode: "out-in",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
const { default: __VLS_15 } = __VLS_13.slots;
if (__VLS_ctx.currentPhase === 'INPUT') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "input",
        ...{ class: "input-state" },
    });
    /** @type {__VLS_StyleScopedClasses['input-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "input-card" },
    });
    /** @type {__VLS_StyleScopedClasses['input-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "input-header" },
    });
    /** @type {__VLS_StyleScopedClasses['input-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "input-title" },
    });
    /** @type {__VLS_StyleScopedClasses['input-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "input-subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['input-subtitle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "input-area" },
    });
    /** @type {__VLS_StyleScopedClasses['input-area']} */ ;
    let __VLS_16;
    /** @ts-ignore @type {typeof __VLS_components.aTextarea | typeof __VLS_components.ATextarea} */
    aTextarea;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent1(__VLS_16, new __VLS_16({
        value: (__VLS_ctx.topic),
        placeholder: "请输入您想创作的文章选题，例如：2026年AI如何改变职场",
        rows: (6),
        maxlength: (500),
        showCount: true,
        ...{ class: "topic-textarea" },
    }));
    const __VLS_18 = __VLS_17({
        value: (__VLS_ctx.topic),
        placeholder: "请输入您想创作的文章选题，例如：2026年AI如何改变职场",
        rows: (6),
        maxlength: (500),
        showCount: true,
        ...{ class: "topic-textarea" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    /** @type {__VLS_StyleScopedClasses['topic-textarea']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "style-section" },
    });
    /** @type {__VLS_StyleScopedClasses['style-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-header" },
    });
    /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "section-title" },
    });
    /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "section-tip" },
    });
    /** @type {__VLS_StyleScopedClasses['section-tip']} */ ;
    let __VLS_21;
    /** @ts-ignore @type {typeof __VLS_components.aRadioGroup | typeof __VLS_components.ARadioGroup | typeof __VLS_components.aRadioGroup | typeof __VLS_components.ARadioGroup} */
    aRadioGroup;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
        value: (__VLS_ctx.selectedStyle),
        ...{ class: "style-group" },
    }));
    const __VLS_23 = __VLS_22({
        value: (__VLS_ctx.selectedStyle),
        ...{ class: "style-group" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
    /** @type {__VLS_StyleScopedClasses['style-group']} */ ;
    const { default: __VLS_26 } = __VLS_24.slots;
    let __VLS_27;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({
        value: "",
    }));
    const __VLS_29 = __VLS_28({
        value: "",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const { default: __VLS_32 } = __VLS_30.slots;
    // @ts-ignore
    [currentPhase, topic, selectedStyle,];
    var __VLS_30;
    let __VLS_33;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
        value: "tech",
    }));
    const __VLS_35 = __VLS_34({
        value: "tech",
    }, ...__VLS_functionalComponentArgsRest(__VLS_34));
    const { default: __VLS_38 } = __VLS_36.slots;
    // @ts-ignore
    [];
    var __VLS_36;
    let __VLS_39;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
        value: "emotional",
    }));
    const __VLS_41 = __VLS_40({
        value: "emotional",
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const { default: __VLS_44 } = __VLS_42.slots;
    // @ts-ignore
    [];
    var __VLS_42;
    let __VLS_45;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({
        value: "educational",
    }));
    const __VLS_47 = __VLS_46({
        value: "educational",
    }, ...__VLS_functionalComponentArgsRest(__VLS_46));
    const { default: __VLS_50 } = __VLS_48.slots;
    // @ts-ignore
    [];
    var __VLS_48;
    let __VLS_51;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        value: "humorous",
    }));
    const __VLS_53 = __VLS_52({
        value: "humorous",
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    const { default: __VLS_56 } = __VLS_54.slots;
    // @ts-ignore
    [];
    var __VLS_54;
    // @ts-ignore
    [];
    var __VLS_24;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "image-methods-section" },
    });
    /** @type {__VLS_StyleScopedClasses['image-methods-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-header" },
    });
    /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "section-title" },
    });
    /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "section-tip" },
    });
    /** @type {__VLS_StyleScopedClasses['section-tip']} */ ;
    let __VLS_57;
    /** @ts-ignore @type {typeof __VLS_components.aCheckboxGroup | typeof __VLS_components.ACheckboxGroup | typeof __VLS_components.aCheckboxGroup | typeof __VLS_components.ACheckboxGroup} */
    aCheckboxGroup;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({
        value: (__VLS_ctx.selectedImageMethods),
        ...{ class: "methods-group" },
    }));
    const __VLS_59 = __VLS_58({
        value: (__VLS_ctx.selectedImageMethods),
        ...{ class: "methods-group" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_58));
    /** @type {__VLS_StyleScopedClasses['methods-group']} */ ;
    const { default: __VLS_62 } = __VLS_60.slots;
    let __VLS_63;
    /** @ts-ignore @type {typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox | typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox} */
    aCheckbox;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent1(__VLS_63, new __VLS_63({
        value: "PEXELS",
    }));
    const __VLS_65 = __VLS_64({
        value: "PEXELS",
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    const { default: __VLS_68 } = __VLS_66.slots;
    // @ts-ignore
    [selectedImageMethods,];
    var __VLS_66;
    let __VLS_69;
    /** @ts-ignore @type {typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox | typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox} */
    aCheckbox;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent1(__VLS_69, new __VLS_69({
        value: "MERMAID",
    }));
    const __VLS_71 = __VLS_70({
        value: "MERMAID",
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
    const { default: __VLS_74 } = __VLS_72.slots;
    // @ts-ignore
    [];
    var __VLS_72;
    let __VLS_75;
    /** @ts-ignore @type {typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox | typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox} */
    aCheckbox;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
        value: "ICONIFY",
    }));
    const __VLS_77 = __VLS_76({
        value: "ICONIFY",
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    const { default: __VLS_80 } = __VLS_78.slots;
    // @ts-ignore
    [];
    var __VLS_78;
    let __VLS_81;
    /** @ts-ignore @type {typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox | typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox} */
    aCheckbox;
    // @ts-ignore
    const __VLS_82 = __VLS_asFunctionalComponent1(__VLS_81, new __VLS_81({
        value: "EMOJI_PACK",
    }));
    const __VLS_83 = __VLS_82({
        value: "EMOJI_PACK",
    }, ...__VLS_functionalComponentArgsRest(__VLS_82));
    const { default: __VLS_86 } = __VLS_84.slots;
    // @ts-ignore
    [];
    var __VLS_84;
    let __VLS_87;
    /** @ts-ignore @type {typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox | typeof __VLS_components.aCheckbox | typeof __VLS_components.ACheckbox} */
    aCheckbox;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent1(__VLS_87, new __VLS_87({
        value: "SVG_DIAGRAM",
    }));
    const __VLS_89 = __VLS_88({
        value: "SVG_DIAGRAM",
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    const { default: __VLS_92 } = __VLS_90.slots;
    // @ts-ignore
    [];
    var __VLS_90;
    // @ts-ignore
    [];
    var __VLS_60;
    let __VLS_93;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.isCreating),
        ...{ class: "create-btn" },
    }));
    const __VLS_95 = __VLS_94({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        loading: (__VLS_ctx.isCreating),
        ...{ class: "create-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_94));
    let __VLS_98;
    const __VLS_99 = ({ click: {} },
        { onClick: (__VLS_ctx.startCreate) });
    /** @type {__VLS_StyleScopedClasses['create-btn']} */ ;
    const { default: __VLS_100 } = __VLS_96.slots;
    {
        const { icon: __VLS_101 } = __VLS_96.slots;
        let __VLS_102;
        /** @ts-ignore @type {typeof __VLS_components.RocketOutlined} */
        RocketOutlined;
        // @ts-ignore
        const __VLS_103 = __VLS_asFunctionalComponent1(__VLS_102, new __VLS_102({}));
        const __VLS_104 = __VLS_103({}, ...__VLS_functionalComponentArgsRest(__VLS_103));
        // @ts-ignore
        [isCreating, startCreate,];
    }
    // @ts-ignore
    [];
    var __VLS_96;
    var __VLS_97;
}
else if (__VLS_ctx.currentPhase === 'TITLE_GENERATING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "title-generating",
        ...{ class: "loading-stage" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-stage']} */ ;
    let __VLS_107;
    /** @ts-ignore @type {typeof __VLS_components.aSpin | typeof __VLS_components.ASpin} */
    aSpin;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
        size: "large",
    }));
    const __VLS_109 = __VLS_108({
        size: "large",
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else if (__VLS_ctx.currentPhase === 'TITLE_SELECTING') {
    const __VLS_112 = TitleSelectingStage;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent1(__VLS_112, new __VLS_112({
        ...{ 'onConfirm': {} },
        key: "title-selecting",
        titleOptions: (__VLS_ctx.titleOptions),
        loading: (__VLS_ctx.confirmLoading),
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onConfirm': {} },
        key: "title-selecting",
        titleOptions: (__VLS_ctx.titleOptions),
        loading: (__VLS_ctx.confirmLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_117;
    const __VLS_118 = ({ confirm: {} },
        { onConfirm: (__VLS_ctx.handleConfirmTitle) });
    var __VLS_115;
    var __VLS_116;
}
else if (__VLS_ctx.currentPhase === 'OUTLINE_GENERATING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "outline-generating",
        ...{ class: "outline-generating-state" },
    });
    /** @type {__VLS_StyleScopedClasses['outline-generating-state']} */ ;
    if (__VLS_ctx.article.mainTitle) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "preview-header" },
        });
        /** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "article-title" },
        });
        /** @type {__VLS_StyleScopedClasses['article-title']} */ ;
        (__VLS_ctx.article.mainTitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "article-subtitle" },
        });
        /** @type {__VLS_StyleScopedClasses['article-subtitle']} */ ;
        (__VLS_ctx.article.subTitle);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "outline-preview" },
    });
    /** @type {__VLS_StyleScopedClasses['outline-preview']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-label" },
    });
    /** @type {__VLS_StyleScopedClasses['section-label']} */ ;
    let __VLS_119;
    /** @ts-ignore @type {typeof __VLS_components.BulbOutlined} */
    BulbOutlined;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent1(__VLS_119, new __VLS_119({}));
    const __VLS_121 = __VLS_120({}, ...__VLS_functionalComponentArgsRest(__VLS_120));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "typing-cursor" },
    });
    /** @type {__VLS_StyleScopedClasses['typing-cursor']} */ ;
    if (__VLS_ctx.parsedOutline.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-list" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.parsedOutline))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.section),
                ...{ class: "outline-item fade-in" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-item']} */ ;
            /** @type {__VLS_StyleScopedClasses['fade-in']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "outline-title" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-title']} */ ;
            (item.section);
            (item.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                ...{ class: "outline-points" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-points']} */ ;
            for (const [point, idx] of __VLS_vFor((item.points))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                    key: (idx),
                });
                (point);
                // @ts-ignore
                [currentPhase, currentPhase, currentPhase, titleOptions, confirmLoading, handleConfirmTitle, article, article, article, parsedOutline, parsedOutline,];
            }
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-loading" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-loading']} */ ;
        let __VLS_124;
        /** @ts-ignore @type {typeof __VLS_components.aSpin | typeof __VLS_components.ASpin} */
        aSpin;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent1(__VLS_124, new __VLS_124({}));
        const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
}
else if (__VLS_ctx.currentPhase === 'OUTLINE_EDITING') {
    const __VLS_129 = OutlineEditingStage;
    // @ts-ignore
    const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({
        ...{ 'onConfirm': {} },
        key: "outline-editing",
        outline: (__VLS_ctx.outline),
        loading: (__VLS_ctx.confirmLoading),
        taskId: (__VLS_ctx.taskId),
    }));
    const __VLS_131 = __VLS_130({
        ...{ 'onConfirm': {} },
        key: "outline-editing",
        outline: (__VLS_ctx.outline),
        loading: (__VLS_ctx.confirmLoading),
        taskId: (__VLS_ctx.taskId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_130));
    let __VLS_134;
    const __VLS_135 = ({ confirm: {} },
        { onConfirm: (__VLS_ctx.handleConfirmOutline) });
    var __VLS_132;
    var __VLS_133;
}
else if (__VLS_ctx.currentPhase === 'CONTENT_GENERATING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "content-generating",
        ...{ class: "creating-state" },
    });
    /** @type {__VLS_StyleScopedClasses['creating-state']} */ ;
    if (__VLS_ctx.article.mainTitle) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "preview-header" },
        });
        /** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "article-title" },
        });
        /** @type {__VLS_StyleScopedClasses['article-title']} */ ;
        (__VLS_ctx.article.mainTitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "article-subtitle" },
        });
        /** @type {__VLS_StyleScopedClasses['article-subtitle']} */ ;
        (__VLS_ctx.article.subTitle);
    }
    if (__VLS_ctx.outlineRaw) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-preview" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-preview']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "section-label" },
        });
        /** @type {__VLS_StyleScopedClasses['section-label']} */ ;
        let __VLS_136;
        /** @ts-ignore @type {typeof __VLS_components.BulbOutlined} */
        BulbOutlined;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent1(__VLS_136, new __VLS_136({}));
        const __VLS_138 = __VLS_137({}, ...__VLS_functionalComponentArgsRest(__VLS_137));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        if (__VLS_ctx.isOutlineStreaming) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "typing-cursor" },
            });
            /** @type {__VLS_StyleScopedClasses['typing-cursor']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-list" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.parsedOutline))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (item.section),
                ...{ class: "outline-item" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-item']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "outline-title" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-title']} */ ;
            (item.section);
            (item.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.ul, __VLS_intrinsics.ul)({
                ...{ class: "outline-points" },
            });
            /** @type {__VLS_StyleScopedClasses['outline-points']} */ ;
            for (const [point, idx] of __VLS_vFor((item.points))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
                    key: (idx),
                });
                (point);
                // @ts-ignore
                [currentPhase, currentPhase, confirmLoading, article, article, article, parsedOutline, outline, taskId, handleConfirmOutline, outlineRaw, isOutlineStreaming,];
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.article.content) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "content-preview" },
        });
        /** @type {__VLS_StyleScopedClasses['content-preview']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "markdown-body" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.markdownToHtml(__VLS_ctx.article.content)) }, null, null);
        /** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
        if (__VLS_ctx.isStreaming) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "typing-cursor" },
            });
            /** @type {__VLS_StyleScopedClasses['typing-cursor']} */ ;
        }
    }
    if (__VLS_ctx.currentStep === 4 && __VLS_ctx.imageProgress > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "image-progress-box" },
        });
        /** @type {__VLS_StyleScopedClasses['image-progress-box']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "progress-header" },
        });
        /** @type {__VLS_StyleScopedClasses['progress-header']} */ ;
        let __VLS_141;
        /** @ts-ignore @type {typeof __VLS_components.PictureOutlined} */
        PictureOutlined;
        // @ts-ignore
        const __VLS_142 = __VLS_asFunctionalComponent1(__VLS_141, new __VLS_141({}));
        const __VLS_143 = __VLS_142({}, ...__VLS_functionalComponentArgsRest(__VLS_142));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        let __VLS_146;
        /** @ts-ignore @type {typeof __VLS_components.aProgress | typeof __VLS_components.AProgress} */
        aProgress;
        // @ts-ignore
        const __VLS_147 = __VLS_asFunctionalComponent1(__VLS_146, new __VLS_146({
            percent: (__VLS_ctx.imageProgress),
            status: "active",
            strokeColor: ({ from: '#22C55E', to: '#16A34A' }),
        }));
        const __VLS_148 = __VLS_147({
            percent: (__VLS_ctx.imageProgress),
            status: "active",
            strokeColor: ({ from: '#22C55E', to: '#16A34A' }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_147));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "progress-hint" },
        });
        /** @type {__VLS_StyleScopedClasses['progress-hint']} */ ;
        (__VLS_ctx.imageCount);
        (__VLS_ctx.totalImages);
    }
    if (__VLS_ctx.currentStep === 0 && !__VLS_ctx.article.mainTitle) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loading-placeholder" },
        });
        /** @type {__VLS_StyleScopedClasses['loading-placeholder']} */ ;
        let __VLS_151;
        /** @ts-ignore @type {typeof __VLS_components.aSpin | typeof __VLS_components.ASpin} */
        aSpin;
        // @ts-ignore
        const __VLS_152 = __VLS_asFunctionalComponent1(__VLS_151, new __VLS_151({
            size: "large",
        }));
        const __VLS_153 = __VLS_152({
            size: "large",
        }, ...__VLS_functionalComponentArgsRest(__VLS_152));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
}
else if (__VLS_ctx.currentPhase === 'COMPLETED') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "completed",
        ...{ class: "completed-state" },
    });
    /** @type {__VLS_StyleScopedClasses['completed-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "success-header" },
    });
    /** @type {__VLS_StyleScopedClasses['success-header']} */ ;
    let __VLS_156;
    /** @ts-ignore @type {typeof __VLS_components.CheckCircleFilled} */
    CheckCircleFilled;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent1(__VLS_156, new __VLS_156({
        ...{ class: "success-icon" },
    }));
    const __VLS_158 = __VLS_157({
        ...{ class: "success-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    /** @type {__VLS_StyleScopedClasses['success-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "preview-header" },
    });
    /** @type {__VLS_StyleScopedClasses['preview-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "article-title" },
    });
    /** @type {__VLS_StyleScopedClasses['article-title']} */ ;
    (__VLS_ctx.article.mainTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "article-subtitle" },
    });
    /** @type {__VLS_StyleScopedClasses['article-subtitle']} */ ;
    (__VLS_ctx.article.subTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "content-preview" },
    });
    /** @type {__VLS_StyleScopedClasses['content-preview']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "markdown-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.markdownToHtml(__VLS_ctx.article.fullContent || __VLS_ctx.article.content || '')) }, null, null);
    /** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
}
// @ts-ignore
[currentStep, currentStep, currentPhase, article, article, article, article, article, article, article, markdownToHtml, markdownToHtml, isStreaming, imageProgress, imageProgress, imageCount, totalImages,];
var __VLS_13;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar-right" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-right']} */ ;
if (__VLS_ctx.currentPhase === 'INPUT') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_161;
    /** @ts-ignore @type {typeof __VLS_components.BulbOutlined} */
    BulbOutlined;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent1(__VLS_161, new __VLS_161({}));
    const __VLS_163 = __VLS_162({}, ...__VLS_functionalComponentArgsRest(__VLS_162));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "hot-tags" },
    });
    /** @type {__VLS_StyleScopedClasses['hot-tags']} */ ;
    for (const [example] of __VLS_vFor((__VLS_ctx.exampleTopics))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.currentPhase === 'INPUT'))
                        return;
                    __VLS_ctx.topic = example;
                    // @ts-ignore
                    [currentPhase, topic, exampleTopics,];
                } },
            key: (example),
            ...{ class: "hot-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['hot-tag']} */ ;
        (example);
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.currentPhase === 'INPUT') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_166;
    /** @ts-ignore @type {typeof __VLS_components.StarOutlined} */
    StarOutlined;
    // @ts-ignore
    const __VLS_167 = __VLS_asFunctionalComponent1(__VLS_166, new __VLS_166({}));
    const __VLS_168 = __VLS_167({}, ...__VLS_functionalComponentArgsRest(__VLS_167));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tips-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tips-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
}
if (__VLS_ctx.isCreating || __VLS_ctx.currentPhase === 'TITLE_SELECTING' || __VLS_ctx.currentPhase === 'OUTLINE_EDITING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_171;
    /** @ts-ignore @type {typeof __VLS_components.ClockCircleOutlined} */
    ClockCircleOutlined;
    // @ts-ignore
    const __VLS_172 = __VLS_asFunctionalComponent1(__VLS_171, new __VLS_171({}));
    const __VLS_173 = __VLS_172({}, ...__VLS_functionalComponentArgsRest(__VLS_172));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "progress-info" },
    });
    /** @type {__VLS_StyleScopedClasses['progress-info']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "progress-step" },
    });
    /** @type {__VLS_StyleScopedClasses['progress-step']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "step-label" },
    });
    /** @type {__VLS_StyleScopedClasses['step-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "step-value" },
    });
    /** @type {__VLS_StyleScopedClasses['step-value']} */ ;
    (__VLS_ctx.agentSteps[__VLS_ctx.currentStep]?.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "progress-step" },
    });
    /** @type {__VLS_StyleScopedClasses['progress-step']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "step-label" },
    });
    /** @type {__VLS_StyleScopedClasses['step-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "step-value" },
    });
    /** @type {__VLS_StyleScopedClasses['step-value']} */ ;
    (__VLS_ctx.currentStep);
    (__VLS_ctx.agentSteps.length);
    if (__VLS_ctx.isCreating) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "progress-tip" },
        });
        /** @type {__VLS_StyleScopedClasses['progress-tip']} */ ;
        let __VLS_176;
        /** @ts-ignore @type {typeof __VLS_components.InfoCircleOutlined} */
        InfoCircleOutlined;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent1(__VLS_176, new __VLS_176({}));
        const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "progress-tip waiting" },
        });
        /** @type {__VLS_StyleScopedClasses['progress-tip']} */ ;
        /** @type {__VLS_StyleScopedClasses['waiting']} */ ;
        let __VLS_181;
        /** @ts-ignore @type {typeof __VLS_components.InfoCircleOutlined} */
        InfoCircleOutlined;
        // @ts-ignore
        const __VLS_182 = __VLS_asFunctionalComponent1(__VLS_181, new __VLS_181({}));
        const __VLS_183 = __VLS_182({}, ...__VLS_functionalComponentArgsRest(__VLS_182));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
}
if (__VLS_ctx.realtimeLogs.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section realtime-logs-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['realtime-logs-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_186;
    /** @ts-ignore @type {typeof __VLS_components.FileTextOutlined} */
    FileTextOutlined;
    // @ts-ignore
    const __VLS_187 = __VLS_asFunctionalComponent1(__VLS_186, new __VLS_186({}));
    const __VLS_188 = __VLS_187({}, ...__VLS_functionalComponentArgsRest(__VLS_187));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "logs-container" },
    });
    /** @type {__VLS_StyleScopedClasses['logs-container']} */ ;
    for (const [log, index] of __VLS_vFor((__VLS_ctx.realtimeLogs))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (index),
            ...{ class: (['log-entry', log.level]) },
        });
        /** @type {__VLS_StyleScopedClasses['log-entry']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "log-time" },
        });
        /** @type {__VLS_StyleScopedClasses['log-time']} */ ;
        (__VLS_ctx.formatLogTime(log.timestamp));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "log-message" },
        });
        /** @type {__VLS_StyleScopedClasses['log-message']} */ ;
        (log.message);
        // @ts-ignore
        [agentSteps, agentSteps, currentStep, currentStep, isCreating, isCreating, currentPhase, currentPhase, currentPhase, realtimeLogs, realtimeLogs, formatLogTime,];
    }
}
if (__VLS_ctx.currentPhase !== 'INPUT' && __VLS_ctx.currentPhase !== 'COMPLETED' && __VLS_ctx.topic) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_191;
    /** @ts-ignore @type {typeof __VLS_components.BulbOutlined} */
    BulbOutlined;
    // @ts-ignore
    const __VLS_192 = __VLS_asFunctionalComponent1(__VLS_191, new __VLS_191({}));
    const __VLS_193 = __VLS_192({}, ...__VLS_functionalComponentArgsRest(__VLS_192));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "topic-display" },
    });
    /** @type {__VLS_StyleScopedClasses['topic-display']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.topic);
}
if (__VLS_ctx.currentPhase === 'TITLE_GENERATING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section tips-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['tips-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_196;
    /** @ts-ignore @type {typeof __VLS_components.StarOutlined} */
    StarOutlined;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent1(__VLS_196, new __VLS_196({}));
    const __VLS_198 = __VLS_197({}, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tips-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tips-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
}
if (__VLS_ctx.currentPhase === 'TITLE_SELECTING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section tips-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['tips-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_201;
    /** @ts-ignore @type {typeof __VLS_components.StarOutlined} */
    StarOutlined;
    // @ts-ignore
    const __VLS_202 = __VLS_asFunctionalComponent1(__VLS_201, new __VLS_201({}));
    const __VLS_203 = __VLS_202({}, ...__VLS_functionalComponentArgsRest(__VLS_202));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tips-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tips-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
}
if (__VLS_ctx.currentPhase === 'OUTLINE_GENERATING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section tips-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['tips-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_206;
    /** @ts-ignore @type {typeof __VLS_components.StarOutlined} */
    StarOutlined;
    // @ts-ignore
    const __VLS_207 = __VLS_asFunctionalComponent1(__VLS_206, new __VLS_206({}));
    const __VLS_208 = __VLS_207({}, ...__VLS_functionalComponentArgsRest(__VLS_207));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tips-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tips-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
}
if (__VLS_ctx.currentPhase === 'OUTLINE_EDITING') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section tips-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['tips-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_211;
    /** @ts-ignore @type {typeof __VLS_components.StarOutlined} */
    StarOutlined;
    // @ts-ignore
    const __VLS_212 = __VLS_asFunctionalComponent1(__VLS_211, new __VLS_211({}));
    const __VLS_213 = __VLS_212({}, ...__VLS_functionalComponentArgsRest(__VLS_212));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tips-list" },
    });
    /** @type {__VLS_StyleScopedClasses['tips-list']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-item" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-content" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-title" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "tip-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['tip-desc']} */ ;
}
if (__VLS_ctx.currentPhase === 'COMPLETED') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_216;
    /** @ts-ignore @type {typeof __VLS_components.ThunderboltOutlined} */
    ThunderboltOutlined;
    // @ts-ignore
    const __VLS_217 = __VLS_asFunctionalComponent1(__VLS_216, new __VLS_216({}));
    const __VLS_218 = __VLS_217({}, ...__VLS_functionalComponentArgsRest(__VLS_217));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "action-list" },
    });
    /** @type {__VLS_StyleScopedClasses['action-list']} */ ;
    let __VLS_221;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_222 = __VLS_asFunctionalComponent1(__VLS_221, new __VLS_221({
        ...{ 'onClick': {} },
        block: true,
        ...{ class: "action-btn" },
    }));
    const __VLS_223 = __VLS_222({
        ...{ 'onClick': {} },
        block: true,
        ...{ class: "action-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_222));
    let __VLS_226;
    const __VLS_227 = ({ click: {} },
        { onClick: (__VLS_ctx.copyContent) });
    /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
    const { default: __VLS_228 } = __VLS_224.slots;
    let __VLS_229;
    /** @ts-ignore @type {typeof __VLS_components.CopyOutlined} */
    CopyOutlined;
    // @ts-ignore
    const __VLS_230 = __VLS_asFunctionalComponent1(__VLS_229, new __VLS_229({}));
    const __VLS_231 = __VLS_230({}, ...__VLS_functionalComponentArgsRest(__VLS_230));
    // @ts-ignore
    [currentPhase, currentPhase, currentPhase, currentPhase, currentPhase, currentPhase, currentPhase, topic, topic, copyContent,];
    var __VLS_224;
    var __VLS_225;
    let __VLS_234;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_235 = __VLS_asFunctionalComponent1(__VLS_234, new __VLS_234({
        ...{ 'onClick': {} },
        block: true,
        ...{ class: "action-btn" },
    }));
    const __VLS_236 = __VLS_235({
        ...{ 'onClick': {} },
        block: true,
        ...{ class: "action-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_235));
    let __VLS_239;
    const __VLS_240 = ({ click: {} },
        { onClick: (__VLS_ctx.viewArticle) });
    /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
    const { default: __VLS_241 } = __VLS_237.slots;
    let __VLS_242;
    /** @ts-ignore @type {typeof __VLS_components.EyeOutlined} */
    EyeOutlined;
    // @ts-ignore
    const __VLS_243 = __VLS_asFunctionalComponent1(__VLS_242, new __VLS_242({}));
    const __VLS_244 = __VLS_243({}, ...__VLS_functionalComponentArgsRest(__VLS_243));
    // @ts-ignore
    [viewArticle,];
    var __VLS_237;
    var __VLS_238;
    let __VLS_247;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_248 = __VLS_asFunctionalComponent1(__VLS_247, new __VLS_247({
        ...{ 'onClick': {} },
        block: true,
        type: "primary",
        ...{ class: "action-btn primary" },
    }));
    const __VLS_249 = __VLS_248({
        ...{ 'onClick': {} },
        block: true,
        type: "primary",
        ...{ class: "action-btn primary" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_248));
    let __VLS_252;
    const __VLS_253 = ({ click: {} },
        { onClick: (__VLS_ctx.resetCreate) });
    /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    const { default: __VLS_254 } = __VLS_250.slots;
    let __VLS_255;
    /** @ts-ignore @type {typeof __VLS_components.RedoOutlined} */
    RedoOutlined;
    // @ts-ignore
    const __VLS_256 = __VLS_asFunctionalComponent1(__VLS_255, new __VLS_255({}));
    const __VLS_257 = __VLS_256({}, ...__VLS_functionalComponentArgsRest(__VLS_256));
    // @ts-ignore
    [resetCreate,];
    var __VLS_250;
    var __VLS_251;
}
if (__VLS_ctx.currentPhase === 'COMPLETED') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "panel-section stats-section" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-section']} */ ;
    /** @type {__VLS_StyleScopedClasses['stats-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
        ...{ class: "panel-title" },
    });
    /** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
    let __VLS_260;
    /** @ts-ignore @type {typeof __VLS_components.BarChartOutlined} */
    BarChartOutlined;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent1(__VLS_260, new __VLS_260({}));
    const __VLS_262 = __VLS_261({}, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stats-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['stats-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-item" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-value" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
    ((__VLS_ctx.article.fullContent || __VLS_ctx.article.content || '').length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-item" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-value" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
    (__VLS_ctx.article.images?.length || 0);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stat-label" },
    });
    /** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-footer" },
});
/** @type {__VLS_StyleScopedClasses['panel-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    ...{ class: "help-link" },
});
/** @type {__VLS_StyleScopedClasses['help-link']} */ ;
let __VLS_265;
/** @ts-ignore @type {typeof __VLS_components.QuestionCircleOutlined} */
QuestionCircleOutlined;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent1(__VLS_265, new __VLS_265({}));
const __VLS_267 = __VLS_266({}, ...__VLS_functionalComponentArgsRest(__VLS_266));
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    ...{ class: "help-link" },
});
/** @type {__VLS_StyleScopedClasses['help-link']} */ ;
let __VLS_270;
/** @ts-ignore @type {typeof __VLS_components.MessageOutlined} */
MessageOutlined;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent1(__VLS_270, new __VLS_270({}));
const __VLS_272 = __VLS_271({}, ...__VLS_functionalComponentArgsRest(__VLS_271));
let __VLS_275;
/** @ts-ignore @type {typeof __VLS_components.aModal | typeof __VLS_components.AModal | typeof __VLS_components.aModal | typeof __VLS_components.AModal} */
aModal;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent1(__VLS_275, new __VLS_275({
    ...{ 'onOk': {} },
    open: (__VLS_ctx.errorVisible),
    title: "创作失败",
}));
const __VLS_277 = __VLS_276({
    ...{ 'onOk': {} },
    open: (__VLS_ctx.errorVisible),
    title: "创作失败",
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
let __VLS_280;
const __VLS_281 = ({ ok: {} },
    { onOk: (...[$event]) => {
            __VLS_ctx.errorVisible = false;
            // @ts-ignore
            [currentPhase, article, article, article, errorVisible, errorVisible,];
        } });
const { default: __VLS_282 } = __VLS_278.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.errorMessage);
// @ts-ignore
[errorMessage,];
var __VLS_278;
var __VLS_279;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
