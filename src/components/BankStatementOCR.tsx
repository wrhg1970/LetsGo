import React, { useState, useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  notes: string;
  category: string;
  subcategory: string;
  proveedor?: string;
  cliente?: string;
}

export const BankStatementOCR = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');

  const onDrop = useCallback<NonNullable<DropzoneOptions['onDrop']>>((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    }
  } as any);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const fileParts = await Promise.all(files.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        return {
          inlineData: {
            data: base64,
            mimeType: file.type
          }
        };
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              ...fileParts,
              { text: "Extract all transactions from these bank statement files. Categorize each as 'income' or 'expense'. For expenses, identify 'proveedor' (supplier). For incomes, identify 'cliente' (client). Also provide category and subcategory for each." }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ["income", "expense"] },
                    notes: { type: Type.STRING },
                    category: { type: Type.STRING },
                    subcategory: { type: Type.STRING },
                    proveedor: { type: Type.STRING },
                    cliente: { type: Type.STRING }
                  },
                  required: ["date", "description", "amount", "type"]
                }
              }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{"transactions": []}');
      const newTransactions = (result.transactions || []).map((t: any) => ({
        ...t,
        id: Math.random().toString(36).substr(2, 9)
      }));

      setTransactions(prev => [...prev, ...newTransactions]);
      setFiles([]);
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Error al procesar los archivos. Por favor, intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    const dataToExport = transactions.filter(t => t.type === activeTab);
    const csv = Papa.unparse(dataToExport.map(({ id, ...rest }) => rest));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estado_cuenta_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: any) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const filteredTransactions = transactions.filter(t => t.type === activeTab);

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Sistema OCR de Estados de Cuenta</h2>
            <p className="text-sm text-slate-500 font-medium">Sube tus archivos PDF o imágenes para extraer transacciones automáticamente.</p>
          </div>
        </div>

        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer",
            isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
              <Upload size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-700">Arrastra archivos aquí o haz clic para seleccionar</p>
              <p className="text-sm text-slate-400">Soporta PDF, JPG, PNG</p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <FileText size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={processFiles}
              disabled={isProcessing}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando Archivos...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Extraer Información
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
              <button 
                onClick={() => setActiveTab('expense')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'expense' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Egresos
              </button>
              <button 
                onClick={() => setActiveTab('income')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Ingresos
              </button>
            </div>
            <button 
              onClick={exportToCSV}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <FileSpreadsheet size={18} />
              Exportar {activeTab === 'income' ? 'Ingresos' : 'Egresos'} a CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subcategoría</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeTab === 'income' ? 'Cliente' : 'Proveedor'}
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {filteredTransactions.map((t) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={t.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-4">
                        <input 
                          type="date" 
                          value={t.date}
                          onChange={(e) => updateTransaction(t.id, 'date', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 w-full"
                        />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          type="text" 
                          value={t.description}
                          onChange={(e) => updateTransaction(t.id, 'description', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 w-full"
                        />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          type="text" 
                          value={t.category}
                          onChange={(e) => updateTransaction(t.id, 'category', e.target.value)}
                          className="bg-transparent border-none p-0 text-xs font-medium text-slate-600 focus:ring-0 w-full"
                        />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          type="text" 
                          value={t.subcategory}
                          onChange={(e) => updateTransaction(t.id, 'subcategory', e.target.value)}
                          className="bg-transparent border-none p-0 text-xs font-medium text-slate-600 focus:ring-0 w-full"
                        />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          type="text" 
                          value={activeTab === 'income' ? t.cliente : t.proveedor}
                          onChange={(e) => updateTransaction(t.id, activeTab === 'income' ? 'cliente' : 'proveedor', e.target.value)}
                          className="bg-transparent border-none p-0 text-xs font-medium text-slate-600 focus:ring-0 w-full"
                          placeholder={activeTab === 'income' ? 'Nombre del Cliente' : 'Nombre del Proveedor'}
                        />
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn(
                            "text-xs font-bold",
                            activeTab === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {activeTab === 'income' ? '+' : '-'}
                          </span>
                          <input 
                            type="number" 
                            value={t.amount}
                            onChange={(e) => updateTransaction(t.id, 'amount', parseFloat(e.target.value))}
                            className="bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0 w-24 text-right"
                          />
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => deleteTransaction(t.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
