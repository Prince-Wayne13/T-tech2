// path: src/components/TablePDF.jsx
//
// Generic tabular PDF export for "register"-style pages — Today's To-Do
// List, Audit Log, and anywhere else that was previously downloading an
// HTML file via utils/downloads.js and calling it a PDF (it wasn't; it just
// opened window.print()). Reuses @react-pdf/renderer, already proven in
// InvoicePDF.jsx, so these downloads are real, portable .pdf files that open
// the same everywhere rather than depending on a browser's print dialog.
//
// Landscape A4, since register pages tend to have 6-10 narrow columns —
// portrait (InvoicePDF's orientation) would force text-wrapping on every row.

import React from 'react';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';

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
};

const styles = StyleSheet.create({
  page: { fontSize: 8.5, color: C.text, backgroundColor: C.white, paddingHorizontal: 32, paddingVertical: 0 },
  topRule: { height: 3, backgroundColor: C.steel },
  bottomRule: { height: 3, backgroundColor: C.slate },
  body: { paddingHorizontal: 6, paddingTop: 20, paddingBottom: 16 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  brandName: { fontSize: 13, fontWeight: 700, color: C.navy },
  brandSub: { fontSize: 8, color: C.mutedDark, marginTop: 2 },
  titleBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 13, fontWeight: 700, color: C.navy },
  docMeta: { fontSize: 8, color: C.mutedDark, marginTop: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginBottom: 12 },

  tableWrap: { borderRadius: 4, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: C.slate, paddingHorizontal: 8, paddingVertical: 7 },
  tableHeaderText: { color: C.white, fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.slate100 },
  tableRowAlt: { backgroundColor: '#fafbfc' },
  cellText: { fontSize: 7.5, color: C.text },

  emptyRow: { padding: 16, textAlign: 'center' },
  emptyText: { fontSize: 8.5, color: C.muted, textAlign: 'center' },

  footer: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 10, paddingTop: 8 },
  footerText: { fontSize: 6.5, color: C.muted, textAlign: 'center' },
});

const fmtDate = value => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// columns: [{ label, flex, align: 'left'|'right'|'center', render: row => string }]
function TableDocument({ title, subtitle, columns, rows, generatedNote }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topRule} fixed />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brandName}>T-Tech Printing</Text>
              <Text style={styles.brandSub}>Area 47, Lilongwe</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.docTitle}>{title}</Text>
              <Text style={styles.docMeta}>{subtitle || fmtDate()}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              {columns.map(col => (
                <Text key={col.label} style={[styles.tableHeaderText, { flex: col.flex || 1, textAlign: col.align || 'left' }]}>
                  {col.label}
                </Text>
              ))}
            </View>
            {rows.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No records for this export.</Text>
              </View>
            )}
            {rows.map((row, index) => (
              <View key={row.__key || index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]} wrap={false}>
                {columns.map(col => (
                  <Text key={col.label} style={[styles.cellText, { flex: col.flex || 1, textAlign: col.align || 'left' }]}>
                    {col.render ? col.render(row) : (row[col.key] ?? '-')}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{generatedNote || `Generated ${fmtDate()} - T-Tech Print Dashboard`}</Text>
          </View>
        </View>
        <View style={styles.bottomRule} fixed />
      </Page>
    </Document>
  );
}

export async function downloadTablePDF({ title, subtitle, columns, rows, filename, generatedNote }) {
  const blob = await pdf(<TableDocument title={title} subtitle={subtitle} columns={columns} rows={rows} generatedNote={generatedNote} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${(title || 'export').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default TableDocument;
