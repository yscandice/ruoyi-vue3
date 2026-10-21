-- ----------------------------
-- 会员管理：盘后数据 / 交易日历 / 菜单策略 菜单（ruoyi-vue3 前端 P5–P7）
-- 挂在 2100「会员管理」下；权限标识与后端接口 @PreAuthorize 一致；可重复执行
-- ----------------------------
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select 2103, '盘后数据', 2100, 3, 'snapshot', 'option/snapshot/index', '', 'OptionSnapshot', 1, 0, 'C', '0', '0', 'option:access:list', 'time-range', 'admin', sysdate(), '', null, '盘后视图冻结 / 放出记录与放出时间预览'
from dual where not exists (select 1 from sys_menu where menu_id = 2103);

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select 2104, '交易日历', 2100, 4, 'calendar', 'option/calendar/index', '', 'OptionCalendar', 1, 0, 'C', '0', '0', 'option:market:list', 'date', 'admin', sysdate(), '', null, '美股交易日历（节假日 / 提前收盘日）'
from dual where not exists (select 1 from sys_menu where menu_id = 2104);

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select 2105, '菜单策略', 2100, 5, 'policy', 'option/policy/index', '', 'OptionPolicy', 1, 0, 'C', '0', '0', 'option:access:list', 'tree-table', 'admin', sysdate(), '', null, '会员菜单数据视图策略'
from dual where not exists (select 1 from sys_menu where menu_id = 2105);

-- 按钮
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select t.menu_id, t.menu_name, t.parent_id, t.order_num, '#', '', '', '', 1, 0, 'F', '0', '0', t.perms, '#', 'admin', sysdate(), '', null, ''
from (
  select 2121 menu_id, '盘后数据操作' menu_name, 2103 parent_id, 1 order_num, 'option:access:edit' perms
  union all select 2122, '交易日历修改', 2104, 1, 'option:market:edit'
  union all select 2123, '菜单策略修改', 2105, 1, 'option:access:edit'
) t
where not exists (select 1 from sys_menu m where m.menu_id = t.menu_id);
