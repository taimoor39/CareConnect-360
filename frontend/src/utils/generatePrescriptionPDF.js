import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';

/**
 * Client-side prescription PDF (patient portal).
 * @param {object} opts
 */
export const generatePrescriptionPDF = ({
  patient,
  doctor,
  prescription,
  appointmentDate,
  clinicName,
}) => {
  const doc = new jsPDF();
  const clinic = clinicName || 'CareConnect 360';

  doc.setFontSize(18);
  doc.setTextColor(13, 148, 136);
  doc.text(clinic, 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('PRESCRIPTION', 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${appointmentDate || '—'}`, 14, 42);
  doc.text(`Dr. ${doctor?.name || '—'}`, 14, 50);
  doc.text(doctor?.specialization || doctor?.doctorProfile?.specialization || '', 14, 58);

  doc.setTextColor(30, 41, 59);
  doc.text(`Patient: ${patient?.name || '—'}`, 120, 42);
  doc.text(`Code: ${patient?.patientId || patient?.patientCode || '—'}`, 120, 50);
  doc.text(`Age: ${patient?.age != null ? patient.age : '—'}`, 120, 58);

  doc.setDrawColor(200);
  doc.line(14, 65, 196, 65);

  const items = prescription?.items || [];
  autoTable(doc, {
    head: [['Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions']],
    body: items.map((item) => [
      item.medicineName || '—',
      item.dosage || '—',
      item.frequency || '—',
      item.duration || '—',
      item.instructions || '—',
    ]),
    startY: 70,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255 },
  });

  if (prescription?.followUpDate) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Follow-up Date: ${prescription.followUpDate}`, 14, finalY);
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('This prescription is computer-generated.', 14, 280);

  const safeId = String(patient?.patientId || patient?.patientCode || 'patient').replace(/[^\w-]/g, '');
  doc.save(`prescription-${safeId}-${appointmentDate || 'visit'}.pdf`);
};
