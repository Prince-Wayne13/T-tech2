import React from 'react';
import { Document, Page, StyleSheet, Text, View, Image, pdf } from '@react-pdf/renderer';
import { calculateTotal } from '../utils/calculateTotal';
import ttechLogo from '../assets/ttech-logo.png';

/* ═══════════════════════════════════════════════════════
   T-Tech Invoice / Quotation PDF
   Matches the T-Tech Suppliers & General Dealers Ltd
   quotation/invoice template: small logo + contact info
   header, blue "FOR" meta block, blue table header, dark
   TOTAL bar. No VAT line, no bank footer, no signature.
═══════════════════════════════════════════════════════ */

const C = {
  navy: '#1e3a5f',
  blue: '#2f7fb8',
  black: '#1a1a1a',
  borderFaint: '#c9c9c9',
  muted: '#6b7280',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { fontSize: 9, color: C.black, backgroundColor: C.white, paddingHorizontal: 40, paddingVertical: 36, fontFamily: 'Helvetica' },

  /* Top header: logo left, contact info right */
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoImg: { width: 130, height: 40, objectFit: 'contain' },
  contactBlock: { alignItems: 'flex-end' },
  contactLine: { fontSize: 8.5, color: C.muted, marginBottom: 2, textAlign: 'right' },

  /* Title row: company name left, doc type right */
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandTitle: { fontSize: 19, fontWeight: 800, color: C.black, maxWidth: 320, lineHeight: 1.15 },
  docTitle: { fontSize: 24, fontWeight: 800, color: C.black },

  divider: { borderBottomWidth: 1, borderBottomColor: C.borderFaint, marginBottom: 16 },

  /* For / meta row */
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  forLabel: { fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', marginBottom: 3 },
  forValue: { fontSize: 15, fontWeight: 700, color: C.black },
  metaBlockRight: { alignItems: 'flex-end' },
  metaLine: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase', marginRight: 6 },
  metaValue: { fontSize: 9, fontWeight: 700, color: C.black },

  /* Items table */
  tableHeader: { flexDirection: 'row', backgroundColor: C.blue, paddingVertical: 8, paddingHorizontal: 10 },
  th: { color: C.white, fontSize: 8.5, fontWeight: 700 },
  thDesc: { flex: 3.4, textAlign: 'left' },
  thQty: { flex: 1, textAlign: 'center' },
  thUnit: { flex: 1.4, textAlign: 'center' },
  thTotal: { flex: 1.4, textAlign: 'right' },

  tRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 0.6, borderBottomColor: C.borderFaint },
  td: { fontSize: 9, color: C.black },
  tdDesc: { flex: 3.4, textAlign: 'left', fontWeight: 700 },
  tdQty: { flex: 1, textAlign: 'center' },
  tdUnit: { flex: 1.4, textAlign: 'center' },
  tdTotal: { flex: 1.4, textAlign: 'right' },

  /* Totals block */
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  totalsBox: { width: 240 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  subtotalLabel: { fontSize: 9, fontWeight: 700, color: C.blue, textTransform: 'uppercase' },
  subtotalValue: { fontSize: 9, fontWeight: 700, color: C.black, textAlign: 'right' },
  totalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.black, paddingVertical: 10, paddingHorizontal: 14, marginTop: 6 },
  totalLabel: { fontSize: 13, fontWeight: 800, color: C.white, textTransform: 'uppercase' },
  totalValue: { fontSize: 13, fontWeight: 800, color: C.white },

  notesSection: { borderTopWidth: 0.6, borderTopColor: C.borderFaint, paddingTop: 8, marginTop: 22 },
  notesLabel: { fontSize: 7.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  notesText: { fontSize: 8.5, color: C.black, lineHeight: 1.5 },
});

