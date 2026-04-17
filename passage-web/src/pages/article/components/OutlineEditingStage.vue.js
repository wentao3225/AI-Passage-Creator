import { aiModifyOutline } from '@/api/articleController';
import { message } from 'ant-design-vue';
import Sortable from 'sortablejs';
import { computed, nextTick, onMounted, ref } from 'vue';
const props = withDefaults(defineProps(), {
    loading: false
});
const emit = defineEmits();
// 转换 API 类型为内部类型
const outlineSections = ref(props.outline.map((item, index) => ({
    section: item.section ?? index + 1,
    title: item.title ?? '',
    points: item.points ?? []
})));
const outlineListRef = ref(null);
const modifySuggestion = ref('');
const aiModifying = ref(false);
const canConfirm = computed(() => {
    return outlineSections.value.length > 0 &&
        outlineSections.value.every(section => section.title.trim() &&
            section.points.length > 0 &&
            section.points.every(point => point.trim()));
});
onMounted(() => {
    nextTick(() => {
        if (outlineListRef.value) {
            Sortable.create(outlineListRef.value, {
                animation: 150,
                handle: '.drag-handle',
                onEnd: (evt) => {
                    const { oldIndex, newIndex } = evt;
                    if (oldIndex !== undefined && newIndex !== undefined) {
                        const item = outlineSections.value.splice(oldIndex, 1)[0];
                        if (!item) {
                            return;
                        }
                        outlineSections.value.splice(newIndex, 0, item);
                        // 更新 section 序号
                        outlineSections.value.forEach((sec, idx) => {
                            sec.section = idx + 1;
                        });
                    }
                }
            });
        }
    });
});
const addSection = () => {
    const newSection = {
        section: outlineSections.value.length + 1,
        title: '',
        points: ['']
    };
    outlineSections.value.push(newSection);
};
const deleteSection = (index) => {
    outlineSections.value.splice(index, 1);
    // 更新 section 序号
    outlineSections.value.forEach((sec, idx) => {
        sec.section = idx + 1;
    });
};
const addPoint = (sectionIndex) => {
    const section = outlineSections.value[sectionIndex];
    if (!section) {
        return;
    }
    section.points.push('');
};
const deletePoint = (sectionIndex, pointIndex) => {
    const section = outlineSections.value[sectionIndex];
    if (!section) {
        return;
    }
    if (section.points.length <= 1) {
        message.warning('每个章节至少保留一个要点');
        return;
    }
    section.points.splice(pointIndex, 1);
};
const handleConfirm = () => {
    emit('confirm', outlineSections.value);
};
const handleAiModify = async () => {
    if (!modifySuggestion.value.trim()) {
        message.warning('请输入修改建议');
        return;
    }
    aiModifying.value = true;
    try {
        const res = await aiModifyOutline({
            taskId: props.taskId,
            modifySuggestion: modifySuggestion.value
        });
        if (res.data.data) {
            outlineSections.value = res.data.data.map((item, index) => ({
                section: item.section ?? index + 1,
                title: item.title ?? '',
                points: item.points ?? []
            }));
            modifySuggestion.value = '';
            message.success('AI 已根据您的建议修改大纲');
        }
    }
    catch (error) {
        const err = error;
        message.error(err.message || 'AI 修改失败');
    }
    finally {
        aiModifying.value = false;
    }
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
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-title']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['add-section-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "outline-editing-stage" },
});
/** @type {__VLS_StyleScopedClasses['outline-editing-stage']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "outline-list" },
    ref: "outlineListRef",
});
/** @type {__VLS_StyleScopedClasses['outline-list']} */ ;
for (const [section, index] of __VLS_vFor((__VLS_ctx.outlineSections))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (section.section),
        ...{ class: "outline-section" },
        'data-section-id': (section.section),
    });
    /** @type {__VLS_StyleScopedClasses['outline-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-header" },
    });
    /** @type {__VLS_StyleScopedClasses['section-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "drag-handle" },
        title: "拖动排序",
    });
    /** @type {__VLS_StyleScopedClasses['drag-handle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "section-number" },
    });
    /** @type {__VLS_StyleScopedClasses['section-number']} */ ;
    (index + 1);
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
    aInput;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        value: (section.title),
        placeholder: "章节标题",
        ...{ class: "section-title-input" },
    }));
    const __VLS_2 = __VLS_1({
        value: (section.title),
        placeholder: "章节标题",
        ...{ class: "section-title-input" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    /** @type {__VLS_StyleScopedClasses['section-title-input']} */ ;
    let __VLS_5;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        ...{ 'onClick': {} },
        type: "text",
        danger: true,
        ...{ class: "delete-btn" },
    }));
    const __VLS_7 = __VLS_6({
        ...{ 'onClick': {} },
        type: "text",
        danger: true,
        ...{ class: "delete-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    let __VLS_10;
    const __VLS_11 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.deleteSection(index);
                // @ts-ignore
                [outlineSections, deleteSection,];
            } });
    /** @type {__VLS_StyleScopedClasses['delete-btn']} */ ;
    const { default: __VLS_12 } = __VLS_8.slots;
    {
        const { icon: __VLS_13 } = __VLS_8.slots;
        let __VLS_14;
        /** @ts-ignore @type {typeof __VLS_components.DeleteOutlined} */
        DeleteOutlined;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({}));
        const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_8;
    var __VLS_9;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "section-points" },
    });
    /** @type {__VLS_StyleScopedClasses['section-points']} */ ;
    for (const [point, pointIdx] of __VLS_vFor((section.points))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (pointIdx),
            ...{ class: "point-item" },
        });
        /** @type {__VLS_StyleScopedClasses['point-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "point-bullet" },
        });
        /** @type {__VLS_StyleScopedClasses['point-bullet']} */ ;
        let __VLS_19;
        /** @ts-ignore @type {typeof __VLS_components.aInput | typeof __VLS_components.AInput} */
        aInput;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
            value: (section.points[pointIdx]),
            placeholder: "要点内容",
            ...{ class: "point-input" },
        }));
        const __VLS_21 = __VLS_20({
            value: (section.points[pointIdx]),
            placeholder: "要点内容",
            ...{ class: "point-input" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        /** @type {__VLS_StyleScopedClasses['point-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.deletePoint(index, pointIdx);
                    // @ts-ignore
                    [deletePoint,];
                } },
            type: "button",
            ...{ class: "delete-point-btn" },
            disabled: (section.points.length <= 1),
            title: (section.points.length <= 1 ? '每个章节至少保留一个要点' : '删除该要点'),
        });
        /** @type {__VLS_StyleScopedClasses['delete-point-btn']} */ ;
        // @ts-ignore
        [];
    }
    let __VLS_24;
    /** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
    aButton;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent1(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        type: "dashed",
        ...{ class: "add-point-btn" },
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        type: "dashed",
        ...{ class: "add-point-btn" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_29;
    const __VLS_30 = ({ click: {} },
        { onClick: (...[$event]) => {
                __VLS_ctx.addPoint(index);
                // @ts-ignore
                [addPoint,];
            } });
    /** @type {__VLS_StyleScopedClasses['add-point-btn']} */ ;
    const { default: __VLS_31 } = __VLS_27.slots;
    {
        const { icon: __VLS_32 } = __VLS_27.slots;
        let __VLS_33;
        /** @ts-ignore @type {typeof __VLS_components.PlusOutlined} */
        PlusOutlined;
        // @ts-ignore
        const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({}));
        const __VLS_35 = __VLS_34({}, ...__VLS_functionalComponentArgsRest(__VLS_34));
        // @ts-ignore
        [];
    }
    // @ts-ignore
    [];
    var __VLS_27;
    var __VLS_28;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "ai-chat-section" },
});
/** @type {__VLS_StyleScopedClasses['ai-chat-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-header" },
});
/** @type {__VLS_StyleScopedClasses['chat-header']} */ ;
let __VLS_38;
/** @ts-ignore @type {typeof __VLS_components.RobotOutlined} */
RobotOutlined;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent1(__VLS_38, new __VLS_38({}));
const __VLS_40 = __VLS_39({}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-input-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['chat-input-wrapper']} */ ;
let __VLS_43;
/** @ts-ignore @type {typeof __VLS_components.aTextarea | typeof __VLS_components.ATextarea} */
aTextarea;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent1(__VLS_43, new __VLS_43({
    value: (__VLS_ctx.modifySuggestion),
    placeholder: "告诉 AI 如何修改大纲，例如：请在第二章节后增加一个关于实践案例的章节",
    rows: (3),
    maxlength: (500),
    showCount: true,
    ...{ class: "chat-textarea" },
}));
const __VLS_45 = __VLS_44({
    value: (__VLS_ctx.modifySuggestion),
    placeholder: "告诉 AI 如何修改大纲，例如：请在第二章节后增加一个关于实践案例的章节",
    rows: (3),
    maxlength: (500),
    showCount: true,
    ...{ class: "chat-textarea" },
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
/** @type {__VLS_StyleScopedClasses['chat-textarea']} */ ;
let __VLS_48;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.aiModifying),
    disabled: (!__VLS_ctx.modifySuggestion.trim()),
    ...{ class: "ai-modify-btn" },
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.aiModifying),
    disabled: (!__VLS_ctx.modifySuggestion.trim()),
    ...{ class: "ai-modify-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_53;
const __VLS_54 = ({ click: {} },
    { onClick: (__VLS_ctx.handleAiModify) });
/** @type {__VLS_StyleScopedClasses['ai-modify-btn']} */ ;
const { default: __VLS_55 } = __VLS_51.slots;
{
    const { icon: __VLS_56 } = __VLS_51.slots;
    let __VLS_57;
    /** @ts-ignore @type {typeof __VLS_components.RobotOutlined} */
    RobotOutlined;
    // @ts-ignore
    const __VLS_58 = __VLS_asFunctionalComponent1(__VLS_57, new __VLS_57({}));
    const __VLS_59 = __VLS_58({}, ...__VLS_functionalComponentArgsRest(__VLS_58));
    // @ts-ignore
    [modifySuggestion, modifySuggestion, aiModifying, handleAiModify,];
}
// @ts-ignore
[];
var __VLS_51;
var __VLS_52;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "actions" },
});
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
let __VLS_62;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent1(__VLS_62, new __VLS_62({
    ...{ 'onClick': {} },
    size: "large",
    ...{ class: "add-section-btn" },
}));
const __VLS_64 = __VLS_63({
    ...{ 'onClick': {} },
    size: "large",
    ...{ class: "add-section-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
let __VLS_67;
const __VLS_68 = ({ click: {} },
    { onClick: (__VLS_ctx.addSection) });
/** @type {__VLS_StyleScopedClasses['add-section-btn']} */ ;
const { default: __VLS_69 } = __VLS_65.slots;
{
    const { icon: __VLS_70 } = __VLS_65.slots;
    let __VLS_71;
    /** @ts-ignore @type {typeof __VLS_components.PlusOutlined} */
    PlusOutlined;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({}));
    const __VLS_73 = __VLS_72({}, ...__VLS_functionalComponentArgsRest(__VLS_72));
    // @ts-ignore
    [addSection,];
}
// @ts-ignore
[];
var __VLS_65;
var __VLS_66;
let __VLS_76;
/** @ts-ignore @type {typeof __VLS_components.aButton | typeof __VLS_components.AButton | typeof __VLS_components.aButton | typeof __VLS_components.AButton} */
aButton;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canConfirm),
    ...{ class: "confirm-btn" },
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    loading: (__VLS_ctx.loading),
    disabled: (!__VLS_ctx.canConfirm),
    ...{ class: "confirm-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_81;
const __VLS_82 = ({ click: {} },
    { onClick: (__VLS_ctx.handleConfirm) });
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
const { default: __VLS_83 } = __VLS_79.slots;
{
    const { icon: __VLS_84 } = __VLS_79.slots;
    let __VLS_85;
    /** @ts-ignore @type {typeof __VLS_components.CheckOutlined} */
    CheckOutlined;
    // @ts-ignore
    const __VLS_86 = __VLS_asFunctionalComponent1(__VLS_85, new __VLS_85({}));
    const __VLS_87 = __VLS_86({}, ...__VLS_functionalComponentArgsRest(__VLS_86));
    // @ts-ignore
    [loading, canConfirm, handleConfirm,];
}
// @ts-ignore
[];
var __VLS_79;
var __VLS_80;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default {};
