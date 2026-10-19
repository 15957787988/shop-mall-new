<template>
  <PageContainer>
    <RecommendedTools />
    <CanvasEntry />
    <HomeContentTabs />
    <CaseShowcaseCarousel />
  </PageContainer>
</template>

<script setup lang="ts">
import PageContainer from '@/components/ui/PageContainer.vue'
import RecommendedTools from '@/components/home/RecommendedTools.vue'
import CanvasEntry from '@/components/home/CanvasEntry.vue'
import HomeContentTabs from '@/components/home/HomeContentTabs.vue'
import CaseShowcaseCarousel from '@/components/home/CaseShowcaseCarousel.vue'
</script>
