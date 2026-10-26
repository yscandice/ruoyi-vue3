-- ----------------------------
-- 会员管理：OSM 会话 菜单（ruoyi-vue3 loginFeatur）
-- 挂在 2100「会员管理」下：2106 OSM 会话（页面，option:session:status）/ 2124 连接断开（按钮，option:session:login）
-- 权限标识与后端 OptionSessionController 的 @PreAuthorize 一致。
-- admin 超级管理员角色（role_id=1）天然拥有全部菜单，无需写 sys_role_menu；其他角色默认不分配。可重复执行。
-- ----------------------------
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select 2106, 'OSM 会话', 2100, 6, 'session', 'option/session/index', '', 'OptionSession', 1, 0, 'C', '0', '0', 'option:session:status', 'link', 'admin', sysdate(), '', null, '全站共用的 OSM 同步账号连接 / 断开与会话状态'
from dual where not exists (select 1 from sys_menu where menu_id = 2106);

insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, route_name, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark)
select 2124, 'OSM 连接断开', 2106, 1, '#', '', '', '', 1, 0, 'F', '0', '0', 'option:session:login', '#', 'admin', sysdate(), '', null, ''
from dual where not exists (select 1 from sys_menu where menu_id = 2124);
