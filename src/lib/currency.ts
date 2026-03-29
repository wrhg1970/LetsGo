import { Currency, ExchangeRate } from '../types';

export const EXCHANGE_RATES: ExchangeRate[] = [
  { from: 'USD', to: 'MXN', rate: 20.50 },
  { from: 'EUR', to: 'MXN', rate: 22.30 },
  { from: 'MXN', to: 'MXN', rate: 1.00 },
];

export const convertToMXN = (amount: number, from: Currency, customRate?: number): number => {
  if (from === 'MXN') return amount;
  
  if (customRate) return amount * customRate;

  const rate = EXCHANGE_RATES.find(r => r.from === from && r.to === 'MXN')?.rate || 1;
  return amount * rate;
};

export const formatCurrency = (amount: number, currency: Currency = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};
