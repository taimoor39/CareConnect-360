import Menu from '../models/Menu.js';

export const seedMenus = async () => {
  const managementMenu = {
    key: 'management',
    title: 'Management',
    order: 1,
    allowedRoles: ['admin', 'doctor', 'receptionist'],
    children: [
      {
        key: 'patient-management',
        title: 'Patient Management',
        path: '/patients',
        order: 1,
        allowedRoles: ['admin', 'doctor', 'receptionist'],
      },
      {
        key: 'doctor-management',
        title: 'Doctor Management',
        path: '/doctors',
        order: 2,
        allowedRoles: ['admin', 'receptionist'],
      },
      {
        key: 'user-management',
        title: 'User Management',
        path: '/users',
        order: 3,
        allowedRoles: ['admin'],
      },
    ],
  };

  const result = await Menu.findOneAndUpdate({ key: managementMenu.key }, managementMenu, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return {
    name: 'menus',
    status: 'upserted',
    menuId: result._id,
    key: result.key,
  };
};
