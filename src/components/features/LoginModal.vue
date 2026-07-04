<template>
  <Modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    :width="440"
    wrap-class-name="login-modal-wrap"
    destroy-on-close
    centered
    @cancel="onClose"
  >
    <div class="login-modal" aria-labelledby="login-modal-title">
      <button type="button" class="login-modal__close" aria-label="关闭" @click="onClose">
          <CloseOutlined />
        </button>

        <div class="login-modal__header">
          <h2 id="login-modal-title" class="login-modal__title">
            {{ isBindMode ? '绑定手机号' : '登录 / 注册' }}
          </h2>
          <p class="login-modal__subtitle">
            {{ isBindMode ? '绑定后可接收通知并使用完整功能' : '登录后即可使用全部 AI 工具' }}
          </p>

          <template v-if="!isBindMode">
            <p v-if="subView === 'reset'" class="login-modal__hint">验证手机号后可设置新密码</p>
            <p v-else-if="subView === 'register'" class="login-modal__hint">注册成功后将自动登录</p>
            <div v-else class="login-modal__tabs">
              <button
                v-for="item in TAB_ITEMS"
                :key="item.id"
                type="button"
                class="login-modal__tab"
                :class="{ 'login-modal__tab--active': tab === item.id }"
                @click="switchTab(item.id)"
              >
                <component :is="item.icon" class="login-modal__tab-icon" />
                <span class="login-modal__tab-label">{{ item.label }}</span>
              </button>
            </div>
          </template>
        </div>

        <div class="login-modal__body scroll-area">
          <p v-if="success && !subView && !isBindMode" class="login-modal__success">
            {{ success }}
          </p>

          <!-- 绑手机 -->
          <form v-if="isBindMode" class="login-modal__form" @submit.prevent="handleBindSubmit">
            <label class="login-modal__label" for="bind-mobile">绑定手机号</label>
            <Input
              id="bind-mobile"
              :value="bindMobileInput"
              size="large"
              maxlength="11"
              placeholder="请输入手机号"
              :disabled="loading"
              autofocus
              @update:value="(v: string) => (bindMobileInput = digitsOnly(v))"
            />

            <label class="login-modal__label" for="bind-code">验证码</label>
            <div class="login-modal__code-row">
              <Input
                id="bind-code"
                :value="bindCode"
                size="large"
                maxlength="6"
                placeholder="请输入验证码"
                class="login-modal__code-input"
                :disabled="loading"
                @update:value="(v: string) => (bindCode = digitsOnly(v))"
              />
              <Button
                size="large"
                :disabled="bindCooldown.sending || loading"
                @click="
                  handleSendSms(
                    bindMobileInput.trim(),
                    SMS_SCENE.MEMBER_UPDATE_MOBILE,
                    bindCooldown
                  )
                "
              >
                {{ bindCooldown.sending ? `${bindCooldown.seconds}s` : '获取验证码' }}
              </Button>
            </div>

            <p v-if="error" class="login-modal__error">{{ error }}</p>

            <Button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-modal__submit"
            >
              {{ loading ? '绑定中…' : '完成绑定' }}
            </Button>
          </form>

          <!-- 忘记密码 -->
          <form
            v-else-if="subView === 'reset'"
            class="login-modal__form"
            @submit.prevent="handleForgotSubmit"
          >
            <label class="login-modal__label" for="forgot-mobile">手机号</label>
            <Input
              id="forgot-mobile"
              :value="forgotMobile"
              size="large"
              maxlength="11"
              placeholder="请输入注册手机号"
              :disabled="loading"
              autofocus
              @update:value="(v: string) => (forgotMobile = digitsOnly(v))"
            />

            <label class="login-modal__label" for="forgot-code">验证码</label>
            <div class="login-modal__code-row">
              <Input
                id="forgot-code"
                :value="forgotCode"
                size="large"
                maxlength="6"
                placeholder="请输入验证码"
                class="login-modal__code-input"
                :disabled="loading"
                @update:value="(v: string) => (forgotCode = digitsOnly(v))"
              />
              <Button
                size="large"
                :disabled="forgotCooldown.sending || loading"
                @click="
                  handleSendSms(
                    forgotMobile.trim(),
                    SMS_SCENE.MEMBER_RESET_PASSWORD,
                    forgotCooldown
                  )
                "
              >
                {{ forgotCooldown.sending ? `${forgotCooldown.seconds}s` : '获取验证码' }}
              </Button>
            </div>

            <label class="login-modal__label" for="forgot-password">新密码</label>
            <Input
              id="forgot-password"
              v-model:value="forgotPassword"
              type="password"
              size="large"
              maxlength="16"
              placeholder="4-16 位新密码"
              :disabled="loading"
            />

            <label class="login-modal__label" for="forgot-password-confirm"> 确认密码 </label>
            <Input
              id="forgot-password-confirm"
              v-model:value="forgotPasswordConfirm"
              type="password"
              size="large"
              maxlength="16"
              placeholder="再次输入新密码"
              :disabled="loading"
            />

            <p v-if="error" class="login-modal__error">{{ error }}</p>

            <Button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-modal__submit"
            >
              {{ loading ? '提交中…' : '重置密码' }}
            </Button>
            <button type="button" class="login-modal__link-btn" @click="closeSubView">
              返回登录
            </button>
          </form>

          <!-- 注册 -->
          <form
            v-else-if="subView === 'register'"
            class="login-modal__form"
            @submit.prevent="handleRegisterSubmit"
          >
            <label class="login-modal__label" for="register-username">账号</label>
            <Input
              id="register-username"
              v-model:value="registerUsername"
              size="large"
              maxlength="30"
              placeholder="4-30 位账号"
              :disabled="loading"
              autofocus
            />

            <label class="login-modal__label" for="register-password">密码</label>
            <Input
              id="register-password"
              v-model:value="registerPassword"
              type="password"
              size="large"
              maxlength="20"
              placeholder="5-20 位密码"
              :disabled="loading"
            />

            <label class="login-modal__label" for="register-password-confirm"> 确认密码 </label>
            <Input
              id="register-password-confirm"
              v-model:value="registerPasswordConfirm"
              type="password"
              size="large"
              maxlength="20"
              placeholder="再次输入密码"
              :disabled="loading"
            />

            <label class="login-modal__agreement">
              <Checkbox v-model:checked="agreement" :disabled="loading" />
              <span>
                我已阅读并同意
                <a href="/Agreement" target="_blank" rel="noopener noreferrer">用户协议</a>
              </span>
            </label>

            <p v-if="error" class="login-modal__error">{{ error }}</p>

            <Button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-modal__submit"
            >
              {{ loading ? '注册中…' : '注册' }}
            </Button>
            <button type="button" class="login-modal__link-btn" @click="closeSubView">
              已有账号，返回登录
            </button>
          </form>

          <!-- 微信扫码 -->
          <div v-else-if="tab === 'wechat'" class="login-modal__wechat">
            <div class="login-modal__qr-wrap">
              <img v-if="qrUrl" :src="qrUrl" alt="微信登录二维码" class="login-modal__qr" />
              <LoadingOutlined v-else class="login-modal__qr-loading" spin />
            </div>
            <p class="login-modal__wechat-status">{{ wechatStatus }}</p>
            <p class="login-modal__wechat-tip">扫码登录即表示同意用户协议</p>
            <button
              v-if="scanToken"
              type="button"
              class="login-modal__refresh"
              @click="loadWechatQr"
            >
              刷新二维码
            </button>
            <p v-if="error" class="login-modal__error">{{ error }}</p>
          </div>

          <!-- 账号密码 -->
          <form
            v-else-if="tab === 'account'"
            class="login-modal__form"
            @submit.prevent="handlePasswordSubmit"
          >
            <label class="login-modal__label" for="login-account-username"> 账号 </label>
            <Input
              id="login-account-username"
              v-model:value="accountUsername"
              size="large"
              maxlength="30"
              placeholder="请输入账号"
              :disabled="loading"
              autofocus
            />

            <label class="login-modal__label" for="login-password">密码</label>
            <Input
              id="login-password"
              v-model:value="password"
              type="password"
              size="large"
              maxlength="16"
              placeholder="请输入密码（4-16 位）"
              :disabled="loading"
            />

            <div class="login-modal__options-row">
              <label class="login-modal__remember">
                <Checkbox v-model:checked="rememberMe" :disabled="loading" />
                <span>记住我</span>
              </label>
              <!-- <button type="button" class="login-modal__link" @click="openReset">忘记密码？</button> -->
            </div>

            <label class="login-modal__agreement">
              <Checkbox v-model:checked="agreement" :disabled="loading" />
              <span>
                我已阅读并同意
                <a href="/Agreement" target="_blank" rel="noopener noreferrer">用户协议</a>
              </span>
            </label>

            <p v-if="error" class="login-modal__error">{{ error }}</p>

            <Button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-modal__submit"
            >
              {{ loading ? '登录中…' : '登录' }}
            </Button>

            <button type="button" class="login-modal__link-btn" @click="openRegister">
              没有账号？立即注册
            </button>
          </form>

          <!-- 手机验证 -->
          <form v-else class="login-modal__form" @submit.prevent="handleSmsSubmit">
            <label class="login-modal__label" for="login-sms-mobile">手机号</label>
            <Input
              id="login-sms-mobile"
              :value="smsMobile"
              size="large"
              maxlength="11"
              placeholder="请输入手机号"
              :disabled="loading"
              autofocus
              @update:value="(v: string) => (smsMobile = digitsOnly(v))"
            />

            <label class="login-modal__label" for="login-sms-code">验证码</label>
            <div class="login-modal__code-row">
              <Input
                id="login-sms-code"
                :value="smsCode"
                size="large"
                maxlength="6"
                placeholder="请输入验证码"
                class="login-modal__code-input"
                :disabled="loading"
                @update:value="(v: string) => (smsCode = digitsOnly(v))"
              />
              <Button
                size="large"
                :disabled="smsCooldown.sending || loading"
                @click="handleSendSms(smsMobile.trim(), SMS_SCENE.MEMBER_LOGIN, smsCooldown)"
              >
                {{ smsCooldown.sending ? `${smsCooldown.seconds}s` : '获取验证码' }}
              </Button>
            </div>

            <p v-if="error" class="login-modal__error">{{ error }}</p>

            <Button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="login-modal__submit"
            >
              {{ loading ? '登录中…' : '登录 / 注册' }}
            </Button>
          </form>
        </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Input, Button, Checkbox, Modal } from 'ant-design-vue'
