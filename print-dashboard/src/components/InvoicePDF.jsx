import React from 'react';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { calculateTotal } from '../utils/calculateTotal';

const C = {
  navy: '#2d3748',
  steel: '#4a6882',
  slate: '#3d4f5c',
  slate50: '#f9fafb',
  slate100: '#f1f4f8',
  border: '#e2e8f0',
  text: '#2d3748',
  muted: '#94a3b8',
  mutedDark: '#64748b',
  white: '#ffffff',
  red: '#fca5a5',
};

const VAT_RATE = 0.165;

const styles = StyleSheet.create({
  page: { fontSize: 9, color: C.text, backgroundColor: C.white, paddingHorizontal: 42, paddingVertical: 0 },
  topRule: { height: 3, backgroundColor: C.steel },
  bottomRule: { height: 3, backgroundColor: C.slate },
  body: { paddingHorizontal: 6, paddingTop: 24, paddingBottom: 18 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  logoBadge: { width: 40, height: 40, borderRadius: 9, backgroundColor: C.steel, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoBadgeText: { color: C.white, fontSize: 16, fontWeight: 700 },
  brandBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  brandName: { fontSize: 12, fontWeight: 700, color: C.navy, lineHeight: 1.3 },
  brandSub: { fontSize: 8, color: C.mutedDark, marginTop: 2 },
  brandTin: { fontSize: 7, color: C.muted, marginTop: 2 },

  docBadge: { backgroundColor: C.navy, borderRadius: 5, paddingHorizontal: 16, paddingVertical: 7, alignSelf: 'flex-end' },
  docBadgeText: { color: C.white, fontSize: 14, fontWeight: 700, letterSpacing: 2 },
  metaBlock: { marginTop: 8, alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  metaLabel: { fontSize: 6.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 6 },
  metaValue: { fontSize: 8.5, color: C.navy, fontWeight: 700 },

  divider: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginBottom: 14 },

  twoCol: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  billBox: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.slate50, padding: 12 },
  billLabel: { fontSize: 7, fontWeight: 700, color: C.mutedDark, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  billName: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 3 },
  billLine: { fontSize: 8.5, color: C.mutedDark, marginBottom: 1 },
  preparedBox: { flex: 1, paddingTop: 2, alignItems: 'flex-end' },
  preparedLabel: { fontSize: 7, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, textAlign: 'right' },
  preparedName: { fontSize: 10, fontWeight: 700, color: C.navy, textAlign: 'right' },
  preparedLine: { fontSize: 8.5, color: C.mutedDark, textAlign: 'right', marginTop: 2 },

  tableWrap: { borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.slate, paddingHorizontal: 10, paddingVertical: 8 },
  tableHeaderText: { color: C.white, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: C.slate100 },
  tableRowAlt: { backgroundColor: '#fafbfc' },
  colNum: { flex: 0.4, color: C.muted, fontSize: 8 },
  colDesc: { flex: 3.4 },
  colQty: { flex: 0.8, textAlign: 'center' },
  colUnit: { flex: 0.9, textAlign: 'center' },
  colRate: { flex: 1.3, textAlign: 'right' },
  colAmount: { flex: 1.3, textAlign: 'right' },
  cellText: { fontSize: 8.5, color: C.text },
  cellMuted: { fontSize: 7.5, color: C.muted },

  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalsBox: { width: 230 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 8.5, color: C.mutedDark },
  totalsValue: { fontSize: 8.5, color: C.text, fontWeight: 600 },
  totalsMutedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  totalsMutedLabel: { fontSize: 8, color: C.muted },
  totalsMutedValue: { fontSize: 8, color: C.muted },
  totalsDivider: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5, marginTop: 3, marginBottom: 3 },
  totalsDividerLabel: { fontSize: 9.5, fontWeight: 700, color: C.navy },
  totalsDividerValue: { fontSize: 9.5, fontWeight: 700, color: C.navy },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.slate, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  grandTotalText: { fontSize: 10, fontWeight: 700, color: C.white, letterSpacing: 0.4 },
  footNote: { fontSize: 7, color: C.muted, textAlign: 'right', marginTop: 4 },

  notesSection: { borderTopWidth: 1, borderTopColor: C.slate100, paddingTop: 10, marginTop: 14 },
  notesLabel: { fontSize: 7, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: C.mutedDark, lineHeight: 1.5 },

  agreeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: C.slate50, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
  agreeCheck: { width: 11, height: 11, borderRadius: 3, borderWidth: 1, borderColor: '#94a3b8', marginRight: 10 },
  agreeText: { fontSize: 9, fontWeight: 700, color: C.navy },

  footer: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.slate50, marginHorizontal: -42, paddingHorizontal: 42, paddingVertical: 12, marginTop: 14 },
  footerThanks: { fontSize: 8, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  footerContactRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 3 },
  footerContact: { fontSize: 7.5, color: C.muted },
  footerRef: { fontSize: 7, color: '#cbd5e1', textAlign: 'center' },
});

