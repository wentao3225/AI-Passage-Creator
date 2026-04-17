import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLoginUserStore } from '@/stores/loginUser';
import { listArticle } from '@/api/articleController';
import dayjs from 'dayjs';
import { RocketOutlined, FileTextOutlined, OrderedListOutlined, EditOutlined, PictureOutlined, ThunderboltOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons-vue';
const router = useRouter();
const loginUserStore = useLoginUserStore();
// 输入框
const topic = ref('');
// 最近文章
const recentArticles = ref([]);
const loadingArticles = ref(false);
/**
 * 跳转到创作页。
 * 若输入框有选题，则通过 query 预填到创作页。
 */
const goToCreate = () => {
    if (topic.value.trim()) {
        // 带上用户输入的选题，减少二次输入
        router.push({ path: '/create', query: { topic: topic.value } });
    }
    else {
        // 无选题时直接进入空白创作页
        router.push('/create');
    }
};
/**
 * 跳转历史列表页。
 */
const goToList = () => {
    // 打开用户文章历史记录页面
    router.push('/article/list');
};
/**
 * 打开文章详情页。
 */
const viewArticle = (article) => {
    // 通过 taskId 定位文章详情
    router.push(`/article/${article.taskId}`);
};
// 加载最近文章
const loadRecentArticles = async () => {
    // 未登录不请求，避免无意义接口调用
    if (!loginUserStore.loginUser.id)
        return;
    loadingArticles.value = true;
    try {
        // 首页仅读取少量最近记录用于展示
        const res = await listArticle({ current: 1, pageSize: 6 });
        recentArticles.value = res.data.data?.records || [];
    }
    catch (error) {
        console.error('加载文章失败:', error);
    }
    finally {
        loadingArticles.value = false;
    }
};
// 格式化时间
const formatTime = (time) => {
    // 时间缺失时显示占位符
    if (!time)
        return '--';
    // 统一首页卡片时间格式
    return dayjs(time).format('MM-DD HH:mm');
};
// 功能卡片数据
const features = [
    {
        icon: FileTextOutlined,
        title: '智能生成标题',
        description: 'AI 自动分析选题，生成吸引眼球的爆款标题',
        color: '#22C55E'
    },
    {
        icon: OrderedListOutlined,
        title: '自动生成大纲',
        description: '智能规划文章结构，确保逻辑清晰完整',
        color: '#3B82F6'
    },
    {
        icon: EditOutlined,
        title: '流式生成正文',
        description: '实时展示创作过程，体验打字机般的流畅输出',
        color: '#8B5CF6'
    },
    {
        icon: PictureOutlined,
        title: '智能配图',
        description: '自动检索高质量无版权图片，完美匹配内容',
        color: '#F59E0B'
    },
    {
        icon: ThunderboltOutlined,
        title: '快速高效',
        description: '5-10分钟完成全文创作，效率提升10倍',
        color: '#EF4444'
    },
    {
        icon: ClockCircleOutlined,
        title: '历史管理',
        description: '随时查看和管理所有创作记录，支持导出',
        color: '#06B6D4'
    }
];
onMounted(() => {
    // 首页加载后尝试拉取最近文章
    loadRecentArticles();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['topic-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['features-section']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-card']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-section']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['view-all-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card']} */ ;
/** @type {__VLS_StyleScopedClasses['article-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['article-status']} */ ;
/** @type {__VLS_StyleScopedClasses['article-status']} */ ;
/** @type {__VLS_StyleScopedClasses['article-status']} */ ;
/** @type {__VLS_StyleScopedClasses['features-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-section']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['features-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    id: "homePage",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-section" },
});
/** @type {__VLS_StyleScopedClasses['hero-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-bg" },
});
/** @type {__VLS_StyleScopedClasses['hero-bg']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "container" },
});
/** @type {__VLS_StyleScopedClasses['container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-badge" },
});
/** @type {__VLS_StyleScopedClasses['hero-badge']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.ThunderboltOutlined} */
ThunderboltOutlined;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "hero-title" },
});
/** @type {__VLS_StyleScopedClasses['hero-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "hero-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['hero-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "input-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
let __VLS_5;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput | typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ 'onPressEnter': {} },
    value: (__VLS_ctx.topic),
    placeholder: "输入您想创作的文章选题，例如：2026年AI如何改变职场",
    size: "large",
    ...{ class: "topic-input" },
}));
const __VLS_7 = __VLS_6({
    ...{ 'onPressEnter': {} },
    value: (__VLS_ctx.topic),
    placeholder: "输入您想创作的文章选题，例如：2026年AI如何改变职场",
    size: "large",
    ...{ class: "topic-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
let __VLS_10;
const __VLS_11 = ({ pressEnter: {} },
    { onPressEnter: (__VLS_ctx.goToCreate) });
/** @type {__VLS_StyleScopedClasses['topic-input']} */ ;
const { default: __VLS_12 } = __VLS_8.slots;
{
    const { prefix: __VLS_13 } = __VLS_8.slots;
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.EditOutlined} */
    EditOutlined;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        ...{ class: "input-icon" },
    }));
    const __VLS_16 = __VLS_15({
        ...{ class: "input-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    /** @type {__VLS_StyleScopedClasses['input-icon']} */ ;
    // @ts-ignore
    [topic, goToCreate,];
}
// @ts-ignore
[];
var __VLS_8;
var __VLS_9;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "cta-btn" },
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "cta-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_24;
const __VLS_25 = ({ click: {} },
    { onClick: (__VLS_ctx.goToCreate) });
/** @type {__VLS_StyleScopedClasses['cta-btn']} */ ;
const { default: __VLS_26 } = __VLS_22.slots;
let __VLS_27;
/** @ts-ignore @type {typeof __VLS_components.RocketOutlined} */
RocketOutlined;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent1(__VLS_27, new __VLS_27({}));
const __VLS_29 = __VLS_28({}, ...__VLS_functionalComponentArgsRest(__VLS_28));
// @ts-ignore
[goToCreate,];
var __VLS_22;
var __VLS_23;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "hero-tips" },
});
/** @type {__VLS_StyleScopedClasses['hero-tips']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "features-section" },
});
/** @type {__VLS_StyleScopedClasses['features-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "container" },
});
/** @type {__VLS_StyleScopedClasses['container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "section-header" },
});
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "section-badge" },
});
/** @type {__VLS_StyleScopedClasses['section-badge']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    ...{ class: "section-title" },
});
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "section-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['section-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "features-grid" },
});
/** @type {__VLS_StyleScopedClasses['features-grid']} */ ;
for (const [feature, index] of __VLS_vFor((__VLS_ctx.features))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (index),
        ...{ class: "feature-card" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-icon-wrapper" },
        ...{ style: ({ background: `${feature.color}15` }) },
    });
    /** @type {__VLS_StyleScopedClasses['feature-icon-wrapper']} */ ;
    const __VLS_32 = (feature.icon);
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent1(__VLS_32, new __VLS_32({
        ...{ class: "feature-icon" },
        ...{ style: ({ color: feature.color }) },
    }));
    const __VLS_34 = __VLS_33({
        ...{ class: "feature-icon" },
        ...{ style: ({ color: feature.color }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    /** @type {__VLS_StyleScopedClasses['feature-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-content" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "feature-title" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-title']} */ ;
    (feature.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "feature-description" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-description']} */ ;
    (feature.description);
    // @ts-ignore
    [features,];
}
if (__VLS_ctx.loginUserStore.loginUser.id && __VLS_ctx.recentArticles.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "articles-section" },
    });
    /** @type {__VLS_StyleScopedClasses['articles-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "container" },
    });
    /** @type {__VLS_StyleScopedClasses['container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-header-row" },
    });
    /** @type {__VLS_StyleScopedClasses['section-header-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "section-title-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['section-title-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "section-subtitle-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['section-subtitle-sm']} */ ;
    let __VLS_37;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({
        ...{ 'onClick': {} },
        type: "link",
        ...{ class: "view-all-btn" },
    }));
    const __VLS_39 = __VLS_38({
        ...{ 'onClick': {} },
        type: "link",
        ...{ class: "view-all-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_38));
    let __VLS_42;
    const __VLS_43 = ({ click: {} },
        { onClick: (__VLS_ctx.goToList) });
    /** @type {__VLS_StyleScopedClasses['view-all-btn']} */ ;
    const { default: __VLS_44 } = __VLS_40.slots;
    let __VLS_45;
    /** @ts-ignore @type {typeof __VLS_components.RightOutlined} */
    RightOutlined;
    // @ts-ignore
    const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({}));
    const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
    // @ts-ignore
    [loginUserStore, recentArticles, goToList,];
    var __VLS_40;
    var __VLS_41;
    let __VLS_50;
    /** @ts-ignore @type {typeof __VLS_components.aSpin | typeof __VLS_components.ASpin | typeof __VLS_components.aSpin | typeof __VLS_components.ASpin} */
    aSpin;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
        spinning: (__VLS_ctx.loadingArticles),
    }));
    const __VLS_52 = __VLS_51({
        spinning: (__VLS_ctx.loadingArticles),
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    const { default: __VLS_55 } = __VLS_53.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "articles-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['articles-grid']} */ ;
    for (const [article] of __VLS_vFor((__VLS_ctx.recentArticles))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.loginUserStore.loginUser.id && __VLS_ctx.recentArticles.length > 0))
                        return;
                    __VLS_ctx.viewArticle(article);
                    // @ts-ignore
                    [recentArticles, loadingArticles, viewArticle,];
                } },
            key: (article.id),
            ...{ class: "article-card" },
        });
        /** @type {__VLS_StyleScopedClasses['article-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "article-cover" },
        });
        /** @type {__VLS_StyleScopedClasses['article-cover']} */ ;
        if (article.coverImage) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                src: (article.coverImage),
                alt: (article.mainTitle),
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "cover-placeholder" },
            });
            /** @type {__VLS_StyleScopedClasses['cover-placeholder']} */ ;
            let __VLS_56;
            /** @ts-ignore @type {typeof __VLS_components.FileTextOutlined} */
            FileTextOutlined;
            // @ts-ignore
            const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({}));
            const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "article-info" },
        });
        /** @type {__VLS_StyleScopedClasses['article-info']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
            ...{ class: "article-title" },
        });
        /** @type {__VLS_StyleScopedClasses['article-title']} */ ;
        (article.mainTitle || article.topic);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "article-meta" },
        });
        /** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "article-time" },
        });
        /** @type {__VLS_StyleScopedClasses['article-time']} */ ;
        let __VLS_61;
        /** @ts-ignore @type {typeof __VLS_components.ClockCircleOutlined} */
        ClockCircleOutlined;
        // @ts-ignore
        const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({}));
        const __VLS_63 = __VLS_62({}, ...__VLS_functionalComponentArgsRest(__VLS_62));
        (__VLS_ctx.formatTime(article.createTime));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['article-status', `status-${article.status?.toLowerCase()}`]) },
        });
        /** @type {__VLS_StyleScopedClasses['article-status']} */ ;
        (article.status === 'COMPLETED' ? '已完成' : article.status === 'PROCESSING' ? '生成中' : '等待中');
        // @ts-ignore
        [formatTime,];
    }
    // @ts-ignore
    [];
    var __VLS_53;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
