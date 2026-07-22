import React from 'react';
import { downloadInvoicePDF } from './InvoicePDF';
import { calculateTotal } from '../utils/calculateTotal';

const businessDefault = {
  name: 'T-Tech Printing',
  tin: '1002345678',
  address: 'Area 47, Lilongwe',
  phone: '+265 1 234 567',
};

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    .print-layout, .print-layout * { visibility: visible; }
    .print-layout {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: #fff !important;
      color: #2D3748 !important;
      padding: 20px !important;
    }
    .no-print { display: none !important; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid #E5E8ED;
      text-align: left;
      font-size: 11px;
    }
    th { font-weight: 600; color: #4A5568; background: #F8F9FB; }
  }
`;

const asMoney = value => `MK ${Number(value || 0).toLocaleString()}`;

function layoutToHtml(type, title, data) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  if (type === 'job') {
    return `<div class="top"><div><h1>T-Tech Printing</h1><div>Production Ticket</div></div><div><strong>${escape(data.job_ref || data.id || 'JOB')}</strong></div></div>
      <div class="kv"><div class="label">Client</div><div>${escape(data.client_name || data.client || '-')}</div></div>
      <div class="kv"><div class="label">Title</div><div>${escape(data.title)}</div></div>
      <div class="kv"><div class="label">Machine</div><div>${escape(data.machine_name || data.printer || data.service_category || '-')}</div></div>
      <div class="kv"><div class="label">Due</div><div>${escape(data.due_date || data.due || '-')}</div></div>
      <div class="kv"><div class="label">Status</div><div>${escape(data.status || 'queued')}</div></div>
      <h2>Notes</h2><p>${escape(data.notes || 'None')}</p>`;
  }
  const items = normaliseItems(data);
  const rows = items.map(item => `<tr><td>${escape(item.desc)}</td><td>${escape(item.qty || 1)}</td><td>${asMoney(item.rate)}</td><td>${asMoney(item.amount ?? Number(item.qty || 1) * Number(item.rate || 0))}</td></tr>`).join('');
  return `<div class="top"><div><h1>T-Tech Printing</h1><div>Area 47, Lilongwe</div></div><div><strong>${escape(title || type || 'Document')}</strong><br/>${escape(data.invoice_ref || data.id || '')}</div></div>
    <div class="kv"><div class="label">Client</div><div>${escape(data.client_name || data.client || '-')}</div></div>
    <div class="kv"><div class="label">Title</div><div>${escape(data.title || '-')}</div></div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="amount">${asMoney(calculateTotal(items))}</div>
    <h2>Notes</h2><p>${escape(data.notes || 'Thank you for your business.')}</p>`;
}

function openPdfWindow(type, title, data) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${title || 'T-Tech document'}</title><style>
    body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; }
    .doc { max-width: 820px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; border-bottom: 2px solid #3A506B; padding-bottom: 14px; margin-bottom: 22px; }
    h1 { color: #3A506B; font-size: 20px; margin: 0 0 4px; }
    h2 { color: #3A506B; font-size: 15px; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f8fafc; color: #475569; }
    .kv { display: grid; grid-template-columns: 150px 1fr; gap: 8px; font-size: 12px; margin: 6px 0; }
    .label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    .amount { font-size: 18px; font-weight: 800; color: #3A506B; text-align: right; margin-top: 16px; }
    @media print { body { padding: 0; } }
  </style></head><body><div class="doc">${layoutToHtml(type, title, data)}</div><script>window.onload = () => window.print();</script></body></html>`);
  popup.document.close();
}

const normaliseItems = data => {
  if (Array.isArray(data?.items) && data.items.length) return data.items;
  if (Array.isArray(data?.line_items) && data.line_items.length) {
    return data.line_items.map(item => ({
      desc: item.description || item.name || 'Print item',
      qty: item.quantity || 1,
      rate: item.unit_price || item.rate || 0,
      amount: item.amount || item.line_total,
    }));
  }
  return [{ desc: data?.title || 'Print service', qty: 1, rate: 0 }];
};

