import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, CustomRole, ModulePermissions } from '../types';
import { 
  Shield, 
  User as UserIcon, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Settings as SettingsIcon,
  Search,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Eye,
  Save,
  X,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { usePermissions } from '../hooks/usePermissions';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 20, x: '-50%' }}
      className={cn(
        "fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border",
        type === 'success' ? "bg-emerald-900 border-emerald-800 text-emerald-50" : "bg-rose-900 border-rose-800 text-rose-50"
      )}
    >
      {type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
      <span className="font-medium text-sm">{message}</span>
    </motion.div>
  );
};

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'crm', label: 'CRM / Clientes' },
  { id: 'quotations', label: 'Cotizaciones' },
  { id: 'bookings', label: 'Reservas' },
  { id: 'suppliers', label: 'Proveedores' },
  { id: 'finance', label: 'Finanzas' },
  { id: 'groups', label: 'Grupos' },
  { id: 'catalogs', label: 'Catálogos' },
  { id: 'settings', label: 'Configuración' }
];

const DEFAULT_PERMISSIONS: ModulePermissions = {
  create: false,
  read: false,
  update: false,
  delete: false
};

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'roles' | 'system'>('general');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // General Settings State
  const [companyInfo, setCompanyInfo] = useState({
    name: 'TravelAgency Boutique',
    taxId: 'XAXX010101000',
    email: 'contacto@travelagency.com',
    phone: '+52 55 1234 5678',
    address: 'Av. Reforma 123, CDMX',
    currency: 'MXN',
    timezone: 'America/Mexico_City'
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  
  // User state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  // Role state
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<CustomRole>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const { can } = usePermissions();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersSnap, rolesSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('name'))).catch(e => handleFirestoreError(e, OperationType.LIST, 'users')),
        getDocs(query(collection(db, 'roles'), orderBy('name'))).catch(e => handleFirestoreError(e, OperationType.LIST, 'roles'))
      ]);
      
      if (!usersSnap || !rolesSnap) return;

      const fetchedUsers = usersSnap.docs.map(doc => doc.data() as User);
      const fetchedRoles = rolesSnap.docs.map(doc => doc.data() as CustomRole);
      
      setUsers(fetchedUsers);
      setRoles(fetchedRoles);

      // Seed default roles if empty
      if (fetchedRoles.length === 0) {
        await seedDefaultRoles();
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultRoles = async () => {
    const adminRole: CustomRole = {
      id: 'admin',
      name: 'Administrador',
      description: 'Acceso total al sistema',
      permissions: MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod.id]: { create: true, read: true, update: true, delete: true }
      }), {})
    };

    const agentRole: CustomRole = {
      id: 'agent',
      name: 'Agente',
      description: 'Gestión de ventas y clientes',
      permissions: MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod.id]: mod.id === 'settings' || mod.id === 'finance' 
          ? { create: false, read: false, update: false, delete: false }
          : { create: true, read: true, update: true, delete: false }
      }), {})
    };

    const accountantRole: CustomRole = {
      id: 'accountant',
      name: 'Contador',
      description: 'Auditoría financiera y contabilidad',
      permissions: MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod.id]: mod.id === 'finance'
          ? { create: true, read: true, update: true, delete: true }
          : mod.id === 'settings'
            ? { create: false, read: false, update: false, delete: false }
            : { create: false, read: true, update: false, delete: false }
      }), {})
    };

    try {
      await Promise.all([
        setDoc(doc(db, 'roles', 'admin'), adminRole).catch(e => handleFirestoreError(e, OperationType.WRITE, 'roles/admin')),
        setDoc(doc(db, 'roles', 'agent'), agentRole).catch(e => handleFirestoreError(e, OperationType.WRITE, 'roles/agent')),
        setDoc(doc(db, 'roles', 'accountant'), accountantRole).catch(e => handleFirestoreError(e, OperationType.WRITE, 'roles/accountant'))
      ]);
      
      setRoles([adminRole, agentRole, accountantRole]);
    } catch (error) {
      console.error('Error seeding roles:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserRole) return;
    
    const uid = selectedUser?.uid || Math.random().toString(36).substring(7);
    const newUser: User = {
      uid,
      name: newUserName || 'Usuario Pendiente',
      email: newUserEmail,
      role: newUserRole,
      isPreRegistered: !selectedUser,
      isActive: selectedUser ? selectedUser.isActive : true
    };

    try {
      await setDoc(doc(db, 'users', uid), newUser).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}`));
      
      if (selectedUser) {
        setUsers(users.map(u => u.uid === uid ? newUser : u));
        setSelectedUser(newUser);
      } else {
        setUsers([...users, newUser]);
      }
      
      setIsUserModalOpen(false);
      setSelectedUser(null);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('');
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setToast({ message: 'No puedes eliminar tu propio usuario.', type: 'error' });
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;

    try {
      await deleteDoc(doc(db, 'users', uid)).catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${uid}`));
      setUsers(users.filter(u => u.uid !== uid));
      if (selectedUser?.uid === uid) setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
    if (uid === auth.currentUser?.uid) {
      setToast({ message: 'No puedes desactivar tu propio usuario.', type: 'error' });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`));
      setUsers(users.map(u => u.uid === uid ? { ...u, isActive: !currentStatus } : u));
      if (selectedUser?.uid === uid) {
        setSelectedUser({ ...selectedUser, isActive: !currentStatus });
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleUpdateUserRole = async (uid: string, roleId: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: roleId }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`));
      setUsers(users.map(u => u.uid === uid ? { ...u, role: roleId } : u));
      if (selectedUser?.uid === uid) {
        setSelectedUser({ ...selectedUser, role: roleId });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole.name) return;
    
    const roleId = editingRole.id || Math.random().toString(36).substring(7);
    const roleToSave: CustomRole = {
      id: roleId,
      name: editingRole.name,
      description: editingRole.description || '',
      permissions: editingRole.permissions || MODULES.reduce((acc, mod) => ({ ...acc, [mod.id]: { ...DEFAULT_PERMISSIONS } }), {})
    };

    try {
      await setDoc(doc(db, 'roles', roleId), roleToSave).catch(e => handleFirestoreError(e, OperationType.WRITE, `roles/${roleId}`));
      if (editingRole.id) {
        setRoles(roles.map(r => r.id === roleId ? roleToSave : r));
      } else {
        setRoles([...roles, roleToSave]);
      }
      setIsRoleModalOpen(false);
      setEditingRole({});
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (roleId === 'admin') return; // Protect admin role
    if (!confirm('¿Estás seguro de eliminar este rol? Los usuarios asignados perderán sus permisos.')) return;

    try {
      await deleteDoc(doc(db, 'roles', roleId)).catch(e => handleFirestoreError(e, OperationType.DELETE, `roles/${roleId}`));
      setRoles(roles.filter(r => r.id !== roleId));
      if (selectedRole?.id === roleId) setSelectedRole(null);
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const togglePermission = (moduleId: string, action: keyof ModulePermissions) => {
    const currentPermissions = editingRole.permissions || {};
    const modulePerms = currentPermissions[moduleId] || { ...DEFAULT_PERMISSIONS };
    
    setEditingRole({
      ...editingRole,
      permissions: {
        ...currentPermissions,
        [moduleId]: {
          ...modulePerms,
          [action]: !modulePerms[action]
        }
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <SettingsIcon className="text-indigo-600" size={32} />
            Configuración de Sistema
          </h1>
          <p className="text-slate-500 font-medium">Gestiona usuarios, roles y permisos de acceso personalizados.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
        <button 
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'general' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <SettingsIcon size={18} /> General
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'users' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <UserIcon size={18} /> Usuarios
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'roles' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Shield size={18} /> Roles y Permisos
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'system' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Lock size={18} /> Sistema
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab === 'general' ? (
          <div className="lg:col-span-3">
            {/* ... existing general tab content ... */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Información de la Empresa</h2>
                <p className="text-sm text-slate-500">Configura los datos fiscales y de contacto de tu agencia.</p>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre Comercial</label>
                    <input 
                      type="text"
                      value={companyInfo.name}
                      onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RFC / Tax ID</label>
                    <input 
                      type="text"
                      value={companyInfo.taxId}
                      onChange={e => setCompanyInfo({...companyInfo, taxId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moneda Base</label>
                      <select 
                        value={companyInfo.currency}
                        onChange={e => setCompanyInfo({...companyInfo, currency: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="USD">USD - Dólar Americano</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zona Horaria</label>
                      <select 
                        value={companyInfo.timezone}
                        onChange={e => setCompanyInfo({...companyInfo, timezone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="America/Mexico_City">CDMX (GMT-6)</option>
                        <option value="America/New_York">New York (GMT-5)</option>
                        <option value="Europe/Madrid">Madrid (GMT+1)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo de Contacto</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        value={companyInfo.email}
                        onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dirección Física</label>
                    <textarea 
                      value={companyInfo.address}
                      onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => {
                    setIsSavingGeneral(true);
                    setTimeout(() => setIsSavingGeneral(false), 1000);
                  }}
                  disabled={isSavingGeneral}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingGeneral ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSavingGeneral ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : activeTab === 'system' ? (
          <div className="lg:col-span-3 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Save size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Respaldo de Datos</h3>
                    <p className="text-sm text-slate-500">Descarga una copia completa de la base de datos.</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all">
                  Generar Backup (.json)
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Mantenimiento</h3>
                    <p className="text-sm text-slate-500">Limpieza de temporales y optimización.</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">
                  Limpiar Caché de Sistema
                </button>
              </div>
            </motion.div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Logs de Actividad</h3>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { user: 'Admin', action: 'Actualizó rol de Agente', time: 'Hace 5 min' },
                  { user: 'Admin', action: 'Creó nueva cotización #QT-992', time: 'Hace 12 min' },
                  { user: 'Juan Pérez', action: 'Inició sesión', time: 'Hace 45 min' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {log.user.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{log.action}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{log.user}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <>
            {/* User List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-900">Usuarios Registrados</h2>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                    {can('settings', 'create') && (
                      <button 
                        onClick={() => setIsUserModalOpen(true)}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                      >
                        <UserPlus size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const userRole = roles.find(r => r.id === user.role);
                    return (
                      <div 
                        key={user.uid}
                        onClick={() => setSelectedUser(user)}
                        className={cn(
                          "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer group",
                          selectedUser?.uid === user.uid && "bg-indigo-50/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              {user.name}
                              {user.isPreRegistered && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">Pendiente</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
                              {userRole?.name || 'Sin Rol'}
                            </span>
                            
                            {/* Toggle Switch */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleUserStatus(user.uid, user.isActive !== false);
                              }}
                              className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-200",
                                user.isActive !== false ? "bg-indigo-600" : "bg-slate-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                                user.isActive !== false ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {can('settings', 'update') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setNewUserName(user.name);
                                  setNewUserEmail(user.email);
                                  setNewUserRole(user.role);
                                  setIsUserModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {user.uid !== auth.currentUser?.uid && can('settings', 'delete') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.uid);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {selectedUser ? (
                  <motion.div
                    key={selectedUser.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 sticky top-6"
                  >
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h3>
                        <p className="text-sm text-slate-500">{selectedUser.email}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cambiar Rol</label>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          Permisos Dinámicos
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {roles.map((role) => (
                          <div key={role.id} className="space-y-2">
                            <button
                              disabled={!can('settings', 'update')}
                              onClick={() => handleUpdateUserRole(selectedUser.uid, role.id)}
                              className={cn(
                                "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                                selectedUser.role === role.id 
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-900" 
                                  : "border-slate-100 hover:border-slate-200 text-slate-600",
                                !can('settings', 'update') && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              <div>
                                <p className="font-bold text-sm">{role.name}</p>
                                <p className="text-[10px] opacity-70">{role.description}</p>
                              </div>
                              {selectedUser.role === role.id && <CheckCircle2 size={20} className="text-indigo-600" />}
                            </button>
                            
                            {/* Dynamic Permissions Preview for the selected role */}
                            {selectedUser.role === role.id && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="px-4 pb-2 pt-1"
                              >
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  {MODULES.map(mod => {
                                    const p = role.permissions[mod.id] || DEFAULT_PERMISSIONS;
                                    const hasAny = p.read || p.create || p.update || p.delete;
                                    if (!hasAny) return null;
                                    return (
                                      <div key={mod.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                        <span className="font-bold text-slate-700">{mod.label}:</span>
                                        <span>
                                          {[
                                            p.read && 'Ver',
                                            p.create && 'Crear',
                                            p.update && 'Editar',
                                            p.delete && 'Borrar'
                                          ].filter(Boolean).join(', ')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
                      <UserIcon size={32} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold">Selecciona un usuario</p>
                      <p className="text-xs text-slate-500">Haz clic en un usuario para gestionar su rol.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900">Roles Definidos</h2>
                  {can('settings', 'create') && (
                    <button 
                      onClick={() => {
                        setEditingRole({ permissions: MODULES.reduce((acc, mod) => ({ ...acc, [mod.id]: { ...DEFAULT_PERMISSIONS } }), {}) });
                        setIsRoleModalOpen(true);
                      }}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {roles.map((role) => (
                    <div 
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        "p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between",
                        selectedRole?.id === role.id && "bg-indigo-50/50"
                      )}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{role.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{role.description}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {can('settings', 'update') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(role);
                              setIsRoleModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {role.id !== 'admin' && can('settings', 'delete') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Role Permissions Matrix */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedRole ? (
                  <motion.div
                    key={selectedRole.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                          <Shield size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedRole.name}</h3>
                            {can('settings', 'update') && (
                              <button 
                                onClick={() => {
                                  setEditingRole(selectedRole);
                                  setIsRoleModalOpen(true);
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Editar Permisos"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 font-medium">{selectedRole.description}</p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Usuarios</p>
                        <div className="flex -space-x-2 justify-end">
                          {users.filter(u => u.role === selectedRole.id).slice(0, 5).map((u, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={u.name}>
                              {u.name.charAt(0)}
                            </div>
                          ))}
                          {users.filter(u => u.role === selectedRole.id).length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                              +{users.filter(u => u.role === selectedRole.id).length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulo</th>
                            <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ver</th>
                            <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Crear</th>
                            <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Editar</th>
                            <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Borrar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {MODULES.map((mod) => {
                            const perms = selectedRole.permissions[mod.id] || DEFAULT_PERMISSIONS;
                            return (
                              <tr key={mod.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-6">
                                  <p className="text-sm font-bold text-slate-900">{mod.label}</p>
                                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Módulo de {mod.id}</p>
                                </td>
                                {(['read', 'create', 'update', 'delete'] as const).map((action) => (
                                  <td key={action} className="p-6 text-center">
                                    <div className="flex justify-center">
                                      {perms[action] ? (
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                          <CheckCircle2 size={14} />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                          <X size={14} />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-24 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
                      <Shield size={32} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold">Selecciona un rol</p>
                      <p className="text-xs text-slate-500">Haz clic en un rol para ver su matriz de permisos detallada.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* User Creation Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedUser ? 'Editar Usuario' : 'Dar de Alta Usuario'}
                </h3>
                <button 
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setSelectedUser(null);
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserRole('');
                  }} 
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                  <input 
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                  <input 
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asignar Rol Inicial</label>
                  <select 
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Seleccionar rol...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setSelectedUser(null);
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserRole('');
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateUser}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  {selectedUser ? 'Guardar Cambios' : 'Guardar Usuario'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Creation/Edit Modal */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingRole.id ? 'Editar Rol' : 'Nuevo Rol Personalizado'}
                </h3>
                <button onClick={() => setIsRoleModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre del Rol</label>
                    <input 
                      type="text"
                      value={editingRole.name || ''}
                      onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Ej. Supervisor de Ventas"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
                    <input 
                      type="text"
                      value={editingRole.description || ''}
                      onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Breve descripción de las responsabilidades"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matriz de Permisos</label>
                  <div className="border border-slate-200 rounded-3xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulo</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ver</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Crear</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Editar</th>
                          <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Borrar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {MODULES.map((mod) => {
                          const perms = editingRole.permissions?.[mod.id] || { ...DEFAULT_PERMISSIONS };
                          return (
                            <tr key={mod.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-4">
                                <span className="text-sm font-bold text-slate-900">{mod.label}</span>
                              </td>
                              {(['read', 'create', 'update', 'delete'] as const).map((action) => (
                                <td key={action} className="p-4 text-center">
                                  <button 
                                    onClick={() => togglePermission(mod.id, action)}
                                    className={cn(
                                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto",
                                      perms[action] 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                                        : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                                    )}
                                  >
                                    {perms[action] ? <CheckCircle2 size={16} /> : <X size={16} />}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveRole}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Guardar Configuración de Rol
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
