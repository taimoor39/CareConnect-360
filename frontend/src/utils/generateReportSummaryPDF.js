import { jsPDF } from 'jspdf';

export const generateReportSummaryPDF = ({
  patientName,
  patientCode,
  reportTitle,
  summaryText,
  doctorName,
  uploadedDate,
  disclaimer,
}) => {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(13, 148, 136);
  doc.text('CareConnect 360 — Health summary', margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(String(reportTitle || 'Report'), margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Patient: ${patientName || '—'} (${patientCode || '—'})`, margin, y);
  y += 5;
  doc.text(`Doctor: Dr. ${doctorName || '—'}`, margin, y);
  y += 5;
  doc.text(`Date: ${uploadedDate || '—'}`, margin, y);
  y += 10;

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, y - 4, 182, 22, 2, 2, 'FD');
  doc.setTextColor(120, 53, 15);
  const disc = disclaimer || 'This summary is for informational purposes only and does not constitute medical advice.';
  const splitDisc = doc.splitTextToSize(disc, 178);
  doc.text(splitDisc, margin + 2, y + 2);
  y += 26 + splitDisc.length * 4;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const body = doc.splitTextToSize(String(summaryText || ''), 182);
  doc.text(body, margin, y);

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Computer-generated patient summary.', margin, 285);

  const safe = String(reportTitle || 'summary').slice(0, 40).replace(/[^\w\s-]/g, '');
  doc.save(`summary-${safe || 'report'}.pdf`);
};
