import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plus, Search, Filter, Briefcase, Package, Trash2, Edit2, X, ChevronRight, CheckCircle2, User, Calendar, DollarSign, Calculator, Tag, TrendingUp, BarChart3, PieChart, Percent, Save, AlertCircle, CreditCard, Receipt, FileText, History, Download, Printer, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Product, Client, Payment, Currency } from '../types';
import { cn } from '../lib/utils';
import { formatCurrency, convertToMXN, EXCHANGE_RATES } from '../lib/currency';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';

const StatementOfAccountModal = ({ 
  booking, 
  onClose 
}: { 
  booking: Booking; 
  onClose: () => void; 
}) => {
  const totalPaidMXN = useMemo(() => 
    (booking.payments || [])
      .filter(p => p.type === 'client_payment' && p.status === 'cleared')
      .reduce((acc, p) => acc + convertToMXN(p.amount, p.currency, p.exchangeRate), 0)
  , [booking.payments]);

  const bookingTotalMXN = convertToMXN(booking.total, booking.currency, booking.exchangeRate);
  const balanceMXN = bookingTotalMXN - totalPaidMXN;

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('ESTADO DE CUENTA', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('TravelAgency ERP - Agencia de Viajes Elite', 105, 32, { align: 'center' });
    
    // Booking Info
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Reserva: ${booking.id}`, 20, 50);
    doc.text(`Cliente: ${booking.clientName}`, 20, 57);
    doc.text(`Producto: ${booking.productName}`, 20, 64);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 190, 50, { align: 'right' });

    // Financial Summary Box
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(20, 75, 170, 35, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL RESERVA', 30, 85);
    doc.text('TOTAL PAGADO', 85, 85);
    doc.text('SALDO PENDIENTE', 140, 85);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatCurrency(bookingTotalMXN)} MXN`, 30, 97);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(`${formatCurrency(totalPaidMXN)} MXN`, 85, 97);
    doc.setTextColor(225, 29, 72); // Rose-600
    doc.text(`${formatCurrency(balanceMXN)} MXN`, 140, 97);

    // Payments Table
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Historial de Pagos', 20, 125);

    const tableData = (booking.payments || [])
      .filter(p => p.type === 'client_payment')
      .map(p => [
        p.date,
        p.method,
        p.status === 'cleared' ? 'Aplicado' : 'Pendiente',
        `${formatCurrency(p.amount)} ${p.currency}`
      ]);

    autoTable(doc, {
      startY: 130,
      head: [['Fecha', 'Método', 'Estado', 'Monto']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Gracias por su preferencia.', 105, finalY, { align: 'center' });
    doc.text('Este documento es un comprobante informativo de su estado de cuenta.', 105, finalY + 5, { align: 'center' });

    doc.save(`Estado_Cuenta_${booking.id}.pdf`);
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} /> Estado de Cuenta
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={generatePDF}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <Download size={14} /> Descargar PDF
            </button>
            <button 
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-white print:p-0" id="printable-soa">
          {/* Header Document */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">ESTADO DE CUENTA</h1>
              <p className="text-slate-500 font-medium mt-1">Reserva: {booking.id}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-900">Agencia de Viajes Elite</h3>
              <p className="text-xs text-slate-500">Calle Principal #123, Ciudad</p>
              <p className="text-xs text-slate-500">RFC: AVE123456789</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Datos del Cliente</h4>
              <p className="font-bold text-slate-900 text-lg">{booking.clientName}</p>
              <p className="text-sm text-slate-600">ID Cliente: {booking.clientId}</p>
            </div>
            <div className="text-right">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fecha de Emisión</h4>
              <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-12">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Detalle del Servicio</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Fechas</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">{booking.productName}</p>
                      <p className="text-xs text-slate-500">Servicio turístico confirmado</p>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-600">
                      {booking.startDate} al {booking.endDate}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">
                      {formatCurrency(booking.total, booking.currency)}
                      {booking.currency !== 'MXN' && (
                        <p className="text-[10px] text-slate-400 font-medium">({formatCurrency(bookingTotalMXN)})</p>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-12">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Historial de Pagos</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Método</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(booking.payments || []).filter(p => p.type === 'client_payment').length > 0 ? (
                    (booking.payments || [])
                      .filter(p => p.type === 'client_payment')
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 text-sm text-slate-600">{p.date}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{p.method}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(p.amount, p.currency)}
                            {p.currency !== 'MXN' && (
                              <p className="text-[10px] text-slate-400 font-medium">({formatCurrency(convertToMXN(p.amount, p.currency, p.exchangeRate))})</p>
                            )}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400 italic">
                        No se han registrado pagos para esta reserva.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Total Reserva:</span>
                <span className="text-slate-900 font-bold">{formatCurrency(bookingTotalMXN)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Total Pagado:</span>
                <span className="text-emerald-600 font-bold">{formatCurrency(totalPaidMXN)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-900 font-black uppercase tracking-wider text-xs">Saldo Pendiente (MXN):</span>
                <span className={cn(
                  "text-xl font-black",
                  balanceMXN > 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                  {formatCurrency(balanceMXN)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gracias por su preferencia</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const NewBookingModal = ({ 
  clients, 
  products, 
  suppliers,
  onClose, 
  onSave 
}: { 
  clients: Client[]; 
  products: Product[]; 
  suppliers: any[];
  onClose: () => void; 
  onSave: (booking: Booking) => void; 
}) => {
  const [formData, setFormData] = useState<Partial<Booking>>({
    clientId: '',
    clientName: '',
    supplierId: '',
    productId: '',
    productName: '',
    startDate: '',
    endDate: '',
    
    // Passenger Counts
    adults: 1,
    children: 0,

    // Split Pricing (Sale)
    adultPrice: 0,
    childPrice: 0,
    currency: 'MXN' as Currency,
    exchangeRate: 1,
    serviceFee: 0,
    tax: 0,
    others: 0,
    
    // Split Cost (Supplier)
    adultCost: 0,
    childCost: 0,
    costCurrency: 'MXN' as Currency,
    costExchangeRate: 1,
    
    // Split Commission (Agent)
    adultCommission: 0,
    childCommission: 0,
    commissionCurrency: 'MXN' as Currency,
    commissionExchangeRate: 1,

    // Flight specific
    originAirport: '',
    originAirportCode: '',
    destinationAirport: '',
    destinationAirportCode: '',
    departureDateTime: '',
    arrivalDateTime: '',
    airline: '',
    airlineCode: '',
    flightNumber: '',

    // Hotel/Tour specific
    hotelName: '',
    tourName: '',
    
    passengers: [],
    status: 'confirmed'
  });

  const [airports, setAirports] = useState<any[]>([]);
  const [airlines, setAirlines] = useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const airportsSnap = await getDocs(query(collection(db, 'catalog_airports'), orderBy('name', 'asc')));
        const airlinesSnap = await getDocs(query(collection(db, 'catalog_airlines'), orderBy('name', 'asc')));
        
        setAirports(airportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAirlines(airlinesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching catalogs:", error);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    fetchCatalogs();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === formData.productId);
  }, [formData.productId, products]);

  const calculateTotalPrice = () => {
    const totalAdults = Number(formData.adultPrice || 0) * Number(formData.adults || 0);
    const totalChildren = Number(formData.childPrice || 0) * Number(formData.children || 0);
    return totalAdults + totalChildren + Number(formData.serviceFee || 0) + Number(formData.tax || 0) + Number(formData.others || 0);
  };

  const calculateTotalCost = () => {
    const totalAdults = Number(formData.adultCost || 0) * Number(formData.adults || 0);
    const totalChildren = Number(formData.childCost || 0) * Number(formData.children || 0);
    return totalAdults + totalChildren;
  };

  const calculateTotalCommission = () => {
    const totalAdults = Number(formData.adultCommission || 0) * Number(formData.adults || 0);
    const totalChildren = Number(formData.childCommission || 0) * Number(formData.children || 0);
    return totalAdults + totalChildren;
  };

  const totalPriceMXN = useMemo(() => {
    return calculateTotalPrice() * (formData.exchangeRate || 1);
  }, [formData.adultPrice, formData.childPrice, formData.adults, formData.children, formData.serviceFee, formData.tax, formData.others, formData.exchangeRate]);

  const costMXN = useMemo(() => {
    return calculateTotalCost() * (formData.costExchangeRate || 1);
  }, [formData.adultCost, formData.childCost, formData.adults, formData.children, formData.costExchangeRate]);

  const commissionMXN = useMemo(() => {
    return calculateTotalCommission() * (formData.commissionExchangeRate || 1);
  }, [formData.adultCommission, formData.childCommission, formData.adults, formData.children, formData.commissionExchangeRate]);

  const grossMarginMXN = totalPriceMXN - costMXN;
  const netMarginMXN = grossMarginMXN - commissionMXN;

  const filteredProducts = useMemo(() => {
    if (!formData.supplierId) return [];
    return products.filter(p => p.supplierId === formData.supplierId);
  }, [formData.supplierId, products]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const rate = EXCHANGE_RATES.find(r => r.from === product.currency)?.rate || 1;
      setFormData({
        ...formData,
        productId,
        productName: product.name,
        adultCost: product.basePrice,
        childCost: product.basePrice * 0.5,
        costCurrency: product.currency,
        costExchangeRate: rate,
        adultPrice: product.basePrice * 1.2,
        childPrice: (product.basePrice * 0.5) * 1.2,
        currency: product.currency,
        exchangeRate: rate,
        hotelName: product.category === 'Hoteles' ? product.name : '',
        tourName: product.category === 'Tours' ? product.name : ''
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      id: `BK-${Math.floor(Math.random() * 10000)}`,
      clientId: formData.clientId!,
      clientName: formData.clientName!,
      supplierId: formData.supplierId!,
      productId: formData.productId!,
      productName: formData.productName!,
      category: selectedProduct?.category,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      
      adults: formData.adults!,
      children: formData.children!,
      passengers: formData.passengers || [],
      
      adultPrice: formData.adultPrice!,
      childPrice: formData.childPrice!,
      currency: formData.currency!,
      exchangeRate: formData.exchangeRate!,
      serviceFee: formData.serviceFee!,
      tax: formData.tax!,
      others: formData.others!,
      total: calculateTotalPrice(),
      totalMXN: totalPriceMXN,
      
      adultCost: formData.adultCost!,
      childCost: formData.childCost!,
      costCurrency: formData.costCurrency!,
      costExchangeRate: formData.costExchangeRate!,
      cost: calculateTotalCost(),
      costMXN,
      
      adultCommission: formData.adultCommission!,
      childCommission: formData.childCommission!,
      commissionCurrency: formData.commissionCurrency!,
      commissionExchangeRate: formData.commissionExchangeRate!,
      commission: calculateTotalCommission(),
      commissionMXN,
      
      grossMarginMXN,
      netMarginMXN,
      
      originAirport: formData.originAirport,
      originAirportCode: formData.originAirportCode,
      destinationAirport: formData.destinationAirport,
      destinationAirportCode: formData.destinationAirportCode,
      departureDateTime: formData.departureDateTime,
      arrivalDateTime: formData.arrivalDateTime,
      airline: formData.airline,
      airlineCode: formData.airlineCode,
      flightNumber: formData.flightNumber,
      hotelName: formData.hotelName,
      tourName: formData.tourName,
      
      status: 'confirmed',
      payments: [],
      createdAt: new Date().toISOString()
    } as Booking);
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
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Nueva Reserva</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Cliente</label>
              <select 
                required
                value={formData.clientId}
                onChange={e => {
                  const client = clients.find(c => c.id === e.target.value);
                  setFormData({ ...formData, clientId: e.target.value, clientName: client?.name || '' });
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">Seleccionar Cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Proveedor</label>
              <select 
                required
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value, productId: '' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">Seleccionar Proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.commercialName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Producto / Servicio</label>
              <select 
                required
                disabled={!formData.supplierId}
                value={formData.productId}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
              >
                <option value="">Seleccionar Producto</option>
                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Passengers Section */}
          <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <User size={16} className="text-slate-600" /> Información de Pasajeros
              </h3>
              <button 
                type="button"
                onClick={() => {
                  const newPassenger = {
                    id: Math.random().toString(36).substr(2, 9),
                    firstName: '',
                    lastName: '',
                    dateOfBirth: '',
                    passportNumber: '',
                    type: 'adult' as const
                  };
                  setFormData({ ...formData, passengers: [...(formData.passengers || []), newPassenger] });
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                <Plus size={14} /> Agregar Pasajero
              </button>
            </div>

            <div className="space-y-4">
              {(formData.passengers || []).map((passenger, index) => (
                <div key={passenger.id} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 relative group">
                  <button 
                    type="button"
                    onClick={() => {
                      const newPassengers = [...(formData.passengers || [])];
                      newPassengers.splice(index, 1);
                      setFormData({ ...formData, passengers: newPassengers });
                    }}
                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                      <input 
                        type="text" 
                        value={passenger.firstName} 
                        onChange={e => {
                          const newPassengers = [...(formData.passengers || [])];
                          newPassengers[index].firstName = e.target.value;
                          setFormData({ ...formData, passengers: newPassengers });
                        }} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        placeholder="Nombre"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Apellido</label>
                      <input 
                        type="text" 
                        value={passenger.lastName} 
                        onChange={e => {
                          const newPassengers = [...(formData.passengers || [])];
                          newPassengers[index].lastName = e.target.value;
                          setFormData({ ...formData, passengers: newPassengers });
                        }} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        placeholder="Apellido"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">F. Nacimiento</label>
                      <input 
                        type="date" 
                        value={passenger.dateOfBirth} 
                        onChange={e => {
                          const newPassengers = [...(formData.passengers || [])];
                          newPassengers[index].dateOfBirth = e.target.value;
                          setFormData({ ...formData, passengers: newPassengers });
                        }} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Pasaporte</label>
                      <input 
                        type="text" 
                        value={passenger.passportNumber} 
                        onChange={e => {
                          const newPassengers = [...(formData.passengers || [])];
                          newPassengers[index].passportNumber = e.target.value;
                          setFormData({ ...formData, passengers: newPassengers });
                        }} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        placeholder="Número"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                      <select 
                        value={passenger.type} 
                        onChange={e => {
                          const newPassengers = [...(formData.passengers || [])];
                          newPassengers[index].type = e.target.value as 'adult' | 'child';
                          setFormData({ ...formData, passengers: newPassengers });
                        }} 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="adult">Adulto</option>
                        <option value="child">Menor</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {(formData.passengers || []).length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-sm text-slate-400">No hay pasajeros registrados</p>
                  <button 
                    type="button"
                    onClick={() => {
                      const newPassenger = {
                        id: Math.random().toString(36).substr(2, 9),
                        firstName: '',
                        lastName: '',
                        dateOfBirth: '',
                        passportNumber: '',
                        type: 'adult' as const
                      };
                      setFormData({ ...formData, passengers: [...(formData.passengers || []), newPassenger] });
                    }}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    + Agregar el primero
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Fields based on Category */}
          {selectedProduct?.category === 'Vuelos' && (
            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-slate-600" /> Detalles del Vuelo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Aeropuerto Salida</label>
                  <select 
                    value={formData.originAirport} 
                    onChange={e => {
                      const airport = airports.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        originAirport: e.target.value,
                        originAirportCode: airport?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aeropuerto</option>
                    {airports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Salida</label>
                  <input type="text" value={formData.originAirportCode} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Aeropuerto Llegada</label>
                  <select 
                    value={formData.destinationAirport} 
                    onChange={e => {
                      const airport = airports.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        destinationAirport: e.target.value,
                        destinationAirportCode: airport?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aeropuerto</option>
                    {airports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Llegada</label>
                  <input type="text" value={formData.destinationAirportCode} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha/Hora Salida</label>
                  <input type="datetime-local" value={formData.departureDateTime} onChange={e => setFormData({...formData, departureDateTime: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha/Hora Llegada</label>
                  <input type="datetime-local" value={formData.arrivalDateTime} onChange={e => setFormData({...formData, arrivalDateTime: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Línea Aérea</label>
                  <select 
                    value={formData.airline} 
                    onChange={e => {
                      const airline = airlines.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        airline: e.target.value,
                        airlineCode: airline?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aerolínea</option>
                    {airlines.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Línea</label>
                  <input type="text" value={formData.airlineCode} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Número Vuelo</label>
                  <input type="text" value={formData.flightNumber} onChange={e => setFormData({...formData, flightNumber: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          )}

          {selectedProduct?.category === 'Hoteles' && (
            <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-slate-600" /> Detalles del Hotel
              </h3>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Hotel</label>
                <input type="text" value={formData.hotelName} onChange={e => setFormData({...formData, hotelName: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {selectedProduct?.category === 'Tours' && (
            <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-slate-600" /> Detalles del Tour
              </h3>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del Tour</label>
                <input type="text" value={formData.tourName} onChange={e => setFormData({...formData, tourName: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Pasajeros Adultos</label>
              <input 
                type="number" 
                min="1"
                value={formData.adults}
                onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Pasajeros Menores</label>
              <input 
                type="number" 
                min="0"
                value={formData.children}
                onChange={e => setFormData({...formData, children: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Fecha de Salida</label>
              <input 
                required
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Fecha de Regreso</label>
              <input 
                required
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-indigo-50/50 p-6 rounded-3xl space-y-4 border border-indigo-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-600" /> Precio de Venta
              </h3>
              <div className="flex gap-2">
                <select 
                  value={formData.currency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, currency, exchangeRate: rate });
                  }}
                  className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.exchangeRate}
                  onChange={e => setFormData({...formData, exchangeRate: parseFloat(e.target.value)})}
                  className="w-20 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold"
                  placeholder="T.C."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">Precio Adulto</label>
                <input 
                  type="number" 
                  value={formData.adultPrice}
                  onChange={e => setFormData({...formData, adultPrice: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">Precio Menor</label>
                <input 
                  type="number" 
                  value={formData.childPrice}
                  onChange={e => setFormData({...formData, childPrice: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">Tasa Serv.</label>
                <input 
                  type="number" 
                  value={formData.serviceFee}
                  onChange={e => setFormData({...formData, serviceFee: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">IVA</label>
                <input 
                  type="number" 
                  value={formData.tax}
                  onChange={e => setFormData({...formData, tax: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">Otros</label>
                <input 
                  type="number" 
                  value={formData.others}
                  onChange={e => setFormData({...formData, others: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-indigo-600 text-white p-2 rounded-xl text-center">
                  <p className="text-[8px] font-bold uppercase opacity-80">Total Venta</p>
                  <p className="text-sm font-black">{formatCurrency(calculateTotalPrice(), formData.currency)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Section */}
          <div className="bg-rose-50/50 p-6 rounded-3xl space-y-4 border border-rose-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-rose-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-rose-600" /> Costo Proveedor
              </h3>
              <div className="flex gap-2">
                <select 
                  value={formData.costCurrency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, costCurrency: currency, costExchangeRate: rate });
                  }}
                  className="px-2 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.costExchangeRate}
                  onChange={e => setFormData({...formData, costExchangeRate: parseFloat(e.target.value)})}
                  className="w-20 px-2 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold"
                  placeholder="T.C."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-600 uppercase">Costo Adulto</label>
                <input 
                  type="number" 
                  value={formData.adultCost}
                  onChange={e => setFormData({...formData, adultCost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-600 uppercase">Costo Menor</label>
                <input 
                  type="number" 
                  value={formData.childCost}
                  onChange={e => setFormData({...formData, childCost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-rose-600 text-white p-2 rounded-xl text-center">
                  <p className="text-[8px] font-bold uppercase opacity-80">Total Costo</p>
                  <p className="text-sm font-black">{formatCurrency(calculateTotalCost(), formData.costCurrency)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Section */}
          <div className="bg-emerald-50/50 p-6 rounded-3xl space-y-4 border border-emerald-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" /> Comisión Agente
              </h3>
              <div className="flex gap-2">
                <select 
                  value={formData.commissionCurrency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, commissionCurrency: currency, commissionExchangeRate: rate });
                  }}
                  className="px-2 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.commissionExchangeRate}
                  onChange={e => setFormData({...formData, commissionExchangeRate: parseFloat(e.target.value)})}
                  className="w-20 px-2 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold"
                  placeholder="T.C."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-600 uppercase">Comisión Adulto</label>
                <input 
                  type="number" 
                  value={formData.adultCommission}
                  onChange={e => setFormData({...formData, adultCommission: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-600 uppercase">Comisión Menor</label>
                <input 
                  type="number" 
                  value={formData.childCommission}
                  onChange={e => setFormData({...formData, childCommission: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-emerald-600 text-white p-2 rounded-xl text-center">
                  <p className="text-[8px] font-bold uppercase opacity-80">Total Comisión</p>
                  <p className="text-sm font-black">{formatCurrency(calculateTotalCommission(), formData.commissionCurrency)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-2 gap-4 p-6 bg-slate-900 rounded-3xl text-white">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Bruto (MXN)</p>
              <p className={cn("text-2xl font-black", grossMarginMXN >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formatCurrency(grossMarginMXN)}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Neto (MXN)</p>
              <p className={cn("text-2xl font-black", netMarginMXN >= 0 ? "text-blue-400" : "text-rose-400")}>
                {formatCurrency(netMarginMXN)}
              </p>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Crear Reserva
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const BookingDetailModal = ({ 
  booking, 
  onClose, 
  onUpdate,
  onDelete 
}: { 
  booking: Booking; 
  onClose: () => void; 
  onUpdate: (booking: Booking) => void;
  onDelete: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');
  const [currencyView, setCurrencyView] = useState<'original' | 'mxn'>('original');
  const [editData, setEditData] = useState<Booking>(booking);
  const [showSoa, setShowSoa] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    amount: 0,
    method: 'Transferencia',
    date: new Date().toISOString().split('T')[0],
    status: 'cleared',
    type: 'client_payment',
    currency: booking.currency || 'MXN',
    exchangeRate: booking.exchangeRate || 1
  });

  const [airports, setAirports] = useState<any[]>([]);
  const [airlines, setAirlines] = useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const airportsSnap = await getDocs(query(collection(db, 'catalog_airports'), orderBy('name', 'asc')));
        const airlinesSnap = await getDocs(query(collection(db, 'catalog_airlines'), orderBy('name', 'asc')));
        
        setAirports(airportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAirlines(airlinesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching catalogs:", error);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    fetchCatalogs();
  }, []);

  // Sync editData when booking prop changes (e.g. from parent update)
  useEffect(() => {
    setEditData(booking);
  }, [booking]);

  const currentTotalOriginal = useMemo(() => {
    return (Number(editData.adultPrice || 0) * Number(editData.adults || 1)) + 
           (Number(editData.childPrice || 0) * Number(editData.children || 0)) + 
           Number(editData.serviceFee || 0) + 
           Number(editData.tax || 0) + 
           Number(editData.others || 0);
  }, [editData.adultPrice, editData.adults, editData.childPrice, editData.children, editData.serviceFee, editData.tax, editData.others]);

  const currentTotalMXN = useMemo(() => {
    return convertToMXN(currentTotalOriginal, editData.currency, editData.exchangeRate);
  }, [currentTotalOriginal, editData.currency, editData.exchangeRate]);

  const totalPaidMXN = useMemo(() => 
    (editData.payments || [])
      .filter(p => p.type === 'client_payment' && p.status === 'cleared')
      .reduce((acc, p) => acc + convertToMXN(p.amount, p.currency, p.exchangeRate), 0)
  , [editData.payments]);

  const balanceMXN = currentTotalMXN - totalPaidMXN;

  const handleSave = () => {
    // Recalculate totals and margins
    const total = (Number(editData.adultPrice || 0) * Number(editData.adults || 1)) + 
                  (Number(editData.childPrice || 0) * Number(editData.children || 0)) + 
                  Number(editData.serviceFee || 0) + 
                  Number(editData.tax || 0) + 
                  Number(editData.others || 0);
    
    const cost = (Number(editData.adultCost || 0) * Number(editData.adults || 1)) + 
                 (Number(editData.childCost || 0) * Number(editData.children || 0));
    
    const commission = (Number(editData.adultCommission || 0) * Number(editData.adults || 1)) + 
                       (Number(editData.childCommission || 0) * Number(editData.children || 0));

    const totalMXN = convertToMXN(total, editData.currency, editData.exchangeRate);
    const costMXN = convertToMXN(cost, editData.costCurrency || 'MXN', editData.costExchangeRate || 1);
    const commissionMXN = convertToMXN(commission, editData.commissionCurrency || 'MXN', editData.commissionExchangeRate || 1);
    
    const grossMarginMXN = totalMXN - costMXN;
    const netMarginMXN = grossMarginMXN - commissionMXN;
    
    const updatedBooking = {
      ...editData,
      total,
      totalMXN,
      cost,
      costMXN,
      commission,
      commissionMXN,
      grossMarginMXN,
      netMarginMXN,
      price: (Number(editData.adultPrice || 0) * Number(editData.adults || 1)) + 
             (Number(editData.childPrice || 0) * Number(editData.children || 0))
    };
    
    onUpdate(updatedBooking);
    setIsEditing(false);
  };

  const handleAddPayment = () => {
    const payment: Payment = {
      id: `PAY-${Math.floor(Math.random() * 10000)}`,
      bookingId: booking.id,
      amount: Number(newPayment.amount),
      method: newPayment.method || 'Transferencia',
      date: newPayment.date || new Date().toISOString().split('T')[0],
      status: (newPayment.status as 'cleared' | 'pending') || 'cleared',
      type: 'client_payment',
      currency: (newPayment.currency as Currency) || 'MXN',
      exchangeRate: newPayment.exchangeRate || 1
    };

    const updatedBooking = {
      ...booking,
      payments: [...(booking.payments || []), payment]
    };

    onUpdate(updatedBooking);
    setShowAddPayment(false);
    setNewPayment({
      amount: 0,
      method: 'Transferencia',
      date: new Date().toISOString().split('T')[0],
      status: 'cleared',
      type: 'client_payment',
      currency: booking.currency || 'MXN',
      exchangeRate: booking.exchangeRate || 1
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Briefcase size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Editar Reserva' : 'Detalles de Reserva'}</h2>
                <p className="text-sm font-medium text-slate-500">{booking.id}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'details' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Información
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'payments' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Pagos & Reportes
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    if(confirm('¿Estás seguro de eliminar esta reserva?')) {
                      onDelete(booking.id);
                      onClose();
                    }
                  }}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </>
            ) : (
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                <Save size={18} /> Guardar Cambios
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> Información General
                  </h3>
                  <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cliente</p>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editData.clientName}
                          onChange={e => setEditData({ ...editData, clientName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.clientName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Producto</p>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={editData.productName}
                          onChange={e => setEditData({ ...editData, productName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.productName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Inicio</p>
                      {isEditing ? (
                        <input 
                          type="date"
                          value={editData.startDate}
                          onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.startDate}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fecha Fin</p>
                      {isEditing ? (
                        <input 
                          type="date"
                          value={editData.endDate}
                          onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.endDate}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pasajeros Adultos</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editData.adults}
                          onChange={e => setEditData({ ...editData, adults: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.adults || 0}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pasajeros Menores</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editData.children}
                          onChange={e => setEditData({ ...editData, children: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.children || 0}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Passengers Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Información de Pasajeros
                    </h3>
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newPassenger = {
                            id: Math.random().toString(36).substr(2, 9),
                            firstName: '',
                            lastName: '',
                            dateOfBirth: '',
                            passportNumber: '',
                            type: 'adult' as const
                          };
                          setEditData({ ...editData, passengers: [...(editData.passengers || []), newPassenger] });
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                      >
                        <Plus size={14} /> Agregar Pasajero
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {(isEditing ? (editData.passengers || []) : (booking.passengers || [])).map((passenger, index) => (
                      <div key={passenger.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 relative group">
                        {isEditing && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newPassengers = [...(editData.passengers || [])];
                              newPassengers.splice(index, 1);
                              setEditData({ ...editData, passengers: newPassengers });
                            }}
                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                            {isEditing ? (
                              <input 
                                type="text" 
                                value={passenger.firstName} 
                                onChange={e => {
                                  const newPassengers = [...(editData.passengers || [])];
                                  newPassengers[index].firstName = e.target.value;
                                  setEditData({ ...editData, passengers: newPassengers });
                                }} 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            ) : (
                              <p className="text-sm font-bold text-slate-900">{passenger.firstName || '-'}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Apellido</label>
                            {isEditing ? (
                              <input 
                                type="text" 
                                value={passenger.lastName} 
                                onChange={e => {
                                  const newPassengers = [...(editData.passengers || [])];
                                  newPassengers[index].lastName = e.target.value;
                                  setEditData({ ...editData, passengers: newPassengers });
                                }} 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            ) : (
                              <p className="text-sm font-bold text-slate-900">{passenger.lastName || '-'}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">F. Nacimiento</label>
                            {isEditing ? (
                              <input 
                                type="date" 
                                value={passenger.dateOfBirth} 
                                onChange={e => {
                                  const newPassengers = [...(editData.passengers || [])];
                                  newPassengers[index].dateOfBirth = e.target.value;
                                  setEditData({ ...editData, passengers: newPassengers });
                                }} 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            ) : (
                              <p className="text-sm font-bold text-slate-900">{passenger.dateOfBirth || '-'}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Pasaporte</label>
                            {isEditing ? (
                              <input 
                                type="text" 
                                value={passenger.passportNumber} 
                                onChange={e => {
                                  const newPassengers = [...(editData.passengers || [])];
                                  newPassengers[index].passportNumber = e.target.value;
                                  setEditData({ ...editData, passengers: newPassengers });
                                }} 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            ) : (
                              <p className="text-sm font-bold text-slate-900">{passenger.passportNumber || '-'}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                            {isEditing ? (
                              <select 
                                value={passenger.type} 
                                onChange={e => {
                                  const newPassengers = [...(editData.passengers || [])];
                                  newPassengers[index].type = e.target.value as 'adult' | 'child';
                                  setEditData({ ...editData, passengers: newPassengers });
                                }} 
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              >
                                <option value="adult">Adulto</option>
                                <option value="child">Menor</option>
                              </select>
                            ) : (
                              <p className="text-sm font-bold text-slate-900 capitalize">{passenger.type === 'adult' ? 'Adulto' : 'Menor'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(isEditing ? (editData.passengers || []) : (booking.passengers || [])).length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-sm text-slate-400 italic">No hay pasajeros registrados</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Dynamic Product Details */}
                {(booking.category === 'Vuelos' || editData.category === 'Vuelos') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Package size={14} /> Detalles del Vuelo
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aeropuerto Salida</p>
                        {isEditing ? (
                          <select 
                            value={editData.originAirport} 
                            onChange={e => {
                              const airport = airports.find(a => a.name === e.target.value);
                              setEditData({ 
                                ...editData, 
                                originAirport: e.target.value,
                                originAirportCode: airport?.code || ''
                              });
                            }} 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">Seleccionar Aeropuerto</option>
                            {airports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.originAirport} ({booking.originAirportCode})</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aeropuerto Llegada</p>
                        {isEditing ? (
                          <select 
                            value={editData.destinationAirport} 
                            onChange={e => {
                              const airport = airports.find(a => a.name === e.target.value);
                              setEditData({ 
                                ...editData, 
                                destinationAirport: e.target.value,
                                destinationAirportCode: airport?.code || ''
                              });
                            }} 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">Seleccionar Aeropuerto</option>
                            {airports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.destinationAirport} ({booking.destinationAirportCode})</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Línea Aérea</p>
                        {isEditing ? (
                          <select 
                            value={editData.airline} 
                            onChange={e => {
                              const airline = airlines.find(a => a.name === e.target.value);
                              setEditData({ 
                                ...editData, 
                                airline: e.target.value,
                                airlineCode: airline?.code || ''
                              });
                            }} 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">Seleccionar Aerolínea</option>
                            {airlines.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                          </select>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.airline} ({booking.airlineCode})</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vuelo</p>
                        {isEditing ? (
                          <input type="text" value={editData.flightNumber} onChange={e => setEditData({ ...editData, flightNumber: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.flightNumber}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Salida</p>
                        {isEditing ? (
                          <input type="datetime-local" value={editData.departureDateTime} onChange={e => setEditData({ ...editData, departureDateTime: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.departureDateTime}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Llegada</p>
                        {isEditing ? (
                          <input type="datetime-local" value={editData.arrivalDateTime} onChange={e => setEditData({ ...editData, arrivalDateTime: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                        ) : (
                          <p className="text-sm font-bold text-slate-900">{booking.arrivalDateTime}</p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {(booking.category === 'Hoteles' || editData.category === 'Hoteles') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Package size={14} /> Detalles del Hotel
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre del Hotel</p>
                      {isEditing ? (
                        <input type="text" value={editData.hotelName} onChange={e => setEditData({ ...editData, hotelName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.hotelName}</p>
                      )}
                    </div>
                  </section>
                )}

                {(booking.category === 'Tours' || editData.category === 'Tours') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Package size={14} /> Detalles del Tour
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre del Tour</p>
                      {isEditing ? (
                        <input type="text" value={editData.tourName} onChange={e => setEditData({ ...editData, tourName: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{booking.tourName}</p>
                      )}
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} /> Desglose Financiero
                    </h3>
                    {!isEditing && booking.currency !== 'MXN' && (
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                          onClick={() => setCurrencyView('original')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                            currencyView === 'original' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {booking.currency}
                        </button>
                        <button 
                          onClick={() => setCurrencyView('mxn')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                            currencyView === 'mxn' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          MXN
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                        <Tag size={10} /> Precio Adulto
                      </p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editData.adultPrice}
                          onChange={e => setEditData({ ...editData, adultPrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-lg font-bold text-slate-900">
                          {currencyView === 'original' 
                            ? formatCurrency(booking.adultPrice || 0)
                            : formatCurrency(convertToMXN(booking.adultPrice || 0, booking.currency, booking.exchangeRate))
                          }
                          <span className="text-[10px] text-slate-400 ml-1">{currencyView === 'original' ? booking.currency : 'MXN'}</span>
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                        <Tag size={10} /> Precio Menor
                      </p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editData.childPrice}
                          onChange={e => setEditData({ ...editData, childPrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : (
                        <p className="text-lg font-bold text-slate-900">
                          {currencyView === 'original' 
                            ? formatCurrency(booking.childPrice || 0)
                            : formatCurrency(convertToMXN(booking.childPrice || 0, booking.currency, booking.exchangeRate))
                          }
                          <span className="text-[10px] text-slate-400 ml-1">{currencyView === 'original' ? booking.currency : 'MXN'}</span>
                        </p>
                      )}
                    </div>
                    {[
                      { label: 'Service Fee', key: 'serviceFee', icon: Calculator },
                      { label: 'Impuestos', key: 'tax', icon: BarChart3 },
                      { label: 'Otros', key: 'others', icon: Plus },
                    ].map((item) => (
                      <div key={item.key} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                          <item.icon size={10} /> {item.label}
                        </p>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              value={editData[item.key as keyof Booking] as number}
                              onChange={e => setEditData({ ...editData, [item.key]: Number(e.target.value) })}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="text-[10px] font-bold text-slate-400">{editData.currency}</span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-slate-900">
                            {currencyView === 'original' 
                              ? formatCurrency(booking[item.key as keyof Booking] as number)
                              : formatCurrency(convertToMXN(booking[item.key as keyof Booking] as number, booking.currency, booking.exchangeRate))
                            }
                            <span className="text-[10px] text-slate-400 ml-1">
                              {currencyView === 'original' ? booking.currency : 'MXN'}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Total de la Reserva</p>
                      <div className="flex flex-col">
                        <h4 className="text-3xl font-black mt-1">
                          {currencyView === 'original' || isEditing
                            ? formatCurrency(currentTotalOriginal)
                            : formatCurrency(currentTotalMXN)
                          }
                          <span className="text-sm font-normal ml-1 opacity-80">
                            {isEditing ? editData.currency : (currencyView === 'original' ? booking.currency : 'MXN')}
                          </span>
                        </h4>
                        {!isEditing && booking.currency !== 'MXN' && (
                          <p className="text-xs font-bold text-indigo-100 mt-1">
                            {currencyView === 'original' 
                              ? `Equivalente: ${formatCurrency(currentTotalMXN)} MXN`
                              : `Original: ${formatCurrency(booking.total)} ${booking.currency}`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Estado</p>
                      <div className="mt-1 flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                        <CheckCircle2 size={14} /> {booking.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Análisis de Margen</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span>Costo Adulto</span>
                        <span className="text-slate-200">${isEditing ? editData.adultCost : booking.adultCost}</span>
                      </div>
                      {isEditing && (
                        <input 
                          type="number"
                          value={editData.adultCost}
                          onChange={e => setEditData({ ...editData, adultCost: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span>Costo Menor</span>
                        <span className="text-slate-200">${isEditing ? editData.childCost : booking.childCost}</span>
                      </div>
                      {isEditing && (
                        <input 
                          type="number"
                          value={editData.childCost}
                          onChange={e => setEditData({ ...editData, childCost: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span>Comisión Adulto</span>
                        <span className="text-slate-200">${isEditing ? editData.adultCommission : booking.adultCommission}</span>
                      </div>
                      {isEditing && (
                        <input 
                          type="number"
                          value={editData.adultCommission}
                          onChange={e => setEditData({ ...editData, adultCommission: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span>Comisión Menor</span>
                        <span className="text-slate-200">${isEditing ? editData.childCommission : booking.childCommission}</span>
                      </div>
                      {isEditing && (
                        <input 
                          type="number"
                          value={editData.childCommission}
                          onChange={e => setEditData({ ...editData, childCommission: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                        />
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Margen Bruto</p>
                      <p className="text-xl font-bold text-emerald-400">
                        ${isEditing 
                          ? (currentTotalOriginal - ((Number(editData.adultCost || 0) * Number(editData.adults || 1)) + (Number(editData.childCost || 0) * Number(editData.children || 0))))
                          : booking.grossMargin
                        }
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Margen Neto</p>
                      <p className="text-2xl font-black text-blue-400">
                        ${isEditing 
                          ? (currentTotalOriginal - 
                            ((Number(editData.adultCost || 0) * Number(editData.adults || 1)) + (Number(editData.childCost || 0) * Number(editData.children || 0))) - 
                            ((Number(editData.adultCommission || 0) * Number(editData.adults || 1)) + (Number(editData.childCommission || 0) * Number(editData.children || 0))))
                          : booking.netMargin
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <AlertCircle size={18} />
                    <span>Recordatorio</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Esta reserva está confirmada. Cualquier cambio en los costos afectará directamente el margen neto reportado en el dashboard.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Payments Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Reserva</p>
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(currentTotalMXN)} <span className="text-xs font-normal text-slate-400">MXN</span></p>
                  {booking.currency !== 'MXN' && (
                    <p className="text-xs font-bold text-slate-500 mt-1">Original: {formatCurrency(booking.total)} {booking.currency}</p>
                  )}
                </div>
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Pagado</p>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrency(totalPaidMXN)} <span className="text-xs font-normal text-emerald-400">MXN</span></p>
                </div>
                <div className={cn(
                  "p-6 rounded-2xl border",
                  balanceMXN > 0 ? "bg-rose-50 border-rose-100" : "bg-blue-50 border-blue-100"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                    balanceMXN > 0 ? "text-rose-600" : "text-blue-600"
                  )}>Saldo Pendiente</p>
                  <p className={cn(
                    "text-2xl font-black",
                    balanceMXN > 0 ? "text-rose-700" : "text-blue-700"
                  )}>{formatCurrency(balanceMXN)} <span className={cn("text-xs font-normal opacity-60", balanceMXN > 0 ? "text-rose-400" : "text-blue-400")}>MXN</span></p>
                  {booking.currency !== 'MXN' && balanceMXN > 0 && (
                    <p className={cn("text-xs font-bold mt-1", balanceMXN > 0 ? "text-rose-500" : "text-blue-500")}>
                      Original: {formatCurrency(balanceMXN / booking.exchangeRate)} {booking.currency}
                    </p>
                  )}
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} /> Historial de Pagos
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowSoa(true)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <FileText size={14} /> Estado de Cuenta
                    </button>
                    <button 
                      onClick={() => setShowAddPayment(true)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      <Plus size={14} /> Registrar Pago
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Método</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Monto</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(booking.payments || []).filter(p => p.type === 'client_payment').length > 0 ? (
                        (booking.payments || [])
                          .filter(p => p.type === 'client_payment')
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-slate-600">{p.date}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                    <CreditCard size={12} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{p.method}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  p.status === 'cleared' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                  {p.status === 'cleared' ? 'Aplicado' : 'Pendiente'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-slate-900">
                                ${p.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => {
                                    if(confirm('¿Eliminar este pago?')) {
                                      const updatedBooking = {
                                        ...booking,
                                        payments: (booking.payments || []).filter(pay => pay.id !== p.id)
                                      };
                                      onUpdate(updatedBooking);
                                    }
                                  }}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <Receipt size={32} strokeWidth={1.5} />
                              <p className="text-sm font-medium italic">No hay pagos registrados para esta reserva.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Payment Overlay */}
      <AnimatePresence>
        {showAddPayment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowAddPayment(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Registrar Pago</h3>
                <button onClick={() => setShowAddPayment(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Monto</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number"
                        value={newPayment.amount}
                        onChange={e => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Moneda</label>
                    <select 
                      value={newPayment.currency}
                      onChange={e => {
                        const currency = e.target.value as Currency;
                        const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                        setNewPayment({ ...newPayment, currency, exchangeRate: rate });
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {newPayment.currency !== 'MXN' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Tipo de Cambio (a MXN)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={newPayment.exchangeRate}
                      onChange={e => setNewPayment({ ...newPayment, exchangeRate: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Método de Pago</label>
                  <select 
                    value={newPayment.method}
                    onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Fecha</label>
                  <input 
                    type="date"
                    value={newPayment.date}
                    onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Estado</label>
                  <select 
                    value={newPayment.status}
                    onChange={e => setNewPayment({ ...newPayment, status: e.target.value as 'cleared' | 'pending' })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="cleared">Aplicado (Cleared)</option>
                    <option value="pending">Pendiente (Pending)</option>
                  </select>
                </div>

                {/* Preview Section */}
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Saldo Actual</span>
                    <span className="text-sm font-bold text-slate-600">{formatCurrency(balanceMXN)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Este Pago (MXN)</span>
                    <span className="text-sm font-bold text-emerald-600">
                      -{formatCurrency(convertToMXN(Number(newPayment.amount), newPayment.currency as Currency, newPayment.exchangeRate))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-indigo-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Nuevo Saldo</span>
                    <span className="text-lg font-black text-indigo-700">
                      {formatCurrency(balanceMXN - (newPayment.status === 'cleared' ? convertToMXN(Number(newPayment.amount), newPayment.currency as Currency, newPayment.exchangeRate) : 0))}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddPayment}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
              >
                Confirmar Pago
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOA Modal */}
      <AnimatePresence>
        {showSoa && (
          <StatementOfAccountModal 
            booking={booking} 
            onClose={() => setShowSoa(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const Bookings = () => {
  const location = useLocation();
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 'BK-9021',
      clientId: '1',
      clientName: 'Juan Pérez',
      productId: 'p1',
      productName: 'Vuelo Madrid-Londres',
      startDate: '2025-05-15',
      endDate: '2025-05-20',
      currency: 'MXN',
      exchangeRate: 1,
      price: 180,
      serviceFee: 20,
      tax: 38,
      others: 10,
      total: 248,
      cost: 150,
      grossMargin: 98,
      commission: 15,
      netMargin: 83,
      status: 'confirmed',
      payments: [
        { id: 'PAY-1', bookingId: 'BK-9021', amount: 100, currency: 'MXN', exchangeRate: 1, method: 'Transferencia', type: 'client_payment', status: 'cleared', date: '2025-03-01' },
        { id: 'PAY-2', bookingId: 'BK-9021', amount: 50, currency: 'MXN', exchangeRate: 1, method: 'Efectivo', type: 'client_payment', status: 'cleared', date: '2025-03-10' }
      ]
    },
    {
      id: 'BK-8544',
      clientId: '1',
      clientName: 'Juan Pérez',
      productId: 'p3',
      productName: 'Habitación Deluxe (Noche)',
      startDate: '2024-10-10',
      endDate: '2024-10-15',
      currency: 'MXN',
      exchangeRate: 1,
      price: 1250,
      serviceFee: 50,
      tax: 200,
      others: 0,
      total: 1500,
      cost: 1000,
      grossMargin: 500,
      commission: 100,
      netMargin: 400,
      status: 'confirmed',
      payments: [
        { id: 'PAY-3', bookingId: 'BK-8544', amount: 1500, currency: 'MXN', exchangeRate: 1, method: 'Tarjeta de Crédito', type: 'client_payment', status: 'cleared', date: '2024-09-20' }
      ]
    },
    {
      id: 'BK-7721',
      clientId: '3',
      clientName: 'Carlos Ruiz',
      productId: 'p2',
      productName: 'Vuelo Madrid-París',
      startDate: '2025-01-05',
      endDate: '2025-01-10',
      currency: 'MXN',
      exchangeRate: 1,
      price: 150,
      serviceFee: 15,
      tax: 30,
      others: 5,
      total: 200,
      cost: 120,
      grossMargin: 80,
      commission: 10,
      netMargin: 70,
      status: 'confirmed',
      payments: []
    }
  ]);

  useEffect(() => {
    const convertedBookings = JSON.parse(localStorage.getItem('converted_bookings') || '[]');
    if (convertedBookings.length > 0) {
      setBookings(prev => {
        // Filter out any that might already be in state to avoid duplicates
        const existingIds = new Set(prev.map(b => b.id));
        const newOnes = convertedBookings.filter((b: Booking) => !existingIds.has(b.id));
        return [...newOnes, ...prev];
      });
    }
  }, []);

  const [filterProduct, setFilterProduct] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [soaBooking, setSoaBooking] = useState<Booking | null>(null);

  const getTripStatus = (startDate: string, endDate: string) => {
    const today = new Date('2026-03-21');
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (today < start) return 'En proceso';
    if (today > end) return 'Terminado';
    return 'Activo';
  };

  // Mock data for modal
  const clients: Client[] = [
    { id: '1', name: 'Juan Pérez', email: 'juan@ejemplo.com', leadStatus: 'Calificado', phone: '+52 55 1234 5678' },
    { id: '2', name: 'María García', email: 'maria@ejemplo.com', leadStatus: 'Nuevo', phone: '+52 55 8765 4321' },
    { id: '3', name: 'Carlos Ruiz', email: 'carlos@ejemplo.com', leadStatus: 'Contactado', phone: '+52 55 1122 3344' }
  ];
  const products: Product[] = [
    { id: 'p1', name: 'Vuelo Madrid-Londres', basePrice: 150, supplierId: 's1', supplierName: 'Iberia Airlines', category: 'Vuelos', currency: 'USD' },
    { id: 'p2', name: 'Vuelo Madrid-París', basePrice: 120, supplierId: 's1', supplierName: 'Iberia Airlines', category: 'Vuelos', currency: 'EUR' },
    { id: 'p3', name: 'Habitación Deluxe (Noche)', basePrice: 250, supplierId: 's2', supplierName: 'Marriott International', category: 'Hoteles', currency: 'MXN' }
  ];
  const suppliers = [
    { id: 's1', commercialName: 'Iberia Airlines' },
    { id: 's2', commercialName: 'Marriott International' }
  ];

  useEffect(() => {
    if (location.state && (location.state as any).clientId) {
      setIsNewBookingModalOpen(true);
    }
  }, [location.state]);

  const handleCreateBooking = (newBooking: Booking) => {
    setBookings([newBooking, ...bookings]);
    setIsNewBookingModalOpen(false);
  };

  const handleUpdateBooking = (updatedBooking: Booking) => {
    setBookings(bookings.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    setSelectedBooking(updatedBooking);
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(bookings.filter(b => b.id !== id));
    setSelectedBooking(null);
  };

  const filteredBookings = bookings.filter(b => {
    const matchesProduct = filterProduct === 'Todos' || b.productName.includes(filterProduct);
    const status = getTripStatus(b.startDate, b.endDate);
    const matchesStatus = filterStatus === 'Todos' || status === filterStatus;
    
    const bookingStart = new Date(b.startDate);
    const filterStart = dateRange.start ? new Date(dateRange.start) : null;
    const filterEnd = dateRange.end ? new Date(dateRange.end) : null;
    
    const matchesDate = (!filterStart || bookingStart >= filterStart) && 
                        (!filterEnd || bookingStart <= filterEnd);
    
    return matchesProduct && matchesStatus && matchesDate;
  });

  const totalSales = bookings.reduce((acc, b) => acc + (b.totalMXN || b.total), 0);
  const totalNetMargin = bookings.reduce((acc, b) => acc + (b.netMarginMXN || b.netMargin), 0);
  const avgMargin = totalSales > 0 ? (totalNetMargin / totalSales) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reservas & Dashboard</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsNewBookingModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> Nueva Reserva
          </button>
          <button className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Filter size={18} /> Exportar
          </button>
        </div>
      </header>

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: `$${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Margen Neto Total', value: `$${totalNetMargin.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Margen Promedio', value: `${avgMargin.toFixed(1)}%`, icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Reservas Confirmadas', value: bookings.length.toString(), icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold mt-1 text-slate-900">{stat.value}</h3>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={16} /> Producto:
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Todos', 'Vuelo', 'Habitación', 'Tour'].map((p) => (
                <button 
                  key={p}
                  onClick={() => setFilterProduct(p)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    filterProduct === p 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
              <CheckCircle2 size={16} /> Estado:
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Todos', 'En proceso', 'Activo', 'Terminado'].map((s) => (
                <button 
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                    filterStatus === s 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4 border-l border-slate-100 pl-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desde</label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hasta</label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          <button 
            onClick={() => setDateRange({ start: '', end: '' })}
            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
            title="Limpiar fechas"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Listado de Reservas</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar reserva..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID / Cliente</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fechas</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Finanzas</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBookings.map((b) => (
              <tr 
                key={b.id} 
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                onClick={() => setSelectedBooking(b)}
              >
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{b.id}</p>
                  <p className="text-xs text-slate-500">{b.clientName}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                      <Package size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{b.productName}</span>
                      <div className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <span>{b.adults || 0} Adultos</span>
                        <span>{b.children || 0} Menores</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{b.startDate} - {b.endDate}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">
                      Total: {formatCurrency(b.total, b.currency)}
                    </p>
                    {b.currency !== 'MXN' && b.totalMXN && (
                      <p className="text-[10px] font-medium text-slate-400">({formatCurrency(b.totalMXN, 'MXN')})</p>
                    )}
                    <div className="flex gap-2 text-[10px] font-bold uppercase">
                      <span className="text-emerald-600">M. Bruto: {formatCurrency(b.grossMarginMXN || b.grossMargin, 'MXN')}</span>
                      <span className="text-blue-600">M. Neto: {formatCurrency(b.netMarginMXN || b.netMargin, 'MXN')}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const status = getTripStatus(b.startDate, b.endDate);
                    return (
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        status === 'En proceso' ? "bg-amber-50 text-amber-600" :
                        status === 'Activo' ? "bg-emerald-50 text-emerald-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {status}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSoaBooking(b);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Ver Estado de Cuenta"
                    >
                      <FileText size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailModal 
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)}
            onUpdate={handleUpdateBooking}
            onDelete={handleDeleteBooking}
          />
        )}
        {isNewBookingModalOpen && (
          <NewBookingModal 
            clients={clients}
            products={products}
            suppliers={suppliers}
            onClose={() => setIsNewBookingModalOpen(false)}
            onSave={handleCreateBooking}
          />
        )}
        {soaBooking && (
          <StatementOfAccountModal 
            booking={soaBooking} 
            onClose={() => setSoaBooking(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
