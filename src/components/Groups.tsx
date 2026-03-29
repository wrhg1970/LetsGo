import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  Trash2, 
  Edit2, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  User as UserIcon, 
  Calendar, 
  DollarSign, 
  Calculator, 
  Tag, 
  AlertCircle, 
  TrendingUp, 
  Users,
  CreditCard,
  Phone,
  Mail,
  Truck,
  ArrowRight,
  Printer,
  FileText,
  LayoutDashboard,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Group, Client, Supplier, Currency, GroupPayment } from '../types';
import { cn } from '../lib/utils';
import { formatCurrency, convertToMXN, EXCHANGE_RATES } from '../lib/currency';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

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

const GroupModal = ({ 
  suppliers, 
  clients,
  onClose, 
  onSave, 
  group 
}: { 
  suppliers: Supplier[], 
  clients: Client[],
  onClose: () => void, 
  onSave: (group: any) => void, 
  group?: Group 
}) => {
  const [formData, setFormData] = useState<Partial<Group>>(group || {
    name: '',
    contactName: '',
    phone: '',
    email: '',
    startDate: '',
    endDate: '',
    supplierId: '',
    supplierName: '',
    price: 0,
    cost: 0,
    serviceFee: 0,
    tax: 0,
    others: 0,
    total: 0,
    currency: 'MXN' as Currency,
    exchangeRate: 1,
    status: 'active',
    clientIds: [],
    targetParticipants: 1
  });

  const [clientSearch, setClientSearch] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => s.products?.some(p => p.type === 'Grupos'));
  }, [suppliers]);

  const calculateTotalPerPerson = () => {
    return (Number(formData.price) || 0) + 
           (Number(formData.serviceFee) || 0) + 
           (Number(formData.tax) || 0) + 
           (Number(formData.others) || 0);
  };

  const totalPerPerson = useMemo(() => calculateTotalPerPerson(), [formData.price, formData.serviceFee, formData.tax, formData.others]);
  const marginPerPerson = totalPerPerson - (Number(formData.cost) || 0);
  const participantsCount = formData.targetParticipants || 1;
  const groupTotal = totalPerPerson * participantsCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      total: totalPerPerson,
      supplierName: suppliers.find(s => s.id === formData.supplierId)?.commercialName || ''
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{group ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> Información del Grupo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Grupo</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Ej. Boda Familia Pérez"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contacto Principal</label>
                <input 
                  required
                  type="text"
                  value={formData.contactName}
                  onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Dates & Supplier */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Logística y Proveedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Salida</label>
                <input 
                  required
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha Regreso</label>
                <input 
                  required
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Proveedor Principal</label>
                <select 
                  required
                  value={formData.supplierId}
                  onChange={e => {
                    const supplier = suppliers.find(s => s.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      supplierId: e.target.value,
                      supplierName: supplier?.commercialName || ''
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="">Seleccionar Proveedor</option>
                  {filteredSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.commercialName}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Participants Selection */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Vincular Participantes
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {clients
                  .filter(c => 
                    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    c.email.toLowerCase().includes(clientSearch.toLowerCase())
                  )
                  .map(client => {
                    const isSelected = formData.clientIds?.includes(client.id);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          const currentIds = formData.clientIds || [];
                          if (isSelected) {
                            setFormData({ ...formData, clientIds: currentIds.filter(id => id !== client.id) });
                          } else {
                            setFormData({ ...formData, clientIds: [...currentIds, client.id] });
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          isSelected 
                            ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          <UserIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-xs font-bold truncate", isSelected ? "text-indigo-900" : "text-slate-700")}>{client.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{client.email}</p>
                        </div>
                        {isSelected && <CheckCircle2 size={14} className="ml-auto text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          </section>

          {/* Financials */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={14} /> Finanzas del Grupo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Participantes</label>
                <input 
                  type="number"
                  min="1"
                  value={formData.targetParticipants}
                  onChange={e => setFormData({ ...formData, targetParticipants: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Precio p/p</label>
                <input 
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Costo p/p</label>
                <input 
                  type="number"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border-rose-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Margen p/p</label>
                <div className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold text-emerald-700">
                  {formatCurrency(marginPerPerson)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Servicio</label>
                <input 
                  type="number"
                  value={formData.serviceFee}
                  onChange={e => setFormData({ ...formData, serviceFee: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IVA</label>
                <input 
                  type="number"
                  value={formData.tax}
                  onChange={e => setFormData({ ...formData, tax: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Otros</label>
                <input 
                  type="number"
                  value={formData.others}
                  onChange={e => setFormData({ ...formData, others: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                <select 
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-xl">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total p/p</p>
                  <h4 className="text-2xl font-black mt-1">{formatCurrency(totalPerPerson)} {formData.currency}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margen Total p/p</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(marginPerPerson)}</p>
                </div>
              </div>

              <div className="p-6 bg-indigo-600 rounded-3xl text-white flex justify-between items-center shadow-xl shadow-indigo-100">
                <div>
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Total del Grupo ({participantsCount})</p>
                  <h4 className="text-2xl font-black mt-1">{formatCurrency(groupTotal)} {formData.currency}</h4>
                </div>
                {formData.currency !== 'MXN' && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">En MXN</p>
                    <p className="text-lg font-bold">{formatCurrency(groupTotal * (formData.exchangeRate || 1))} MXN</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            {group ? 'Guardar Cambios' : 'Crear Grupo'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StatementOfAccount = ({ 
  group, 
  client, 
  payments 
}: { 
  group: Group, 
  client: Client, 
  payments: GroupPayment[] 
}) => {
  const clientPayments = payments.filter(p => p.clientId === client.id && p.status === 'cleared');
  const totalPaid = clientPayments.reduce((acc, p) => acc + p.amount, 0);
  const balance = group.total - totalPaid;

  return (
    <div className="p-12 bg-white text-slate-900 font-sans max-w-4xl mx-auto" id="statement-of-account">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Estado de Cuenta</h1>
          <p className="text-slate-500 font-bold mt-2">Grupo: {group.name}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">Viajes Especializados</h2>
          <p className="text-sm text-slate-500">Fecha de Emisión: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Información del Cliente</h3>
          <p className="text-lg font-bold">{client.name}</p>
          <p className="text-slate-600">{client.email}</p>
          <p className="text-slate-600">{client.phone}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Resumen Financiero</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-500">Costo Total:</span>
              <span className="font-bold">{formatCurrency(group.total)} {group.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-500">Total Pagado:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)} {group.currency}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between">
              <span className="font-black uppercase text-xs tracking-widest">Saldo Pendiente:</span>
              <span className="font-black text-indigo-600">{formatCurrency(balance)} {group.currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Detalle de Pagos</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-3 text-xs font-black uppercase tracking-widest">Fecha</th>
              <th className="py-3 text-xs font-black uppercase tracking-widest">Método</th>
              <th className="py-3 text-xs font-black uppercase tracking-widest text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientPayments.map(p => (
              <tr key={p.id}>
                <td className="py-4 text-sm font-medium">{p.date}</td>
                <td className="py-4 text-sm font-medium">{p.method}</td>
                <td className="py-4 text-sm font-bold text-right">{formatCurrency(p.amount)} {p.currency}</td>
              </tr>
            ))}
            {clientPayments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-400 italic">No se han registrado pagos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-24 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
        Este documento es un comprobante informativo de pagos realizados.
      </div>
    </div>
  );
};

const ClientQuickEditModal = ({ 
  client, 
  onClose, 
  onSave 
}: { 
  client: Client, 
  onClose: () => void, 
  onSave: (updated: Client) => void 
}) => {
  const [formData, setFormData] = useState({ ...client });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDoc(doc(db, 'clients', client.id), formData);
    onSave(formData);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Editar Pasajero</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <input 
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
            <input 
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4"
          >
            Guardar Cambios
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const GroupDetails = ({ 
  group, 
  clients, 
  suppliers,
  onClose, 
  onUpdate,
  onUpdateClient
}: { 
  group: Group, 
  clients: Client[], 
  suppliers: Supplier[],
  onClose: () => void, 
  onUpdate: (group: Group) => void,
  onUpdateClient: (client: Client) => void
}) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'payments'>('clients');
  const [showAddClient, setShowAddClient] = useState(false);
  const [payments, setPayments] = useState<GroupPayment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    currency: group.currency,
    exchangeRate: group.exchangeRate,
    method: 'Transferencia'
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClientPayments, setViewingClientPayments] = useState<Client | null>(null);
  const [editingPayment, setEditingPayment] = useState<GroupPayment | null>(null);

  useEffect(() => {
    const fetchPayments = () => {
      const q = query(collection(db, 'groupPayments'), where('groupId', '==', group.id));
      const unsubscribe = onSnapshot(q, (snap) => {
        setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupPayment)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'groupPayments');
      });
      return unsubscribe;
    };
    return fetchPayments();
  }, [group.id]);

  const handleUpdateSupplier = async (supplierId: string) => {
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;
      
      const updatedGroup = { 
        ...group, 
        supplierId, 
        supplierName: supplier.commercialName 
      };
      
      await updateDoc(doc(db, 'groups', group.id), { 
        supplierId, 
        supplierName: supplier.commercialName 
      });
      
      onUpdate(updatedGroup);
      setIsEditingSupplier(false);
      setToast({ message: 'Proveedor actualizado correctamente', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'groupPayments', paymentId), { status: 'cleared' });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'cleared' } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groupPayments/${paymentId}`);
    }
  };

  const handlePrintStatement = (client: Client) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clientPayments = payments.filter(p => p.clientId === client.id && p.status === 'cleared');
    const totalPaid = clientPayments.reduce((acc, p) => acc + p.amount, 0);
    const balance = group.total - totalPaid;

    const html = `
      <html>
        <head>
          <title>Estado de Cuenta - ${client.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; margin: 0; }
            }
          </style>
        </head>
        <body class="bg-white">
          <div class="p-12 max-w-4xl mx-auto">
            <div class="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-12">
              <div>
                <h1 class="text-5xl font-black uppercase tracking-tighter text-slate-900">Estado de Cuenta</h1>
                <p class="text-slate-500 font-bold mt-2 text-lg">Grupo: ${group.name}</p>
              </div>
              <div class="text-right">
                <h2 class="text-2xl font-black text-indigo-600 tracking-tight">Viajes Especializados</h2>
                <p class="text-sm text-slate-500 font-medium mt-1">Fecha: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-16 mb-16">
              <div>
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Información del Pasajero</h3>
                <p class="text-2xl font-black text-slate-900">${client.name}</p>
                <div class="mt-4 space-y-1 text-slate-600 font-medium">
                  <p>${client.email}</p>
                  <p>${client.phone}</p>
                </div>
              </div>
              <div class="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Resumen de Cuenta</h3>
                <div class="space-y-4">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-500">Costo Total:</span>
                    <span class="text-lg font-black text-slate-900">${formatCurrency(group.total)} ${group.currency}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-500">Total Pagado:</span>
                    <span class="text-lg font-black text-emerald-600">${formatCurrency(totalPaid)} ${group.currency}</span>
                  </div>
                  <div class="pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                    <span class="text-xs font-black uppercase tracking-widest text-slate-900">Saldo Pendiente:</span>
                    <span class="text-2xl font-black text-indigo-600">${formatCurrency(balance)} ${group.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-16">
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Historial Detallado de Pagos</h3>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b-2 border-slate-900">
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Fecha de Pago</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Método</th>
                    <th class="py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right">Monto Recibido</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${clientPayments.map(p => `
                    <tr>
                      <td class="py-5 text-sm font-bold text-slate-700">${p.date}</td>
                      <td class="py-5 text-sm font-medium text-slate-500">${p.method}</td>
                      <td class="py-5 text-sm font-black text-slate-900 text-right">${formatCurrency(p.amount)} ${p.currency}</td>
                    </tr>
                  `).join('')}
                  ${clientPayments.length === 0 ? `
                    <tr>
                      <td colspan="3" class="py-12 text-center text-slate-400 font-medium italic">No se han registrado movimientos de pago aún.</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>

            <div class="mt-32 pt-12 border-t border-slate-100 flex justify-between items-end">
              <div class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                Este documento es un comprobante oficial de los pagos registrados en nuestro sistema para el grupo ${group.name}.
              </div>
              <div class="text-right">
                <div class="w-48 border-b border-slate-900 mb-2 mx-auto"></div>
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-900">Firma Autorizada</p>
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close after printing
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const groupClients = useMemo(() => {
    return clients.filter(c => group.clientIds.includes(c.id));
  }, [clients, group.clientIds]);

  const handleAddClient = async (clientId: string) => {
    if (group.clientIds.includes(clientId)) return;
    try {
      const updatedGroup = { ...group, clientIds: [...group.clientIds, clientId] };
      await updateDoc(doc(db, 'groups', group.id), { clientIds: updatedGroup.clientIds });
      onUpdate(updatedGroup);
      setShowAddClient(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    try {
      const updatedGroup = { ...group, clientIds: group.clientIds.filter(id => id !== clientId) };
      await updateDoc(doc(db, 'groups', group.id), { clientIds: updatedGroup.clientIds });
      onUpdate(updatedGroup);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedClientId || paymentData.amount <= 0) return;
    
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const amountMXN = paymentData.amount * paymentData.exchangeRate;
      
      const payment: Omit<GroupPayment, 'id'> = {
        groupId: group.id,
        clientId: selectedClientId,
        clientName: client?.name || 'Desconocido',
        amount: paymentData.amount,
        currency: paymentData.currency,
        exchangeRate: paymentData.exchangeRate,
        amountMXN: amountMXN,
        method: paymentData.method,
        date: editingPayment ? editingPayment.date : new Date().toISOString().split('T')[0],
        status: editingPayment ? editingPayment.status : 'cleared'
      };

      if (editingPayment) {
        await updateDoc(doc(db, 'groupPayments', editingPayment.id), payment);
        setPayments(payments.map(p => p.id === editingPayment.id ? { id: p.id, ...payment } : p));
        setToast({ message: 'Pago actualizado correctamente', type: 'success' });
      } else {
        const docRef = await addDoc(collection(db, 'groupPayments'), payment);
        setPayments([...payments, { id: docRef.id, ...payment }]);
        setToast({ message: 'Pago registrado y balance actualizado', type: 'success' });
      }

      setShowAddPayment(false);
      setEditingPayment(null);
      setSelectedClientId('');
      setPaymentData({
        amount: 0,
        currency: group.currency,
        exchangeRate: group.exchangeRate,
        method: 'Transferencia'
      });
    } catch (error) {
      handleFirestoreError(error, editingPayment ? OperationType.UPDATE : OperationType.CREATE, editingPayment ? `groupPayments/${editingPayment.id}` : 'groupPayments');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este pago?')) {
      try {
        await deleteDoc(doc(db, 'groupPayments', id));
        setPayments(payments.filter(p => p.id !== id));
        setToast({ message: 'Pago eliminado correctamente', type: 'success' });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `groupPayments/${id}`);
      }
    }
  };

  const getClientBalance = (clientId: string) => {
    const totalPaid = payments
      .filter(p => p.clientId === clientId && p.status === 'cleared')
      .reduce((acc, p) => acc + p.amount, 0);
    return group.total - totalPaid;
  };

  const totalGroupPaid = useMemo(() => {
    return payments
      .filter(p => p.status === 'cleared')
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const totalGroupExpected = group.total * group.clientIds.length;
  const totalGroupBalance = totalGroupExpected - totalGroupPaid;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{group.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {isEditingSupplier ? (
                  <div className="flex items-center gap-2">
                    <select 
                      value={group.supplierId}
                      onChange={e => handleUpdateSupplier(e.target.value)}
                      className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Seleccionar Proveedor</option>
                      {suppliers
                        .filter(s => s.products?.some(p => p.type === 'Grupos'))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.commercialName}</option>
                        ))}
                    </select>
                    <button 
                      onClick={() => setIsEditingSupplier(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/supplier">
                    <p className="text-xs text-slate-500 font-medium">Proveedor: {group.supplierName}</p>
                    <button 
                      onClick={() => setIsEditingSupplier(true)}
                      className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover/supplier:opacity-100 transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden md:block" />
            <div className="hidden md:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Participantes</p>
              <p className="text-lg font-black text-slate-900">
                {group.clientIds.length} <span className="text-xs text-slate-400 font-bold">/ {group.targetParticipants || group.clientIds.length}</span>
              </p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden md:block" />
            <div className="hidden md:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Proyectado</p>
              <p className="text-lg font-black text-emerald-600">
                {formatCurrency((group.total - (group.cost || 0)) * (group.targetParticipants || group.clientIds.length))} <span className="text-xs font-bold uppercase">{group.currency}</span>
              </p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden lg:block" />
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
              <p className="text-lg font-black text-indigo-600">
                {formatCurrency(totalGroupBalance)} <span className="text-xs font-bold uppercase">{group.currency}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-900 px-8 py-3 flex items-center gap-8 text-white/50 text-[10px] font-bold uppercase tracking-widest overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white/30">Precio p/p:</span>
            <span className="text-white">{formatCurrency(group.total)} {group.currency}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white/30">Costo p/p:</span>
            <span className="text-white">{formatCurrency(group.cost || 0)} {group.currency}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white/30">Margen p/p:</span>
            <span className="text-emerald-400">{formatCurrency(group.total - (group.cost || 0))} {group.currency}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white/30">Total Grupo (Proyectado):</span>
            <span className="text-indigo-400">{formatCurrency(group.total * (group.targetParticipants || group.clientIds.length))} {group.currency}</span>
          </div>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50/30 px-6">
          <button 
            onClick={() => setActiveTab('clients')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'clients' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Clientes ({groupClients.length})
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'payments' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Pagos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'clients' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Pasajeros Vinculados</h3>
                <button 
                  onClick={() => setShowAddClient(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Vincular Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupClients.map(client => (
                  <div key={client.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{client.name}</p>
                        <p className="text-[10px] text-slate-500">Saldo: {formatCurrency(getClientBalance(client.id))} {group.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setViewingClientPayments(client)}
                        title="Ver Pagos"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingClient(client)}
                        title="Editar Pasajero"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handlePrintStatement(client)}
                        title="Imprimir Estado de Cuenta"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveClient(client.id)}
                        title="Eliminar del Grupo"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {groupClients.length === 0 && (
                  <div className="col-span-2 py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" strokeWidth={1} />
                    <p className="text-sm text-slate-500 font-medium">No hay clientes vinculados a este grupo.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Historial de Pagos</h3>
                <button 
                  onClick={() => setShowAddPayment(true)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> Registrar Pago
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group/row">
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">{p.date}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900">{p.clientName}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-600">{formatCurrency(p.amount)} {p.currency}</span>
                            {p.currency !== 'MXN' && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                T.C. {p.exchangeRate} = {formatCurrency(p.amountMXN)} MXN
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              p.status === 'cleared' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {p.status === 'cleared' ? 'Aplicado' : 'Pendiente'}
                            </span>
                            {p.status === 'pending' && (
                              <button 
                                onClick={() => handleConfirmPayment(p.id)}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Confirmar
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                setEditingPayment(p);
                                setSelectedClientId(p.clientId);
                                setPaymentData({
                                  amount: p.amount,
                                  currency: p.currency,
                                  exchangeRate: p.exchangeRate,
                                  method: p.method || 'Transferencia'
                                });
                                setShowAddPayment(true);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">No hay pagos registrados aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add Client Sub-Modal */}
        <AnimatePresence>
          {showAddClient && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[60] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-900">Vincular Cliente</h3>
                <button onClick={() => setShowAddClient(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {clients.filter(c => !group.clientIds.includes(c.id)).map(client => (
                  <button 
                    key={client.id}
                    onClick={() => handleAddClient(client.id)}
                    className="w-full p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm">
                        <UserIcon size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit Payment Sub-Modal */}
        <AnimatePresence>
          {showAddPayment && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[60] p-8 flex flex-col items-center justify-center"
            >
              <div className="w-full max-w-md space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingPayment ? 'Editar Pago' : 'Registrar Pago'}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowAddPayment(false);
                      setEditingPayment(null);
                      setSelectedClientId('');
                      setPaymentData({
                        amount: 0,
                        currency: group.currency,
                        exchangeRate: group.exchangeRate,
                        method: 'Transferencia'
                      });
                    }} 
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Seleccionar Cliente</label>
                    <select 
                      disabled={!!editingPayment}
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                    >
                      <option value="">Seleccionar Pasajero</option>
                      {groupClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                      <input 
                        type="number"
                        value={paymentData.amount}
                        onChange={e => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Moneda</label>
                      <select 
                        value={paymentData.currency}
                        onChange={e => {
                          const currency = e.target.value as Currency;
                          const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                          setPaymentData({ ...paymentData, currency, exchangeRate: rate });
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Cambio</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={paymentData.exchangeRate}
                        onChange={e => setPaymentData({ ...paymentData, exchangeRate: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cantidad MXP</label>
                      <div className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm font-black text-indigo-600">
                        {formatCurrency(paymentData.amount * paymentData.exchangeRate)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                    <select 
                      value={paymentData.method}
                      onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Depósito">Depósito</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleSavePayment}
                    disabled={!selectedClientId || paymentData.amount <= 0}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none mt-4"
                  >
                    {editingPayment ? 'Guardar Cambios' : 'Registrar Pago'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Payments Sub-Modal */}
        <AnimatePresence>
          {viewingClientPayments && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white/98 backdrop-blur-md z-[65] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pagos de {viewingClientPayments.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">Historial de abonos para este grupo</p>
                </div>
                <button onClick={() => setViewingClientPayments(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.filter(p => p.clientId === viewingClientPayments.id).map(p => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">{p.date}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.method}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-right">
                              <span className="text-xs font-black text-indigo-600">{formatCurrency(p.amount)} {p.currency}</span>
                              {p.status === 'pending' ? (
                                <button 
                                  onClick={() => handleConfirmPayment(p.id)}
                                  className="mt-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-end gap-1"
                                >
                                  <CheckCircle2 size={10} /> Confirmar
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Aplicado</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {payments.filter(p => p.clientId === viewingClientPayments.id).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm italic">No se han registrado pagos para este cliente.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Saldo Pendiente</p>
                  <p className="text-2xl font-black">{formatCurrency(getClientBalance(viewingClientPayments.id))} {group.currency}</p>
                </div>
                <button 
                  onClick={() => handlePrintStatement(viewingClientPayments)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Printer size={14} /> Imprimir Estado
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Quick Edit Modal */}
        <AnimatePresence>
          {editingClient && (
            <ClientQuickEditModal 
              client={editingClient}
              onClose={() => setEditingClient(null)}
              onSave={(updated) => {
                onUpdateClient(updated);
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Groups Dashboard Component
const GroupsDashboard = ({ 
  groups, 
  groupPayments,
  suppliers,
  onViewGroup
}: { 
  groups: Group[], 
  groupPayments: GroupPayment[],
  suppliers: Supplier[],
  onViewGroup: (group: Group) => void
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  const usdToMxn = EXCHANGE_RATES.find(r => r.from === 'USD' && r.to === 'MXN')?.rate || 20.5;

  const convertAmount = (amount: number, from: Currency) => {
    if (from === selectedCurrency) return amount;
    if (from === 'MXN' && selectedCurrency === 'USD') return amount / usdToMxn;
    if (from === 'USD' && selectedCurrency === 'MXN') return amount * usdToMxn;
    return amount;
  };

  const filteredGroups = groups.filter(g => {
    const yearMatch = new Date(g.startDate).getFullYear() === selectedYear;
    const supplierMatch = selectedSupplierId === 'all' || g.supplierId === selectedSupplierId;
    return yearMatch && supplierMatch;
  });

  const filteredPayments = groupPayments.filter(p => {
    const yearMatch = new Date(p.date).getFullYear() === selectedYear;
    const group = groups.find(g => g.id === p.groupId);
    const supplierMatch = selectedSupplierId === 'all' || (group && group.supplierId === selectedSupplierId);
    return yearMatch && supplierMatch;
  });

  const totalGroups = filteredGroups.length;
  const totalCollected = filteredPayments.reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0);
  const totalExpected = filteredGroups.reduce((acc, g) => acc + convertAmount(g.total * g.clientIds.length, g.currency), 0);
  const totalPending = totalExpected - totalCollected;

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const monthlyData = months.map((month, index) => {
    const monthGroups = filteredGroups.filter(g => new Date(g.startDate).getMonth() === index);
    const monthPayments = filteredPayments.filter(p => new Date(p.date).getMonth() === index);

    const totalTrips = monthGroups.length;
    const totalCash = monthPayments.filter(p => p.method === 'Efectivo').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0);
    const totalCard = monthPayments.filter(p => p.method === 'Tarjeta').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0);
    const totalGeneral = totalCash + totalCard;
    const monthExpected = monthGroups.reduce((acc, g) => acc + convertAmount(g.total * g.clientIds.length, g.currency), 0);
    const monthPending = monthExpected - totalGeneral;

    return {
      month,
      totalTrips,
      totalCash,
      totalCard,
      totalGeneral,
      totalPending,
      totalExpected: monthExpected
    };
  }).filter(m => m.totalTrips > 0 || m.totalGeneral > 0);

  const distributionData = [
    { name: 'Tarjeta', value: filteredPayments.filter(p => p.method === 'Tarjeta').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0) },
    { name: 'Efectivo', value: filteredPayments.filter(p => p.method === 'Efectivo').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0) }
  ];

  const COLORS = ['#6366f1', '#10b981'];

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard de Grupos</h2>
          <p className="text-slate-500 text-sm font-medium">Vista en tiempo real del rendimiento de tus grupos</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Moneda:</span>
            <select 
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Año:</span>
            <input 
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 w-24"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Proveedor:</span>
            <select 
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[150px]"
            >
              <option value="all">Todos</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.commercialName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total grupos', sub: 'Grupos activos/finalizados', value: totalGroups, color: 'text-indigo-600' },
          { label: 'Ingresos totales', sub: 'Total recaudado', value: formatCurrency(totalCollected, selectedCurrency), color: 'text-emerald-600' },
          { label: 'Total pendiente', sub: 'Por cobrar', value: formatCurrency(totalPending, selectedCurrency), color: 'text-rose-500' },
          { label: 'Monto esperado', sub: 'Proyección total', value: formatCurrency(totalExpected, selectedCurrency), color: 'text-slate-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">{stat.label}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.sub}</p>
            </div>
            <p className={cn("text-2xl font-black tracking-tight", stat.color)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monthly Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Monto total por mes</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Seguimiento de rendimiento mensual</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mes</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Viajes</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efectivo</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarjeta</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente</th>
                  <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esperado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-xs font-bold text-slate-600">{row.month}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{row.totalTrips}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(row.totalCash, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(row.totalCard, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(row.totalGeneral, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-rose-500">{formatCurrency(row.totalPending, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-900">{formatCurrency(row.totalExpected, selectedCurrency)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/50 font-black">
                  <td className="py-4 text-xs text-slate-900">Total</td>
                  <td className="py-4 text-xs text-slate-900">{totalGroups}</td>
                  <td className="py-4 text-xs text-slate-900">{formatCurrency(monthlyData.reduce((acc, r) => acc + r.totalCash, 0), selectedCurrency)}</td>
                  <td className="py-4 text-xs text-slate-900">{formatCurrency(monthlyData.reduce((acc, r) => acc + r.totalCard, 0), selectedCurrency)}</td>
                  <td className="py-4 text-xs text-slate-900">{formatCurrency(totalCollected, selectedCurrency)}</td>
                  <td className="py-4 text-xs text-rose-600">{formatCurrency(totalPending, selectedCurrency)}</td>
                  <td className="py-4 text-xs text-slate-900">{formatCurrency(totalExpected, selectedCurrency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Distribución de Pagos</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value, selectedCurrency)}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
              <p className="text-xs font-black text-indigo-600">{formatCurrency(distributionData[0].value, selectedCurrency)}</p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Tarjeta</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-xs font-black text-emerald-600">{formatCurrency(distributionData[1].value, selectedCurrency)}</p>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Efectivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Group Details Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Detalle de ingresos por grupo</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Seguimiento de rendimiento por grupo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grupo</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Salida</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efectivo</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarjeta</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esperado</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredGroups.map((group, i) => {
                const groupPaymentsForThis = filteredPayments.filter(p => p.groupId === group.id);
                const totalCash = groupPaymentsForThis.filter(p => p.method === 'Efectivo').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0);
                const totalCard = groupPaymentsForThis.filter(p => p.method === 'Tarjeta').reduce((acc, p) => acc + convertAmount(p.amount, p.currency), 0);
                const totalGeneral = totalCash + totalCard;
                const expected = convertAmount(group.total * group.clientIds.length, group.currency);
                const pending = expected - totalGeneral;

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-xs font-bold text-slate-900">{group.name}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{new Date(group.startDate).toLocaleDateString()}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(totalCash, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(totalCard, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-600">{formatCurrency(totalGeneral, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-rose-500">{formatCurrency(pending, selectedCurrency)}</td>
                    <td className="py-4 text-xs font-bold text-slate-900">{formatCurrency(expected, selectedCurrency)}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => onViewGroup(group)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groupPayments, setGroupPayments] = useState<GroupPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsSnap, clientsSnap, suppliersSnap, paymentsSnap] = await Promise.all([
          getDocs(collection(db, 'groups')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'suppliers')),
          getDocs(collection(db, 'groupPayments'))
        ]);
        setGroups(groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
        setSuppliers(suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
        setGroupPayments(paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupPayment)));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multiple');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveGroup = async (groupData: any) => {
    try {
      if (selectedGroup) {
        await updateDoc(doc(db, 'groups', selectedGroup.id), groupData);
        setGroups(groups.map(g => g.id === selectedGroup.id ? { ...g, ...groupData } : g));
      } else {
        const docRef = await addDoc(collection(db, 'groups'), {
          ...groupData,
          createdAt: new Date().toISOString()
        });
        setGroups([{ id: docRef.id, ...groupData, createdAt: new Date().toISOString() }, ...groups]);
      }
      setIsModalOpen(false);
      setSelectedGroup(null);
    } catch (error) {
      handleFirestoreError(error, selectedGroup ? OperationType.UPDATE : OperationType.CREATE, selectedGroup ? `groups/${selectedGroup.id}` : 'groups');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este grupo?')) {
      try {
        await deleteDoc(doc(db, 'groups', id));
        setGroups(groups.filter(g => g.id !== id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `groups/${id}`);
      }
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(g => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Grupos</h1>
          <p className="text-slate-500 font-medium">Organiza viajes grupales, bodas y convenciones.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Layers size={14} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('dashboard')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
          </div>
          <button 
            onClick={() => {
              setSelectedGroup(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> Nuevo Grupo
          </button>
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <GroupsDashboard 
          groups={groups} 
          groupPayments={groupPayments} 
          suppliers={suppliers} 
          onViewGroup={setViewingGroup}
        />
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nombre o contacto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <button className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
              <Filter size={18} /> Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <motion.div 
                layout
                key={group.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden"
              >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                  <Layers size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setSelectedGroup(group);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{group.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                  <UserIcon size={12} /> {group.contactName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Participantes</p>
                  <p className="text-xs font-black text-slate-700">
                    {group.clientIds.length} <span className="text-slate-400 font-bold">/ {group.targetParticipants || group.clientIds.length}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen p/p</p>
                  <p className="text-xs font-black text-emerald-600">
                    {formatCurrency(group.total - (group.cost || 0))} <span className="text-[10px] uppercase">{group.currency}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-indigo-600 font-black text-lg">
                  {formatCurrency(group.total)} <span className="text-[10px] font-bold uppercase">{group.currency}</span>
                </div>
                <button 
                  onClick={() => setViewingGroup(group)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  Gestionar <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  )}

  <AnimatePresence>
        {isModalOpen && (
          <GroupModal 
            suppliers={suppliers}
            clients={clients}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveGroup}
            group={selectedGroup || undefined}
          />
        )}
        {viewingGroup && (
          <GroupDetails 
            group={viewingGroup}
            clients={clients}
            suppliers={suppliers}
            onClose={() => setViewingGroup(null)}
            onUpdate={(updated) => {
              setGroups(groups.map(g => g.id === updated.id ? updated : g));
              setViewingGroup(updated);
            }}
            onUpdateClient={(updatedClient) => {
              setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
            }}
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
