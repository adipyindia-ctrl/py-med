export type ConversationState =
  | 'INIT'
  | 'COLLECTING_NAME'
  | 'COLLECTING_AGE'
  | 'COLLECTING_GENDER'
  | 'COLLECTING_SYMPTOMS_DURATION'
  | 'COLLECTING_ALLERGIES'
  | 'COLLECTING_CURRENT_MEDICINES'
  | 'COLLECTING_SYMPTOMS'
  | 'SAFETY_SCREENING'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_DONE'
  | 'COMPLETED';

export type ConsultationStatus =
  | 'PENDING'
  | 'PAID'
  | 'IN_REVIEW'
  | 'PRESCRIPTION_READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EMERGENCY';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: number;
  gender?: Gender;
  allergies?: string;
  currentMedicines?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation {
  id: string;
  patientId: string;
  patient?: Patient;
  voiceTranscript?: string;
  symptoms: string[];
  symptomsDuration?: string;
  aiSummary?: string;
  urgencyLevel: UrgencyLevel;
  status: ConsultationStatus;
  conversationState: ConversationState;
  conversationHistory: ConversationMessage[];
  payment?: Payment;
  prescription?: Prescription;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: 'bot' | 'patient';
  message: string;
  timestamp: Date;
}

export interface Payment {
  id: string;
  consultationId: string;
  amount: number;
  currency: string;
  cashfreeOrderId: string;
  cashfreePaymentId?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  consultationId: string;
  doctorId: string;
  doctor?: Doctor;
  diagnosis: string;
  medicines: Medicine[];
  investigations?: string[];
  followUpInstructions?: string;
  followUpDate?: Date;
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  qualification: string;
  registrationNumber: string;
  specialization?: string;
  phone?: string;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppMessage {
  from: string;
  type: 'text' | 'audio' | 'image' | 'document';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  timestamp: string;
  id: string;
}

export interface SafetyScreenResult {
  urgencyLevel: UrgencyLevel;
  isEmergency: boolean;
  emergencySymptoms: string[];
  recommendation: string;
}

export interface DashboardStats {
  totalConsultations: number;
  pendingConsultations: number;
  completedToday: number;
  totalRevenue: number;
  emergencyCases: number;
}
