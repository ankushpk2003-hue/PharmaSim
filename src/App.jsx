import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Plus,
  Printer,
  Save,
  Settings,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

// Baseline Patient Profiles
const PATIENT_PROFILES = {
  healthy: {
    id: 'healthy',
    name: 'Healthy Adult (Default)',
    cl: 5.0,
    vd: 70.0,
    desc: 'Standard clearance and normal half-life metabolic profile.'
  },
  elderly: {
    id: 'elderly',
    name: 'Elderly Patient',
    cl: 3.5,
    vd: 70.0,
    desc: 'Slower metabolism, prolonged drug half-life, elevated peak risk.'
  },
  renal: {
    id: 'renal',
    name: 'Renal Impairment',
    cl: 2.5,
    vd: 70.0,
    desc: '50% reduced kidney clearance. Slower elimination rate.'
  },
  liver: {
    id: 'liver',
    name: 'Liver Dysfunction',
    cl: 3.0,
    vd: 70.0,
    desc: '40% reduced hepatic clearance. Prolonged steady-state time.'
  },
  pediatric: {
    id: 'pediatric',
    name: 'Pediatric Patient',
    cl: 1.2,
    vd: 15.0,
    desc: 'Altered metabolic scaling and lower volume of distribution.'
  },
  obese: {
    id: 'obese',
    name: 'Obesity',
    cl: 5.5,
    vd: 98.0,
    desc: '40% increased volume of distribution. Delayed half-life.'
  }
};

