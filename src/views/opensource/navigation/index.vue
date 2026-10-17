<template>
  <div class="app-container">
    <el-form ref="queryRef" :model="queryParams" :inline="true" v-show="showSearch">
      <el-form-item label="菜单名称" prop="menuName">
        <el-input v-model="queryParams.menuName" placeholder="请输入菜单名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="菜单标识" prop="menuKey">
        <el-input v-model="queryParams.menuKey" placeholder="请输入菜单标识" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px">
          <el-option label="正常" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['tool:navigation:add']">新增菜单</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="!selectedIds.length" @click="handleDelete()" v-hasPermi="['tool:navigation:remove']">批量删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="navigationList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="菜单名称" prop="menuName" min-width="140" show-overflow-tooltip />
      <el-table-column label="菜单标识" prop="menuKey" min-width="150" show-overflow-tooltip />
      <el-table-column label="图标标识" prop="icon" width="140" align="center" />
      <el-table-column label="路由地址" prop="routePath" min-width="180" show-overflow-tooltip />
      <el-table-column label="展示类型" prop="menuType" width="110" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.menuType === 'button' ? 'warning' : 'primary'">{{ scope.row.menuType === 'button' ? '按钮' : '菜单' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" prop="orderNum" width="110" align="center" />
      <el-table-column label="状态" prop="status" width="100" align="center">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)" v-hasPermi="['tool:navigation:edit']" />
          <el-tag v-if="!proxy.$auth.hasPermi('tool:navigation:edit')" :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['tool:navigation:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['tool:navigation:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />

    <el-dialog v-model="dialogOpen" :title="dialogTitle" width="620px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" maxlength="80" show-word-limit placeholder="例如：首页" />
        </el-form-item>
        <el-form-item label="菜单标识" prop="menuKey">
          <el-input v-model="form.menuKey" maxlength="50" placeholder="例如：home（字母开头，可含数字、_、-）" />
        </el-form-item>
        <el-form-item label="图标标识" prop="icon">
          <el-input v-model="form.icon" maxlength="80" placeholder="例如：home、search、bookmark" />
        </el-form-item>
        <el-form-item label="路由地址" prop="routePath">
          <el-input v-model="form.routePath" maxlength="255" placeholder="例如：/、/explore、/submit" />
        </el-form-item>
        <el-form-item label="展示类型" prop="menuType">
          <el-radio-group v-model="form.menuType">
            <el-radio value="menu">菜单</el-radio>
            <el-radio value="button">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="orderNum">
          <el-input-number v-model="form.orderNum" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogOpen = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="NavigationManagement">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addNavigation, changeNavigationStatus, deleteNavigation, getNavigation, listNavigation, updateNavigation } from '@/api/opensource/navigation'

const { proxy } = getCurrentInstance()
const loading = ref(false)
const saving = ref(false)
const showSearch = ref(true)
const dialogOpen = ref(false)
const dialogTitle = ref('新增导航菜单')
const navigationList = ref([])
const selectedIds = ref([])
const total = ref(0)
const queryRef = ref()
const formRef = ref()
const queryParams = reactive({ pageNum: 1, pageSize: 10, menuName: '', menuKey: '', status: '' })
const form = reactive(createDefaultForm())
const rules = {
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  menuKey: [
    { required: true, message: '请输入菜单标识', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/, message: '标识须以字母开头，且仅能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ],
  icon: [{ required: true, message: '请输入图标标识', trigger: 'blur' }],
  routePath: [{ required: true, message: '请输入路由地址', trigger: 'blur' }],
  menuType: [{ required: true, message: '请选择展示类型', trigger: 'change' }],
  orderNum: [{ required: true, message: '请输入排序值', trigger: 'blur' }]
}

function createDefaultForm() {
  return { navigationId: undefined, menuKey: '', menuName: '', icon: '', routePath: '', orderNum: 0, menuType: 'menu', status: '0', remark: '' }
}

function getList() {
  loading.value = true
  listNavigation(queryParams).then(response => {
    navigationList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => { loading.value = false })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.pageNum = 1
  getList()
}

function handleSelectionChange(selection) {
  selectedIds.value = selection.map(item => item.navigationId)
}

function resetForm() {
  Object.assign(form, createDefaultForm())
  formRef.value?.clearValidate()
}

function handleAdd() {
  resetForm()
  dialogTitle.value = '新增导航菜单'
  dialogOpen.value = true
}

function handleUpdate(row) {
  resetForm()
  getNavigation(row.navigationId).then(response => {
    Object.assign(form, response.data || response)
    dialogTitle.value = '修改导航菜单'
    dialogOpen.value = true
  })
}

function submitForm() {
  formRef.value.validate(valid => {
    if (!valid) return
    saving.value = true
    const action = form.navigationId ? updateNavigation(form) : addNavigation(form)
    action.then(() => {
      proxy.$modal.msgSuccess(form.navigationId ? '修改成功' : '新增成功')
      dialogOpen.value = false
      getList()
    }).finally(() => { saving.value = false })
  })
}

function handleStatusChange(row) {
  const oldStatus = row.status === '0' ? '1' : '0'
  const actionText = row.status === '0' ? '启用' : '停用'
  proxy.$modal.confirm(`确认${actionText}「${row.menuName}」吗？`).then(() => changeNavigationStatus({ navigationId: row.navigationId, status: row.status })).then(() => {
    proxy.$modal.msgSuccess(`${actionText}成功`)
  }).catch(() => { row.status = oldStatus })
}

function handleDelete(row) {
  const ids = row ? [row.navigationId] : selectedIds.value
  if (!ids.length) return
  proxy.$modal.confirm(`确认删除选中的 ${ids.length} 个导航菜单吗？`).then(() => deleteNavigation(ids.join(','))).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}

onMounted(getList)
</script>
