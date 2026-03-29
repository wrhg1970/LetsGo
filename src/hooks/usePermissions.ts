import { useUser } from '../contexts/UserContext';

export const usePermissions = () => {
  const { user, role } = useUser();

  const can = (moduleId: string, action: 'create' | 'read' | 'update' | 'delete') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!role || !role.permissions || !role.permissions[moduleId]) return false;
    
    return role.permissions[moduleId][action] || false;
  };

  return { can };
};
