import { ref, computed } from 'vue';
import { CheckOutlined } from '@ant-design/icons-vue';
const props = withDefaults(defineProps(), {
    loading: false
});
const emit = defineEmits();
const selectedIndex = ref(0);
const customMainTitle = ref('');
const customSubTitle = ref('');
const userDescription = ref('');
const canConfirm = computed(() => {
    if (selectedIndex.value === -1) {
        return customMainTitle.value.trim() && customSubTitle.value.trim();
    }
    return selectedIndex.value >= 0 && selectedIndex.value < props.titleOptions.length;
});
const handleConfirm = () => {
    let mainTitle = '';
    let subTitle = '';
    if (selectedIndex.value === -1) {
        mainTitle = customMainTitle.value;
        subTitle = customSubTitle.value;
    }
    else {
        const selected = props.titleOptions[selectedIndex.value];
        if (selected) {
            mainTitle = selected.mainTitle;
            subTitle = selected.subTitle;
        }
        else {
            mainTitle = '';
            subTitle = '';
        }
    }
    emit('confirm', {
        mainTitle,
        subTitle,
        userDescription: userDescription.value
    });
};
const __VLS_defaults = {
    loading: false
};
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title-selecting-stage" },
});
/** @type {__VLS_StyleScopedClasses['title-selecting-stage']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stage-header" },
});
/** @type {__VLS_StyleScopedClasses['stage-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    ...{ class: "stage-title" },
});
/** @type {__VLS_StyleScopedClasses['stage-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "stage-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['stage-subtitle']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.aRadioGroup | typeof __VLS_components.ARadioGroup | typeof __VLS_components.aRadioGroup | typeof __VLS_components.ARadioGroup} */
aRadioGroup;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    value: (__VLS_ctx.selectedIndex),
    ...{ class: "title-options" },
}));
const __VLS_2 = __VLS_1({
    value: (__VLS_ctx.selectedIndex),
    ...{ class: "title-options" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['title-options']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
for (const [option, index] of __VLS_vFor((__VLS_ctx.titleOptions))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (index),
        ...{ class: "title-option" },
    });
    /** @type {__VLS_StyleScopedClasses['title-option']} */ ;
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
    aRadio;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        value: (index),
    }));
    const __VLS_8 = __VLS_7({
        value: (index),
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "title-content" },
    });
    /** @type {__VLS_StyleScopedClasses['title-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "title-main" },
    });
    /** @type {__VLS_StyleScopedClasses['title-main']} */ ;
    (option.mainTitle);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "title-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['title-sub']} */ ;
    (option.subTitle);
    // @ts-ignore
    [selectedIndex, titleOptions,];
    var __VLS_9;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title-option custom" },
});
/** @type {__VLS_StyleScopedClasses['title-option']} */ ;
/** @type {__VLS_StyleScopedClasses['custom']} */ ;
let __VLS_12;
/** @ts-ignore @type {typeof __VLS_components.aRadio | typeof __VLS_components.ARadio | typeof __VLS_components.aRadio | typeof __VLS_components.ARadio} */
aRadio;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
    value: (-1),
}));
const __VLS_14 = __VLS_13({
    value: (-1),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const { default: __VLS_17 } = __VLS_15.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title-content" },
});
/** @type {__VLS_StyleScopedClasses['title-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title-main" },
});
/** @type {__VLS_StyleScopedClasses['title-main']} */ ;
// @ts-ignore
[];
var __VLS_15;
if (__VLS_ctx.selectedIndex === -1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "custom-inputs" },
    });
    /** @type {__VLS_StyleScopedClasses['custom-inputs']} */ ;
    let __VLS_18;
    /** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
    aInput;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        value: (__VLS_ctx.customMainTitle),
        placeholder: "输入主标题",
        ...{ class: "custom-input" },
    }));
    const __VLS_20 = __VLS_19({
        value: (__VLS_ctx.customMainTitle),
        placeholder: "输入主标题",
        ...{ class: "custom-input" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    /** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
    let __VLS_23;
    /** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
    aInput;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        value: (__VLS_ctx.customSubTitle),
        placeholder: "输入副标题",
        ...{ class: "custom-input" },
    }));
    const __VLS_25 = __VLS_24({
        value: (__VLS_ctx.customSubTitle),
        placeholder: "输入副标题",
        ...{ class: "custom-input" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    /** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
}
// @ts-ignore
[selectedIndex, customMainTitle, customSubTitle,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "description-section" },
});
/** @type {__VLS_StyleScopedClasses['description-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "section-label" },
});
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "section-tip" },
});
/** @type {__VLS_StyleScopedClasses['section-tip']} */ ;
let __VLS_28;
/** @ts-ignore @type {typeof __VLS_components.aTextarea | typeof __VLS_components.ATextarea} */
aTextarea;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
    value: (__VLS_ctx.userDescription),
    placeholder: "例如：请重点强调技术原理，用通俗的语言讲解...",
    rows: (4),
    maxlength: (500),
    showCount: true,
    ...{ class: "description-textarea" },
}));
const __VLS_30 = __VLS_29({
    value: (__VLS_ctx.userDescription),
    placeholder: "例如：请重点强调技术原理，用通俗的语言讲解...",
    rows: (4),
    maxlength: (500),
    showCount: true,
    ...{ class: "description-textarea" },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
/** @type {__VLS_StyleScopedClasses['description-textarea']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "actions" },
});
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
let __VLS_33;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canConfirm),
    ...{ class: "confirm-btn" },
}));
const __VLS_35 = __VLS_34({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canConfirm),
    ...{ class: "confirm-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_38;
const __VLS_39 = ({ click: {} },
    { onClick: (__VLS_ctx.handleConfirm) });
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
const { default: __VLS_40 } = __VLS_36.slots;
{
    const { icon: __VLS_41 } = __VLS_36.slots;
    let __VLS_42;
    /** @ts-ignore @type {typeof __VLS_components.CheckOutlined} */
    CheckOutlined;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({}));
    const __VLS_44 = __VLS_43({}, ...__VLS_functionalComponentArgsRest(__VLS_43));
    // @ts-ignore
    [userDescription, loading, canConfirm, handleConfirm,];
}
// @ts-ignore
[];
var __VLS_36;
var __VLS_37;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default {};
