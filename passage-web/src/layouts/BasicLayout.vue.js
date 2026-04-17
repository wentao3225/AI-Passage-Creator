import { computed } from 'vue';
import { useRoute } from 'vue-router';
import GlobalHeader from '@/components/GlobalHeader.vue';
import GlobalFooter from '@/components/GlobalFooter.vue';
const route = useRoute();
// 根据路由元信息决定是否隐藏全局头尾（登录/注册页等）
const hideGlobalChrome = computed(() => Boolean(route.meta.hideGlobalChrome));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['basic-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aLayout | typeof __VLS_components.ALayout | typeof __VLS_components.aLayout | typeof __VLS_components.ALayout} */
aLayout;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "basic-layout" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "basic-layout" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['basic-layout']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
if (!__VLS_ctx.hideGlobalChrome) {
    const __VLS_7 = GlobalHeader;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({}));
    const __VLS_9 = __VLS_8({}, ...__VLS_functionalComponentArgsRest(__VLS_8));
}
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.aLayoutContent | typeof __VLS_components.ALayoutContent | typeof __VLS_components.aLayoutContent | typeof __VLS_components.ALayoutContent} */
aLayoutContent;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    ...{ class: "main-content" },
    ...{ class: ({ 'main-content-full': __VLS_ctx.hideGlobalChrome }) },
}));
const __VLS_14 = __VLS_13({
    ...{ class: "main-content" },
    ...{ class: ({ 'main-content-full': __VLS_ctx.hideGlobalChrome }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
/** @type {__VLS_StyleScopedClasses['main-content-full']} */ ;
const { default: __VLS_17 } = __VLS_15.slots;
let __VLS_18;
/** @ts-ignore @type {typeof __VLS_components.routerView | typeof __VLS_components.RouterView} */
routerView;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({}));
const __VLS_20 = __VLS_19({}, ...__VLS_functionalComponentArgsRest(__VLS_19));
// @ts-ignore
[hideGlobalChrome, hideGlobalChrome,];
var __VLS_15;
if (!__VLS_ctx.hideGlobalChrome) {
    const __VLS_23 = GlobalFooter;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({}));
    const __VLS_25 = __VLS_24({}, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
// @ts-ignore
[hideGlobalChrome,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
