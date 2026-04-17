import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { ArrowLeftOutlined, DownloadOutlined, OrderedListOutlined, FileTextOutlined, PictureOutlined, RedoOutlined, } from '@ant-design/icons-vue';
import { getArticle } from '@/api/articleController';
import { marked } from 'marked';
import dayjs from 'dayjs';
const router = useRouter();
const route = useRoute();
const loading = ref(false);
const article = ref(null);
// Markdown 转 HTML
/**
 * 将 Markdown 文本渲染为 HTML。
 */
const markdownToHtml = (markdown) => {
    // 详情页统一通过 marked 进行渲染
    return marked(markdown);
};
// 加载文章
/**
 * 根据路由 taskId 拉取文章详情。
 */
const loadArticle = async () => {
    const taskId = route.params.taskId;
    if (!taskId) {
        message.error('文章ID不存在');
        return;
    }
    // 打开加载态，避免重复点击与空白闪烁
    loading.value = true;
    try {
        // 请求后端文章详情接口
        const res = await getArticle({ taskId });
        // 兼容空数据返回
        article.value = res.data.data || null;
    }
    catch (error) {
        message.error(error.message || '加载失败');
    }
    finally {
        // 无论成功失败都关闭加载态
        loading.value = false;
    }
};
// 加载执行日志
// 返回
/**
 * 返回上一页。
 */
const goBack = () => {
    // 沿用浏览器历史栈返回
    router.back();
};
// 导出 Markdown
/**
 * 导出当前文章为 Markdown 文件。
 */
const exportMarkdown = () => {
    // 无文章数据时不执行导出
    if (!article.value)
        return;
    // 组装文件头部内容
    let markdown = `# ${article.value.mainTitle}\n\n`;
    markdown += `> ${article.value.subTitle}\n\n`;
    // 优先使用完整图文
    if (article.value.fullContent) {
        markdown += article.value.fullContent;
    }
    else {
        if (article.value.outline && article.value.outline.length > 0) {
            markdown += `## 目录\n\n`;
            article.value.outline.forEach(item => {
                // 输出目录编号与标题
                markdown += `${item.section}. ${item.title}\n`;
            });
            markdown += `\n---\n\n`;
        }
        markdown += article.value.content || '';
        if (article.value.images && article.value.images.length > 0) {
            markdown += `\n\n## 配图\n\n`;
            article.value.images.forEach(image => {
                // 将配图拼接为 markdown 图片语法
                markdown += `![${image.description}](${image.url})\n\n`;
            });
        }
    }
    // 通过 Blob 触发浏览器下载
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.value.mainTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
};
// 格式化日期
/**
 * 格式化时间字符串用于页面展示。
 */
const formatDate = (date) => {
    // 详情页使用秒级精度
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};
// 获取状态颜色
/**
 * 将后端状态映射为标签颜色。
 */
const getStatusColor = (status) => {
    // 状态与标签色的映射表
    const colorMap = {
        PENDING: 'default',
        PROCESSING: 'processing',
        COMPLETED: 'success',
        FAILED: 'error',
    };
    return colorMap[status] || 'default';
};
// 获取状态文本
/**
 * 将状态码映射为中文文案。
 */
const getStatusText = (status) => {
    // 状态与中文文案映射
    const textMap = {
        PENDING: '等待中',
        PROCESSING: '生成中',
        COMPLETED: '已完成',
        FAILED: '失败',
    };
    return textMap[status] || status;
};
// 获取智能体显示名称
/**
 * 将执行节点名称转换为用户可读文本。
 */
const getAgentDisplayName = (agentName) => {
    // 执行节点英文名与展示名映射
    const nameMap = {
        'agent1_generate_titles': '生成标题',
        'agent2_generate_outline': '生成大纲',
        'agent3_generate_content': '生成正文',
        'agent4_analyze_image_requirements': '分析配图需求',
        'agent5_generate_images': '生成配图',
        'agent6_merge_content': '图文合成',
        'ai_modify_outline': 'AI修改大纲'
    };
    return nameMap[agentName] || agentName;
};
// 重试（重新创建文章）
/**
 * 使用当前文章选题跳转到创作页重试。
 */
