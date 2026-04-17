import { addUser, deleteUser, listUserByPage, updateUser } from '@/api/userController';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { onMounted, reactive, ref } from 'vue';
const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '账号', dataIndex: 'userAccount', key: 'userAccount', width: 220 },
    { title: '昵称', dataIndex: 'userName', key: 'userName', width: 180 },
    { title: '角色', dataIndex: 'userRole', key: 'userRole', width: 120 },
    { title: '简介', dataIndex: 'userProfile', key: 'userProfile', ellipsis: true },
    { title: '注册时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
    { title: '操作', key: 'action', width: 150, fixed: 'right' },
];
const loading = ref(false);
const submitLoading = ref(false);
const rows = ref([]);
const queryParams = reactive({
    userAccount: '',
    userName: '',
    userRole: undefined,
});
const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
});
const modalVisible = ref(false);
const modalMode = ref('add');
const formState = reactive({
    id: undefined,
    userAccount: '',
    userPassword: '',
    userName: '',
    userAvatar: '',
    userProfile: '',
    userRole: 'user',
});
/**
 * 拉取用户分页数据。
 */
const loadUsers = async () => {
    // 进入加载态并请求后端分页接口
    loading.value = true;
    try {
        const res = await listUserByPage({
            current: pagination.current,
            pageSize: pagination.pageSize,
            userAccount: queryParams.userAccount,
            userName: queryParams.userName,
            userRole: queryParams.userRole,
        });
        const pageData = res.data.data;
        rows.value = pageData?.records || [];
        pagination.total = pageData?.totalRow || 0;
    }
    catch (error) {
        message.error(error.message || '加载用户列表失败');
    }
    finally {
        // 请求结束后关闭加载态
        loading.value = false;
    }
};
/**
 * 执行查询并重置到第一页。
 */
const doSearch = () => {
    // 搜索条件变化后统一回到第一页
    pagination.current = 1;
    loadUsers();
};
/**
 * 重置查询条件并刷新列表。
 */
const resetQuery = () => {
    // 清空所有筛选项
    queryParams.userAccount = '';
    queryParams.userName = '';
    queryParams.userRole = undefined;
    pagination.current = 1;
    loadUsers();
};
/**
 * 表格分页变化处理。
 */
const handleTableChange = (pag) => {
    // 同步分页参数并重新查询
    pagination.current = pag.current || 1;
    pagination.pageSize = pag.pageSize || 10;
    loadUsers();
};
/**
 * 打开新增用户弹窗。
 */
const openAddModal = () => {
    // 切换为新增模式并重置表单
    modalMode.value = 'add';
    resetModal();
    modalVisible.value = true;
};
/**
 * 打开编辑用户弹窗。
 */
const openEditModal = (record) => {
    // 切换为编辑模式并回填已有数据
    modalMode.value = 'edit';
    formState.id = record.id;
    formState.userAccount = record.userAccount || '';
    formState.userPassword = '';
    formState.userName = record.userName || '';
    formState.userAvatar = record.userAvatar || '';
    formState.userProfile = record.userProfile || '';
    formState.userRole = record.userRole || 'user';
    modalVisible.value = true;
};
/**
 * 重置弹窗表单状态。
 */
const resetModal = () => {
    // 清空表单，避免上一次操作数据残留
    formState.id = undefined;
    formState.userAccount = '';
    formState.userPassword = '';
    formState.userName = '';
    formState.userAvatar = '';
    formState.userProfile = '';
    formState.userRole = 'user';
    modalVisible.value = false;
};
/**
 * 新增或编辑用户。
 */
const submitUser = async () => {
    if (!formState.userAccount || formState.userAccount.trim().length < 4) {
        message.warning('请输入至少 4 位账号');
        return;
    }
    if (modalMode.value === 'add' && formState.userPassword.length < 8) {
        message.warning('请输入至少 8 位密码');
        return;
    }
    // 提交期间锁定按钮
    submitLoading.value = true;
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
            });
            message.success('新增用户成功');
        }
        else {
            // 编辑用户
            await updateUser({
                id: formState.id,
                userAccount: formState.userAccount.trim(),
                userName: formState.userName,
                userAvatar: formState.userAvatar,
                userProfile: formState.userProfile,
                userRole: formState.userRole,
            });
            message.success('更新用户成功');
        }
        resetModal();
        loadUsers();
    }
    catch (error) {
        message.error(error.message || '提交失败');
    }
    finally {
        // 无论成功与否都关闭提交 loading
        submitLoading.value = false;
    }
};
/**
 * 删除用户。
 */
