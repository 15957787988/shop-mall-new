<script setup>
defineProps({
  gates: { type: Object, default: null }
})
const emit = defineEmits(['locate'])

function shotId(text) {
  return String(text || '').match(/S\d+/)?.[0] || ''
}
</script>

<template>
  <details v-if="gates" class="gate-panel">
    <summary>
      质量门
      {{ (gates.gates || []).filter((gate) => gate.ok && !gate.skipped).length }} 通过 ·
      {{ (gates.failed || []).length }} 未通过 ·
      {{ (gates.hints || []).length }} 提示
    </summary>
    <ul>
      <li v-for="gate in gates.gates || []" :key="gate.id" :class="{ bad: !gate.ok, skip: gate.skipped }">
        <strong>{{ gate.skipped ? '跳过' : gate.ok ? '通过' : '未通过' }} {{ gate.label }}</strong>
        <button
          v-for="issue in gate.issues || []"
          :key="issue"
          type="button"
          class="gate-issue"
          @click="emit('locate', shotId(issue))"
        >
          {{ issue }}
        </button>
      </li>
    </ul>
    <p v-for="hint in gates.hints || []" :key="hint" class="gate-hint">{{ hint }}</p>
  </details>
</template>

<style scoped>
.gate-panel {
  margin-top: 8px;
  color: #deddd7;
  font-size: 12px;
}
.gate-panel summary {
  cursor: pointer;
}
.gate-panel ul {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}
.gate-panel li {
  margin-bottom: 6px;
}
.gate-panel li.bad strong {
  color: #ff8d8d;
}
.gate-issue,
.gate-hint {
  display: block;
  margin-top: 2px;
  color: #c9b27a;
  text-align: left;
}
.gate-issue {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
}
</style>
