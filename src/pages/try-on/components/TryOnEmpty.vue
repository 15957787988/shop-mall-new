<template>
  <div class="tryon-empty">
    <h2 class="tryon-empty__title">AI服饰穿戴</h2>
    <p class="tryon-empty__desc">上传服装，选定模特，同场景多姿势套图即刻生成。</p>

    <div class="tryon-empty__carousel">
      <img :src="slides[activeSlide]" alt="示例展示" class="tryon-empty__slide" />
      <div class="tryon-empty__dots">
        <button
          v-for="(_, i) in slides"
          :key="i"
          type="button"
          class="tryon-empty__dot"
          :class="{ 'tryon-empty__dot--active': i === activeSlide }"
          @click="activeSlide = i"
        />
      </div>
    </div>

    <ul class="tryon-empty__features">
      <li v-for="item in features" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const slides = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&h=600&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=600&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=900&h=600&fit=crop',
]

const features = [
  '同场景多姿势，一键解锁整套实拍图。',
  '多品类自由搭配，一键生成完整穿搭图。',
  '多场景自由切换，轻松拍出大片氛围。',
  '专属模特一键定制，多品类配饰随心搭。',
]

const activeSlide = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.length
  }, 4000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped lang="scss">
.tryon-empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  text-align: center;

  &__title {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--color-ink-primary);
  }

  &__desc {
    margin: 10px 0 28px;
    max-width: 520px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__carousel {
    position: relative;
    width: min(720px, 100%);
    overflow: hidden;
    border-radius: 16px;
    background: #fff;
    box-shadow: var(--shadow-soft);
  }

  &__slide {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }

  &__dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    display: flex;
    gap: 6px;
    transform: translateX(-50%);
  }

  &__dot {
    width: 8px;
    height: 8px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;

    &--active {
      background: #fff;
    }
  }

  &__features {
    margin: 28px 0 0;
    padding: 0;
    list-style: none;
    text-align: left;

    li {
      position: relative;
      margin-bottom: 8px;
      padding-left: 14px;
      font-size: 13px;
      color: var(--color-ink-secondary);

      &::before {
        position: absolute;
        left: 0;
        content: '•';
        color: var(--color-creative-violet);
      }
    }
  }
}
</style>
