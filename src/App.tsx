import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, CustomRole } from './types';
import { UserProvider, useUser } from './contexts/UserContext';
import { 
  Users, 
  Briefcase, 
  CreditCard, 
  Layers, 
  LayoutDashboard, 
  LogOut, 
  X, 
  Plus,
  Truck,
  FileText,
  BookOpen,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Import Components
import { Dashboard } from './components/Dashboard';
import { CRM } from './components/CRM';
import { Quotations } from './components/Quotations';
import { Bookings } from './components/Bookings';
import { Suppliers } from './components/Suppliers';
import { Finance } from './components/Finance';
import { Groups } from './components/Groups';
import Catalogs from './components/Catalogs';
import { Settings } from './components/Settings';

const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const { user, role } = useUser();
  const location = useLocation();
  
  const hasPermission = (moduleId: string) => {
    if (user?.role === 'admin') return true;
    return role?.permissions?.[moduleId]?.read || false;
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
    { path: '/crm', label: 'CRM / Clientes', icon: Users, id: 'crm' },
    { path: '/quotations', label: 'Cotizaciones', icon: FileText, id: 'quotations' },
    { path: '/bookings', label: 'Reservas', icon: Briefcase, id: 'bookings' },
    { path: '/suppliers', label: 'Proveedores', icon: Truck, id: 'suppliers' },
    { path: '/finance', label: 'Finanzas', icon: CreditCard, id: 'finance' },
    { path: '/groups', label: 'Grupos', icon: Layers, id: 'groups' },
    { path: '/catalogs', label: 'Catálogos', icon: BookOpen, id: 'catalogs' },
    { path: '/settings', label: 'Configuración', icon: SettingsIcon, id: 'settings' },
  ].filter(item => hasPermission(item.id));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
          T
        </div>
        <span className="font-bold text-white text-lg tracking-tight">TravelERP</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{role?.name || user?.role || 'Agente'}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const Login = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center space-y-8"
    >
      <div className="space-y-2">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-6">
          T
        </div>
        <h1 className="text-3xl font-bold text-slate-900">TravelAgency ERP</h1>
        <p className="text-slate-500">Iniciando sesión automáticamente...</p>
      </div>
      
      <div className="flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </motion.div>
  </div>
);

const ProtectedRoute = ({ 
  moduleId, 
  children 
}: { 
  moduleId: string, 
  children: React.ReactNode 
}) => {
  const { user, role, loading } = useUser();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login />;
  
  const hasPermission = user.role === 'admin' || role?.permissions?.[moduleId]?.read;
  
  if (!hasPermission) {
    return <div className="p-8 text-center"><p className="text-slate-500">No tienes permiso para acceder a este módulo.</p></div>;
  }
  
  return <>{children}</>;
};

function AppContent() {
  const { user, loading } = useUser();

  const handleLogin = async () => {
    // No login needed for automatic login
  };

  const handleLogout = async () => {
    // No logout needed for automatic login
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<ProtectedRoute moduleId="dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute moduleId="crm"><CRM /></ProtectedRoute>} />
              <Route path="/quotations" element={<ProtectedRoute moduleId="quotations"><Quotations /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute moduleId="bookings"><Bookings /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute moduleId="suppliers"><Suppliers /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute moduleId="finance"><Finance /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute moduleId="groups"><Groups /></ProtectedRoute>} />
              <Route path="/catalogs" element={<ProtectedRoute moduleId="catalogs"><Catalogs /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute moduleId="settings"><Settings /></ProtectedRoute>} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
