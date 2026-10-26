<template>
  <div class="app-container">
    <el-alert type="info" show-icon :closable="false" class="mb8">
      <template #title>
        这里连接的是<b>全站共用的 OSM 同步账号</b>：后端用它登录 osmtrade.com，只把返回的会话 Cookie 存入 Redis，<b>不保存密码</b>。会员端今日、信息、进行等页面的数据都靠这个会话定时同步；会话过期后需要在这里重新连接。
      </template>
    </el-alert>

    <el-row :gutter="12">
      <!-- 连接状态 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="mb8">
          <template #header>
            <div class="card-header">
              <span>连接状态</span>
              <el-button link type="primary" icon="Refresh" :loading="statusLoading" @click="getStatus">刷新状态</el-button>
            </div>
          </template>
          <el-descriptions :column="1" border v-loading="statusLoading && !loaded">
            <el-descriptions-item label="OSM 会话">
              <el-tag v-if="loggedIn" type="success" effect="dark">已连接</el-tag>
              <el-tag v-else type="info" effect="dark">未连接</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="剩余有效期">
              <template v-if="loggedIn">
                <span class="mono" :class="{ warn: remain > 0 && remain < 1800 }">{{ countdown }}</span>
                <span class="sub ml5">（约 {{ expireAt }} 过期）</span>
              </template>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="同步状态">
              <el-tag :type="stateTag" size="small">{{ stateLabel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最近提示">{{ sync.message || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ sync.updatedAt || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="sub mt10">页面每 30 秒自动刷新一次状态；倒计时归零后会话失效，同步会暂停。</div>
        </el-card>
      </el-col>

      <!-- 连接表单 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="mb8">
          <template #header>
            <div class="card-header"><span>{{ loggedIn ? '重新连接 / 断开' : '连接 OSM 账号' }}</span></div>
          </template>
          <el-form ref="loginRef" :model="form" :rules="rules" label-width="90px" :disabled="!canLogin" @submit.prevent>
            <el-form-item label="OSM 邮箱" prop="email">
              <el-input v-model.trim="form.email" placeholder="osmtrade.com 登录邮箱" autocomplete="off" clearable />
            </el-form-item>
            <el-form-item label="登录密码" prop="password">
              <el-input v-model="form.password" type="password" placeholder="只用于本次登录，不会保存" autocomplete="new-password" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-form-item>
              <el-button v-hasPermi="['option:session:login']" type="primary" :loading="logging" @click="handleLogin">{{ loggedIn ? '重新连接' : '连接' }}</el-button>
              <el-button v-if="loggedIn" v-hasPermi="['option:session:login']" type="danger" plain :loading="loggingOut" @click="handleLogout">断开连接</el-button>
            </el-form-item>
          </el-form>
          <el-alert v-if="loginError" type="error" show-icon :closable="true" :title="loginError" @close="loginError = ''" />
          <div v-if="!canLogin" class="sub">你没有「连接 / 断开」权限，只能查看状态。</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="OptionSession">
import { getSessionStatus, loginSession, logoutSession } from "@/api/option/session"
import { checkPermi } from "@/utils/permission"

const { proxy } = getCurrentInstance()

const STATES = { OK: { label: "正常", tag: "success" }, PAUSED: { label: "已暂停", tag: "info" }, ERROR: { label: "出错", tag: "danger" } }

const loaded = ref(false)
const statusLoading = ref(false)
const loggedIn = ref(false)
const remain = ref(0)
const sync = ref({})
const logging = ref(false)
const loggingOut = ref(false)
const loginError = ref("")
const form = ref({ email: "", password: "" })
const rules = {
  email: [{ required: true, message: "请输入 OSM 邮箱", trigger: "blur" }, { type: "email", message: "邮箱格式不正确", trigger: ["blur", "change"] }],
  password: [{ required: true, message: "请输入登录密码", trigger: "blur" }]
}
const canLogin = checkPermi(["option:session:login"])

const stateLabel = computed(() => (STATES[sync.value.state] || {}).label || sync.value.state || "暂无")
const stateTag = computed(() => (STATES[sync.value.state] || {}).tag || "info")
const countdown = computed(() => {
  const s = Math.max(0, remain.value)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${h} 小时 ${String(m).padStart(2, "0")} 分 ${String(sec).padStart(2, "0")} 秒`
})
const expireAt = computed(() => proxy.parseTime(Date.now() + remain.value * 1000, "{m}-{d} {h}:{i}"))

let pollTimer = null
let tickTimer = null

/** 查询状态 */
function getStatus() {
  statusLoading.value = true
  return getSessionStatus().then(res => {
    const d = res.data || {}
    loggedIn.value = !!d.loggedIn
    remain.value = d.loggedIn ? Math.max(0, Number(d.expireSeconds) || 0) : 0
    sync.value = d.sync || {}
    loaded.value = true
  }).finally(() => { statusLoading.value = false })
}

/** 连接 / 重新连接 */
function handleLogin() {
  if (!canLogin || logging.value) return
  proxy.$refs["loginRef"].validate(valid => {
    if (!valid) return
    logging.value = true
    loginError.value = ""
    loginSession({ email: form.value.email, password: form.value.password }).then(res => {
      form.value.password = ""
      const h = Math.round((Number(res.expireSeconds) || 0) / 360) / 10
      proxy.$modal.msgSuccess(`已连接 OSM，会话有效期约 ${h} 小时`)
      getStatus()
    }).catch(err => {
      // request 拦截器已弹出错误提示，这里在表单下方保留一条，便于对照
      loginError.value = (err && err.message && err.message !== "Error" ? err.message : "") || "连接失败，请检查邮箱和密码后重试"
    }).finally(() => { logging.value = false })
  })
}

/** 断开 */
function handleLogout() {
  proxy.$modal.confirm("断开后会员端的数据同步会暂停，直到重新连接。确认断开 OSM 会话？").then(() => {
    loggingOut.value = true
    return logoutSession()
  }).then(() => {
    proxy.$modal.msgSuccess("已断开 OSM 会话")
    getStatus()
  }).catch(() => {}).finally(() => { loggingOut.value = false })
}

onMounted(() => {
  getStatus()
  pollTimer = setInterval(getStatus, 30000)
  tickTimer = setInterval(() => {
    if (!loggedIn.value) return
    if (remain.value > 0) remain.value -= 1
    if (remain.value === 0) getStatus()
  }, 1000)
})
onBeforeUnmount(() => { clearInterval(pollTimer); clearInterval(tickTimer) })
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
.sub { color: var(--el-text-color-secondary); font-size: 12px; }
.mono { font-family: Menlo, Consolas, monospace; font-weight: 600; }
.warn { color: var(--el-color-warning); }
.ml5 { margin-left: 5px; }
</style>
