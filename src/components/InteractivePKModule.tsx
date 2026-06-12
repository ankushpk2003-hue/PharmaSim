import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Activity, ShieldAlert, Award, Compass, Heart, AlertCircle, Info, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Body3D from './Body3D';

interface OrganExplanation {
  name: string;
  process: string;
  role: string;
  details: string;
  parameter: string;
  formula: string;
}

const ORGANS_DB: Record<string, OrganExplanation> = {
  Mouth: {
    name: 'Mouth',
    process: 'Ingestion / Administration',
    role: 'Primary portal for swallowing oral pills.',
    details: 'Medicine capsule is ingested. The drug resides in its initial form, entering salivary dissolution pathways.',
    parameter: 'Dose: 500 mg',
    formula: 'Bioavailability (F) init'
  },
  Esophagus: {
    name: 'Esophagus',
    process: 'Esophageal Transit',
    role: 'Transport tube conveying pill to gastric cavity.',
    details: 'Peristaltic movements slide the pill downwards. Disintegration has not yet initiated; concentration remains zero.',
    parameter: 'Transit Time: ~6-10s',
    formula: 'Velocity (dx/dt)'
  },
  Stomach: {
    name: 'Stomach',
    process: 'Disintegration & Dissolution',
    role: 'Breakdown of capsule casing by gastric acids.',
    details: 'Acidic stomach environment (pH 1.5 - 2.5) dissolves gelatin, converting solid formulation into suspended drug molecules.',
    parameter: 'Gastric pH: 1.8',
    formula: 'Emptying Rate (ke_stomach)'
  },
  'Small Intestine': {
    name: 'Small Intestine',
    process: 'Intestinal Absorption (ADME - A)',
    role: 'Passage of drug molecules across membrane into portal vein.',
    details: 'Villi and microvilli absorb soluble molecules. Molecules diffuse into portal circulation, heading towards first-pass liver pathways.',
    parameter: 'Bioavailability (F): 80%',
    formula: 'Absorpt. Rate Constant (ka)'
  },
  Bloodstream: {
    name: 'Bloodstream',
    process: 'Circulatory Distribution (ADME - D)',
    role: 'Flow throughout blood plasma to trigger target receptors.',
    details: 'Drug is distributed systemic-wide. Molecules bind reversibly to plasma proteins (albumin). Only free molecules enter tissues.',
    parameter: 'Free Fraction: 55%',
    formula: 'Volume of Distribution (Vd)'
  },
  Liver: {
    name: 'Liver',
    process: 'Biotransformation / Metabolism (ADME - M)',
    role: 'Chemical modification of compound by CYP450 enzymes.',
    details: 'CYP455 enzyme cascades oxidize/conjugate drug fractions to convert them into water-soluble inactive metabolites for excretion.',
    parameter: 'Hepatic Clearance: 1.5 L/h',
    formula: 'Hepatic Extraction (Eh)'
  },
  Kidneys: {
    name: 'Kidneys',
    process: 'Renal Excretion (ADME - E)',
    role: 'Filtration and permanent elimination of waste in urine.',
    details: 'Nephrons filter blood plasma. Active drug and metabolites are cleared and excreted in urine. Strongly dictated by GFR.',
    parameter: 'Renal Clearance: 4.2 L/h',
    formula: 'GFR Filtration Rating'
  }
};

const NOTIFICATIONS: Record<string, string> = {
  Mouth: 'Medicine ingestion initiated. Capsule begins transit down the tract.',
  Esophagus: 'Capsule moves rapidly down the esophagus toward gastric entry.',
  Stomach: 'Medicine dissolves here before absorption begins.',
  'Small Intestine': 'Nearly 90% of the medicine is absorbed into the bloodstream.',
  Bloodstream: 'Drug is distributed through systemic plasma circulation to target receptor sites.',
  Liver: 'Drug metabolism occurs here through hepatic enzymes.',
  Kidneys: 'Drug is eliminated through renal excretion.'
};

const PHASES_HUD = [
  { name: 'Ingestion', range: [0, 14] },
  { name: 'Dissolution', range: [14, 28] },
  { name: 'Absorption', range: [28, 56] },
  { name: 'Distribution', range: [56, 70] },
  { name: 'Metabolism', range: [70, 85] },
  { name: 'Excretion', range: [85, 100] }
];

