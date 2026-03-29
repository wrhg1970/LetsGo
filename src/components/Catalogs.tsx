import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Plane, 
  MapPin, 
  Heart,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { TravelPreference, Airport, Airline } from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { CheckCircle2 } from 'lucide-react';

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

const Catalogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'airports' | 'airlines'>('preferences');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [preferences, setPreferences] = useState<TravelPreference[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);

  useEffect(() => {
    setLoading(true);
    const qPref = query(collection(db, 'catalog_preferences'), orderBy('name'));
    const qAir = query(collection(db, 'catalog_airports'), orderBy('name'));
    const qLine = query(collection(db, 'catalog_airlines'), orderBy('name'));

    const unsubPref = onSnapshot(qPref, (snap) => {
      setPreferences(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TravelPreference)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'catalog_preferences'));

    const unsubAir = onSnapshot(qAir, (snap) => {
      setAirports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Airport)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'catalog_airports'));

    const unsubLine = onSnapshot(qLine, (snap) => {
      setAirlines(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Airline)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'catalog_airlines'));

    return () => {
      unsubPref();
      unsubAir();
      unsubLine();
    };
  }, []);

  const filteredData = () => {
    const term = searchTerm.toLowerCase();
    if (activeTab === 'preferences') {
      return preferences.filter(p => p.name.toLowerCase().includes(term));
    } else if (activeTab === 'airports') {
      return airports.filter(a => a.name.toLowerCase().includes(term) || a.code.toLowerCase().includes(term));
    } else {
      return airlines.filter(a => a.name.toLowerCase().includes(term) || a.code.toLowerCase().includes(term));
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;

    try {
      if (activeTab === 'preferences') {
        if (editingItem) {
          await updateDoc(doc(db, 'catalog_preferences', editingItem.id), { name });
          setToast({ message: 'Preferencia actualizada con éxito', type: 'success' });
        } else {
          await addDoc(collection(db, 'catalog_preferences'), { name });
          setToast({ message: 'Preferencia creada con éxito', type: 'success' });
        }
      } else if (activeTab === 'airports') {
        if (editingItem) {
          await updateDoc(doc(db, 'catalog_airports', editingItem.id), { name, code });
          setToast({ message: 'Aeropuerto actualizado con éxito', type: 'success' });
        } else {
          await addDoc(collection(db, 'catalog_airports'), { name, code });
          setToast({ message: 'Aeropuerto creado con éxito', type: 'success' });
        }
      } else {
        if (editingItem) {
          await updateDoc(doc(db, 'catalog_airlines', editingItem.id), { name, code });
          setToast({ message: 'Aerolínea actualizada con éxito', type: 'success' });
        } else {
          await addDoc(collection(db, 'catalog_airlines'), { name, code });
          setToast({ message: 'Aerolínea creada con éxito', type: 'success' });
        }
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      const path = activeTab === 'preferences' ? 'catalog_preferences' : activeTab === 'airports' ? 'catalog_airports' : 'catalog_airlines';
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, path);
      setToast({ message: 'Error al guardar el registro', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const path = activeTab === 'preferences' ? 'catalog_preferences' : activeTab === 'airports' ? 'catalog_airports' : 'catalog_airlines';
      await deleteDoc(doc(db, path, itemToDelete));
      setToast({ message: 'Registro eliminado con éxito', type: 'success' });
      setItemToDelete(null);
    } catch (error) {
      const path = activeTab === 'preferences' ? 'catalog_preferences' : activeTab === 'airports' ? 'catalog_airports' : 'catalog_airlines';
      handleFirestoreError(error, OperationType.DELETE, path);
      setToast({ message: 'Error al eliminar el registro', type: 'error' });
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Catálogos</h1>
          <p className="text-slate-500 font-medium">Administración de datos maestros del sistema.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus size={20} /> Nuevo Registro
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('preferences')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'preferences' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Heart size={18} /> Preferencias
        </button>
        <button
          onClick={() => setActiveTab('airports')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'airports' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <MapPin size={18} /> Aeropuertos
        </button>
        <button
          onClick={() => setActiveTab('airlines')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'airlines' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Plane size={18} /> Aerolíneas
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder={`Buscar en ${activeTab === 'preferences' ? 'preferencias' : activeTab === 'airports' ? 'aeropuertos' : 'aerolíneas'}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre</th>
                {(activeTab === 'airports' || activeTab === 'airlines') && (
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</th>
                )}
                <th className="px-8 py-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData().map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{item.name}</p>
                  </td>
                  {(activeTab === 'airports' || activeTab === 'airlines') && (
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                        {item.code}
                      </span>
                    </td>
                  )}
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <span className="sr-only">Editar</span>
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setItemToDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <span className="sr-only">Eliminar</span>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData().length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'preferences' ? 2 : 3} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <AlertCircle size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">No se encontraron registros.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingItem ? 'Editar' : 'Nuevo'} {activeTab === 'preferences' ? 'Preferencia' : activeTab === 'airports' ? 'Aeropuerto' : 'Aerolínea'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                    <input 
                      name="name"
                      defaultValue={editingItem?.name}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="Ej. Asiento en Pasillo"
                    />
                  </div>

                  {(activeTab === 'airports' || activeTab === 'airlines') && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Código</label>
                      <input 
                        name="code"
                        defaultValue={editingItem?.code}
                        required
                        maxLength={activeTab === 'airports' ? 3 : 2}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all uppercase"
                        placeholder={activeTab === 'airports' ? 'Ej. MEX' : 'Ej. AM'}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {itemToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Eliminar Registro</h3>
                <p className="text-sm text-slate-500">¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default Catalogs;
