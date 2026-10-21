import request from '@/utils/request'

// 查询交易日历（只含例外日：休市日、提前收盘日）
export function listCalendar(query) {
  return request({
    url: '/option/market/calendar/list',
    method: 'get',
    params: query
  })
}

// 查询某一天的登记
export function getCalendarDay(tradeDate) {
  return request({
    url: '/option/market/calendar/' + tradeDate,
    method: 'get'
  })
}

// 新增休市日 / 提前收盘日
export function addCalendarDay(data) {
  return request({
    url: '/option/market/calendar',
    method: 'post',
    data: data
  })
}

// 修改休市日 / 提前收盘日
export function updateCalendarDay(data) {
  return request({
    url: '/option/market/calendar',
    method: 'put',
    data: data
  })
}

// 删除休市日 / 提前收盘日（多个日期用英文逗号分隔）
export function delCalendarDay(tradeDates) {
  return request({
    url: '/option/market/calendar/' + tradeDates,
    method: 'delete'
  })
}
