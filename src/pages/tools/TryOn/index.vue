<template>
  <PageContainer flush>
    <div class="tryon-page">
      <header class="tryon-page__head">
        <h1 class="tryon-page__title">AI服饰穿戴</h1>
      </header>

      <div class="tryon-page__body">
        <aside class="tryon-page__sidebar">
          <SceneSidebar
            v-show="phase === 'scene-select' || phase === 'result'"
            :groups="scenePromptGroups"
            :generating="generatingImages"
            @prev="handlePrev"
            @regenerate="handleRegenerate"
          />
          <TryOnSidebar
            v-show="phase === 'config'"
            v-model:generating="generatingPrompt"
            @generate="handleGenerate"
          />
        </aside>

        <main class="tryon-page__main">
          <Spin v-if="generatingPrompt && phase === 'config'" class="tryon-page__loading">
            <div class="tryon-page__loading-text">正在生成推荐场景...</div>
          </Spin>
          <Spin v-else-if="generatingImages" class="tryon-page__loading">
            <div class="tryon-page__loading-text">正在提交生成任务...</div>
          </Spin>
          <TryOnResultList
            v-else-if="phase === 'result' || results.length"
            v-model:results="results"
            :loading="resultsLoading"
          />
          <TryOnEmpty v-else />
        </main>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Spin } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import TryOnSidebar from './components/TryOnSidebar.vue'
import SceneSidebar from './components/SceneSidebar.vue'
import TryOnEmpty from './components/TryOnEmpty.vue'
import TryOnResultList from './components/TryOnResultList.vue'
import { useToast } from '@/composables/useToast'
import { generateScenePrompt, generateWearImage, mapScenePromptGroups } from './api'
import { useWearImageResults } from './hook/useWearImageResults'
import { buildWearImageGenerateReq } from './utils/transform'
import type { TryOnFormData, ScenePromptGroup, ScenePromptResult } from './utils/types'

type Phase = 'config' | 'scene-select' | 'result'

const { addToast } = useToast()
const { results, loading: resultsLoading, fetchResults, startPolling } = useWearImageResults()

const phase = ref<Phase>('config')
const generatingPrompt = ref(false)
const generatingImages = ref(false)
const scenePromptGroups = ref<ScenePromptGroup[]>([])
const scenePromptResults = ref<ScenePromptResult[]>([])
const savedForm = ref<TryOnFormData | null>(null)

async function handleGenerate(form: TryOnFormData) {
  generatingPrompt.value = true
  try {
    const data = await generateScenePrompt({
      userSceneSelection: form.sceneIds.join('，'),
      userSceneCustomInput: form.customScene.trim(),
      images: [...form.productImages],
    })
    savedForm.value = {
      ...form,
      productImages: [...form.productImages],
      sceneIds: [...form.sceneIds],
    }
    scenePromptResults.value = data
    scenePromptGroups.value = mapScenePromptGroups(data)
    phase.value = 'scene-select'
    addToast('推荐场景生成成功', 'success')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '生成推荐场景失败'
    addToast(msg, 'error')
  } finally {
    generatingPrompt.value = false
  }
}

function handlePrev() {
  phase.value = 'config'
}

async function handleRegenerate(poseIds: string[]) {
  if (!savedForm.value || scenePromptResults.value.length === 0) {
    return
  }

  generatingImages.value = true
  try {
    const req = buildWearImageGenerateReq(savedForm.value, scenePromptResults.value, poseIds)
    if (req.prompts.length === 0) {
      addToast('未找到有效的场景提示词', 'error')
      return
    }
    await generateWearImage(req)
    addToast('生成任务已提交，正在生成中...', 'success')
    phase.value = 'result'
    await fetchResults(false)
    startPolling()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '生成场景图片失败'
    addToast(msg, 'error')
  } finally {
    generatingImages.value = false
  }
}
</script>

<style scoped lang="scss">
.tryon-page {
  display: flex;
  height: calc(100vh - 48px);
  flex-direction: column;
  overflow: hidden;

  &__head {
    flex-shrink: 0;
    padding: 12px 16px 8px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__body {
    display: flex;
    min-height: 0;
    flex: 1;
    gap: 10px;
    padding: 0 10px 10px;
  }

  &__sidebar {
    width: 370px;
    flex-shrink: 0;
    min-height: 0;
  }

  &__main {
    position: relative;
    min-width: 0;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border-radius: 12px;
    background: var(--color-surface-2);
  }

  &__loading {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  &__loading-text {
    margin-top: 12px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }
}

@media (max-width: 960px) {
  .tryon-page {
    height: auto;
    min-height: calc(100vh - 48px);
    overflow: visible;

    &__body {
      flex-direction: column;
    }

    &__sidebar {
      width: 100%;
      height: auto;
      min-height: 420px;
    }

    &__main {
      min-height: 480px;
    }
  }
}
</style>
