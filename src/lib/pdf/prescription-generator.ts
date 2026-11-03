import { formatDateShort } from '@/lib/utils';
import type { Medicine } from '@/types';

export interface PrescriptionData {
  prescriptionId: string;
  doctor: {
    name: string;
    qualification: string;
    registrationNumber: string;
    specialization?: string;
  };
  patient: {
    name: string;
    age?: number;
    gender?: string;
    phone: string;
  };
  diagnosis: string;
  medicines: Medicine[];
  investigations?: string[];
  followUpInstructions?: string;
  followUpDate?: Date;
  notes?: string;
  createdAt: Date;
}

export async function generatePrescriptionHTML(data: PrescriptionData): Promise<string> {
  const medicinesRows = data.medicines
    .map(
      (m, i) => `
      <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
        <td class="px-4 py-3 font-medium text-gray-900">${m.name}</td>
        <td class="px-4 py-3 text-gray-700">${m.dosage}</td>
        <td class="px-4 py-3 text-gray-700">${m.frequency}</td>
        <td class="px-4 py-3 text-gray-700">${m.duration}</td>
        <td class="px-4 py-3 text-gray-600 text-sm">${m.instructions ?? '-'}</td>
      </tr>`,
    )
    .join('');

  const investigationsSection = data.investigations?.length
    ? `<div class="mt-4">
        <h3 class="text-sm font-semibold text-gray-700 uppercase mb-2">Investigations</h3>
        <ul class="list-disc list-inside text-gray-700">
          ${data.investigations.map((inv) => `<li>${inv}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const followUpSection = data.followUpDate
    ? `<div class="mt-4 p-3 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-800"><strong>Follow-up:</strong> ${formatDateShort(data.followUpDate)}</p>
        ${data.followUpInstructions ? `<p class="text-sm text-blue-700 mt-1">${data.followUpInstructions}</p>` : ''}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prescription - ${data.prescriptionId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: white; }
    .container { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo-section h1 { font-size: 24px; font-weight: 700; color: #2563eb; }
    .logo-section p { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .doctor-info { text-align: right; }
    .doctor-info h2 { font-size: 16px; font-weight: 600; color: #1f2937; }
    .doctor-info p { font-size: 12px; color: #6b7280; }
    .rx-symbol { font-size: 40px; font-weight: 700; color: #2563eb; opacity: 0.3; }
    .patient-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .patient-box .field label { font-size: 11px; color: #9ca3af; text-transform: uppercase; }
    .patient-box .field p { font-size: 14px; font-weight: 500; color: #1f2937; }
    .diagnosis-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; }
    .diagnosis-box label { font-size: 11px; color: #3b82f6; text-transform: uppercase; font-weight: 600; }
    .diagnosis-box p { font-size: 15px; font-weight: 600; color: #1e40af; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #2563eb; color: white; padding: 10px 16px; text-align: left; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    .notes-box { margin-top: 16px; padding: 12px; background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #78350f; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-box { text-align: center; }
    .signature-line { border-top: 1px solid #374151; width: 160px; margin-bottom: 4px; }
    .signature-box p { font-size: 12px; color: #6b7280; }
    .receipt-id { font-size: 11px; color: #9ca3af; }
    .bg-white { background-color: white; }
    .bg-gray-50 { background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:24px;">
      <div>
        <h1 style="font-size:24px; font-weight:700; color:#2563eb;">🏥 MediVoice AI</h1>
        <p style="font-size:12px; color:#6b7280;">AI-Powered Medical Consultation</p>
        <p style="font-size:11px; color:#9ca3af; margin-top:4px;">Date: ${formatDateShort(data.createdAt)}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:40px; font-weight:800; color:#2563eb; opacity:0.3;">℞</p>
      </div>
    </div>

    <!-- Doctor Info -->
    <div style="background:#eff6ff; border-radius:8px; padding:16px; margin-bottom:20px;">
      <p style="font-size:15px; font-weight:600; color:#1e40af;">Dr. ${data.doctor.name}</p>
      <p style="font-size:13px; color:#3b82f6;">${data.doctor.qualification} ${data.doctor.specialization ? `| ${data.doctor.specialization}` : ''}</p>
      <p style="font-size:12px; color:#6b7280;">Reg. No: ${data.doctor.registrationNumber}</p>
    </div>

    <!-- Patient Info -->
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
      <div>
        <p style="font-size:11px; color:#9ca3af; text-transform:uppercase;">Patient Name</p>
        <p style="font-size:14px; font-weight:500;">${data.patient.name}</p>
      </div>
      <div>
        <p style="font-size:11px; color:#9ca3af; text-transform:uppercase;">Phone</p>
        <p style="font-size:14px; font-weight:500;">${data.patient.phone}</p>
      </div>
      <div>
        <p style="font-size:11px; color:#9ca3af; text-transform:uppercase;">Age</p>
        <p style="font-size:14px; font-weight:500;">${data.patient.age ?? 'N/A'} yrs</p>
      </div>
      <div>
        <p style="font-size:11px; color:#9ca3af; text-transform:uppercase;">Gender</p>
        <p style="font-size:14px; font-weight:500;">${data.patient.gender ?? 'N/A'}</p>
      </div>
    </div>

    <!-- Diagnosis -->
    <div style="background:#eff6ff; border-left:4px solid #2563eb; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px;">
      <p style="font-size:11px; color:#3b82f6; text-transform:uppercase; font-weight:600;">Diagnosis</p>
      <p style="font-size:15px; font-weight:600; color:#1e40af; margin-top:4px;">${data.diagnosis}</p>
    </div>

    <!-- Medicines Table -->
    <h3 style="font-size:13px; font-weight:600; color:#374151; text-transform:uppercase; margin-bottom:8px;">Prescribed Medicines</h3>
    <table>
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medicinesRows}
      </tbody>
    </table>

    ${investigationsSection}
    ${followUpSection}

    ${data.notes ? `<div class="notes-box"><strong>Notes:</strong> ${data.notes}</div>` : ''}

    <!-- Footer -->
    <div style="margin-top:40px; border-top:1px solid #e5e7eb; padding-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="font-size:11px; color:#9ca3af;">
        <p>Prescription ID: ${data.prescriptionId}</p>
        <p style="margin-top:2px;">This is a digitally generated prescription.</p>
        <p>Valid for pharmacy dispensing with doctor's registration number.</p>
      </div>
      <div style="text-align:center;">
        <div style="border-top:1px solid #374151; width:160px; margin-bottom:4px;"></div>
        <p style="font-size:12px; color:#374151; font-weight:500;">Dr. ${data.doctor.name}</p>
        <p style="font-size:11px; color:#6b7280;">${data.doctor.registrationNumber}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
