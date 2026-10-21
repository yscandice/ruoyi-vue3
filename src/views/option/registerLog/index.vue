<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="queryParams.email" placeholder="请输入邮箱" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="IP" prop="ip">
        <el-input v-model="queryParams.ip" placeholder="请输入IP" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="动作" prop="action">
        <el-select v-model="queryParams.action" placeholder="动作" clearable style="width: 140px">
          <el-option v-for="dict in option_register_action" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="结果" prop="result">
        <el-select v-model="queryParams.result" placeholder="结果" clearable style="width: 140px">
          <el-option v-for="dict in option_register_result" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="时间" style="width: 308px">
        <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-text type="info" size="small">用于排查“收不到验证码”、发现同一 IP 批量注册。点击邮箱或 IP 可快速筛选。</el-text>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="logList">
      <el-table-column label="时间" align="center" prop="createTime" width="170">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="邮箱" align="left" min-width="200" :show-overflow-tooltip="true">
        <template #default="scope">
          <a class="link-type" style="cursor:pointer" @click="quickFilter('email', scope.row.email)">{{ scope.row.email }}</a>
        </template>
      </el-table-column>
      <el-table-column label="动作" align="center" width="110">
        <template #default="scope">
          <dict-tag :options="option_register_action" :value="scope.row.action" />
        </template>
      </el-table-column>
      <el-table-column label="结果" align="center" width="90">
        <template #default="scope">
          <dict-tag :options="option_register_result" :value="scope.row.result" />
        </template>
      </el-table-column>
      <el-table-column label="原因" align="left" prop="reason" min-width="180" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ scope.row.reason || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="IP" align="center" width="140">
        <template #default="scope">
          <a class="link-type" style="cursor:pointer" @click="quickFilter('ip', scope.row.ip)">{{ scope.row.ip }}</a>
        </template>
      </el-table-column>
      <el-table-column label="设备指纹" align="center" prop="deviceHash" width="160" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ scope.row.deviceHash || '-' }}</span>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="OptionRegisterLog">
import { listRegisterLog } from "@/api/option/member"

const { proxy } = getCurrentInstance()
const { option_register_action, option_register_result } = proxy.useDict("option_register_action", "option_register_result")

const logList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const dateRange = ref([])

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    email: undefined,
    ip: undefined,
    action: undefined,
    result: undefined
  }
})

const { queryParams } = toRefs(data)

/** 查询注册日志 */
function getList() {
  loading.value = true
  listRegisterLog(proxy.addDateRange({ ...queryParams.value, params: {} }, dateRange.value)).then(res => {
    logList.value = res.rows
    total.value = res.total
  }).finally(() => {
    loading.value = false
  })
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 点击邮箱 / IP 快速筛选 */
function quickFilter(field, value) {
  if (!value) return
  queryParams.value[field] = value
  handleQuery()
}

getList()
</script>
