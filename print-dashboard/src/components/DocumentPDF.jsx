import React from 'react';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { calculateTotal } from '../utils/calculateTotal';

const C = {
  navy: '#1e3a5f',
  blue: '#2563eb',
  lightBlue: '#eff6ff',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#9ca3af',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { fontSize: 9, color: C.text, backgroundColor: C.white, paddingHorizontal: 48, paddingVertical: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  brandName: { fontSize: 22, fontWeight: 700, color: C.navy },
  brandSub: { fontSize: 8, color: C.gray, marginTop: 2 },
  badge: { backgroundColor: C.navy, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { color: C.white, fontSize: 13, fontWeight: 700, letterSpacing: 2 },
  divider: { borderBottomWidth: 1.5, borderBottomColor: C.navy, marginVertical: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaBlock: { flexDirection: 'column' },
  metaLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  metaValue: { fontSize: 9, color: C.text, fontWeight: 700 },
  billToBox: { backgroundColor: C.lightBlue, borderRadius: 6, padding: 14, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: C.blue },
  billToLabel: { fontSize: 7, color: C.blue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 700 },
  billToName: { fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 2 },
  tableHeaderText: { color: C.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt: { backgroundColor: C.lightGray },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colRate: { flex: 1.5, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  cellText: { fontSize: 9, color: C.text },
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalsBox: { width: 240 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, backgroundColor: C.navy, borderRadius: 4, paddingHorizontal: 10, marginTop: 4 },
  grandTotalText: { fontSize: 11, fontWeight: 700, color: C.white },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: C.muted },
});

const fmt = value => `MK ${Number(value || 0).toLocaleString('en-MW', { minimumFractionDigits: 0 })}`;
const fmtDate = value => {
  if (!value || value === '-') return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normaliseItems = (data) => {
  if (Array.isArray(data?.line_items) && data.line_items.length) {
    return data.line_items.map(item => ({
      description: item.desc || item.description || '',
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || 'item',
      unit_price: item.rate || item.unit_price || (item.amount && !item.quantity ? item.amount : 0),
      amount: item.amount || item.line_total,
    }));
  }
  if (Array.isArray(data?.items) && data.items.length) {
    return data.items.map(item => ({
      description: item.desc || item.description,
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || 'item',
      unit_price: item.rate || item.unit_price || (item.amount && !item.qty && !item.quantity ? item.amount : 0),
      amount: item.amount,
    }));
  }
  return [{ description: data?.title || 'Service', quantity: 1, unit: 'item', unit_price: 0 }];
};

function InvoiceDocument({ data }) {
  const lineItems = normaliseItems(data);
  const subtotal = calculateTotal(lineItems);
  const total = subtotal;
  const paid = Number(data?.totals?.paid ?? data?.amount_paid ?? 0);
  const balance = Number(data?.totals?.balance ?? data?.balance_due ?? Math.max(total - paid, 0));

  return (
    <Document title={`${data?.invoice_ref || data?.id || 'invoice'} - T-Tech Printing`} author="T-Tech Printing">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>T-Tech Printing</Text>
            <Text style={styles.brandSub}>MRA TIN: 1002345678</Text>
            <Text style={styles.brandSub}>Area 47, Lilongwe, Malawi</Text>
            <Text style={styles.brandSub}>+265 888 000 000 - info@ttech.mw</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.badge}><Text style={styles.badgeText}>INVOICE</Text></View>
            <Text style={[styles.brandSub, { marginTop: 8, fontWeight: 700, color: C.navy, fontSize: 10 }]}>#{data?.invoice_ref || data?.id || 'INV-0000'}</Text>
            <Text style={styles.brandSub}>{data?.status || 'draft'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Issue Date</Text><Text style={styles.metaValue}>{fmtDate(data?.issued_on || data?.issued)}</Text></View>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Due Date</Text><Text style={styles.metaValue}>{fmtDate(data?.due_on || data?.due)}</Text></View>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Payment Terms</Text><Text style={styles.metaValue}>{data?.payment_terms || '14 days'}</Text></View>
        </View>
        <View style={styles.billToBox}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{data?.client_name || data?.client || 'Client'}</Text>
          <Text style={styles.brandSub}>{data?.title || 'Print production services'}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>
        {lineItems.map((item, index) => (
          <View key={`${item.description}-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.cellText, styles.colDesc]}>{item.description}</Text>
            <Text style={[styles.cellText, styles.colQty]}>{item.quantity} {item.unit || ''}</Text>
            <Text style={[styles.cellText, styles.colRate]}>{fmt(item.unit_price)}</Text>
            <Text style={[styles.cellText, styles.colAmount]}>{fmt(Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)))}</Text>
          </View>
        ))}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}><Text>Subtotal</Text><Text>{fmt(subtotal)}</Text></View>
            <View style={styles.totalsRow}><Text>Paid</Text><Text>{fmt(paid)}</Text></View>
            <View style={styles.totalsRow}><Text>Balance</Text><Text>{fmt(balance)}</Text></View>
            <View style={styles.grandTotalRow}><Text style={styles.grandTotalText}>Total</Text><Text style={styles.grandTotalText}>{fmt(total)}</Text></View>
          </View>
        </View>
        {data?.notes && <Text style={[styles.cellText, { marginTop: 20, color: C.gray }]}>{data.notes}</Text>}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Thank you for choosing T-Tech Printing</Text>
          <Text style={styles.footerText}>{data?.invoice_ref || data?.id || 'invoice'}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadPDF(data, filename = 'document.pdf', type = 'invoice') {
  try {
    const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${data?.id || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF download failed:', error);
  }
}

export async function downloadInvoicePDF(invoice) {
  return downloadPDF(invoice, `${invoice?.invoice_ref || invoice?.id || 'invoice'}.pdf`, 'invoice');
}

export async function downloadProposalPDF(proposal) {
  return downloadPDF(proposal, `${proposal?.id || 'proposal'}.pdf`, 'proposal');
}

export async function downloadJobPDF(job) {
  return downloadPDF(job, `${job?.id || 'job'}.pdf`, 'job');
}

export default InvoiceDocument;
