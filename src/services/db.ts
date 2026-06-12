import { Patient, DrugInfo, DoseLog, Prescription } from '../types';

export const DRUGS_DB: Record<string, DrugInfo> = {
  Gentamicin: {
    name: 'Gentamicin',
    halfLife: 2.5, // Standard half-life in hours
    vd: 20, // Volume of distribution (L)
    cl: 5.5, // Clearance (L/h)
    mec: 2.0, // Minimum effective concentration (mg/L)
    toxicThreshold: 10.0, // Toxic threshold (mg/L)
    commonUses: 'Severe Gram-negative bacterial infections, endocarditis.',
    dosingRules: 'Requires therapeutic drug monitoring (TDM). Clearance depends heavily on glomerular filtration rate (GFR). For renal dysfunction, reduce dose or extend dosing interval (e.g. from q12h to q24h or q48h).'
  },
  Lisinopril: {
    name: 'Lisinopril',
    halfLife: 12.0,
    vd: 70,
    cl: 4.0,
    mec: 0.1,
    toxicThreshold: 0.8,
    commonUses: 'Hypertension, congestive heart failure, post-myocardial infarction.',
    dosingRules: 'ACE Inhibitor. Excreted unchanged in urine. Monitor potassium levels and kidney function closely. In elderly or renal patients, start with a lower dose (e.g., 2.5-5mg instead of 10-20mg).'
  },
  Metformin: {
    name: 'Metformin',
    halfLife: 6.2,
    vd: 120,
    cl: 15.0,
    mec: 0.8,
    toxicThreshold: 4.0,
    commonUses: 'Type 2 Diabetes Mellitus.',
    dosingRules: 'Renally cleared. Contraindicated in severe renal impairment (eGFR < 30 mL/min) due to risk of lactic acidosis. Adjust dose if eGFR is 30-45 mL/min.'
  },
  Amoxicillin: {
    name: 'Amoxicillin',
    halfLife: 1.0,
    vd: 25,
    cl: 18.0,
    mec: 4.0,
    toxicThreshold: 30.0,
    commonUses: 'Respiratory tract infections, otitis media, skin infections.',
    dosingRules: 'Wide therapeutic index. High clearance rate. If renal impairment is severe (CrCl < 10 mL/min), increase interval to q12h or q24h instead of standard q8h.'
  }
};