const fmt = value => `MK ${Number(value || 0).toLocaleString('en-MW', { minimumFractionDigits: 0 })}`;

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
      unit: item.unit || 'item',
      unit_price: item.rate || item.unit_price || (item.amount && !item.quantity ? item.amount : 0),
      amount: item.amount || item.line_total,
    }));
  }
  if (Array.isArray(doc?.items) && doc.items.length) {
    return doc.items.map(item => ({
      description: item.desc || item.description,
      quantity: item.qty || item.quantity || 1,
      unit: item.unit || 'item',
      unit_price: item.rate || item.unit_price || (item.amount && !item.qty && !item.quantity ? item.amount : 0),
      amount: item.amount,
    }));
  }
  return [{ description: doc?.title || 'Print service', quantity: 1, unit: 'item', unit_price: 0 }];
};

function LogoBadge() {
  return (
    <View style={styles.logoBadge}>
      <Text style={styles.logoBadgeText}>T</Text>
    </View>
  );
}

function DocFooter({ refValue, dateLine }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerThanks}>Thank You For Your Business</Text>
      <View style={styles.footerContactRow}>
        <Text style={styles.footerContact}>+265 988 231 291</Text>
        <Text style={styles.footerContact}>ttechsuppliers@gmail.com</Text>
        <Text style={styles.footerContact}>Lilongwe, City Mall — Standard Bank Corridor</Text>
      </View>
      <Text style={styles.footerRef}>{refValue} · {dateLine}</Text>
    </View>
  );
}

