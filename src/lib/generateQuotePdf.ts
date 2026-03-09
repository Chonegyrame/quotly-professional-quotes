import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';
import { formatCurrency, formatDate } from '@/data/mockData';

interface PdfQuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  materials?: { name: string; quantity: number; unitPrice: number; unit: string }[];
}

interface PdfQuoteData {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  validUntil?: string;
  createdAt: string;
  estimatedTime?: string;
  notes?: string;
  items: PdfQuoteItem[];
  company: {
    name: string;
    orgNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    bankgiro?: string;
    logoUrl?: string;
  };
  defaultVat: number;
}

export async function generateQuotePdf(data: PdfQuoteData) {
  console.log('📄 Starting PDF generation for quote:', data.quoteNumber);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const primary: [number, number, number] = [30, 58, 95];
  const muted: [number, number, number] = [120, 120, 120];
  const black: [number, number, number] = [20, 20, 20];

  // === Company Header ===
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(data.company.name, margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  const companyDetails = [
    data.company.orgNumber && `Org.nr: ${data.company.orgNumber}`,
    data.company.address,
    data.company.phone,
    data.company.email,
    data.company.bankgiro && `Bankgiro: ${data.company.bankgiro}`,
  ].filter(Boolean);
  doc.text(companyDetails.join('  |  '), margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // === Quote Title ===
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('OFFERT', margin, y);

  // Quote number + date on right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(data.quoteNumber, pageWidth - margin, y - 6, { align: 'right' });
  doc.text(`Datum: ${formatDate(data.createdAt)}`, pageWidth - margin, y, { align: 'right' });
  if (data.validUntil) {
    doc.text(`Giltig till: ${formatDate(data.validUntil)}`, pageWidth - margin, y + 5, { align: 'right' });
  }
  y += 14;

  // === Customer Details ===
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('Till:', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.customerName, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  if (data.customerEmail) { doc.text(data.customerEmail, margin, y); y += 4; }
  if (data.customerPhone) { doc.text(data.customerPhone, margin, y); y += 4; }
  if (data.customerAddress) { doc.text(data.customerAddress, margin, y); y += 4; }
  y += 6;

  // === Line Items Table ===
  const tableBody: any[][] = [];

  data.items.forEach(item => {
    const matsTotal = (item.materials || []).reduce((s, m) => s + m.quantity * m.unitPrice, 0);
    const itemTotal = item.quantity * item.unitPrice + matsTotal;

    // Main item row
    tableBody.push([
      { content: item.description, styles: { fontStyle: 'bold' } },
      { content: item.quantity.toString(), styles: { halign: 'center' } },
      { content: formatCurrency(item.unitPrice + matsTotal), styles: { halign: 'right' } },
      { content: formatCurrency(itemTotal), styles: { halign: 'right' } },
    ]);

    // Labor sub-row if there are materials
    if (item.materials && item.materials.length > 0 && item.unitPrice > 0) {
      tableBody.push([
        { content: '   Arbete', styles: { textColor: muted, fontStyle: 'normal', fontSize: 8 } },
        { content: '', styles: {} },
        { content: formatCurrency(item.unitPrice), styles: { halign: 'right', textColor: muted, fontSize: 8 } },
        { content: '', styles: {} },
      ]);
    }

    // Material sub-rows
    (item.materials || []).forEach(m => {
      tableBody.push([
        { content: `   ${m.quantity} × ${m.name}`, styles: { textColor: muted, fontStyle: 'normal', fontSize: 8 } },
        { content: '', styles: {} },
        { content: formatCurrency(m.quantity * m.unitPrice), styles: { halign: 'right', textColor: muted, fontSize: 8 } },
        { content: '', styles: {} },
      ]);
    });
  });

  (doc as any).autoTable({
    startY: y,
    head: [['Beskrivning', 'Antal', 'À-pris', 'Summa']],
    body: tableBody,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: black,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5 },
      1: { cellWidth: contentWidth * 0.1, halign: 'center' },
      2: { cellWidth: contentWidth * 0.2, halign: 'right' },
      3: { cellWidth: contentWidth * 0.2, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: 'grid',
    styles: { lineColor: [230, 230, 230], lineWidth: 0.3 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // === Totals ===
  const subtotal = data.items.reduce((sum, item) => {
    const matsTotal = (item.materials || []).reduce((s, m) => s + m.quantity * m.unitPrice, 0);
    return sum + item.quantity * item.unitPrice + matsTotal;
  }, 0);
  const vatAmount = data.items.reduce((sum, item) => {
    const matsTotal = (item.materials || []).reduce((s, m) => s + m.quantity * m.unitPrice, 0);
    return sum + (item.quantity * item.unitPrice + matsTotal) * (item.vatRate / 100);
  }, 0);
  const total = subtotal + vatAmount;

  const totalsX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text('Delsumma:', totalsX - 45, y);
  doc.text(formatCurrency(subtotal), totalsX, y, { align: 'right' });
  y += 6;

  doc.text(`Moms (${data.defaultVat}%):`, totalsX - 45, y);
  doc.text(formatCurrency(vatAmount), totalsX, y, { align: 'right' });
  y += 2;

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX - 55, y, totalsX, y);
  y += 5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('Totalt inkl. moms:', totalsX - 55, y);
  doc.text(formatCurrency(total), totalsX, y, { align: 'right' });
  y += 10;

  // === Estimated time ===
  if (data.estimatedTime) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...black);
    doc.text(`Beräknad arbetstid: ${data.estimatedTime}`, margin, y);
    y += 6;
  }

  // === Notes ===
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...muted);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  // === Footer ===
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(`${data.company.name} — Genererad med Quotly`, pageWidth / 2, footerY, { align: 'center' });

  // Force download approach (works better in all browsers)
  try {
    const pdfBlob = doc.output('blob');
    console.log('📄 PDF blob created, size:', pdfBlob.size);
    
    // Clean filename - only alphanumeric and safe chars
    const cleanCustomer = data.customerName.replace(/[^a-zA-ZåäöÅÄÖ0-9\s]/g, '').replace(/\s+/g, '_');
    const cleanQuoteNumber = data.quoteNumber.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `Offert_${cleanQuoteNumber}_${cleanCustomer}.pdf`;
    console.log('📄 Generated filename:', filename);
    
    // Create download link
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(link);
    console.log('📄 Triggering download...');
    link.click();
    document.body.removeChild(link);
    
    // Also try to open in new tab as backup
    setTimeout(() => {
      const newTab = window.open(blobUrl, '_blank');
      if (newTab) {
        console.log('📄 Also opened in new tab');
      } else {
        console.log('📄 New tab blocked, download should work');
      }
    }, 100);
    
    // Clean up blob URL after 10 seconds
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('📄 PDF generation error:', err);
    throw err;
  }
}
