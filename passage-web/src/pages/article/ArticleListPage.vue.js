import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { PlusOutlined, SearchOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined, FileTextOutlined, RedoOutlined } from '@ant-design/icons-vue';
import { listArticle, deleteArticle as deleteArticleApi, getArticle } from '@/api/articleController';
import dayjs from 'dayjs';
const router = useRouter();
const tableScrollSyncRef = ref(null);
const topScrollbarRef = ref(null);
const topScrollbarInnerRef = ref(null);
let tableHorizontalScroller = null;
let isSyncingFromTop = false;
let isSyncingFromTable = false;
// 搜索筛选
const searchKeyword = ref('');
const dateRange = ref(null);
const statusFilter = ref('');
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
        fixed: 'right',
    },
];
const loading = ref(false);
const dataSource = ref([]);
const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    pageSizeOptions: ['10', '20', '50', '100']
});
// 加载数据
/**
 * 加载文章分页数据，并在前端执行筛选条件。
 */
const loadData = async () => {
    // 进入加载态，防止重复触发
    loading.value = true;
    try {
        // 拉取当前分页数据
        const res = await listArticle({
            current: pagination.value.current,
            pageSize: pagination.value.pageSize,
            // 如果后端支持，可以传递搜索参数
            // keyword: searchKeyword.value,
            // status: statusFilter.value,
        });
        const pageData = res.data.data;
        let records = pageData?.records || [];
        // 前端过滤（如果后端不支持）
        if (searchKeyword.value) {
            // 标题与选题字段统一按小写匹配
            const keyword = searchKeyword.value.toLowerCase();
            records = records.filter((item) => item.mainTitle?.toLowerCase().includes(keyword) ||
                item.topic?.toLowerCase().includes(keyword));
        }
        if (statusFilter.value) {
            // 状态精确匹配
            records = records.filter((item) => item.status === statusFilter.value);
        }
        if (dateRange.value) {
            // 按起止日期过滤创建时间
            const [start, end] = dateRange.value;
            records = records.filter((item) => {
                const createTime = dayjs(item.createTime);
                return createTime.isAfter(start.startOf('day')) && createTime.isBefore(end.endOf('day'));
            });
        }
        dataSource.value = records;
        // 总条数仍以后端分页返回为准
        pagination.value.total = pageData?.totalRow || 0;
    }
    catch (error) {
        message.error(error.message || '加载失败');
    }
    finally {
        // 请求结束后关闭加载态
        loading.value = false;
        syncTableScrollbars();
    }
};
const getHorizontalScroller = () => {
    if (!tableScrollSyncRef.value) {
        return null;
    }
    const candidates = tableScrollSyncRef.value.querySelectorAll('.ant-table-content, .ant-table-body');
    for (const el of candidates) {
        if (el.scrollWidth > el.clientWidth) {
            return el;
        }
    }
    return candidates[0] ?? null;
};
const handleTableScrollerScroll = () => {
    if (!tableHorizontalScroller || !topScrollbarRef.value) {
        return;
    }
    if (isSyncingFromTop) {
        return;
    }
    isSyncingFromTable = true;
    topScrollbarRef.value.scrollLeft = tableHorizontalScroller.scrollLeft;
    isSyncingFromTable = false;
};
const handleTopScrollbarScroll = () => {
    if (!tableHorizontalScroller || !topScrollbarRef.value) {
        return;
    }
    if (isSyncingFromTable) {
        return;
    }
    isSyncingFromTop = true;
    tableHorizontalScroller.scrollLeft = topScrollbarRef.value.scrollLeft;
    isSyncingFromTop = false;
};
const syncTableScrollbars = () => {
    nextTick(() => {
        const nextScroller = getHorizontalScroller();
        if (tableHorizontalScroller && tableHorizontalScroller !== nextScroller) {
            tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll);
        }
        tableHorizontalScroller = nextScroller;
        if (!tableHorizontalScroller || !topScrollbarRef.value || !topScrollbarInnerRef.value) {
            return;
        }
        tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll);
        tableHorizontalScroller.addEventListener('scroll', handleTableScrollerScroll, { passive: true });
        topScrollbarInnerRef.value.style.width = `${tableHorizontalScroller.scrollWidth}px`;
        const hasHorizontalOverflow = tableHorizontalScroller.scrollWidth > tableHorizontalScroller.clientWidth + 1;
        topScrollbarRef.value.style.display = hasHorizontalOverflow ? 'block' : 'none';
        topScrollbarRef.value.scrollLeft = tableHorizontalScroller.scrollLeft;
    });
};
// 搜索处理
/**
 * 触发关键词搜索，并回到第一页。
 */