import {
  CloseOutlined,
  LoadingOutlined,
  QrcodeOutlined,
  UserOutlined,
  MobileOutlined,
} from '@ant-design/icons-vue'
import type { LoginModalMode } from '@/store/auth'
import { useAuth } from '@/composables/useAuth'
import { useSmsCooldown } from '@/composables/useSmsCooldown'
import {
  SMS_SCENE,
  checkWechatLogin,
  getWechatLoginQrCode,
  resetPassword,
  sendSmsCode,
} from '@/pages/login/api'
import { getInviteCode } from '@/lib/auth/inviteCode'
import {
  getLoginFormCache,
  removeLoginFormCache,
  setLoginFormCache,
} from '@/lib/auth/loginFormCache'
import { resolveTenantFromWebsite } from '@/lib/auth/resolveTenant'

type LoginTab = 'wechat' | 'account' | 'sms'
type LoginSubView = 'reset' | 'register' | null

const TAB_ITEMS: { id: LoginTab; label: string; icon: typeof QrcodeOutlined }[] = [
  { id: 'wechat', label: '微信扫码', icon: QrcodeOutlined },
  { id: 'account', label: '账号登录', icon: UserOutlined },
  // { id: 'sms', label: '手机验证', icon: MobileOutlined },
]

const MOBILE_RE = /^1\d{10}$/

