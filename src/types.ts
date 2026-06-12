export interface DoseLog {
  id: string;
  status: 'Taken' | 'Missed' | 'Delayed';
  timestamp: string; // ISO string representing the action time
  scheduledTime: string; // e.g. "08:00 AM", "08:00 PM"
  delayHours?: number; // How late the dose was taken
}

export interface Prescription {
  id: string;
  drugName: string;
  dose: number; // in mg
  interval: number; // in hours (tau)
  mec: number; // minimum effective concentration in mg/L
  toxicThreshold: number; // toxic threshold in mg/L
  startDate: string; // ISO date string
  endDate?: string;
  instructions: string;
}

export interface Patient {
  id: string; // e.g., PAT-001
  name: string;
  age: number;
  weight: number;
  gender: 'Male' | 'Female' | 'Other';
  kidneyFunction: number; // eGFR in mL/min
  liverFunction: 'Normal' | 'Mild' | 'Moderate' | 'Severe'; // Child-Pugh metabolic classification
  disease: string;
  prescriptions: Prescription[];
  adherenceHistory: DoseLog[];
  clinicalNotes?: string;
  createdAt: string;
  riskScore: number; // Dynamic or computed 0-100 score
}

export interface DrugInfo {
  name: string;
  halfLife: number; // hours
  vd: number; // Volume of distribution (L)
  cl: number; // Clearance (L/h)
  mec: number; // mg/L
  toxicThreshold: number; // mg/L
  commonUses: string;
  dosingRules: string;
}