export function InvoicePrintLayout({ data, business = businessDefault }) {
  if (!data) return null;
  const items = normaliseItems(data);
  const subtotal = calculateTotal(items);
  const discount = Number(data.discount_amount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const vat = Number(data.vat ?? data.tax ?? taxable * 0.165);
  const total = taxable + vat;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '30px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #3A506B', paddingBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#3A506B', marginBottom: '4px' }}>{business.name}</div>
            <div style={{ fontSize: '10px', color: '#8B9BB0' }}>MRA TIN: {business.tin}</div>
            <div style={{ fontSize: '10px', color: '#8B9BB0' }}>{business.address}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#3A506B', marginBottom: '4px' }}>INVOICE</div>
            <div style={{ fontSize: '11px', color: '#4A5568' }}>#{data.id || data.invoice_ref || 'INV-0000'}</div>
            <div style={{ fontSize: '10px', color: '#8B9BB0' }}>Date: {data.date || data.issued || '-'}</div>
            <div style={{ fontSize: '10px', color: '#8B9BB0' }}>Due: {data.due || '-'}</div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#8B9BB0', textTransform: 'uppercase', marginBottom: '4px' }}>Bill To</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2D3748' }}>{data.client || data.client_name || 'Client Name'}</div>
          <div style={{ fontSize: '10px', color: '#4A5568' }}>{data.address || '-'}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead><tr><th>Description</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {items.map((item, index) => {
              const amount = Number(item.amount ?? Number(item.qty || 1) * Number(item.rate || 0));
              return <tr key={index}><td>{item.desc}</td><td style={{ textAlign: 'center' }}>{item.qty || 1}</td><td style={{ textAlign: 'right' }}>{asMoney(item.rate)}</td><td style={{ textAlign: 'right' }}>{asMoney(amount)}</td></tr>;
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}><span>Subtotal</span><span>{asMoney(subtotal)}</span></div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#8B9BB0' }}><span>Discount</span><span>-{asMoney(discount)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: '#8B9BB0' }}><span>VAT</span><span>{asMoney(vat)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#3A506B', borderTop: '1px solid #E5E8ED', paddingTop: '6px' }}><span>Total</span><span>{asMoney(total)}</span></div>
          </div>
        </div>

        <div style={{ fontSize: '10px', color: '#8B9BB0', borderTop: '1px solid #E5E8ED', paddingTop: '16px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Payment Terms & Notes</div>
          <div>{data.notes || 'Payment due within 14 days. Bank transfers preferred. Thank you for your business.'}</div>
        </div>
      </div>
    </>
  );
}

export function ProposalPrintLayout({ data, business = businessDefault }) {
  if (!data) return null;
  const items = data.items?.length ? data.items : (data.line_items?.length ? data.line_items.map(li => ({ desc: li.description, amount: li.amount })) : [{ desc: data.title || 'Proposal item', amount: 0 }]);
  const subtotal = calculateTotal(items);
  const discount = Number(data.discount ?? data.discount_amount ?? 0);
  const total = Math.max(subtotal - discount, 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '30px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #5B7C99', paddingBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#5B7C99' }}>{business.name}</div>
          <div style={{ fontSize: '12px', color: '#4A5568', marginTop: '4px' }}>PROJECT PROPOSAL</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '11px' }}>
          <div><strong>Prepared For:</strong> {data.client || '-'}</div>
          <div><strong>Valid Until:</strong> {data.validUntil || data.expires || '-'}</div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#2D3748', marginBottom: '8px' }}>{data.title || 'Proposal Title'}</div>
          <div style={{ fontSize: '11px', color: '#4A5568', lineHeight: 1.5 }}>{data.notes || 'Scope of work and pricing breakdown as discussed.'}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead><tr><th>Service / Item</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={index}><td>{item.desc}</td><td style={{ textAlign: 'right' }}>{asMoney(item.amount)}</td></tr>)}</tbody>
        </table>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginBottom: '30px' }}>
          {discount > 0 && (
            <>
              <div style={{ fontSize: '11px', color: '#8B9BB0' }}>Subtotal: {asMoney(subtotal)}</div>
              <div style={{ fontSize: '11px', color: '#8B9BB0' }}>Discount: -{asMoney(discount)}</div>
            </>
          )}
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#5B7C99' }}>Total Estimate: {asMoney(total)}</div>
        </div>
        <div style={{ fontSize: '10px', color: '#8B9BB0', borderTop: '1px solid #E5E8ED', paddingTop: '16px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Terms</div>
          <div>50% deposit required to commence work. Balance due upon delivery. Prices valid for 30 days.</div>
        </div>
      </div>
    </>
  );
}

