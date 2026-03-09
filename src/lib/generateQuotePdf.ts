import { formatCurrency } from '@/data/mockData';

interface SimplePdfData {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  company: {
    name: string;
  };
}

export function generateQuotePdf(data: SimplePdfData) {
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const vat = subtotal * 0.25;
  const total = subtotal + vat;

  // Create simple text content
  const content = [
    `OFFERT - ${data.quoteNumber}`,
    '',
    `Från: ${data.company.name}`,
    `Till: ${data.customerName}`,
    `Email: ${data.customerEmail}`,
    '',
    'ARTIKLAR:',
    '----------------------------------------',
    ...data.items.map(item => `${item.description} - ${item.quantity}x${formatCurrency(item.unitPrice)} = ${formatCurrency(item.quantity * item.unitPrice)}`),
    '----------------------------------------',
    `Delsumma: ${formatCurrency(subtotal)}`,
    `Moms (25%): ${formatCurrency(vat)}`,
    `TOTALT: ${formatCurrency(total)}`,
    '',
    'Tack för ditt förtroende!',
    data.company.name
  ].join('\n');

  // Create and download as text file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Offert_${data.quoteNumber.replace(/[^a-zA-Z0-9]/g, '')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}