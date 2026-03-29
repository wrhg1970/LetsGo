import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Users, Briefcase, DollarSign, Percent, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
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
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard = () => {
  const [filterProduct, setFilterProduct] = useState('Todos');
  const [filterSupplier, setFilterSupplier] = useState('Todos');
  const [filterGroup, setFilterGroup] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const recentActivity = [
    { action: 'Nueva Reserva', user: 'Ana Martínez', time: 'Hace 5 min', date: '2026-03-22', amount: 2450, margin: 450, status: 'Confirmada', product: 'Vuelo', supplier: 'Iberia', group: 'Todos' },
    { action: 'Cotización Generada', user: 'Carlos Ruiz', time: 'Hace 15 min', date: '2026-03-21', amount: 1200, margin: 200, status: 'Pendiente', product: 'Hotel', supplier: 'Marriott', group: 'Boda Pérez' },
    { action: 'Nuevo Lead', user: 'María García', time: 'Hace 1 hora', date: '2026-03-20', amount: 0, margin: 0, status: 'Nuevo', product: 'Tour', supplier: 'Local Guide', group: 'Todos' },
    { action: 'Pago Recibido', user: 'Juan Pérez', time: 'Hace 2 horas', date: '2026-03-19', amount: 500, margin: 100, status: 'Confirmada', product: 'Seguro', supplier: 'Expedia', group: 'Convención Tech' },
    { action: 'Reserva Cancelada', user: 'Lucía Sosa', time: 'Hace 3 horas', date: '2026-03-18', amount: 0, margin: 0, status: 'Cancelada', product: 'Vuelo', supplier: 'Iberia', group: 'Viaje Graduación' },
    { action: 'Nueva Reserva', user: 'Roberto Gómez', time: 'Hace 5 horas', date: '2026-02-15', amount: 3500, margin: 700, status: 'Confirmada', product: 'Hotel', supplier: 'Marriott', group: 'Todos' },
    { action: 'Nueva Reserva', user: 'Elena Paz', time: 'Hace 1 día', date: '2026-01-10', amount: 1800, margin: 300, status: 'Confirmada', product: 'Tour', supplier: 'Local Guide', group: 'Todos' },
  ];

  const filteredActivity = recentActivity.filter(item => {
    const matchesSearch = 
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const itemDate = new Date(item.date);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    
    const matchesDate = (!start || itemDate >= start) && (!end || itemDate <= end);
    const matchesProduct = filterProduct === 'Todos' || item.product === filterProduct;
    const matchesSupplier = filterSupplier === 'Todos' || item.supplier === filterSupplier;
    const matchesGroup = filterGroup === 'Todos' || item.group === filterGroup;
    
    return matchesSearch && matchesDate && matchesProduct && matchesSupplier && matchesGroup;
  });

  // Calculate dynamic KPIs
  const totalRevenue = filteredActivity.reduce((acc, curr) => acc + curr.amount, 0);
  const totalMargin = filteredActivity.reduce((acc, curr) => acc + curr.margin, 0);
  const totalLeads = filteredActivity.filter(item => item.status === 'Nuevo').length;
  const confirmedReservations = filteredActivity.filter(item => item.status === 'Confirmada').length;
  const conversionRate = filteredActivity.length > 0 ? (confirmedReservations / filteredActivity.length) * 100 : 0;

  // Calculate dynamic chart data (Monthly)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dynamicChartData = months.map((month, index) => {
    const monthData = filteredActivity.filter(item => new Date(item.date).getMonth() === index);
    return {
      name: month,
      ventas: monthData.reduce((acc, curr) => acc + curr.amount, 0),
      margen: monthData.reduce((acc, curr) => acc + curr.margin, 0)
    };
  }).filter(d => d.ventas > 0 || d.margen > 0 || months.indexOf(d.name) <= new Date().getMonth());

  // Calculate dynamic product mix
  const dynamicProductData = ['Vuelo', 'Hotel', 'Tour', 'Seguro'].map(type => ({
    name: type + 's',
    value: filteredActivity.filter(item => item.product === type).length
  })).filter(p => p.value > 0);

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard de Negocio</h1>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <input 
                type="text"
                placeholder="Buscar actividad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1 text-sm text-slate-600">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent border-none focus:ring-0 p-0 text-sm cursor-pointer"
              />
              <span className="text-slate-300">|</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent border-none focus:ring-0 p-0 text-sm cursor-pointer"
              />
            </div>
            {(searchTerm || dateRange.start || dateRange.end || filterProduct !== 'Todos' || filterSupplier !== 'Todos' || filterGroup !== 'Todos') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setDateRange({ start: '', end: '' });
                  setFilterProduct('Todos');
                  setFilterSupplier('Todos');
                  setFilterGroup('Todos');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Producto:</span>
            <select 
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Todos">Todos</option>
              <option value="Vuelo">Vuelo</option>
              <option value="Hotel">Hotel</option>
              <option value="Tour">Tour</option>
              <option value="Seguro">Seguro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proveedor:</span>
            <select 
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Todos">Todos</option>
              <option value="Iberia">Iberia</option>
              <option value="Marriott">Marriott</option>
              <option value="Expedia">Expedia</option>
              <option value="Local Guide">Local Guide</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupo:</span>
            <select 
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Todos">Todos</option>
              <option value="Boda Pérez">Boda Pérez</option>
              <option value="Convención Tech">Convención Tech</option>
              <option value="Viaje Graduación">Viaje Graduación</option>
            </select>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos Totales', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, trend: '+12.5%', trendUp: true, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Margen Neto', value: `$${totalMargin.toLocaleString()}`, icon: TrendingUp, trend: '+8.2%', trendUp: true, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Nuevos Leads', value: totalLeads.toString(), icon: Users, trend: '-2.4%', trendUp: false, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Tasa de Conversión', value: `${conversionRate.toFixed(1)}%`, icon: Percent, trend: '+1.5%', trendUp: true, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                <div className="flex items-center gap-1">
                  {stat.trendUp ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-rose-500" />}
                  <span className={cn("text-xs font-bold", stat.trendUp ? "text-emerald-500" : "text-rose-500")}>{stat.trend}</span>
                  <span className="text-[10px] text-slate-400 font-medium">vs mes anterior</span>
                </div>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Ventas vs Margen</h2>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-xs text-slate-500">Ventas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500">Margen</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="ventas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margen" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Mix de Productos</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={dynamicProductData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dynamicProductData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {dynamicProductData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Actividad Reciente</h2>
            <span className="text-xs text-slate-400 font-medium">
              Mostrando {filteredActivity.length} resultados
            </span>
          </div>
          <div className="space-y-4">
            {filteredActivity.length > 0 ? (
              filteredActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.action}</p>
                      <p className="text-xs text-slate-500">{item.user} • {item.time} ({item.date})</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{item.amount > 0 ? `$${item.amount.toLocaleString()}` : '-'}</p>
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      item.status === 'Confirmada' ? "text-emerald-600" : 
                      item.status === 'Cancelada' ? "text-rose-600" : "text-amber-600"
                    )}>{item.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No se encontraron resultados para los filtros aplicados.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Accesos Directos</h2>
            <div className="grid grid-cols-1 gap-3">
              <Link 
                to="/settings" 
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group border border-transparent hover:border-indigo-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <PieChart size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Configuración</p>
                  <p className="text-[10px] text-slate-500 group-hover:text-indigo-400">Gestionar sistema y usuarios</p>
                </div>
              </Link>
              <Link 
                to="/crm" 
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all group border border-transparent hover:border-indigo-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">CRM Clientes</p>
                  <p className="text-[10px] text-slate-500 group-hover:text-indigo-400">Ver leads y prospectos</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
