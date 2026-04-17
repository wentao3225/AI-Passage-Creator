import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useLoginUserStore } from '@/stores/loginUser';
import { userLogout } from '@/api/userController';
import { LogoutOutlined, HomeOutlined, EditOutlined, UnorderedListOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons-vue';
const loginUserStore = useLoginUserStore();
const router = useRouter();
// 当前选中菜单
const selectedKeys = ref(['/']);
// 监听路由变化，更新当前选中菜单
router.afterEach((to) => {
    // 使用目标路径覆盖当前高亮菜单
    selectedKeys.value = [to.path];
});
// 菜单配置项
const originItems = [
    {
        key: '/',
        icon: HomeOutlined,
        label: '首页',
    },
    {
        key: '/create',
        icon: EditOutlined,
        label: '创作',
    },
    {
        key: '/article/list',
        icon: UnorderedListOutlined,
        label: '历史',
    },
    {
        key: '/admin/userManage',
        icon: SettingOutlined,
        label: '管理',
        admin: true,
    },
    {
        key: '/admin/statistics',
        icon: BarChartOutlined,
        label: '数据',
        admin: true,
    },
];
// 过滤菜单项
const menuItems = computed(() => {
    return originItems.filter((item) => {
        // 管理菜单仅管理员可见
        if (item.admin) {
            const loginUser = loginUserStore.loginUser;
            return loginUser && loginUser.userRole === 'admin';
        }
        return true;
    });
});
/**
 * 退出登录并清理前端登录态。
 */
const doLogout = async () => {
    // 调用后端注销接口
    const res = await userLogout();
    if (res.data.code === 0) {
        // 重置前端展示状态，避免残留昵称/头像
        loginUserStore.setLoginUser({
            userName: '未登录',
        });
        message.success('退出登录成功');
        // 注销后统一跳转登录页
        await router.push('/user/login');
    }
    else {
        // 保持当前页面，提示失败原因
        message.error('退出登录失败，' + res.data.message);
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['logo-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['user-info']} */ ;
/** @type {__VLS_StyleScopedClasses['login-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['header-container']} */ ;
/** @type {__VLS_StyleScopedClasses['site-title']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['user-name']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aLayoutHeader | typeof __VLS_components.ALayoutHeader | typeof __VLS_components.aLayoutHeader | typeof __VLS_components.ALayoutHeader} */
aLayoutHeader;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "header" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "header" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['header']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-container" },
});
/** @type {__VLS_StyleScopedClasses['header-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-left" },
});
/** @type {__VLS_StyleScopedClasses['header-left']} */ ;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    to: "/",
    ...{ class: "logo-link" },
}));
const __VLS_9 = __VLS_8({
    to: "/",
    ...{ class: "logo-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
/** @type {__VLS_StyleScopedClasses['logo-link']} */ ;
const { default: __VLS_12 } = __VLS_10.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "logo-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['logo-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: "@/assets/logo.png",
    alt: "Logo",
    ...{ class: "logo-img" },
});
/** @type {__VLS_StyleScopedClasses['logo-img']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "site-title" },
});
/** @type {__VLS_StyleScopedClasses['site-title']} */ ;
var __VLS_10;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "nav-center" },
});
/** @type {__VLS_StyleScopedClasses['nav-center']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.menuItems))) {
    let __VLS_13;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
        key: (item.key),
        to: (item.key),
        ...{ class: (['nav-item', { active: __VLS_ctx.selectedKeys.includes(item.key) }]) },
    }));
    const __VLS_15 = __VLS_14({
        key: (item.key),
        to: (item.key),
        ...{ class: (['nav-item', { active: __VLS_ctx.selectedKeys.includes(item.key) }]) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    const { default: __VLS_18 } = __VLS_16.slots;
    const __VLS_19 = (item.icon);
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
        ...{ class: "nav-icon" },
    }));
    const __VLS_21 = __VLS_20({
        ...{ class: "nav-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    /** @type {__VLS_StyleScopedClasses['nav-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (item.label);
    // @ts-ignore
    [menuItems, selectedKeys,];
    var __VLS_16;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header-right" },
});
/** @type {__VLS_StyleScopedClasses['header-right']} */ ;
if (__VLS_ctx.loginUserStore.loginUser.id) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "user-dropdown" },
    });
    /** @type {__VLS_StyleScopedClasses['user-dropdown']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "user-action-placeholder" },
        'aria-hidden': "true",
    });
    /** @type {__VLS_StyleScopedClasses['user-action-placeholder']} */ ;
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.aDropdown | typeof __VLS_components.ADropdown | typeof __VLS_components.aDropdown | typeof __VLS_components.ADropdown} */
    aDropdown;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({}));
    const __VLS_26 = __VLS_25({}, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const { default: __VLS_29 } = __VLS_27.slots;
    let __VLS_30;
    /** @ts-ignore @type {typeof __VLS_components.aSpace | typeof __VLS_components.ASpace | typeof __VLS_components.aSpace | typeof __VLS_components.ASpace} */
    aSpace;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
        ...{ class: "user-info" },
    }));
    const __VLS_32 = __VLS_31({
        ...{ class: "user-info" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    /** @type {__VLS_StyleScopedClasses['user-info']} */ ;
    const { default: __VLS_35 } = __VLS_33.slots;
    let __VLS_36;
    /** @ts-ignore @type {typeof __VLS_components.aAvatar | typeof __VLS_components.AAvatar} */
    aAvatar;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        src: (__VLS_ctx.loginUserStore.loginUser.userAvatar),
        size: (36),
        ...{ class: "user-avatar" },
    }));
    const __VLS_38 = __VLS_37({
        src: (__VLS_ctx.loginUserStore.loginUser.userAvatar),
        size: (36),
        ...{ class: "user-avatar" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    /** @type {__VLS_StyleScopedClasses['user-avatar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "user-name" },
    });
    /** @type {__VLS_StyleScopedClasses['user-name']} */ ;
    (__VLS_ctx.loginUserStore.loginUser.userName ?? '无名');
    // @ts-ignore
    [loginUserStore, loginUserStore, loginUserStore,];
    var __VLS_33;
    {
        const { overlay: __VLS_41 } = __VLS_27.slots;
        let __VLS_42;
        /** @ts-ignore @type {typeof __VLS_components.aMenu | typeof __VLS_components.AMenu | typeof __VLS_components.aMenu | typeof __VLS_components.AMenu} */
        aMenu;
        // @ts-ignore
        const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
            ...{ class: "dropdown-menu" },
        }));
        const __VLS_44 = __VLS_43({
            ...{ class: "dropdown-menu" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_43));
        /** @type {__VLS_StyleScopedClasses['dropdown-menu']} */ ;
        const { default: __VLS_47 } = __VLS_45.slots;
        let __VLS_48;
        /** @ts-ignore @type {typeof __VLS_components.aMenuItem | typeof __VLS_components.AMenuItem | typeof __VLS_components.aMenuItem | typeof __VLS_components.AMenuItem} */
        aMenuItem;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
            ...{ 'onClick': {} },
            ...{ class: "dropdown-item" },
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onClick': {} },
            ...{ class: "dropdown-item" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_53;
        const __VLS_54 = ({ click: {} },
            { onClick: (__VLS_ctx.doLogout) });
        /** @type {__VLS_StyleScopedClasses['dropdown-item']} */ ;
        const { default: __VLS_55 } = __VLS_51.slots;
        let __VLS_56;
        /** @ts-ignore @type {typeof __VLS_components.LogoutOutlined} */
        LogoutOutlined;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent1(__VLS_56, new __VLS_56({}));
        const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        // @ts-ignore
        [doLogout,];
        var __VLS_51;
        var __VLS_52;
        // @ts-ignore
        [];
        var __VLS_45;
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_27;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    let __VLS_61;
    /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent1(__VLS_61, new __VLS_61({
        to: "/user/login",
        ...{ class: "login-btn" },
    }));
    const __VLS_63 = __VLS_62({
        to: "/user/login",
        ...{ class: "login-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    /** @type {__VLS_StyleScopedClasses['login-btn']} */ ;
    const { default: __VLS_66 } = __VLS_64.slots;
    // @ts-ignore
    [];
    var __VLS_64;
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
