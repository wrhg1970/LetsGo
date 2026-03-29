import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Search, 
  Calendar,
  User,
  Package,
  Truck,
  Download,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  X,
  Briefcase,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Payment, Client, Product, Supplier, Currency, BankStatement, Expense } from '../types';
import { formatCurrency, convertToMXN } from '../lib/currency';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { BankStatementOCR } from './BankStatementOCR';

export const Finance = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'ocr' | 'expenses'>('dashboard');
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([
    { id: '1', fileName: 'Estado_Cuenta_Marzo_BBVA.pdf', uploadDate: '2026-03-15', transactionCount: 45 },
    { id: '2', fileName: 'Estado_Cuenta_Febrero_Santander.pdf', uploadDate: '2026-02-12', transactionCount: 32 }
  ]);
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', date: '2026-03-20', description: 'Renta Oficina', amount: 15000, currency: 'MXN', exchangeRate: 1, category: 'Operativos', subcategory: 'Renta', reconciled: true },
    { id: '2', date: '2026-03-22', description: 'Publicidad Facebook', amount: 500, currency: 'USD', exchangeRate: 18.5, category: 'Marketing', subcategory: 'Digital', reconciled: false }
  ]);

  const togglePaymentReconciliation = (bookingId: string, paymentId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          payments: (b.payments || []).map(p => {
            if (p.id === paymentId) {
              return { ...p, reconciled: !p.reconciled };
            }
            return p;
          })
        };
      }
      return b;
    }));
  };

  const toggleExpenseReconciliation = (expenseId: string) => {
    setExpenses(prev => prev.map(e => {
      if (e.id === expenseId) {
        return { ...e, reconciled: !e.reconciled };
      }
      return e;
    }));
  };

  // Filters State
  const [filters, setFilters] = useState({
    clientId: '',
    productId: '',
    supplierId: '',
    startDate: '',
    endDate: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsSnap, clientsSnap, productsSnap, suppliersSnap] = await Promise.all([
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'suppliers'))
        ]);

        setBookings(bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
        setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        setSuppliers(suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchClient = !filters.clientId || b.clientId === filters.clientId;
      const matchProduct = !filters.productId || b.productId === filters.productId;
      
      // For supplier, we need to find the product's supplier
      const product = products.find(p => p.id === b.productId);
      const matchSupplier = !filters.supplierId || product?.supplierId === filters.supplierId;
      
      const bookingDate = b.createdAt ? new Date(b.createdAt) : new Date();
      const matchStart = !filters.startDate || bookingDate >= new Date(filters.startDate);
      const matchEnd = !filters.endDate || bookingDate <= new Date(filters.endDate);

      return matchClient && matchProduct && matchSupplier && matchStart && matchEnd;
    });
  }, [bookings, filters, products]);

  const kpis = useMemo(() => {
    let totalSalesMXN = 0;
    let totalCollectedMXN = 0;
    let totalCostMXN = 0;
    let totalCommissionMXN = 0;
    let netMarginMXN = 0;

    filteredBookings.forEach(b => {
      const bookingTotalMXN = convertToMXN(b.total, b.currency, b.exchangeRate);
      totalSalesMXN += bookingTotalMXN;
      
      // Use costMXN if available, otherwise convert cost
      const bookingCostMXN = (b as any).costMXN || convertToMXN(b.cost, b.currency, b.exchangeRate);
      totalCostMXN += bookingCostMXN;

      const bookingCommissionMXN = (b as any).commissionMXN || 0;
      totalCommissionMXN += bookingCommissionMXN;

      const bookingNetMarginMXN = (b as any).netMarginMXN || (bookingTotalMXN - bookingCostMXN - bookingCommissionMXN);
      netMarginMXN += bookingNetMarginMXN;

      (b.payments || []).forEach(p => {
        if (p.type === 'client_payment' && p.status === 'cleared') {
          totalCollectedMXN += convertToMXN(p.amount, p.currency, p.exchangeRate);
        }
      });
    });

    const pendingBalanceMXN = totalSalesMXN - totalCollectedMXN;
    const marginPercentage = totalSalesMXN > 0 ? (netMarginMXN / totalSalesMXN) * 100 : 0;

    return {
      totalSalesMXN,
      totalCollectedMXN,
      pendingBalanceMXN,
      totalCostMXN,
      netMarginMXN,
      marginPercentage
    };
  }, [filteredBookings]);

  const allPayments = useMemo(() => {
    const payments: any[] = [];
    filteredBookings.forEach(b => {
      (b.payments || []).forEach(p => {
        if (p.type === 'client_payment') {
          payments.push({
            ...p,
            clientName: b.clientName,
            amountMXN: convertToMXN(p.amount, p.currency, p.exchangeRate)
          });
        }
      });
    });
    return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredBookings]);

  // Chart Data: Sales by Month
  const chartData = useMemo(() => {
    const months: { [key: string]: number } = {};
    filteredBookings.forEach(b => {
      const date = b.createdAt ? new Date(b.createdAt) : new Date();
      const monthYear = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      const amount = convertToMXN(b.total, b.currency, b.exchangeRate);
      months[monthYear] = (months[monthYear] || 0) + amount;
    });

    // Sort months chronologically
    return Object.entries(months)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => {
        const [monthA, yearA] = a.name.split(' ');
        const [monthB, yearB] = b.name.split(' ');
        return new Date(`${monthA} 1, 20${yearA}`).getTime() - new Date(`${monthB} 1, 20${yearB}`).getTime();
      });
  }, [filteredBookings]);

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Módulo Financiero</h1>
          <p className="text-slate-500 font-medium">Análisis de ingresos, egresos y rentabilidad.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeView === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveView('ocr')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeView === 'ocr' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            OCR Sistema
          </button>
          <button 
            onClick={() => setActiveView('expenses')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeView === 'expenses' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Gastos
          </button>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {activeView === 'dashboard' && (
            <>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                  showFilters ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Filter size={18} /> {showFilters ? 'Cerrar Filtros' : 'Filtrar Datos'}
              </button>
              <button className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                <Download size={18} /> Exportar Reporte
              </button>
            </>
          )}
        </div>
      </header>

      {activeView === 'dashboard' ? (
        <>
          <AnimatePresence>
            {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                <select 
                  value={filters.clientId}
                  onChange={e => setFilters({ ...filters, clientId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Todos los Clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Producto</label>
                <select 
                  value={filters.productId}
                  onChange={e => setFilters({ ...filters, productId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Todos los Productos</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                <select 
                  value={filters.supplierId}
                  onChange={e => setFilters({ ...filters, supplierId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Todos los Proveedores</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.commercialName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                <input 
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                <input 
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
              <ArrowUpRight size={14} /> 12%
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ventas Totales</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.totalSalesMXN)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
              <ArrowUpRight size={14} /> 8%
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cobrado (MXN)</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.totalCollectedMXN)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <div className="flex items-center gap-1 text-rose-600 font-bold text-xs">
              <ArrowDownRight size={14} /> 4%
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.pendingBalanceMXN)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
              <Percent size={14} className="text-emerald-600" /> {kpis.marginPercentage.toFixed(1)}%
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Neto</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.netMarginMXN)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Evolución de Ventas</h2>
              <p className="text-sm text-slate-500 font-medium">Ingresos mensuales en MXN</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                <div className="w-2 h-2 rounded-full bg-indigo-600" /> Ventas
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64728b', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64728b', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution / Summary */}
        <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-8">
          <h2 className="text-xl font-black tracking-tight">Resumen Ejecutivo</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Eficiencia de Cobro</span>
                <span>{kpis.totalSalesMXN > 0 ? ((kpis.totalCollectedMXN / kpis.totalSalesMXN) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.totalSalesMXN > 0 ? (kpis.totalCollectedMXN / kpis.totalSalesMXN) * 100 : 0}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Margen de Utilidad</span>
                <span>{kpis.marginPercentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${kpis.marginPercentage}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Briefcase size={16} />
                </div>
                <span className="text-sm font-bold">Reservas Activas</span>
              </div>
              <span className="text-lg font-black">{filteredBookings.length}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-sm font-bold">Pagos Recibidos</span>
              </div>
              <span className="text-lg font-black">{allPayments.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Listado de Pagos</h2>
            <p className="text-sm text-slate-500 font-medium">Historial detallado de transacciones de clientes.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto (MXN)</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Conciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                        <Calendar size={14} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {p.clientName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{p.clientName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{p.method}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      p.status === 'cleared' ? "bg-emerald-50 text-emerald-600" : 
                      p.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {p.status === 'cleared' ? 'Aplicado' : p.status === 'pending' ? 'Pendiente' : 'Fallido'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(p.amountMXN)}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => togglePaymentReconciliation(p.bookingId, p.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        p.reconciled ? "text-emerald-600 bg-emerald-50" : "text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                      title={p.reconciled ? "Conciliado" : "Marcar como Conciliado"}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {allPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <AlertCircle size={40} strokeWidth={1} />
                      <p className="text-sm font-medium">No se encontraron pagos con los filtros seleccionados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  ) : activeView === 'ocr' ? (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6">Estados de Cuenta Cargados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankStatements.map(statement => (
            <div key={statement.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{statement.fileName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{statement.uploadDate} • {statement.transactionCount} transacciones</p>
              </div>
              <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                <FileText size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BankStatementOCR />
    </div>
  ) : (
    <ExpensesModule 
      expenses={expenses} 
      suppliers={suppliers} 
      onToggleReconciliation={toggleExpenseReconciliation} 
    />
  )}
</div>
);
};

const ExpensesModule = ({ 
  expenses, 
  suppliers, 
  onToggleReconciliation 
}: { 
  expenses: Expense[], 
  suppliers: Supplier[],
  onToggleReconciliation: (id: string) => void
}) => {
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterSupplier, setFilterSupplier] = useState('Todos');

  const filteredExpenses = expenses.filter(e => {
    const matchCategory = filterCategory === 'Todos' || e.category === filterCategory;
    const matchSupplier = filterSupplier === 'Todos' || e.supplierId === filterSupplier;
    return matchCategory && matchSupplier;
  });

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount * e.exchangeRate), 0);
  const reconciledExpenses = filteredExpenses.filter(e => e.reconciled).reduce((acc, e) => acc + (e.amount * e.exchangeRate), 0);

  return (
    <div className="space-y-8">
      {/* Expenses Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gastos Totales (MXN)</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalExpenses)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gastos Conciliados</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(reconciledExpenses)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente Conciliar</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalExpenses - reconciledExpenses)}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase">Filtros:</span>
        </div>
        <select 
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="Todos">Todas las Categorías</option>
          <option value="Operativos">Operativos</option>
          <option value="Marketing">Marketing</option>
          <option value="Servicios">Servicios</option>
        </select>
        <select 
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="Todos">Todos los Proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.commercialName}</option>)}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Listado de Gastos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto (MXN)</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Conciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-slate-700">{e.date}</td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-900">{e.description}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{e.subcategory}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">{e.category}</span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900">
                    {formatCurrency(e.amount * e.exchangeRate)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => onToggleReconciliation(e.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        e.reconciled ? "text-emerald-600 bg-emerald-50" : "text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                      )}
                      title={e.reconciled ? "Conciliado" : "Marcar como Conciliado"}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
