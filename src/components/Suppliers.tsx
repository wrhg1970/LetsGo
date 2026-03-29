import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Truck, Package, Trash2, Edit2, X, ChevronRight, CreditCard, Building2, Mail, Phone, MapPin, Hash, Calendar, DollarSign, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier, BankAccount, SupplierProduct, Currency } from '../types';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/currency';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  React.useEffect(() => {
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

const NewSupplierModal = ({ onClose, onSave }: { onClose: () => void, onSave: (supplier: Supplier) => void }) => {
  const [formData, setFormData] = useState({
    legalName: '',
    commercialName: '',
    address: '',
    phone: '',
    email: '',
    rfc: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      bankAccounts: [],
      products: []
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
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nuevo Proveedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Legal</label>
              <input 
                required
                type="text" 
                value={formData.legalName}
                onChange={e => setFormData({...formData, legalName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="Razón Social"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Comercial</label>
              <input 
                required
                type="text" 
                value={formData.commercialName}
                onChange={e => setFormData({...formData, commercialName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="Nombre de la Marca"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">RFC</label>
              <input 
                required
                type="text" 
                value={formData.rfc}
                onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="RFC123456XYZ"
                pattern="^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$"
                title="RFC debe tener 12 o 13 caracteres (3-4 letras, 6 números, 3 alfanuméricos)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
              <input 
                required
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
            <input 
              required
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="contacto@proveedor.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dirección</label>
            <textarea 
              required
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
              placeholder="Dirección completa..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Guardar Proveedor
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const NewProductModal = ({ onClose, onSave }: { onClose: () => void, onSave: (product: SupplierProduct) => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Vuelo',
    cost: 0,
    currency: 'MXN' as Currency,
    validity: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation for validity date (must be future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validityDate = new Date(formData.validity);
    if (validityDate <= today) {
      setError('La fecha de vigencia debe ser una fecha futura.');
      return;
    }

    onSave({
      id: Math.random().toString(36).substr(2, 9),
      ...formData
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nuevo Producto</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Producto</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ej. Vuelo Redondo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="Vuelo">Vuelo</option>
              <option value="Hotel">Hotel</option>
              <option value="Tour">Tour</option>
              <option value="Traslado">Traslado</option>
              <option value="Seguro">Seguro</option>
              <option value="Grupos">Grupos</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Costo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  required
                  type="number" 
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Moneda</label>
              <select 
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value as Currency})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vigencia</label>
            <input 
              required
              type="date" 
              value={formData.validity}
              onChange={e => setFormData({...formData, validity: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Añadir Producto
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const NewBankAccountModal = ({ onClose, onSave }: { onClose: () => void, onSave: (account: BankAccount) => void }) => {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    clabe: '',
    reference: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      ...formData
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nueva Cuenta Bancaria</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Banco</label>
            <input 
              required
              type="text" 
              value={formData.bankName}
              onChange={e => setFormData({...formData, bankName: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ej. BBVA"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Número de Cuenta</label>
            <input 
              required
              type="text" 
              value={formData.accountNumber}
              onChange={e => setFormData({...formData, accountNumber: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="1234567890"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">CLABE</label>
            <input 
              required
              type="text" 
              value={formData.clabe}
              onChange={e => setFormData({...formData, clabe: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="012345678901234567"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Referencia (Opcional)</label>
            <input 
              type="text" 
              value={formData.reference}
              onChange={e => setFormData({...formData, reference: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="Referencia de pago"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Añadir Cuenta
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const SupplierDetailModal = ({ supplier, onClose, onUpdate }: { supplier: Supplier, onClose: () => void, onUpdate: (supplier: Supplier) => void }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'accounts' | 'products'>('info');
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState<Supplier>(supplier);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState<SupplierProduct | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountData, setEditAccountData] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleAddProduct = (product: SupplierProduct) => {
    onUpdate({
      ...supplier,
      products: [...supplier.products, product]
    });
    setIsNewProductModalOpen(false);
  };

  const handleAddAccount = (account: BankAccount) => {
    onUpdate({
      ...supplier,
      bankAccounts: [...supplier.bankAccounts, account]
    });
    setIsNewAccountModalOpen(false);
  };

  const handleSaveInfo = () => {
    onUpdate(editFormData);
    setIsEditingInfo(false);
  };

  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      onUpdate({
        ...supplier,
        products: supplier.products.filter(p => p.id !== productToDelete)
      });
      setProductToDelete(null);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      onUpdate({
        ...supplier,
        bankAccounts: supplier.bankAccounts.filter(a => a.id !== accountToDelete)
      });
      setAccountToDelete(null);
    }
  };

  const handleStartEditProduct = (product: SupplierProduct) => {
    setEditingProductId(product.id);
    setEditProductData({ ...product });
  };

  const handleSaveProduct = () => {
    if (!editProductData) return;
    onUpdate({
      ...supplier,
      products: supplier.products.map(p => p.id === editProductData.id ? editProductData : p)
    });
    setEditingProductId(null);
    setEditProductData(null);
  };

  const handleStartEditAccount = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditAccountData({ ...account });
  };

  const handleSaveAccount = () => {
    if (!editAccountData) return;
    onUpdate({
      ...supplier,
      bankAccounts: supplier.bankAccounts.map(a => a.id === editAccountData.id ? editAccountData : a)
    });
    setEditingAccountId(null);
    setEditAccountData(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
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
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div className="flex gap-5 items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
              {supplier.commercialName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{supplier.commercialName}</h2>
              <p className="text-sm text-slate-500 font-medium">{supplier.legalName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                isEditingInfo ? "bg-indigo-600 text-white" : "hover:bg-white text-slate-400 hover:text-indigo-600"
              )}
            >
              <Edit2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-100 px-8 bg-white">
          {[
            { id: 'info', label: 'Información General', icon: Building2 },
            { id: 'accounts', label: 'Cuentas Bancarias', icon: CreditCard },
            { id: 'products', label: 'Productos y Costos', icon: Package }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 py-4 px-6 text-sm font-bold transition-all border-b-2",
                activeTab === tab.id 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {isEditingInfo ? (
                  <div className="grid grid-cols-2 gap-6 bg-white p-8 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-500/5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Legal</label>
                        <input 
                          type="text" 
                          value={editFormData.legalName}
                          onChange={e => setEditFormData({...editFormData, legalName: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Comercial</label>
                        <input 
                          type="text" 
                          value={editFormData.commercialName}
                          onChange={e => setEditFormData({...editFormData, commercialName: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">RFC</label>
                        <input 
                          required
                          type="text" 
                          value={editFormData.rfc}
                          onChange={e => setEditFormData({...editFormData, rfc: e.target.value.toUpperCase()})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                          pattern="^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$"
                          title="RFC debe tener 12 o 13 caracteres (3-4 letras, 6 números, 3 alfanuméricos)"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teléfono</label>
                        <input 
                          type="text" 
                          value={editFormData.phone}
                          onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                        <input 
                          type="email" 
                          value={editFormData.email}
                          onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dirección</label>
                        <textarea 
                          value={editFormData.address}
                          onChange={e => setEditFormData({...editFormData, address: e.target.value})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 pt-4">
                      <button 
                        onClick={() => {
                          setIsEditingInfo(false);
                          setEditFormData(supplier);
                        }}
                        className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveInfo}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datos Fiscales</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Hash size={16} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">RFC</p>
                              <p className="text-sm font-bold text-slate-700">{supplier.rfc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Dirección</p>
                              <p className="text-sm font-medium text-slate-700">{supplier.address}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacto</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Phone size={16} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p>
                              <p className="text-sm font-bold text-slate-700">{supplier.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail size={16} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                              <p className="text-sm font-bold text-slate-700">{supplier.email}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'accounts' && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuentas Bancarias Registradas</h3>
                  <button 
                    onClick={() => setIsNewAccountModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={14} /> Añadir Cuenta
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {supplier.bankAccounts.length > 0 ? (
                    supplier.bankAccounts.map(account => (
                      <div key={account.id} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <CreditCard size={20} />
                          </div>
                          <div className="flex gap-2">
                            {editingAccountId === account.id ? (
                              <>
                                <button 
                                  onClick={handleSaveAccount}
                                  className="text-emerald-500 hover:text-emerald-600 transition-colors"
                                  title="Guardar"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button 
                                  onClick={() => { setEditingAccountId(null); setEditAccountData(null); }}
                                  className="text-slate-400 hover:text-slate-500 transition-colors"
                                  title="Cancelar"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleStartEditAccount(account)}
                                  className="text-slate-300 hover:text-indigo-600 transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAccount(account.id)}
                                  className="text-slate-300 hover:text-rose-500 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Banco</p>
                            {editingAccountId === account.id ? (
                              <input 
                                type="text"
                                value={editAccountData?.bankName}
                                onChange={e => setEditAccountData(prev => prev ? { ...prev, bankName: e.target.value } : null)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                            ) : (
                              <p className="text-sm font-bold text-slate-900">{account.bankName}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Cuenta</p>
                              {editingAccountId === account.id ? (
                                <input 
                                  type="text"
                                  value={editAccountData?.accountNumber}
                                  onChange={e => setEditAccountData(prev => prev ? { ...prev, accountNumber: e.target.value } : null)}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono text-slate-600">{account.accountNumber}</p>
                                  <button 
                                    onClick={() => handleCopy(account.accountNumber)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Copiar Cuenta"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">CLABE</p>
                              {editingAccountId === account.id ? (
                                <input 
                                  type="text"
                                  value={editAccountData?.clabe}
                                  onChange={e => setEditAccountData(prev => prev ? { ...prev, clabe: e.target.value } : null)}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono text-slate-600">{account.clabe}</p>
                                  <button 
                                    onClick={() => handleCopy(account.clabe)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Copiar CLABE"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Referencia</p>
                            {editingAccountId === account.id ? (
                              <input 
                                type="text"
                                value={editAccountData?.reference}
                                onChange={e => setEditAccountData(prev => prev ? { ...prev, reference: e.target.value } : null)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                            ) : (
                              <p className="text-xs text-slate-600">{account.reference || 'N/A'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                      <CreditCard size={40} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-medium">No hay cuentas bancarias registradas</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catálogo de Productos</h3>
                  <button 
                    onClick={() => setIsNewProductModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={14} /> Añadir Producto
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Producto</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Costo</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vigencia</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {supplier.products.length > 0 ? (
                        supplier.products.map(product => (
                          <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              {editingProductId === product.id ? (
                                <input 
                                  type="text"
                                  value={editProductData?.name}
                                  onChange={e => setEditProductData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    <Package size={14} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{product.name}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingProductId === product.id ? (
                                <select 
                                  value={editProductData?.type}
                                  onChange={e => setEditProductData(prev => prev ? { ...prev, type: e.target.value } : null)}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  <option value="Vuelo">Vuelo</option>
                                  <option value="Hotel">Hotel</option>
                                  <option value="Tour">Tour</option>
                                  <option value="Traslado">Traslado</option>
                                  <option value="Seguro">Seguro</option>
                                  <option value="Otro">Otro</option>
                                </select>
                              ) : (
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  {product.type || 'Otro'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingProductId === product.id ? (
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                    <input 
                                      type="number"
                                      value={editProductData?.cost}
                                      onChange={e => setEditProductData(prev => prev ? { ...prev, cost: Number(e.target.value) } : null)}
                                      className="w-full pl-5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                  </div>
                                  <select 
                                    value={editProductData?.currency}
                                    onChange={e => setEditProductData(prev => prev ? { ...prev, currency: e.target.value as Currency } : null)}
                                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  >
                                    <option value="MXN">MXN</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                  </select>
                                </div>
                              ) : (
                                <span className="text-sm font-black text-slate-900">{formatCurrency(product.cost, product.currency)}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {editingProductId === product.id ? (
                                <input 
                                  type="date"
                                  value={editProductData?.validity}
                                  onChange={e => setEditProductData(prev => prev ? { ...prev, validity: e.target.value } : null)}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              ) : (
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Calendar size={14} />
                                  <span className="text-xs font-medium">{product.validity}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {editingProductId === product.id ? (
                                  <>
                                    <button 
                                      onClick={handleSaveProduct}
                                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Guardar"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => { setEditingProductId(null); setEditProductData(null); }}
                                      className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                                      title="Cancelar"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleStartEditProduct(product)}
                                      className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                      title="Editar"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                            No hay productos registrados en el catálogo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Cerrar Detalles
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isNewProductModalOpen && (
          <NewProductModal 
            onClose={() => setIsNewProductModalOpen(false)}
            onSave={handleAddProduct}
          />
        )}
        {isNewAccountModalOpen && (
          <NewBankAccountModal 
            onClose={() => setIsNewAccountModalOpen(false)}
            onSave={handleAddAccount}
          />
        )}
        {accountToDelete && (
          <ConfirmModal 
            title="Eliminar Cuenta Bancaria"
            message="¿Estás seguro de que deseas eliminar esta cuenta bancaria? Esta acción no se puede deshacer."
            onConfirm={confirmDeleteAccount}
            onCancel={() => setAccountToDelete(null)}
          />
        )}
        {productToDelete && (
          <ConfirmModal 
            title="Eliminar Producto"
            message="¿Estás seguro de que deseas eliminar este producto del catálogo? Esta acción no se puede deshacer."
            onConfirm={confirmDeleteProduct}
            onCancel={() => setProductToDelete(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string, message: string, onConfirm: () => void, onCancel: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
  >
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
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
        >
          Cancelar
        </button>
        <button 
          onClick={onConfirm}
          className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
        >
          Eliminar
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('commercialName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppliersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supplier[];
      setSuppliers(suppliersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'suppliers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterHasBank, setFilterHasBank] = useState('all');
  const [filterProductCount, setFilterProductCount] = useState('all');
  const [quickAddProductSupplierId, setQuickAddProductSupplierId] = useState<string | null>(null);

  const stats = {
    total: suppliers.length,
    totalProducts: suppliers.reduce((acc, s) => acc + s.products.length, 0),
    totalAccounts: suppliers.reduce((acc, s) => acc + s.bankAccounts.length, 0),
    avgProducts: suppliers.length > 0 ? (suppliers.reduce((acc, s) => acc + s.products.length, 0) / suppliers.length).toFixed(1) : 0
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.commercialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || s.products.some(p => p.type === filterType);
    
    const matchesValidity = filterValidity === 'all' || s.products.some(p => {
      const today = new Date().toISOString().split('T')[0];
      if (filterValidity === 'active') return p.validity >= today;
      if (filterValidity === 'expired') return p.validity < today;
      return true;
    });

    const matchesHasBank = filterHasBank === 'all' || 
      (filterHasBank === 'yes' ? s.bankAccounts.length > 0 : s.bankAccounts.length === 0);

    const matchesProductCount = filterProductCount === 'all' || (
      filterProductCount === 'none' ? s.products.length === 0 :
      filterProductCount === 'some' ? (s.products.length > 0 && s.products.length <= 5) :
      filterProductCount === 'many' ? s.products.length > 5 : true
    );
    
    return matchesSearch && matchesType && matchesValidity && matchesHasBank && matchesProductCount;
  });

  const handleAddSupplier = async (newSupplier: Supplier) => {
    try {
      const { id, ...supplierData } = newSupplier;
      await addDoc(collection(db, 'suppliers'), supplierData);
      setIsNewSupplierModalOpen(false);
      setToast({ message: 'Proveedor registrado con éxito', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'suppliers');
      setToast({ message: 'Error al registrar proveedor', type: 'error' });
    }
  };

  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {
    try {
      const { id, ...supplierData } = updatedSupplier;
      await updateDoc(doc(db, 'suppliers', id), supplierData);
      setSelectedSupplier(updatedSupplier);
      setToast({ message: 'Información actualizada', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `suppliers/${updatedSupplier.id}`);
      setToast({ message: 'Error al actualizar información', type: 'error' });
    }
  };

  const handleQuickAddProduct = async (newProduct: SupplierProduct) => {
    if (!quickAddProductSupplierId) return;
    const supplier = suppliers.find(s => s.id === quickAddProductSupplierId);
    if (!supplier) return;

    try {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        products: [...supplier.products, newProduct]
      });
      setQuickAddProductSupplierId(null);
      setToast({ message: 'Producto añadido con éxito', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `suppliers/${supplier.id}`);
      setToast({ message: 'Error al añadir producto', type: 'error' });
    }
  };

  const confirmDeleteSupplier = async () => {
    if (supplierToDelete) {
      try {
        await deleteDoc(doc(db, 'suppliers', supplierToDelete));
        setSupplierToDelete(null);
        setToast({ message: 'Proveedor eliminado', type: 'success' });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `suppliers/${supplierToDelete}`);
        setToast({ message: 'Error al eliminar proveedor', type: 'error' });
      }
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSupplierToDelete(id);
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proveedores</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión de socios comerciales, cuentas y catálogos</p>
        </div>
        <button 
          onClick={() => setIsNewSupplierModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </header>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Proveedores', value: stats.total, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Productos', value: stats.totalProducts, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cuentas Bancarias', value: stats.totalAccounts, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Promedio Productos', value: stats.avgProducts, icon: ChevronRight, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nombre comercial, razón social, RFC o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer"
          >
            <option value="all">Todos los Tipos</option>
            <option value="Vuelo">Vuelo</option>
            <option value="Hotel">Hotel</option>
            <option value="Tour">Tour</option>
            <option value="Traslado">Traslado</option>
            <option value="Seguro">Seguro</option>
            <option value="Grupos">Grupos</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Calendar size={18} className="text-slate-400" />
          <select 
            value={filterValidity}
            onChange={(e) => setFilterValidity(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer"
          >
            <option value="all">Todas las Vigencias</option>
            <option value="active">Vigentes</option>
            <option value="expired">Vencidos</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <CreditCard size={18} className="text-slate-400" />
          <select 
            value={filterHasBank}
            onChange={(e) => setFilterHasBank(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer"
          >
            <option value="all">Cuentas Bancarias</option>
            <option value="yes">Con Cuentas</option>
            <option value="no">Sin Cuentas</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Package size={18} className="text-slate-400" />
          <select 
            value={filterProductCount}
            onChange={(e) => setFilterProductCount(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-600 cursor-pointer"
          >
            <option value="all">Cantidad de Productos</option>
            <option value="none">Sin Productos</option>
            <option value="some">1-5 Productos</option>
            <option value="many">Más de 5</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <motion.div 
            key={supplier.id}
            layoutId={supplier.id}
            onClick={() => setSelectedSupplier(supplier)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:scale-110 transition-transform">
                  <Truck size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{supplier.commercialName}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{supplier.rfc}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickAddProductSupplierId(supplier.id);
                  }}
                  className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="Añadir Producto Rápido"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(supplier.id, e)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail size={14} />
                  <span className="text-xs font-medium truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone size={14} />
                  <span className="text-xs font-medium">{supplier.phone}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Productos</p>
                  <p className="text-lg font-black text-slate-900">{supplier.products.length}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cuentas</p>
                  <p className="text-lg font-black text-slate-900">{supplier.bankAccounts.length}</p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Ver Detalles</span>
              <ChevronRight size={16} className="text-indigo-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Search size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-slate-900">No se encontraron proveedores</p>
              <p className="text-slate-500">Intenta ajustar tus filtros de búsqueda</p>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterValidity('all'); }}
              className="text-indigo-600 font-bold hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isNewSupplierModalOpen && (
          <NewSupplierModal 
            onClose={() => setIsNewSupplierModalOpen(false)} 
            onSave={handleAddSupplier} 
          />
        )}
        {quickAddProductSupplierId && (
          <NewProductModal 
            onClose={() => setQuickAddProductSupplierId(null)}
            onSave={handleQuickAddProduct}
          />
        )}
        {selectedSupplier && (
          <SupplierDetailModal 
            supplier={selectedSupplier}
            onClose={() => setSelectedSupplier(null)}
            onUpdate={handleUpdateSupplier}
          />
        )}
        {supplierToDelete && (
          <ConfirmModal 
            title="Eliminar Proveedor"
            message="¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer."
            onConfirm={confirmDeleteSupplier}
            onCancel={() => setSupplierToDelete(null)}
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
