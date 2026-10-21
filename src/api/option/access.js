import request from '@/utils/request'

// 查询冻结记录列表
export function listSnapshot(query) {
  return request({ url: '/option/access/snapshot/list', method: 'get', params: query })
}

// 查询当前盘后视图状态
export function getSnapshotStatus() {
  return request({ url: '/option/access/snapshot/status', method: 'get' })
}

// 查询冻结记录详情
export function getSnapshot(snapshotId) {
  return request({ url: '/option/access/snapshot/' + snapshotId, method: 'get' })
}

// 手动冻结当天
export function freezeSnapshot(force) {
  return request({ url: '/option/access/snapshot/freeze', method: 'post', data: { force: !!force }, timeout: 60000 })
}

// 手动放出
export function releaseSnapshot(snapshotId) {
  return request({ url: '/option/access/snapshot/' + snapshotId + '/release', method: 'post', timeout: 60000 })
}

// 用冻结记录回填 Redis
export function restoreSnapshot(snapshotId) {
  return request({ url: '/option/access/snapshot/' + snapshotId + '/restore', method: 'post', timeout: 60000 })
}

// 放出时间预览
export function previewRelease(query) {
  return request({ url: '/option/access/preview', method: 'get', params: query })
}

// 查询菜单策略列表
export function listPolicy(query) {
  return request({ url: '/option/access/policy/list', method: 'get', params: query })
}

// 路径核对
export function checkPolicy() {
  return request({ url: '/option/access/policy/check', method: 'get' })
}

// 查询菜单策略详情
export function getPolicy(policyId) {
  return request({ url: '/option/access/policy/' + policyId, method: 'get' })
}

// 修改菜单策略
export function updatePolicy(data) {
  return request({ url: '/option/access/policy/' + data.policyId, method: 'put', data })
}

// 清除会员身份缓存
export function clearAccessCache(userIds) {
  return request({ url: '/option/access/cache/' + userIds, method: 'delete' })
}