const fmt = value => Number(value || 0).toLocaleString('en-MW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMK = value => `MK${fmt(value)}`;

const fmtDate = value => {
  if (!value || value === '-') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const normaliseItems = doc => {
  if (Array.isArray(doc?.line_items) && doc.line_items.length) {
    return doc.line_items.map(item => ({
      description: item.desc || item.description || '',
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || '',
      unit_price: item.rate || item.unit_price || (item.amount && !item.quantity ? item.amount : 0),
      amount: item.amount || item.line_total,
    }));
  }
  if (Array.isArray(doc?.items) && doc.items.length) {
    return doc.items.map(item => ({
      description: item.desc || item.description,
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || '',
      unit_price: item.rate || item.unit_price || (item.amount && !item.qty && !item.quantity ? item.amount : 0),
      amount: item.amount,
    }));
  }
  return [{ description: doc?.title || 'Print service', quantity: 1, unit: '', unit_price: 0 }];
};

/* ═══════════════════════════════════════
   SHARED HEADER — logo left, contact info right
═══════════════════════════════════════ */
function BrandHeader() {
  return (
    <View style={styles.topHeader}>
      <View style={styles.logoRow}>
        <Image src={ttechLogo} style={styles.logoImg} />
      </View>
      <View style={styles.contactBlock}>
        <Text style={styles.contactLine}>+265-988-231291</Text>
        <Text style={styles.contactLine}>ttechsuppliers@gmail.com</Text>
        <Text style={styles.contactLine}>Lilongwe City mall, Standard bank Corridor</Text>
      </View>
    </View>
  );
}

function ItemsTable({ items }) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thDesc]}>Description</Text>
        <Text style={[styles.th, styles.thQty]}>Quantity</Text>
        <Text style={[styles.th, styles.thUnit]}>Unit price</Text>
        <Text style={[styles.th, styles.thTotal]}>Amount</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.tRow}>
          <Text style={[styles.td, styles.tdDesc]}>{item.description || ''}</Text>
          <Text style={[styles.td, styles.tdQty]}>{item.quantity}</Text>
          <Text style={[styles.td, styles.tdUnit]}>{fmtMK(item.unit_price)}</Text>
          <Text style={[styles.td, styles.tdTotal]}>
            {fmtMK(Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TotalsBlock({ subtotal, total }) {
  return (
    <View style={styles.totalsSection}>
      <View style={styles.totalsBox}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal:</Text>
          <Text style={styles.subtotalValue}>{fmtMK(subtotal)}</Text>
        </View>
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{fmtMK(total)}</Text>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════
   INVOICE
═══════════════════════════════════════ */
function InvoiceDocument({ invoice }) {
  const lineItems = normaliseItems(invoice);
  const subtotal = calculateTotal(lineItems);
  const discount = Number(invoice?.discount_amount ?? invoice?.discount ?? 0);
  const total = Math.max(subtotal - discount, 0);
  const paid = Number(invoice?.totals?.paid ?? invoice?.amount_paid ?? 0);
  const balance = Number(invoice?.totals?.balance ?? invoice?.balance_due ?? Math.max(total - paid, 0));

  return (
    <Document title={`${invoice?.invoice_ref || invoice?.id || 'invoice'} - T-Tech`} author="T-Tech Suppliers & General Dealers Ltd">
      <Page size="A4" style={styles.page}>
        <BrandHeader />

        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>T-TECH SUPPLIERS AND GENERAL DEALERS</Text>
          <Text style={styles.docTitle}>INVOICE</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.forLabel}>For:</Text>
            <Text style={styles.forValue}>{invoice?.client_name || invoice?.client || ''}</Text>
          </View>
          <View style={styles.metaBlockRight}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Number:</Text>
              <Text style={styles.metaValue}>{invoice?.invoice_ref || invoice?.id || '—'}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice?.issued_on || invoice?.issued)}</Text>
            </View>
          </View>
        </View>

        <ItemsTable items={lineItems} />
        <TotalsBlock subtotal={subtotal - discount} total={total} />

        {paid > 0 && (
          <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 8.5, color: C.muted }}>
              Amount Paid: {fmtMK(paid)}   ·   Balance Due: <Text style={{ fontWeight: 700, color: C.black }}>{fmtMK(balance)}</Text>
            </Text>
          </View>
        )}

        {invoice?.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/* ═══════════════════════════════════════
   QUOTATION / PROPOSAL
═══════════════════════════════════════ */
function QuotationDocument({ proposal }) {
  const lineItems = normaliseItems(proposal);
  const subtotal = calculateTotal(lineItems);
  const discount = Number(proposal?.discount ?? proposal?.discount_amount ?? 0);
  const total = Math.max(subtotal - discount, 0);

  return (
    <Document title={`${proposal?.proposal_ref || proposal?.id || 'quotation'} - T-Tech`} author="T-Tech Suppliers & General Dealers Ltd">
      <Page size="A4" style={styles.page}>
        <BrandHeader />

        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>T-TECH SUPPLIERS AND GENERAL DEALERS</Text>
          <Text style={styles.docTitle}>QUOTATION</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.forLabel}>For:</Text>
            <Text style={styles.forValue}>{proposal?.client_name || proposal?.client || ''}</Text>
          </View>
          <View style={styles.metaBlockRight}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Number:</Text>
              <Text style={styles.metaValue}>{proposal?.proposal_ref || proposal?.id || '—'}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{fmtDate(proposal?.issued_on || proposal?.issued)}</Text>
            </View>
          </View>
        </View>

        {proposal?.title && (
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.black, marginTop: -10, marginBottom: 10 }}>{proposal.title}</Text>
        )}

        <ItemsTable items={lineItems} />
        <TotalsBlock subtotal={subtotal - discount} total={total} />

        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 8, color: C.muted, fontStyle: 'italic' }}>
            Valid until {fmtDate(proposal?.valid_until || proposal?.validUntil || proposal?.expires)} · Subject to artwork approval
          </Text>
        </View>

        {proposal?.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Terms & Notes</Text>
            <Text style={styles.notesText}>{proposal.notes}</Text>
          </View>
        )}
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
  const blob = await pdf(<QuotationDocument proposal={proposal} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${proposal?.proposal_ref || proposal?.id || 'quotation'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadJobPDF(job) {
  return downloadInvoicePDF(job);
}

export default InvoiceDocument;