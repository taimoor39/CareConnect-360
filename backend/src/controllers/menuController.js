import Menu from '../models/Menu.js';
import asyncHandler from '../utils/asyncHandler.js';

const sortByOrder = (a, b) => a.order - b.order;

export const getSidebarMenus = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const menus = await Menu.find({ allowedRoles: role }).lean();

  const filteredMenus = menus
    .map((menu) => ({
      key: menu.key,
      title: menu.title,
      order: menu.order,
      children: (menu.children || [])
        .filter((child) => child.allowedRoles?.includes(role))
        .sort(sortByOrder)
        .map(({ key, title, path }) => ({ key, title, path })),
    }))
    .sort(sortByOrder);

  res.json({ success: true, menus: filteredMenus });
});
