<template>
  <footer class="site-footer">
    <div class="site-footer__grid">
      <div v-for="section in FOOTER_SECTIONS" :key="section.title">
        <h3 class="site-footer__section-title">{{ section.title }}</h3>
        <ul class="site-footer__links">
          <li v-for="link in section.links" :key="link.label">
            <router-link
              v-if="!link.href.startsWith('http')"
              :to="link.href"
              class="site-footer__link"
            >
              {{ link.label }}
            </router-link>
            <a
              v-else
              :href="link.href"
              class="site-footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ link.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>
    <p class="site-footer__copyright">
      © 2026 {{ BRAND_NAME }} · {{ BRAND_TAGLINE }}
    </p>
  </footer>
</template>

<script setup lang="ts">
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

const FOOTER_SECTIONS: Array<{
  title: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    title: '模板中心',
    links: [
      { label: '场景模板', href: '/templates?scene=电商' },
      { label: '用途模板', href: '/templates?purpose=营销带货' },
      { label: '行业模板', href: '/templates?industry=鞋服箱包' },
      { label: 'PPT', href: '/templates?scene=PPT' },
    ],
  },
  {
    title: 'AI 工具',
    links: [
      { label: 'AI Agent', href: '/tools/t36' },
      { label: 'AI商品图', href: '/tools/t5' },
      { label: 'AI模特', href: '/tools/t14' },
      { label: '智能抠图', href: '/tools/t21' },
      { label: 'AI消除', href: '/tools/t22' },
      { label: '商品精修', href: '/tools/t6' },
      { label: 'LivePPT', href: '/tools/t29' },
    ],
  },
  {
    title: '内容中心',
    links: [
      { label: '文章中心', href: '/templates?purpose=生活科普' },
      { label: '热门搜索', href: '/templates?sort=hot' },
    ],
  },
  {
    title: '支持与服务',
    links: [
      { label: '关于我们', href: '/pricing' },
      { label: '加入我们', href: '/pricing' },
      { label: '用户协议', href: '/pricing' },
      { label: '隐私政策', href: '/pricing' },
    ],
  },
]
</script>

<style scoped lang="scss">
.site-footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border-whisper);
  background: var(--color-canvas-mist);
  padding: 32px 16px;

  @media (min-width: 768px) {
    padding: 32px 24px;
  }

  @media (min-width: 1024px) {
    padding: 32px;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;

    @media (min-width: 640px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &__section-title {
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__link {
    font-size: 12px;
    color: var(--color-ink-secondary);
    text-decoration: none;

    &:hover {
      color: var(--color-creative-violet);
    }
  }

  &__copyright {
    margin-top: 32px;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
}
</style>
