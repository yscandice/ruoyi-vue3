<template>
  <div class="app-container">
    <!-- 统计卡 -->
    <el-row :gutter="12" class="mb8 stats-row">
      <el-col :xs="12" :sm="8" :lg="3" v-for="card in statCards" :key="card.key">
        <el-card shadow="never" class="stat-card" :body-style="{ padding: '12px 16px' }">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :class="card.cls">{{ stats[card.key] ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :lg="6">
        <el-card shadow="never" class="stat-card" :body-style="{ padding: '8px 12px' }">
          <div class="stat-label">近 7 天注册</div>
          <div ref="chartRef" class="daily-chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="queryParams.email" placeholder="请输入邮箱" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="身份" prop="level">
        <el-select v-model="queryParams.level" placeholder="会员身份" clearable style="width: 140px">
          <el-option v-for="dict in option_member_level" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="会员状态" clearable style="width: 140px">
          <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="注册IP" prop="registerIp">
        <el-input v-model="queryParams.registerIp" placeholder="请输入注册IP" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="注册时间" style="width: 308px">
        <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
      </el-form-item>
      <el-form-item label="体验到期" style="width: 308px">
        <el-date-picker v-model="trialRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Timer" :disabled="multiple" @click="handleBatchTrial" v-hasPermi="['option:member:edit']">批量调整体验</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['option:member:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="refresh" :columns="columns" storageKey="option-member-columns"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="memberList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="邮箱" align="left" key="email" v-if="columns.email.visible" min-width="200" :show-overflow-tooltip="true">
        <template #default="scope">
          <a v-if="checkPermi(['option:member:query'])" class="link-type" style="cursor:pointer" @click="handleDetail(scope.row)">{{ scope.row.email }}</a>
          <span v-else>{{ scope.row.email }}</span>
        </template>
      </el-table-column>
      <el-table-column label="昵称" align="center" key="nickName" prop="nickName" v-if="columns.nickName.visible" :show-overflow-tooltip="true" />
      <el-table-column label="身份" align="center" key="level" v-if="columns.level.visible" width="90">
        <template #default="scope">
          <dict-tag :options="option_member_level" :value="scope.row.level" />
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" key="status" v-if="columns.status.visible" width="80">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="注册时间" align="center" key="registerTime" prop="registerTime" v-if="columns.registerTime.visible" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.registerTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="体验到期" align="center" key="trialEndTime" v-if="columns.trialEndTime.visible" width="170">
        <template #default="scope">
          <div>{{ parseTime(scope.row.trialEndTime) }}</div>
          <el-text v-if="scope.row.trialRemainingSeconds > 0" type="primary" size="small">剩 {{ formatRemaining(scope.row.trialRemainingSeconds) }}</el-text>
          <el-text v-else type="info" size="small">已到期</el-text>
        </template>
      </el-table-column>
      <el-table-column label="付费到期" align="center" key="paidUntil" v-if="columns.paidUntil.visible" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.paidUntil) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近访问" align="center" key="lastAccessTime" v-if="columns.lastAccessTime.visible" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.lastAccessTime) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="在线" align="center" key="online" v-if="columns.online.visible" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.online ? 'success' : 'info'" size="small">{{ scope.row.online ? '在线' : '离线' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册IP" align="center" key="registerIp" prop="registerIp" v-if="columns.registerIp.visible" width="130" />
      <el-table-column label="操作" align="center" width="210" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)" v-hasPermi="['option:member:query']">详情</el-button>
          <el-button link type="primary" icon="Timer" @click="handleTrial(scope.row)" v-hasPermi="['option:member:edit']">体验期</el-button>
          <el-dropdown v-if="hasMoreAction" class="ml10" @command="(command) => handleCommand(command, scope.row)">
            <el-button link type="primary" icon="DArrowRight">更多</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="paid" icon="Medal" v-if="checkPermi(['option:member:edit'])">设置付费</el-dropdown-item>
                <el-dropdown-item command="status" :icon="scope.row.status === '0' ? 'CircleClose' : 'CircleCheck'" v-if="checkPermi(['option:member:edit'])">{{ scope.row.status === '0' ? '停用' : '启用' }}</el-dropdown-item>
                <el-dropdown-item command="resetPwd" icon="Key" v-if="checkPermi(['option:member:resetPwd'])">重置密码</el-dropdown-item>
                <el-dropdown-item command="online" icon="SwitchButton" v-if="checkPermi(['option:member:forceLogout'])">强制下线</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <member-detail ref="detailRef">
      <template #actions="{ member }">
        <el-button type="primary" plain size="small" icon="Timer" @click="handleTrial(member)" v-hasPermi="['option:member:edit']">调整体验期</el-button>
        <el-button type="warning" plain size="small" icon="Medal" @click="handleCommand('paid', member)" v-hasPermi="['option:member:edit']">设置付费</el-button>
        <el-button :type="member.status === '0' ? 'danger' : 'success'" plain size="small" :icon="member.status === '0' ? 'CircleClose' : 'CircleCheck'" @click="handleCommand('status', member)" v-hasPermi="['option:member:edit']">{{ member.status === '0' ? '停用' : '启用' }}</el-button>
        <el-button plain size="small" icon="Key" @click="handleCommand('resetPwd', member)" v-hasPermi="['option:member:resetPwd']">重置密码</el-button>
        <el-button plain size="small" icon="SwitchButton" @click="handleCommand('online', member)" v-hasPermi="['option:member:forceLogout']">强制下线</el-button>
      </template>
    </member-detail>
    <trial-dialog ref="trialDialogRef" @success="handleChanged" />
    <paid-dialog ref="paidDialogRef" @success="handleChanged" />
  </div>
</template>

<script setup name="OptionMember">
import * as echarts from "echarts"
import { listMember, getMemberStats, changeMemberStatus, resetMemberPwd, forceLogoutMember } from "@/api/option/member"
import { checkPermi } from "@/utils/permission"
import { formatRemaining, MEMBER_PWD_PATTERN, MEMBER_PWD_MESSAGE } from "@/utils/option"
import TrialDialog from "./trialDialog"
import MemberDetail from "./detail"
import PaidDialog from "./paidDialog"


const { proxy } = getCurrentInstance()
const { option_member_level, sys_normal_disable } = proxy.useDict("option_member_level", "sys_normal_disable")

const memberList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const selection = ref([])
const multiple = ref(true)
const total = ref(0)
const dateRange = ref([])
const trialRange = ref([])
const stats = ref({})
const chartRef = ref(null)
const hasMoreAction = checkPermi(["option:member:edit"]) || checkPermi(["option:member:resetPwd"]) || checkPermi(["option:member:forceLogout"])
let chart = null

const statCards = [
  { key: "total", label: "会员总数" },
  { key: "today", label: "今日新注册", cls: "c-primary" },
  { key: "trial", label: "体验期中", cls: "c-primary" },
  { key: "delayed", label: "盘后版", cls: "c-warning" },
  { key: "paid", label: "付费", cls: "c-success" },
  { key: "disabled", label: "停用", cls: "c-danger" }
]

// 列显隐信息
const columns = ref({
  email: { label: "邮箱", visible: true },
  nickName: { label: "昵称", visible: true },
  level: { label: "身份", visible: true },
  status: { label: "状态", visible: true },
  registerTime: { label: "注册时间", visible: true },
  trialEndTime: { label: "体验到期", visible: true },
  paidUntil: { label: "付费到期", visible: true },
  lastAccessTime: { label: "最近访问", visible: true },
  online: { label: "在线", visible: true },
  registerIp: { label: "注册IP", visible: true }
})

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    email: undefined,
    level: undefined,
    status: undefined,
    registerIp: undefined
  }
})