const props = withDefaults(
  defineProps<{
    open: boolean
    onClose: () => void
    mode?: LoginModalMode
  }>(),
  { mode: 'login' }
)

const { loginWithPassword, loginWithSms, bindMobile, completeLogin, register } = useAuth()

const forgotCooldown = useSmsCooldown()
const smsCooldown = useSmsCooldown()
const bindCooldown = useSmsCooldown()

const isBindMode = computed(() => props.mode === 'bind-mobile')

const tab = ref<LoginTab>('wechat')
const subView = ref<LoginSubView>(null)
const success = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const agreement = ref(false)
const rememberMe = ref(true)

const accountUsername = ref('')
const password = ref('')

const registerUsername = ref('')
const registerPassword = ref('')
const registerPasswordConfirm = ref('')

const forgotMobile = ref('')
const forgotCode = ref('')
const forgotPassword = ref('')
const forgotPasswordConfirm = ref('')

const smsMobile = ref('')
const smsCode = ref('')

const qrUrl = ref<string | null>(null)
const scanToken = ref<string | null>(null)
const wechatStatus = ref('请使用微信扫描二维码')
const bindMobileInput = ref('')
const bindCode = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function resetForm() {
  error.value = null
  success.value = null
  loading.value = false
  subView.value = null
  agreement.value = false
  accountUsername.value = ''
  password.value = ''
  registerUsername.value = ''
  registerPassword.value = ''
  registerPasswordConfirm.value = ''
  forgotMobile.value = ''
  forgotCode.value = ''
  forgotPassword.value = ''
  forgotPasswordConfirm.value = ''
  smsMobile.value = ''
  smsCode.value = ''
  qrUrl.value = null
  scanToken.value = null
  wechatStatus.value = '请使用微信扫描二维码'
  bindMobileInput.value = ''
  bindCode.value = ''
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startWechatPoll(token: string) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const resp = await checkWechatLogin(token, getInviteCode())
      if (!resp?.accessToken) return

      stopPolling()
      wechatStatus.value = '扫码成功，正在进入…'
      await completeLogin(resp)
    } catch {
      // 轮询中忽略瞬时错误
    }
  }, 2000)
}