const handleSearch = () => {
    // 新搜索从第一页开始展示
    pagination.value.current = 1;
    loadData();
};
/**
 * 监听搜索框变化，清空时自动恢复全量数据。
 */
const handleSearchChange = () => {
    // 如果搜索框清空，也触发搜索
    if (!searchKeyword.value) {
        handleSearch();
    }
};
/**
 * 日期范围变化后刷新列表。
 */
const handleDateChange = () => {
    // 日期筛选变化后重置到第一页
    pagination.value.current = 1;
    loadData();
};
/**
 * 状态筛选变化后刷新列表。
 */
const handleStatusChange = () => {
    // 状态筛选变化后重置到第一页
    pagination.value.current = 1;
    loadData();
};
// 表格变化
/**
 * 同步表格分页参数并重新加载数据。
 */
const handleTableChange = (pag) => {
    // 更新分页参数
    pagination.value.current = pag.current;
    pagination.value.pageSize = pag.pageSize;
    // 根据新分页重新查询
    loadData();
};
// 查看文章
/**
 * 跳转到文章详情页。
 */
const viewArticle = (record) => {
    // 使用 taskId 跳转详情页
    router.push(`/article/${record.taskId}`);
};
// 导出文章
/**
 * 拉取详情后导出 Markdown 文件。
 */
