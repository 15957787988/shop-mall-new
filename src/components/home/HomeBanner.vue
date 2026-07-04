<template>
  <section v-if="loading" class="home-banner home-banner--loading">
    <LoadingOutlined spin />
  </section>

  <section v-else-if="banners.length > 0" class="home-banner">
    <div
      class="home-banner__track"
      :style="{ transform: `translateX(-${current * 100}%)` }"
    >
      <template v-for="banner in banners" :key="banner.id">
        <a
          v-if="banner.redirectUrl"
          :href="banner.redirectUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-banner__slide home-banner__slide--link"
        >
          <div class="home-banner__image-wrap">
            <img :src="banner.imageUrl" :alt="banner.title || 'banner'" class="home-banner__image" />
          </div>
        </a>
        <div v-else class="home-banner__slide">
          <div class="home-banner__image-wrap">
            <img :src="banner.imageUrl" :alt="banner.title || 'banner'" class="home-banner__image" />
          </div>
        </div>
      </template>
    </div>

    <button
      type="button"
      class="home-banner__arrow home-banner__arrow--prev"
      aria-label="上一张"
      @click="prev"
    >
      <LeftOutlined />
    </button>
    <button
      type="button"
      class="home-banner__arrow home-banner__arrow--next"
      aria-label="下一张"
      @click="next"
    >
      <RightOutlined />
    </button>

    <div v-if="banners.length > 1" class="home-banner__dots">
      <button
        v-for="(_, i) in banners"
        :key="i"
        type="button"
        :class="['home-banner__dot', { 'home-banner__dot--active': i === current }]"
        :aria-label="`跳转到第 ${i + 1} 张`"
        @click="goTo(i)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons-vue'
import { getBannerList, type BannerItem } from '@/pages/home/api'
import { apiEnv } from '@/service/env'

const banners = ref<BannerItem[]>([])
const loading = ref(true)
const current = ref(0)
const autoPlay = ref(true)

let timer: ReturnType<typeof setInterval> | null = null

async function loadBanners() {
  if (apiEnv.useMock) {
    loading.value = false
    return
  }

  try {
    const list = await getBannerList()
    banners.value = (list ?? []).filter((b) => b.status === 0)
  } catch {
    banners.value = []
  } finally {
    loading.value = false
  }
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startAutoPlay() {
  clearTimer()
  if (!autoPlay.value || banners.value.length <= 1) return
  timer = setInterval(() => {
    current.value = (current.value + 1) % banners.value.length
  }, 4000)
}

function goTo(index: number) {
  current.value = index
  autoPlay.value = false
}

function prev() {
  current.value = current.value === 0 ? banners.value.length - 1 : current.value - 1
  autoPlay.value = false
}

function next() {
  current.value = (current.value + 1) % banners.value.length
  autoPlay.value = false
}

watch([autoPlay, () => banners.value.length], startAutoPlay)

onMounted(() => {
  loadBanners()
})

onUnmounted(() => {
  clearTimer()
})
</script>

<style scoped lang="scss">
.home-banner {
  position: relative;
  margin-bottom: var(--spacing-section);
  overflow: hidden;
  border-radius: 12px;

  &--loading {
    display: flex;
    height: 180px;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-0);
    color: var(--color-ink-tertiary);
    font-size: 20px;
  }

  &:hover .home-banner__arrow {
    opacity: 1;
  }

  &__track {
    display: flex;
    transition: transform 0.5s ease-out;
  }

  &__slide {
    width: 100%;
    flex-shrink: 0;

    &--link {
      display: block;
      text-decoration: none;
    }
  }

  &__image-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 5;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__arrow {
    position: absolute;
    top: 50%;
    z-index: 1;
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.3);
    color: #fff;
    cursor: pointer;
    opacity: 0;
    backdrop-filter: blur(4px);
    transform: translateY(-50%);
    transition: opacity 0.2s;

    &--prev {
      left: 12px;
    }

    &--next {
      right: 12px;
    }
  }

  &__dots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    z-index: 1;
    display: flex;
    gap: 6px;
    transform: translateX(-50%);
  }

  &__dot {
    height: 8px;
    width: 8px;
    border: none;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.7);
    }

    &--active {
      width: 24px;
      background: #fff;
    }
  }
}
</style>