const { queryParams } = toRefs(data)

/** 组装查询参数（注册时间 + 体验到期两个范围） */
function buildQuery() {
  const query = proxy.addDateRange({ ...queryParams.value, params: {} }, dateRange.value)
  return proxy.addDateRange(query, trialRange.value, "TrialTime")
}

/** 查询会员列表 */
function getList() {
  loading.value = true
  listMember(buildQuery()).then(res => {
    memberList.value = res.rows
    total.value = res.total
  }).finally(() => {
    loading.value = false
  })
}

/** 查询统计 */
function getStats() {
  getMemberStats().then(res => {
    stats.value = res.data || {}
    renderChart(stats.value.daily || [])
  })
}

/** 近 7 天柱状图 */
function renderChart(daily) {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    grid: { left: 8, right: 8, top: 14, bottom: 18 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: daily.map(d => String(d.day).slice(5)), axisTick: { show: false }, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", minInterval: 1, show: false },
    series: [{ type: "bar", data: daily.map(d => d.count), barWidth: "50%", itemStyle: { color: "#409EFF" }, label: { show: true, position: "top", fontSize: 10 } }]
  })
}

function refresh() {
  getList()
  getStats()
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  trialRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(rows) {
  selection.value = rows
  multiple.value = !rows.length
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("option/member/export", {
    ...buildQuery()
  }, `member_${new Date().getTime()}.xlsx`)
}

/** 批量调整体验期 */
function handleBatchTrial() {
  proxy.$refs["trialDialogRef"].open(selection.value)
}

/** 会员详情 */
function handleDetail(row) {
  proxy.$refs["detailRef"].open(row.userId)
}

/** 单个调整体验期 */
function handleTrial(row) {
  proxy.$refs["trialDialogRef"].open(row)
}

/** 操作完成：刷新列表、统计和已打开的详情 */
function handleChanged() {
  refresh()
  const detail = proxy.$refs["detailRef"]
  detail && detail.refresh()
}

/** 更多操作 */
function handleCommand(command, row) {
  switch (command) {
    case "paid":
      proxy.$refs["paidDialogRef"].open(row)
      break
    case "status":
      handleStatus(row)
      break
    case "resetPwd":
      handleResetPwd(row)
      break
    case "online":
      handleForceLogout(row)
      break
    default:
      break
  }
}

/** 停用 / 启用 */
function handleStatus(row) {
  const disable = row.status === "0"
  const text = disable ? "停用" : "启用"
  const tip = disable ? '确认要停用"' + row.email + '"吗？停用后会员会立即下线，且无法再登录。' : '确认要启用"' + row.email + '"吗？'
  proxy.$modal.confirm(tip).then(() => {
    return changeMemberStatus(row.userId, disable ? "1" : "0")
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
    handleChanged()
  }).catch(() => {})
}

/** 重置密码 */
function handleResetPwd(row) {
  proxy.$prompt('请输入"' + row.email + '"的新密码', "重置密码", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    inputType: "password",
    inputPlaceholder: "8–20 位，同时包含字母和数字",
    inputValidator: value => MEMBER_PWD_PATTERN.test(value || "") || MEMBER_PWD_MESSAGE
  }).then(({ value }) => {
    return proxy.$modal.confirm("重置后会员的所有登录会立即失效，需要用新密码重新登录，确认重置吗？").then(() => value)
  }).then(value => {
    return resetMemberPwd(row.userId, value)
  }).then(() => {
    proxy.$modal.msgSuccess("重置成功，会员需用新密码重新登录")
    handleChanged()
  }).catch(() => {})
}

/** 强制下线 */
function handleForceLogout(row) {
  proxy.$modal.confirm('确认要强制"' + row.email + '"下线吗？').then(() => {
    return forceLogoutMember(row.userId)
  }).then(res => {
    proxy.$modal.msgSuccess("已强制下线 " + (res.count ?? 0) + " 个会话")
    handleChanged()
  }).catch(() => {})
}

function resizeChart() {
  chart && chart.resize()
}

onMounted(() => {
  window.addEventListener("resize", resizeChart)
})
onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart)
  chart && chart.dispose()
  chart = null
})

refresh()
</script>

<style scoped>
.stat-card { height: 100px; margin-bottom: 8px; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); }
.stat-value { font-size: 26px; font-weight: 600; margin-top: 8px; }
.c-primary { color: var(--el-color-primary); }
.c-warning { color: var(--el-color-warning); }
.c-success { color: var(--el-color-success); }
.c-danger { color: var(--el-color-danger); }
.daily-chart { height: 76px; width: 100%; }
@media (max-width: 1200px) { .stats-row .el-col { margin-bottom: 12px; } }
</style>
