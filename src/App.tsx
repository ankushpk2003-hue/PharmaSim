import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, User, Sparkles, LayoutDashboard, Sun, Moon, Link2, Cpu } from 'lucide-react';
import InteractivePKModule from './components/InteractivePKModule';
import DoctorPortal from './components/DoctorPortal';
import PatientPortal from './components/PatientPortal';
import DoctorAnalytics from './components/DoctorAnalytics';
import AIPharmacistPanel from './components/AIPharmacistPanel';
import { getPatients } from './services/db';

export default function App() {
  const [activeTab, setActiveTab] = useState<'3d-pk' | 'doctor-portal' | 'patient-portal' | 'doctor-analytics' | 'ai-pharmacist'>('3d-pk');
  const [darkMode, setDarkMode] = useState<boolean>(true); // default to a premium dark mode

  // Initialize DB on mount
  useEffect(() => {
    getPatients();
  }, []);

  // Update HTML class for Tailwind dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* 1. Glassmorphic Navigation Header (no-print) */}
      <header className="sticky top-0 z-40 w-full no-print apple-glass transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo / Branding */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-650 rounded-xl text-white font-bold shrink-0 shadow-lg shadow-blue-500/20">
              <Activity className="h-5 w-5 animate-pulse text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-md tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                PharmaSim
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  AI
                </span>
              </h1>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Clinical PK/PD Platform</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('3d-pk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-none ${
                activeTab === '3d-pk'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>3D Pharmacokinetics</span>
            </button>
            <button
              onClick={() => setActiveTab('doctor-portal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-none ${
                activeTab === 'doctor-portal'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Doctor Portal</span>
            </button>
            <button
              onClick={() => setActiveTab('patient-portal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-none ${
                activeTab === 'patient-portal'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Patient Portal</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-pharmacist')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-none ${
                activeTab === 'ai-pharmacist'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>AI Pharmacist</span>
            </button>
            <button
              onClick={() => setActiveTab('doctor-analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border-none ${
                activeTab === 'doctor-analytics'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Clinic Analytics</span>
            </button>
          </nav>

          {/* Right actions: Dark Mode & Sync Indicators */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/10 rounded-xl text-[10px] font-bold font-mono">
              <Link2 className="h-3.5 w-3.5 text-blue-550" />
              <span>TWIN SYNC: ACTIVE</span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
              title={darkMode ? 'Toggle light mode' : 'Toggle dark mode'}
            >
              {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile navigation tab strip (visible only on small viewports) (no-print) */}
      <nav className="md:hidden sticky top-16 z-30 w-full no-print flex bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200/50 dark:border-slate-800 p-1 gap-1 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('3d-pk')}
          className={`flex-1 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
            activeTab === '3d-pk'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 bg-transparent'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>3D PK</span>
        </button>
        <button
          onClick={() => setActiveTab('doctor-portal')}
          className={`flex-1 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
            activeTab === 'doctor-portal'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 bg-transparent'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Doctor</span>
        </button>
        <button
          onClick={() => setActiveTab('patient-portal')}
          className={`flex-1 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
            activeTab === 'patient-portal'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 bg-transparent'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Patient</span>
        </button>
        <button
          onClick={() => setActiveTab('ai-pharmacist')}
          className={`flex-1 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
            activeTab === 'ai-pharmacist'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 bg-transparent'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>AI Rx</span>
        </button>
        <button
          onClick={() => setActiveTab('doctor-analytics')}
          className={`flex-1 py-2 rounded-xl text-[9px] font-bold transition-all cursor-pointer border-none flex flex-col items-center gap-1 ${
            activeTab === 'doctor-analytics'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 bg-transparent'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Analytics</span>
        </button>
      </nav>

      {/* 2. Main Content viewport */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-8 w-full">
        {activeTab === '3d-pk' && <InteractivePKModule />}
        {activeTab === 'doctor-portal' && <DoctorPortal />}
        {activeTab === 'patient-portal' && <PatientPortal />}
        {activeTab === 'ai-pharmacist' && <AIPharmacistPanel />}
        {activeTab === 'doctor-analytics' && <DoctorAnalytics />}
      </main>

      <footer className="w-full border-t border-slate-200/50 dark:border-slate-850/80 bg-white/20 dark:bg-slate-950/20 py-6 text-center text-[10px] font-semibold text-slate-400 tracking-wider uppercase no-print transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2026 PharmaSim AI Healthcare Inc. • Designed by Ankush • All Rights Reserved</p>
          <p className="text-[9px] text-slate-500 mt-1">Real-time Multicompartment Pharmacokinetic Engine</p>
        </div>
      </footer>
    </div>
  );
}
