<template>
  <div class="outline-editing-stage">
    <div class="stage-header">
      <h2 class="stage-title">编辑文章大纲</h2>
      <p class="stage-subtitle">您可以编辑、调整章节顺序，或添加新章节</p>
    </div>

    <div class="outline-list" ref="outlineListRef">
      <div v-for="(section, index) in outlineSections" :key="section.section" class="outline-section"
        :data-section-id="section.section">
        <div class="section-header">
          <span class="drag-handle" title="拖动排序">⋮⋮</span>
          <span class="section-number">{{ index + 1 }}</span>
          <a-input v-model:value="section.title" placeholder="章节标题" class="section-title-input" />
          <a-button type="text" danger @click="deleteSection(index)" class="delete-btn">
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </div>


        <div class="section-points">
          <div v-for="(point, pointIdx) in section.points" :key="pointIdx" class="point-item">
            <span class="point-bullet">•</span>
            <a-input v-model:value="section.points[pointIdx]" placeholder="要点内容" class="point-input" />
            <button type="button" class="delete-point-btn" :disabled="section.points.length <= 1"
              :title="section.points.length <= 1 ? '每个章节至少保留一个要点' : '删除该要点'" @click="deletePoint(index, pointIdx)">
              ×
            </button>
          </div>

          <a-button type="dashed" @click="addPoint(index)" class="add-point-btn">
            <template #icon>
              <PlusOutlined />
            </template>
            添加要点
          </a-button>
        </div>
      </div>
    </div>

    <div class="ai-chat-section">
      <div class="chat-header">
        <RobotOutlined />
        <span>AI 助手修改大纲</span>
      </div>

      <div class="chat-input-wrapper">
        <a-textarea v-model:value="modifySuggestion" placeholder="告诉 AI 如何修改大纲，例如：请在第二章节后增加一个关于实践案例的章节" :rows="3"
          :maxlength="500" show-count class="chat-textarea" />
        <a-button type="primary" :loading="aiModifying" :disabled="!modifySuggestion.trim()" @click="handleAiModify"
          class="ai-modify-btn">
          <template #icon>
            <RobotOutlined />
          </template>
          AI 修改大纲
        </a-button>
      </div>
    </div>

    <div class="actions">
      <a-button size="large" @click="addSection" class="add-section-btn">
        <template #icon>
          <PlusOutlined />
        </template>
        添加章节
      </a-button>

      <a-button type="primary" size="large" :loading="loading" :disabled="!canConfirm" @click="handleConfirm"
        class="confirm-btn">
        <template #icon>
          <CheckOutlined />
        </template>
        确认并生成正文
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiModifyOutline } from '@/api/articleController'
import { message } from 'ant-design-vue'
import Sortable from 'sortablejs'
import { computed, nextTick, onMounted, ref } from 'vue'


interface OutlineSection {
  section: number
  title: string
  points: string[]
}

interface Props {
  outline: API.OutlineSection[]
  taskId: string
  loading?: boolean
}

interface Emits {
  (e: 'confirm', outline: OutlineSection[]): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// 转换 API 类型为内部类型
const outlineSections = ref<OutlineSection[]>(
  props.outline.map((item, index) => ({
    section: item.section ?? index + 1,
    title: item.title ?? '',
    points: item.points ?? []
  }))
)
const outlineListRef = ref<HTMLElement | null>(null)
const modifySuggestion = ref('')
const aiModifying = ref(false)

const canConfirm = computed(() => {
  return outlineSections.value.length > 0 &&
    outlineSections.value.every(section =>
      section.title.trim() &&
      section.points.length > 0 &&
      section.points.every(point => point.trim())
    )
})

onMounted(() => {
  nextTick(() => {
    if (outlineListRef.value) {
      Sortable.create(outlineListRef.value, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt
          if (oldIndex !== undefined && newIndex !== undefined) {
            const item = outlineSections.value.splice(oldIndex, 1)[0]
            if (!item) {
              return
            }
            outlineSections.value.splice(newIndex, 0, item)
            // 更新 section 序号
            outlineSections.value.forEach((sec, idx) => {
              sec.section = idx + 1
            })
          }
        }
      })
    }
  })
})

const addSection = () => {
  const newSection: OutlineSection = {
    section: outlineSections.value.length + 1,
    title: '',
    points: ['']
  }
  outlineSections.value.push(newSection)
}

const deleteSection = (index: number) => {
  outlineSections.value.splice(index, 1)
  // 更新 section 序号
  outlineSections.value.forEach((sec, idx) => {
    sec.section = idx + 1
  })
}

