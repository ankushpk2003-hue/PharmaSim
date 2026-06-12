import { Patient, DrugInfo, DoseLog, Prescription } from '../types';
import { DRUGS_DB } from './db';

export interface PKParameters {
  cl: number; // Adjusted Clearance (L/h)
  vd: number; // Adjusted Volume of Distribution (L)
  ke: number; // Elimination rate constant (1/h)
  halfLife: number; // Half-life (hours)
}

/**
 * Calculates personalized PK parameters based on patient demographics and drug info
 */
export const calculatePersonalizedPK = (patient: Patient, drugName: string): PKParameters => {
  const drug = DRUGS_DB[drugName] || DRUGS_DB['Gentamicin'];
  
  // 1. Calculate Volume of Distribution (Vd)
  // Scale with body weight (standard is 70kg)
  let vd = drug.vd * (patient.weight / 70);
  
  // Adjust for gender (females have lower body water fraction on average)
  if (patient.gender === 'Female') {
    vd *= 0.9;
  }
  
  // Ensure vd is not zero/negative
  vd = Math.max(5.0, vd);

  // 2. Calculate Clearance (Cl)
  // Define renal and hepatic fractions for the drug
  let f_r = 0.95; // Renal excretion fraction
  let f_h = 0.05; // Hepatic metabolism fraction

  if (drug.name === 'Gentamicin') {
    f_r = 0.98; f_h = 0.02;
  } else if (drug.name === 'Metformin') {
    f_r = 1.00; f_h = 0.00;
  } else if (drug.name === 'Lisinopril') {
    f_r = 0.95; f_h = 0.05;
  } else if (drug.name === 'Amoxicillin') {
    f_r = 0.90; f_h = 0.10;
  }

  // Renal scaling based on eGFR (normal is 100 mL/min)
  const kidneyScale = Math.min(1.2, patient.kidneyFunction / 100);
  const cl_r = drug.cl * f_r * kidneyScale;

  // Hepatic scaling based on Child-Pugh class
  let liverScale = 1.0;
  if (patient.liverFunction === 'Mild') liverScale = 0.85;
  else if (patient.liverFunction === 'Moderate') liverScale = 0.60;
  else if (patient.liverFunction === 'Severe') liverScale = 0.30;

  const cl_h = drug.cl * f_h * liverScale;

  // Total Clearance
  let cl = cl_r + cl_h;
  cl = Math.max(0.1, cl);

  // 3. Elimination Rate and Half-life
  const ke = cl / vd;
  const halfLife = 0.693 / ke;

  return { cl, vd, ke, halfLife };
};

/**
 * Calculates multiple-dose steady-state values
 */
export const calculateSteadyState = (
  dose: number,
  interval: number,
  pk: PKParameters
) => {
  const { vd, ke } = pk;
  const expTerm = Math.exp(-ke * interval);
  
  // Css,max = (D/Vd) / (1 - e^-ke*tau)
  const cssMax = vd > 0 && (1 - expTerm) > 0 ? (dose / vd) / (1 - expTerm) : 0;
  const cssMin = cssMax * expTerm;

  return { cssMax, cssMin };
};

/**
 * Predicts AI-recommended personalized dosage
 */
export interface AIDoseRecommendation {
  recommendedDose: number;
  recommendedInterval: number;
  cssMax: number;
  cssMin: number;
  explanation: string;
  isAdjusted: boolean;
}

