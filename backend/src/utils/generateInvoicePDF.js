import PDFDocument from 'pdfkit';

// ─── Constants ────────────────────────────────────────────────────────────
const STATUS_COLORS = Object.freeze({
  Paid: '#16a34a',
  Unpaid: '#dc2626',
  Partial: '#d97706',
});

const PAGE = Object.freeze({
  margin: 50,
  ruleStart: 50,
  ruleEnd: 550,
  tableHeaderY: 220,
  totalsLabelX: 350,
  totalsValueX: 470,
  totalsValueWidth: 80,
  rowHeight: 20,
  totalsRowHeight: 18,
  footerY: 700,
});

const COLUMNS = Object.freeze({
  index: { x: 50 },
  description: { x: 75, width: 260 },
  quantity: { x: 350, width: 50, align: 'right' },
  unitPrice: { x: 400, width: 70, align: 'right' },
  total: { x: 470, width: 80, align: 'right' },
});

// ─── Tiny helpers ─────────────────────────────────────────────────────────
const num = (value) => Number(value ?? 0);
const money = (value) => `Rs. ${num(value).toLocaleString()}`;
const toDateString = (value) => (value ? new Date(value).toLocaleDateString() : '');
const drawRule = (doc, y) => doc.moveTo(PAGE.ruleStart, y).lineTo(PAGE.ruleEnd, y).stroke();

// ─── Section renderers ────────────────────────────────────────────────────
const drawHeader = (doc, invoice) => {
  doc.fontSize(20).font('Helvetica-Bold').text('CareConnect 360', 50, 50);
  doc.fontSize(10)
    .font('Helvetica')
    .text('Healthcare CRM System', 50, 75)
    .text(`Generated: ${new Date().toLocaleDateString()}`, 50, 90);

  doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
  doc.fontSize(12).font('Helvetica').text(invoice.invoiceNumber, 400, 72, { align: 'right' });

  const statusColor = STATUS_COLORS[invoice.paymentStatus] || '#000000';
  doc.fontSize(10)
    .fillColor(statusColor)
    .text(String(invoice.paymentStatus || '').toUpperCase(), 400, 90, { align: 'right' })
    .fillColor('#000000');

  drawRule(doc, 115);
};

const drawParties = (doc, invoice) => {
  const { patientId, doctorId, appointmentId } = invoice;

  doc.fontSize(10).font('Helvetica-Bold').text('BILL TO:', 50, 130);
  doc.font('Helvetica')
    .text(patientId?.name || '', 50, 145)
    .text(patientId?.patientId || '', 50, 160)
    .text(patientId?.phone || '', 50, 175);

  doc.font('Helvetica-Bold').text('SERVICE BY:', 300, 130);
  doc.font('Helvetica')
    .text(`Dr. ${doctorId?.name || ''}`, 300, 145)
    .text(toDateString(appointmentId?.date), 300, 160);
};

const drawTableHeader = (doc, y) => {
  drawRule(doc, y - 5);
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('#', COLUMNS.index.x, y);
  doc.text('Description', COLUMNS.description.x, y);
  doc.text('Qty', COLUMNS.quantity.x, y, { width: COLUMNS.quantity.width, align: COLUMNS.quantity.align });
  doc.text('Unit Price', COLUMNS.unitPrice.x, y, { width: COLUMNS.unitPrice.width, align: COLUMNS.unitPrice.align });
  doc.text('Total', COLUMNS.total.x, y, { width: COLUMNS.total.width, align: COLUMNS.total.align });
  drawRule(doc, y + 15);
};

const drawTableRow = (doc, y, index, item) => {
  doc.font('Helvetica').fontSize(10);
  doc.text(String(index + 1), COLUMNS.index.x, y);
  doc.text(item.description || '', COLUMNS.description.x, y, { width: COLUMNS.description.width });
  doc.text(String(item.quantity ?? 0), COLUMNS.quantity.x, y, { width: COLUMNS.quantity.width, align: COLUMNS.quantity.align });
  doc.text(money(item.unitPrice), COLUMNS.unitPrice.x, y, { width: COLUMNS.unitPrice.width, align: COLUMNS.unitPrice.align });
  doc.text(money(item.total), COLUMNS.total.x, y, { width: COLUMNS.total.width, align: COLUMNS.total.align });
};

const drawItemsTable = (doc, invoice) => {
  let y = PAGE.tableHeaderY;
  drawTableHeader(doc, y);
  y += 25;

  for (const [index, item] of (invoice.items ?? []).entries()) {
    drawTableRow(doc, y, index, item);
    y += PAGE.rowHeight;
  }

  drawRule(doc, y + 5);
  return y + PAGE.rowHeight;
};

const drawTotals = (doc, invoice, startY) => {
  let y = startY;

  const writeRow = (label, value, { bold = false } = {}) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, PAGE.totalsLabelX, y);
    doc.text(money(value), PAGE.totalsValueX, y, { width: PAGE.totalsValueWidth, align: 'right' });
    y += PAGE.totalsRowHeight;
  };

  writeRow('Subtotal:', invoice.subtotal);
  if (num(invoice.discount) > 0) writeRow('Discount:', invoice.discount);
  if (num(invoice.taxAmount) > 0) writeRow(`Tax (${invoice.taxPercent}%):`, invoice.taxAmount);

  doc.moveTo(PAGE.totalsLabelX, y).lineTo(PAGE.ruleEnd, y).stroke();
  y += 5;

  writeRow('TOTAL:', invoice.totalAmount, { bold: true });
  writeRow('Paid:', invoice.paidAmount);

  const outstanding = num(invoice.totalAmount) - num(invoice.paidAmount);
  if (outstanding > 0) writeRow('Due:', outstanding);
};

const drawFooter = (doc) => {
  doc.fontSize(9)
    .fillColor('#666')
    .text('Thank you for choosing CareConnect 360', 50, PAGE.footerY, { align: 'center' })
    .text('This is a computer-generated invoice.', 50, PAGE.footerY + 15, { align: 'center' });
};

// ─── Entry point ──────────────────────────────────────────────────────────
const generateInvoicePDF = (invoice, res) => {
  const doc = new PDFDocument({ margin: PAGE.margin });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, invoice);
  drawParties(doc, invoice);
  const totalsStartY = drawItemsTable(doc, invoice);
  drawTotals(doc, invoice, totalsStartY);
  drawFooter(doc);

  doc.end();
};

export default generateInvoicePDF;