const addPoint = (sectionIndex: number) => {
  const section = outlineSections.value[sectionIndex]
  if (!section) {
    return
  }
  section.points.push('')
}

const deletePoint = (sectionIndex: number, pointIndex: number) => {
  const section = outlineSections.value[sectionIndex]
  if (!section) {
    return
  }
  if (section.points.length <= 1) {
    message.warning('每个章节至少保留一个要点')
    return
  }
  section.points.splice(pointIndex, 1)
}

const handleConfirm = () => {
  if (props.loading) return
  emit('confirm', outlineSections.value)
}

const handleAiModify = async () => {
  if (!modifySuggestion.value.trim()) {
    message.warning('请输入修改建议')
    return
  }

  aiModifying.value = true
  try {
    const res = await aiModifyOutline({
      taskId: props.taskId,
      modifySuggestion: modifySuggestion.value
    })

    if (res.data.data) {
      outlineSections.value = res.data.data.map((item, index) => ({
        section: item.section ?? index + 1,
        title: item.title ?? '',
        points: item.points ?? []
      }))
      modifySuggestion.value = ''
      message.success('AI 已根据您的建议修改大纲')
    }
  } catch (error) {
    const err = error as Error
    message.error(err.message || 'AI 修改失败')
  } finally {
    aiModifying.value = false
  }
}
</script>

<style scoped lang="scss">
.outline-editing-stage {
  --outline-accent: #16a34a;
  --outline-accent-soft: rgba(22, 163, 74, 0.1);
  --outline-border: #e5e7eb;
  --outline-bg: #f8fafc;
  --outline-text: #0f172a;
  --outline-text-muted: #64748b;

  max-width: 980px;
  margin: 0 auto;
  color: var(--outline-text);
}

.stage-header {
  margin-bottom: 20px;
}

.stage-title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 800;
  color: #0b3d2a;
}

.stage-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--outline-text-muted);
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.outline-section {
  background: linear-gradient(180deg, #ffffff 0%, #fcfffd 100%);
  border: 1px solid var(--outline-border);
  border-radius: 16px;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.04);
  padding: 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }
}

.section-header {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.drag-handle {
  color: #94a3b8;
  font-size: 18px;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.section-number {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #14532d;
  background: var(--outline-accent-soft);
}

.section-title-input :deep(.ant-input) {
  border-radius: 10px;
  border-color: var(--outline-border);
  font-size: 15px;
  font-weight: 600;

  &:hover,
  &:focus {
    border-color: var(--outline-accent);
  }
}

.delete-btn.ant-btn {
  border-radius: 10px;
}

.section-points {
  background: var(--outline-bg);
  border: 1px solid #ecf0f3;
  border-radius: 12px;
  padding: 12px;
}

.point-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;

  &:last-of-type {
    margin-bottom: 12px;
  }
}

.point-bullet {
  color: #16a34a;
  font-size: 18px;
  line-height: 1;
}

.point-input :deep(.ant-input) {
  border-radius: 10px;
  border-color: #dde4ea;
  background: #fff;

  &:hover,
  &:focus {
    border-color: var(--outline-accent);
  }
}

.delete-point-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  cursor: pointer;
  transition: all 0.16s ease;

  &:hover {
    background: rgba(220, 38, 38, 0.16);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.16);
    cursor: not-allowed;
    transform: none;
  }
}

.add-point-btn.ant-btn {
  border-radius: 10px;
  border-style: dashed;
  border-color: #86efac;
  color: #166534;
  background: #f0fdf4;

  &:hover,
  &:focus {
    border-color: #22c55e;
    color: #166534;
    background: #ecfdf3;
  }
}

.ai-chat-section {
  margin-top: 18px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #f8fbff 0%, #f0f9ff 100%);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
}

.chat-input-wrapper {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.chat-textarea :deep(.ant-input) {
  border-radius: 12px;
}

.ai-modify-btn.ant-btn {
  border-radius: 10px;
  height: 40px;
}

.actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.add-section-btn.ant-btn,
.confirm-btn.ant-btn {
  border-radius: 10px;
  height: 42px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .stage-title {
    font-size: 28px;
  }

  .section-header {
    grid-template-columns: auto auto 1fr;
  }

  .delete-btn {
    grid-column: 3 / 4;
    justify-self: end;
  }

  .chat-input-wrapper {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: stretch;

    .add-section-btn,
    .confirm-btn {
      flex: 1;
      min-width: 160px;
    }
  }
}
</style>
