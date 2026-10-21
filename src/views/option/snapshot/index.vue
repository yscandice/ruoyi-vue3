<template>
  <div class="app-container">
    <el-alert type="warning" show-icon :closable="false" class="mb8">
      <template #title>
        <b>盘中不要手动冻结。</b>盘中强制冻结会把当天记成“已冻结”，当天收盘后的自动冻结就会跳过。收盘冻结点为收盘 +{{ preview.closeBufferMinutes ?? 10 }} 分钟（北京时间夏令时次日 04:10、冬令时次日 05:10）。
      </template>
    </el-alert>

    <el-row :gutter="12">
      <!-- 当前状态 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="mb8">
          <template #header>
            <div class="card-header">
              <span>当前盘后视图</span>
              <el-button link type="primary" icon="Refresh" @click="getStatus">刷新</el-button>
            </div>
          </template>
          <el-descriptions :column="2" border size="small" v-loading="statusLoading">
            <el-descriptions-item label="当前放出">
              <template v-if="release">
                <b>{{ release.tradeDate }}</b> 交易日
                <el-tag v-if="release.staleResources" type="danger" size="small" class="ml5">含过期菜单</el-tag>
              </template>
              <el-text v-else type="warning">尚未放出</el-text>
            </el-descriptions-item>
            <el-descriptions-item label="放出时间">{{ release ? formatBeijing(release.releasedAt) + '（北京）' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近冻结">
              <template v-if="freeze">
                {{ freeze.tradeDate }}
                <el-tag :type="resultTag(freeze.result)" size="small" class="ml5">{{ resultLabel(freeze.result) }}</el-tag>
                <el-tag size="small" type="info" class="ml5">{{ triggerLabel(freeze.triggerType) }}</el-tag>
              </template>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="冻结时间">{{ freeze ? parseTime(freeze.frozenAt) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="冻结过期菜单" :span="2">
              <template v-if="freeze && freeze.staleResources && freeze.staleResources.length">
                <el-tag v-for="code in freeze.staleResources" :key="code" type="danger" size="small" class="mr5">{{ resourceName(code) }}</el-tag>
              </template>
              <span v-else>无</span>
            </el-descriptions-item>
            <el-descriptions-item label="键数" :span="2">
              实时 {{ status.realtimeKeys ?? 0 }} / 盘后 {{ status.delayedKeys ?? 0 }} / 临时 {{ status.tmpKeys ?? 0 }}
            </el-descriptions-item>
          </el-descriptions>
          <el-table :data="status.resources || []" size="small" border class="mt10">
            <el-table-column label="菜单" align="center" width="110">
              <template #default="scope">{{ scope.row.name }}<div class="sub">{{ scope.row.resource }}</div></template>
            </el-table-column>
            <el-table-column label="Redis 前缀" prop="prefix" :show-overflow-tooltip="true" />
            <el-table-column label="实时键数" prop="realtimeKeys" align="center" width="90" />
            <el-table-column label="盘后键数" align="center" width="90">
              <template #default="scope">
                <el-text :type="scope.row.delayedKeys > 0 ? 'success' : 'info'">{{ scope.row.delayedKeys }}</el-text>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 放出时间预览 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="mb8">
          <template #header>
            <div class="card-header"><span>放出时间预览</span></div>
          </template>
          <el-form :inline="true" size="default">
            <el-form-item label="时间点">
              <el-date-picker v-model="previewForm.at" type="datetime" value-format="YYYY-MM-DD HH:mm" format="YYYY-MM-DD HH:mm" placeholder="默认现在" style="width: 190px" clearable />
            </el-form-item>
            <el-form-item label="时区">
              <el-select v-model="previewForm.zone" style="width: 130px">
                <el-option label="美东" value="America/New_York" />
                <el-option label="北京" value="Asia/Shanghai" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="View" @click="getPreview">预览</el-button>
              <el-button icon="Clock" @click="previewNow">现在</el-button>
            </el-form-item>
          </el-form>
          <el-descriptions :column="1" border size="small" v-loading="previewLoading" label-width="150px">
            <el-descriptions-item label="预览时间">
              {{ formatEt(preview.atEt) }}（美东） / {{ shortTime(preview.atBeijing) }}（北京）
              <el-tag :type="preview.tradingDay ? 'success' : 'info'" size="small" class="ml5">{{ preview.tradingDay ? '交易日' : '非交易日' }}</el-tag>
              <el-tag v-if="preview.marketOpen" type="warning" size="small" class="ml5">盘中</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="盘后版看到">
              <b v-if="preview.dataTradeDate">{{ preview.dataTradeDate }}（{{ weekday(preview.dataTradeDate) }}）交易日数据</b>
              <el-text v-else type="warning">尚无可放出的数据</el-text>
            </el-descriptions-item>
            <el-descriptions-item label="数据截止">{{ formatEt(preview.dataAsOf) }}（美东） / {{ shortTime(preview.dataAsOfBeijing) }}（北京）</el-descriptions-item>
            <el-descriptions-item label="这份数据放出于">
              {{ formatEt(preview.releasedAt) }}（美东，{{ weekday(preview.releasedAt) }}） / {{ shortTime(preview.releasedAtBeijing) }}（北京）
            </el-descriptions-item>
            <el-descriptions-item label="下次放出">
              <b>{{ preview.nextDataTradeDate || '-' }}</b> 数据，{{ formatEt(preview.nextReleaseAt) }}（美东，{{ weekday(preview.nextReleaseAt) }}） / <b>{{ shortTime(preview.nextReleaseAtBeijing) }}</b>（北京）
            </el-descriptions-item>
            <el-descriptions-item label="规则">滞后 {{ preview.lagSessions ?? '-' }} 个交易日，收盘后 {{ preview.closeBufferMinutes ?? '-' }} 分钟放出</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <!-- 冻结记录 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 140px">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="结果" prop="result">
        <el-select v-model="queryParams.result" placeholder="结果" clearable style="width: 140px">
          <el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="触发方式" prop="triggerType">
        <el-select v-model="queryParams.triggerType" placeholder="触发方式" clearable style="width: 140px">
          <el-option v-for="item in triggerOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Lock" @click="openFreeze" v-hasPermi="['option:access:edit']">手动冻结</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="refreshAll"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="snapshotList">
      <el-table-column label="交易日" align="center" prop="tradeDate" width="110" />
      <el-table-column label="收盘冻结点" align="center" width="170">
        <template #default="scope">
          <div>{{ shortTime(scope.row.cutoffEt) }} <span class="sub">美东</span></div>
          <div>{{ shortTime(scope.row.cutoffTime) }} <span class="sub">北京</span></div>
        </template>
      </el-table-column>
      <el-table-column label="结果" align="center" width="80">
        <template #default="scope">
          <el-tag :type="resultTag(scope.row.result)" size="small">{{ resultLabel(scope.row.result) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.status === 'RELEASED' ? 'success' : 'info'" size="small">{{ statusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="菜单 / 键数" align="center" width="100">
        <template #default="scope">{{ scope.row.resourceCount }} / {{ scope.row.keyCount }}</template>
      </el-table-column>
      <el-table-column label="大小" align="center" width="90">
        <template #default="scope">{{ formatBytes(scope.row.totalBytes) }}</template>
      </el-table-column>
      <el-table-column label="过期菜单" align="left" min-width="180">
        <template #default="scope">
          <template v-if="scope.row.staleResources">
            <el-tag v-for="code in splitCodes(scope.row.staleResources)" :key="code" type="danger" effect="dark" size="small" class="mr5 mb5">{{ resourceName(code) }}</el-tag>
          </template>
          <span v-else class="sub">无</span>
        </template>
      </el-table-column>
      <el-table-column label="触发" align="center" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.triggerType === 'MANUAL' ? 'warning' : 'primary'" size="small">{{ triggerLabel(scope.row.triggerType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="放出时间" align="center" width="160">
        <template #default="scope">{{ parseTime(scope.row.releasedAt) || '-' }}</template>
      </el-table-column>
      <el-table-column label="耗时" align="center" width="80">
        <template #default="scope">{{ scope.row.costMs ?? '-' }} ms</template>
      </el-table-column>
      <el-table-column label="说明" prop="message" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" width="190" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleDetail(scope.row)">详情</el-button>
          <el-button link type="primary" icon="Promotion" v-if="scope.row.status !== 'RELEASED'" @click="handleRelease(scope.row)" v-hasPermi="['option:access:edit']">放出</el-button>
          <el-button link type="primary" icon="RefreshRight" @click="handleRestore(scope.row)" v-hasPermi="['option:access:edit']">回填</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 手动冻结 -->
    <el-dialog title="手动冻结当天" v-model="freezeOpen" width="520px" append-to-body>
      <el-alert type="error" show-icon :closable="false" title="盘中不要手动冻结" description="盘中强制冻结会把当天记成“已冻结”，当天收盘后的自动冻结就会跳过。一般只在收盘冻结点之后、自动冻结失败时使用。" />
      <el-form label-width="90px" class="mt10">
        <el-form-item label="强制冻结">
          <el-checkbox v-model="freezeForce">未到收盘冻结点或当天已冻结时仍然冻结</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="danger" :loading="freezing" @click="submitFreeze">确认冻结</el-button>
          <el-button @click="freezeOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog title="冻结记录详情" v-model="detailOpen" width="760px" append-to-body>
      <el-descriptions :column="2" border size="small" v-loading="detailLoading">
        <el-descriptions-item label="记录ID">{{ detail.snapshot.snapshotId }}</el-descriptions-item>
        <el-descriptions-item label="交易日">{{ detail.snapshot.tradeDate }}</el-descriptions-item>
        <el-descriptions-item label="冻结点（美东）">{{ detail.snapshot.cutoffEt }}</el-descriptions-item>
        <el-descriptions-item label="冻结点（北京）">{{ detail.snapshot.cutoffTime }}</el-descriptions-item>
        <el-descriptions-item label="结果"><el-tag :type="resultTag(detail.snapshot.result)" size="small">{{ resultLabel(detail.snapshot.result) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.snapshot.status) }}</el-descriptions-item>
        <el-descriptions-item label="触发方式">{{ triggerLabel(detail.snapshot.triggerType) }}</el-descriptions-item>
        <el-descriptions-item label="放出时间">{{ parseTime(detail.snapshot.releasedAt) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="菜单 / 键数">{{ detail.snapshot.resourceCount }} / {{ detail.snapshot.keyCount }}</el-descriptions-item>
        <el-descriptions-item label="大小 / 耗时">{{ formatBytes(detail.snapshot.totalBytes) }} / {{ detail.snapshot.costMs }} ms</el-descriptions-item>
        <el-descriptions-item label="过期菜单" :span="2">
          <el-tag v-for="code in splitCodes(detail.snapshot.staleResources)" :key="code" type="danger" size="small" class="mr5">{{ resourceName(code) }}</el-tag>
          <span v-if="!detail.snapshot.staleResources">无</span>
        </el-descriptions-item>
        <el-descriptions-item label="同步来源" :span="2"><span class="mono">{{ detail.snapshot.sourceSync || '-' }}</span></el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{ detail.snapshot.message || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="detail.resources" size="small" border class="mt10">
        <el-table-column label="菜单" align="center">
          <template #default="scope">{{ resourceName(scope.row.resourceCode) }}（{{ scope.row.resourceCode }}）</template>
        </el-table-column>
        <el-table-column label="键数" prop="keyCount" align="center" />
        <el-table-column label="存储大小" align="center">
          <template #default="scope">{{ formatBytes(scope.row.storedBytes) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="OptionSnapshot">
import { listSnapshot, getSnapshotStatus, getSnapshot, freezeSnapshot, releaseSnapshot, restoreSnapshot, previewRelease } from "@/api/option/access"
import { formatBeijing } from "@/utils/option"

const { proxy } = getCurrentInstance()

const statusOptions = [{ value: "FROZEN", label: "已冻结" }, { value: "RELEASED", label: "已放出" }]
const resultOptions = [{ value: "SUCCESS", label: "成功", tag: "success" }, { value: "PARTIAL", label: "部分", tag: "warning" }, { value: "FAILED", label: "失败", tag: "danger" }]
const triggerOptions = [{ value: "JOB", label: "定时" }, { value: "MANUAL", label: "手动" }]
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

const snapshotList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const status = ref({})
const statusLoading = ref(false)
const preview = ref({})
const previewLoading = ref(false)
const previewForm = ref({ at: undefined, zone: "America/New_York" })
const freezeOpen = ref(false)
const freezeForce = ref(false)
const freezing = ref(false)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref({ snapshot: {}, resources: [] })

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, status: undefined, result: undefined, triggerType: undefined }
})
const { queryParams } = toRefs(data)

const release = computed(() => status.value.releaseCurrent)
const freeze = computed(() => status.value.freezeStatus)
const resourceNames = computed(() => {
  const map = {}
  ;(status.value.resources || []).forEach(r => { map[r.resource] = r.name })
  return map
})

function resourceName(code) { return resourceNames.value[code] || code }
function splitCodes(value) { return value ? String(value).split(",").filter(Boolean) : [] }
function resultLabel(v) { const o = resultOptions.find(i => i.value === v); return o ? o.label : (v || "-") }
function resultTag(v) { const o = resultOptions.find(i => i.value === v); return o ? o.tag : "info" }
function statusLabel(v) { const o = statusOptions.find(i => i.value === v); return o ? o.label : (v || "-") }
function triggerLabel(v) { const o = triggerOptions.find(i => i.value === v); return o ? o.label : (v || "-") }
function formatBytes(n) {
  if (n === null || n === undefined) return "-"
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / 1024 / 1024).toFixed(2) + " MB"
}
/** "2026-10-20 16:10:00" → "2026-10-20 16:10" */
function shortTime(v) { return v ? String(v).replace("T", " ").slice(0, 16) : "-" }
/** ISO 带偏移 → 按其自身偏移显示（美东） */
function formatEt(v) { return v ? String(v).replace("T", " ").slice(0, 16) : "-" }
/** 取 ISO / 日期字符串的星期（按字符串本身的日期，不做时区换算） */
function weekday(v) {
  if (!v) return ""
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ""
  return WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]
}

/** 冻结记录列表 */
function getList() {
  loading.value = true
  listSnapshot(queryParams.value).then(res => {
    snapshotList.value = res.rows
    total.value = res.total
  }).finally(() => {
    loading.value = false
  })
}

/** 当前状态 */
function getStatus() {
  statusLoading.value = true
  getSnapshotStatus().then(res => {
    status.value = res.data || {}
  }).finally(() => {
    statusLoading.value = false
  })
}

/** 放出时间预览 */
function getPreview() {
  previewLoading.value = true
  const query = previewForm.value.at ? { at: previewForm.value.at, zone: previewForm.value.zone } : {}
  previewRelease(query).then(res => {
    preview.value = res.data || {}
  }).finally(() => {
    previewLoading.value = false
  })
}

function previewNow() {
  previewForm.value.at = undefined
  getPreview()
}

function refreshAll() {
  getList()
  getStatus()
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 手动冻结 */
function openFreeze() {
  freezeForce.value = false
  freezeOpen.value = true
}

function submitFreeze() {
  freezing.value = true
  freezeSnapshot(freezeForce.value).then(res => {
    const d = res.data || {}
    const stale = d.staleResources && d.staleResources.length ? "，过期菜单：" + d.staleResources.map(resourceName).join("、") : ""
    proxy.$modal.msgSuccess("已冻结 " + d.tradeDate + "（" + resultLabel(d.result) + "，" + d.keyCount + " 个键" + stale + "）")
    freezeOpen.value = false
    refreshAll()
  }).catch(() => {}).finally(() => {
    freezing.value = false
  })
}

/** 手动放出 */
function handleRelease(row) {
  proxy.$modal.confirm("确认放出 " + row.tradeDate + " 的冻结数据吗？放出后盘后版用户会立即看到这一天的数据。").then(() => {
    return releaseSnapshot(row.snapshotId)
  }).then(res => {
    const d = res.data || {}
    proxy.$modal.msgSuccess("已放出 " + d.tradeDate + "（" + d.keyCount + " 个键，耗时 " + d.costMs + " ms）")
    refreshAll()
  }).catch(() => {})
}

/** 回填 Redis */
function handleRestore(row) {
  proxy.$modal.confirm("确认用 " + row.tradeDate + " 的冻结记录重建盘后视图吗？一般只在 Redis 被清空后使用。").then(() => {
    return restoreSnapshot(row.snapshotId)
  }).then(() => {
    proxy.$modal.msgSuccess("回填成功")
    refreshAll()
  }).catch(() => {})
}

/** 详情 */
function handleDetail(row) {
  detail.value = { snapshot: { ...row }, resources: [] }
  detailOpen.value = true
  detailLoading.value = true
  getSnapshot(row.snapshotId).then(res => {
    detail.value = { snapshot: res.data.snapshot || row, resources: res.data.resources || [] }
  }).finally(() => {
    detailLoading.value = false
  })
}

refreshAll()
getPreview()
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
.sub { color: var(--el-text-color-secondary); font-size: 12px; }
.mono { font-family: Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.mr5 { margin-right: 5px; }
.mb5 { margin-bottom: 5px; }
.ml5 { margin-left: 5px; }
</style>
