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
  invoiceBadge: { backgroundColor: C.navy, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 6 },
  invoiceBadgeText: { color: C.white, fontSize: 13, fontWeight: 700, letterSpacing: 2 },
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

const normaliseItems = invoice => {
  if (Array.isArray(invoice?.line_items) && invoice.line_items.length) return invoice.line_items;
  if (Array.isArray(invoice?.items) && invoice.items.length) {
    return invoice.items.map(item => ({
      description: item.desc || item.description,
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || 'item',
      unit_price: item.rate || item.unit_price || 0,
    }));
  }
  return [{ description: invoice?.title || 'Print service', quantity: 1, unit: 'item', unit_price: 0 }];
};

function InvoiceDocument({ invoice }) {
  const lineItems = normaliseItems(invoice);
  const subtotal = calculateTotal(lineItems);
  const total = subtotal;
  const paid = Number(invoice?.totals?.paid ?? invoice?.amount_paid ?? 0);
  const balance = Number(invoice?.totals?.balance ?? invoice?.balance_due ?? Math.max(total - paid, 0));

  return (
    <Document title={`${invoice?.invoice_ref || invoice?.id || 'invoice'} - T-Tech Printing`} author="T-Tech Printing">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>T-Tech Printing</Text>
            <Text style={styles.brandSub}>MRA TIN: 1002345678</Text>
            <Text style={styles.brandSub}>Area 47, Lilongwe, Malawi</Text>
            <Text style={styles.brandSub}>+265 888 000 000 - info@ttech.mw</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.invoiceBadge}><Text style={styles.invoiceBadgeText}>INVOICE</Text></View>
            <Text style={[styles.brandSub, { marginTop: 8, fontWeight: 700, color: C.navy, fontSize: 10 }]}>#{invoice?.invoice_ref || invoice?.id || 'INV-0000'}</Text>
            <Text style={styles.brandSub}>{invoice?.status || 'draft'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Issue Date</Text><Text style={styles.metaValue}>{fmtDate(invoice?.issued_on || invoice?.issued)}</Text></View>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Due Date</Text><Text style={styles.metaValue}>{fmtDate(invoice?.due_on || invoice?.due)}</Text></View>
          <View style={styles.metaBlock}><Text style={styles.metaLabel}>Payment Terms</Text><Text style={styles.metaValue}>{invoice?.payment_terms || '14 days'}</Text></View>
        </View>
        <View style={styles.billToBox}>
          <Text style={styles.billToLabel}>Bill To</Text>
          <Text style={styles.billToName}>{invoice?.client_name || invoice?.client || 'Client'}</Text>
          <Text style={styles.brandSub}>{invoice?.title || 'Print production services'}</Text>
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
            <Text style={[styles.cellText, styles.colAmount]}>{fmt(Number(item.quantity || 0) * Number(item.unit_price || 0))}</Text>
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
        {invoice?.notes && <Text style={[styles.cellText, { marginTop: 20, color: C.gray }]}>{invoice.notes}</Text>}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Thank you for choosing T-Tech Printing</Text>
          <Text style={styles.footerText}>{invoice?.invoice_ref || invoice?.id || 'invoice'}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadInvoicePDF(invoice) {
  const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice?.invoice_ref || invoice?.id || 'invoice'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadProposalPDF(proposal) {
  return downloadInvoicePDF(proposal);
}

export async function downloadJobPDF(job) {
  return downloadInvoicePDF(job);
}

export default InvoiceDocument;