export function JobTicketPrintLayout({ data }) {
  if (!data) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '420px', margin: '0 auto', padding: '20px', background: '#fff', border: '2px dashed #6B8E7B' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#6B8E7B' }}>PRODUCTION TICKET</div>
          <div style={{ fontSize: '12px', color: '#4A5568' }}>#{data.id || data.job_ref || 'JOB-0000'}</div>
        </div>
        <div style={{ marginBottom: '12px', padding: '10px', background: '#F1F4F8', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#2D3748', marginBottom: '2px' }}>{data.client || data.client_name || '-'}</div>
          <div style={{ fontSize: '12px', color: '#4A5568' }}>{data.title || 'Job Title'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', marginBottom: '16px' }}>
          <div><strong>Due:</strong> {data.due || data.due_date || '-'}</div>
          <div><strong>Priority:</strong> {data.priority || 'medium'}</div>
          <div><strong>Printer:</strong> {data.printer || data.machine_name || '-'}</div>
          <div><strong>Status:</strong> {data.status || 'queued'}</div>
        </div>
        <div style={{ fontSize: '10px', marginBottom: '8px' }}><strong>Specs:</strong> {data.specs?.join(', ') || `${data.pages || 0} pages, ${data.copies || 1} copies`}</div>
        <div style={{ fontSize: '10px', padding: '8px', border: '1px solid #E5E8ED', borderRadius: '4px', minHeight: '40px' }}><strong>Notes:</strong> {data.notes || 'None'}</div>
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '9px', color: '#8B9BB0' }}>T-Tech Printing Solutions - Area 47, Lilongwe - {businessDefault.phone}</div>
      </div>
    </>
  );
}

export function ReportPrintLayout({ title, rows = [], footer }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '30px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3A506B' }}>{title || 'Report'}</div>
          <div style={{ fontSize: '10px', color: '#8B9BB0' }}>Generated on {new Date().toLocaleDateString()}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Item</th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'center' }}>Status</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}><td>{row.name}</td><td>{row.cat || row.category || '-'}</td><td style={{ textAlign: 'right' }}>{asMoney(row.amount || row.revenue)}</td><td style={{ textAlign: 'center' }}>{row.status || '-'}</td></tr>)}</tbody>
        </table>
        {footer && <div style={{ marginTop: '24px', fontSize: '10px', color: '#8B9BB0', borderTop: '1px solid #E5E8ED', paddingTop: '12px' }}>{footer}</div>}
      </div>
    </>
  );
}

export function PrintPreviewModal({ type, title, data, onClose }) {
  if (!data) return null;
  const Layout = type === 'proposal' ? ProposalPrintLayout : type === 'job' ? JobTicketPrintLayout : type === 'report' ? ReportPrintLayout : InvoicePrintLayout;
  const reportRows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <section className="card no-print" style={{ width: 'min(920px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderTop: '2px solid var(--primary)' }} onClick={event => event.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">{title || 'Preview'}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="filter-btn" onClick={() => type === 'invoice' ? downloadInvoicePDF(data) : openPdfWindow(type, title, data)}>Download PDF</button>
            <button className="filter-btn" onClick={() => window.print()}>Print</button>
            <button className="filter-btn active" onClick={onClose}>Close</button>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', overflow: 'auto' }}>
          {type === 'report' ? <Layout title={data.title || title} rows={reportRows} footer={data.footer} /> : <Layout data={data} />}
        </div>
      </section>
    </div>
  );
}