export default function App() {
  // Input parameters (State)
  const [selectedProfileId, setSelectedProfileId] = useState('healthy');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [dose, setDose] = useState(500); // mg
  const [interval, setInterval] = useState(12); // hours (tau)
  const [mec, setMec] = useState(5); // mg/L
  const [toxicThreshold, setToxicThreshold] = useState(25); // mg/L
  
  // Advanced overrides
  const [customCl, setCustomCl] = useState(5.0); // L/h
  const [customVd, setCustomVd] = useState(70.0); // L

  // Local storage history state
  const [savedCases, setSavedCases] = useState([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  
  // Real-time calculated baseline Cl & Vd
  const cl = Number(isAdvancedMode ? customCl : PATIENT_PROFILES[selectedProfileId].cl);
  const vd = Number(isAdvancedMode ? customVd : PATIENT_PROFILES[selectedProfileId].vd);

  // PK Equations
  const ke = vd > 0 ? cl / vd : 0; // elimination constant (1/h)
  const halfLife = ke > 0 ? 0.693 / ke : 0; // hours
  const timeToSteadyState = 4.5 * halfLife; // hours

  // Peak and Trough Steady State Calculations
  // Css,max = (D/Vd) / (1 - exp(-ke * tau))
  // Css,min = Css,max * exp(-ke * tau)
  const expTerm1 = Math.exp(-ke * Number(interval));
  const cssMax = vd > 0 && (1 - expTerm1) > 0 ? (Number(dose) / vd) / (1 - expTerm1) : 0;
  const cssMin = cssMax * expTerm1;

  // Dynamic "What-If" Sensitivity Calculations
  const clDegraded = cl * 0.8; // 20% degradation
  const keDegraded = vd > 0 ? clDegraded / vd : 0;
  const expTermDegraded = Math.exp(-keDegraded * Number(interval));
  const cssMaxDegraded = vd > 0 && (1 - expTermDegraded) > 0 ? (Number(dose) / vd) / (1 - expTermDegraded) : 0;

  // Load profile values when profile changes and not in advanced mode
  useEffect(() => {
    if (!isAdvancedMode) {
      setCustomCl(PATIENT_PROFILES[selectedProfileId].cl);
      setCustomVd(PATIENT_PROFILES[selectedProfileId].vd);
    }
  }, [selectedProfileId, isAdvancedMode]);

  // Load saved cases from localStorage on mount
  useEffect(() => {
    const data = localStorage.getItem('pharmasim_cases');
    if (data) {
      try {
        setSavedCases(JSON.parse(data));
      } catch (e) {
        console.error("Error reading from localStorage", e);
      }
    }
  }, []);

  // Save case handler
  const handleSaveCase = (e) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;

    const newCase = {
      id: Date.now().toString(),
      name: newCaseName.trim(),
      profileId: isAdvancedMode ? 'Custom' : selectedProfileId,
      profileName: isAdvancedMode ? 'Advanced User Custom' : PATIENT_PROFILES[selectedProfileId].name,
      dose,
      interval,
      mec,
      toxicThreshold,
      cl,
      vd,
      isAdvanced: isAdvancedMode,
      timestamp: new Date().toLocaleString()
    };

    const updated = [newCase, ...savedCases];
    setSavedCases(updated);
    localStorage.setItem('pharmasim_cases', JSON.stringify(updated));
    setNewCaseName('');
    setIsSaveModalOpen(false);
  };

  // Delete case handler
  const handleDeleteCase = (id, e) => {
    e.stopPropagation(); // Avoid triggering load
    const updated = savedCases.filter(c => c.id !== id);
    setSavedCases(updated);
    localStorage.setItem('pharmasim_cases', JSON.stringify(updated));
  };

  // Load case handler
  const handleLoadCase = (c) => {
    if (c.isAdvanced) {
      setIsAdvancedMode(true);
      setCustomCl(c.cl);
      setCustomVd(c.vd);
    } else {
      setIsAdvancedMode(false);
      setSelectedProfileId(c.profileId);
    }
    setDose(c.dose);
    setInterval(c.interval);
    setMec(c.mec);
    setToxicThreshold(c.toxicThreshold);
  };

  // Generate 72-hour PK data points (every 0.5 hours)
  const chartData = [];
  if (vd > 0 && ke > 0) {
    const numInterval = Number(interval);
    const numDose = Number(dose);
    for (let T = 0; T <= 72; T += 0.5) {
      const n = Math.floor(T / numInterval) + 1;
      const t = T - (n - 1) * numInterval;
      
      const expN = Math.exp(-n * ke * numInterval);
      const exp1 = Math.exp(-ke * numInterval);
      const expT = Math.exp(-ke * t);

      // C(t) equation
      let concentration = (numDose / vd) * ((1 - expN) / (1 - exp1)) * expT;
      
      chartData.push({
        time: T,
        concentration: parseFloat(concentration.toFixed(2)),
        isDoseTime: T % numInterval === 0
      });
    }
  }

  // Safety status evaluations
  const isToxic = cssMax > Number(toxicThreshold);
  const isSubTherapeutic = cssMin < Number(mec);

  // Smart dynamic dosing recommendation logic
  const numInterval = Number(interval);
  const numDose = Number(dose);
  const numToxicThreshold = Number(toxicThreshold);
  const numMec = Number(mec);
  
  const singleDosePeak = vd > 0 ? numDose / vd : 0;
  const isDoseTooHigh = singleDosePeak > numToxicThreshold;

  // Real-time safety & efficacy margin percentages
  const peakSafetyMargin = numToxicThreshold > 0 ? (cssMax / numToxicThreshold) * 100 : 0;
  const troughEfficacyMargin = numMec > 0 ? (cssMin / numMec) * 100 : 0;

  // Recommendation logic:
  // type: 'optimal' | 'toxic-dose-high' | 'toxic-interval-adjust' | 'subtherapeutic-dose-low' | 'subtherapeutic-interval-adjust' | 'therapeutic-conflict'
  let recommendationType = 'optimal';
  let recommendedInterval = numInterval;
  let cssMaxAtRecommended = cssMax;
  let cssMinAtRecommended = cssMin;

  if (isToxic) {
    if (isDoseTooHigh) {
      recommendationType = 'toxic-dose-high';
      recommendedInterval = null;
    } else {
      recommendationType = 'toxic-interval-adjust';
      if (ke > 0) {
        const ratio = singleDosePeak / numToxicThreshold;
        if (ratio < 0.9999) {
          const exactSafeTau = -Math.log(1 - ratio) / ke;
          let candidateInterval = Math.ceil(exactSafeTau);
          if (candidateInterval <= numInterval) {
            candidateInterval = numInterval + 1;
          }
          
          let testCssMax = cssMax;
          let testCssMin = cssMin;
          let count = 0;
          do {
            const testExp = Math.exp(-ke * candidateInterval);
            testCssMax = vd > 0 && (1 - testExp) > 0 ? singleDosePeak / (1 - testExp) : 0;
            testCssMin = testCssMax * testExp;
            if (testCssMax <= numToxicThreshold) {
              break;
            }
            candidateInterval++;
            count++;
          } while (candidateInterval < 100 && count < 100);
          
          recommendedInterval = candidateInterval;
          cssMaxAtRecommended = testCssMax;
          cssMinAtRecommended = testCssMin;
        } else {
          recommendationType = 'toxic-dose-high';
          recommendedInterval = null;
        }
      } else {
        recommendedInterval = null;
      }
    }
  } else if (isSubTherapeutic) {
    if (ke > 0 && numMec > 0) {
      const term = numDose / (vd * numMec);
      const exactSafeTau = Math.log(1 + term) / ke;
      let candidateInterval = Math.floor(exactSafeTau);
      
      // Clamp to range limits [4, 24]
      if (candidateInterval > 24) candidateInterval = 24;
      
      if (candidateInterval < 4) {
        recommendationType = 'subtherapeutic-dose-low';
        recommendedInterval = null;
      } else {
        const testExp = Math.exp(-ke * candidateInterval);
        const testCssMax = vd > 0 && (1 - testExp) > 0 ? singleDosePeak / (1 - testExp) : 0;
        const testCssMin = testCssMax * testExp;
        
        if (testCssMax > numToxicThreshold) {
          recommendationType = 'therapeutic-conflict';
          recommendedInterval = null;
        } else {
          recommendationType = 'subtherapeutic-interval-adjust';
          recommendedInterval = candidateInterval;
          cssMaxAtRecommended = testCssMax;
          cssMinAtRecommended = testCssMin;
        }
      }
    } else {
      recommendedInterval = null;
    }
  } else {
    recommendationType = 'optimal';
    recommendedInterval = numInterval;
    cssMaxAtRecommended = cssMax;
    cssMinAtRecommended = cssMin;
  }

  // Debug calculations log to console
  console.log("PharmaSim calculations debug:", {
    dose: numDose,
    interval: numInterval,
    cl,
    vd,
    ke,
    cssMax,
    toxicThreshold: numToxicThreshold,
    isToxic,
    isSubTherapeutic,
    recommendationType,
    recommendedInterval,
    cssMaxAtRecommended,
    cssMinAtRecommended
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased font-sans">
      
      {/* 1. SIDEBAR PANEL (no-print) */}
      <aside className="w-full md:w-80 bg-slate-900 text-slate-100 flex flex-col shrink-0 no-print border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg text-slate-900 font-bold shrink-0 shadow-lg shadow-emerald-500/20">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-tight">PharmaSim</h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">PK/PD Dynamic Model</p>
          </div>
        </div>

        {/* Sidebar Navigation Details */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            <Database className="h-3.5 w-3.5" />
            <span>Active Model</span>
          </div>
          <p className="text-sm font-medium text-slate-200">One-Compartment IV Bolus</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">Continuous multi-dose drug accumulation over 72-hour clinical timeframe.</p>
        </div>

        {/* Saved Cases History List */}
        <div className="flex-1 flex flex-col overflow-y-auto dark-scroll min-h-[200px]">
          <div className="p-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <FileText className="h-3.5 w-3.5" />
              <span>Saved Cases ({savedCases.length})</span>
            </div>
          </div>
          
          {savedCases.length === 0 ? (
            <div className="p-6 text-center text-slate-500 flex-1 flex flex-col items-center justify-center">
              <div className="border border-dashed border-slate-800 rounded-full p-4 mb-2">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <p className="text-xs font-medium">No saved patient runs</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-normal max-w-[180px]">Save clinical criteria to recall them instantly here.</p>
            </div>
          ) : (
            <div className="px-3 pb-6 space-y-1">
              {savedCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleLoadCase(c)}
                  className="group w-full p-3 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-800 text-left transition-all cursor-pointer flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {c.profileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 font-mono">
                      <span>D:{c.dose}mg</span>
                      <span>•</span>
                      <span>I:{c.interval}h</span>
                      <span>•</span>
                      <span>{parseFloat(c.cl.toFixed(1))}L/h</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCase(c.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Saved Case"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Developer Credits Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-center">
          <p className="text-[10px] text-slate-500">PharmaSim PK/PD Dashboard v1.1.0</p>
          <p className="text-[9px] text-slate-600 mt-0.5">Designed for Clinical Guidance Prototype</p>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* A. DASHBOARD HEADER (no-print) */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Clinical Safety & Modeling Terminal
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-200">
                MVP Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Active Session: Continuous One-Compartment Intravenous Drug Simulation
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Patient Case</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* B. DYNAMIC ALERT BANNERS (Real-time computed, no-print) */}
        <section className="px-6 pt-6 no-print space-y-3">
          {isToxic && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg shadow-sm flex items-start gap-3 pulse-critical">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-950">CRITICAL SAFETY WARNING</h4>
                <p className="text-xs text-red-800 mt-0.5 font-medium">
                  Steady-state peak exceeds toxic boundaries. Risk of high patient toxicity or adverse reaction.
                </p>
              </div>
            </div>
          )}
          {isSubTherapeutic && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">THERAPEUTIC WARNING</h4>
                <p className="text-xs text-amber-800 mt-0.5 font-medium">
                  WARNING: Trough concentration drops below Minimum Effective Concentration. Risk of sub-therapeutic windows and ineffective treatment.
                </p>
              </div>
            </div>
          )}
          {!isToxic && !isSubTherapeutic && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">OPTIMAL DOSING REGIMEN ACTIVE</h4>
                <p className="text-xs text-emerald-800 mt-0.5 font-medium">
                  All predicted steady-state concentrations reside comfortably within the target therapeutic window (above MEC, below Toxic Threshold).
                </p>
              </div>
            </div>
          )}
        </section>

        {/* C. TOP METRICS GRID (Calculated metrics) */}
        <section className="px-6 pt-6 no-print">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className={`bg-white p-5 rounded-xl border-t-4 shadow-sm ${isToxic ? 'border-t-rose-600' : 'border-t-slate-300'}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Css Max (Peak)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isToxic ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {isToxic ? 'Over toxic limit' : 'Safe Peak'}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">
                {cssMax > 0 ? cssMax.toFixed(2) : '0.00'}{' '}
                <span className="text-sm font-semibold text-slate-400">mg/L</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Predicted peak concentration at steady-state.</p>
            </div>

            {/* Metric 2 */}
            <div className={`bg-white p-5 rounded-xl border-t-4 shadow-sm ${isSubTherapeutic ? 'border-t-amber-500' : 'border-t-slate-300'}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Css Min (Trough)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSubTherapeutic ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                  {isSubTherapeutic ? 'Sub-therapeutic' : 'Effective'}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">
                {cssMin > 0 ? cssMin.toFixed(2) : '0.00'}{' '}
                <span className="text-sm font-semibold text-slate-400">mg/L</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Trough concentration immediately prior to next dose.</p>
            </div>

            {/* Metric 3 */}
            <div className="bg-white p-5 rounded-xl border-t-4 border-t-slate-300 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Half-Life (t1/2)</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">
                {halfLife > 0 ? halfLife.toFixed(2) : '0.00'}{' '}
                <span className="text-sm font-semibold text-slate-400">hrs</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Time required to clear 50% of peak blood level.</p>
            </div>

            {/* Metric 4 */}
            <div className="bg-white p-5 rounded-xl border-t-4 border-t-slate-300 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time to Steady-State</span>
                <Activity className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">
                {timeToSteadyState > 0 ? timeToSteadyState.toFixed(1) : '0.0'}{' '}
                <span className="text-sm font-semibold text-slate-400">hrs</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">Stabilization period (estimated at 4.5 × half-life).</p>
            </div>

          </div>
        </section>

        {/* D. PRIMARY DASHBOARD BODY (2 columns, no-print) */}
        <section className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 no-print">
          
          {/* LEFT COLUMN: CONTROLS PANEL (xl:col-span-5) */}
          <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            
            {/* Header section */}
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="h-4.5 w-4.5 text-slate-500" />
                <span>Simulation Parameters</span>
              </h3>
            </div>

            {/* Patient Profile Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1. Patient Clinical Profile
              </label>
              <div className="relative">
                <select
                  disabled={isAdvancedMode}
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 text-slate-800 rounded-lg py-2.5 px-3.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                >
                  {Object.values(PATIENT_PROFILES).map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-start gap-2.5">
                <User className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {isAdvancedMode ? 'Advanced Custom Overrides Active' : PATIENT_PROFILES[selectedProfileId].name}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                    {isAdvancedMode 
                      ? 'Presets are disabled. You can manually adjust Clearance (Cl) and Volume of Distribution (Vd) below.' 
                      : PATIENT_PROFILES[selectedProfileId].desc
                    }
                  </p>
                  {!isAdvancedMode && (
                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[9px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/30 w-fit">
                      <span>Cl: {PATIENT_PROFILES[selectedProfileId].cl} L/h</span>
                      <span>Vd: {PATIENT_PROFILES[selectedProfileId].vd} L</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle switch for Advanced mode */}
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-150">
              <div>
                <span className="text-xs font-bold text-slate-800">Advanced PK Override Mode</span>
                <p className="text-[10px] text-slate-500">Manually unlock baseline Cl and Vd parameters</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAdvancedMode}
                  onChange={(e) => setIsAdvancedMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Custom inputs for Cl and Vd (Advanced Mode only) */}
            {isAdvancedMode && (
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 border border-dashed border-slate-200 p-4 rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Clearance (Cl) L/h
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="30"
                    step="0.1"
                    value={customCl}
                    onChange={(e) => setCustomCl(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Normal range: 1.0 - 15.0</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Vol. of Distribution (Vd) L
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    step="1"
                    value={customVd}
                    onChange={(e) => setCustomVd(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Normal range: 10 - 200</span>
                </div>
              </div>
            )}

            {/* Core Sliders & Numbers */}
            <div className="space-y-5">
              
              {/* Dose Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">2. Dose Amount (mg)</span>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="50"
                    value={dose}
                    onChange={(e) => setDose(Math.min(1000, Math.max(50, parseFloat(e.target.value) || 50)))}
                    className="w-16 text-right bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold text-slate-700 outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={dose}
                  onChange={(e) => setDose(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>50 mg</span>
                  <span>500 mg</span>
                  <span>1000 mg</span>
                </div>
              </div>

              {/* Dosing Interval Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">3. Dosing Interval (hours)</span>
                  <input
                    type="number"
                    min="4"
                    max="24"
                    step="2"
                    value={interval}
                    onChange={(e) => setInterval(Math.min(24, Math.max(4, parseFloat(e.target.value) || 4)))}
                    className="w-16 text-right bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold text-slate-700 outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="2"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>4 hrs (q4h)</span>
                  <span>12 hrs (q12h)</span>
                  <span>24 hrs (q24h)</span>
                </div>
              </div>

              {/* MEC Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">4. Min. Effective Conc. (MEC)</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={mec}
                    onChange={(e) => setMec(Math.min(20, Math.max(1, parseFloat(e.target.value) || 1)))}
                    className="w-16 text-right bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold text-slate-700 outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={mec}
                  onChange={(e) => setMec(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>1 mg/L</span>
                  <span>10 mg/L</span>
                  <span>20 mg/L</span>
                </div>
              </div>

              {/* Toxic Threshold Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">5. Toxic Threshold</span>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    step="1"
                    value={toxicThreshold}
                    onChange={(e) => setToxicThreshold(Math.min(50, Math.max(10, parseFloat(e.target.value) || 10)))}
                    className="w-16 text-right bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold text-slate-700 outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={toxicThreshold}
                  onChange={(e) => setToxicThreshold(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>10 mg/L</span>
                  <span>30 mg/L</span>
                  <span>50 mg/L</span>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: INTERACTIVE VISUALIZATION & WHAT-IF (xl:col-span-7) */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            
            {/* Chart Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">72-Hour Blood Concentration Profile</h3>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide">MULTIPLE IV BOLUS ACCUMULATION CURVE</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-rose-600 inline-block border-t border-dashed border-rose-600"></span> Toxic Limit</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block border-t border-dashed border-emerald-500"></span> MEC</span>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="time" 
                      type="number"
                      domain={[0, 72]}
                      ticks={[0, 12, 24, 36, 48, 60, 72]}
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontFamily="monospace"
                      unit="h"
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontFamily="monospace"
                      unit=" mg/L"
                    />
                    <Tooltip 
                      content={<CustomTooltip mec={mec} toxicThreshold={toxicThreshold} />}
                    />
                    
                    {/* Dashed Reference Lines */}
                    <ReferenceLine 
                      y={toxicThreshold} 
                      stroke="#dc2626" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                    />
                    <ReferenceLine 
                      y={mec} 
                      stroke="#10b981" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="concentration" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorConc)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal text-center italic mt-1">
                Note: Simulated IV bolus peaks are modeled instantly at each interval. Hover above points for exact values.
              </p>
            </div>

            {/* Intelligent "What-If" Sensitivity Panel */}
            <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                <Sparkles className="h-32 w-32 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Clinical Sensitivity Analysis & Safety Monitors</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Automated stress-testing parameters and real-time safety margin indexes.</p>
              </div>

              {/* Real-time Safety & Efficacy Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                {/* Peak Meter */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                    <span className="text-slate-400 uppercase tracking-wider">Peak Safety Margin</span>
                    <span className={isToxic ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                      {peakSafetyMargin.toFixed(1)}% {isToxic ? 'Over Limit!' : 'of Toxic limit'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isToxic ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, peakSafetyMargin)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">
                    Peak Css Max: {cssMax.toFixed(2)} / Limit {numToxicThreshold} mg/L
                  </p>
                </div>

                {/* Trough Meter */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                    <span className="text-slate-400 uppercase tracking-wider">Trough Efficacy Margin</span>
                    <span className={isSubTherapeutic ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}>
                      {troughEfficacyMargin.toFixed(1)}% {isSubTherapeutic ? 'Sub-therapeutic' : 'of MEC target'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-900">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isSubTherapeutic ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, troughEfficacyMargin)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 font-mono">
                    Trough Css Min: {cssMin.toFixed(2)} / MEC {numMec} mg/L
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                
                {/* Scenario A */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                    Sensitivity Matrix: Renal Stress Test
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    A 20% further degradation in this profile's kidney clearance rate will push steady-state concentration up by an additional 25%, modifying your peak projection to{' '}
                    <span className="text-rose-400 font-bold font-mono text-xs">
                      {cssMaxDegraded > 0 ? cssMaxDegraded.toFixed(2) : '0.00'} mg/L
                    </span>
                    .
                  </p>
                </div>

                {/* Scenario B: Bidirectional Recommendation Card */}
                <div className={`p-4 rounded-xl border transition-all duration-300 ${
                  recommendationType === 'optimal' 
                    ? 'bg-emerald-950/30 border-emerald-800/80 text-slate-200' 
                    : recommendationType === 'toxic-interval-adjust' || recommendationType === 'subtherapeutic-interval-adjust'
                      ? 'bg-amber-950/30 border-amber-800/80 text-slate-200 shadow-lg shadow-amber-950/10'
                      : 'bg-rose-950/30 border-rose-800/80 text-slate-200 shadow-lg shadow-rose-950/20'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${
                    recommendationType === 'optimal' 
                      ? 'text-emerald-400' 
                      : recommendationType === 'toxic-interval-adjust' || recommendationType === 'subtherapeutic-interval-adjust'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}>
                    Dosing Recommendation
                  </span>
                  
                  {recommendationType === 'optimal' && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        Your current dosing regimen is <span className="text-emerald-400 font-bold">optimal</span>. The predicted peak is below the toxic threshold, and the trough remains above the MEC. No adjustments are required.
                      </p>
                    </div>
                  )}

                  {recommendationType === 'toxic-dose-high' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        <span className="text-rose-400 font-bold">Dose amount is too high.</span> The single-dose peak concentration (<span className="font-mono text-rose-300 font-semibold">{singleDosePeak.toFixed(2)} mg/L</span>) exceeds the toxic threshold (<span className="font-mono text-slate-300 font-semibold">{toxicThreshold} mg/L</span>). No interval adjustment alone can make this safe.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Recommendation: Consider reducing the Dose Amount below {Math.floor(toxicThreshold * vd)} mg.
                      </p>
                    </div>
                  )}

                  {recommendationType === 'toxic-interval-adjust' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        Adjusting the current interval from{' '}
                        <span className="font-bold text-slate-200">{interval} hours</span> to{' '}
                        <span className="font-bold text-emerald-400">{recommendedInterval} hours</span> (longer) is projected to bring the patient back to safe boundaries.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono">
                        <div>
                          Current Css Max: <span className="text-rose-400 font-bold">{cssMax.toFixed(2)} mg/L</span>
                        </div>
                        <div>
                          Projected Css Max: <span className="text-emerald-400 font-bold">{cssMaxAtRecommended.toFixed(2)} mg/L</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInterval(recommendedInterval)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 w-fit"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Apply {recommendedInterval}h Interval
                      </button>
                    </div>
                  )}

                  {recommendationType === 'subtherapeutic-dose-low' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        <span className="text-rose-400 font-bold">Dose amount is too low.</span> The current dose is insufficient to maintain effective therapeutic levels above MEC ({mec} mg/L) even at the highest safe frequency (every 4 hours).
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Recommendation: Consider increasing the Dose Amount.
                      </p>
                    </div>
                  )}

                  {recommendationType === 'subtherapeutic-interval-adjust' && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        Decreasing the interval from{' '}
                        <span className="font-bold text-slate-200">{interval} hours</span> to{' '}
                        <span className="font-bold text-emerald-400">{recommendedInterval} hours</span> (shorter) is projected to restore effective therapeutic levels without risking toxicity.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono">
                        <div>
                          Current Css Min: <span className="text-amber-400 font-bold">{cssMin.toFixed(2)} mg/L</span>
                        </div>
                        <div>
                          Projected Css Min: <span className="text-emerald-400 font-bold">{cssMinAtRecommended.toFixed(2)} mg/L</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInterval(recommendedInterval)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 w-fit"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Apply {recommendedInterval}h Interval
                      </button>
                    </div>
                  )}

                  {recommendationType === 'therapeutic-conflict' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        <span className="text-rose-400 font-bold">Therapeutic window conflict.</span> Decreasing the interval to achieve efficacy will push peak levels into toxicity, while increasing it to avoid toxicity will cause sub-therapeutic troughs.
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Recommendation: Adjust both Dose Amount and Interval or consider an alternative clinical agent.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* E. SAVE PATIENT CASE MODAL (no-print) */}
        {isSaveModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-base font-bold text-slate-900 pr-8">
                Save Patient Profile Run
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Save these exact PK parameters to the browser history to reload them with one click.
              </p>

              <form onSubmit={handleSaveCase} className="mt-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Case / Patient Identifier Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    required
                    placeholder="e.g. Pt-72A Renal Adjustment"
                    value={newCaseName}
                    onChange={(e) => setNewCaseName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 space-y-1 font-mono">
                  <div className="flex justify-between"><span>Profile:</span><span className="font-semibold">{isAdvancedMode ? 'Custom Advanced' : PATIENT_PROFILES[selectedProfileId].name}</span></div>
                  <div className="flex justify-between"><span>Dose Amount:</span><span className="font-semibold">{dose} mg</span></div>
                  <div className="flex justify-between"><span>Dosing Interval:</span><span className="font-semibold">{interval} hours</span></div>
                  <div className="flex justify-between"><span>Clearance / Vd:</span><span className="font-semibold">{cl.toFixed(2)} L/h / {vd} L</span></div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Save Case
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. PRINT ONLY CLINICAL REPORT CONTAINER (Hidden on screen, styled beautifully for window.print()) */}
        <div className="print-only hidden print-container font-sans bg-white text-slate-800">
          {/* Hospital letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">PharmaSim Clinical Report</h1>
              <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1">PK/PD Dynamic Modeling & Dose Optimization Summary</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-950 font-mono">REPORT GENERATED</p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">{new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Section 1: Patient Criteria */}
          <div className="mb-6 print-panel-block">
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
              I. Clinical Parameters & Baseline Patient Profile
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div>
                <span className="text-slate-500 font-medium">Selected Clinical Profile:</span>{' '}
                <strong className="text-slate-950">{isAdvancedMode ? 'Manual Advanced Custom Override' : PATIENT_PROFILES[selectedProfileId].name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Model Type:</span>{' '}
                <strong className="text-slate-950">Multi-dose, One-Compartment IV Bolus</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Prescribed Dose:</span>{' '}
                <strong className="text-slate-950">{dose} mg</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Dosing Interval (Tau):</span>{' '}
                <strong className="text-slate-950">{interval} hours</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Target Min Effective Conc (MEC):</span>{' '}
                <strong className="text-slate-950">{mec} mg/L</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Critical Toxic Threshold:</span>{' '}
                <strong className="text-slate-950">{toxicThreshold} mg/L</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Elimination Clearance (Cl):</span>{' '}
                <strong className="text-slate-950">{cl.toFixed(2)} L/h</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Volume of Distribution (Vd):</span>{' '}
                <strong className="text-slate-950">{vd.toFixed(1)} L</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Calculated Metrics Grid */}
          <div className="mb-6 print-panel-block">
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
              II. Calculated Steady-State Indexes
            </h3>
            <div className="metrics-grid-print">
              <div className="metric-card-print">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak Conc (Css Max)</span>
                <strong className="text-base font-extrabold text-slate-950 block mt-1">{cssMax.toFixed(2)} mg/L</strong>
                <span className="text-[9px] text-slate-500 block mt-1">Toxic limit: {toxicThreshold} mg/L</span>
              </div>
              <div className="metric-card-print">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trough Conc (Css Min)</span>
                <strong className="text-base font-extrabold text-slate-950 block mt-1">{cssMin.toFixed(2)} mg/L</strong>
                <span className="text-[9px] text-slate-500 block mt-1">MEC target: {mec} mg/L</span>
              </div>
              <div className="metric-card-print">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Elimination Half-Life</span>
                <strong className="text-base font-extrabold text-slate-950 block mt-1">{halfLife.toFixed(2)} hrs</strong>
                <span className="text-[9px] text-slate-500 block mt-1">ke: {ke.toFixed(4)} h⁻¹</span>
              </div>
              <div className="metric-card-print">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stabilization Time</span>
                <strong className="text-base font-extrabold text-slate-950 block mt-1">{timeToSteadyState.toFixed(1)} hrs</strong>
                <span className="text-[9px] text-slate-500 block mt-1">To safe steady-state</span>
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostic Assessment */}
          <div className="mb-6 print-panel-block border-print">
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest border-b border-slate-300 pb-1.5 mb-3">
              III. Safety Status & Dynamic Clinical Diagnostics
            </h3>
            
            <div className="space-y-4">
              {isToxic && (
                <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-950">
                  <strong>CRITICAL WARNING:</strong> Steady-state peak exceeds toxic boundaries ({cssMax.toFixed(2)} mg/L &gt; {toxicThreshold} mg/L). Risk of high patient toxicity or adverse reaction. Adjust dosing immediately.
                </div>
              )}
              {isSubTherapeutic && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950">
                  <strong>WARNING:</strong> Trough concentration drops below Minimum Effective Concentration ({cssMin.toFixed(2)} mg/L &lt; {mec} mg/L). Risk of sub-therapeutic windows and ineffective treatment. Consider increasing frequency or dose.
                </div>
              )}
              {!isToxic && !isSubTherapeutic && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-950">
                  <strong>REGIMEN SAFE:</strong> Current inputs maintain concentrations within target therapeutic zones at steady state. Peak ({cssMax.toFixed(2)} mg/L) is safe and trough ({cssMin.toFixed(2)} mg/L) is effective.
                </div>
              )}

              {/* Stress degradation assessment */}
              <div className="text-xs text-slate-700 leading-relaxed pl-1 space-y-1">
                <p>
                  <strong>Renal degradation simulation:</strong> A 20% further degradation in this profile's kidney clearance rate will push steady-state concentration up by an additional 25%, modifying your peak projection to <strong className="text-slate-950">{cssMaxDegraded.toFixed(2)} mg/L</strong>.
                </p>
                <p>
                  <strong>Stabilization Plan:</strong>{' '}
                  {recommendationType === 'optimal' && (
                    <span>The current dosing regimen is safe and effective. No adjustments are required.</span>
                  )}
                  {recommendationType === 'toxic-dose-high' && (
                    <span>The dose amount is too high. Consider reducing the Dose Amount below {Math.floor(toxicThreshold * vd)} mg, as no interval adjustment alone can make this safe.</span>
                  )}
                  {recommendationType === 'toxic-interval-adjust' && (
                    <span>
                      Adjusting the current dosing interval from <strong className="text-slate-950">{interval} hours</strong> to <strong className="text-slate-950">{recommendedInterval} hours</strong> is projected to stabilize the patient back within safe therapeutic boundaries (projected peak: <strong className="text-slate-950">{cssMaxAtRecommended.toFixed(2)} mg/L</strong>).
                    </span>
                  )}
                  {recommendationType === 'subtherapeutic-dose-low' && (
                    <span>The dose amount is too low. Consider increasing the Dose Amount, as the current dose is insufficient to maintain effective levels even at the highest frequency (every 4 hours).</span>
                  )}
                  {recommendationType === 'subtherapeutic-interval-adjust' && (
                    <span>
                      Decreasing the current dosing interval from <strong className="text-slate-950">{interval} hours</strong> to <strong className="text-slate-950">{recommendedInterval} hours</strong> is projected to restore effective therapeutic levels (projected trough: <strong className="text-slate-950">{cssMinAtRecommended.toFixed(2)} mg/L</strong>).
                    </span>
                  )}
                  {recommendationType === 'therapeutic-conflict' && (
                    <span>Therapeutic window conflict. Adjust both Dose Amount and Interval or consider an alternative clinical agent.</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Signature / Clinical Notes Block */}
          <div className="mt-16 print-panel-block border-t border-slate-300 pt-6">
            <div className="flex justify-between items-start">
              <div className="w-1/2">
                <p className="text-xs font-bold text-slate-900 uppercase mb-2">Physician/Pharmacist Clinical Notes</p>
                <div className="h-24 border border-slate-300 rounded-lg p-2 bg-slate-50/20 text-slate-400 text-[10px] italic">
                  Enter physician annotations, target adjustments, or clinical observations here...
                </div>
              </div>
              <div className="w-1/3 text-right">
                <div className="h-14 border-b border-slate-400 mb-2"></div>
                <p className="text-xs font-bold text-slate-950 uppercase">Authorized Clinical Signature</p>
                <p className="text-[10px] text-slate-500">Date: ________________________</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

// Recharts Custom Tooltip
function CustomTooltip({ active, payload, mec, toxicThreshold }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const time = payload[0].payload.time;
    
    let statusText = 'Safe Window';
    let statusClass = 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (val > toxicThreshold) {
      statusText = 'Toxic Level';
      statusClass = 'text-red-500 bg-red-50 border-red-100';
    } else if (val < mec) {
      statusText = 'Sub-therapeutic';
      statusClass = 'text-amber-500 bg-amber-50 border-amber-100';
    }

    return (
      <div className="bg-slate-900 text-slate-100 border border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-mono text-slate-400">Time elapsed: <span className="text-white font-bold">{time} hrs</span></p>
        <p className="font-mono text-slate-400">Concentration: <span className="text-white font-extrabold text-sm">{val.toFixed(2)} mg/L</span></p>
        <div className={`mt-1 text-[10px] px-2 py-0.5 border rounded-full font-bold w-fit ${statusClass}`}>
          {statusText}
        </div>
      </div>
    );
  }
  return null;
}
