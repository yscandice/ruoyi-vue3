<template>
  <div class="app-container">
    <el-alert
      title="上传 ZIP 格式的 Skill 包，压缩包内需要包含 SKILL.md。"
      type="info"
      :closable="false"
      show-icon
      class="mb16"
    />

    <el-form ref="queryRef" :model="queryParams" :inline="true" v-show="showSearch">
      <el-form-item label="Skill 名称" prop="skillName">
        <el-input v-model="queryParams.skillName" placeholder="请输入 Skill 名称" clearable style="width: 220px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 140px">
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
        <el-button type="primary" plain icon="Upload" @click="openUpload" v-hasPermi="['tool:opensource:upload']">上传 Skill</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="!selectedIds.length" @click="handleDelete()" v-hasPermi="['tool:opensource:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="skillList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="Skill 名称" prop="skillName" min-width="160" show-overflow-tooltip />
      <el-table-column label="版本" prop="version" width="100" align="center" />
      <el-table-column label="作者" prop="author" width="130" show-overflow-tooltip />
      <el-table-column label="开源仓库" prop="repoUrl" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <el-link v-if="scope.row.repoUrl" :href="scope.row.repoUrl" target="_blank" type="primary">{{ scope.row.repoUrl }}</el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="文件" prop="fileName" min-width="160" show-overflow-tooltip />
      <el-table-column label="文件大小" prop="fileSize" width="100" align="center">
        <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="下载次数" prop="downloadCount" width="100" align="center" />
      <el-table-column label="状态" prop="status" width="100" align="center">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1" @change="handleStatusChange(scope.row)" v-hasPermi="['tool:opensource:edit']" />
          <el-tag v-if="!$auth.hasPermi('tool:opensource:edit')" :type="scope.row.status === '0' ? 'success' : 'info'">{{ scope.row.status === '0' ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上传时间" prop="createTime" width="165" align="center" />
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" icon="Download" @click="handleDownload(scope.row)" v-hasPermi="['tool:opensource:download']">下载</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['tool:opensource:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />

    <el-dialog v-model="uploadOpen" title="上传 Skill 包" width="620px" append-to-body @closed="resetUpload">
      <el-form ref="uploadFormRef" :model="uploadForm" :rules="rules" label-width="100px">
        <el-form-item label="Skill 名称" prop="skillName">
          <el-input v-model="uploadForm.skillName" maxlength="100" show-word-limit placeholder="例如：frontend-design" />
        </el-form-item>
        <el-form-item label="版本" prop="version"><el-input v-model="uploadForm.version" placeholder="1.0.0" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="uploadForm.author" placeholder="作者或组织" /></el-form-item>
        <el-form-item label="仓库地址"><el-input v-model="uploadForm.repoUrl" placeholder="https://github.com/owner/repo" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="uploadForm.description" type="textarea" :rows="3" maxlength="1000" show-word-limit /></el-form-item>
        <el-form-item label="Skill ZIP" prop="file">
          <el-upload ref="uploadRef" drag :auto-upload="false" :limit="1" accept=".zip,application/zip" :on-change="handleFileChange" :on-remove="handleFileRemove" :on-exceed="handleFileExceed">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">拖拽 ZIP 文件到此处，或<em>点击选择</em></div>
            <template #tip><div class="el-upload__tip">仅接受 ZIP，最大 10MB，压缩包根目录或子目录需包含 SKILL.md。</div></template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadOpen = false">取消</el-button>
          <el-button type="primary" :loading="uploading" @click="submitUpload">上传并保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="OpenSourceSkill">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { changeOpenSkillStatus, deleteOpenSkill, listOpenSkills, uploadOpenSkill } from '@/api/opensource/index'

const { proxy } = getCurrentInstance()
const loading = ref(false)
const uploading = ref(false)
const showSearch = ref(true)
const uploadOpen = ref(false)
const skillList = ref([])
const selectedIds = ref([])
const total = ref(0)
const file = ref(null)
const uploadRef = ref()
const uploadFormRef = ref()
const queryRef = ref()
const queryParams = reactive({ pageNum: 1, pageSize: 10, skillName: '', status: '' })
const uploadForm = reactive({ skillName: '', version: '1.0.0', author: '', repoUrl: '', description: '' })
const rules = {
  skillName: [{ required: true, message: '请输入 Skill 名称', trigger: 'blur' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }]
}

function getList() {
  loading.value = true
  listOpenSkills(queryParams).then(response => {
    skillList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => { loading.value = false })
}
function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { proxy.resetForm('queryRef'); queryParams.pageNum = 1; getList() }
function handleSelectionChange(selection) { selectedIds.value = selection.map(item => item.skillId) }
function openUpload() { uploadOpen.value = true }
function handleFileChange(uploadFile) {
  if (uploadFile.size > 10 * 1024 * 1024) {
    proxy.$modal.msgError('ZIP 文件不能超过 10MB')
    uploadRef.value?.clearFiles()
    file.value = null
    return
  }
  file.value = uploadFile.raw
}
function handleFileRemove() { file.value = null }
function handleFileExceed() { proxy.$modal.msgWarning('每次只能上传一个 ZIP 文件') }
function resetUpload() {
  uploadFormRef.value?.resetFields()
  uploadRef.value?.clearFiles()
  Object.assign(uploadForm, { skillName: '', version: '1.0.0', author: '', repoUrl: '', description: '' })
  file.value = null
}
function submitUpload() {
  uploadFormRef.value.validate(valid => {
    if (!valid) return
    if (!file.value) { proxy.$modal.msgWarning('请选择 Skill ZIP 文件'); return }
    const data = new FormData()
    data.append('file', file.value)
    Object.entries(uploadForm).forEach(([key, value]) => data.append(key, value || ''))
    uploading.value = true
    uploadOpenSkill(data).then(() => {
      proxy.$modal.msgSuccess('Skill 上传成功')
      uploadOpen.value = false
      getList()
    }).finally(() => { uploading.value = false })
  })
}
function handleDownload(row) {
  proxy.$download.zip(`/core/skill/download/${row.skillId}`, row.fileName)
}
function handleStatusChange(row) {
  const text = row.status === '0' ? '启用' : '停用'
  proxy.$modal.confirm(`确认要${text} Skill「${row.skillName}」吗？`).then(() => changeOpenSkillStatus({ skillId: row.skillId, status: row.status })).then(() => {
    proxy.$modal.msgSuccess(`${text}成功`)
  }).catch(() => { row.status = row.status === '0' ? '1' : '0' })
}
function handleDelete(row) {
  const ids = row ? [row.skillId] : selectedIds.value
  if (!ids.length) return
  proxy.$modal.confirm(`确认删除选中的 ${ids.length} 个 Skill 吗？`).then(() => deleteOpenSkill(ids.join(','))).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    getList()
  }).catch(() => {})
}
function formatFileSize(size = 0) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(getList)
</script>