const SEED_PATIENTS: Patient[] = [
  {
    id: 'PAT-881',
    name: 'Emily Chen',
    age: 28,
    weight: 58,
    gender: 'Female',
    kidneyFunction: 110, // Normal eGFR
    liverFunction: 'Normal',
    disease: 'Pyelonephritis (UTI)',
    prescriptions: [
      {
        id: 'rx-101',
        drugName: 'Gentamicin',
        dose: 240,
        interval: 24,
        mec: 2.0,
        toxicThreshold: 10.0,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        instructions: 'Take 240 mg intravenously once daily.'
      }
    ],
    adherenceHistory: [
      { id: 'log-1', status: 'Taken', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 AM' },
      { id: 'log-2', status: 'Taken', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 AM' },
      { id: 'log-3', status: 'Taken', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 AM' }
    ],
    clinicalNotes: 'Young adult patient presenting with acute pyelonephritis. Kidney and hepatic profiles are excellent. Prescribed once-daily high-dose Gentamicin. Adherence is 100%. Dynamic PK forecast shows therapeutic levels are optimal.',
    riskScore: 5,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'PAT-402',
    name: 'Marcus Vance',
    age: 74,
    weight: 82,
    gender: 'Male',
    kidneyFunction: 32, // Moderate Renal Impairment
    liverFunction: 'Normal',
    disease: 'Infective Endocarditis',
    prescriptions: [
      {
        id: 'rx-102',
        drugName: 'Gentamicin',
        dose: 80, // Lower dose for renal
        interval: 12, // More frequent, check kinetics
        mec: 2.0,
        toxicThreshold: 10.0,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        instructions: 'Take 80 mg intravenously every 12 hours.'
      }
    ],
    adherenceHistory: [
      { id: 'log-4', status: 'Taken', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 AM' },
      { id: 'log-5', status: 'Delayed', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 PM', delayHours: 3 }, // taken late
      { id: 'log-6', status: 'Taken', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 AM' },
      { id: 'log-7', status: 'Missed', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000).toISOString(), scheduledTime: '08:00 PM' } // missed
    ],
    clinicalNotes: 'Geriatric patient with infective endocarditis and stage 3 chronic kidney disease (eGFR 32). Gentamicin clearance is compromised. Dosing interval set at 12 hours but requires active TDM. Adherence rate is lagging (75%), elevating accumulation risks.',
    riskScore: 48,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'PAT-709',
    name: 'Elena Rostova',
    age: 52,
    weight: 68,
    gender: 'Female',
    kidneyFunction: 92,
    liverFunction: 'Severe', // Liver dysfunction
    disease: 'Hypertension & Portal Congestion',
    prescriptions: [
      {
        id: 'rx-103',
        drugName: 'Lisinopril',
        dose: 10,
        interval: 24,
        mec: 0.1,
        toxicThreshold: 0.8,
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        instructions: 'Take 10 mg orally once daily.'
      }
    ],
    adherenceHistory: [
      { id: 'log-8', status: 'Taken', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), scheduledTime: '09:00 AM' },
      { id: 'log-9', status: 'Missed', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), scheduledTime: '09:00 AM' },
      { id: 'log-10', status: 'Taken', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), scheduledTime: '09:00 AM' },
      { id: 'log-11', status: 'Missed', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), scheduledTime: '09:00 AM' }
    ],
    clinicalNotes: 'Patient presenting with hypertension associated with advanced liver cirrhosis. Excretion is renal (satisfactory), but hepatic synthesis of clotting factors and metabolism of co-medications are severely impaired. Adherence is poor at 50%. Patient exhibits high blood pressure variability.',
    riskScore: 72,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const getPatients = (): Patient[] => {
  const data = localStorage.getItem('pharmatwin_patients');
  if (!data) {
    localStorage.setItem('pharmatwin_patients', JSON.stringify(SEED_PATIENTS));
    return SEED_PATIENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_PATIENTS;
  }
};

export const savePatient = (patient: Patient): void => {
  const patients = getPatients();
  const index = patients.findIndex((p) => p.id === patient.id);
  if (index !== -1) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  localStorage.setItem('pharmatwin_patients', JSON.stringify(patients));
};

export const deletePatient = (id: string): void => {
  const patients = getPatients();
  const updated = patients.filter((p) => p.id !== id);
  localStorage.setItem('pharmatwin_patients', JSON.stringify(updated));
};

export const calculateAdherence = (history: DoseLog[]): number => {
  if (history.length === 0) return 100;
  const takenCount = history.filter((log) => log.status === 'Taken' || log.status === 'Delayed').length;
  return Math.round((takenCount / history.length) * 100);
};

export const calculateRiskScore = (patient: Patient): number => {
  const adherence = calculateAdherence(patient.adherenceHistory);
  
  // Base risk starts from non-compliance
  let risk = (100 - adherence) * 0.6; // e.g. 50% adherence adds 30 risk points
  
  // Renal function impact
  if (patient.kidneyFunction < 30) {
    risk += 25; // Severe renal impairment is high risk
  } else if (patient.kidneyFunction < 60) {
    risk += 15; // Moderate renal impairment
  }

  // Liver function impact
  if (patient.liverFunction === 'Severe') {
    risk += 20;
  } else if (patient.liverFunction === 'Moderate') {
    risk += 10;
  }

  // Active sensitive medication check (e.g. Gentamicin is high-risk)
  const hasGentamicin = patient.prescriptions.some(
    (rx) => rx.drugName.toLowerCase() === 'gentamicin'
  );
  if (hasGentamicin && (patient.kidneyFunction < 60 || patient.liverFunction !== 'Normal')) {
    risk += 15; // Aminoglycoside + organ dysfunction = extra high risk
  }

  // Clamp risk score to [0, 100]
  return Math.min(100, Math.max(0, Math.round(risk)));
};

export const addDoseLog = (patientId: string, log: Omit<DoseLog, 'id'>): Patient | null => {
  const patients = getPatients();
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return null;

  const newLog: DoseLog = {
    ...log,
    id: `log-${Date.now()}`
  };

  patient.adherenceHistory.push(newLog);
  patient.riskScore = calculateRiskScore(patient);
  savePatient(patient);
  return patient;
};
