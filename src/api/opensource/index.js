import request from '@/utils/request'

export function listOpenSkills(query) {
  return request({ url: '/core/skill/list', method: 'get', params: query })
}

export function uploadOpenSkill(data) {
  return request({
    url: '/core/skill/upload',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data
  })
}

export function changeOpenSkillStatus(data) {
  return request({ url: '/core/skill/changeStatus', method: 'put', data })
}

export function deleteOpenSkill(skillId) {
  return request({ url: '/core/skill/' + skillId, method: 'delete' })
}
