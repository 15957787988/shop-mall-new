<template>
  <section class="subscription-hero">
    <div class="subscription-hero__bg" />
    <div class="subscription-hero__content">
      <div class="subscription-hero__icon-wrap">
        <CrownOutlined class="subscription-hero__icon" />
      </div>
      <div class="subscription-hero__price-row">
        <span class="subscription-hero__currency">¥</span>
        <span class="subscription-hero__price">{{ offer.trialPrice }}</span>
        <span class="subscription-hero__unit">/{{ offer.trialLabel }}</span>
      </div>
      <h2 id="subscription-popup-title" class="subscription-hero__headline">
        {{ offer.headline }}
      </h2>
      <p class="subscription-hero__subheadline">{{ offer.subheadline }}</p>
      <div class="subscription-hero__social">
        <div class="subscription-hero__avatars">
          <img
            v-for="(src, i) in offer.socialProof.avatars"
            :key="i"
            :src="src"
            alt=""
            class="subscription-hero__avatar"
          />
        </div>
        <span class="subscription-hero__social-text">
          <span class="subscription-hero__social-count">{{ offer.socialProof.userCount }}</span>
          用户已开通
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CrownOutlined } from '@ant-design/icons-vue'

const offer = {
  trialPrice: 1.1,
  trialLabel: '首月体验',
  headline: '1.1元开通专业版会员',
  subheadline: '解锁全部 AI 工具与高级模板',
  socialProof: {
    userCount: '500万+',
    avatars: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=u1',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=u2',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=u3',
    ],
  },
}
</script>

<style scoped lang="scss">
.subscription-hero {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 24px 16px;
  text-align: center;

  &__bg {
    pointer-events: none;
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 20%, rgba(255, 138, 101, 0.18) 0%, transparent 50%),
      radial-gradient(circle at 80% 30%, rgba(109, 40, 217, 0.12) 0%, transparent 45%),
      linear-gradient(180deg, #fff7ed 0%, #fdf4ff 55%, #ffffff 100%);
  }

  &__content {
    position: relative;
  }

  &__icon-wrap {
    margin: 0 auto 12px;
    display: flex;
    height: 64px;
    width: 64px;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: var(--sub-bg-card);
    box-shadow: var(--shadow-lift);
    border: 1px solid rgba(255, 255, 255, 0.8);
  }

  &__icon {
    font-size: 32px;
    color: var(--sub-accent-to);
  }

  &__price-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
  }

  &__currency {
    padding-bottom: 8px;
    font-size: 20px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__price {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--sub-badge);
  }

  &__unit {
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__headline {
    margin: 8px 0 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-ink-primary);
  }

  &__subheadline {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__social {
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__avatars {
    display: flex;

    .subscription-hero__avatar + .subscription-hero__avatar {
      margin-left: -8px;
    }
  }

  &__avatar {
    height: 24px;
    width: 24px;
    border-radius: 9999px;
    border: 2px solid white;
  }

  &__social-text {
    font-size: 11px;
    color: var(--color-ink-secondary);
  }

  &__social-count {
    font-weight: 500;
    color: var(--color-ink-primary);
  }
}
</style>
