import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Package, Trash2, Edit2, X, ChevronRight, CheckCircle2, User, Calendar, DollarSign, Calculator, Tag, AlertCircle, TrendingUp, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Product, Client, Currency, Supplier, Airport, Airline } from '../types';
import { cn } from '../lib/utils';
import { formatCurrency, convertToMXN, EXCHANGE_RATES } from '../lib/currency';

const QuotationModal = ({ clients, products, suppliers, onClose, onSave, onConfirmSale, quotation }: { clients: Client[], products: Product[], suppliers: Supplier[], onClose: () => void, onSave: (quotation: any) => void, onConfirmSale: (quotation: any) => void, quotation?: any }) => {
  const [formData, setFormData] = useState(quotation || {
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
    priceCurrency: 'MXN' as Currency,
    priceExchangeRate: 1,
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
    
    status: 'quotation'
  });

  const [availableAirports, setAvailableAirports] = useState<Airport[]>([]);
  const [availableAirlines, setAvailableAirlines] = useState<Airline[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [airSnap, lineSnap] = await Promise.all([
          getDocs(query(collection(db, 'catalog_airports'), orderBy('name'))),
          getDocs(query(collection(db, 'catalog_airlines'), orderBy('name')))
        ]);
        setAvailableAirports(airSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Airport)));
        setAvailableAirlines(lineSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Airline)));
      } catch (error) {
        console.error("Error fetching catalogs:", error);
      }
    };
    fetchData();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === formData.productId);
  }, [formData.productId, products]);

  const calculateTotalPrice = () => {
    const totalAdults = Number(formData.adultPrice) * Number(formData.adults);
    const totalChildren = Number(formData.childPrice) * Number(formData.children);
    return totalAdults + totalChildren + Number(formData.serviceFee) + Number(formData.tax) + Number(formData.others);
  };

  const calculateTotalCost = () => {
    const totalAdults = Number(formData.adultCost) * Number(formData.adults);
    const totalChildren = Number(formData.childCost) * Number(formData.children);
    return totalAdults + totalChildren;
  };

  const calculateTotalCommission = () => {
    const totalAdults = Number(formData.adultCommission) * Number(formData.adults);
    const totalChildren = Number(formData.childCommission) * Number(formData.children);
    return totalAdults + totalChildren;
  };

  const totalPriceMXN = useMemo(() => {
    return calculateTotalPrice() * formData.priceExchangeRate;
  }, [formData.adultPrice, formData.childPrice, formData.adults, formData.children, formData.serviceFee, formData.tax, formData.others, formData.priceExchangeRate]);

  const costMXN = useMemo(() => {
    return calculateTotalCost() * formData.costExchangeRate;
  }, [formData.adultCost, formData.childCost, formData.adults, formData.children, formData.costExchangeRate]);

  const commissionMXN = useMemo(() => {
    return calculateTotalCommission() * formData.commissionExchangeRate;
  }, [formData.adultCommission, formData.childCommission, formData.adults, formData.children, formData.commissionExchangeRate]);

  const grossMarginMXN = totalPriceMXN - costMXN;
  const netMarginMXN = grossMarginMXN - commissionMXN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      id: formData.id || `QT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      ...formData,
      price: calculateTotalPrice(), // Store total price as 'price' for compatibility
      total: calculateTotalPrice(),
      totalMXN: totalPriceMXN,
      cost: calculateTotalCost(),
      costMXN,
      commission: calculateTotalCommission(),
      commissionMXN,
      grossMarginMXN,
      netMarginMXN,
      createdAt: formData.createdAt || new Date().toISOString()
    });
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const rate = EXCHANGE_RATES.find(r => r.from === product.currency)?.rate || 1;
      setFormData({ 
        ...formData, 
        productId, 
        productName: product.name,
        category: product.category,
        adultCost: product.basePrice,
        childCost: product.basePrice * 0.5, // Default 50% for children
        costCurrency: product.currency,
        costExchangeRate: rate,
        adultPrice: product.basePrice * 1.2, // Default 20% markup
        childPrice: (product.basePrice * 0.5) * 1.2,
        priceCurrency: product.currency,
        priceExchangeRate: rate,
        // Pre-fill names based on category
        hotelName: product.category === 'Hoteles' ? product.name : '',
        tourName: product.category === 'Tours' ? product.name : ''
      });
    }
  };

  const filteredProducts = useMemo(() => {
    if (!formData.supplierId) return [];
    return products.filter(p => p.supplierId === formData.supplierId);
  }, [formData.supplierId, products]);

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
          <h2 className="text-xl font-bold text-slate-900">{quotation ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
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
                      const airport = availableAirports.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        originAirport: e.target.value,
                        originAirportCode: airport?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aeropuerto</option>
                    {availableAirports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Salida</label>
                  <input type="text" readOnly value={formData.originAirportCode} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Aeropuerto Llegada</label>
                  <select 
                    value={formData.destinationAirport} 
                    onChange={e => {
                      const airport = availableAirports.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        destinationAirport: e.target.value,
                        destinationAirportCode: airport?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aeropuerto</option>
                    {availableAirports.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Llegada</label>
                  <input type="text" readOnly value={formData.destinationAirportCode} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
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
                      const airline = availableAirlines.find(a => a.name === e.target.value);
                      setFormData({
                        ...formData, 
                        airline: e.target.value,
                        airlineCode: airline?.code || ''
                      });
                    }} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Seleccionar Aerolínea</option>
                    {availableAirlines.map(a => <option key={a.id} value={a.name}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Código Línea</label>
                  <input type="text" readOnly value={formData.airlineCode} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500" />
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
                  value={formData.priceCurrency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, priceCurrency: currency, priceExchangeRate: rate });
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
                  value={formData.priceExchangeRate}
                  onChange={e => setFormData({...formData, priceExchangeRate: parseFloat(e.target.value)})}
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
            </div>
            <div className="flex justify-end pt-2">
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Precio Total en MXP</p>
                <p className="text-lg font-black text-indigo-700">{formatCurrency(totalPriceMXN)}</p>
              </div>
            </div>
          </div>

          {/* Cost Section */}
          <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={16} className="text-slate-600" /> Costo del Proveedor
              </h3>
              <div className="flex gap-2">
                <select 
                  value={formData.costCurrency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, costCurrency: currency, costExchangeRate: rate });
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
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
                  className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  placeholder="T.C."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Costo Adulto</label>
                <input 
                  type="number" 
                  value={formData.adultCost}
                  onChange={e => setFormData({...formData, adultCost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Costo Menor</label>
                <input 
                  type="number" 
                  value={formData.childCost}
                  onChange={e => setFormData({...formData, childCost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="text-right flex flex-col justify-end">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Total en MXP</p>
                <p className="text-lg font-black text-slate-700">{formatCurrency(costMXN)}</p>
              </div>
            </div>
          </div>

          {/* Commission Section */}
          <div className="bg-amber-50/50 p-6 rounded-3xl space-y-4 border border-amber-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest flex items-center gap-2">
                <User size={16} className="text-amber-600" /> Comisión Agente
              </h3>
              <div className="flex gap-2">
                <select 
                  value={formData.commissionCurrency}
                  onChange={e => {
                    const currency = e.target.value as Currency;
                    const rate = EXCHANGE_RATES.find(r => r.from === currency)?.rate || 1;
                    setFormData({ ...formData, commissionCurrency: currency, commissionExchangeRate: rate });
                  }}
                  className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold"
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
                  className="w-20 px-2 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold"
                  placeholder="T.C."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-600 uppercase">Comisión Adulto</label>
                <input 
                  type="number" 
                  value={formData.adultCommission}
                  onChange={e => setFormData({...formData, adultCommission: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-600 uppercase">Comisión Menor</label>
                <input 
                  type="number" 
                  value={formData.childCommission}
                  onChange={e => setFormData({...formData, childCommission: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm"
                />
              </div>
              <div className="text-right flex flex-col justify-end">
                <p className="text-[10px] font-bold text-amber-400 uppercase">Comisión Total en MXP</p>
                <p className="text-lg font-black text-amber-700">{formatCurrency(commissionMXN)}</p>
              </div>
            </div>
          </div>

          {/* Margins Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <TrendingUp size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Margen Bruto</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Original</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(calculateTotalPrice() - formData.cost, formData.priceCurrency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">MXP</p>
                  <p className="text-xl font-black text-emerald-800">{formatCurrency(grossMarginMXN)}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Calculator size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Margen Neto</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Original</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency((calculateTotalPrice() - formData.cost) - formData.commission, formData.priceCurrency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-blue-500 uppercase">MXP</p>
                  <p className="text-xl font-black text-blue-800">{formatCurrency(netMarginMXN)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            {quotation && quotation.status === 'quotation' && (
              <button 
                type="button" 
                onClick={() => onConfirmSale({
                  ...formData,
                  price: calculateTotalPrice(),
                  total: calculateTotalPrice(),
                  totalMXN: totalPriceMXN,
                  cost: calculateTotalCost(),
                  costMXN,
                  commission: calculateTotalCommission(),
                  commissionMXN,
                  grossMarginMXN,
                  netMarginMXN
                })}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Confirmar Venta
              </button>
            )}
            <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              {quotation ? 'Guardar Cambios' : 'Generar Cotización'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

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
        type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
      )}
    >
      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <span className="font-bold text-sm">{message}</span>
    </motion.div>
  );
};

export const Quotations = () => {
  const [quotations, setQuotations] = useState<any[]>([
    {
      id: 'QT-A1B2C',
      clientId: '1',
      clientName: 'Juan Pérez',
      productId: 'p1',
      productName: 'Vuelo Madrid-Londres',
      startDate: '2025-05-15',
      endDate: '2025-05-20',
      price: 180,
      priceCurrency: 'USD',
      priceExchangeRate: 20,
      serviceFee: 20,
      tax: 38,
      others: 10,
      total: 248,
      totalMXN: 248 * 20,
      cost: 150,
      costCurrency: 'USD',
      costExchangeRate: 20,
      costMXN: 150 * 20,
      commission: 15,
      commissionCurrency: 'USD',
      commissionExchangeRate: 20,
      commissionMXN: 15 * 20,
      grossMarginMXN: (248 - 150) * 20,
      netMarginMXN: (248 - 150 - 15) * 20,
      status: 'quotation',
      createdAt: '2026-03-20T10:00:00Z'
    }
  ]);

  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Mock data for modal
  const clients: Client[] = [
    { id: '1', name: 'Juan Pérez', email: 'juan@ejemplo.com', leadStatus: 'Calificado', phone: '+52 55 1234 5678' },
    { id: '2', name: 'María García', email: 'maria@ejemplo.com', leadStatus: 'Nuevo', phone: '+52 55 8765 4321' }
  ];

  const suppliers: Supplier[] = [
    { 
      id: 's1', 
      legalName: 'Iberia Airlines S.A.', 
      commercialName: 'Iberia Airlines', 
      address: 'Madrid, Spain', 
      phone: '+34 91 123 4567', 
      email: 'contact@iberia.com', 
      rfc: 'IBE123456789', 
      bankAccounts: [], 
      products: [] 
    },
    { 
      id: 's2', 
      legalName: 'Marriott International Inc.', 
      commercialName: 'Marriott International', 
      address: 'Bethesda, MD, USA', 
      phone: '+1 301 380 3000', 
      email: 'contact@marriott.com', 
      rfc: 'MAR123456789', 
      bankAccounts: [], 
      products: [] 
    },
    { 
      id: 's3', 
      legalName: 'Tours del Mundo S.A.', 
      commercialName: 'Tours del Mundo', 
      address: 'CDMX, México', 
      phone: '+52 55 1234 5678', 
      email: 'contact@toursmundo.com', 
      rfc: 'TDM123456789', 
      bankAccounts: [], 
      products: [] 
    }
  ];

  const products: Product[] = [
    { id: 'p1', name: 'Vuelo Madrid-Londres', basePrice: 150, supplierId: 's1', supplierName: 'Iberia Airlines', category: 'Vuelos', currency: 'USD' },
    { id: 'p2', name: 'Vuelo Madrid-París', basePrice: 120, supplierId: 's1', supplierName: 'Iberia Airlines', category: 'Vuelos', currency: 'EUR' },
    { id: 'p3', name: 'Habitación Deluxe (Noche)', basePrice: 2500, supplierId: 's2', supplierName: 'Marriott International', category: 'Hoteles', currency: 'MXN' },
    { id: 'p4', name: 'City Tour CDMX', basePrice: 800, supplierId: 's3', supplierName: 'Tours del Mundo', category: 'Tours', currency: 'MXN' }
  ];

  const supplierNames = useMemo(() => {
    return suppliers.map(s => s.commercialName);
  }, [suppliers]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = 
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchesProduct = productFilter === 'all' || q.productId === productFilter;
      
      const product = products.find(p => p.id === q.productId);
      const matchesSupplier = supplierFilter === 'all' || product?.supplierName === supplierFilter;

      return matchesSearch && matchesStatus && matchesProduct && matchesSupplier;
    });
  }, [quotations, searchTerm, statusFilter, productFilter, supplierFilter, products]);

  const kpis = useMemo(() => {
    const total = filteredQuotations.length;
    const amount = filteredQuotations.reduce((acc, q) => acc + q.totalMXN, 0);
    const margin = filteredQuotations.reduce((acc, q) => acc + q.netMarginMXN, 0);
    const confirmed = filteredQuotations.filter(q => q.status === 'confirmed').length;
    const conversionRate = total > 0 ? (confirmed / total) * 100 : 0;

    return { total, amount, margin, conversionRate };
  }, [filteredQuotations]);

  const handleSaveQuotation = (quotation: any) => {
    if (selectedQuotation) {
      setQuotations(prev => prev.map(q => q.id === quotation.id ? quotation : q));
      setToast({ message: 'Cotización actualizada con éxito', type: 'success' });
    } else {
      setQuotations([quotation, ...quotations]);
      setToast({ message: 'Cotización generada con éxito', type: 'success' });
    }
    setIsQuotationModalOpen(false);
    setSelectedQuotation(null);
  };

  const handleConfirmSale = (quotation: any) => {
    // 1. Update quotation status locally
    setQuotations(prev => prev.map(q => {
      if (q.id === quotation.id) {
        return { ...q, status: 'confirmed' };
      }
      return q;
    }));

    // 2. Create a new booking object
    const newBooking: Booking = {
      id: `BK-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      clientId: quotation.clientId,
      clientName: quotation.clientName,
      productId: quotation.productId,
      productName: quotation.productName,
      category: quotation.category,
      startDate: quotation.startDate,
      endDate: quotation.endDate,
      currency: quotation.priceCurrency,
      exchangeRate: quotation.priceExchangeRate,
      price: quotation.price,
      serviceFee: quotation.serviceFee,
      tax: quotation.tax,
      others: quotation.others,
      total: quotation.total,
      cost: quotation.cost,
      grossMargin: quotation.grossMarginMXN / quotation.priceExchangeRate,
      commission: quotation.commission,
      netMargin: quotation.netMarginMXN / quotation.priceExchangeRate,
      status: 'confirmed',
      payments: [],
      createdAt: new Date().toISOString(),

      // Financial MXN fields
      totalMXN: quotation.totalMXN,
      costMXN: quotation.costMXN,
      commissionMXN: quotation.commissionMXN,
      grossMarginMXN: quotation.grossMarginMXN,
      netMarginMXN: quotation.netMarginMXN,

      // Supplier and Commission Currency info
      supplierId: quotation.supplierId,
      costCurrency: quotation.costCurrency,
      costExchangeRate: quotation.costExchangeRate,
      commissionCurrency: quotation.commissionCurrency,
      commissionExchangeRate: quotation.commissionExchangeRate,

      // Passenger counts and split pricing
      adults: quotation.adults,
      children: quotation.children,
      adultPrice: quotation.adultPrice,
      childPrice: quotation.childPrice,
      adultCost: quotation.adultCost,
      childCost: quotation.childCost,
      adultCommission: quotation.adultCommission,
      childCommission: quotation.childCommission,

      // Flight specific
      originAirport: quotation.originAirport,
      originAirportCode: quotation.originAirportCode,
      destinationAirport: quotation.destinationAirport,
      destinationAirportCode: quotation.destinationAirportCode,
      departureDateTime: quotation.departureDateTime,
      arrivalDateTime: quotation.arrivalDateTime,
      airline: quotation.airline,
      airlineCode: quotation.airlineCode,
      flightNumber: quotation.flightNumber,

      // Hotel/Tour specific
      hotelName: quotation.hotelName,
      tourName: quotation.tourName
    };

    // 3. Persist to localStorage for Bookings component to pick up
    const existingBookings = JSON.parse(localStorage.getItem('converted_bookings') || '[]');
    localStorage.setItem('converted_bookings', JSON.stringify([newBooking, ...existingBookings]));

    setToast({ message: 'Venta Confirmada! Se ha creado una reserva.', type: 'success' });
    setIsQuotationModalOpen(false);
    setSelectedQuotation(null);
  };

  const handlePrintQuotation = (q: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('COTIZACIÓN DE VIAJE', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`ID: ${q.id}`, 20, 35);
    doc.text(`Fecha: ${new Date(q.createdAt).toLocaleDateString()}`, 20, 40);
    
    // Client Info
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Información del Cliente', 20, 55);
    doc.setFontSize(10);
    doc.text(`Nombre: ${q.clientName}`, 20, 62);
    
    // Product Info
    doc.setFontSize(14);
    doc.text('Detalles del Servicio', 20, 75);
    doc.setFontSize(10);
    doc.text(`Producto: ${q.productName}`, 20, 82);
    doc.text(`Proveedor: ${q.supplierName || 'N/A'}`, 20, 87);
    doc.text(`Fechas: ${q.startDate} al ${q.endDate}`, 20, 92);
    doc.text(`Pasajeros: ${q.adults} Adultos, ${q.children} Menores`, 20, 97);

    let currentY = 105;

    // Specific Details
    if (q.originAirport || q.hotelName || q.tourName) {
      doc.setFontSize(12);
      doc.text('Información Adicional', 20, currentY);
      doc.setFontSize(10);
      currentY += 7;

      if (q.originAirport) {
        doc.text(`Vuelo: ${q.airline} (${q.flightNumber})`, 20, currentY);
        currentY += 5;
        doc.text(`Ruta: ${q.originAirport} (${q.originAirportCode}) -> ${q.destinationAirport} (${q.destinationAirportCode})`, 20, currentY);
        currentY += 5;
        doc.text(`Salida: ${new Date(q.departureDateTime).toLocaleString()}`, 20, currentY);
        currentY += 5;
        doc.text(`Llegada: ${new Date(q.arrivalDateTime).toLocaleString()}`, 20, currentY);
        currentY += 7;
      }

      if (q.hotelName) {
        doc.text(`Hotel: ${q.hotelName}`, 20, currentY);
        currentY += 7;
      }

      if (q.tourName) {
        doc.text(`Tour: ${q.tourName}`, 20, currentY);
        currentY += 7;
      }
    }
    
    // Price Table (Excluding Costs)
    const tableData = [
      ['Concepto', 'Cantidad', 'Precio Unit.', 'Subtotal', 'Moneda'],
      ['Adultos', q.adults.toString(), formatCurrency(q.adultPrice), formatCurrency(q.adults * q.adultPrice), q.priceCurrency],
      ['Menores', q.children.toString(), formatCurrency(q.childPrice), formatCurrency(q.children * q.childPrice), q.priceCurrency],
      ['Tasa de Servicio', '1', formatCurrency(q.serviceFee), formatCurrency(q.serviceFee), q.priceCurrency],
      ['Impuestos (IVA)', '1', formatCurrency(q.tax), formatCurrency(q.tax), q.priceCurrency],
      ['Otros Cargos', '1', formatCurrency(q.others), formatCurrency(q.others), q.priceCurrency],
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10 },
    });

    // Total Section
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text(`TOTAL: ${formatCurrency(q.total)} ${q.priceCurrency}`, 190, finalY, { align: 'right' });
    
    if (q.priceCurrency !== 'MXN') {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`(Equivalente a ${formatCurrency(q.totalMXN)} MXN)`, 190, finalY + 7, { align: 'right' });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Gracias por su preferencia. Esta cotización es válida por 7 días.', 105, 285, { align: 'center' });

    doc.save(`Cotizacion_${q.id}.pdf`);
    setToast({ message: 'PDF generado con éxito', type: 'success' });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cotizaciones</h1>
          <p className="text-slate-500 font-medium">Gestión y seguimiento de propuestas comerciales.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedQuotation(null);
            setIsQuotationModalOpen(true);
          }}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus size={20} /> Nueva Cotización
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cotizaciones</p>
            <h3 className="text-2xl font-black text-slate-900">{kpis.total}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto Total (MXN)</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.amount)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen Neto Total</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(kpis.margin)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
            <CheckCircle2 size={24} />
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
            placeholder="Buscar por ID, cliente o producto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Estados</option>
            <option value="quotation">Pendiente</option>
            <option value="confirmed">Confirmada</option>
          </select>
          <select 
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Productos</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select 
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Todos los Proveedores</option>
            {supplierNames.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID / Fecha</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{q.id}</p>
                    <p className="text-xs text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900">{q.clientName}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-slate-700">{q.productName}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{q.startDate} - {q.endDate}</p>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">Pax: {q.adults} Ad / {q.children} Mn</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-indigo-600">{formatCurrency(q.totalMXN)}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">M. Neto: {formatCurrency(q.netMarginMXN)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      q.status === 'confirmed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {q.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handlePrintQuotation(q)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Imprimir PDF"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedQuotation(q);
                          setIsQuotationModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Editar Cotización"
                      >
                        <Edit2 size={18} />
                      </button>
                      {q.status === 'quotation' && (
                        <button 
                          onClick={() => handleConfirmSale(q)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-[0.98]"
                        >
                          <CheckCircle2 size={14} /> Confirmar Venta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <AlertCircle size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">No se encontraron cotizaciones con los filtros aplicados.</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('all');
                          setProductFilter('all');
                          setSupplierFilter('all');
                        }}
                        className="text-indigo-600 font-bold text-xs hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isQuotationModalOpen && (
          <QuotationModal 
            clients={clients}
            products={products}
            suppliers={suppliers}
            quotation={selectedQuotation}
            onClose={() => {
              setIsQuotationModalOpen(false);
              setSelectedQuotation(null);
            }}
            onSave={handleSaveQuotation}
            onConfirmSale={handleConfirmSale}
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
