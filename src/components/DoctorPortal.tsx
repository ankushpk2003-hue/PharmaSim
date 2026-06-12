import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Plus, Search, ShieldAlert, Check, ChevronRight, Calculator, FileText, BrainCircuit, Heart, ArrowRight, Clock, CheckCircle2, AlertTriangle, Activity, TrendingUp, Sparkles, Award, Printer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Patient, Prescription } from '../types';
import { getPatients, savePatient, DRUGS_DB } from '../services/db';
import { calculatePersonalizedPK, getAIDosageRecommendation } from '../services/pkModel';

export default function DoctorPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [activeDoctorName, setActiveDoctorName] = useState<string>('Dr. Sarah Jenkins');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Normal'>('All');

  // Form states for adding/editing a patient
  const [isAddingPatient, setIsAddingPatient] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formAge, setFormAge] = useState<number>(45);
  const [formWeight, setFormWeight] = useState<number>(70);
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formEgfr, setFormEgfr] = useState<number>(90);
  const [formLiver, setFormLiver] = useState<'Normal' | 'Mild' | 'Moderate' | 'Severe'>('Normal');
  const [formDisease, setFormDisease] = useState<string>('');
  const [formDrug, setFormDrug] = useState<string>('Gentamicin');
  const [formDose, setFormDose] = useState<number>(240);
  const [formInterval, setFormInterval] = useState<number>(24);
  const [formNotes, setFormNotes] = useState<string>('');
  
  // AI Advice state
  const [aiAdvice, setAiAdvice] = useState<any>(null);
  const [showAiBanner, setShowAiBanner] = useState<boolean>(false);

  useEffect(() => {
    // Load patients
    setPatients(getPatients());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '1234' || passcode.toLowerCase() === 'admin') {
      setIsLoggedIn(true);
      setLoginError('');
      // Set patient directory defaults
      const pts = getPatients();
      setPatients(pts);
      if (pts.length > 0) setSelectedPatientId(pts[0].id);
    } else {
      setLoginError('Invalid medical clinician credentials.');
    }
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDisease.trim()) return;

    const newPatientId = `PAT-${Math.floor(100 + Math.random() * 900)}`;

    const newPrescription: Prescription = {
      id: `rx-${Date.now()}`,
      drugName: formDrug,
      dose: formDose,
      interval: formInterval,
      mec: DRUGS_DB[formDrug]?.mec || 1.0,
      toxicThreshold: DRUGS_DB[formDrug]?.toxicThreshold || 10.0,
      startDate: new Date().toISOString(),
      instructions: `Take ${formDose} mg of ${formDrug} every ${formInterval} hours.`
    };

    const newPatient: Patient = {
      id: newPatientId,
      name: formName.trim(),
      age: Number(formAge),
      weight: Number(formWeight),
      gender: formGender,
      kidneyFunction: Number(formEgfr),
      liverFunction: formLiver,
      disease: formDisease.trim(),
      prescriptions: [newPrescription],
      adherenceHistory: [], // Starts with no logs
      clinicalNotes: formNotes.trim() || 'Initialized in portal.',
      riskScore: 0,
      createdAt: new Date().toISOString()
    };

    // Calculate baseline risk score
    // To calculate risk, we can use the db utilities or write it
    const adherence = 100; // starts at 100
    let risk = 0;
    if (newPatient.kidneyFunction < 30) risk += 25;
    else if (newPatient.kidneyFunction < 60) risk += 15;
    if (newPatient.liverFunction === 'Severe') risk += 20;
    else if (newPatient.liverFunction === 'Moderate') risk += 10;
    if (newPatient.prescriptions[0].drugName.toLowerCase() === 'gentamicin' && (newPatient.kidneyFunction < 60 || newPatient.liverFunction !== 'Normal')) {
      risk += 15;
    }
    newPatient.riskScore = Math.min(100, risk);

    savePatient(newPatient);
    setPatients(getPatients());
    setSelectedPatientId(newPatientId);
    setIsAddingPatient(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormAge(45);
    setFormWeight(70);
    setFormGender('Male');
    setFormEgfr(90);
    setFormLiver('Normal');
    setFormDisease('');
    setFormDrug('Gentamicin');
    setFormDose(240);
    setFormInterval(24);
    setFormNotes('');
    setAiAdvice(null);
    setShowAiBanner(false);
  };

  // Run simulated AI optimization model
  const triggerAiAdvisor = () => {
    // Construct mock patient structure for calculation
    const mockPatient: Patient = {
      id: 'mock',
      name: formName || 'New Patient',
      age: Number(formAge),
      weight: Number(formWeight),
      gender: formGender,
      kidneyFunction: Number(formEgfr),
      liverFunction: formLiver,
      disease: formDisease || 'Treatment',
      prescriptions: [],
      adherenceHistory: [],
      riskScore: 0,
      createdAt: ''
    };

    const recommendation = getAIDosageRecommendation(mockPatient, formDrug);
    setAiAdvice(recommendation);
    setShowAiBanner(true);
  };

  const adoptAiRegimen = () => {
    if (!aiAdvice) return;
    if (aiAdvice.recommendedDose > 0) {
      setFormDose(aiAdvice.recommendedDose);
      setFormInterval(aiAdvice.recommendedInterval);
    }
    setShowAiBanner(false);
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.disease.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (riskFilter === 'All') return matchesSearch;
    if (riskFilter === 'High') return matchesSearch && p.riskScore >= 50;
    if (riskFilter === 'Normal') return matchesSearch && p.riskScore < 50;
    return matchesSearch;
  });

  const activePatient = patients.find((p) => p.id === selectedPatientId);
  const activeRx = activePatient?.prescriptions[0];

  // --- Dynamic AI Dosing & PK Superposition Helpers ---
  const getDynamicConfidence = (patient: Patient, drugName: string) => {
    let score = 96;
    if (patient.kidneyFunction < 30) score -= 8;
    else if (patient.kidneyFunction < 60) score -= 4;
    
    if (patient.liverFunction === 'Severe') score -= 5;
    else if (patient.liverFunction === 'Moderate') score -= 2;

    const takenCount = patient.adherenceHistory.filter(h => h.status === 'Taken' || h.status === 'Delayed').length;
    const adherence = patient.adherenceHistory.length > 0 
      ? (takenCount / patient.adherenceHistory.length) * 100 
      : 100;
    
    if (adherence < 70) score -= 4;
    else if (adherence < 90) score -= 2;

    return Math.max(75, Math.min(99, score));
  };

  const generateCompliancePKData = (patient: Patient) => {
    const rx = patient.prescriptions[0];
    if (!rx) return [];

    const pk = calculatePersonalizedPK(patient, rx.drugName);
    const { vd, ke } = pk;
    
    const interval = rx.interval;
    const doseTimes: { time: number; amt: number }[] = [];

    const totalSimHours = 72;
    const steps = Math.floor(totalSimHours / interval);

    for (let i = steps; i >= 0; i--) {
      const scheduledTimeFromStart = totalSimHours - i * interval;
      const logIdx = steps - i;
      const log = patient.adherenceHistory[logIdx];

      if (log) {
        if (log.status === 'Taken') {
          doseTimes.push({ time: scheduledTimeFromStart, amt: rx.dose });
        } else if (log.status === 'Delayed') {
          const actualTime = scheduledTimeFromStart + (log.delayHours || 0);
          doseTimes.push({ time: actualTime, amt: rx.dose });
        }
      } else {
        // Fallback: assume taken on schedule if no logs recorded yet
        doseTimes.push({ time: scheduledTimeFromStart, amt: rx.dose });
      }
    }

    const points = [];
    for (let T = 0; T <= totalSimHours; T += 0.5) {
      let conc = 0;
      for (const d of doseTimes) {
        if (T >= d.time) {
          const t = T - d.time;
          conc += (d.amt / vd) * Math.exp(-ke * t);
        }
      }
      const relativeTime = T - totalSimHours;
      points.push({
        time: relativeTime,
        concentration: parseFloat(conc.toFixed(2))
      });
    }

    return points;
  };

  const handleAdoptAIDoseDashboard = () => {
    if (!activePatient || !activePatient.prescriptions[0]) return;
    const rx = activePatient.prescriptions[0];
    const rec = getAIDosageRecommendation(activePatient, rx.drugName);
    
    const updatedRx: Prescription = {
      ...rx,
      dose: rec.recommendedDose,
      interval: rec.recommendedInterval,
      instructions: `Take ${rec.recommendedDose} mg of ${rx.drugName} every ${rec.recommendedInterval} hours.`
    };
    
    const updatedPatient: Patient = {
      ...activePatient,
      prescriptions: [updatedRx]
    };
    
    // Recalculate risk score
    let risk = 0;
    const takenCount = activePatient.adherenceHistory.filter(h => h.status === 'Taken' || h.status === 'Delayed').length;
    const adherence = activePatient.adherenceHistory.length > 0 
      ? Math.round((takenCount / activePatient.adherenceHistory.length) * 100) 
      : 100;
    risk += (100 - adherence) * 0.6;
    if (updatedPatient.kidneyFunction < 30) risk += 25;
    else if (updatedPatient.kidneyFunction < 60) risk += 15;
    if (updatedPatient.liverFunction === 'Severe') risk += 20;
    else if (updatedPatient.liverFunction === 'Moderate') risk += 10;
    if (rx.drugName.toLowerCase() === 'gentamicin' && (updatedPatient.kidneyFunction < 60 || updatedPatient.liverFunction !== 'Normal')) {
      risk += 15;
    }
    updatedPatient.riskScore = Math.min(100, Math.max(0, Math.round(risk)));

    savePatient(updatedPatient);
    setPatients(getPatients());
  };

  // --- Render Login Screen ---
  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/20 relative min-h-[500px] animate-fade-in">
        {/* Apple-like Glassmorphism authentication card */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="apple-glass p-8 rounded-3xl max-w-sm w-full shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20 mb-4 shadow-sm">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">Clinician Authentication</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1.5 max-w-[240px] leading-relaxed">
              Access secure patient health profiles and AI dosing modules.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                Secure Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode..."
                className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-550 transition-all text-center tracking-widest shadow-inner"
                autoFocus
              />
              <span className="text-[9px] text-slate-450 dark:text-slate-500 text-center block mt-1.5 font-sans">
                Demo Code: <strong className="font-bold">1234</strong>
              </span>
            </div>

            {loginError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 p-3 rounded-lg text-xs text-rose-600 dark:text-rose-400 text-center flex items-center justify-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 border-none"
            >
              <span>Verify Clinician Credentials</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Add Patient Screen ---
  if (isAddingPatient) {
    return (
      <div className="p-1 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Patient Twin Case</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Initialize a patient node with specific demographic and organ clearances.</p>
            </div>
            <button
              onClick={() => { setIsAddingPatient(false); resetForm(); }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-650 dark:text-slate-400 text-xs font-bold rounded-xl transition-colors cursor-pointer bg-transparent"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSavePatient} className="space-y-6">
            {/* Demographics Block */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">I. General Demographics</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age (years)</label>
                  <input
                    type="number"
                    required
                    value={formAge}
                    onChange={(e) => setFormAge(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e: any) => setFormGender(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary Disease Diagnosis</label>
                  <input
                    type="text"
                    required
                    value={formDisease}
                    onChange={(e) => setFormDisease(e.target.value)}
                    placeholder="e.g. Infective Endocarditis"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Organ clearance metrics block */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">II. Physiological Organ Clearances</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kidney input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Renal Function (eGFR)</label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      formEgfr >= 60 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400' :
                      formEgfr >= 30 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-400' :
                      'bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-400'
                    }`}>
                      {formEgfr} mL/min ({
                        formEgfr >= 90 ? 'Stage 1 Normal' :
                        formEgfr >= 60 ? 'Stage 2 Mild' :
                        formEgfr >= 30 ? 'Stage 3 Moderate' :
                        formEgfr >= 15 ? 'Stage 4 Severe' : 'Stage 5 Failure'
                      })
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="140"
                    value={formEgfr}
                    onChange={(e) => setFormEgfr(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-450 mt-1 font-mono">
                    <span>10 mL/min (Kidney failure)</span>
                    <span>90 (Normal)</span>
                    <span>140</span>
                  </div>
                </div>

                {/* Liver input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Liver Function (Child-Pugh Classification)</label>
                  <select
                    value={formLiver}
                    onChange={(e: any) => setFormLiver(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Normal">Normal Hepatic Function (Class A)</option>
                    <option value="Mild">Mild Dysfunction (Class A-B)</option>
                    <option value="Moderate">Moderate Dysfunction (Class B)</option>
                    <option value="Severe">Severe Dysfunction / Cirrhosis (Class C)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dosing Prescription formulation with AI integration */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">III. Prescription & AI Dosage Engine</span>
                <button
                  type="button"
                  onClick={triggerAiAdvisor}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <BrainCircuit className="h-3.5 w-3.5 animate-pulse" />
                  <span>Consult AI Advisor</span>
                </button>
              </div>

              {/* Show AI Advice Banner if triggered */}
              {showAiBanner && aiAdvice && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                        <BrainCircuit className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Dosage Calculator Output</h4>
                    </div>
                    {aiAdvice.recommendedDose > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-mono border border-emerald-500/30 rounded-full font-bold">
                        Calculated Successfully
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-350 leading-relaxed font-medium">
                    {aiAdvice.explanation}
                  </p>

                  {aiAdvice.recommendedDose > 0 ? (
                    <div className="flex items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-850 justify-between">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Standard Dose</span>
                          <span className="text-xs text-slate-400 line-through">
                            {formDrug === 'Gentamicin' ? Math.round(5 * formWeight) : 
                             formDrug === 'Lisinopril' ? 10 : 500} mg / {
                             formDrug === 'Gentamicin' ? 24 : 
                             formDrug === 'Lisinopril' ? 24 : 12}h
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider block">AI Recommended</span>
                          <span className="text-xs text-emerald-400 font-bold">
                            {aiAdvice.recommendedDose} mg every {aiAdvice.recommendedInterval}h
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={adoptAiRegimen}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm border-none cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Adopt AI Regimen</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 font-bold text-center uppercase tracking-wide">
                      Dosing Blocked: Alternative Therapy Required
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medication Drug</label>
                  <select
                    value={formDrug}
                    onChange={(e) => {
                      const drugName = e.target.value;
                      setFormDrug(drugName);
                      // Update default dose/intervals
                      if (drugName === 'Gentamicin') { setFormDose(240); setFormInterval(24); }
                      else if (drugName === 'Lisinopril') { setFormDose(10); setFormInterval(24); }
                      else if (drugName === 'Metformin') { setFormDose(500); setFormInterval(12); }
                      else if (drugName === 'Amoxicillin') { setFormDose(500); setFormInterval(8); }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Gentamicin">Gentamicin (Aminoglycoside)</option>
                    <option value="Lisinopril">Lisinopril (ACE Inhibitor)</option>
                    <option value="Metformin">Metformin (Biguanide)</option>
                    <option value="Amoxicillin">Amoxicillin (Penicillin)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prescribed Dose (mg)</label>
                    <span className="text-[10px] font-bold font-mono text-emerald-500">{formDose} mg</span>
                  </div>
                  <input
                    type="range"
                    min={formDrug === 'Lisinopril' ? 2.5 : 50}
                    max={formDrug === 'Metformin' ? 1000 : 800}
                    step={formDrug === 'Lisinopril' ? 2.5 : 50}
                    value={formDose}
                    onChange={(e) => setFormDose(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-450 mt-1 font-mono">
                    <span>Min: {formDrug === 'Lisinopril' ? '2.5' : '50'} mg</span>
                    <span>Max: {formDrug === 'Metformin' ? '1000' : '800'} mg</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dosing Interval (hours)</label>
                    <span className="text-[10px] font-bold font-mono text-emerald-500">Every {formInterval} hours (q{formInterval}h)</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    step="4"
                    value={formInterval}
                    onChange={(e) => setFormInterval(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-450 mt-1 font-mono">
                    <span>q4h (Frequent)</span>
                    <span>q24h (Daily)</span>
                    <span>q48h</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Clinical Prescription Remarks</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Enter specific instructions, diagnostic details, TDM milestones..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold text-slate-850 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setIsAddingPatient(false); resetForm(); }}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-650 dark:text-slate-400 text-xs font-bold rounded-xl transition-colors cursor-pointer bg-transparent"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md border-none cursor-pointer"
              >
                Save Patient Record
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Main Directory View ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 animate-fade-in">
      {/* LEFT COLUMN: Today's Patients Directory Card (col-span-4) */}
      <div className="lg:col-span-4 google-card p-5 flex flex-col justify-between max-h-[780px] overflow-hidden no-print">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-md">Today's Patients</h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">Twin Nodes Active</p>
            </div>
            <button
              onClick={() => setIsAddingPatient(true)}
              className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center"
              title="Add Patient Twin"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, name, diagnosis..."
              className="w-full bg-slate-50/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500 dark:text-white transition-all shadow-inner"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          {/* Risk Filters */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/85">
            {['All', 'High', 'Normal'].map((filter) => (
              <button
                key={filter}
                onClick={() => setRiskFilter(filter as any)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all border-none cursor-pointer ${
                  riskFilter === filter
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-650 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
                }`}
              >
                {filter === 'All' ? 'All Patients' : filter === 'High' ? 'High Risk' : 'Standard'}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List Container */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-1.5 dark-scroll">
          {filteredPatients.length === 0 ? (
            <div className="text-center p-6 text-slate-400">
              <p className="text-xs font-semibold">No patient records found</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Try searching different terms or filters.</p>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const isSelected = patient.id === selectedPatientId;
              const activeRx = patient.prescriptions[0];
              const isHighRisk = patient.riskScore >= 50;

              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 transform hover:scale-[1.012] ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-50/50 hover:bg-slate-100/80 dark:bg-slate-950/40 dark:hover:bg-slate-900/60 border-slate-150 dark:border-slate-850 text-slate-800 dark:text-slate-350'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-blue-700/50 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                      }`}>
                        {patient.id}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isHighRisk
                          ? 'bg-rose-500/20 text-rose-650 dark:text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Risk: {patient.riskScore}
                      </span>
                    </div>
                    <p className={`text-xs font-bold mt-1.5 truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      {patient.name}
                    </p>
                    <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {patient.disease}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {activeRx && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                        isSelected 
                          ? 'bg-blue-700/50 border-blue-600/50 text-blue-100' 
                          : 'bg-white border-slate-205 text-slate-550 dark:bg-slate-900 dark:border-slate-800'
                      }`}>
                        {activeRx.drugName}
                      </span>
                    )}
                    <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-white' : 'text-slate-400'
                    }`} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Redesigned Medical Dashboard Cockpit (col-span-8) */}
      <div className="lg:col-span-8 space-y-6">
        {activePatient && activePatient.prescriptions[0] ? (() => {
          const activeRx = activePatient.prescriptions[0];
          const confidence = getDynamicConfidence(activePatient, activeRx.drugName);
          const aiRec = getAIDosageRecommendation(activePatient, activeRx.drugName);
          const concData = generateCompliancePKData(activePatient);
          
          const logHistory = activePatient.adherenceHistory;
          const takenCount = logHistory.filter(h => h.status === 'Taken' || h.status === 'Delayed').length;
          const delayedCount = logHistory.filter(h => h.status === 'Delayed').length;
          const missedCount = logHistory.filter(h => h.status === 'Missed').length;
          const adherenceRate = logHistory.length > 0 
            ? Math.round((takenCount / logHistory.length) * 100) 
            : 100;

          return (
            <>
              <div className="space-y-6 animate-fade-in no-print">
                {/* Header card */}
                <div className="apple-glass rounded-3xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-650 text-white rounded-2xl shadow-sm">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-sans">
                        {activePatient.name}
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 rounded-lg">
                          {activePatient.id}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5 leading-relaxed">
                        Primary Twin Diagnosis: <strong>{activePatient.disease}</strong> • Clearance Sync Active
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950/45 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl font-mono flex items-center">
                      TREATMENT NODES: {activePatient.prescriptions.length}
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/10 animate-fade-in"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Download Report (PDF)</span>
                    </button>
                  </div>
                </div>

              {/* Sub-grid of cards */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. AI Dose Prediction Card */}
                <div className="md:col-span-8 google-card p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BrainCircuit className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-widest font-mono">AI Dose Prediction</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 mb-4 shadow-inner">
                      <div>
                        <span className="text-[9px] text-slate-450 dark:text-slate-550 block uppercase font-mono">Prescribed Regimen</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-sm font-extrabold">{activeRx.dose} mg / q{activeRx.interval}h</strong>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-450" />
                      <div>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block uppercase font-mono">AI Recommended</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
                          {aiRec.recommendedDose > 0 ? `${aiRec.recommendedDose} mg / q${aiRec.recommendedInterval}h` : 'Contraindicated'}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {aiRec.explanation}
                    </p>
                  </div>

                  {aiRec.isAdjusted && aiRec.recommendedDose > 0 && (
                    <button
                      onClick={adoptAiRegimen}
                      className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-550 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm border-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Adopt AI Recommended Dosage</span>
                    </button>
                  )}
                </div>

                {/* 2. Confidence Score Card */}
                <div className="md:col-span-4 google-card p-6 flex flex-col justify-between text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex justify-center mb-1">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest font-mono">Confidence Score</span>
                  </div>

                  {/* Glowing circular SVG ring */}
                  <div className="relative flex items-center justify-center shrink-0 w-28 h-28 mx-auto my-3">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="stroke-slate-100 dark:stroke-slate-850"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="stroke-blue-600 dark:stroke-blue-400 transition-all duration-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.35)]"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 46}`}
                        strokeDashoffset={`${2 * Math.PI * 46 * (1 - confidence / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{confidence}%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">rating</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-450 dark:text-slate-500 leading-snug">
                    Calibrated based on eGFR stability, hepatic extraction indexes, and history consistency.
                  </div>
                </div>

                {/* 3. Risk Level Card */}
                <div className="md:col-span-4 google-card p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">Risk Level</span>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        activePatient.riskScore >= 60 ? 'bg-rose-400' : activePatient.riskScore >= 30 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        activePatient.riskScore >= 60 ? 'bg-rose-500' : activePatient.riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                    </span>
                  </div>

                  <div className="text-center my-2">
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      activePatient.riskScore >= 60 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                      activePatient.riskScore >= 30 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    }`}>
                      {activePatient.riskScore >= 60 ? 'High Risk' : activePatient.riskScore >= 30 ? 'Medium Risk' : 'Low Risk'}
                    </span>
                    <strong className="block text-2xl font-extrabold text-slate-850 dark:text-slate-100 font-mono mt-3">
                      {activePatient.riskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </strong>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                    {activePatient.riskScore >= 60 
                      ? 'High excretion clearance delay. Requires dosage reduction or extended intervals.' 
                      : activePatient.riskScore >= 30
                      ? 'Moderate clearance latency. Target daily therapeutic ranges.'
                      : 'Excellent clearing kinetics. Standard dosing acceptable.'}
                  </p>
                </div>

                {/* 4. Medication Adherence Card */}
                <div className="md:col-span-4 google-card p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">Medication Adherence</span>
                    <Award className="h-4 w-4 text-emerald-500" />
                  </div>

                  <div className="flex items-center justify-around gap-4 my-2">
                    {/* SVG Circular Ring */}
                    <div className="relative flex items-center justify-center shrink-0 w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className="stroke-slate-100 dark:stroke-slate-850"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className={`transition-all duration-500 ${
                            adherenceRate >= 90 ? 'stroke-emerald-500' :
                            adherenceRate >= 75 ? 'stroke-amber-500' : 'stroke-rose-500'
                          }`}
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - adherenceRate / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{adherenceRate}%</span>
                      </div>
                    </div>

                    <div className="text-[10px] space-y-1 font-mono">
                      <div className="text-slate-500 dark:text-slate-400"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1"></span>Taken: {takenCount}</div>
                      <div className="text-slate-500 dark:text-slate-400"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block mr-1"></span>Delayed: {delayedCount}</div>
                      <div className="text-slate-500 dark:text-slate-400"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block mr-1"></span>Missed: {missedCount}</div>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 text-center font-mono">
                    Compliance over last {logHistory.length} doses
                  </div>
                </div>

                {/* 5. Patient History Card (Demographics) */}
                <div className="md:col-span-4 google-card p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">Patient History Details</span>
                    <User className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="space-y-2.5 my-2 text-xs font-semibold">
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-850/50 pb-1.5">
                      <span className="text-slate-450 font-normal">Age / Weight</span>
                      <span className="text-slate-850 dark:text-slate-200 font-mono">{activePatient.age} yrs / {activePatient.weight} kg</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-855/50 pb-1.5">
                      <span className="text-slate-450 font-normal">Gender</span>
                      <span className="text-slate-850 dark:text-slate-200">{activePatient.gender}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-855/50 pb-1.5">
                      <span className="text-slate-450 font-normal">Kidney (eGFR)</span>
                      <span className="text-slate-850 dark:text-slate-200 font-mono">{activePatient.kidneyFunction} mL/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-455 font-normal">Liver Status</span>
                      <span className="text-slate-855 dark:text-slate-200">{activePatient.liverFunction}</span>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 text-center font-mono">
                    Baseline physiological twin clearances
                  </div>
                </div>                {/* 6. Drug Concentration Chart Card */}
                <div className="md:col-span-12 google-card p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Drug Concentration Chart (PK/PD Simulation)
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono text-slate-450 dark:text-slate-500 font-bold">
                      72-Hour Superposition Curve ({activeRx.drugName})
                    </span>
                  </div>

                  <div className="h-56 w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={concData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="doctorGlowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="time"
                          stroke="#64748b"
                          fontSize={8}
                          fontFamily="monospace"
                          unit="h"
                          ticks={[-72, -60, -48, -36, -24, -12, 0]}
                        />
                        <YAxis stroke="#64748b" fontSize={8} fontFamily="monospace" unit=" mg/L" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-[9px] font-mono shadow-lg space-y-0.5">
                                  <p className="text-slate-500">Hours ago: <span className="text-slate-800 dark:text-white font-bold">{payload[0].payload.time}h</span></p>
                                  <p className="text-blue-600 dark:text-blue-400 font-bold">Concentration: <span>{payload[0].value} mg/L</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={activeRx.toxicThreshold}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{ value: 'TOXICITY LIMIT', fill: '#ef4444', fontSize: 7, fontWeight: 'bold', position: 'insideTopLeft' }}
                        />
                        <ReferenceLine
                          y={activeRx.mec}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{ value: 'MIN EFFECTIVE CONC (MEC)', fill: '#10b981', fontSize: 7, fontWeight: 'bold', position: 'insideBottomLeft' }}
                        />
                        <ReferenceLine x={0} stroke="#475569" strokeDasharray="2 2" strokeWidth={1} />
                        
                        <Area
                          type="monotone"
                          dataKey="concentration"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#doctorGlowGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">
                    Simulates multiple dose accumulation waves over the last 3 days relative to patient log compliance.
                  </p>
                </div>

                {/* 7. Patient History Card (Clinical Remarks) */}
                <div className="md:col-span-6 google-card p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">Physician Intake Remarks</span>
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/45 border-l-4 border-blue-500 rounded-r-2xl p-4 text-xs italic text-slate-755 dark:text-slate-350 leading-relaxed font-serif whitespace-pre-wrap flex-1 min-h-[140px]">
                    {activePatient.clinicalNotes || 'No notes entered for this case twin.'}
                  </div>
                </div>

                {/* 8. Treatment Timeline Card */}
                <div className="md:col-span-6 google-card p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                    <span className="text-[10px] text-slate-455 dark:text-slate-500 uppercase tracking-widest font-mono">Treatment Timeline</span>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 space-y-2 dark-scroll text-xs">
                    {logHistory.length === 0 ? (
                      <div className="text-center p-6 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl text-slate-500">
                        No logs recorded for this patient.
                      </div>
                    ) : (
                      logHistory.map((log) => (
                        <div
                          key={log.id}
                          className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850/80 flex items-center justify-between transition-all hover:bg-slate-100/50 dark:hover:bg-slate-950/70"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              log.status === 'Taken' ? 'bg-emerald-500/10 text-emerald-500' :
                              log.status === 'Delayed' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {log.status === 'Taken' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {log.status === 'Delayed' && <Clock className="h-3.5 w-3.5" />}
                              {log.status === 'Missed' && <AlertTriangle className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <strong className="text-slate-850 dark:text-slate-200 block font-bold">{log.scheduledTime} Dose</strong>
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${
                            log.status === 'Taken' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            log.status === 'Delayed' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {log.status} {log.delayHours ? `(${log.delayHours}h)` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* PRINT-ONLY PATIENT CLINICAL REPORT */}
            <div className="print-only w-full font-sans text-slate-900 bg-white p-4 space-y-6">
              {/* Report Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-955 uppercase">PharmaSim AI™ Clinical Report</h1>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Physiological Digital Twin Telemetry & Dosing Sheet</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <p>Report ID: {activePatient.id}-{Math.floor(Date.now() / 1000)}</p>
                  <p>Printed: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Patient Demographics & Physiological Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">1. Patient Profile & Physiology</h3>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500 w-1/4">Full Name:</td>
                      <td className="py-1.5 text-slate-900 font-semibold">{activePatient.name}</td>
                      <td className="py-1.5 font-bold text-slate-500 w-1/4">Patient ID:</td>
                      <td className="py-1.5 text-slate-900 font-mono">{activePatient.id}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500">Age:</td>
                      <td className="py-1.5 text-slate-900">{activePatient.age} Years</td>
                      <td className="py-1.5 font-bold text-slate-500">Gender / Weight:</td>
                      <td className="py-1.5 text-slate-900">{activePatient.gender} / {activePatient.weight} kg</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500">Primary Diagnosis:</td>
                      <td className="py-1.5 text-slate-900 font-semibold">{activePatient.disease}</td>
                      <td className="py-1.5 font-bold text-slate-500">Physician-In-Charge:</td>
                      <td className="py-1.5 text-slate-900">{activeDoctorName}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500">Renal Function (eGFR):</td>
                      <td className="py-1.5 text-slate-900 font-mono">{activePatient.kidneyFunction} mL/min</td>
                      <td className="py-1.5 font-bold text-slate-500">Liver Scale:</td>
                      <td className="py-1.5 text-slate-900">{activePatient.liverFunction}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Active Prescription & Regimen Status */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">2. Active Pharmacotherapy Regimen</h3>
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500 w-1/4">Prescribed Drug:</td>
                      <td className="py-1.5 text-slate-900 font-bold uppercase">{activeRx.drugName}</td>
                      <td className="py-1.5 font-bold text-slate-500 w-1/4">Standard Dose:</td>
                      <td className="py-1.5 text-slate-900">{activeRx.dose} mg</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500">Interval:</td>
                      <td className="py-1.5 text-slate-900">Every {activeRx.interval} Hours</td>
                      <td className="py-1.5 font-bold text-slate-500">Route / Form:</td>
                      <td className="py-1.5 text-slate-900">Oral Capsule</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 font-bold text-slate-500">Instructions:</td>
                      <td className="py-1.5 text-slate-900" colSpan={3}>{activeRx.instructions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* AI Decision Support */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">3. Twin AI Dose & Clearance Telemetry</h3>
                <div className="grid grid-cols-3 gap-4 border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">AI Recommended Regimen</span>
                    <strong className="text-xs text-slate-900">{aiRec.recommendedDose} mg Q{aiRec.recommendedInterval}h</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">Dosing Confidence</span>
                    <strong className="text-xs text-slate-900">{confidence}% Match Index</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">Clinical Risk Score</span>
                    <strong className="text-xs text-slate-900">{activePatient.riskScore} / 100 ({activePatient.riskScore >= 60 ? 'High' : activePatient.riskScore >= 30 ? 'Medium' : 'Low'} Risk)</strong>
                  </div>
                </div>
              </div>

              {/* Adherence analysis */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">4. Medication Adherence Analysis</h3>
                <div className="grid grid-cols-4 gap-4 border border-slate-200 p-3 rounded-lg bg-slate-50/50 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Adherence Rate</span>
                    <strong className="text-sm text-slate-900">{adherenceRate}%</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Doses Taken / Delayed</span>
                    <strong className="text-sm text-emerald-600">{takenCount} Doses</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Doses Delayed</span>
                    <strong className="text-sm text-amber-600">{delayedCount} Doses</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Doses Missed</span>
                    <strong className="text-sm text-rose-600">{missedCount} Doses</strong>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">5. Clinical Remarks & Notes</h3>
                <div className="border border-slate-200 p-3 rounded-lg text-xs leading-relaxed text-slate-800 italic bg-slate-50/50">
                  {activePatient.clinicalNotes || 'No notes entered for this case twin.'}
                </div>
              </div>

              {/* Logs Timeline */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">6. Historical Adherence Log Timeline</h3>
                {logHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No logs recorded for this patient.</p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-1.5 px-2 font-bold text-slate-500">Scheduled Time</th>
                        <th className="py-1.5 px-2 font-bold text-slate-500">Status</th>
                        <th className="py-1.5 px-2 font-bold text-slate-500">Details</th>
                        <th className="py-1.5 px-2 font-bold text-slate-500">Logged Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logHistory.map((log) => (
                        <tr key={log.id} className="border-b border-slate-100">
                          <td className="py-1.5 px-2 font-medium">{log.scheduledTime}</td>
                          <td className="py-1.5 px-2 font-semibold">
                            <span className={
                              log.status === 'Taken' ? 'text-emerald-600' :
                              log.status === 'Delayed' ? 'text-amber-600' : 'text-rose-600'
                            }>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-500">
                            {log.delayHours ? `Delayed by ${log.delayHours} Hours` : 'On Time'}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer Disclaimer */}
              <div className="border-t border-slate-200 pt-4 mt-8 text-center text-[8px] text-slate-400 leading-normal font-sans">
                <p>CONFIDENTIAL MEDICAL DATA Twin Sync. Not a physical substitution for clinical lab diagnostics.</p>
                <p>© 2026 PharmaSim AI Healthcare Inc. • Designed by Ankush • All Rights Reserved.</p>
              </div>
            </div>
          </>
        );
        })() : (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 text-slate-450 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl no-print">
            <ShieldAlert className="h-10 w-10 text-slate-350 dark:text-slate-700 mb-3 animate-pulse" />
            <p className="text-sm font-semibold">Select a Patient Record</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a patient from the Today's Patients directory to inspect physiological medical twins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
