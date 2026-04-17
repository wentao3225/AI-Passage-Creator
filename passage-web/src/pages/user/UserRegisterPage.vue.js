import { useRouter } from 'vue-router';
import { userRegister } from '@/api/userController';
import { message } from 'ant-design-vue';
import { reactive } from 'vue';
import { UserOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons-vue';
const router = useRouter();
const formState = reactive({
    userAccount: '',
    userPassword: '',
    checkPassword: '',
});
/**
 * 验证确认密码
 * @param rule
 * @param value
 * @param callback
 */
const validateCheckPassword = (rule, value, callback) => {
    // 仅在用户输入确认密码后比较两次值
    if (value && value !== formState.userPassword) {
        // 返回校验错误给表单组件
        callback(new Error('两次输入密码不一致'));
    }
    else {
        // 校验通过
        callback();
    }
};
/**
 * 提交表单
 * @param values
 */
const handleSubmit = async (values) => {
    // 提交注册信息到后端
    const res = await userRegister(values);
    // 注册成功，跳转到登录页面
    if (res.data.code === 0) {
        message.success('注册成功');
        // 用 replace 避免返回栈停留在注册页
        router.push({
            path: '/user/login',
            replace: true,
        });
    }
    else {
        // 展示后端返回的注册失败原因
        message.error('注册失败，' + res.data.message);
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
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-container']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-section']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-features']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['form-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    id: "userRegisterPage",
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
    ...{ class: "register-form" },
}));
const __VLS_17 = __VLS_16({
    ...{ 'onFinish': {} },
    model: (__VLS_ctx.formState),
    name: "basic",
    autocomplete: "off",
    ...{ class: "register-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_20;
const __VLS_21 = ({ finish: {} },
    { onFinish: (__VLS_ctx.handleSubmit) });
/** @type {__VLS_StyleScopedClasses['register-form']} */ ;
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
        { min: 8, message: '密码不能小于 8 位' },
    ]),
}));
const __VLS_43 = __VLS_42({
    name: "userPassword",
    rules: ([
        { required: true, message: '请输入密码' },
        { min: 8, message: '密码不能小于 8 位' },
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
const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
    name: "checkPassword",
    rules: ([
        { required: true, message: '请确认密码' },
        { min: 8, message: '密码不能小于 8 位' },
        { validator: __VLS_ctx.validateCheckPassword },
    ]),
}));
const __VLS_61 = __VLS_60({
    name: "checkPassword",
    rules: ([
        { required: true, message: '请确认密码' },
        { min: 8, message: '密码不能小于 8 位' },
        { validator: __VLS_ctx.validateCheckPassword },
    ]),
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
const { default: __VLS_64 } = __VLS_62.slots;
let __VLS_65;
/** @ts-ignore @type {typeof __VLS_components.aInputPassword | typeof __VLS_components.AInputPassword | typeof __VLS_components.aInputPassword | typeof __VLS_components.AInputPassword} */
aInputPassword;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
    value: (__VLS_ctx.formState.checkPassword),
    placeholder: "请确认密码",
    size: "large",
    ...{ class: "form-input" },
}));
const __VLS_67 = __VLS_66({
    value: (__VLS_ctx.formState.checkPassword),
    placeholder: "请确认密码",
    size: "large",
    ...{ class: "form-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
/** @type {__VLS_StyleScopedClasses['form-input']} */ ;
const { default: __VLS_70 } = __VLS_68.slots;
{
    const { prefix: __VLS_71 } = __VLS_68.slots;
    let __VLS_72;
    /** @ts-ignore @type {typeof __VLS_components.SafetyOutlined} */
    SafetyOutlined;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent1(__VLS_72, new __VLS_72({
        ...{ class: "input-icon" },
    }));
    const __VLS_74 = __VLS_73({
        ...{ class: "input-icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    /** @type {__VLS_StyleScopedClasses['input-icon']} */ ;
    // @ts-ignore
    [formState, validateCheckPassword,];
}
// @ts-ignore
[];
var __VLS_68;
// @ts-ignore
[];
var __VLS_62;
let __VLS_77;
/** @ts-ignore @type {typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem | typeof __VLS_components.aFormItem | typeof __VLS_components.AFormItem} */
aFormItem;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent1(__VLS_77, new __VLS_77({}));
const __VLS_79 = __VLS_78({}, ...__VLS_functionalComponentArgsRest(__VLS_78));
const { default: __VLS_82 } = __VLS_80.slots;
let __VLS_83;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent1(__VLS_83, new __VLS_83({
    type: "primary",
    htmlType: "submit",
    size: "large",
    block: true,
    ...{ class: "submit-btn" },
}));
const __VLS_85 = __VLS_84({
    type: "primary",
    htmlType: "submit",
    size: "large",
    block: true,
    ...{ class: "submit-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
const { default: __VLS_88 } = __VLS_86.slots;
// @ts-ignore
[];
var __VLS_86;
// @ts-ignore
[];
var __VLS_80;
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
let __VLS_89;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent1(__VLS_89, new __VLS_89({
    to: "/user/login",
    ...{ class: "login-link" },
}));
const __VLS_91 = __VLS_90({
    to: "/user/login",
    ...{ class: "login-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
/** @type {__VLS_StyleScopedClasses['login-link']} */ ;
const { default: __VLS_94 } = __VLS_92.slots;
// @ts-ignore
[];
var __VLS_92;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
