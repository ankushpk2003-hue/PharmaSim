import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Award, Calendar, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Patient, DoseLog } from '../types';
import { getPatients } from '../services/db';
import { calculatePersonalizedPK } from '../services/pkModel';

export default function DoctorAnalytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    const pts = getPatients();
    setPatients(pts);
    if (pts.length > 0) {
      setSelectedPatientId(pts[0].id);
    }
  }, []);

  const activePatient = patients.find(p => p.id === selectedPatientId);

  // Clinic-wide aggregates
  const totalPatientsCount = patients.length;
  const highRiskCount = patients.filter(p => p.riskScore >= 50).length;
  
  const calculateClinicAdherence = () => {
    if (patients.length === 0) return 100;
    const totalLogs = patients.reduce((acc, p) => acc + p.adherenceHistory.length, 0);
    if (totalLogs === 0) return 100;
    const totalTaken = patients.reduce(
      (acc, p) => acc + p.adherenceHistory.filter(h => h.status === 'Taken' || h.status === 'Delayed').length, 0
    );
    return Math.round((totalTaken / totalLogs) * 100);
  };

  const avgAdherence = calculateClinicAdherence();

  // --- Pharmacokinetic Superposition Model based on compliance logs ---
  const generateCompliancePKData = (patient: Patient) => {
    const rx = patient.prescriptions[0];
    if (!rx) return [];

    const pk = calculatePersonalizedPK(patient, rx.drugName);
    const { vd, ke } = pk;
    
    // We map a 72-hour timeline from -72h (past) to 0h (now)
    // Assume doses are scheduled at: -72h, -48h, -24h, 0h (based on a 24h interval, or adjusted for interval)
    const interval = rx.interval;
    const doseTimes: { time: number; amt: number }[] = [];

    // Let's identify the dose schedule over the last 3 days
    const totalSimHours = 72;
    const steps = Math.floor(totalSimHours / interval);

    // Doses are scheduled at T = totalSimHours - i * interval
    // For i from steps down to 0:
    for (let i = steps; i >= 0; i--) {
      const scheduledTimeFromStart = totalSimHours - i * interval; // relative to start (0h is start, 72h is now)
      
      // Let's match this scheduled dose to the logs
      // Doses are ordered chronologically: log[0] corresponds to the first dose, log[1] to the second, etc.
      // We map the i-th scheduled dose to log[steps - i]
      const logIdx = steps - i;
      const log = patient.adherenceHistory[logIdx];

      if (log) {
        if (log.status === 'Taken') {
          // Taken at scheduled time
          doseTimes.push({ time: scheduledTimeFromStart, amt: rx.dose });
        } else if (log.status === 'Delayed') {
          // Taken late by delayHours
          const actualTime = scheduledTimeFromStart + (log.delayHours || 0);
          doseTimes.push({ time: actualTime, amt: rx.dose });
        } else if (log.status === 'Missed') {
          // Missed dose: do not add a dose peak!
        }
      } else {
        // Fallback: If no logs recorded yet, assume it was taken on schedule
        doseTimes.push({ time: scheduledTimeFromStart, amt: rx.dose });
      }
    }

    // Now compute concentration at each 0.5 hour step from 0h (start) to 72h (now)
    const points = [];
    for (let T = 0; T <= totalSimHours; T += 0.5) {
      let conc = 0;
      for (const d of doseTimes) {
        if (T >= d.time) {
          const t = T - d.time;
          conc += (d.amt / vd) * Math.exp(-ke * t);
        }
      }
      
      // Display time relative to "now" (e.g. -72h to 0h)
      const relativeTime = T - totalSimHours;

      points.push({
        time: relativeTime,
        concentration: parseFloat(conc.toFixed(2))
      });
    }

    return points;
  };

  const chartData = activePatient ? generateCompliancePKData(activePatient) : [];
  const activeRx = activePatient?.prescriptions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 animate-fade-in">
      {/* Clinic aggregate widgets (col-span-12) */}
      <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Agg 1 */}
        <div className="google-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Patients Monitored</span>
            <strong className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">{totalPatientsCount}</strong>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Activity className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Agg 2 */}
        <div className="google-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Clinic Adherence Avg</span>
            <strong className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">{avgAdherence}%</strong>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Award className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Agg 3 */}
        <div className="google-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Patients At Risk</span>
            <strong className="text-2xl font-extrabold text-rose-500 mt-1 block">{highRiskCount}</strong>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
            <ShieldAlert className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Agg 4 */}
        <div className="google-card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">TDM Active Audits</span>
            <strong className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
              {patients.filter(p => p.prescriptions.some(r => r.drugName === 'Gentamicin')).length}
            </strong>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* LEFT COLUMN: Patient compliance selection (col-span-4) */}
      <div className="google-card lg:col-span-4 p-5 max-h-[600px] overflow-hidden flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-md">Compliance Roster</h3>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">Select Patient for Analytics</p>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-1.5 dark-scroll">
          {patients.map(p => {
            const isSelected = p.id === selectedPatientId;
            const takenCount = p.adherenceHistory.filter(h => h.status === 'Taken' || h.status === 'Delayed').length;
            const adherence = p.adherenceHistory.length > 0 ? Math.round((takenCount / p.adherenceHistory.length) * 100) : 100;
            const isHighRisk = p.riskScore >= 50;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-800 shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-950 dark:hover:bg-slate-900/60 border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-350'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono">
                    <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>ID: {p.id}</span>
                    <span>•</span>
                    <span className={isHighRisk ? 'text-rose-400 font-bold' : 'text-emerald-450'}>Risk: {p.riskScore}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    adherence >= 90 ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                    adherence >= 75 ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    'bg-rose-500/20 text-rose-500 border-rose-500/30'
                  }`}>
                    {adherence}% Adh
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Charts & Timeline (col-span-8) */}
      <div className="google-card lg:col-span-8 p-6 space-y-6 relative overflow-hidden">
        {activePatient && activeRx ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-md">Clinical Twin Analytics Dashboard</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inspecting: <strong>{activePatient.name}</strong> ({activeRx.drugName})</p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${
                  activePatient.riskScore >= 50
                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                }`}>
                  Risk Score: {activePatient.riskScore}
                </span>
              </div>
            </div>

            {/* Simulated historical blood concentration profile */}
            <div className="space-y-3.5">
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-blue-650 dark:text-blue-400" />
                  <span>Interactive 3-Day Estimated Blood Concentration (TDM)</span>
                </h4>
                <p className="text-[10px] text-slate-550 dark:text-slate-450 leading-relaxed mt-0.5">
                  This simulated PK profile is calculated in real-time based on the patient's actual compliance logs. Notice concentration dropouts (sub-therapeutic zones) during missed doses or late shifts.
                </p>
              </div>

              {/* Concentration graph */}
              <div className="h-56 w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-850/60 rounded-2xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glowColor2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={9}
                      fontFamily="monospace"
                      unit="h"
                      ticks={[-72, -60, -48, -36, -24, -12, 0]}
                    />
                    <YAxis stroke="#64748b" fontSize={9} fontFamily="monospace" unit=" mg/L" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-xl text-[10px] font-mono">
                              <p className="text-slate-500 font-sans">Hours ago: <span className="text-slate-800 dark:text-white font-bold">{payload[0].payload.time}h</span></p>
                              <p className="text-slate-500 font-sans font-bold">Concentration: <span className="text-blue-600 dark:text-blue-400 font-bold">{payload[0].value} mg/L</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Reference Lines */}
                    <ReferenceLine y={activeRx.toxicThreshold} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Toxicity Threshold', fill: '#dc2626', fontSize: 7, position: 'insideTopLeft' }} />
                    <ReferenceLine y={activeRx.mec} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'MEC Line', fill: '#10b981', fontSize: 7, position: 'insideBottomLeft' }} />
                    <ReferenceLine x={0} stroke="#64748b" strokeDasharray="2 2" strokeWidth={1} />
                    
                    <Area
                      type="monotone"
                      dataKey="concentration"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#glowColor2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Missed-dose History Timeline */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-200/40 dark:border-slate-850 pb-1">
                Recent Adherence Log timeline
              </span>

              {activePatient.adherenceHistory.length === 0 ? (
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl text-xs text-slate-500">
                  No logs recorded for this patient. Switch to the Patient Portal to log daily doses.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePatient.adherenceHistory.map((log) => {
                    return (
                      <div
                        key={log.id}
                        className="bg-slate-50 dark:bg-slate-950/45 p-3 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${
                            log.status === 'Taken' ? 'bg-emerald-500/10 text-emerald-500' :
                            log.status === 'Delayed' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {log.status === 'Taken' && <CheckCircle2 className="h-4 w-4" />}
                            {log.status === 'Delayed' && <Clock className="h-4 w-4" />}
                            {log.status === 'Missed' && <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200 block font-bold">{log.scheduledTime} Dose</strong>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450 font-sans">
                              Logged on: {new Date(log.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg ${
                          log.status === 'Taken' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          log.status === 'Delayed' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {log.status} {log.delayHours ? `(+${log.delayHours}h)` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Treatment Timeline Card */}
            <div className="bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 space-y-3 text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-200/40 dark:border-slate-850 pb-1 font-mono">
                Treatment milestones
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-450 block mb-0.5 font-sans">Dose Schedule Coverage</span>
                  <strong className="text-slate-900 dark:text-white text-sm">
                    {activePatient.adherenceHistory.length} Doses Logged
                  </strong>
                </div>
                <div>
                  <span className="text-slate-450 block mb-0.5 font-sans">Simulation Horizon</span>
                  <strong className="text-slate-900 dark:text-white text-sm">
                    Last 72 Hours (Superposition View)
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <AlertTriangle className="h-10 w-10 text-slate-350 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold">Select a Patient</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a patient from the compliance roster to view their historical TDM charts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
