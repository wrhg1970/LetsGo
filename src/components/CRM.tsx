import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronRight, Users, Package, X, Edit2, Trash2, CheckCircle2, AlertCircle, Layers, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Client, Group, TravelPreference } from '../types';
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
        "fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border",
        type === 'success' ? "bg-emerald-900 border-emerald-800 text-emerald-50" : "bg-rose-900 border-rose-800 text-rose-50"
      )}
    >
      {type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-rose-400" />}
      <span className="font-medium text-sm">{message}</span>
    </motion.div>
  );
};

// NewLeadModal Component
const NewLeadModal = ({ onClose, onSave }: { onClose: () => void, onSave: (client: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferences: [] as string[],
    tags: ''
  });
  const [availablePreferences, setAvailablePreferences] = useState<TravelPreference[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'catalog_preferences'), orderBy('name')));
        setAvailablePreferences(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TravelPreference)));
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoadingPrefs(false);
      }
    };
    fetchPrefs();
  }, []);

  const handlePreferenceToggle = (prefName: string) => {
    setFormData(prev => {
      const current = prev.preferences;
      if (current.includes(prefName)) {
        return { ...prev, preferences: current.filter(p => p !== prefName) };
      } else {
        return { ...prev, preferences: [...current, prefName] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      preferences: formData.preferences.join(', '), // Store as string for compatibility with existing display
      leadStatus: 'Nuevo',
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      bookings: []
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nuevo Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Teléfono</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Preferencias de Viaje</label>
            {loadingPrefs ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                {availablePreferences.map(pref => (
                  <label key={pref.id} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={formData.preferences.includes(pref.name)}
                      onChange={() => handlePreferenceToggle(pref.name)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                    />
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                      {pref.name}
                    </span>
                  </label>
                ))}
                {availablePreferences.length === 0 && (
                  <p className="text-xs text-slate-400 italic col-span-2">No hay preferencias configuradas en el catálogo.</p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Etiquetas (separadas por coma)</label>
            <input 
              type="text" 
              value={formData.tags}
              onChange={e => setFormData({...formData, tags: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ej. Europa, Lujo, VIP"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Crear Lead
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ClientDetailModal Component
const ClientDetailModal = ({ 
  client, 
  groups, 
  onClose, 
  onSave, 
  onLinkGroup 
}: { 
  client: any, 
  groups: Group[], 
  onClose: () => void, 
  onSave: (client: any) => void,
  onLinkGroup: (groupId: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState({ ...client });
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const navigate = useNavigate();
  const { can } = usePermissions();

  const handleSave = () => {
    onSave(editedClient);
    setIsEditing(false);
  };

  const handleCreateBooking = () => {
    navigate('/bookings', { state: { clientId: client.id, clientName: client.name } });
    onClose();
  };

  const clientGroups = useMemo(() => {
    return groups.filter(g => g.clientIds.includes(client.id));
  }, [groups, client.id]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div className="flex gap-5 items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
              {client.name.split(' ').map((n: any) => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  client.leadStatus === 'Calificado' ? "bg-emerald-100 text-emerald-700" :
                  client.leadStatus === 'Nuevo' ? "bg-blue-100 text-blue-700" :
                  client.leadStatus === 'Perdido' ? "bg-rose-100 text-rose-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {client.leadStatus}
                </span>
                <span className="text-xs text-slate-400 font-medium">ID: {client.id}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <section className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Información de Contacto</h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                  <input 
                    type="email"
                    disabled={!can('crm', 'update')}
                    value={editedClient.email}
                    onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                    className={cn(
                      "text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 transition-colors",
                      !can('crm', 'update') && "opacity-60 cursor-not-allowed bg-slate-100"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</span>
                  <p className="text-sm font-medium text-slate-700">{client.phone}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Estado del Lead</span>
                  <select 
                    disabled={!can('crm', 'update')}
                    value={editedClient.leadStatus}
                    onChange={(e) => setEditedClient({ ...editedClient, leadStatus: e.target.value })}
                    className={cn(
                      "text-sm font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 transition-colors",
                      !can('crm', 'update') && "opacity-60 cursor-not-allowed bg-slate-100"
                    )}
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Contactado">Contactado</option>
                    <option value="Calificado">Calificado</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preferencias & Tags</h3>
              <div className="space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed italic">"{client.preferences}"</p>
                <div className="flex flex-wrap gap-2">
                  {client.tags?.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Groups Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupos Vinculados</h3>
              {can('crm', 'update') && (
                <button 
                  onClick={() => setShowGroupSelector(true)}
                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Vincular a Grupo
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clientGroups.map(group => (
                <div key={group.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                      <Layers size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{group.name}</span>
                  </div>
                  <button 
                    onClick={() => navigate('/groups')}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
              {clientGroups.length === 0 && (
                <div className="col-span-2 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium italic">No pertenece a ningún grupo.</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historial de Reservas</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {client.bookings?.length || 0} Reservas
              </span>
            </div>
            <div className="space-y-3">
              {client.bookings && client.bookings.length > 0 ? (
                client.bookings.map((booking: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{booking.destination}</p>
                        <p className="text-xs text-slate-500">ID: {booking.id} • {booking.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{booking.amount}</p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        booking.status === 'Completado' ? "text-emerald-600" : "text-amber-600"
                      )}>{booking.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                  <p className="text-sm text-slate-400 italic">No hay historial de reservas para este cliente.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          {can('bookings', 'create') && (
            <button 
              onClick={handleCreateBooking}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Crear Nueva Reserva
            </button>
          )}
          {can('crm', 'update') && (
            <button 
              onClick={handleSave}
              className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-white transition-all"
            >
              Guardar Cambios
            </button>
          )}
        </div>

        {/* Group Selector Sub-Modal */}
        <AnimatePresence>
          {showGroupSelector && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[120] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900">Vincular a Grupo</h3>
                <button onClick={() => setShowGroupSelector(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {groups.filter(g => !g.clientIds.includes(client.id)).map(group => (
                  <button 
                    key={group.id}
                    onClick={() => {
                      onLinkGroup(group.id);
                      setShowGroupSelector(false);
                    }}
                    className="w-full p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm">
                        <Layers size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900">{group.name}</p>
                        <p className="text-xs text-slate-500">{group.startDate} - {group.endDate}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
                {groups.filter(g => !g.clientIds.includes(client.id)).length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No hay grupos disponibles para vincular.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export const CRM = () => {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { can } = usePermissions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsSnap, groupsSnap] = await Promise.all([
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'groups'))
        ]);
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
        setGroups(groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveClient = async (updatedClient: any) => {
    try {
      await updateDoc(doc(db, 'clients', updatedClient.id), updatedClient);
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setSelectedClient(null);
      setToast({ message: 'Cliente actualizado con éxito', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${updatedClient.id}`);
    }
  };

  const handleCreateLead = async (newClient: any) => {
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...newClient,
        createdAt: new Date().toISOString()
      });
      setClients(prev => [{ id: docRef.id, ...newClient }, ...prev]);
      setIsNewLeadModalOpen(false);
      setToast({ message: 'Nuevo lead creado correctamente', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleLinkGroup = async (groupId: string) => {
    if (!selectedClient) return;
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const updatedClientIds = [...group.clientIds, selectedClient.id];
      await updateDoc(doc(db, 'groups', groupId), { clientIds: updatedClientIds });
      
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, clientIds: updatedClientIds } : g));
      setToast({ message: `Cliente vinculado al grupo ${group.name}`, type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || c.leadStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const total = clients.length;
    const qualified = clients.filter(c => c.leadStatus === 'Calificado').length;
    const withBookings = clients.filter(c => c.bookings && c.bookings.length > 0).length;
    const conversionRate = total > 0 ? (withBookings / total) * 100 : 0;
    
    // New leads in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newLeads = clients.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) > thirtyDaysAgo;
    }).length;

    return { total, qualified, newLeads, conversionRate };
  }, [clients]);

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM Clientes</h1>
          <p className="text-slate-500 font-medium">Gestión de prospectos y fidelización de clientes.</p>
        </div>
        {can('crm', 'create') && (
          <button 
            onClick={() => setIsNewLeadModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Plus size={20} /> Nuevo Lead
          </button>
        )}
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Clientes</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.total}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
            <Plus size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuevos Leads (30d)</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.newLeads}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leads Calificados</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.qualified}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasa de Conversión</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.conversionRate.toFixed(1)}%</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="all">Todos los Estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Contactado">Contactado</option>
            <option value="Calificado">Calificado</option>
            <option value="Perdido">Perdido</option>
          </select>
          <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={18} /> Filtros Avanzados
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preferencias</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última Actividad</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client, i) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-100">
                        {client.name.split(' ').map((n: any) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      client.leadStatus === 'Calificado' ? "bg-emerald-50 text-emerald-600" :
                      client.leadStatus === 'Nuevo' ? "bg-blue-50 text-blue-600" :
                      client.leadStatus === 'Perdido' ? "bg-rose-50 text-rose-600" :
                      "bg-slate-50 text-slate-600"
                    )}>
                      {client.leadStatus}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-1.5 flex-wrap max-w-[250px]">
                      {client.tags?.map((tag: string, j: number) => (
                        <span key={j} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-slate-500">Hace {i + 1} horas</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Seguimiento Pendiente</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => setSelectedClient(client)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <AlertCircle size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">No se encontraron clientes con los criterios de búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedClient && (
          <ClientDetailModal 
            client={selectedClient} 
            groups={groups}
            onClose={() => setSelectedClient(null)} 
            onSave={handleSaveClient}
            onLinkGroup={handleLinkGroup}
          />
        )}
        {isNewLeadModalOpen && (
          <NewLeadModal 
            onClose={() => setIsNewLeadModalOpen(false)} 
            onSave={handleCreateLead} 
          />
        )}
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
