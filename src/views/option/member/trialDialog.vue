<template>
  <el-dialog :title="title" v-model="visible" width="520px" append-to-body @closed="reset">
    <el-form ref="trialRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item v-if="isBatch" label="已选会员">
        <span>{{ userIds.length }} 个</span>
      </el-form-item>
      <el-form-item v-else label="会员">
        <span>{{ member.email }}</span>
      </el-form-item>
      <el-form-item label="快捷调整">
        <el-button v-for="h in quickHours" :key="h" size="small" @click="form.extendHours = h">+{{ h }} 小时</el-button>
      </el-form-item>
      <el-form-item label="调整小时数" prop="extendHours">
        <el-input-number v-model="form.extendHours" :step="1" :step-strictly="true" controls-position="right" style="width: 180px" />
        <span class="ml10 tip">负数为缩短，范围 -8760 ~ 8760</span>
      </el-form-item>
      <template v-if="!isBatch">
        <el-form-item label="调整前到期">
          <span>{{ parseTime(member.trialEndTime) || '-' }}</span>
        </el-form-item>
        <el-form-item label="调整后到期">
          <span :class="{ 'text-danger': afterExpired }">{{ afterTime || '-' }}</span>
          <el-tag v-if="afterExpired" type="danger" size="small" class="ml10">将立即切到盘后版</el-tag>
        </el-form-item>
      </template>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="如：活动补偿" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
        <el-button @click="visible = false">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup name="TrialDialog">
import { extendTrial, batchExtendTrial } from "@/api/option/member"
import { parseCst, formatCst } from "@/utils/option"

const { proxy } = getCurrentInstance()
const emit = defineEmits(["success"])

const MAX_HOURS = 8760
const quickHours = [24, 48, 72]
const visible = ref(false)
const submitting = ref(false)
const isBatch = ref(false)
const userIds = ref([])
const member = ref({})
const form = ref({ extendHours: 24, remark: undefined })

const validateHours = (rule, value, callback) => {
  if (value === undefined || value === null || value === "") {
    callback(new Error("调整小时数不能为空"))
  } else if (!Number.isInteger(value) || value === 0) {
    callback(new Error("调整小时数必须是非 0 整数"))
  } else if (value < -MAX_HOURS || value > MAX_HOURS) {
    callback(new Error("调整小时数范围为 -8760 ~ 8760"))
  } else {
    callback()
  }
}
const rules = {
  extendHours: [{ validator: validateHours, trigger: ["blur", "change"] }]
}

const title = computed(() => isBatch.value ? "批量调整体验期" : "调整体验期")

const afterDate = computed(() => {
  const base = member.value.trialEndTime
  const hours = form.value.extendHours
  if (!base || !Number.isInteger(hours)) return null
  const d = parseCst(base)
  if (!d) return null
  return new Date(d.getTime() + hours * 3600 * 1000)
})
const afterTime = computed(() => afterDate.value ? formatCst(afterDate.value) : "")
const afterExpired = computed(() => afterDate.value ? afterDate.value.getTime() <= Date.now() : false)

/** 打开弹窗：传单个会员或会员数组（批量） */
function open(target) {
  if (Array.isArray(target)) {
    isBatch.value = true
    userIds.value = target.map(item => item.userId)
    member.value = {}
  } else {
    isBatch.value = false
    userIds.value = [target.userId]
    member.value = { ...target }
  }
  visible.value = true
}

function reset() {
  form.value = { extendHours: 24, remark: undefined }
  proxy.resetForm("trialRef")
}

function submitForm() {
  proxy.$refs["trialRef"].validate(valid => {
    if (!valid) return
    submitting.value = true
    const body = { extendHours: form.value.extendHours, remark: form.value.remark }
    const req = isBatch.value
      ? batchExtendTrial({ ...body, userIds: userIds.value })
      : extendTrial(member.value.userId, body)
    req.then(res => {
      if (isBatch.value) {
        proxy.$modal.msgSuccess("已更新 " + (res.count ?? 0) + " 个会员")
      } else {
        proxy.$modal.msgSuccess("调整成功")
      }
      visible.value = false
      emit("success")
    }).finally(() => {
      submitting.value = false
    })
  })
}

defineExpose({ open })
</script>

<style scoped>
.tip { color: var(--el-text-color-secondary); font-size: 12px; }
.text-danger { color: var(--el-color-danger); }
</style>