export const getAIDosageRecommendation = (
  patient: Patient,
  drugName: string
): AIDoseRecommendation => {
  const drug = DRUGS_DB[drugName] || DRUGS_DB['Gentamicin'];
  const pk = calculatePersonalizedPK(patient, drugName);
  
  // Standard clinical default doses
  let defaultDose = 240; // mg
  let defaultInterval = 24; // hours
  
  if (drug.name === 'Gentamicin') {
    // 5 mg/kg once daily standard
    defaultDose = Math.round((5 * patient.weight) / 10) * 10;
    defaultInterval = 24;
  } else if (drug.name === 'Lisinopril') {
    defaultDose = 10;
    defaultInterval = 24;
  } else if (drug.name === 'Metformin') {
    defaultDose = 500;
    defaultInterval = 12;
  } else if (drug.name === 'Amoxicillin') {
    defaultDose = 500;
    defaultInterval = 8;
  }

  // Calculate concentration with standard regimen
  const stdKinetics = calculateSteadyState(defaultDose, defaultInterval, pk);

  let recommendedDose = defaultDose;
  let recommendedInterval = defaultInterval;
  let cssMax = stdKinetics.cssMax;
  let cssMin = stdKinetics.cssMin;
  let explanation = '';
  let isAdjusted = false;

  // AI Adjustment Rules based on Organ impairment
  if (drug.name === 'Gentamicin') {
    if (patient.kidneyFunction < 30) {
      // Severe renal: extend interval significantly and reduce dose
      recommendedDose = Math.round((3 * patient.weight) / 10) * 10; // 3 mg/kg
      recommendedInterval = 48; // every 48 hours
      isAdjusted = true;
      explanation = `AI recommendation: Severe kidney impairment detected (eGFR: ${patient.kidneyFunction} mL/min). Gentamicin is renally cleared and highly nephrotoxic. Extended dosing interval to 48 hours and reduced dose to ${recommendedDose} mg to prevent accumulation and ototoxicity.`;
    } else if (patient.kidneyFunction < 60) {
      // Moderate renal: reduce dose or extend interval
      recommendedDose = Math.round((3.5 * patient.weight) / 10) * 10;
      recommendedInterval = 24;
      isAdjusted = true;
      explanation = `AI recommendation: Moderate kidney impairment (eGFR: ${patient.kidneyFunction} mL/min). Lowered daily dose to ${recommendedDose} mg (q24h) to maintain steady-state peak below ${drug.toxicThreshold} mg/L and permit renal clearance.`;
    } else {
      explanation = `AI recommendation: Normal kidney function (eGFR: ${patient.kidneyFunction} mL/min). Standard Gentamicin high-dose once-daily therapy recommended (${recommendedDose} mg q24h).`;
    }
  } else if (drug.name === 'Metformin') {
    if (patient.kidneyFunction < 30) {
      recommendedDose = 0;
      recommendedInterval = 0;
      isAdjusted = true;
      explanation = `AI ALERT: Metformin is CONTRAINDICATED in severe renal impairment (eGFR: ${patient.kidneyFunction} < 30 mL/min) due to high risk of life-threatening Lactic Acidosis. Discontinue Metformin immediately and consider alternative diabetic treatment.`;
    } else if (patient.kidneyFunction < 45) {
      recommendedDose = 500;
      recommendedInterval = 24; // Reduce frequency
      isAdjusted = true;
      explanation = `AI recommendation: Stage 3b renal impairment (eGFR: ${patient.kidneyFunction} mL/min). Limit Metformin dose to maximum 500 mg daily (q24h) to avoid lactic acidosis risk. Monitor GFR quarterly.`;
    } else {
      explanation = `AI recommendation: Patient has adequate renal filtration (eGFR: ${patient.kidneyFunction} mL/min). Standard Metformin dosing is appropriate (${recommendedDose} mg twice daily).`;
    }
  } else if (drug.name === 'Lisinopril') {
    if (patient.kidneyFunction < 30) {
      recommendedDose = 2.5;
      recommendedInterval = 24;
      isAdjusted = true;
      explanation = `AI recommendation: Severe renal impairment (eGFR: ${patient.kidneyFunction} mL/min). Lisinopril excretion is slowed. Started at low dose (2.5 mg q24h) to prevent acute kidney injury, hyperkalemia, or profound hypotension.`;
    } else if (patient.kidneyFunction < 60) {
      recommendedDose = 5;
      recommendedInterval = 24;
      isAdjusted = true;
      explanation = `AI recommendation: Moderate renal impairment (eGFR: ${patient.kidneyFunction} mL/min). Reduced starting dose to 5 mg once daily to ensure safety. Monitor serum creatinine and potassium.`;
    } else {
      explanation = `AI recommendation: Standard starting dose of Lisinopril 10 mg daily is safe and effective based on organ function profile.`;
    }
  } else if (drug.name === 'Amoxicillin') {
    if (patient.kidneyFunction < 30) {
      recommendedDose = 500;
      recommendedInterval = 12; // Standard is q8h, make it q12h
      isAdjusted = true;
      explanation = `AI recommendation: Renal clearance is reduced (eGFR: ${patient.kidneyFunction} mL/min). Extended amoxicillin dosing interval to 12 hours (q12h) to avoid unnecessarily high serum peaks.`;
    } else {
      explanation = `AI recommendation: Normal clearance (eGFR: ${patient.kidneyFunction} mL/min). Standard dosing of 500 mg every 8 hours is optimal.`;
    }
  }

  // Recalculate steady state with recommended parameters
  if (recommendedDose > 0) {
    const recKinetics = calculateSteadyState(recommendedDose, recommendedInterval, pk);
    cssMax = recKinetics.cssMax;
    cssMin = recKinetics.cssMin;
  } else {
    cssMax = 0;
    cssMin = 0;
  }

  return {
    recommendedDose,
    recommendedInterval,
    cssMax,
    cssMin,
    explanation,
    isAdjusted
  };
};

/**
 * Simulates multiple bolus drug concentration data over 72 hours
 */
export interface ChartDataPoint {
  time: number;
  concentration: number;
  phase?: string; // mouth, stomach, intestine, blood, liver, kidney
}

