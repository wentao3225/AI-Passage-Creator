<template>
  <section class="home-page">
    <div class="hero-shell">
      <p class="hero-badge">AI 驱动的内容创作平台</p>
      <h2 class="hero-title">AI 爆款文章创作器</h2>
      <p class="hero-subtitle">从主题输入到完整文章，10 秒起稿，持续优化表达与结构。</p>

      <div class="hero-cta">
        <a-input
          v-model:value="topic"
          size="large"
          placeholder="输入文章主题，例如：2026 年 AI 如何改变职场"
          class="topic-input"
        />
        <a-button type="primary" size="large" class="start-btn" @click="handleStart">开始创作</a-button>
      </div>

      <p class="hero-tips">工作总结、心得体会、演讲稿、分析报告，一键生成</p>
    </div>

    <div class="feature-shell">
      <div class="section-head">
        <p class="section-tag">核心能力</p>
        <h3>专业人士的一站式 AI 写作工具</h3>
        <p>从选题到成文，全流程可控，帮你稳定输出高质量内容。</p>
      </div>

      <div class="feature-grid">
        <article class="feature-card" v-for="item in features" :key="item.title">
          <h4>{{ item.title }}</h4>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const topic = ref('')

  const features = [
    { title: '智能生成标题', desc: '结合主题语义自动生成高点击标题，支持多风格改写。' },
    { title: '自动生成大纲', desc: '根据目标读者与写作目的输出结构化提纲，逻辑更清晰。' },
    { title: '流式生成正文', desc: '分段实时输出，边看边改，快速形成可发布内容。' },
  ]

  const handleStart = () => {
    router.push({ path: '/user/login', query: { topic: topic.value } })
  }
</script>

<style scoped>
  .home-page {
    padding-bottom: 52px;
    font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }

  .hero-shell {
    width: min(1120px, calc(100% - 32px));
    margin: 26px auto 42px;
    border-radius: 24px;
    padding: 52px 24px 58px;
    text-align: center;
    background:
      radial-gradient(circle at 14% 14%, rgba(198, 169, 107, 0.26), rgba(198, 169, 107, 0) 36%),
      radial-gradient(circle at 88% 0%, rgba(29, 79, 145, 0.24), rgba(29, 79, 145, 0) 34%),
      linear-gradient(135deg, #0f2b4f 0%, #123967 52%, #0a2443 100%);
    border: 1px solid rgba(18, 53, 95, 0.35);
    box-shadow: 0 22px 42px rgba(10, 31, 57, 0.32);
  }

  .hero-badge {
    display: inline-block;
    margin: 0;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    color: #ecd7ad;
    background: rgba(198, 169, 107, 0.2);
    border: 1px solid rgba(198, 169, 107, 0.34);
  }

  .hero-title {
    margin: 18px 0 10px;
    font-size: clamp(30px, 4.6vw, 54px);
    line-height: 1.14;
    color: #f4f8ff;
    letter-spacing: 0.02em;
  }

  .hero-subtitle {
    margin: 0;
    font-size: 16px;
    color: #c8d3e4;
  }

  .hero-cta {
    width: min(780px, 100%);
    margin: 30px auto 12px;
    background: rgba(244, 249, 255, 0.97);
    border-radius: 16px;
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    border: 1px solid rgba(18, 53, 95, 0.18);
    box-shadow: 0 12px 30px rgba(10, 31, 57, 0.22);
  }

  .topic-input {
    border-radius: 12px;
  }

  .topic-input :deep(.ant-input) {
    background: #ffffff;
    border-color: rgba(18, 53, 95, 0.28);
  }

  .topic-input :deep(.ant-input:focus),
  .topic-input :deep(.ant-input-focused) {
    border-color: #1d4f91;
    box-shadow: 0 0 0 2px rgba(29, 79, 145, 0.16);
  }

  .start-btn {
    border-radius: 12px;
    min-width: 146px;
    font-weight: 600;
    border: none;
    background: linear-gradient(140deg, #1d4f91, #153d72);
    box-shadow: 0 9px 20px rgba(10, 31, 57, 0.34);
  }

  .hero-tips {
    margin: 0;
    color: #b4c3d9;
    font-size: 13px;
  }

  .feature-shell {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
  }

  .section-head {
    text-align: center;
    margin-bottom: 24px;
  }

  .section-tag {
    display: inline-block;
    margin: 0 0 14px;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(198, 169, 107, 0.16);
    color: #6a5322;
    font-size: 12px;
  }

  .section-head h3 {
    margin: 0;
    color: #102743;
    font-size: clamp(24px, 3.2vw, 38px);
  }

  .section-head p {
    margin: 10px 0 0;
    color: #677a90;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .feature-card {
    border-radius: 14px;
    background: rgba(253, 254, 255, 0.94);
    border: 1px solid rgba(18, 53, 95, 0.14);
    padding: 18px;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 30px rgba(11, 33, 58, 0.16);
  }

  .feature-card h4 {
    margin: 0 0 8px;
    color: #153d72;
    font-size: 18px;
  }

  .feature-card p {
    margin: 0;
    color: #63768d;
    line-height: 1.7;
    font-size: 14px;
  }

  @media (max-width: 900px) {
    .feature-grid {
      grid-template-columns: 1fr;
    }

    .hero-cta {
      grid-template-columns: 1fr;
    }

    .start-btn {
      width: 100%;
    }
  }
</style>
