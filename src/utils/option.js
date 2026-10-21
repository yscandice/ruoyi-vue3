/**
 * 期权会员模块通用工具
 * 后端列表 / 详情时间为东八区 "yyyy-MM-dd HH:mm:ss"，身份 / 预览接口为 ISO 8601 带偏移
 */
import { parseTime } from '@/utils/ruoyi'

const CST_OFFSET_MINUTES = 8 * 60

/** 解析东八区时间字符串（不带偏移的按 +08:00 处理），返回 Date */
export function parseCst(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const str = String(value).trim().replace(' ', 'T')
  let d
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(str)) {
    d = new Date(str)
  } else if (/T\d{2}:\d{2}/.test(str)) {
    d = new Date(str + '+08:00')
  } else {
    d = new Date(str + 'T00:00:00+08:00')
  }
  return isNaN(d.getTime()) ? null : d
}

/** Date 格式化为东八区时间（与浏览器所在时区无关） */
export function formatCst(date, pattern) {
  const d = parseCst(date)
  if (!d) return ''
  const shifted = new Date(d.getTime() + (CST_OFFSET_MINUTES + d.getTimezoneOffset()) * 60000)
  return parseTime(shifted, pattern || '{y}-{m}-{d} {h}:{i}:{s}')
}

/** ISO 时间转北京时间 yyyy-MM-dd HH:mm */
export function formatBeijing(value) {
  if (!value) return '-'
  return formatCst(value, '{y}-{m}-{d} {h}:{i}') || String(value)
}

/** 体验剩余时长 */
export function formatRemaining(seconds) {
  if (seconds >= 3600) return '约 ' + Math.round(seconds / 3600) + ' 小时'
  return Math.max(1, Math.floor(seconds / 60)) + ' 分钟'
}

/** 会员密码规则：8–20 位，同时包含字母和数字，不能有空白 */
export const MEMBER_PWD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)\S{8,20}$/
export const MEMBER_PWD_MESSAGE = '密码需为 8–20 位，且同时包含字母和数字'
