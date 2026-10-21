<template>
  <el-dialog title="设置付费" v-model="visible" width="500px" append-to-body @closed="reset">
    <el-form ref="paidRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="会员">
        <span>{{ member.email }}</span>
      </el-form-item>
      <el-form-item label="当前付费到期">
        <span>{{ parseTime(member.paidUntil) || '未付费' }}</span>
      </el-form-item>
      <el-form-item label="快捷设置">
        <el-button v-for="item in quickItems" :key="item.label" size="small" @click="applyQuick(item)">{{ item.label }}</el-button>
      </el-form-item>
      <el-form-item label="付费到期" prop="paidUntil">
        <el-date-picker v-model="form.paidUntil" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="选择付费到期时间" :disabled-date="disabledDate" style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <span class="tip">付费期内会员看实时数据；取消付费后按体验期规则（多数回到盘后版）。</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="member.paidUntil" type="danger" plain :loading="submitting" @click="cancelPaid">取消付费</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确 定</el-button>
        <el-button @click="visible = false">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup name="PaidDialog">
import { setPaid } from "@/api/option/member"
import { parseTime } from "@/utils/ruoyi"
import { parseCst, formatCst } from "@/utils/option"

const { proxy } = getCurrentInstance()
const emit = defineEmits(["success"])

const visible = ref(false)
const submitting = ref(false)
const member = ref({})
const form = ref({ paidUntil: undefined })
const quickItems = [
  { label: "1 个月", months: 1 },
  { label: "3 个月", months: 3 },
  { label: "1 年", months: 12 }
]

const validatePaid = (rule, value, callback) => {
  if (!value) {
    callback(new Error("请选择付费到期时间"))
  } else if (parseCst(value).getTime() <= Date.now()) {
    callback(new Error("付费到期时间必须晚于当前时间"))
  } else {
    callback()
  }
}
const rules = { paidUntil: [{ validator: validatePaid, trigger: "change" }] }

function disabledDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

/** 快捷设置：从当前付费到期（未过期）或现在起顺延 N 个月，取当天 23:59:59（东八区） */
function applyQuick(item) {
  const current = parseCst(member.value.paidUntil)
  const base = current && current.getTime() > Date.now() ? current : new Date()
  const [y, m, d] = formatCst(base, "{y}-{m}-{d}").split("-").map(Number)
  const target = new Date(Date.UTC(y, m - 1 + item.months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  const day = String(Math.min(d, lastDay)).padStart(2, "0")
  const month = String(target.getUTCMonth() + 1).padStart(2, "0")
  form.value.paidUntil = target.getUTCFullYear() + "-" + month + "-" + day + " 23:59:59"
}

function open(row) {
  member.value = { ...row }
  form.value.paidUntil = row.paidUntil ? parseTime(row.paidUntil) : undefined
  visible.value = true
}

function reset() {
  form.value = { paidUntil: undefined }
  proxy.resetForm("paidRef")
}

function submitForm() {
  proxy.$refs["paidRef"].validate(valid => {
    if (!valid) return
    submitting.value = true
    setPaid(member.value.userId, form.value.paidUntil).then(() => {
      proxy.$modal.msgSuccess("设置成功")
      visible.value = false
      emit("success")
    }).finally(() => {
      submitting.value = false
    })
  })
}

function cancelPaid() {
  proxy.$modal.confirm('确认取消"' + member.value.email + '"的付费吗？取消后会员按体验期规则返回数据。').then(() => {
    submitting.value = true
    return setPaid(member.value.userId, null)
  }).then(() => {
    proxy.$modal.msgSuccess("已取消付费")
    visible.value = false
    emit("success")
  }).catch(() => {}).finally(() => {
    submitting.value = false
  })
}

defineExpose({ open })
</script>

<style scoped>
.tip { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
</style>