export const generatePKTimeline = (
  dose: number,
  interval: number,
  pk: PKParameters,
  totalHours: number = 72
): ChartDataPoint[] => {
  const points: ChartDataPoint[] = [];
  const { vd, ke } = pk;
  
  if (vd <= 0 || ke <= 0) return [];

  for (let T = 0; T <= totalHours; T += 0.5) {
    const n = Math.floor(T / interval) + 1;
    const t = T - (n - 1) * interval;
    
    const expN = Math.exp(-n * ke * interval);
    const exp1 = Math.exp(-ke * interval);
    const expT = Math.exp(-ke * t);

    // C(t) = (D/Vd) * [(1 - e^-n*ke*tau) / (1 - e^-ke*tau)] * e^-ke*t
    const concentration = (dose / vd) * ((1 - expN) / (1 - exp1)) * expT;
    
    points.push({
      time: T,
      concentration: parseFloat(concentration.toFixed(3))
    });
  }

  return points;
};

/**
 * Generates missed dose comparison chart data
 * Generates a 36-hour timeline comparing:
 * 1. Skip: Dose missed at 12h, next dose taken at 24h.
 * 2. Take Late: Dose scheduled at 12h taken at 12+lateHours, next dose at 24h.
 * 3. Double Dose: Dose missed at 12h, double dose taken at 24h.
 */
export interface MissedDoseDataPoint {
  time: number;
  baseline: number; // Normal adherence
  skip: number; // Missed & skipped
  takeLate: number; // Missed but taken late
  doubleDose: number; // Missed, next dose doubled
}

export const simulateMissedDoseScenarios = (
  prescription: Prescription,
  pk: PKParameters,
  lateHours: number
): { data: MissedDoseDataPoint[]; recommendation: string; action: 'TAKE' | 'SKIP' | 'WAIT'; warning: string } => {
  const { dose, interval } = prescription;
  const { vd, ke } = pk;

  const data: MissedDoseDataPoint[] = [];
  const totalDuration = 36; // Simulate 36 hours (covering dose at 0, 12, 24, etc.)
  
  // Doses administered at:
  // Baseline: 0h, 12h, 24h
  // Skip: 0h, (12h missed), 24h
  // TakeLate: 0h, (12+lateHours), 24h
  // DoubleDose: 0h, (12h missed), 24h (double dose)

  const calcConc = (doses: { time: number; amt: number }[], currentTime: number) => {
    let sum = 0;
    for (const d of doses) {
      if (currentTime >= d.time) {
        const t = currentTime - d.time;
        // Simple IV bolus decay: C = (D/Vd) * e^-ke*t
        sum += (d.amt / vd) * Math.exp(-ke * t);
      }
    }
    return parseFloat(sum.toFixed(3));
  };

  const baselineDoses = [{ time: 0, amt: dose }, { time: interval, amt: dose }, { time: interval * 2, amt: dose }];
  const skipDoses = [{ time: 0, amt: dose }, { time: interval * 2, amt: dose }];
  const takeLateDoses = [{ time: 0, amt: dose }, { time: interval + lateHours, amt: dose }, { time: interval * 2, amt: dose }];
  const doubleDoses = [{ time: 0, amt: dose }, { time: interval * 2, amt: dose * 2 }];

  for (let T = 0; T <= totalDuration; T += 0.5) {
    data.push({
      time: T,
      baseline: calcConc(baselineDoses, T),
      skip: calcConc(skipDoses, T),
      takeLate: calcConc(takeLateDoses, T),
      doubleDose: calcConc(doubleDoses, T)
    });
  }

  // recommendation logic:
  const drugInfo = DRUGS_DB[prescription.drugName] || DRUGS_DB['Gentamicin'];
  const halfLife = pk.halfLife;
  
  let recommendation = '';
  let action: 'TAKE' | 'SKIP' | 'WAIT' = 'SKIP';
  const warning = 'CRITICAL SAFETY WARNING: Never take a double dose of your medication to make up for a missed one. Taking two doses at or near the same time can cause blood levels to spike dangerously into toxic ranges, potentially causing severe side effects, organ damage, or toxicity.';

  // Standard guideline: If you are late by less than 25% of the dosing interval, take it late. Otherwise, skip.
  const lateCutoff = interval * 0.25;

  if (lateHours <= lateCutoff) {
    action = 'TAKE';
    recommendation = `The dose was scheduled at 12:00, and you are ${lateHours} hour(s) late (which is less than the ${lateCutoff.toFixed(1)}h safety threshold). You should TAKE the missed dose now. Take your next scheduled dose at the normal time.`;
  } else if (lateHours > lateCutoff && lateHours < interval - 4) {
    action = 'SKIP';
    recommendation = `You are ${lateHours} hour(s) late for your dose. This is close to or past the halfway mark of your dosing cycle. You should SKIP the missed dose and wait for your next scheduled dose. Resume your regular dosing schedule. Do NOT take double to catch up.`;
  } else {
    action = 'WAIT';
    recommendation = `You are ${lateHours} hour(s) late, which is extremely close to your next scheduled dose (less than 4 hours away). Do NOT take the missed dose now. SKIP it entirely and WAIT to take your next scheduled dose at the normal time.`;
  }

  return { data, recommendation, action, warning };
};