const exportArticle = async (record) => {
    try {
        // 使用 taskId 获取最新文章详情
        const res = await getArticle({ taskId: record.taskId || '' });
        const article = res.data.data;
        if (!article) {
            message.error('文章数据不存在');
            return;
        }
        let markdown = `# ${article.mainTitle}\n\n`;
        markdown += `> ${article.subTitle}\n\n`;
        // 优先导出带配图的完整正文
        if (article.fullContent) {
            markdown += article.fullContent;
        }
        else {
            markdown += article.content || '';
        }
        // 创建下载链接并触发浏览器下载
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.mainTitle || '文章'}.md`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('导出成功');
    }
    catch (error) {
        message.error(error.message || '导出失败');
    }
};
// 删除文章
/**
 * 删除指定文章并刷新列表。
 */
const deleteArticle = async (record) => {
    try {
        // 调用删除接口（按主键 id）
        await deleteArticleApi({ id: record.id });
        message.success('删除成功');
        // 删除成功后重新加载当前页
        loadData();
    }
    catch (error) {
        message.error(error.message || '删除失败');
    }
};
// 重试文章（重新创建）
/**
 * 打开确认框并带选题跳转至创作页。
 */
const retryArticle = (record) => {
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
            });
        }
    });
};
// 跳转创作页面
/**
 * 跳转到文章创作页。
 */
const goToCreate = () => {
    // 进入创作页开始新任务
    router.push('/create');
};
// 格式化日期
/**
 * 统一列表时间展示格式。
 */
const formatDate = (date) => {
    if (!date) {
        return '-';
    }
    // 列表页使用分钟级展示
    return dayjs(date).format('YYYY-MM-DD HH:mm');
};
// 获取状态文本
/**
 * 将状态码转换为中文标签。
 */
const getStatusText = (status) => {
    // 后端状态码映射为前端展示文案
    const textMap = {
        PENDING: '等待中',
        PROCESSING: '生成中',
        COMPLETED: '已完成',
        FAILED: '失败',
    };
    return textMap[status] || status;
};
// 获取风格文本
/**
 * 将风格编码转换为中文标签。
 */
const getStyleText = (style) => {
    const textMap = {
        tech: '科技',
        emotional: '情感',
        educational: '教育',
        humorous: '幽默',
    };
    if (!style) {
        return '默认';
    }
    return textMap[style] || style;
};
// 获取阶段文本
/**
 * 将阶段编码转换为中文标签。
 */
const getPhaseText = (phase) => {
    const textMap = {
        PENDING: '等待中',
        TITLE_GENERATING: '生成标题',
        TITLE_SELECTING: '选择标题',
        OUTLINE_GENERATING: '生成大纲',
        OUTLINE_EDITING: '编辑大纲',
        CONTENT_GENERATING: '生成正文',
    };
    if (!phase) {
        return '-';
    }
    return textMap[phase] || phase;
};
onMounted(() => {
    // 首次进入页面自动加载数据
    loadData();
    window.addEventListener('resize', syncTableScrollbars);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', syncTableScrollbars);
    if (tableHorizontalScroller) {
        tableHorizontalScroller.removeEventListener('scroll', handleTableScrollerScroll);
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "article-list-page" },
});
/** @type {__VLS_StyleScopedClasses['article-list-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-header" },
});
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-container" },
});
/** @type {__VLS_StyleScopedClasses['header-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-content" },
});
/** @type {__VLS_StyleScopedClasses['header-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "page-title" },
});
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "page-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "create-btn" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    ...{ class: "create-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.goToCreate) });
/** @type {__VLS_StyleScopedClasses['create-btn']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
{
    const { icon: __VLS_8 } = __VLS_3.slots;
    let __VLS_9;
    /** @ts-ignore @type {typeof __VLS_components.PlusOutlined} */
    PlusOutlined;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent1(__VLS_9, new __VLS_9({}));
    const __VLS_11 = __VLS_10({}, ...__VLS_functionalComponentArgsRest(__VLS_10));
    // @ts-ignore
    [goToCreate,];
}
// @ts-ignore
[];
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "container" },
});
/** @type {__VLS_StyleScopedClasses['container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-bar" },
});
/** @type {__VLS_StyleScopedClasses['filter-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-left" },
});
/** @type {__VLS_StyleScopedClasses['filter-left']} */ ;
let __VLS_14;
/** @ts-ignore @type {typeof __VLS_components.aInputSearch | typeof __VLS_components.AInputSearch | typeof __VLS_components.aInputSearch | typeof __VLS_components.AInputSearch} */
aInputSearch;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
    ...{ 'onSearch': {} },
    ...{ 'onChange': {} },
    value: (__VLS_ctx.searchKeyword),
    placeholder: "搜索文章标题...",
    ...{ style: {} },
    allowClear: true,
    ...{ class: "search-input" },
}));
const __VLS_16 = __VLS_15({
    ...{ 'onSearch': {} },
    ...{ 'onChange': {} },
    value: (__VLS_ctx.searchKeyword),
    placeholder: "搜索文章标题...",
    ...{ style: {} },
    allowClear: true,
    ...{ class: "search-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_19;
const __VLS_20 = ({ search: {} },
    { onSearch: (__VLS_ctx.handleSearch) });
const __VLS_21 = ({ change: {} },
    { onChange: (__VLS_ctx.handleSearchChange) });
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
const { default: __VLS_22 } = __VLS_17.slots;
{
    const { prefix: __VLS_23 } = __VLS_17.slots;
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.SearchOutlined} */
    SearchOutlined;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        ...{ class: "search-icon" },
    }));
    const __VLS_26 = __VLS_25({
        ...{ class: "search-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    /** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
    // @ts-ignore
    [searchKeyword, handleSearch, handleSearchChange,];
}
// @ts-ignore
[];
var __VLS_17;
var __VLS_18;
let __VLS_29;
/** @ts-ignore @type {typeof __VLS_components.aRangePicker | typeof __VLS_components.ARangePicker} */
aRangePicker;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.dateRange),
    placeholder: (['开始日期', '结束日期']),
    ...{ class: "date-picker" },
}));
const __VLS_31 = __VLS_30({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.dateRange),
    placeholder: (['开始日期', '结束日期']),
    ...{ class: "date-picker" },
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
let __VLS_34;
const __VLS_35 = ({ change: {} },
    { onChange: (__VLS_ctx.handleDateChange) });
/** @type {__VLS_StyleScopedClasses['date-picker']} */ ;
var __VLS_32;
var __VLS_33;
let __VLS_36;
/** @ts-ignore @type {typeof __VLS_components.aSelect | typeof __VLS_components.ASelect | typeof __VLS_components.aSelect | typeof __VLS_components.ASelect} */
aSelect;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.statusFilter),
    placeholder: "全部状态",
    ...{ style: {} },
    allowClear: true,
    ...{ class: "status-select" },
}));
const __VLS_38 = __VLS_37({
    ...{ 'onChange': {} },
    value: (__VLS_ctx.statusFilter),
    placeholder: "全部状态",
    ...{ style: {} },
    allowClear: true,
    ...{ class: "status-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_41;
const __VLS_42 = ({ change: {} },
    { onChange: (__VLS_ctx.handleStatusChange) });
/** @type {__VLS_StyleScopedClasses['status-select']} */ ;
const { default: __VLS_43 } = __VLS_39.slots;
let __VLS_44;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
    value: "",
}));
const __VLS_46 = __VLS_45({
    value: "",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
const { default: __VLS_49 } = __VLS_47.slots;
// @ts-ignore
[dateRange, handleDateChange, statusFilter, handleStatusChange,];
var __VLS_47;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    value: "COMPLETED",
}));
const __VLS_52 = __VLS_51({
    value: "COMPLETED",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
const { default: __VLS_55 } = __VLS_53.slots;
// @ts-ignore
[];
var __VLS_53;
let __VLS_56;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({
    value: "PROCESSING",
}));
const __VLS_58 = __VLS_57({
    value: "PROCESSING",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const { default: __VLS_61 } = __VLS_59.slots;
// @ts-ignore
[];
var __VLS_59;
let __VLS_62;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
    value: "PENDING",
}));
const __VLS_64 = __VLS_63({
    value: "PENDING",
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
const { default: __VLS_67 } = __VLS_65.slots;
// @ts-ignore
[];
var __VLS_65;
let __VLS_68;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent1(__VLS_68, new __VLS_68({
    value: "FAILED",
}));
const __VLS_70 = __VLS_69({
    value: "FAILED",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const { default: __VLS_73 } = __VLS_71.slots;
// @ts-ignore
[];
var __VLS_71;
// @ts-ignore
[];
var __VLS_39;
var __VLS_40;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-right" },
});
/** @type {__VLS_StyleScopedClasses['filter-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "total-count" },
});
/** @type {__VLS_StyleScopedClasses['total-count']} */ ;
(__VLS_ctx.pagination.total);
let __VLS_74;
/** @ts-ignore @type {typeof __VLS_components.aCard | typeof __VLS_components.ACard | typeof __VLS_components.aCard | typeof __VLS_components.ACard} */
aCard;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent1(__VLS_74, new __VLS_74({
    bordered: (false),
    ...{ class: "table-card" },
}));
const __VLS_76 = __VLS_75({
    bordered: (false),
    ...{ class: "table-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
const { default: __VLS_79 } = __VLS_77.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ref: "tableScrollSyncRef",
    ...{ class: "table-scroll-sync" },
});
/** @type {__VLS_StyleScopedClasses['table-scroll-sync']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onScroll: (__VLS_ctx.handleTopScrollbarScroll) },
    ref: "topScrollbarRef",
    ...{ class: "table-top-scrollbar" },
});
/** @type {__VLS_StyleScopedClasses['table-top-scrollbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ref: "topScrollbarInnerRef",
    ...{ class: "table-top-scrollbar-inner" },
});
/** @type {__VLS_StyleScopedClasses['table-top-scrollbar-inner']} */ ;
let __VLS_80;
/** @ts-ignore @type {typeof __VLS_components.aTable | typeof __VLS_components.ATable | typeof __VLS_components.aTable | typeof __VLS_components.ATable} */
aTable;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent1(__VLS_80, new __VLS_80({
    ...{ 'onChange': {} },
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.dataSource),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.pagination),
    scroll: ({ x: 'max-content' }),
    rowKey: "id",
    ...{ class: "article-table" },
}));
const __VLS_82 = __VLS_81({
    ...{ 'onChange': {} },
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.dataSource),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.pagination),
    scroll: ({ x: 'max-content' }),
    rowKey: "id",
    ...{ class: "article-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
let __VLS_85;
const __VLS_86 = ({ change: {} },
    { onChange: (__VLS_ctx.handleTableChange) });
/** @type {__VLS_StyleScopedClasses['article-table']} */ ;
const { default: __VLS_87 } = __VLS_83.slots;
{
    const { bodyCell: __VLS_88 } = __VLS_83.slots;
    const [{ column, record }] = __VLS_vSlot(__VLS_88);
    if (column.key === 'title') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(column.key === 'title'))
                        return;
                    __VLS_ctx.viewArticle(record);
                    // @ts-ignore
                    [pagination, pagination, handleTopScrollbarScroll, columns, dataSource, loading, handleTableChange, viewArticle,];
                } },
            ...{ class: "title-cell" },
        });
        /** @type {__VLS_StyleScopedClasses['title-cell']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "main-title" },
        });
        /** @type {__VLS_StyleScopedClasses['main-title']} */ ;
        (record.mainTitle || record.topic || '-');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sub-title" },
        });
        /** @type {__VLS_StyleScopedClasses['sub-title']} */ ;
        (record.subTitle || '-');
    }
    else if (column.key === 'status') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['status-badge', `status-${record.status?.toLowerCase()}`]) },
        });
        /** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "status-dot" },
        });
        /** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
        (__VLS_ctx.getStatusText(record.status));
    }
    else if (column.key === 'style') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "style-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['style-badge']} */ ;
        (__VLS_ctx.getStyleText(record.style));
    }
    else if (column.key === 'phase') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['phase-badge', `phase-${record.phase?.toLowerCase()}`]) },
        });
        /** @type {__VLS_StyleScopedClasses['phase-badge']} */ ;
        (__VLS_ctx.getPhaseText(record.phase));
    }
    else if (column.key === 'imageCount') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "count-text" },
        });
        /** @type {__VLS_StyleScopedClasses['count-text']} */ ;
        (record.images?.length ?? 0);
    }
    else if (column.key === 'createTime') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "time-text" },
        });
        /** @type {__VLS_StyleScopedClasses['time-text']} */ ;
        (__VLS_ctx.formatDate(record.createTime));
    }
    else if (column.key === 'completedTime') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "time-text" },
        });
        /** @type {__VLS_StyleScopedClasses['time-text']} */ ;
        (__VLS_ctx.formatDate(record.completedTime));
    }
    else if (column.key === 'errorMessage') {
        let __VLS_89;
        /** @ts-ignore @type {typeof __VLS_components.aTooltip | typeof __VLS_components.ATooltip | typeof __VLS_components.aTooltip | typeof __VLS_components.ATooltip} */
        aTooltip;
        // @ts-ignore
        const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
            title: (record.errorMessage || '-'),
        }));
        const __VLS_91 = __VLS_90({
            title: (record.errorMessage || '-'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_90));
        const { default: __VLS_94 } = __VLS_92.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: (['error-text', { empty: !record.errorMessage }]) },
        });
        /** @type {__VLS_StyleScopedClasses['empty']} */ ;
        /** @type {__VLS_StyleScopedClasses['error-text']} */ ;
        (record.errorMessage || '-');
        // @ts-ignore
        [getStatusText, getStyleText, getPhaseText, formatDate, formatDate,];
        var __VLS_92;
    }
    else if (column.key === 'action') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "action-group" },
        });
        /** @type {__VLS_StyleScopedClasses['action-group']} */ ;
        let __VLS_95;
        /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
        aButton;
        // @ts-ignore
        const __VLS_96 = __VLS_asFunctionalComponent1(__VLS_95, new __VLS_95({
            ...{ 'onClick': {} },
            type: "link",
            size: "small",
            ...{ class: "action-btn view-btn" },
        }));
        const __VLS_97 = __VLS_96({
            ...{ 'onClick': {} },
            type: "link",
            size: "small",
            ...{ class: "action-btn view-btn" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_96));
        let __VLS_100;
        const __VLS_101 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(column.key === 'title'))
                        return;
                    if (!!(column.key === 'status'))
                        return;
                    if (!!(column.key === 'style'))
                        return;
                    if (!!(column.key === 'phase'))
                        return;
                    if (!!(column.key === 'imageCount'))
                        return;
                    if (!!(column.key === 'createTime'))
                        return;
                    if (!!(column.key === 'completedTime'))
                        return;
                    if (!!(column.key === 'errorMessage'))
                        return;
                    if (!(column.key === 'action'))
                        return;
                    __VLS_ctx.viewArticle(record);
                    // @ts-ignore
                    [viewArticle,];
                } });
        /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['view-btn']} */ ;
        const { default: __VLS_102 } = __VLS_98.slots;
        let __VLS_103;
        /** @ts-ignore @type {typeof __VLS_components.EyeOutlined} */
        EyeOutlined;
        // @ts-ignore
        const __VLS_104 = __VLS_asFunctionalComponent1(__VLS_103, new __VLS_103({}));
        const __VLS_105 = __VLS_104({}, ...__VLS_functionalComponentArgsRest(__VLS_104));
        // @ts-ignore
        [];
        var __VLS_98;
        var __VLS_99;
        if (record.status === 'FAILED') {
            let __VLS_108;
            /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
            aButton;
            // @ts-ignore
            const __VLS_109 = __VLS_asFunctionalComponent1(__VLS_108, new __VLS_108({
                ...{ 'onClick': {} },
                type: "link",
                size: "small",
                ...{ class: "action-btn retry-btn" },
            }));
            const __VLS_110 = __VLS_109({
                ...{ 'onClick': {} },
                type: "link",
                size: "small",
                ...{ class: "action-btn retry-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_109));
            let __VLS_113;
            const __VLS_114 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(column.key === 'title'))
                            return;
                        if (!!(column.key === 'status'))
                            return;
                        if (!!(column.key === 'style'))
                            return;
                        if (!!(column.key === 'phase'))
                            return;
                        if (!!(column.key === 'imageCount'))
                            return;
                        if (!!(column.key === 'createTime'))
                            return;
                        if (!!(column.key === 'completedTime'))
                            return;
                        if (!!(column.key === 'errorMessage'))
                            return;
                        if (!(column.key === 'action'))
                            return;
                        if (!(record.status === 'FAILED'))
                            return;
                        __VLS_ctx.retryArticle(record);
                        // @ts-ignore
                        [retryArticle,];
                    } });
            /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['retry-btn']} */ ;
            const { default: __VLS_115 } = __VLS_111.slots;
            let __VLS_116;
            /** @ts-ignore @type {typeof __VLS_components.RedoOutlined} */
            RedoOutlined;
            // @ts-ignore
            const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({}));
            const __VLS_118 = __VLS_117({}, ...__VLS_functionalComponentArgsRest(__VLS_117));
            // @ts-ignore
            [];
            var __VLS_111;
            var __VLS_112;
        }
        else {
            let __VLS_121;
            /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
            aButton;
            // @ts-ignore
            const __VLS_122 = __VLS_asFunctionalComponent1(__VLS_121, new __VLS_121({
                ...{ 'onClick': {} },
                type: "link",
                size: "small",
                ...{ class: "action-btn export-btn" },
            }));
            const __VLS_123 = __VLS_122({
                ...{ 'onClick': {} },
                type: "link",
                size: "small",
                ...{ class: "action-btn export-btn" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_122));
            let __VLS_126;
            const __VLS_127 = ({ click: {} },
                { onClick: (...[$event]) => {
                        if (!!(column.key === 'title'))
                            return;
                        if (!!(column.key === 'status'))
                            return;
                        if (!!(column.key === 'style'))
                            return;
                        if (!!(column.key === 'phase'))
                            return;
                        if (!!(column.key === 'imageCount'))
                            return;
                        if (!!(column.key === 'createTime'))
                            return;
                        if (!!(column.key === 'completedTime'))
                            return;
                        if (!!(column.key === 'errorMessage'))
                            return;
                        if (!(column.key === 'action'))
                            return;
                        if (!!(record.status === 'FAILED'))
                            return;
                        __VLS_ctx.exportArticle(record);
                        // @ts-ignore
                        [exportArticle,];
                    } });
            /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['export-btn']} */ ;
            const { default: __VLS_128 } = __VLS_124.slots;
            let __VLS_129;
            /** @ts-ignore @type {typeof __VLS_components.DownloadOutlined} */
            DownloadOutlined;
            // @ts-ignore
            const __VLS_130 = __VLS_asFunctionalComponent1(__VLS_129, new __VLS_129({}));
            const __VLS_131 = __VLS_130({}, ...__VLS_functionalComponentArgsRest(__VLS_130));
            // @ts-ignore
            [];
            var __VLS_124;
            var __VLS_125;
        }
        let __VLS_134;
        /** @ts-ignore @type {typeof __VLS_components.aPopconfirm | typeof __VLS_components.APopconfirm | typeof __VLS_components.aPopconfirm | typeof __VLS_components.APopconfirm} */
        aPopconfirm;
        // @ts-ignore
        const __VLS_135 = __VLS_asFunctionalComponent1(__VLS_134, new __VLS_134({
            ...{ 'onConfirm': {} },
            title: "确定要删除这篇文章吗?",
            okText: "确定",
            cancelText: "取消",
        }));
        const __VLS_136 = __VLS_135({
            ...{ 'onConfirm': {} },
            title: "确定要删除这篇文章吗?",
            okText: "确定",
            cancelText: "取消",
        }, ...__VLS_functionalComponentArgsRest(__VLS_135));
        let __VLS_139;
        const __VLS_140 = ({ confirm: {} },
            { onConfirm: (...[$event]) => {
                    if (!!(column.key === 'title'))
                        return;
                    if (!!(column.key === 'status'))
                        return;
                    if (!!(column.key === 'style'))
                        return;
                    if (!!(column.key === 'phase'))
                        return;
                    if (!!(column.key === 'imageCount'))
                        return;
                    if (!!(column.key === 'createTime'))
                        return;
                    if (!!(column.key === 'completedTime'))
                        return;
                    if (!!(column.key === 'errorMessage'))
                        return;
                    if (!(column.key === 'action'))
                        return;
                    __VLS_ctx.deleteArticle(record);
                    // @ts-ignore
                    [deleteArticle,];
                } });
        const { default: __VLS_141 } = __VLS_137.slots;
        let __VLS_142;
        /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
        aButton;
        // @ts-ignore
        const __VLS_143 = __VLS_asFunctionalComponent1(__VLS_142, new __VLS_142({
            type: "link",
            size: "small",
            danger: true,
            ...{ class: "action-btn delete-btn" },
        }));
        const __VLS_144 = __VLS_143({
            type: "link",
            size: "small",
            danger: true,
            ...{ class: "action-btn delete-btn" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_143));
        /** @type {__VLS_StyleScopedClasses['action-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
        const { default: __VLS_147 } = __VLS_145.slots;
        let __VLS_148;
        /** @ts-ignore @type {typeof __VLS_components.DeleteOutlined} */
        DeleteOutlined;
        // @ts-ignore
        const __VLS_149 = __VLS_asFunctionalComponent1(__VLS_148, new __VLS_148({}));
        const __VLS_150 = __VLS_149({}, ...__VLS_functionalComponentArgsRest(__VLS_149));
        // @ts-ignore
        [];
        var __VLS_145;
        // @ts-ignore
        [];
        var __VLS_137;
        var __VLS_138;
    }
    // @ts-ignore
    [];
}
{
    const { emptyText: __VLS_153 } = __VLS_83.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    let __VLS_154;
    /** @ts-ignore @type {typeof __VLS_components.FileTextOutlined} */
    FileTextOutlined;
    // @ts-ignore
    const __VLS_155 = __VLS_asFunctionalComponent1(__VLS_154, new __VLS_154({
        ...{ class: "empty-icon" },
    }));
    const __VLS_156 = __VLS_155({
        ...{ class: "empty-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_155));
    /** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "empty-title" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "empty-desc" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-desc']} */ ;
    let __VLS_159;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_160 = __VLS_asFunctionalComponent1(__VLS_159, new __VLS_159({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_161 = __VLS_160({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_160));
    let __VLS_164;
    const __VLS_165 = ({ click: {} },
        { onClick: (__VLS_ctx.goToCreate) });
    const { default: __VLS_166 } = __VLS_162.slots;
    let __VLS_167;
    /** @ts-ignore @type {typeof __VLS_components.PlusOutlined} */
    PlusOutlined;
    // @ts-ignore
    const __VLS_168 = __VLS_asFunctionalComponent1(__VLS_167, new __VLS_167({}));
    const __VLS_169 = __VLS_168({}, ...__VLS_functionalComponentArgsRest(__VLS_168));
    // @ts-ignore
    [goToCreate,];
    var __VLS_162;
    var __VLS_163;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_83;
var __VLS_84;
// @ts-ignore
[];
var __VLS_77;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
