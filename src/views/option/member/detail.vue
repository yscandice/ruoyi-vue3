<template>
  <el-drawer v-model="visible" :title="'会员详情 - ' + (user.email || '')" size="760px" append-to-body destroy-on-close>
    <div v-loading="loading" class="member-detail">
      <div class="detail-actions" v-if="user.userId">
        <slot name="actions" :member="actionRow"></slot>
      </div>

      <el-descriptions title="基本信息" :column="2" border size="small">
        <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ user.nickName }}</el-descriptions-item>
        <el-descriptions-item label="头像">
          <el-avatar v-if="user.avatar" :size="28" :src="avatarUrl" />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="部门">{{ user.deptName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ parseTime(member.registerTime) }}</el-descriptions-item>
        <el-descriptions-item label="注册IP">{{ member.registerIp || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备指纹">{{ member.deviceHash || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态"><dict-tag :options="sys_normal_disable" :value="member.status" /></el-descriptions-item>
        <el-descriptions-item label="最后登录IP">{{ user.loginIp || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最后登录时间">{{ parseTime(user.loginDate) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近访问">{{ parseTime(member.lastAccessTime) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="在线会话">
          <el-tag :type="sessions > 0 ? 'success' : 'info'" size="small">{{ sessions > 0 ? sessions + ' 个在线' : '离线' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="身份" :column="2" border size="small" class="mt20">
        <el-descriptions-item label="当前身份"><dict-tag :options="option_member_level" :value="access.level" /></el-descriptions-item>
        <el-descriptions-item label="数据视图">
          <el-tag :type="access.view === 'REALTIME' ? 'success' : 'warning'" size="small">{{ access.view === 'REALTIME' ? '实时' : '盘后' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="体验到期">
          {{ parseTime(member.trialEndTime) || '-' }}
          <el-text v-if="access.trialRemainingSeconds > 0" type="primary" size="small">（剩 {{ formatRemaining(access.trialRemainingSeconds) }}）</el-text>
          <el-text v-else type="info" size="small">（已到期）</el-text>
        </el-descriptions-item>
        <el-descriptions-item label="累计调整">{{ member.trialExtendHours || 0 }} 小时</el-descriptions-item>
        <el-descriptions-item label="付费到期">{{ parseTime(member.paidUntil) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最近备注">{{ member.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="当前数据" :span="2">
          <span v-if="access.view === 'REALTIME'">实时数据</span>
          <span v-else-if="access.dataTradeDate">
            盘后：{{ access.dataTradeDate }} 交易日数据，下次更新 {{ formatBeijing(access.nextReleaseAt) }}（北京时间）
          </span>
          <span v-else>盘后数据尚未放出，预计 {{ formatBeijing(access.nextReleaseAt) }}（北京时间）更新</span>
          <el-tag v-if="access.stale" type="danger" size="small" class="ml10">同步延迟</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="设置（只读）" :column="2" border size="small" class="mt20" label-width="90px">
        <el-descriptions-item label="显示名称">{{ profile.displayName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="强提醒">{{ profile.strongAlerts ? '开' : '关' }}</el-descriptions-item>
        <el-descriptions-item label="关注标的" :span="2">
          <template v-if="profile.watchSymbols && profile.watchSymbols.length">
            <el-tag v-for="s in profile.watchSymbols" :key="s" size="small" class="mr5">{{ s }}</el-tag>
          </template>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="策略偏好" :span="2">
          <el-tag v-for="item in strategyItems" :key="item.key" :type="item.on ? 'success' : 'info'" size="small" class="mr5">{{ item.label }}：{{ item.on ? '开' : '关' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="通知开关" :span="2">
          <el-tag v-for="item in notifyItems" :key="item.key" :type="item.on ? 'success' : 'info'" size="small" class="mr5 mb5">{{ item.label }}：{{ item.on ? '开' : '关' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新阅读" :span="2">
          已读到 {{ updates.seenSeq ?? 0 }} / 最新 {{ updates.currentSeq ?? '-' }}，未读 {{ updates.unseen ?? 0 }}
          <span v-if="updates.seenAt">（{{ formatBeijing(updates.seenAt) }}）</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="section-title mt20">最近登录</div>
      <el-table :data="recentLogins" size="small" border>
        <el-table-column label="时间" align="center" width="160">
          <template #default="scope">{{ parseTime(scope.row.loginTime) }}</template>
        </el-table-column>
        <el-table-column label="IP" prop="ipaddr" align="center" width="130" />
        <el-table-column label="结果" align="center" width="80">
          <template #default="scope"><dict-tag :options="sys_common_status" :value="scope.row.status" /></template>
        </el-table-column>
        <el-table-column label="信息" prop="msg" :show-overflow-tooltip="true" />
        <el-table-column label="浏览器" prop="browser" :show-overflow-tooltip="true" width="120" />
      </el-table>

      <template v-if="canViewOperlog">
        <div class="section-title mt20">后台操作记录</div>
        <el-table :data="operLogs" size="small" border>
          <el-table-column label="时间" align="center" width="160">
            <template #default="scope">{{ parseTime(scope.row.operTime) }}</template>
          </el-table-column>
          <el-table-column label="操作人" prop="operName" align="center" width="90" />
          <el-table-column label="操作" :show-overflow-tooltip="true">
            <template #default="scope">{{ describeOper(scope.row) }}</template>
          </el-table-column>
          <el-table-column label="结果" align="center" width="80">
            <template #default="scope"><dict-tag :options="sys_common_status" :value="scope.row.status" /></template>
          </el-table-column>
        </el-table>
      </template>
    </div>
  </el-drawer>
</template>

<script setup name="MemberDetail">
import { getMember } from "@/api/option/member"
import { list as listOperlog } from "@/api/monitor/operlog"
import auth from "@/plugins/auth"
import { parseTime } from "@/utils/ruoyi"

const { proxy } = getCurrentInstance()
const { option_member_level, sys_normal_disable, sys_common_status } = proxy.useDict("option_member_level", "sys_normal_disable", "sys_common_status")

const NOTIFY_LABELS = {
  new_signal: "新信号",
  protection_window: "保护窗口",
  take_profit_window: "止盈窗口",
  settlement: "结算",
  weekly_scorecard: "每周战绩",
  product_update: "产品更新",
  silent_reminder: "静默提醒",
  management_stop: "动态管理止损",
  manage_adopted_only: "只提醒已采纳的信号"
}
const STRATEGY_LABELS = { seller: "卖方", midterm: "中期", buyer: "买方" }
const OPER_ACTIONS = { trial: "调整体验期", paid: "设置付费", status: "停用 / 启用", resetPwd: "重置密码", online: "强制下线" }

const visible = ref(false)
const loading = ref(false)
const userId = ref(null)
const detail = ref({})
const operLogs = ref([])
const canViewOperlog = auth.hasPermi("monitor:operlog:list")

const user = computed(() => detail.value.user || {})
const member = computed(() => detail.value.member || {})
const access = computed(() => detail.value.access || {})
const sessions = computed(() => detail.value.sessions || 0)
const recentLogins = computed(() => detail.value.recentLogins || [])
const profile = computed(() => (detail.value.settings || {}).profile || {})
const updates = computed(() => (detail.value.settings || {}).updates || {})
const notifyItems = computed(() => {
  const prefs = ((detail.value.settings || {}).notifications || {}).prefs || {}
  return Object.keys(NOTIFY_LABELS).map(key => ({ key, label: NOTIFY_LABELS[key], on: !!prefs[key] }))
})
const strategyItems = computed(() => {
  const prefs = profile.value.strategyPreferences || {}
  return Object.keys(STRATEGY_LABELS).map(key => ({ key, label: STRATEGY_LABELS[key], on: !!prefs[key] }))
})
const avatarUrl = computed(() => {
  const a = user.value.avatar
  if (!a) return ""
  return /^https?:/.test(a) ? a : import.meta.env.VITE_APP_BASE_API + a
})
// 给操作按钮用的行数据（与列表字段一致）
const actionRow = computed(() => ({
  userId: user.value.userId,
  email: user.value.email,
  nickName: user.value.nickName,
  level: access.value.level,
  status: member.value.status,
  trialEndTime: member.value.trialEndTime,
  paidUntil: member.value.paidUntil,
  online: sessions.value > 0
}))

/** 体验剩余时长 */
function formatRemaining(seconds) {
  if (seconds >= 3600) return "约 " + Math.round(seconds / 3600) + " 小时"
  return Math.max(1, Math.floor(seconds / 60)) + " 分钟"
}

/** ISO 时间转北京时间显示 */
function formatBeijing(value) {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d).replace(/\//g, "-")
}

function describeOper(row) {
  const m = String(row.operUrl || "").match(/\/option\/member\/(?:\d+\/)?([A-Za-z]+)(?:\?|$)/)
  const action = /\/trial\/batch/.test(String(row.operUrl || "")) ? "批量调整体验期" : (m ? OPER_ACTIONS[m[1]] : "")
  let extra = ""
  try {
    const raw = String(row.operParam || "")
    const p = raw.indexOf("{") >= 0 ? JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) : {}
    if (p.extendHours !== undefined) extra = (p.extendHours > 0 ? "+" : "") + p.extendHours + " 小时"
    else if ("paidUntil" in p) extra = p.paidUntil ? "至 " + p.paidUntil : "取消付费"
    else if (p.status !== undefined) extra = p.status === "1" ? "停用" : "启用"
    if (p.remark) extra += "（" + p.remark + "）"
  } catch (e) {}
  return [action || row.title, extra].filter(Boolean).join(" ")
}

function loadOperLogs() {
  if (!canViewOperlog) return
  const id = userId.value
  listOperlog({ pageNum: 1, pageSize: 50, title: "会员管理" }).then(res => {
    const re = new RegExp("/option/member/" + id + "(/|$)")
    operLogs.value = (res.rows || []).filter(row => re.test(String(row.operUrl || "")) ||
      (/\/trial\/batch/.test(String(row.operUrl || "")) && new RegExp("[\\[,]" + id + "[\\],]").test(String(row.operParam || "")))).slice(0, 20)
  })
}

/** 加载 / 刷新详情 */
function load() {
  if (!userId.value) return
  loading.value = true
  getMember(userId.value).then(res => {
    detail.value = res.data || {}
  }).finally(() => {
    loading.value = false
  })
  loadOperLogs()
}

function open(id) {
  userId.value = id
  detail.value = {}
  operLogs.value = []
  visible.value = true
  load()
}

defineExpose({ open, refresh: load })
</script>

<style scoped>
.member-detail { padding: 0 4px 16px; }
.detail-actions { margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--el-text-color-primary); margin-bottom: 12px; }
.mr5 { margin-right: 5px; }
.mb5 { margin-bottom: 5px; }
</style>
