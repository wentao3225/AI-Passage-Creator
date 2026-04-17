import { reactive } from 'vue';
import { userLogin } from '@/api/userController';
import { useLoginUserStore } from '@/stores/loginUser';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { UserOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons-vue';
const formState = reactive({
    userAccount: '',
    userPassword: '',
});
const router = useRouter();
const loginUserStore = useLoginUserStore();
/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values) => {
    // 先请求后端进行账号密码校验
    const res = await userLogin(values);
    // 登录成功，把登录态保存到全局状态中
    if (res.data.code === 0 && res.data.data) {
        // 重新拉取当前用户，确保 Pinia 中是最新会话信息
        await loginUserStore.fetchLoginUser();
        message.success('登录成功');
        // 登录后进入首页并替换历史，避免返回到登录页
        router.push({
            path: '/',
            replace: true,
        });
    }
    else {
        // 保留在当前页并提示后端返回的错误信息
        message.error('登录失败，' + res.data.message);
    }
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['brand-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-container']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-section']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-features']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['form-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    id: "userLoginPage",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "auth-container" },
});
/** @type {__VLS_StyleScopedClasses['auth-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-section" },
});
/** @type {__VLS_StyleScopedClasses['brand-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-bg" },
});
/** @type {__VLS_StyleScopedClasses['brand-bg']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-content" },
});
/** @type {__VLS_StyleScopedClasses['brand-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-logo" },
});
/** @type {__VLS_StyleScopedClasses['brand-logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: "@/assets/logo.png",
    alt: "Logo",
    ...{ class: "logo-img" },
});
/** @type {__VLS_StyleScopedClasses['logo-img']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "brand-title" },
});
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "brand-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-features" },
});
/** @type {__VLS_StyleScopedClasses['brand-features']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "feature-item" },
});
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.CheckCircleOutlined} */
CheckCircleOutlined;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "feature-check" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "feature-check" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['feature-check']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "feature-item" },
});
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
let __VLS_5;
/** @ts-ignore @type {typeof __VLS_components.CheckCircleOutlined} */
CheckCircleOutlined;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ class: "feature-check" },
}));
const __VLS_7 = __VLS_6({
    ...{ class: "feature-check" },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['feature-check']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "feature-item" },
});
/** @type {__VLS_StyleScopedClasses['feature-item']} */ ;
let __VLS_10;
/** @ts-ignore @type {typeof __VLS_components.CheckCircleOutlined} */
CheckCircleOutlined;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    ...{ class: "feature-check" },
}));
const __VLS_12 = __VLS_11({
    ...{ class: "feature-check" },
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
/** @type {__VLS_StyleScopedClasses['feature-check']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-section" },
});
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-card" },
});
/** @type {__VLS_StyleScopedClasses['form-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    ...{ class: "form-title" },
});
/** @type {__VLS_StyleScopedClasses['form-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "form-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['form-subtitle']} */ ;
let __VLS_15;
/** @ts-ignore @type {typeof __VLS_components.aForm | typeof __VLS_components.AForm | typeof __VLS_components.aForm | typeof __VLS_components.AForm} */
aForm;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    ...{ 'onFinish': {} },
    model: (__VLS_ctx.formState),
    name: "basic",
    autocomplete: "off",
    ...{ class: "login-form" },
}));
const __VLS_17 = __VLS_16({
    ...{ 'onFinish': {} },
    model: (__VLS_ctx.formState),
    name: "basic",
    autocomplete: "off",
    ...{ class: "login-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_20;
const __VLS_21 = ({ finish: {} },
    { onFinish: (__VLS_ctx.handleSubmit) });
/** @type {__VLS_StyleScopedClasses['login-form']} */ ;
const { default: __VLS_22 } = __VLS_18.slots;
let __VLS_23;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
    name: "userAccount",
    rules: ([{ required: true, message: '请输入账号' }]),
}));
const __VLS_25 = __VLS_24({
    name: "userAccount",
    rules: ([{ required: true, message: '请输入账号' }]),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
const { default: __VLS_28 } = __VLS_26.slots;
let __VLS_29;
/** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput | typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
aInput;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
    value: (__VLS_ctx.formState.userAccount),
    placeholder: "请输入账号",
    size: "large",
    ...{ class: "form-input" },
}));
const __VLS_31 = __VLS_30({
    value: (__VLS_ctx.formState.userAccount),
    placeholder: "请输入账号",
    size: "large",
    ...{ class: "form-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
const { default: __VLS_34 } = __VLS_32.slots;
{
    const { prefix: __VLS_35 } = __VLS_32.slots;
    let __VLS_36;
    /** @ts-ignore @type {typeof __VLS_components.UserOutlined} */
    UserOutlined;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
        ...{ class: "input-icon" },
    }));
    const __VLS_38 = __VLS_37({
        ...{ class: "input-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    /** @type {__VLS_StyleScopedClasses['input-icon']} */ ;
    // @ts-ignore
    [formState, formState, handleSubmit,];
}
// @ts-ignore
[];
var __VLS_32;
// @ts-ignore
[];
var __VLS_26;
let __VLS_41;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
    name: "userPassword",
    rules: ([
        { required: true, message: '请输入密码' },
        { min: 8, message: '密码长度不能小于 8 位' },
    ]),
}));
const __VLS_43 = __VLS_42({
    name: "userPassword",
    rules: ([
        { required: true, message: '请输入密码' },
        { min: 8, message: '密码长度不能小于 8 位' },
    ]),
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
const { default: __VLS_46 } = __VLS_44.slots;
let __VLS_47;
/** @ts-ignore @type {typeof __VLS_components.aInputPassword | typeof __VLS_components.AInputPassword | typeof __VLS_components.aInputPassword | typeof __VLS_components.AInputPassword} */
aInputPassword;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent1(__VLS_47, new __VLS_47({
    value: (__VLS_ctx.formState.userPassword),
    placeholder: "请输入密码",
    size: "large",
    ...{ class: "form-input" },
}));
const __VLS_49 = __VLS_48({
    value: (__VLS_ctx.formState.userPassword),
    placeholder: "请输入密码",
    size: "large",
    ...{ class: "form-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
const { default: __VLS_52 } = __VLS_50.slots;
{
    const { prefix: __VLS_53 } = __VLS_50.slots;
    let __VLS_54;
    /** @ts-ignore @type {typeof __VLS_components.LockOutlined} */
    LockOutlined;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
        ...{ class: "input-icon" },
    }));
    const __VLS_56 = __VLS_55({
        ...{ class: "input-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    /** @type {__VLS_StyleScopedClasses['input-icon']} */ ;
    // @ts-ignore
    [formState,];
}
// @ts-ignore
[];
var __VLS_50;
// @ts-ignore
[];
var __VLS_44;
let __VLS_59;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({}));
const __VLS_61 = __VLS_60({}, ...__VLS_functionalComponentArgsRest(__VLS_60));
const { default: __VLS_64 } = __VLS_62.slots;
let __VLS_65;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
    type: "primary",
    htmlType: "submit",
    size: "large",
    block: true,
    ...{ class: "submit-btn" },
}));
const __VLS_67 = __VLS_66({
    type: "primary",
    htmlType: "submit",
    size: "large",
    block: true,
    ...{ class: "submit-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
const { default: __VLS_70 } = __VLS_68.slots;
// @ts-ignore
[];
var __VLS_68;
// @ts-ignore
[];
var __VLS_62;
// @ts-ignore
[];
var __VLS_18;
var __VLS_19;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-footer" },
});
/** @type {__VLS_StyleScopedClasses['form-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "footer-text" },
});
/** @type {__VLS_StyleScopedClasses['footer-text']} */ ;
let __VLS_71;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
    to: "/user/register",
    ...{ class: "register-link" },
}));
const __VLS_73 = __VLS_72({
    to: "/user/register",
    ...{ class: "register-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
/** @type {__VLS_StyleScopedClasses['register-link']} */ ;
const { default: __VLS_76 } = __VLS_74.slots;
// @ts-ignore
[];
var __VLS_74;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
