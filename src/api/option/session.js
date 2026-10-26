import request from '@/utils/request'

// 查询 OSM 同步账号会话与同步状态
export function getSessionStatus() {
  return request({
    url: '/option/session/status',
    method: 'get'
  })
}

// 连接 OSM（后端用邮箱密码登录上游，只把会话 Cookie 存入 Redis，不保存密码）
export function loginSession(data) {
  return request({
    url: '/option/session/login',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 断开 OSM 会话
export function logoutSession() {
  return request({
    url: '/option/session/logout',
    method: 'delete'
  })
}
