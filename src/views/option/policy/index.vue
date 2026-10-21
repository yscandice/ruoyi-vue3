<template>
  <div class="app-container">
    <el-alert type="info" show-icon :closable="false" class="mb8">
      <template #title>
        每个会员菜单对应一组接口路径，按身份决定返回哪种数据：<b>实时身份</b>（体验期 / 付费）、<b>盘后版</b>（体验到期未付费）。保存后立即生效；
        停用某条策略后，该菜单路径对盘后版默认按“盘后数据”处理。菜单编码是冻结数据的归属，不能修改。
      </template>
    </el-alert>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="菜单策略" name="policy">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item label="菜单" prop="resourceCode">
            <el-input v-model="queryParams.resourceCode" placeholder="菜单编码，如 today" clearable style="width: 160px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['option:access:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Delete" @click="handleClearCache" v-hasPermi="['option:access:edit']">清身份缓存</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="policyList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="排序" align="center" prop="orderNum" width="60" />
          <el-table-column label="菜单" align="center" width="110">
            <template #default="scope">
              <div>{{ scope.row.resourceName }}</div>
              <div class="text-muted">{{ scope.row.resourceCode }}</div>
            </template>
          </el-table-column>
          <el-table-column label="接口路径" align="left" min-width="260">
            <template #default="scope">
              <div v-for="p in splitList(scope.row.pathPattern)" :key="p" class="path-line">{{ p }}</div>
            </template>
          </el-table-column>
          <el-table-column label="Redis 前缀" align="left" min-width="160">
            <template #default="scope">
              <div v-for="p in splitList(scope.row.redisPrefix)" :key="p" class="path-line">{{ p }}</div>
              <span v-if="!scope.row.redisPrefix" class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="实时身份视图" align="center" width="120">
            <template #default="scope">
              <el-tag :type="modeTag(scope.row.realtimeMode)">{{ modeLabel(scope.row.realtimeMode) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="盘后版视图" align="center" width="120">
            <template #default="scope">
              <el-tag :type="modeTag(scope.row.delayedMode)">{{ modeLabel(scope.row.delayedMode) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center" width="80">
            <template #default="scope">
              <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column label="备注" align="left" prop="remark" min-width="180" :show-overflow-tooltip="true" />
          <el-table-column label="更新" align="center" width="170">
            <template #default="scope">
              <div>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</div>
              <div class="text-muted">{{ scope.row.updateBy || scope.row.createBy }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="90" class-name="small-padding fixed-width" v-if="checkPermi(['option:access:edit'])">
            <template #default="scope">
              <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 10" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </el-tab-pane>

      <el-tab-pane label="路径核对" name="check">
        <el-row :gutter="10" class="mb8" align="middle">
          <el-col :span="1.5">
            <el-tag size="large" type="info">共 {{ check.total ?? '-' }} 条</el-tag>
          </el-col>
          <el-col :span="1.5">
            <el-tag size="large" type="success">已登记 {{ check.registered ?? '-' }}</el-tag>
          </el-col>
          <el-col :span="1.5">
            <el-tag size="large" type="info">不校验 {{ check.excluded ?? '-' }}</el-tag>
          </el-col>
          <el-col :span="1.5">
            <el-tag size="large" :type="unregisteredCount ? 'danger' : 'success'" :effect="unregisteredCount ? 'dark' : 'light'">未登记 {{ unregisteredCount }}</el-tag>
          </el-col>
          <el-col :span="1.5">
            <el-input v-model="checkKeyword" placeholder="按路径 / 菜单筛选" clearable style="width: 220px" />
          </el-col>
          <el-col :span="1.5">
            <el-checkbox v-model="onlyUnregistered">只看未登记</el-checkbox>
          </el-col>
          <el-col :span="1.5">
            <el-button icon="Refresh" @click="getCheck">重新核对</el-button>
          </el-col>
        </el-row>
        <el-alert v-if="unregisteredCount" type="error" show-icon :closable="false" class="mb8"
          :title="'有 ' + unregisteredCount + ' 个会员接口没有登记到任何菜单策略，盘后版会按“盘后数据”处理，请在策略的接口路径中补充。'" />

        <el-table v-loading="checkLoading" :data="checkItems" :row-class-name="checkRowClass">
          <el-table-column label="接口路径" align="left" prop="path" min-width="260" />
          <el-table-column label="方法" align="center" prop="methods" width="100" />
          <el-table-column label="处理方法" align="left" prop="handler" min-width="240" :show-overflow-tooltip="true" />
          <el-table-column label="菜单" align="center" width="130">
            <template #default="scope">
              <el-tag v-if="scope.row.excluded" type="info">不校验</el-tag>
              <el-tag v-else-if="!scope.row.resource" type="danger" effect="dark">未登记</el-tag>
              <span v-else>{{ scope.row.resourceName }}<span class="text-muted ml5">{{ scope.row.resource }}</span></span>
            </template>
          </el-table-column>
          <el-table-column v-for="v in VIEWS" :key="v.key" :label="v.label" align="center" width="100">
            <template #default="scope">
              <el-tag v-if="scope.row.views && scope.row.views[v.key]" :type="viewTag(scope.row.views[v.key])" size="small">{{ viewLabel(scope.row.views[v.key]) }}</el-tag>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 修改策略对话框 -->
    <el-dialog :title="title" v-model="open" width="640px" append-to-body>
      <el-form ref="policyRef" :model="form" :rules="rules" label-width="110px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="菜单编码">
              <el-input v-model="form.resourceCode" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单名称" prop="resourceName">
              <el-input v-model="form.resourceName" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="接口路径" prop="pathText">
          <el-input v-model="form.pathText" type="textarea" :rows="4" placeholder="每行一条，Ant 风格，如 /api/member/today/**" />
        </el-form-item>
        <el-form-item label="Redis 前缀" prop="prefixText">
          <el-input v-model="form.prefixText" type="textarea" :rows="2" placeholder="每行一条，冻结盘后数据时使用，如 option:feed:" />
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="实时身份视图" prop="realtimeMode">
              <el-select v-model="form.realtimeMode" filterable allow-create default-first-option style="width: 100%">
                <el-option v-for="m in REALTIME_MODES" :key="m" :label="modeLabel(m) + '（' + m + '）'" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="盘后版视图" prop="delayedMode">
              <el-select v-model="form.delayedMode" filterable allow-create default-first-option style="width: 100%">
                <el-option v-for="m in DELAYED_MODES" :key="m" :label="modeLabel(m) + '（' + m + '）'" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="匹配顺序" prop="orderNum">
              <el-input-number v-model="form.orderNum" controls-position="right" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="OptionPolicy">
import { listPolicy, getPolicy, updatePolicy, checkPolicy, clearAccessCache } from "@/api/option/access"
import { checkPermi } from "@/utils/permission"
import { ElMessageBox } from "element-plus"

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = proxy.useDict("sys_normal_disable")

const REALTIME_MODES = ["REALTIME", "DENY", "SELF"]
const DELAYED_MODES = ["CLOSE_SNAPSHOT", "REALTIME", "DENY", "SELF"]
const MODES = {
  REALTIME: { label: "实时", tag: "success" },
  CLOSE_SNAPSHOT: { label: "盘后数据", tag: "warning" },
  DELAYED: { label: "盘后数据", tag: "warning" },
  SELF: { label: "本人数据", tag: "primary" },
  DENY: { label: "拒绝", tag: "danger" }
}
const VIEWS = [
  { key: "STAFF", label: "后台人员" },
  { key: "PAID", label: "付费" },
  { key: "TRIAL", label: "体验期" },
  { key: "DELAYED", label: "盘后版" }
]

const activeTab = ref("policy")
const policyList = ref([])
const open = ref(false)
const loading = ref(true)
const submitting = ref(false)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const total = ref(0)
const title = ref("")

const check = ref({})
const checkLoading = ref(false)
const checkKeyword = ref("")
const onlyUnregistered = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 50,
    resourceCode: undefined,
    status: undefined
  },
  rules: {
    resourceName: [{ required: true, message: "菜单名称不能为空", trigger: "blur" }],
    pathText: [{ required: true, message: "接口路径不能为空", trigger: "blur" }],
    realtimeMode: [{ required: true, message: "请选择实时身份视图", trigger: "change" }],
    delayedMode: [{ required: true, message: "请选择盘后版视图", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const unregisteredCount = computed(() => (check.value.unregistered || []).length)

const checkItems = computed(() => {
  const kw = (checkKeyword.value || "").trim().toLowerCase()
  return (check.value.items || []).filter(item => {
    if (onlyUnregistered.value && (item.excluded || item.resource)) return false
    if (!kw) return true
    return [item.path, item.resource, item.resourceName, item.handler].some(v => v && String(v).toLowerCase().includes(kw))
  })
})

function modeLabel(mode) {
  return (MODES[mode] && MODES[mode].label) || mode || "-"
}

function modeTag(mode) {
  return (MODES[mode] && MODES[mode].tag) || "info"
}

const viewLabel = modeLabel
const viewTag = modeTag

/** 逗号分隔 → 数组 */
function splitList(value) {
  return value ? String(value).split(",").map(s => s.trim()).filter(Boolean) : []
}

/** 多行 / 逗号 → 逗号分隔 */
function joinLines(text) {
  return (text || "").split(/[\n,]/).map(s => s.trim()).filter(Boolean).join(",")
}

function checkRowClass({ row }) {
  return !row.excluded && !row.resource ? "unregistered-row" : ""
}

/** 查询策略列表 */
function getList() {
  loading.value = true
  listPolicy(queryParams.value).then(res => {
    policyList.value = res.rows
    total.value = res.total
  }).finally(() => {
    loading.value = false
  })
}

/** 路径核对 */
function getCheck() {
  checkLoading.value = true
  checkPolicy().then(res => {
    check.value = res.data || {}
  }).finally(() => {
    checkLoading.value = false
  })
}

function handleTabChange(name) {
  if (name === "check") {
    getCheck()
  }
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    policyId: undefined,
    resourceCode: undefined,
    resourceName: undefined,
    pathText: undefined,
    prefixText: undefined,
    realtimeMode: undefined,
    delayedMode: undefined,
    orderNum: 0,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("policyRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.policyId)
  single.value = selection.length != 1
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const policyId = row.policyId || ids.value[0]
  getPolicy(policyId).then(res => {
    const d = res.data
    form.value = {
      policyId: d.policyId,
      resourceCode: d.resourceCode,
      resourceName: d.resourceName,
      pathText: splitList(d.pathPattern).join("\n"),
      prefixText: splitList(d.redisPrefix).join("\n"),
      hadPrefix: !!d.redisPrefix,
      realtimeMode: d.realtimeMode,
      delayedMode: d.delayedMode,
      orderNum: d.orderNum,
      status: d.status,
      remark: d.remark
    }
    open.value = true
    title.value = "修改菜单策略 - " + d.resourceName
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["policyRef"].validate(valid => {
    if (!valid) return
    const f = form.value
    const payload = {
      policyId: f.policyId,
      resourceName: f.resourceName,
      pathPattern: joinLines(f.pathText),
      redisPrefix: joinLines(f.prefixText) || (f.hadPrefix ? "" : undefined),
      realtimeMode: (f.realtimeMode || "").trim(),
      delayedMode: (f.delayedMode || "").trim(),
      orderNum: f.orderNum,
      status: f.status,
      remark: f.remark
    }
    submitting.value = true
    updatePolicy(payload).then(() => {
      proxy.$modal.msgSuccess("修改成功，已立即生效")
      open.value = false
      getList()
      if (check.value.items) getCheck()
    }).catch(() => {}).finally(() => {
      submitting.value = false
    })
  })
}

/** 清除会员身份缓存 */
function handleClearCache() {
  ElMessageBox.prompt("直接改库（如修改 trial_end_time）后使用，通过「会员管理」操作的不需要清。多个用户 ID 用英文逗号分隔", "清身份缓存", {
    inputPlaceholder: "用户ID，如 100,101",
    inputPattern: /^\s*\d+(\s*,\s*\d+)*\s*$/,
    inputErrorMessage: "请输入用户 ID，多个用英文逗号分隔",
    confirmButtonText: "清 除",
    cancelButtonText: "取 消"
  }).then(({ value }) => {
    const userIds = value.split(",").map(s => s.trim()).filter(Boolean).join(",")
    return clearAccessCache(userIds).then(() => {
      proxy.$modal.msgSuccess("已清除用户 " + userIds + " 的身份缓存，下一次请求按新身份返回")
    })
  }).catch(() => {})
}

getList()
</script>

<style scoped>
.path-line {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 20px;
  word-break: break-all;
}
:deep(.unregistered-row) {
  --el-table-tr-bg-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
</style>
