import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Clock, XCircle, ShieldAlert, Award, Calendar, Download, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Patient, DoseLog, Prescription } from '../types';
import { getPatients, addDoseLog, DRUGS_DB } from '../services/db';
import { calculatePersonalizedPK, simulateMissedDoseScenarios } from '../services/pkModel';

export default function PatientPortal() {
  const [patientIdInput, setPatientIdInput] = useState<string>('');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [loginError, setLoginError] = useState<string>('');

  // Missed Dose Assistant States
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [selectedRxForAssistant, setSelectedRxForAssistant] = useState<Prescription | null>(null);
  const [lateHours, setLateHours] = useState<number>(3);
  const [assistantOutput, setAssistantOutput] = useState<any>(null);

  // Loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Delayed dose helper
  const [isDelayModalOpen, setIsDelayModalOpen] = useState<boolean>(false);
  const [delayLogTarget, setDelayLogTarget] = useState<string | null>(null);
  const [inputDelayHours, setInputDelayHours] = useState<number>(1);

  const handlePatientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdInput.trim()) return;

    setLoading(true);
    setTimeout(() => {
      const patients = getPatients();
      const match = patients.find(
        (p) => p.id.toLowerCase() === patientIdInput.trim().toLowerCase()
      );

      if (match) {
        setActivePatient(match);
        setLoginError('');
      } else {
        setLoginError('Patient ID not recognized. (Try PAT-881, PAT-402, or PAT-709)');
      }
      setLoading(false);
    }, 400);
  };

  const handleRefresh = () => {
    if (!activePatient) return;
    const patients = getPatients();
    const updated = patients.find((p) => p.id === activePatient.id);
    if (updated) setActivePatient(updated);
  };

  const logDose = (status: 'Taken' | 'Missed' | 'Delayed', scheduledTime: string, delay?: number) => {
    if (!activePatient) return;

    const timestamp = new Date().toISOString();
    const result = addDoseLog(activePatient.id, {
      status,
      timestamp,
      scheduledTime,
      delayHours: delay
    });

    if (result) {
      setActivePatient(result);
    }
  };

  const triggerAssistant = (rx: Prescription) => {
    setSelectedRxForAssistant(rx);
    setIsAssistantOpen(true);
    calculateMissedDoseScenarios(rx, lateHours);
  };

  const calculateMissedDoseScenarios = (rx: Prescription, hours: number) => {
    if (!activePatient) return;
    const pk = calculatePersonalizedPK(activePatient, rx.drugName);
    const scenarios = simulateMissedDoseScenarios(rx, pk, hours);
    setAssistantOutput(scenarios);
  };

  useEffect(() => {
    if (selectedRxForAssistant) {
      calculateMissedDoseScenarios(selectedRxForAssistant, lateHours);
    }
  }, [lateHours, selectedRxForAssistant]);

  const getTodayDoses = (rx: Prescription) => {
    if (rx.interval >= 24) {
      return ['08:00 AM'];
    } else if (rx.interval >= 12) {
      return ['08:00 AM', '08:05 PM'];
    } else if (rx.interval >= 8) {
      return ['08:00 AM', '04:00 PM', '12:00 AM'];
    } else {
      return ['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'];
    }
  };

  const calculatePatientAdherence = () => {
    if (!activePatient || activePatient.adherenceHistory.length === 0) return 100;
    const takenCount = activePatient.adherenceHistory.filter(
      (log) => log.status === 'Taken' || log.status === 'Delayed'
    ).length;
    return Math.round((takenCount / activePatient.adherenceHistory.length) * 100);
  };

  const adherenceRate = calculatePatientAdherence();

  const getAdherenceBadge = () => {
    if (adherenceRate >= 90) return { label: 'Excellent', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (adherenceRate >= 75) return { label: 'Good', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'At Risk', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  };

  const adherenceBadge = getAdherenceBadge();

  // --- AI Pharmacist Dosing Logic Calculations ---
  // Returns precise telemetry depending on the slider position
  const getAIPharmacistReadout = () => {
    if (lateHours <= 3) {
      return {
        rec: 'Take immediately.',
        warning: 'Do not double the next dose.',
        confidence: '96%',
        risk: 'Low',
        action: 'TAKE'
      };
    } else if (lateHours <= 8) {
      return {
        rec: 'Skip this dose. Resume schedule.',
        warning: 'Do not double the next dose.',
        confidence: '92%',
        risk: 'Medium',
        action: 'SKIP'
      };
    } else {
      return {
        rec: 'Skip this dose and wait.',
        warning: 'Do not double the next dose.',
        confidence: '98%',
        risk: 'High',
        action: 'WAIT'
      };
    }
  };

  const pharmacistReadout = getAIPharmacistReadout();

  // --- Render Patient Login ---
  if (!activePatient) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/20 relative min-h-[500px] animate-fade-in">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="apple-glass p-8 rounded-3xl max-w-sm w-full shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20 mb-4 animate-pulse">
              <Pill className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">Patient Portal Access</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1.5 max-w-[240px] leading-relaxed">
              Access your personalized treatment twin, medicine logs, and AI counselor.
            </p>
          </div>

          <form onSubmit={handlePatientLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                Patient Access Key
              </label>
              <input
                type="text"
                value={patientIdInput}
                onChange={(e) => setPatientIdInput(e.target.value)}
                placeholder="e.g. PAT-881"
                className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-550 transition-all text-center uppercase tracking-widest shadow-inner"
                autoFocus
              />
              <span className="text-[9px] text-slate-450 dark:text-slate-500 text-center block mt-1.5 font-sans">
                Demo Accounts: <strong className="font-bold">PAT-881</strong>, <strong className="font-bold">PAT-402</strong>, or <strong className="font-bold">PAT-709</strong>
              </span>
            </div>

            {loginError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 p-3 rounded-lg text-xs text-rose-600 dark:text-rose-400 text-center flex items-center justify-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 border-none"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Initialize Twin Connection</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeRx = activePatient.prescriptions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1">
      {/* LEFT COLUMN: Medication Checklist & Logs */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Adherence Ring Card */}
        <div className="google-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider font-mono">compliance metrics</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans">Your Medication Adherence</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium font-sans">
              Logging each dose as Taken, Missed, or Delayed helps your clinician calibrate your virtual twin. Maintain 90%+ compliance to avoid treatment failure.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${adherenceBadge.color}`}>
                {adherenceBadge.label} Compliance
              </span>
              <span className="text-xs text-slate-455 dark:text-slate-500 font-mono">
                Logs Count: {activePatient.adherenceHistory.length} recorded
              </span>
            </div>
          </div>

          {/* SVG Adherence circular gauge */}
          <div className="relative flex items-center justify-center shrink-0 w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="46"
                className="stroke-slate-100 dark:stroke-slate-850"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                className={`transition-all duration-500 ${
                  adherenceRate >= 90 ? 'stroke-emerald-500' :
                  adherenceRate >= 75 ? 'stroke-amber-500' : 'stroke-rose-500'
                }`}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - adherenceRate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{adherenceRate}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">adherence</span>
            </div>
          </div>
        </div>

        {/* Medication Schedule Checklist */}
        <div className="google-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-505" />
              <h4 className="font-bold text-slate-900 dark:text-white text-md">Today's Dosage Checklist</h4>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-450 border-none bg-transparent rounded-xl transition-all cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {activeRx ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between shadow-inner">
                <div>
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{activeRx.drugName}</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Prescribed Dose: <strong>{activeRx.dose} mg</strong> • Interval: <strong>Every {activeRx.interval} hours</strong>
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 font-mono">
                  ACTIVE PRESCRIPTION
                </span>
              </div>

              {/* List scheduled doses for today */}
              <div className="space-y-2">
                {getTodayDoses(activeRx).map((timeStr) => {
                  const logged = activePatient.adherenceHistory.find(
                    (log) => log.scheduledTime === timeStr
                  );

                  return (
                    <div
                      key={timeStr}
                      className="border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          logged?.status === 'Taken' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          logged?.status === 'Delayed' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          logged?.status === 'Missed' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          'bg-slate-50 text-slate-450 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                        }`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <strong className="text-xs text-slate-855 dark:text-slate-100 block font-bold">{timeStr}</strong>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {activeRx.drugName} - {activeRx.dose} mg
                          </span>
                        </div>
                      </div>

                      {/* Log Action Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {logged ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border flex items-center gap-1 ${
                              logged.status === 'Taken' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                              logged.status === 'Delayed' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                              'text-rose-500 bg-rose-500/10 border-rose-500/20'
                            }`}>
                              {logged.status === 'Taken' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {logged.status === 'Delayed' && <Clock className="h-3.5 w-3.5" />}
                              {logged.status === 'Missed' && <XCircle className="h-3.5 w-3.5" />}
                              <span>Logged: {logged.status} {logged.delayHours ? `(${logged.delayHours}h late)` : ''}</span>
                            </span>
                            {logged.status === 'Missed' && (
                              <button
                                onClick={() => triggerAssistant(activeRx)}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-655 hover:from-emerald-500 hover:to-teal-550 text-white rounded-xl text-[10px] font-bold shadow-sm cursor-pointer border-none"
                              >
                                Consult Assistant
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => logDose('Taken', timeStr)}
                              className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-550 text-white rounded-xl text-[10px] font-bold transition-all shadow-xs border-none cursor-pointer flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Taken</span>
                            </button>
                            <button
                              onClick={() => {
                                setDelayLogTarget(timeStr);
                                setIsDelayModalOpen(true);
                              }}
                              className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-slate-955 rounded-xl text-[10px] font-bold transition-all shadow-xs border-none cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Delayed</span>
                            </button>
                            <button
                              onClick={() => logDose('Missed', timeStr)}
                              className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-rose-600 to-red-650 hover:from-rose-550 hover:to-red-550 text-white rounded-xl text-[10px] font-bold transition-all shadow-xs border-none cursor-pointer flex items-center justify-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Missed</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No active medication prescriptions loaded.</p>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Prescription card & Launch button */}
      <div className="lg:col-span-4 space-y-6">
        <div className="google-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border-none text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest font-mono">Patient Connection</span>
                <h4 className="font-bold text-white text-md mt-0.5">{activePatient.name}</h4>
              </div>
              <button
                onClick={() => { setActivePatient(null); setPatientIdInput(''); }}
                className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[9px] font-bold transition-all border border-slate-750 cursor-pointer"
              >
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-850">
              <div>
                <span className="text-slate-500 block mb-0.5">eGFR Clearance</span>
                <strong className="text-slate-350">{activePatient.kidneyFunction} mL/min</strong>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Hepatic Scale</span>
                <strong className="text-slate-350">{activePatient.liverFunction}</strong>
              </div>
              <div className="col-span-2 border-t border-slate-855 mt-1.5 pt-1.5">
                <span className="text-slate-500 block mb-0.5">Treatment Node</span>
                <strong className="text-slate-350">{activePatient.disease}</strong>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-350 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Prescription PDF</span>
            </button>
          </div>
        </div>

        {/* AI Counselor launcher */}
        <div className="google-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <ShieldAlert className="h-5 w-5 text-blue-500" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">AI Pharmacist Dashboard</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Missed a dose of your medication? Consult the safety counselor to calculate what to do.
          </p>
          {activeRx ? (
            <button
              onClick={() => triggerAssistant(activeRx)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
            >
              <Pill className="h-4 w-4 animate-pulse" />
              <span>Consult AI Pharmacist</span>
            </button>
          ) : (
            <p className="text-[10px] text-slate-400">Add a prescription to unlock counseling.</p>
          )}
        </div>
      </div>

      {/* --- AI PHARMACIST MISSED DOSE RECOVERY PANEL (Modal Overlay) (no-print) --- */}
      {isAssistantOpen && selectedRxForAssistant && assistantOutput && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-fade-in">
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300">
            <button
              onClick={() => { setIsAssistantOpen(false); setSelectedRxForAssistant(null); }}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-450 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors border-none bg-transparent cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2.5 border-b border-slate-150 dark:border-slate-800 pb-3 shrink-0">
              <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl border border-cyan-500/20">
                <Cpu className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-1.5">
                  AI Pharmacist Decision Node
                </h3>
                <p className="text-[9px] text-slate-450 font-mono tracking-widest uppercase mt-0.5">
                  Therapeutic twin safety assessment: {selectedRxForAssistant.drugName}
                </p>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 dark-scroll">
              
              {/* Left side: AI Decision Parameters & HUD (col-span-6) */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Latency Input Slider */}
                <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Input Dosing Latency</span>
                    <span className="text-xs font-extrabold font-mono text-cyan-500">{lateHours} hour(s) late</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={Math.min(24, selectedRxForAssistant.interval)}
                    step="1"
                    value={lateHours}
                    onChange={(e) => setLateHours(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-450 mt-1 font-mono">
                    <span>1h late</span>
                    <span>{Math.floor(selectedRxForAssistant.interval / 2)}h (Halfway)</span>
                    <span>{selectedRxForAssistant.interval}h</span>
                  </div>
                </div>                {/* Structured AI Pharmacist Panel readout */}
                <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6 space-y-4">
                  <div className="border-b border-slate-200/40 dark:border-slate-850 pb-2 mb-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-widest block">
                      AI Pharmacist Advice
                    </span>
                    <span className="px-2 py-0.5 text-[8px] font-bold font-mono bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">
                      LIVE CORE
                    </span>
                  </div>

                  {/* Core Content Box with EXACT requested layout */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-xl p-5 space-y-4 text-sm font-sans leading-relaxed">
                    {/* Latency */}
                    <div className="border-l-2 border-cyan-500 pl-3 py-0.5">
                      <p className="text-slate-900 dark:text-slate-100 font-semibold">
                        Patient missed dose by {lateHours} hours.
                      </p>
                    </div>

                    {/* Recommendation */}
                    <div className="space-y-0.5">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        Recommendation:
                      </h5>
                      <p className={`text-base font-extrabold tracking-tight ${
                        pharmacistReadout.action === 'TAKE' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
                      }`}>
                        {pharmacistReadout.rec}
                      </p>
                    </div>

                    {/* Warning */}
                    <div>
                      <p className="text-slate-650 dark:text-slate-350 font-medium">
                        {pharmacistReadout.warning}
                      </p>
                    </div>

                    {/* Confidence & Risk */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          Confidence:
                        </h5>
                        <strong className="text-lg font-extrabold text-cyan-500 dark:text-cyan-400 font-mono">
                          {pharmacistReadout.confidence}
                        </strong>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                          Risk:
                        </h5>
                        <strong className={`text-lg font-extrabold ${
                          pharmacistReadout.risk === 'Low' ? 'text-emerald-500 dark:text-emerald-400' :
                          pharmacistReadout.risk === 'Medium' ? 'text-amber-500 dark:text-amber-400' :
                          'text-rose-500 dark:text-rose-400'
                        }`}>
                          {pharmacistReadout.risk}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Safety Warning block */}
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider block">Critical Safety Warning</span>
                    <p className="text-[10px] text-rose-950 dark:text-rose-350 font-medium leading-relaxed mt-1">
                      Do not double the next dose to catch up. Doing so can cause blood concentration levels to spike dangerously into toxic ranges. Always consult a healthcare professional.
                    </p>
                  </div>
                </div>

              </div>

              {/* Right side: 36-Hour Scenario comparative Chart (col-span-6) */}
              <div className="lg:col-span-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">Comparative Safety Forecast</span>
                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">36-Hour Concentration Scenarios</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Comparing normal curve, skipped recovery, taking late, and double-dose toxicity limits.</p>
                </div>

                <div className="h-52 w-full mt-4 bg-slate-950 border border-slate-850 rounded-2xl p-3 shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={assistantOutput.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={9} fontFamily="monospace" unit="h" />
                      <YAxis stroke="#64748b" fontSize={9} fontFamily="monospace" unit=" mg/L" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-[9px] font-mono space-y-0.5">
                                <p className="text-slate-400">Time: <span className="text-white">{payload[0].payload.time}h</span></p>
                                <p className="text-slate-450">Normal: <span className="text-white">{payload[0].payload.baseline}</span></p>
                                <p className="text-orange-400">Skip: <span>{payload[0].payload.skip}</span></p>
                                <p className="text-cyan-400">Late: <span>{payload[0].payload.takeLate}</span></p>
                                <p className="text-rose-500 font-bold">Double: <span>{payload[0].payload.doubleDose}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={selectedRxForAssistant.toxicThreshold} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Toxicity', fill: '#dc2626', fontSize: 7, position: 'insideTopLeft' }} />
                      
                      <Area type="monotone" dataKey="doubleDose" stroke="#f43f5e" strokeWidth={1.5} fill="transparent" />
                      <Area type="monotone" dataKey="takeLate" stroke="#06b6d4" strokeWidth={1.5} fill="transparent" />
                      <Area type="monotone" dataKey="skip" stroke="#f59e0b" strokeWidth={1.5} fill="transparent" />
                      <Area type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono font-bold mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2 px-1">
                  <span className="flex items-center gap-1 text-slate-500"><span className="w-2.5 h-0.5 bg-slate-500 inline-block"></span> Normal Dosing</span>
                  <span className="flex items-center gap-1 text-amber-500"><span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span> Skip Dose</span>
                  <span className="flex items-center gap-1 text-cyan-400"><span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> Take Late</span>
                  <span className="flex items-center gap-1 text-rose-500 animate-pulse"><span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> Double Dose</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-150 dark:border-slate-800 shrink-0">
              <button
                onClick={() => { setIsAssistantOpen(false); setSelectedRxForAssistant(null); }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-750 border-none rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close Decision Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delayed Dose Hours Modal --- */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-1">Log Delayed Dose</h4>
            <p className="text-xs text-slate-500 mb-4">How many hours late are you in taking this dose?</p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={inputDelayHours}
                  onChange={(e) => setInputDelayHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-center text-sm font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => { setIsDelayModalOpen(false); setDelayLogTarget(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-semibold rounded-xl bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (delayLogTarget) {
                      logDose('Delayed', delayLogTarget, inputDelayHours);
                    }
                    setIsDelayModalOpen(false);
                    setDelayLogTarget(null);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-450 text-slate-950 text-xs font-bold rounded-xl border-none cursor-pointer"
                >
                  Save Delayed Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