export default function InteractivePKModule() {
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  const [activeOrgan, setActiveOrgan] = useState<string | null>('Mouth');

  // Oral single-dose PK parameters (F, Dose, Vd, ka, ke)
  const F = 0.8;
  const Dose = 500;
  const Vd = 25;
  const ka = 0.75;
  
  // Healthy (keA) vs Kidney Disease (keB - reduced by 75%)
  const keA = 0.16;
  const keB = 0.04;

  const getConcentration = (t: number, keVal: number) => {
    if (t <= 0) return 0;
    return (F * Dose * ka) / (Vd * (ka - keVal)) * (Math.exp(-keVal * t) - Math.exp(-ka * t));
  };

  const generateChartData = () => {
    const data = [];
    for (let t = 0; t <= 24; t += 0.2) {
      data.push({
        time: parseFloat(t.toFixed(1)),
        concentrationA: parseFloat(getConcentration(t, keA).toFixed(2)),
        concentrationB: parseFloat(getConcentration(t, keB).toFixed(2))
      });
    }
    return data;
  };

  const chartData = generateChartData();
  const simulatedTime = parseFloat(((progress / 100) * 24).toFixed(1));
  
  const liveConcA = getConcentration(simulatedTime, keA);
  const liveConcB = getConcentration(simulatedTime, keB);

  // Sync active organ state automatically if playing
  useEffect(() => {
    if (!isPlaying) return;
    
    if (progress < 14) {
      setActiveOrgan('Mouth');
    } else if (progress < 28) {
      setActiveOrgan('Esophagus');
    } else if (progress < 42) {
      setActiveOrgan('Stomach');
    } else if (progress < 56) {
      setActiveOrgan('Small Intestine');
    } else if (progress < 70) {
      setActiveOrgan('Bloodstream');
    } else if (progress < 85) {
      setActiveOrgan('Liver');
    } else {
      setActiveOrgan('Kidneys');
    }
  }, [progress, isPlaying]);

  const handleOrganClick = (organName: string) => {
    setActiveOrgan(organName);
    setIsPlaying(false); // Pause on manual click

    if (organName === 'Mouth') setProgress(5);
    else if (organName === 'Esophagus') setProgress(20);
    else if (organName === 'Stomach') setProgress(35);
    else if (organName === 'Small Intestine') setProgress(48);
    else if (organName === 'Bloodstream') setProgress(62);
    else if (organName === 'Liver') setProgress(76);
    else if (organName === 'Kidneys') setProgress(92);
  };

  const activeOrganInfo = activeOrgan ? ORGANS_DB[activeOrgan] : ORGANS_DB['Mouth'];
  const organNotificationText = activeOrgan ? NOTIFICATIONS[activeOrgan] : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 animate-fade-in">
      
      {/* 1. Glassmorphic ADME Progress Header Track (col-span-12) */}
      <div className="lg:col-span-12 apple-glass rounded-3xl p-5 shadow-md relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white font-bold shadow-md shadow-blue-500/10">
            <Compass className="h-5 w-5 text-white animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">active ADME pipeline</h4>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-white tracking-tight mt-0.5">Drug Absorption & Elimination Progress</h3>
          </div>
        </div>

        {/* The Pipeline Segment Array */}
        <div className="w-full lg:w-auto flex-1 flex flex-wrap md:flex-nowrap items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-wider font-bold">
          {PHASES_HUD.map((p, idx) => {
            const rangeSize = 100 / PHASES_HUD.length;
            const activePhaseIdx = Math.min(PHASES_HUD.length - 1, Math.floor(progress / rangeSize));
            const isCurrent = idx === activePhaseIdx;
            const isCompleted = idx < activePhaseIdx;
            
            return (
              <div
                key={p.name}
                className={`flex-grow flex items-center justify-between px-3 py-2 border rounded-xl transition-all duration-300 ${
                  isCurrent 
                    ? `bg-blue-500/10 dark:bg-blue-500/5 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]`
                    : isCompleted
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80 text-slate-400 dark:text-slate-500'
                }`}
              >
                <span>{p.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isCurrent ? 'bg-blue-500 dark:bg-blue-400 animate-pulse' : isCompleted ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
                }`}></span>
              </div>
            );
          })}
        </div>

        {/* Compare Patients Button */}
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border-none shadow-md ${
            compareMode 
              ? 'bg-gradient-to-r from-rose-500 to-red-650 text-white shadow-rose-500/20'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{compareMode ? 'Exit Comparison' : 'Compare Patients'}</span>
        </button>
      </div>

      {/* 2. Left Panel: SVG Pathways (changes dynamically in Compare Mode) (col-span-7) */}
      <div className="lg:col-span-7 flex flex-col justify-between gap-4">
        {compareMode ? (
          /* SIDE-BY-SIDE PATHWAYS */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            {/* Patient A: Healthy */}
            <div className="google-card p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/25 dark:border-blue-800/40 px-2.5 py-0.5 rounded-full font-mono">
                  Patient A: Healthy Kidney
                </span>
                <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 font-mono">Normal excretion, low toxicity risk</p>
              </div>

              <div className="relative border border-slate-100 dark:border-slate-850/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden flex-1 h-[340px] flex items-center justify-center my-4">
                <Body3D
                  isPlaying={isPlaying}
                  progress={progress}
                  speed={speed}
                  activeOrgan={activeOrgan}
                  onOrganClick={handleOrganClick}
                  onProgressUpdate={setProgress}
                  hideHUD={true}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850/80 text-[11px] leading-relaxed">
                <strong className="text-slate-900 dark:text-white font-bold block uppercase tracking-wider text-[9px] text-blue-500 dark:text-blue-400">Normal Excretion Profile</strong>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Drug is eliminated efficiently through kidneys. Trough levels clear normally back into target baseline within scheduled intervals.
                </p>
              </div>
            </div>

            {/* Patient B: Kidney Disease */}
            <div className="google-card p-5 border-rose-500/20 dark:border-rose-500/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div>
                <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-widest bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/25 dark:border-rose-800/40 px-2.5 py-0.5 rounded-full font-mono">
                  Patient B: Kidney Disease
                </span>
                <p className="text-[9px] text-rose-455 dark:text-rose-400 mt-1 font-mono">Reduced clearance, active accumulation</p>
              </div>

              <div className="relative border border-rose-500/15 dark:border-rose-500/10 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden flex-1 h-[340px] flex items-center justify-center my-4">
                <Body3D
                  isPlaying={isPlaying}
                  progress={progress}
                  speed={speed}
                  activeOrgan={activeOrgan}
                  onOrganClick={handleOrganClick}
                  onProgressUpdate={setProgress}
                  hideHUD={true}
                />
              </div>

              {/* Red Toxicity Warning Callout */}
              <div className="bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20 text-[11px] leading-relaxed text-rose-600 dark:text-rose-400">
                <strong className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[9px]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Higher Toxicity Risk</span>
                </strong>
                <p className="text-rose-600/90 dark:text-rose-300 mt-1 font-medium">
                  Renal clearance is reduced by 75%. Drug remains in circulation longer, keeping concentrations toxic. <strong>AI recommends reducing the dose immediately.</strong>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* SINGLE DETAILED PATHWAY PANEL */
          <div className="google-card p-6 flex flex-col justify-between relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative border border-slate-100 dark:border-slate-850/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden flex-1 h-[420px] flex items-center justify-center">
              <Body3D
                isPlaying={isPlaying}
                progress={progress}
                speed={speed}
                activeOrgan={activeOrgan}
                onOrganClick={handleOrganClick}
                onProgressUpdate={setProgress}
              />

              {/* Floating Active Notification Overlay */}
              {activeOrgan && (
                <div 
                  key={activeOrgan}
                  className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border border-blue-500/30 p-4 rounded-xl flex items-start gap-3 shadow-xl shadow-blue-500/5 animate-slide-in transition-all duration-300"
                >
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                    <Heart className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 tracking-widest font-mono uppercase">{activeOrgan} Reach Telemetry</h4>
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-mono border border-blue-500/20 rounded">Active</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-white font-bold mt-1.5 leading-snug">
                      {organNotificationText}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global HUD control bar */}
        <div className="bg-white/80 dark:bg-slate-950/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:flex-1 flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono w-8">0.0h</span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max="99"
                value={Math.floor(progress)}
                onChange={(e) => {
                  setProgress(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div 
                className="absolute h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono w-14 text-right">
              {simulatedTime} hrs
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-xl text-white font-extrabold transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer ${
                isPlaying ? 'bg-blue-650 hover:bg-blue-600 shadow-blue-500/10' : 'bg-emerald-600 hover:bg-emerald-505 shadow-emerald-500/10'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pause' : 'Start Simulation'}</span>
            </button>
            <button
              onClick={() => {
                setProgress(0);
                setIsPlaying(false);
              }}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1.5 text-[9px] font-extrabold rounded-lg font-mono transition-all border-none cursor-pointer ${
                    speed === s
                      ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT COLUMN: JARVIS AI Telemetry Panel (col-span-5) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Telemetry panel */}
        <div className="apple-glass p-6 rounded-3xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          <div className="absolute inset-0 border border-blue-500/5 rounded-3xl pointer-events-none"></div>

          <div className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 animate-pulse">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-sm tracking-tight uppercase">AI Diagnostic Telemetry</h4>
                  <p className="text-[8px] font-bold text-blue-500 dark:text-blue-400 font-mono tracking-widest uppercase mt-0.5">Live Twin Readout</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 my-3.5">
              <div className="bg-slate-50 dark:bg-slate-950/65 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Current Organ</span>
                <span className="text-sm text-slate-800 dark:text-white font-extrabold block mt-0.5 tracking-tight uppercase">
                  {activeOrganInfo.name}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/65 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Current Process</span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-bold block mt-0.5 truncate uppercase">
                  {activeOrganInfo.process}
                </span>
              </div>

              {/* Toggle values based on single vs compare mode */}
              <div className="bg-slate-50 dark:bg-slate-950/65 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                  {compareMode ? 'Conc (A / B)' : 'Drug Concentration'}
                </span>
                <span className="text-xs sm:text-sm text-slate-850 dark:text-white font-extrabold block mt-0.5 tracking-tight font-mono">
                  {compareMode 
                    ? `${liveConcA.toFixed(1)} / ${liveConcB.toFixed(1)} mg/L`
                    : `${liveConcA.toFixed(2)} mg/L`
                  }
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/65 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
                  {compareMode ? 'Half Life (A / B)' : 'Half Life (t1/2)'}
                </span>
                <span className="text-xs sm:text-sm text-slate-855 dark:text-white font-extrabold block mt-0.5 tracking-tight font-mono">
                  {compareMode ? '4.3h / 17.3h' : '4.3 hrs'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/65 col-span-2 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">Therapeutic Range</span>
                  <span className="text-xs text-slate-800 dark:text-white font-bold block mt-0.5 font-mono">
                    2.0 - 10.0 <span className="text-[10px] text-slate-500 font-normal">mg/L</span>
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold ${
                  liveConcA > 10.0 || (compareMode && liveConcB > 10.0)
                    ? 'bg-red-500/10 text-red-500 border border-red-500/25'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                }`}>
                  {liveConcA > 10.0 || (compareMode && liveConcB > 10.0) ? 'TOXICITY RISK' : 'SAFE REGIMEN'}
                </span>
              </div>
            </div>

            {/* Organ Narrative Details */}
            <div className="bg-slate-50 dark:bg-slate-950/65 p-3.5 rounded-xl border border-slate-200/40 dark:border-slate-855">
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 font-mono">Active Tissue Mechanics</span>
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                {activeOrganInfo.details}
              </p>
            </div>
          </div>
        </div>

        {/* Live Concentration graph below */}
        <div className="google-card p-6 relative">
          <div className="absolute inset-0 border border-blue-500/5 rounded-3xl pointer-events-none"></div>

          <div>
            <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-widest font-mono">Live Simulation sweeps</span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight mt-0.5">
              {compareMode ? 'Kinetics Comparison (Healthy vs Renal)' : 'Concentration vs Time (24h Oral cycle)'}
            </h4>
          </div>

          <div className="h-44 w-full mt-4 bg-slate-50/50 dark:bg-slate-950/30 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-850/60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="neonGlowGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="neonGlowGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} dark={{ stroke: '#1e293b' }} vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={8}
                  fontFamily="monospace"
                  unit="h"
                  ticks={[0, 4, 8, 12, 16, 20, 24]}
                />
                <YAxis stroke="#64748b" fontSize={8} fontFamily="monospace" unit=" mg/L" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-[9px] font-mono shadow-lg space-y-0.5">
                          <p className="text-slate-500">Time: <span className="text-slate-800 dark:text-white font-bold">{payload[0].payload.time}h</span></p>
                          <p className="text-blue-600 dark:text-blue-400">Patient A (Healthy): <span className="font-bold">{payload[0].payload.concentrationA} mg/L</span></p>
                          {compareMode && (
                            <p className="text-rose-500">Patient B (Renal): <span className="font-bold">{payload[0].payload.concentrationB} mg/L</span></p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                <ReferenceLine 
                  x={simulatedTime} 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  label={{ value: 'SWEEPS', fill: '#3b82f6', fontSize: 7, fontWeight: 'bold', position: 'top', className: 'font-mono' }} 
                />

                {/* Patient A area */}
                <Area
                  type="monotone"
                  dataKey="concentrationA"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#neonGlowGradA)"
                />

                {/* Patient B area (grows flat and stays elevated in Compare Mode) */}
                {compareMode && (
                  <Area
                    type="monotone"
                    dataKey="concentrationB"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#neonGlowGradB)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-[8px] text-slate-450 dark:text-slate-500 font-mono mt-2 px-1 uppercase tracking-wider font-bold">
            {compareMode ? (
              <>
                <span className="text-blue-500 dark:text-blue-400">Blue: Normal Elimination</span>
                <span className="text-rose-500">Rose: Renal Disease Accumulation</span>
              </>
            ) : (
              <>
                <span>Absorption Peak (~4h)</span>
                <span>Excretion Decay</span>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
