<template>
  <div class="app-container">
    <el-alert type="info" show-icon :closable="false" class="mb8">
      <template #title>
        只维护<b>例外日</b>（休市日、提前收盘日），时间均为<b>美东时间</b>。未登记的周一至周五按 09:30–16:00 正常交易，周六、周日自动休市。
        初始数据只到 2027 年，之后的年份需要每年补录 NYSE 节假日。修改后盘后数据的放出时间会按新日历计算。
      </template>
    </el-alert>

    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="年份" prop="year">
        <el-date-picker v-model="queryParams.year" type="year" value-format="YYYY" placeholder="选择年份" :clearable="false" style="width: 140px" @change="handleQuery" />
      </el-form-item>
      <el-form-item label="类型" prop="trading">
        <el-select v-model="queryParams.trading" placeholder="全部" clearable style="width: 140px">
          <el-option label="休市" value="0" />
          <el-option label="交易日" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="提前收盘" prop="earlyClose">
        <el-select v-model="queryParams.earlyClose" placeholder="全部" clearable style="width: 140px">
          <el-option label="是" value="1" />
          <el-option label="否" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['option:market:edit']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['option:market:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['option:market:edit']">删除</el-button>
      </el-col>
      <el-col :span="1.5" v-if="!loading && total === 0 && !queryParams.trading && !queryParams.earlyClose">
        <el-text type="danger">{{ queryParams.year }} 年还没有登记任何休市日，请补录 NYSE 节假日。</el-text>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="dayList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="日期" align="center" prop="tradeDate" width="150">
        <template #default="scope">
          <span>{{ scope.row.tradeDate }}</span>
          <span class="text-muted ml5">{{ weekLabel(scope.row.tradeDate) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" align="center" width="110">
        <template #default="scope">
          <el-tag v-if="scope.row.trading === '0'" type="danger">休市</el-tag>
          <el-tag v-else-if="scope.row.earlyClose === '1'" type="warning">提前收盘</el-tag>
          <el-tag v-else type="success">交易日</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开盘（美东）" align="center" width="120">
        <template #default="scope">
          <span>{{ scope.row.trading === '0' ? '-' : hm(scope.row.openTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="收盘（美东）" align="center" width="120">
        <template #default="scope">
          <span :class="{ 'text-warning': scope.row.earlyClose === '1' }">{{ scope.row.trading === '0' ? '-' : hm(scope.row.closeTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="节日名称" align="left" prop="holidayName" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="备注" align="left" prop="remark" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="更新时间" align="center" width="170">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime || scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width" v-if="checkPermi(['option:market:edit'])">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 新增或修改对话框 -->
    <el-dialog :title="title" v-model="open" width="540px" append-to-body>
      <el-form ref="dayRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="日期" prop="tradeDate">
          <el-date-picker v-model="form.tradeDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" :disabled="!isAdd" style="width: 100%" />
          <div class="form-tip" v-if="weekendTip">{{ weekendTip }}</div>
        </el-form-item>
        <el-form-item label="类型" prop="trading">
          <el-radio-group v-model="form.trading" @change="handleTradingChange">
            <el-radio value="0">休市</el-radio>
            <el-radio value="1">交易日</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.trading === '1'">
          <el-form-item label="提前收盘" prop="earlyClose">
            <el-radio-group v-model="form.earlyClose" @change="handleEarlyChange">
              <el-radio value="1">是</el-radio>
              <el-radio value="0">否</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="开盘（美东）" prop="openTime">
            <el-time-select v-model="form.openTime" start="04:00" step="00:15" end="20:00" placeholder="09:30" style="width: 100%" />
          </el-form-item>
          <el-form-item label="收盘（美东）" prop="closeTime">
            <el-time-select v-model="form.closeTime" start="04:00" step="00:15" end="20:00" placeholder="16:00" style="width: 100%" />
            <div class="form-tip">放出时间 = 收盘 + 10 分钟</div>
          </el-form-item>
        </template>
        <el-form-item label="节日名称" prop="holidayName">
          <el-input v-model="form.holidayName" placeholder="如：感恩节" maxlength="50" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="如：NYSE" maxlength="200" />
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

<script setup name="OptionCalendar">
import { listCalendar, getCalendarDay, addCalendarDay, updateCalendarDay, delCalendarDay } from "@/api/option/calendar"
import { checkPermi } from "@/utils/permission"

const { proxy } = getCurrentInstance()

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

const dayList = ref([])
const open = ref(false)
const loading = ref(true)
const submitting = ref(false)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const isAdd = ref(false)

const validateTimes = (rule, value, callback) => {
  if (form.value.trading === "1" && form.value.openTime && form.value.closeTime && form.value.openTime >= form.value.closeTime) {
    callback(new Error("开盘时间必须早于收盘时间"))
  } else {
    callback()
  }
}

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 50,
    year: String(new Date().getFullYear()),
    trading: undefined,
    earlyClose: undefined
  },
  rules: {
    tradeDate: [{ required: true, message: "日期不能为空", trigger: "change" }],
    trading: [{ required: true, message: "请选择类型", trigger: "change" }],
    openTime: [{ required: true, message: "开盘时间不能为空", trigger: "change" }],
    closeTime: [{ required: true, message: "收盘时间不能为空", trigger: "change" }, { validator: validateTimes, trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const weekendTip = computed(() => {
  if (!form.value.tradeDate) return ""
  const w = new Date(form.value.tradeDate + "T00:00:00").getDay()
  return w === 0 || w === 6 ? WEEK[w] + "本来就休市，一般不需要登记" : ""
})

/** 星期（按日期本身计算，与浏览器时区无关） */
function weekLabel(date) {
  return date ? WEEK[new Date(date + "T00:00:00").getDay()] : ""
}

/** HH:mm:ss → HH:mm */
function hm(time) {
  return time ? String(time).substring(0, 5) : "-"
}

/** 查询交易日历 */
function getList() {
  loading.value = true
  listCalendar(queryParams.value).then(res => {
    dayList.value = res.rows
    total.value = res.total
  }).finally(() => {
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    tradeDate: undefined,
    trading: "0",
    earlyClose: "0",
    openTime: "09:30",
    closeTime: "16:00",
    holidayName: undefined,
    remark: "NYSE"
  }
  proxy.resetForm("dayRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.year = String(new Date().getFullYear())
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.tradeDate)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 切换休市 / 交易日 */
function handleTradingChange(value) {
  if (value === "0") {
    form.value.earlyClose = "0"
  }
}

/** 切换提前收盘，自动带出默认收盘时间 */
function handleEarlyChange(value) {
  form.value.closeTime = value === "1" ? "13:00" : "16:00"
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  isAdd.value = true
  open.value = true
  title.value = "新增休市日 / 提前收盘日"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const tradeDate = row.tradeDate || ids.value[0]
  getCalendarDay(tradeDate).then(res => {
    const d = res.data
    form.value = {
      tradeDate: d.tradeDate,
      trading: d.trading,
      earlyClose: d.earlyClose,
      openTime: d.trading === "1" ? hm(d.openTime) : "09:30",
      closeTime: d.trading === "1" ? hm(d.closeTime) : "16:00",
      holidayName: d.holidayName,
      remark: d.remark
    }
    isAdd.value = false
    open.value = true
    title.value = "修改 " + d.tradeDate
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["dayRef"].validate(valid => {
    if (!valid) return
    const payload = { ...form.value }
    if (payload.trading === "0") {
      payload.earlyClose = "0"
      payload.openTime = undefined
      payload.closeTime = undefined
    }
    submitting.value = true
    const req = isAdd.value ? addCalendarDay(payload) : updateCalendarDay(payload)
    req.then(() => {
      proxy.$modal.msgSuccess(isAdd.value ? "新增成功" : "修改成功")
      open.value = false
      getList()
    }).catch(() => {}).finally(() => {
      submitting.value = false
    })
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const tradeDates = row.tradeDate || ids.value.join(",")
  proxy.$modal.confirm('是否确认删除日期为"' + tradeDates + '"的登记？删除后该天按普通工作日（09:30–16:00）处理。').then(function () {
    return delCalendarDay(tradeDates)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>

<style scoped>
.form-tip {
  width: 100%;
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
  color: #909399;
}
</style>