const doDeleteUser = async (record) => {
    if (!record.id) {
        message.warning('用户 ID 不存在');
        return;
    }
    try {
        // 调用删除接口并刷新列表
        await deleteUser({ id: record.id });
        message.success('删除成功');
        // 若当前页删空且不是第一页，自动回退一页
        if (rows.value.length === 1 && pagination.current > 1) {
            pagination.current -= 1;
        }
        loadUsers();
    }
    catch (error) {
        message.error(error.message || '删除失败');
    }
};
/**
 * 格式化时间展示。
 */
const formatDate = (date) => {
    // 空值时展示占位符
    if (!date)
        return '--';
    return dayjs(date).format('YYYY-MM-DD HH:mm');
};
onMounted(() => {
    // 页面初始化后加载用户列表
    loadUsers();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['manage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-table-tbody']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-row']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "manage-page" },
});
/** @type {__VLS_StyleScopedClasses['manage-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "manage-head" },
});
/** @type {__VLS_StyleScopedClasses['manage-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.openAddModal) });
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[openAddModal,];
var __VLS_3;
var __VLS_4;
let __VLS_8;
/** @ts-ignore @type {typeof __VLS_components.aCard | typeof __VLS_components.ACard | typeof __VLS_components.aCard | typeof __VLS_components.ACard} */
aCard;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
    bordered: (false),
    ...{ class: "filter-card" },
}));
const __VLS_10 = __VLS_9({
    bordered: (false),
    ...{ class: "filter-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
/** @type {__VLS_StyleScopedClasses['filter-card']} */ ;
const { default: __VLS_13 } = __VLS_11.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-row" },
});
/** @type {__VLS_StyleScopedClasses['filter-row']} */ ;
let __VLS_14;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
    value: (__VLS_ctx.queryParams.userAccount),
    placeholder: "按账号搜索",
    allowClear: true,
    ...{ class: "filter-item" },
}));
const __VLS_16 = __VLS_15({
    value: (__VLS_ctx.queryParams.userAccount),
    placeholder: "按账号搜索",
    allowClear: true,
    ...{ class: "filter-item" },
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
/** @type {__VLS_StyleScopedClasses['filter-item']} */ ;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    value: (__VLS_ctx.queryParams.userName),
    placeholder: "按昵称搜索",
    allowClear: true,
    ...{ class: "filter-item" },
}));
const __VLS_21 = __VLS_20({
    value: (__VLS_ctx.queryParams.userName),
    placeholder: "按昵称搜索",
    allowClear: true,
    ...{ class: "filter-item" },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
/** @type {__VLS_StyleScopedClasses['filter-item']} */ ;
let __VLS_24;
/** @ts-ignore @type {typeof __VLS_components.aSelect | typeof __VLS_components.ASelect | typeof __VLS_components.aSelect | typeof __VLS_components.ASelect} */
aSelect;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
    value: (__VLS_ctx.queryParams.userRole),
    placeholder: "角色",
    allowClear: true,
    ...{ class: "filter-item" },
}));
const __VLS_26 = __VLS_25({
    value: (__VLS_ctx.queryParams.userRole),
    placeholder: "角色",
    allowClear: true,
    ...{ class: "filter-item" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
/** @type {__VLS_StyleScopedClasses['filter-item']} */ ;
const { default: __VLS_29 } = __VLS_27.slots;
let __VLS_30;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    value: "user",
}));
const __VLS_32 = __VLS_31({
    value: "user",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const { default: __VLS_35 } = __VLS_33.slots;
// @ts-ignore
[queryParams, queryParams, queryParams,];
var __VLS_33;
let __VLS_36;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
    value: "admin",
}));
const __VLS_38 = __VLS_37({
    value: "admin",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const { default: __VLS_41 } = __VLS_39.slots;
// @ts-ignore
[];
var __VLS_39;
// @ts-ignore
[];
var __VLS_27;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "filter-actions" },
});
/** @type {__VLS_StyleScopedClasses['filter-actions']} */ ;
let __VLS_42;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
    ...{ 'onClick': {} },
}));
const __VLS_44 = __VLS_43({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
let __VLS_47;
const __VLS_48 = ({ click: {} },
    { onClick: (__VLS_ctx.resetQuery) });
const { default: __VLS_49 } = __VLS_45.slots;
// @ts-ignore
[resetQuery,];
var __VLS_45;
var __VLS_46;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_52 = __VLS_51({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
let __VLS_55;
const __VLS_56 = ({ click: {} },
    { onClick: (__VLS_ctx.doSearch) });
const { default: __VLS_57 } = __VLS_53.slots;
// @ts-ignore
[doSearch,];
var __VLS_53;
var __VLS_54;
// @ts-ignore
[];
var __VLS_11;
let __VLS_58;
/** @ts-ignore @type {typeof __VLS_components.aCard | typeof __VLS_components.ACard | typeof __VLS_components.aCard | typeof __VLS_components.ACard} */
aCard;
// @ts-ignore
const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
    bordered: (false),
    ...{ class: "manage-card" },
}));
const __VLS_60 = __VLS_59({
    bordered: (false),
    ...{ class: "manage-card" },
}, ...__VLS_functionalComponentArgsRest(__VLS_59));
/** @type {__VLS_StyleScopedClasses['manage-card']} */ ;
const { default: __VLS_63 } = __VLS_61.slots;
let __VLS_64;
/** @ts-ignore @type {typeof __VLS_components.aTable | typeof __VLS_components.ATable | typeof __VLS_components.aTable | typeof __VLS_components.ATable} */
aTable;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent1(__VLS_64, new __VLS_64({
    ...{ 'onChange': {} },
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.rows),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.pagination),
    rowKey: "id",
}));
const __VLS_66 = __VLS_65({
    ...{ 'onChange': {} },
    columns: (__VLS_ctx.columns),
    dataSource: (__VLS_ctx.rows),
    loading: (__VLS_ctx.loading),
    pagination: (__VLS_ctx.pagination),
    rowKey: "id",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_69;
const __VLS_70 = ({ change: {} },
    { onChange: (__VLS_ctx.handleTableChange) });
const { default: __VLS_71 } = __VLS_67.slots;
{
    const { bodyCell: __VLS_72 } = __VLS_67.slots;
    const [{ column, record }] = __VLS_vSlot(__VLS_72);
    if (column.key === 'userRole') {
        let __VLS_73;
        /** @ts-ignore @type {typeof __VLS_components.aTag | typeof __VLS_components.ATag | typeof __VLS_components.aTag | typeof __VLS_components.ATag} */
        aTag;
        // @ts-ignore
        const __VLS_74 = __VLS_asFunctionalComponent1(__VLS_73, new __VLS_73({
            color: (record.userRole === 'admin' ? 'gold' : 'green'),
        }));
        const __VLS_75 = __VLS_74({
            color: (record.userRole === 'admin' ? 'gold' : 'green'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_74));
        const { default: __VLS_78 } = __VLS_76.slots;
        (record.userRole === 'admin' ? '管理员' : '普通用户');
        // @ts-ignore
        [columns, rows, loading, pagination, handleTableChange,];
        var __VLS_76;
    }
    else if (column.key === 'createTime') {
        (__VLS_ctx.formatDate(record.createTime));
    }
    else if (column.key === 'action') {
        let __VLS_79;
        /** @ts-ignore @type {typeof __VLS_components.aSpace | typeof __VLS_components.ASpace | typeof __VLS_components.aSpace | typeof __VLS_components.ASpace} */
        aSpace;
        // @ts-ignore
        const __VLS_80 = __VLS_asFunctionalComponent1(__VLS_79, new __VLS_79({}));
        const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
        const { default: __VLS_84 } = __VLS_82.slots;
        let __VLS_85;
        /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
        aButton;
        // @ts-ignore
        const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({
            ...{ 'onClick': {} },
            type: "link",
        }));
        const __VLS_87 = __VLS_86({
            ...{ 'onClick': {} },
            type: "link",
        }, ...__VLS_functionalComponentArgsRest(__VLS_86));
        let __VLS_90;
        const __VLS_91 = ({ click: {} },
            { onClick: (...[$event]) => {
                    if (!!(column.key === 'userRole'))
                        return;
                    if (!!(column.key === 'createTime'))
                        return;
                    if (!(column.key === 'action'))
                        return;
                    __VLS_ctx.openEditModal(record);
                    // @ts-ignore
                    [formatDate, openEditModal,];
                } });
        const { default: __VLS_92 } = __VLS_88.slots;
        // @ts-ignore
        [];
        var __VLS_88;
        var __VLS_89;
        let __VLS_93;
        /** @ts-ignore @type {typeof __VLS_components.aPopconfirm | typeof __VLS_components.APopconfirm | typeof __VLS_components.aPopconfirm | typeof __VLS_components.APopconfirm} */
        aPopconfirm;
        // @ts-ignore
        const __VLS_94 = __VLS_asFunctionalComponent1(__VLS_93, new __VLS_93({
            ...{ 'onConfirm': {} },
            title: "确认删除该用户吗？",
            okText: "确认",
            cancelText: "取消",
        }));
        const __VLS_95 = __VLS_94({
            ...{ 'onConfirm': {} },
            title: "确认删除该用户吗？",
            okText: "确认",
            cancelText: "取消",
        }, ...__VLS_functionalComponentArgsRest(__VLS_94));
        let __VLS_98;
        const __VLS_99 = ({ confirm: {} },
            { onConfirm: (...[$event]) => {
                    if (!!(column.key === 'userRole'))
                        return;
                    if (!!(column.key === 'createTime'))
                        return;
                    if (!(column.key === 'action'))
                        return;
                    __VLS_ctx.doDeleteUser(record);
                    // @ts-ignore
                    [doDeleteUser,];
                } });
        const { default: __VLS_100 } = __VLS_96.slots;
        let __VLS_101;
        /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
        aButton;
        // @ts-ignore
        const __VLS_102 = __VLS_asFunctionalComponent1(__VLS_101, new __VLS_101({
            type: "link",
            danger: true,
        }));
        const __VLS_103 = __VLS_102({
            type: "link",
            danger: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_102));
        const { default: __VLS_106 } = __VLS_104.slots;
        // @ts-ignore
        [];
        var __VLS_104;
        // @ts-ignore
        [];
        var __VLS_96;
        var __VLS_97;
        // @ts-ignore
        [];
        var __VLS_82;
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
var __VLS_67;
var __VLS_68;
// @ts-ignore
[];
var __VLS_61;
let __VLS_107;
/** @ts-ignore @type {typeof __VLS_components.aModal | typeof __VLS_components.AModal | typeof __VLS_components.aModal | typeof __VLS_components.AModal} */
aModal;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent1(__VLS_107, new __VLS_107({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalVisible),
    title: (__VLS_ctx.modalMode === 'add' ? '新增用户' : '编辑用户'),
    confirmLoading: (__VLS_ctx.submitLoading),
}));
const __VLS_109 = __VLS_108({
    ...{ 'onOk': {} },
    ...{ 'onCancel': {} },
    open: (__VLS_ctx.modalVisible),
    title: (__VLS_ctx.modalMode === 'add' ? '新增用户' : '编辑用户'),
    confirmLoading: (__VLS_ctx.submitLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
let __VLS_112;
const __VLS_113 = ({ ok: {} },
    { onOk: (__VLS_ctx.submitUser) });
const __VLS_114 = ({ cancel: {} },
    { onCancel: (__VLS_ctx.resetModal) });
const { default: __VLS_115 } = __VLS_110.slots;
let __VLS_116;
/** @ts-ignore @type {typeof __VLS_components.aForm | typeof __VLS_components.AForm | typeof __VLS_components.aForm | typeof __VLS_components.AForm} */
aForm;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent1(__VLS_116, new __VLS_116({
    layout: "vertical",
}));
const __VLS_118 = __VLS_117({
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const { default: __VLS_121 } = __VLS_119.slots;
let __VLS_122;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent1(__VLS_122, new __VLS_122({
    label: "账号",
    required: true,
}));
const __VLS_124 = __VLS_123({
    label: "账号",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
const { default: __VLS_127 } = __VLS_125.slots;
let __VLS_128;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent1(__VLS_128, new __VLS_128({
    value: (__VLS_ctx.formState.userAccount),
    placeholder: "请输入账号（至少4位）",
}));
const __VLS_130 = __VLS_129({
    value: (__VLS_ctx.formState.userAccount),
    placeholder: "请输入账号（至少4位）",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
// @ts-ignore
[modalVisible, modalMode, submitLoading, submitUser, resetModal, formState,];
var __VLS_125;
if (__VLS_ctx.modalMode === 'add') {
    let __VLS_133;
    /** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
    aFormItem;
    // @ts-ignore
    const __VLS_134 = __VLS_asFunctionalComponent1(__VLS_133, new __VLS_133({
        label: "密码",
        required: true,
    }));
    const __VLS_135 = __VLS_134({
        label: "密码",
        required: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_134));
    const { default: __VLS_138 } = __VLS_136.slots;
    let __VLS_139;
    /** @ts-ignore @type {typeof __VLS_components.aInputPassword | typeof __VLS_components.AInputPassword} */
    aInputPassword;
    // @ts-ignore
    const __VLS_140 = __VLS_asFunctionalComponent1(__VLS_139, new __VLS_139({
        value: (__VLS_ctx.formState.userPassword),
        placeholder: "请输入密码（至少8位）",
    }));
    const __VLS_141 = __VLS_140({
        value: (__VLS_ctx.formState.userPassword),
        placeholder: "请输入密码（至少8位）",
    }, ...__VLS_functionalComponentArgsRest(__VLS_140));
    // @ts-ignore
    [modalMode, formState,];
    var __VLS_136;
}
let __VLS_144;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent1(__VLS_144, new __VLS_144({
    label: "昵称",
}));
const __VLS_146 = __VLS_145({
    label: "昵称",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
const { default: __VLS_149 } = __VLS_147.slots;
let __VLS_150;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent1(__VLS_150, new __VLS_150({
    value: (__VLS_ctx.formState.userName),
    placeholder: "请输入昵称",
}));
const __VLS_152 = __VLS_151({
    value: (__VLS_ctx.formState.userName),
    placeholder: "请输入昵称",
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
// @ts-ignore
[formState,];
var __VLS_147;
let __VLS_155;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent1(__VLS_155, new __VLS_155({
    label: "头像地址",
}));
const __VLS_157 = __VLS_156({
    label: "头像地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
const { default: __VLS_160 } = __VLS_158.slots;
let __VLS_161;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent1(__VLS_161, new __VLS_161({
    value: (__VLS_ctx.formState.userAvatar),
    placeholder: "请输入头像 URL",
}));
const __VLS_163 = __VLS_162({
    value: (__VLS_ctx.formState.userAvatar),
    placeholder: "请输入头像 URL",
}, ...__VLS_functionalComponentArgsRest(__VLS_162));
// @ts-ignore
[formState,];
var __VLS_158;
let __VLS_166;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent1(__VLS_166, new __VLS_166({
    label: "用户简介",
}));
const __VLS_168 = __VLS_167({
    label: "用户简介",
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
const { default: __VLS_171 } = __VLS_169.slots;
let __VLS_172;
/** @ts-ignore @type {typeof __VLS_components.aTextarea | typeof __VLS_components.ATextarea} */
aTextarea;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent1(__VLS_172, new __VLS_172({
    value: (__VLS_ctx.formState.userProfile),
    rows: (3),
    placeholder: "请输入用户简介",
}));
const __VLS_174 = __VLS_173({
    value: (__VLS_ctx.formState.userProfile),
    rows: (3),
    placeholder: "请输入用户简介",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
// @ts-ignore
[formState,];
var __VLS_169;
let __VLS_177;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent1(__VLS_177, new __VLS_177({
    label: "角色",
    required: true,
}));
const __VLS_179 = __VLS_178({
    label: "角色",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
const { default: __VLS_182 } = __VLS_180.slots;
let __VLS_183;
/** @ts-ignore @type {typeof __VLS_components.aSelect | typeof __VLS_components.ASelect | typeof __VLS_components.aSelect | typeof __VLS_components.ASelect} */
aSelect;
// @ts-ignore
const __VLS_184 = __VLS_asFunctionalComponent1(__VLS_183, new __VLS_183({
    value: (__VLS_ctx.formState.userRole),
}));
const __VLS_185 = __VLS_184({
    value: (__VLS_ctx.formState.userRole),
}, ...__VLS_functionalComponentArgsRest(__VLS_184));
const { default: __VLS_188 } = __VLS_186.slots;
let __VLS_189;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_190 = __VLS_asFunctionalComponent1(__VLS_189, new __VLS_189({
    value: "user",
}));
const __VLS_191 = __VLS_190({
    value: "user",
}, ...__VLS_functionalComponentArgsRest(__VLS_190));
const { default: __VLS_194 } = __VLS_192.slots;
// @ts-ignore
[formState,];
var __VLS_192;
let __VLS_195;
/** @ts-ignore @type {typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption | typeof __VLS_components.aSelectOption | typeof __VLS_components.ASelectOption} */
aSelectOption;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent1(__VLS_195, new __VLS_195({
    value: "admin",
}));
const __VLS_197 = __VLS_196({
    value: "admin",
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
const { default: __VLS_200 } = __VLS_198.slots;
// @ts-ignore
[];
var __VLS_198;
// @ts-ignore
[];
var __VLS_186;
// @ts-ignore
[];
var __VLS_180;
// @ts-ignore
[];
var __VLS_119;
// @ts-ignore
[];
var __VLS_110;
var __VLS_111;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
