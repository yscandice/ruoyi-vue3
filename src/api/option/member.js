import request from '@/utils/request'

// 查询会员列表
export function listMember(query) {
  return request({ url: '/option/member/list', method: 'get', params: query })
}

// 查询会员统计
export function getMemberStats() {
  return request({ url: '/option/member/stats', method: 'get' })
}

// 查询会员详情
export function getMember(userId) {
  return request({ url: '/option/member/' + userId, method: 'get' })
}

// 延长 / 缩短体验期
export function extendTrial(userId, data) {
  return request({ url: '/option/member/' + userId + '/trial', method: 'put', data })
}

// 批量延长 / 缩短体验期
export function batchExtendTrial(data) {
  return request({ url: '/option/member/trial/batch', method: 'put', data })
}

// 设置 / 取消付费
export function setPaid(userId, paidUntil) {
  return request({ url: '/option/member/' + userId + '/paid', method: 'put', data: { paidUntil } })
}

// 停用 / 启用
export function changeMemberStatus(userId, status) {
  return request({ url: '/option/member/' + userId + '/status', method: 'put', data: { status } })
}

// 重置密码
export function resetMemberPwd(userId, password) {
  return request({ url: '/option/member/' + userId + '/resetPwd', method: 'put', data: { password } })
}

// 强制下线
export function forceLogoutMember(userId) {
  return request({ url: '/option/member/' + userId + '/online', method: 'delete' })
}

// 查询注册日志
export function listRegisterLog(query) {
  return request({ url: '/option/member/registerLog/list', method: 'get', params: query })
}
