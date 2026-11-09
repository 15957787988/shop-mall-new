<template>
  <PageContainer class-name="workspace-list">
    <header><div><h1>我的工作区</h1><p>需求、素材、会话和生成结果都保存在这里</p></div><router-link to="/tools/video-replicate"><Button type="primary">新建视频创作</Button></router-link><Button :loading="loading" @click="load">刷新</Button></header>
    <p v-if="error" role="alert">{{ error }}</p>
    <Button v-if="!isLoggedIn" @click="openLogin">登录后查看工作区</Button>
    <div v-else class="workspace-list__grid">
      <router-link v-for="item in items" :key="item.id" :to="`/workspaces/${item.id}`" class="workspace-list__card"><span>工作区 #{{ item.id }}</span><h2>{{ item.title }}</h2><p>{{ labels[item.run_status] || item.run_status }}</p><time>{{ item.updated_at.replace('T', ' ').slice(0, 16) }}</time></router-link>
      <p v-if="!loading && !items.length">还没有工作区，上传参考视频开始创作。</p>
    </div>
    <Pagination v-if="total > 20" v-model:current="page" :total="total" :page-size="20" :show-size-changer="false" @change="load" />
  </PageContainer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Button, Pagination } from 'ant-design-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import { useAuth } from '@/composables/useAuth'
import { listWorkspaces, type WorkspaceRow } from '@/pages/workspaces/api'
const { isLoggedIn, sessionVersion, openLogin } = useAuth()
const items = ref<WorkspaceRow[]>([]), total = ref(0), page = ref(1), loading = ref(false), error = ref('')
const labels: Record<string, string> = { QUEUED: '排队中', RUNNING: 'Agent 执行中', WAITING_TOOL: '等待生成结果', WAITING_INPUT: '等待补充', COMPLETED: '本轮完成', FAILED: '执行失败', REVIEW: '结果待核对', STOPPED: '已停止' }
let version = 0, closed = false
async function load() {
  const current = ++version
  if (!isLoggedIn.value) { items.value = []; total.value = 0; return }
  loading.value = true
  try { const result = await listWorkspaces(page.value); if (!closed && current === version) { items.value = result.list; total.value = result.total; error.value = '' } }
  catch (e: unknown) { if (!closed && current === version) error.value = e instanceof Error ? e.message : '加载失败' }
  finally { if (current === version) loading.value = false }
}
watch([isLoggedIn, sessionVersion], () => { items.value = []; page.value = 1; void load() }, { immediate: true })
onBeforeUnmount(() => { closed = true; version += 1 })
</script>

<style scoped lang="scss" src="./index.scss"></style>
