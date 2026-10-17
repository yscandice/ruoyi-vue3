import request from '@/utils/request'

export function listNavigation(query) {
  return request({ url: '/core/navigation/admin/list', method: 'get', params: query })
}

export function getNavigation(navigationId) {
  return request({ url: '/core/navigation/' + navigationId, method: 'get' })
}

export function addNavigation(data) {
  return request({ url: '/core/navigation', method: 'post', data })
}

export function updateNavigation(data) {
  return request({ url: '/core/navigation', method: 'put', data })
}

export function changeNavigationStatus(data) {
  return request({ url: '/core/navigation/changeStatus', method: 'put', data })
}

export function deleteNavigation(navigationIds) {
  return request({ url: '/core/navigation/' + navigationIds, method: 'delete' })
}