async function loadWechatQr() {
  error.value = null
  wechatStatus.value = '正在生成二维码…'
  try {
    const data = await getWechatLoginQrCode()
    qrUrl.value = data.qrUrl
    scanToken.value = data.scanToken
    wechatStatus.value = '请使用微信扫描二维码'
  } catch (err) {
    wechatStatus.value = '二维码加载失败'
    error.value = err instanceof Error ? err.message : '无法获取微信二维码'
  }
}

function switchTab(id: LoginTab) {
  tab.value = id
  subView.value = null
  error.value = null
}

function openReset() {
  subView.value = 'reset'
  error.value = null
  success.value = null
}

function openRegister() {
  subView.value = 'register'
  error.value = null
  success.value = null
}

function closeSubView() {
  subView.value = null
  error.value = null
}

function loadLoginCache() {
  const cached = getLoginFormCache()
  if (!cached) return
  accountUsername.value = cached.username
  password.value = cached.password
  rememberMe.value = cached.rememberMe
}

async function handleSendSms(
  mobile: string,
  scene: number,
  cooldown: ReturnType<typeof useSmsCooldown>
) {
  error.value = null
  if (!MOBILE_RE.test(mobile)) {
    error.value = '请输入正确的手机号'
    return
  }
  try {
    await sendSmsCode(mobile, scene)
    cooldown.start(60)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '验证码发送失败'
  }
}

