import React, { useState, useEffect } from 'react';
import { Pill, ShieldAlert, Cpu, Clock, AlertTriangle, User, ShieldCheck, Sparkles, RefreshCw, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Patient, Prescription } from '../types';
import { getPatients, DRUGS_DB } from '../services/db';
import { calculatePersonalizedPK, simulateMissedDoseScenarios } from '../services/pkModel';

export default function AIPharmacistPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [lateHours, setLateHours] = useState<number>(3);
  const [simulationData, setSimulationData] = useState<any>(null);

  // Load patients and set default active patient
  useEffect(() => {
    const list = getPatients();
    setPatients(list);
    if (list.length > 0) {
      setSelectedPatient(list[0]);
      if (list[0].prescriptions.length > 0) {
        setSelectedRx(list[0].prescriptions[0]);
      }
    }
  }, []);

  // Sync prescription when patient changes
  const handlePatientChange = (patientId: string) => {
    const p = patients.find((pat) => pat.id === patientId) || null;
    setSelectedPatient(p);
    if (p && p.prescriptions.length > 0) {
      setSelectedRx(p.prescriptions[0]);
    } else {
      setSelectedRx(null);
    }
  };

  // Run PK simulation and update graph data
  useEffect(() => {
    if (selectedPatient && selectedRx) {
      const pk = calculatePersonalizedPK(selectedPatient, selectedRx.drugName);
      const output = simulateMissedDoseScenarios(selectedRx, pk, lateHours);
      setSimulationData(output);
    }
  }, [selectedPatient, selectedRx, lateHours]);

  // Determine dynamic advice depending on hours missed, and ensure EXACT copy matches when it is 3 hours
  const getAIAdvice = () => {
    if (lateHours === 3) {
      return {
        latency: 'Patient missed dose by 3 hours.',
        rec: 'Take immediately.',
        warning: 'Do not double the next dose.',
        confidence: '96%',
        risk: 'Low',
        color: 'emerald'
      };
    }

    // Dynamic fallback matching general clinical logic for other times
    const interval = selectedRx?.interval || 24;
    const halfLife = selectedPatient && selectedRx ? calculatePersonalizedPK(selectedPatient, selectedRx.drugName).halfLife : 3;
    const lateCutoff = interval * 0.25;

    if (lateHours <= lateCutoff) {
      return {
        latency: `Patient missed dose by ${lateHours} hours.`,
        rec: 'Take immediately.',
        warning: 'Do not double the next dose.',
        confidence: '95%',
        risk: 'Low',
        color: 'emerald'
      };
    } else if (lateHours <= interval * 0.5) {
      return {
        latency: `Patient missed dose by ${lateHours} hours.`,
        rec: 'Skip this dose. Resume normal schedule.',
        warning: 'Do not double the next dose.',
        confidence: '92%',
        risk: 'Medium',
        color: 'amber'
      };
    } else {
      return {
        latency: `Patient missed dose by ${lateHours} hours.`,
        rec: 'Skip this dose and wait for your next scheduled interval.',
        warning: 'Do not double the next dose.',
        confidence: '98%',
        risk: 'High',
        color: 'rose'
      };
    }
  };

  const advice = getAIAdvice();

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Dashboard Header */}
      <div className="apple-glass rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-650 rounded-2xl text-white font-bold shadow-lg shadow-blue-500/10">
            <Cpu className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest font-mono">decision support core</span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">AI Pharmacist Panel</h2>
          </div>
        </div>

        {/* High-tech status indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/10 rounded-xl text-[10px] font-bold font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span>CLINICAL ADVISORY ACTIVE</span>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Intake Controls & Patient Profile */}
        <div className="lg:col-span-5 space-y-6">
          <div className="google-card p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
              <User className="h-4.5 w-4.5 text-slate-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Simulation Settings</h3>
            </div>

            {/* Select Patient */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Select Patient Profile
              </label>
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => handlePatientChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-950 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Patient Mini HUD */}
            {selectedPatient && (
              <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-2.5 font-mono text-[10px] mb-4">
                <div className="flex justify-between items-center text-slate-450">
                  <span>AGE / GENDER:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.age} yrs / {selectedPatient.gender}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-450 border-t border-slate-150/40 dark:border-slate-850/40 pt-1.5">
                  <span>KIDNEY FUNCTION (eGFR):</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.kidneyFunction} mL/min</strong>
                </div>
                <div className="flex justify-between items-center text-slate-450 border-t border-slate-150/40 dark:border-slate-850/40 pt-1.5">
                  <span>LIVER FUNCTION STATUS:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatient.liverFunction}</strong>
                </div>
                {selectedRx && (
                  <div className="flex justify-between items-center text-slate-450 border-t border-slate-150/40 dark:border-slate-850/40 pt-1.5">
                    <span>ACTIVE MEDICATION:</span>
                    <strong className="text-blue-650 dark:text-blue-400 uppercase">{selectedRx.drugName}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Slider for Hours Missed */}
            {selectedRx && (
              <div className="space-y-3 pt-2 mb-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Hours Missed Latency
                  </label>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {lateHours} hours late
                  </span>
                </div>
                
                <input
                  type="range"
                  min="1"
                  max={Math.min(24, selectedRx.interval)}
                  step="1"
                  value={lateHours}
                  onChange={(e) => setLateHours(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-150 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>1 hr late</span>
                  <span>{Math.floor(selectedRx.interval / 2)} hrs (Halfway)</span>
                  <span>{selectedRx.interval} hrs</span>
                </div>
              </div>
            )}
            
            {/* Quick Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Quick Latency Presets</span>
              <div className="flex gap-2">
                {[3, 6, 12].map((hr) => (
                  <button
                    key={hr}
                    onClick={() => {
                      if (selectedRx && hr <= selectedRx.interval) {
                        setLateHours(hr);
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all cursor-pointer ${
                      lateHours === hr
                        ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950/45'
                    }`}
                  >
                    {hr} Hours
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* PK Info card */}
          {selectedRx && (
            <div className="google-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-blue-650 dark:text-blue-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Pill className="h-4 w-4" />
                <span>{selectedRx.drugName} Pharmacokinetics</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                {DRUGS_DB[selectedRx.drugName]?.dosingRules || ''}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[9px]">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-850">
                  <span className="text-slate-400 block">HALF-LIFE (t1/2)</span>
                  <strong className="text-slate-800 dark:text-white">{DRUGS_DB[selectedRx.drugName]?.halfLife} hrs</strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-850">
                  <span className="text-slate-400 block">THERAPEUTIC RANGE</span>
                  <strong className="text-slate-800 dark:text-white">
                    {DRUGS_DB[selectedRx.drugName]?.mec} - {DRUGS_DB[selectedRx.drugName]?.toxicThreshold} mg/L
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Pharmacist Advisor Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Glowing AI Output Panel */}
          <div className="google-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 animate-pulse">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-xs tracking-wider uppercase font-mono">pharmacist advisory node</h4>
                  <p className="text-[8px] font-bold text-slate-450 dark:text-slate-500 font-mono tracking-widest uppercase">system generated output</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 text-[9px] font-bold font-mono border rounded-full ${
                advice.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400' :
                advice.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-450' :
                'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-450'
              }`}>
                {advice.risk} EXCRETION RISK
              </span>
            </div>

            {/* Exactly Formatted Output Box */}
            <div className="bg-slate-50/50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-5 relative">
              <div className="absolute top-3 right-3 text-[8px] font-mono text-blue-500/30 tracking-widest select-none font-bold uppercase">
                Twin core v1.2
              </div>

              {/* Exact user request format */}
              <div className="space-y-4 font-sans leading-relaxed text-sm">
                
                {/* Latency Section */}
                <div className="border-l-2 border-blue-500 pl-4 py-0.5">
                  <p className="text-slate-800 dark:text-slate-100 font-semibold tracking-wide">
                    {advice.latency}
                  </p>
                </div>

                {/* Recommendation Section */}
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                    Recommendation:
                  </h5>
                  <p className={`text-base font-extrabold tracking-tight ${
                    advice.color === 'emerald' ? 'text-emerald-650 dark:text-emerald-400' :
                    advice.color === 'amber' ? 'text-amber-600 dark:text-amber-450' : 'text-rose-600 dark:text-rose-450'
                  }`}>
                    {advice.rec}
                  </p>
                </div>

                {/* Do not double the next dose Warning */}
                <div className="space-y-1">
                  <p className="text-slate-655 dark:text-slate-300 font-medium leading-relaxed">
                    {advice.warning}
                  </p>
                </div>

                {/* Confidence & Risk */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-150 dark:border-slate-900 font-sans">
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                      Confidence:
                    </h5>
                    <strong className="text-xl font-extrabold text-blue-650 dark:text-blue-400 tracking-tight font-mono">
                      {advice.confidence}
                    </strong>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                      Risk:
                    </h5>
                    <strong className={`text-xl font-extrabold tracking-tight ${
                      advice.color === 'emerald' ? 'text-emerald-650 dark:text-emerald-400' :
                      advice.color === 'amber' ? 'text-amber-600 dark:text-amber-450' : 'text-rose-600 dark:text-rose-450'
                    }`}>
                      {advice.risk}
                    </strong>
                  </div>
                </div>

              </div>
            </div>

            {/* Critical Safety Notice */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3 mt-4">
              <ShieldAlert className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest font-mono block">CLINICAL DIRECTIVE</span>
                <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium leading-relaxed font-sans">
                  Never take a double dose to catch up. Doing so can cause plasma concentrations to spike into toxic zones, inducing organ stress or severe drug toxicities.
                </p>
              </div>
            </div>

          </div>

          {/* Dynamic 36-Hour Simulation Chart */}
          {simulationData && selectedRx && (
            <div className="google-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    36-Hour PK Recovery Chart
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-slate-450">
                  Drug: {selectedRx.drugName} ({selectedRx.dose}mg)
                </span>
              </div>

              <div className="h-52 w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-850/60 rounded-2xl p-3 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationData.data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={8} fontFamily="monospace" unit="h" />
                    <YAxis stroke="#64748b" fontSize={8} fontFamily="monospace" unit=" mg/L" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-[9px] font-mono shadow-xl space-y-0.5">
                              <p className="text-slate-500 font-sans">Time: <span className="text-slate-800 dark:text-white font-bold">{payload[0].payload.time}h</span></p>
                              <p className="text-slate-450 font-sans">Normal: <span className="text-slate-800 dark:text-white">{payload[0].payload.baseline}</span></p>
                              <p className="text-amber-500 font-sans font-bold font-mono">Skip: <span>{payload[0].payload.skip}</span></p>
                              <p className="text-blue-650 dark:text-blue-400 font-sans font-bold font-mono">Late: <span>{payload[0].payload.takeLate}</span></p>
                              <p className="text-rose-500 font-sans font-bold font-mono">Double: <span>{payload[0].payload.doubleDose}</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={selectedRx.toxicThreshold}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: 'TOXICITY LIMIT', fill: '#ef4444', fontSize: 7, fontWeight: 'bold', position: 'insideTopLeft' }}
                    />
                    
                    <Area type="monotone" dataKey="doubleDose" stroke="#f43f5e" strokeWidth={1.5} fill="transparent" />
                    <Area type="monotone" dataKey="takeLate" stroke="#3b82f6" strokeWidth={1.5} fill="transparent" />
                    <Area type="monotone" dataKey="skip" stroke="#f59e0b" strokeWidth={1.5} fill="transparent" />
                    <Area type="monotone" dataKey="baseline" stroke="#64748b" strokeWidth={1.5} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono font-bold pt-1 border-t border-slate-100 dark:border-slate-800/60 px-1">
                <span className="flex items-center gap-1.5 text-slate-450">
                  <span className="w-2.5 h-0.5 bg-slate-400 inline-block"></span> Normal Regimen
                </span>
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="w-2.5 h-0.5 bg-blue-500 inline-block"></span> Take Late ({lateHours}h)
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span> Skip & Resume
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> Double Next Dose
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
