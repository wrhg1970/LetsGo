export interface ModulePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, ModulePermissions>;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: string; // ID of the CustomRole
  isPreRegistered?: boolean;
  isActive?: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferences?: string;
  leadStatus: 'Nuevo' | 'Contactado' | 'Calificado' | 'Perdido';
  tags?: string[];
  bookings?: any[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  reference?: string;
}

export type Currency = 'MXN' | 'USD' | 'EUR';

export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
}

export interface SupplierProduct {
  id: string;
  name: string;
  type: string; // Tipo de producto (ej. Vuelo, Hotel, Tour)
  cost: number;
  currency: Currency;
  validity: string; // Vigencia
}

export interface Supplier {
  id: string;
  legalName: string; // Nombre Legal
  commercialName: string; // Nombre Comercial
  address: string; // Dirección
  phone: string; // Teléfono
  email: string; // Correo Electrónico
  rfc: string; // RFC
  bankAccounts: BankAccount[];
  products: SupplierProduct[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplierId: string;
  supplierName?: string;
  basePrice: number;
  currency: Currency;
  description?: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  category?: string;
  startDate: string;
  endDate: string;
  currency: Currency;
  exchangeRate: number; // Rate to MXN at time of booking
  price: number;
  serviceFee: number;
  tax: number;
  others: number;
  total: number;
  cost: number;
  grossMargin: number;
  commission: number;
  netMargin: number;
  status: 'quotation' | 'confirmed' | 'cancelled';
  payments?: Payment[];
  createdAt?: string;

  // Financial MXN fields
  totalMXN?: number;
  costMXN?: number;
  commissionMXN?: number;
  grossMarginMXN?: number;
  netMarginMXN?: number;

  // Supplier and Commission Currency info
  supplierId?: string;
  costCurrency?: Currency;
  costExchangeRate?: number;
  commissionCurrency?: Currency;
  commissionExchangeRate?: number;

  // New fields for passenger counts and split pricing
  adults?: number;
  children?: number;
  adultPrice?: number;
  childPrice?: number;
  adultCost?: number;
  childCost?: number;
  adultCommission?: number;
  childCommission?: number;

  // Flight specific
  originAirport?: string;
  originAirportCode?: string;
  destinationAirport?: string;
  destinationAirportCode?: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;

  // Hotel/Tour specific
  hotelName?: string;
  tourName?: string;

  // Passengers
  passengers?: Passenger[];
}

export interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber: string;
  type: 'adult' | 'child';
}

export interface BookingItem {
  id: string;
  bookingId: string;
  productId: string;
  supplierId: string;
  netPrice: number;
  commission: number;
  status: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  exchangeRate: number; // Rate to MXN at time of payment
  method: string;
  type: 'client_payment' | 'supplier_payout';
  status: 'pending' | 'cleared' | 'failed';
  date: string;
  reconciled?: boolean;
}

export interface Group {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  startDate: string;
  endDate: string;
  supplierId: string;
  supplierName?: string;
  price: number;
  cost: number;
  serviceFee: number;
  tax: number;
  others: number;
  total: number;
  currency: Currency;
  exchangeRate: number;
  status: 'active' | 'completed' | 'cancelled';
  clientIds: string[]; // IDs of clients in this group
  targetParticipants?: number;
  createdAt?: string;
}

export interface GroupPayment {
  id: string;
  groupId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  amountMXN: number;
  method: string;
  date: string;
  status: 'pending' | 'cleared' | 'failed';
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  category: string;
  subcategory: string;
  supplierId?: string;
  supplierName?: string;
  reconciled?: boolean;
  notes?: string;
  createdAt?: string;
}

export interface BankStatement {
  id: string;
  fileName: string;
  uploadDate: string;
  transactionCount: number;
}

export interface TravelPreference {
  id: string;
  name: string;
}

export interface Airport {
  id: string;
  name: string;
  code: string;
}

export interface Airline {
  id: string;
  name: string;
  code: string;
}