async function handlePasswordSubmit() {
  error.value = null
  const username = accountUsername.value.trim()
  if (username.length < 4) {
    error.value = '请输入账号'
    return
  }
  if (password.value.length < 4) {
    error.value = '请输入密码'
    return
  }
  if (!agreement.value) {
    error.value = '请先阅读并同意用户协议'
    return
  }
  loading.value = true
  try {
    await loginWithPassword(username, password.value)
    if (rememberMe.value) {
      setLoginFormCache({
        username,
        password: password.value,
        rememberMe: true,
      })
    } else {
      removeLoginFormCache()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleRegisterSubmit() {
  error.value = null
  const username = registerUsername.value.trim()
  if (username.length < 4 || username.length > 30) {
    error.value = '账号长度为 4-30 位'
    return
  }
  if (registerPassword.value.length < 5 || registerPassword.value.length > 20) {
    error.value = '密码长度为 5-20 位'
    return
  }
  if (registerPassword.value !== registerPasswordConfirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  if (!agreement.value) {
    error.value = '请先阅读并同意用户协议'
    return
  }
  loading.value = true
  try {
    await register(username, registerPassword.value)
    removeLoginFormCache()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleSmsSubmit() {
  error.value = null
  const mobile = smsMobile.value.trim()
  const code = smsCode.value.trim()
  if (!MOBILE_RE.test(mobile)) {
    error.value = '请输入正确的手机号'
    return
  }
  if (code.length < 4) {
    error.value = '请输入验证码'
    return
  }
  loading.value = true
  try {
    await loginWithSms(mobile, code)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleBindSubmit() {
  error.value = null
  const mobile = bindMobileInput.value.trim()
  const code = bindCode.value.trim()
  if (!MOBILE_RE.test(mobile)) {
    error.value = '请输入正确的手机号'
    return
  }
  if (code.length < 4) {
    error.value = '请输入验证码'
    return
  }
  loading.value = true
  try {
    await bindMobile(mobile, code)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '绑定失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleForgotSubmit() {
  error.value = null
  success.value = null
  const mobile = forgotMobile.value.trim()
  const code = forgotCode.value.trim()
  if (!MOBILE_RE.test(mobile)) {
    error.value = '请输入正确的手机号'
    return
  }
  if (code.length < 4) {
    error.value = '请输入验证码'
    return
  }
  if (forgotPassword.value.length < 4 || forgotPassword.value.length > 16) {
    error.value = '密码长度为 4-16 位'
    return
  }
  if (forgotPassword.value !== forgotPasswordConfirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await resetPassword(mobile, code, forgotPassword.value)
    success.value = '密码已重置，请使用新密码登录'
    subView.value = null
    tab.value = 'account'
    accountUsername.value = mobile
    password.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重置失败，请重试'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetForm()
      stopPolling()
      return
    }
    loadLoginCache()
    void resolveTenantFromWebsite()
  }
)

watch([() => props.open, isBindMode, tab, subView], ([open, bindMode, currentTab, view]) => {
  if (!open || bindMode || currentTab !== 'wechat' || view) {
    stopPolling()
    qrUrl.value = null
    scanToken.value = null
    return
  }
  void loadWechatQr()
})

watch([() => props.open, isBindMode, tab, scanToken], ([open, bindMode, currentTab, token]) => {
  if (!open || bindMode || currentTab !== 'wechat' || !token) return
  startWechatPoll(token)
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
:global(.login-modal-wrap .ant-modal-content) {
  border-radius: 12px;
  overflow: hidden;
}

:global(.login-modal-wrap .ant-modal-body) {
  padding: 0;
}

.login-modal {
  position: relative;
  display: flex;
  max-height: 90vh;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface-0);

  &__close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 1;
    display: flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;

    &:hover {
      background: var(--color-surface-2);
    }
  }

  &__header {
    border-bottom: 1px solid var(--color-border-whisper);
    padding: 24px 24px 16px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__subtitle {
    margin-top: 4px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__hint {
    margin-top: 12px;
    border-radius: 8px;
    background: var(--color-surface-2);
    padding: 8px 12px;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__tabs {
    display: flex;
    gap: 4px;
    margin-top: 16px;
    border-radius: 8px;
    background: var(--color-surface-2);
    padding: 4px;
  }

  &__tab {
    display: flex;
    min-height: 44px;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 6px;
    background: transparent;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: color 0.15s, background 0.15s, box-shadow 0.15s;

    @media (min-width: 640px) {
      font-size: 14px;
    }

    &:hover {
      color: var(--color-ink-primary);
    }

    &--active {
      background: var(--color-surface-0);
      color: var(--color-creative-violet);
      box-shadow: var(--shadow-card);
    }
  }

  &__tab-icon {
    flex-shrink: 0;
    font-size: 16px;
  }

  &__tab-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__body {
    padding: 20px 24px;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__label {
    display: block;
    margin-bottom: -8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-primary);
  }

  &__code-row {
    display: flex;
    gap: 8px;
  }

  &__code-input {
    flex: 1;
    min-width: 0;
  }

  &__submit {
    margin-top: 4px;
  }

  &__forgot-row,
  &__options-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: -8px;
  }

  &__remember,
  &__agreement {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    color: var(--color-ink-secondary);

    a {
      color: var(--color-creative-violet);
    }
  }

  &__link,
  &__refresh {
    border: none;
    background: transparent;
    padding: 0;
    font-size: 14px;
    color: var(--color-creative-violet);
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__link-btn {
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
    cursor: pointer;

    &:hover {
      color: var(--color-ink-primary);
    }
  }

  &__success {
    margin-bottom: 16px;
    border-radius: 8px;
    background: var(--color-surface-2);
    padding: 8px 12px;
    font-size: 14px;
    color: var(--color-success-mint);
  }

  &__error {
    font-size: 14px;
    color: var(--color-blossom-pink);
  }

  &__wechat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
  }

  &__qr-wrap {
    display: flex;
    width: 220px;
    height: 220px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-whisper);
    border-radius: 12px;
    background: var(--color-surface-2);
  }

  &__qr {
    width: 200px;
    height: 200px;
    border-radius: 6px;
    object-fit: contain;
  }

  &__qr-loading {
    font-size: 32px;
    color: var(--color-creative-violet);
  }

  &__wechat-status {
    margin-top: 16px;
    text-align: center;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__wechat-tip {
    margin-top: 4px;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  &__refresh {
    margin-top: 16px;
  }
}
</style>