function ItemsTable({ items, unitColumn = true }) {
  return (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colNum]}>#</Text>
        <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
        <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
        {unitColumn && <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>}
        <Text style={[styles.tableHeaderText, styles.colRate]}>Rate (MK)</Text>
        <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount (MK)</Text>
      </View>
      {items.map((item, index) => (
        <View key={`${item.description}-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
          <Text style={[styles.cellMuted, styles.colNum]}>{index + 1}</Text>
          <Text style={[styles.cellText, styles.colDesc]}>{item.description}</Text>
          <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
          {unitColumn && <Text style={[styles.cellMuted, styles.colUnit]}>{item.unit || ''}</Text>}
          <Text style={[styles.cellText, styles.colRate]}>{fmt(item.unit_price)}</Text>
          <Text style={[styles.cellText, styles.colAmount, { fontWeight: 700 }]}>
            {fmt(Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InvoiceDocument({ invoice }) {
  const lineItems = normaliseItems(invoice);
  const subtotal = calculateTotal(lineItems);
  const vatEnabled = invoice?.vat_enabled !== false;
  const vat = Number(invoice?.vat ?? invoice?.tax ?? (vatEnabled ? subtotal * VAT_RATE : 0));
  const total = subtotal + vat;
  const paid = Number(invoice?.totals?.paid ?? invoice?.amount_paid ?? 0);
  const balance = Number(invoice?.totals?.balance ?? invoice?.balance_due ?? Math.max(total - paid, 0));

  return (
    <Document title={`${invoice?.invoice_ref || invoice?.id || 'invoice'} - T-Tech Printing`} author="T-Tech Printing">
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <LogoBadge />
              <View>
                <Text style={styles.brandName}>T-TECH SUPPLIERS &{'\u200b'}</Text>
                <Text style={styles.brandName}>GENERAL DEALERS LTD</Text>
                <Text style={styles.brandSub}>Digital Printing & Binding Services</Text>
                <Text style={styles.brandTin}>MRA TIN: 1002345678</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.docBadge}><Text style={styles.docBadgeText}>INVOICE</Text></View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Invoice No.</Text><Text style={styles.metaValue}>{invoice?.invoice_ref || invoice?.id || 'INV-0000'}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Payment Terms</Text><Text style={styles.metaValue}>{invoice?.payment_terms || '14 Days'}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Status</Text><Text style={styles.metaValue}>{invoice?.status || 'Unpaid'}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Date</Text><Text style={styles.metaValue}>{fmtDate(invoice?.issued_on || invoice?.issued)}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Due Date</Text><Text style={styles.metaValue}>{fmtDate(invoice?.due_on || invoice?.due)}</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.twoCol}>
            <View style={styles.billBox}>
              <Text style={styles.billLabel}>Bill To</Text>
              <Text style={styles.billName}>{invoice?.client_name || invoice?.client || 'Client'}</Text>
              <Text style={styles.billLine}>{invoice?.address || invoice?.title || 'Print production services'}</Text>
              {invoice?.client_phone && <Text style={styles.billLine}>{invoice.client_phone}</Text>}
            </View>
            <View style={styles.preparedBox}>
              <Text style={styles.preparedLabel}>Prepared By</Text>
              <Text style={styles.preparedName}>T-TECH SUPPLIERS &</Text>
              <Text style={styles.preparedName}>GENERAL DEALERS LTD</Text>
              <Text style={styles.preparedLine}>+265 988 231 291</Text>
              <Text style={styles.preparedLine}>ttechsuppliers@gmail.com</Text>
              <Text style={styles.preparedLine}>Lilongwe, City Mall</Text>
            </View>
          </View>

          <ItemsTable items={lineItems} />

          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Subtotal</Text><Text style={styles.totalsValue}>{fmt(subtotal)}</Text></View>
              {vatEnabled && (
                <View style={styles.totalsMutedRow}><Text style={styles.totalsMutedLabel}>VAT (16.5%)</Text><Text style={styles.totalsMutedValue}>{fmt(vat)}</Text></View>
              )}
              <View style={styles.totalsDivider}><Text style={styles.totalsDividerLabel}>Total</Text><Text style={styles.totalsDividerValue}>{fmt(total)}</Text></View>
              <View style={styles.totalsMutedRow}><Text style={styles.totalsMutedLabel}>Amount Paid</Text><Text style={styles.totalsMutedValue}>{fmt(paid)}</Text></View>
              <View style={styles.grandTotalRow}><Text style={styles.grandTotalText}>BALANCE DUE</Text><Text style={styles.grandTotalText}>{fmt(balance)}</Text></View>
            </View>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes / Payment Details</Text>
            <Text style={styles.notesText}>{invoice?.notes || 'Payment via bank transfer. National Bank of Malawi — T-Tech Suppliers & General Dealers Ltd.'}</Text>
          </View>

          <View style={styles.agreeBox}>
            <View style={styles.agreeCheck} />
            <Text style={styles.agreeText}>Agree and send the agreed advance / deposit</Text>
          </View>
        </View>

        <DocFooter
          refValue={invoice?.invoice_ref || invoice?.id || 'invoice'}
          dateLine={`Issued: ${fmtDate(invoice?.issued_on || invoice?.issued)} · Due: ${fmtDate(invoice?.due_on || invoice?.due)}`}
        />
        <View style={styles.bottomRule} fixed />
      </Page>
    </Document>
  );
}

function QuotationDocument({ proposal }) {
  const lineItems = normaliseItems(proposal);
  const subtotal = calculateTotal(lineItems);
  const discount = Number(proposal?.discount ?? proposal?.discount_amount ?? 0);
  const taxable = Math.max(subtotal - discount, 0);
  const vatEnabled = proposal?.vat_enabled !== false;
  const vat = Number(proposal?.vat ?? proposal?.tax ?? (vatEnabled ? taxable * VAT_RATE : 0));
  const total = taxable + vat;

  return (
    <Document title={`${proposal?.proposal_ref || proposal?.id || 'quotation'} - T-Tech Printing`} author="T-Tech Printing">
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <LogoBadge />
              <View>
                <Text style={styles.brandName}>T-TECH SUPPLIERS &{'\u200b'}</Text>
                <Text style={styles.brandName}>GENERAL DEALERS LTD</Text>
                <Text style={styles.brandSub}>Digital Printing & Binding Services</Text>
                <Text style={styles.brandTin}>MRA TIN: 1002345678</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={styles.docBadge}><Text style={styles.docBadgeText}>QUOTATION</Text></View>
              <View style={styles.metaBlock}>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Quotation No.</Text><Text style={styles.metaValue}>{proposal?.proposal_ref || proposal?.id || 'QT-0000'}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Estimate Details</Text><Text style={styles.metaValue}>{proposal?.estimate_details || '30 Days'}</Text></View>
                <View style={styles.metaRow}><Text style={styles.metaLabel}>Issue Date</Text><Text style={styles.metaValue}>{fmtDate(proposal?.issued_on || proposal?.issued)}</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.twoCol}>
            <View style={styles.billBox}>
              <Text style={styles.billLabel}>Prepared For</Text>
              <Text style={styles.billName}>{proposal?.client_name || proposal?.client || 'Client'}</Text>
              <Text style={styles.billLine}>{proposal?.address || '-'}</Text>
              {proposal?.client_phone && <Text style={styles.billLine}>{proposal.client_phone}</Text>}
            </View>
            <View style={styles.preparedBox}>
              <Text style={styles.preparedLabel}>Prepared By</Text>
              <Text style={styles.preparedName}>T-TECH SUPPLIERS &</Text>
              <Text style={styles.preparedName}>GENERAL DEALERS LTD</Text>
              <Text style={styles.preparedLine}>+265 988 231 291</Text>
              <Text style={styles.preparedLine}>ttechsuppliers@gmail.com</Text>
              <Text style={styles.preparedLine}>Lilongwe, City Mall</Text>
            </View>
          </View>

          {proposal?.title && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{proposal.title}</Text>
            </View>
          )}

          <ItemsTable items={lineItems} />

          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}><Text style={styles.totalsLabel}>Subtotal</Text><Text style={styles.totalsValue}>{fmt(subtotal)}</Text></View>
              {discount > 0 && (
                <View style={styles.totalsMutedRow}><Text style={styles.totalsMutedLabel}>Discount</Text><Text style={styles.totalsMutedValue}>-{fmt(discount)}</Text></View>
              )}
              {vatEnabled && (
                <View style={styles.totalsMutedRow}><Text style={styles.totalsMutedLabel}>VAT (16.5%)</Text><Text style={styles.totalsMutedValue}>{fmt(vat)}</Text></View>
              )}
              <View style={styles.grandTotalRow}><Text style={styles.grandTotalText}>ESTIMATE TOTAL</Text><Text style={styles.grandTotalText}>{fmt(total)}</Text></View>
              <Text style={styles.footNote}>Valid until {fmtDate(proposal?.valid_until || proposal?.validUntil || proposal?.expires)} · Subject to artwork approval</Text>
            </View>
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Terms & Notes</Text>
            <Text style={styles.notesText}>{proposal?.notes || '50% deposit required to commence production. Balance due upon delivery. Prices valid for 30 days.'}</Text>
          </View>

          <View style={styles.agreeBox}>
            <View style={styles.agreeCheck} />
            <Text style={styles.agreeText}>Agree and send the agreed advance / deposit</Text>
          </View>
        </View>

        <DocFooter
          refValue={proposal?.proposal_ref || proposal?.id || 'quotation'}
          dateLine={`Issued: ${fmtDate(proposal?.issued_on || proposal?.issued)} · Valid Until: ${fmtDate(proposal?.valid_until || proposal?.validUntil || proposal?.expires)}`}
        />
        <View style={styles.bottomRule} fixed />
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