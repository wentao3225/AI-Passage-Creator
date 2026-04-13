<template>
  <footer class="global-footer">
    <div class="footer-shell">
      <p class="copyright">© {{ currentYear }} AI文章创作器. 保留所有权利。</p>
      <div class="footer-links">
        <a href="#" @click.prevent>隐私政策</a>
        <a href="#" @click.prevent>服务条款</a>
        <a href="#" @click.prevent>帮助中心</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
  const currentYear = new Date().getFullYear()
</script>

<style scoped>
  .global-footer {
    border-top: 1px solid rgba(17, 48, 86, 0.14);
    background:
      radial-gradient(circle at 10% 0%, rgba(29, 79, 145, 0.12), rgba(29, 79, 145, 0) 38%),
      linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(235, 242, 250, 0.96));
    font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }

  .footer-shell {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: #64768b;
  }

  .copyright {
    margin: 0;
    font-size: 13px;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-links a {
    color: #3d5674;
    text-decoration: none;
    font-size: 13px;
    transition: color 0.2s ease;
  }

  .footer-links a:hover {
    color: #1d4f91;
  }

  @media (max-width: 760px) {
    .footer-shell {
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 12px 0;
    }
  }
</style>