const handleRetry = () => {
    // 无文章上下文时不允许重试
    if (!article.value)
        return;
    Modal.confirm({
        title: '确认重试',
        content: '将使用相同的选题和配置重新创建文章，是否继续？',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
            // 仅回填选题，保持重试路径简洁
            router.push({
                path: '/create',
                query: {
                    topic: article.value?.topic
                }
            });
        }
    });
};
onMounted(() => {
    // 页面进入时自动拉取详情
    loadArticle();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "article-detail-page" },
});
/** @type {__VLS_StyleScopedClasses['article-detail-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-container" },
});
/** @type {__VLS_StyleScopedClasses['header-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-actions" },
});
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    ...{ class: "back-btn" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    ...{ class: "back-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.goBack) });
/** @type {__VLS_StyleScopedClasses['back-btn']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
{
    const { icon: __VLS_8 } = __VLS_3.slots;
    let __VLS_9;
    /** @ts-ignore @type {typeof __VLS_components.ArrowLeftOutlined} */
    ArrowLeftOutlined;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({}));
    const __VLS_11 = __VLS_10({}, ...__VLS_functionalComponentArgsRest(__VLS_10));
    // @ts-ignore
    [goBack,];
}
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "right-actions" },
});
/** @type {__VLS_StyleScopedClasses['right-actions']} */ ;
if (__VLS_ctx.article?.status === 'FAILED') {
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        ...{ 'onClick': {} },
        type: "primary",
        danger: true,
        ...{ class: "retry-btn" },
    }));
    const __VLS_16 = __VLS_15({
        ...{ 'onClick': {} },
        type: "primary",
        danger: true,
        ...{ class: "retry-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    let __VLS_19;
    const __VLS_20 = ({ click: {} },
        { onClick: (__VLS_ctx.handleRetry) });
    /** @type {__VLS_StyleScopedClasses['retry-btn']} */ ;
    const { default: __VLS_21 } = __VLS_17.slots;
    {
        const { icon: __VLS_22 } = __VLS_17.slots;
        let __VLS_23;
        /** @ts-ignore @type {typeof __VLS_components.RedoOutlined} */
        RedoOutlined;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({}));
        const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
        // @ts-ignore
        [article, handleRetry,];
    }
    // @ts-ignore
    [];
    var __VLS_17;
    var __VLS_18;
}
let __VLS_28;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "export-btn" },
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
    type: "primary",
    ...{ class: "export-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_33;
const __VLS_34 = ({ click: {} },
    { onClick: (__VLS_ctx.exportMarkdown) });
/** @type {__VLS_StyleScopedClasses['export-btn']} */ ;
const { default: __VLS_35 } = __VLS_31.slots;
{
    const { icon: __VLS_36 } = __VLS_31.slots;
    let __VLS_37;
    /** @ts-ignore @type {typeof __VLS_components.DownloadOutlined} */
    DownloadOutlined;
    // @ts-ignore
    const __VLS_38 = __VLS_asFunctionalComponent1(__VLS_37, new __VLS_37({}));
    const __VLS_39 = __VLS_38({}, ...__VLS_functionalComponentArgsRest(__VLS_38));
    // @ts-ignore
    [exportMarkdown,];
}
// @ts-ignore
[];
var __VLS_31;
var __VLS_32;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "container" },
});
/** @type {__VLS_StyleScopedClasses['container']} */ ;
let __VLS_42;
/** @ts-ignore @type {typeof __VLS_components.aSpin | typeof __VLS_components.ASpin | typeof __VLS_components.aSpin | typeof __VLS_components.ASpin} */
aSpin;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
    spinning: (__VLS_ctx.loading),
    tip: "加载中...",
}));
const __VLS_44 = __VLS_43({
    spinning: (__VLS_ctx.loading),
    tip: "加载中...",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
const { default: __VLS_47 } = __VLS_45.slots;
if (__VLS_ctx.article) {
    let __VLS_48;
    /** @ts-ignore @type {typeof __VLS_components.aCard | typeof __VLS_components.ACard | typeof __VLS_components.aCard | typeof __VLS_components.ACard} */
    aCard;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
        bordered: (false),
        ...{ class: "article-card" },
    }));
    const __VLS_50 = __VLS_49({
        bordered: (false),
        ...{ class: "article-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    /** @type {__VLS_StyleScopedClasses['article-card']} */ ;
    const { default: __VLS_53 } = __VLS_51.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "title-section" },
    });
    /** @type {__VLS_StyleScopedClasses['title-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "main-title" },
    });
    /** @type {__VLS_StyleScopedClasses['main-title']} */ ;
    (__VLS_ctx.article.mainTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "sub-title" },
    });
    /** @type {__VLS_StyleScopedClasses['sub-title']} */ ;
    (__VLS_ctx.article.subTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "meta-info" },
    });
    /** @type {__VLS_StyleScopedClasses['meta-info']} */ ;
    let __VLS_54;
    /** @ts-ignore @type {typeof __VLS_components.aTag | typeof __VLS_components.ATag | typeof __VLS_components.aTag | typeof __VLS_components.ATag} */
    aTag;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        color: (__VLS_ctx.getStatusColor(__VLS_ctx.article.status ?? '')),
        ...{ class: "status-tag" },
    }));
    const __VLS_56 = __VLS_55({
        color: (__VLS_ctx.getStatusColor(__VLS_ctx.article.status ?? '')),
        ...{ class: "status-tag" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    /** @type {__VLS_StyleScopedClasses['status-tag']} */ ;
    const { default: __VLS_59 } = __VLS_57.slots;
    (__VLS_ctx.getStatusText(__VLS_ctx.article.status ?? ''));
    // @ts-ignore
    [article, article, article, article, article, loading, getStatusColor, getStatusText,];
    var __VLS_57;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "time" },
    });
    /** @type {__VLS_StyleScopedClasses['time']} */ ;
    (__VLS_ctx.article.createTime ? __VLS_ctx.formatDate(__VLS_ctx.article.createTime) : '');
    let __VLS_60;
    /** @ts-ignore @type {typeof __VLS_components.aDivider | typeof __VLS_components.ADivider} */
    aDivider;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({}));
    const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
    if (__VLS_ctx.article.outline && __VLS_ctx.article.outline.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-section" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
        let __VLS_65;
        /** @ts-ignore @type {typeof __VLS_components.OrderedListOutlined} */
        OrderedListOutlined;
        // @ts-ignore
        const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
            ...{ class: "section-icon" },
        }));
        const __VLS_67 = __VLS_66({
            ...{ class: "section-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_66));
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "outline-list" },
        });
        /** @type {__VLS_StyleScopedClasses['outline-list']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.article.outline))) {
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
                [article, article, article, article, article, formatDate,];
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.article.outline && __VLS_ctx.article.outline.length > 0) {
        let __VLS_70;
        /** @ts-ignore @type {typeof __VLS_components.aDivider | typeof __VLS_components.ADivider} */
        aDivider;
        // @ts-ignore
        const __VLS_71 = __VLS_asFunctionalComponent1(__VLS_70, new __VLS_70({}));
        const __VLS_72 = __VLS_71({}, ...__VLS_functionalComponentArgsRest(__VLS_71));
    }
    if (__VLS_ctx.article.fullContent) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "content-section" },
        });
        /** @type {__VLS_StyleScopedClasses['content-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
        let __VLS_75;
        /** @ts-ignore @type {typeof __VLS_components.FileTextOutlined} */
        FileTextOutlined;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent1(__VLS_75, new __VLS_75({
            ...{ class: "section-icon" },
        }));
        const __VLS_77 = __VLS_76({
            ...{ class: "section-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "markdown-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.markdownToHtml(__VLS_ctx.article.fullContent)) }, null, null);
        /** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
    }
    else if (__VLS_ctx.article.content) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "content-section" },
        });
        /** @type {__VLS_StyleScopedClasses['content-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
        let __VLS_80;
        /** @ts-ignore @type {typeof __VLS_components.FileTextOutlined} */
        FileTextOutlined;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
            ...{ class: "section-icon" },
        }));
        const __VLS_82 = __VLS_81({
            ...{ class: "section-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "markdown-content" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.markdownToHtml(__VLS_ctx.article.content)) }, null, null);
        /** @type {__VLS_StyleScopedClasses['markdown-content']} */ ;
    }
    if (!__VLS_ctx.article.fullContent && __VLS_ctx.article.images && __VLS_ctx.article.images.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "images-section" },
        });
        /** @type {__VLS_StyleScopedClasses['images-section']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "section-title" },
        });
        /** @type {__VLS_StyleScopedClasses['section-title']} */ ;
        let __VLS_85;
        /** @ts-ignore @type {typeof __VLS_components.PictureOutlined} */
        PictureOutlined;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
            ...{ class: "section-icon" },
        }));
        const __VLS_87 = __VLS_86({
            ...{ class: "section-icon" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        /** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "images-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['images-grid']} */ ;
        for (const [image] of __VLS_vFor((__VLS_ctx.article.images))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (image.position),
                ...{ class: "image-item" },
            });
            /** @type {__VLS_StyleScopedClasses['image-item']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                src: (image.url),
                alt: (image.description),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "image-info" },
            });
            /** @type {__VLS_StyleScopedClasses['image-info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "badge" },
            });
            /** @type {__VLS_StyleScopedClasses['badge']} */ ;
            (image.method);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "keywords" },
            });
            /** @type {__VLS_StyleScopedClasses['keywords']} */ ;
            (image.keywords);
            // @ts-ignore
            [article, article, article, article, article, article, article, article, article, article, markdownToHtml, markdownToHtml,];
        }
    }
    // @ts-ignore
    [];
    var __VLS_51;
}
// @ts-ignore
[];
var __VLS_45;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
