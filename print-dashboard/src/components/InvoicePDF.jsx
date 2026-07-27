import React from 'react';
import { Document, Page, StyleSheet, Text, View, Image, pdf } from '@react-pdf/renderer';
import { calculateTotal } from '../utils/calculateTotal';
import ttechLogo from '../assets/ttech-logo.png';

/* ═══════════════════════════════════════════════════════
   T-Tech Invoice / Quotation PDF
   Layout mirrors the real T-Tech Suppliers & General
   Dealers Ltd printed invoice pad (see ttech assets/
   T-TECH invoice copy.jpg): grey brand banner, italic
   service tagline, DATE / Invoice No box, blue table
   header, blue totals block, banking details footer.
═══════════════════════════════════════════════════════ */

const C = {
  navy: '#2d3748',
  bannerBg: '#d9d9d9',
  blue: '#2f7fb8',
  blueDark: '#1f6a9e',
  black: '#1a1a1a',
  border: '#000000',
  borderFaint: '#c9c9c9',
  muted: '#5a6472',
  white: '#ffffff',
};

const VAT_RATE = 0.175; // 17.5% — matches the printed T-Tech invoice pad

const styles = StyleSheet.create({
  page: { fontSize: 9, color: C.black, backgroundColor: C.white, paddingHorizontal: 0, paddingVertical: 0, fontFamily: 'Helvetica' },
  body: { paddingHorizontal: 36, paddingTop: 0, paddingBottom: 28 },

  /* Grey brand banner */
  banner: { backgroundColor: C.bannerBg, paddingHorizontal: 36, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  bannerLogo: { width: 150, height: 47, objectFit: 'contain' },

  tagline: { fontSize: 8.5, fontStyle: 'italic', color: C.black, textAlign: 'center', lineHeight: 1.5, marginBottom: 8 },
  contactLine: { fontSize: 8.5, color: C.blue, textAlign: 'center', fontWeight: 700, marginBottom: 16 },

  /* Title + meta box row */
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  docTitle: { fontSize: 26, fontWeight: 800, color: C.blue, letterSpacing: 0.5 },
  metaBox: { borderWidth: 1, borderColor: C.border, width: 200 },
  metaRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  metaRowLast: { flexDirection: 'row' },
  metaLabel: { width: 100, fontSize: 9, color: C.black, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: C.border },
  metaValue: { flex: 1, fontSize: 9, color: C.black, paddingVertical: 6, paddingHorizontal: 8, fontWeight: 700 },

  /* Bill-to line */
  toRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, marginTop: 4 },
  toLabel: { fontSize: 10, fontWeight: 700, color: C.black, marginRight: 4 },
  toValue: { fontSize: 9.5, color: C.black, flex: 1, borderBottomWidth: 0.6, borderBottomColor: C.borderFaint, paddingBottom: 2 },
  toValueSecondLine: { fontSize: 9.5, color: C.black, borderBottomWidth: 0.6, borderBottomColor: C.borderFaint, marginBottom: 14, paddingBottom: 2, minHeight: 12 },

  /* Items table */
  tableWrap: { borderWidth: 1, borderColor: C.border, marginTop: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.blue },
  th: { color: C.white, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', paddingVertical: 8, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.35)' },
  thDesc: { flex: 3.4, textAlign: 'left' },
  thQty: { flex: 0.8, textAlign: 'center' },
  thUnit: { flex: 1.3, textAlign: 'center' },
  thTotal: { flex: 1.3, textAlign: 'center', borderRightWidth: 0 },

  tRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.borderFaint, minHeight: 22 },
  td: { fontSize: 8.5, color: C.black, paddingVertical: 5, paddingHorizontal: 6, borderRightWidth: 1, borderRightColor: C.borderFaint, justifyContent: 'center' },
  tdDesc: { flex: 3.4, textAlign: 'left' },
  tdQty: { flex: 0.8, textAlign: 'center' },
  tdUnit: { flex: 1.3, textAlign: 'right' },
  tdTotal: { flex: 1.3, textAlign: 'right', borderRightWidth: 0 },

  /* Totals block */
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', borderWidth: 1, borderTopWidth: 0, borderColor: C.border },
  totalsSpacer: { flex: 3.4 + 0.8 },
  totalsLabels: { flex: 1.3, backgroundColor: C.blue },
  totalsValues: { flex: 1.3 },
  totalsLabelRow: { paddingVertical: 6, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  totalsLabelRowFirst: { paddingVertical: 6, paddingHorizontal: 6 },
  totalsLabelText: { fontSize: 8.5, fontWeight: 700, color: C.white },
  totalsValueRow: { paddingVertical: 6, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: C.borderFaint, borderLeftWidth: 1, borderLeftColor: C.border },
  totalsValueRowFirst: { paddingVertical: 6, paddingHorizontal: 6, borderLeftWidth: 1, borderLeftColor: C.border },
  totalsValueText: { fontSize: 8.5, fontWeight: 700, color: C.black, textAlign: 'right' },

  /* Footer: banking + prepared by */
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  bankBlock: { flex: 1.4 },
  bankLine: { fontSize: 8, color: C.black, marginBottom: 4 },
  bankLabel: { color: C.blue, fontWeight: 700 },
  preparedBlock: { flex: 1, alignItems: 'flex-end' },
  preparedBy: { fontSize: 11, color: '#c0392b', fontStyle: 'italic', marginBottom: 4 },
  preparedLine: { borderBottomWidth: 0.6, borderBottomColor: C.borderFaint, width: 130, marginBottom: 6 },
  thanksText: { fontSize: 8, fontStyle: 'italic', color: C.muted, textAlign: 'right' },

  /* Small helper for notes/terms shown only when present */
  notesSection: { borderTopWidth: 0.6, borderTopColor: C.borderFaint, paddingTop: 8, marginTop: 14 },
  notesLabel: { fontSize: 7.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  notesText: { fontSize: 8.5, color: C.black, lineHeight: 1.5 },
});

const fmt = value => Number(value || 0).toLocaleString('en-MW', { minimumFractionDigits: 0 });
const fmtMK = value => `MK ${fmt(value)}`;

const fmtDate = value => {
  if (!value || value === '-') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
   SHARED HEADER — grey banner + tagline + contact,
   pulled straight from the printed T-Tech invoice pad
═══════════════════════════════════════ */
function BrandHeader() {
  return (
    <>
      <View style={styles.banner}>
        <Image src={ttechLogo} style={styles.bannerLogo} />
      </View>
      <View style={{ paddingHorizontal: 36 }}>
        <Text style={styles.tagline}>
          Screen printing, large format printing, offset printing, sublimation printing, DTF and UV,{'\n'}
          wallpapers, Portraits, cashsale books, Digital printing, lamination, Photocopying,{'\n'}
          Scanning and many more.
        </Text>
        <Text style={styles.contactLine}>Call/WhatsApp: 0988 231 291      Email: ttechsuppliers@gmail.com</Text>
      </View>
    </>
  );
}

function DocFooter({ preparedByNote }) {
  return (
    <View style={styles.footerRow}>
      <View style={styles.bankBlock}>
        <Text style={styles.bankLine}><Text style={styles.bankLabel}>Standard Bank: </Text>9100008349182      <Text style={styles.bankLabel}>NBS: </Text>25058402</Text>
        <Text style={styles.bankLine}><Text style={styles.bankLabel}>Airtel money: </Text>0988 231 291           <Text style={styles.bankLabel}>CODE: </Text>10156932</Text>
      </View>
      <View style={styles.preparedBlock}>
        <Text style={styles.preparedBy}>Prepared by:{preparedByNote ? ` ${preparedByNote}` : ''}</Text>
        <View style={styles.preparedLine} />
        <Text style={styles.thanksText}>Thank you for doing business with us!</Text>
      </View>
    </View>
  );
}

function ItemsTable({ items, minRows = 10 }) {
  const rows = [...items];
  while (rows.length < minRows) rows.push(null);

  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thDesc]}>Description of Goods/Services</Text>
        <Text style={[styles.th, styles.thQty]}>Qty</Text>
        <Text style={[styles.th, styles.thUnit]}>Unit Price (MK)</Text>
        <Text style={[styles.th, styles.thTotal]}>Total Price (MK)</Text>
      </View>
      {rows.map((item, index) => (
        <View key={index} style={styles.tRow}>
          <Text style={[styles.td, styles.tdDesc]}>{item?.description || ''}</Text>
          <Text style={[styles.td, styles.tdQty]}>{item ? item.quantity : ''}</Text>
          <Text style={[styles.td, styles.tdUnit]}>{item ? fmt(item.unit_price) : ''}</Text>
          <Text style={[styles.td, styles.tdTotal]}>
            {item ? fmt(Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0))) : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TotalsBlock({ rows }) {
  return (
    <View style={styles.totalsWrap}>
      <View style={styles.totalsSpacer} />
      <View style={styles.totalsLabels}>
        {rows.map((r, i) => (
          <View key={r.label} style={i === 0 ? styles.totalsLabelRowFirst : styles.totalsLabelRow}>
            <Text style={styles.totalsLabelText}>{r.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalsValues}>
        {rows.map((r, i) => (
          <View key={r.label} style={i === 0 ? styles.totalsValueRowFirst : styles.totalsValueRow}>
            <Text style={styles.totalsValueText}>{fmtMK(r.value)}</Text>
          </View>
        ))}
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
  const taxable = Math.max(subtotal - discount, 0);
  const vatEnabled = invoice?.vat_enabled !== false;
  const vat = Number(invoice?.vat ?? invoice?.tax ?? (vatEnabled ? taxable * VAT_RATE : 0));
  const total = taxable + vat;
  const paid = Number(invoice?.totals?.paid ?? invoice?.amount_paid ?? 0);
  const balance = Number(invoice?.totals?.balance ?? invoice?.balance_due ?? Math.max(total - paid, 0));

  const totalsRows = [
    ...(discount > 0 ? [{ label: 'Discount', value: -discount }] : []),
    { label: 'Sub Total', value: subtotal - discount },
    ...(vatEnabled ? [{ label: 'VAT (17.5%)', value: vat }] : []),
    { label: 'Grand Total', value: total },
  ];

  return (
    <Document title={`${invoice?.invoice_ref || invoice?.id || 'invoice'} - T-Tech`} author="T-Tech Suppliers & General Dealers Ltd">
      <Page size="A4" style={styles.page}>
        <BrandHeader />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.docTitle}>INVOICE</Text>
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>DATE</Text>
                <Text style={styles.metaValue}>{fmtDate(invoice?.issued_on || invoice?.issued)}</Text>
              </View>
              <View style={styles.metaRowLast}>
                <Text style={styles.metaLabel}>Invoice No</Text>
                <Text style={styles.metaValue}>{invoice?.invoice_ref || invoice?.id || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.toRow}>
            <Text style={styles.toLabel}>TO:</Text>
            <Text style={styles.toValue}>{invoice?.client_name || invoice?.client || ''}</Text>
          </View>
          <Text style={styles.toValueSecondLine}>
            {invoice?.address || invoice?.client_phone || ''}
          </Text>

          <ItemsTable items={lineItems} />
          <TotalsBlock rows={totalsRows} />

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

          <DocFooter />
        </View>
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
  const taxable = Math.max(subtotal - discount, 0);
  const vatEnabled = proposal?.vat_enabled !== false;
  const vat = Number(proposal?.vat ?? proposal?.tax ?? (vatEnabled ? taxable * VAT_RATE : 0));
  const total = taxable + vat;

  const totalsRows = [
    ...(discount > 0 ? [{ label: 'Discount', value: -discount }] : []),
    { label: 'Sub Total', value: subtotal - discount },
    ...(vatEnabled ? [{ label: 'VAT (17.5%)', value: vat }] : []),
    { label: 'Grand Total', value: total },
  ];

  return (
    <Document title={`${proposal?.proposal_ref || proposal?.id || 'quotation'} - T-Tech`} author="T-Tech Suppliers & General Dealers Ltd">
      <Page size="A4" style={styles.page}>
        <BrandHeader />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>DATE</Text>
                <Text style={styles.metaValue}>{fmtDate(proposal?.issued_on || proposal?.issued)}</Text>
              </View>
              <View style={styles.metaRowLast}>
                <Text style={styles.metaLabel}>Quotation No</Text>
                <Text style={styles.metaValue}>{proposal?.proposal_ref || proposal?.id || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.toRow}>
            <Text style={styles.toLabel}>TO:</Text>
            <Text style={styles.toValue}>{proposal?.client_name || proposal?.client || ''}</Text>
          </View>
          <Text style={styles.toValueSecondLine}>
            {proposal?.address || proposal?.client_phone || ''}
          </Text>

          {proposal?.title && (
            <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.black, marginTop: -8, marginBottom: 8 }}>{proposal.title}</Text>
          )}

          <ItemsTable items={lineItems} />
          <TotalsBlock rows={totalsRows} />

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

          <DocFooter />
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
