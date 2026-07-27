import React from 'react';
import { calculateTotal } from '../utils/calculateTotal';
import { shortDate } from '../utils/format';

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

const normaliseItems = data => {
  if (Array.isArray(data?.items) && data.items.length) {
    return data.items.map(item => ({
      desc: item.desc || item.description || 'Print item',
      qty: item.qty || item.quantity || 1,
      rate: item.rate || item.unit_price || (item.amount && !item.qty && !item.quantity ? item.amount : 0),
      amount: item.amount,
    }));
  }
  if (Array.isArray(data?.line_items) && data.line_items.length) {
    return data.line_items.map(item => ({
      desc: item.description || item.name || 'Print item',
      qty: item.quantity || 1,
      rate: item.unit_price || item.rate || (item.amount && !item.quantity ? item.amount : 0),
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
  const items = normaliseItems(data);
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
          <div><strong>Prepared For:</strong> {data.client || data.client_name || '-'}</div>
          <div><strong>Valid Until:</strong> {data.validUntil || data.valid_until || data.expires || '-'}</div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#2D3748', marginBottom: '8px' }}>{data.title || 'Proposal Title'}</div>
          <div style={{ fontSize: '11px', color: '#4A5568', lineHeight: 1.5 }}>{data.notes || 'Scope of work and pricing breakdown as discussed.'}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead><tr><th>Service / Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {items.map((item, index) => {
              const amount = Number(item.amount ?? Number(item.qty || 1) * Number(item.rate || 0));
              return <tr key={index}><td>{item.desc}</td><td style={{ textAlign: 'center' }}>{item.qty || 1}</td><td style={{ textAlign: 'right' }}>{asMoney(item.rate)}</td><td style={{ textAlign: 'right' }}>{asMoney(amount)}</td></tr>;
            })}
          </tbody>
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
  const items = normaliseItems(data.invoice || data);
  const subtotal = calculateTotal(items);
  const discount = Number(data.discount ?? data.discount_amount ?? data.invoice?.discount_amount ?? 0);
  const total = data.totals?.total ?? data.invoice?.totals?.total ?? Math.max(subtotal - discount, 0);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '640px', margin: '0 auto', padding: '24px', background: '#fff', borderRadius: '14px', boxShadow: '0 18px 50px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#6B8E7B' }}>JOB PREVIEW</div>
          <div style={{ fontSize: '11px', color: '#8B9BB0', marginTop: '4px' }}>#{data.id || data.job_ref || 'JOB-0000'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', fontSize: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#8B9BB0' }}>Client</span>
            <strong style={{ textAlign: 'right' }}>{data.client || data.client_name || '-'}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#8B9BB0' }}>Due</span>
            <strong style={{ textAlign: 'right' }}>{data.due || data.due_date || '-'}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#8B9BB0' }}>Priority</span>
            <strong style={{ textAlign: 'right', textTransform: 'capitalize' }}>{data.priority || 'medium'}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#8B9BB0' }}>Specs</span>
            <strong style={{ textAlign: 'right' }}>{data.specs?.join(', ') || `${data.pages || 0} pages, ${data.copies || 1} copies`}</strong>
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#8B9BB0', marginBottom: '10px' }}>Services</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 0', borderBottom: 'none', color: '#8B9BB0' }}>Service</th>
              <th style={{ textAlign: 'center', padding: '10px 0', borderBottom: 'none', color: '#8B9BB0', width: '60px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 0', borderBottom: 'none', color: '#8B9BB0', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const amount = Number(item.amount ?? Number(item.qty || 1) * Number(item.rate || 0));
              return (
                <tr key={index}>
                  <td style={{ padding: '12px 0', borderBottom: '1px solid #F1F4F8', color: '#2D3748' }}>{item.desc || item.description || 'Service'}</td>
                  <td style={{ padding: '12px 0', textAlign: 'center', borderBottom: '1px solid #F1F4F8' }}>{item.qty || 1}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid #F1F4F8', fontWeight: 600, color: '#2D3748' }}>{asMoney(amount)}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '16px 0', textAlign: 'center', color: '#8B9BB0' }}>No services added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ display: 'grid', gap: '8px', justifyContent: 'end', fontSize: '10px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8B9BB0' }}>Subtotal</span><strong>{asMoney(subtotal)}</strong></div>
          {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8B9BB0' }}>Discount</span><strong>-{asMoney(discount)}</strong></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#6B8E7B' }}><span>Total</span><strong>{asMoney(total)}</strong></div>
        </div>
        <div style={{ padding: '14px', background: '#F7FAFC', borderRadius: '10px', fontSize: '10px', color: '#4A5568', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Notes</div>
          <div>{data.notes || 'None'}</div>
        </div>
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
          <div style={{ fontSize: '10px', color: '#8B9BB0' }}>Generated on {shortDate(new Date())}</div>
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

// Item 3 (flagged gap, fixed this pass): dedicated print layout for the
// Month-End Materials Reconciliation report (services/reports.py's
// build_materials_reconciliation()). Not squeezed into the generic
// ReportPrintLayout above - that layout's fixed 4-column shape (name/
// category/amount/status) would silently drop most of this report's real
// columns (opening/purchased/consumed/closing/output produced/count
// variance). Every other bespoke print layout in this file (Invoice,
// Proposal, JobTicket) is purpose-built the same way, so this follows that
// existing convention rather than forcing a bad fit into the generic one.
export function MaterialsReconciliationPrintLayout({ data }) {
  if (!data) return null;
  const rows = Array.isArray(data.materials) ? data.materials : [];
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="print-layout" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '1000px', margin: '0 auto', padding: '30px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3A506B' }}>Materials - Month-End Reconciliation</div>
          <div style={{ fontSize: '10px', color: '#8B9BB0' }}>
            {data.period_start && data.period_end ? `${shortDate(data.period_start)} - ${shortDate(data.period_end)}` : data.month}
          </div>
          <div style={{ fontSize: '9px', color: '#8B9BB0', marginTop: '4px' }}>{data.formula}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Material</th>
              <th style={{ textAlign: 'right' }}>Opening</th>
              <th style={{ textAlign: 'right' }}>Purchased</th>
              <th style={{ textAlign: 'right' }}>Consumed</th>
              <th style={{ textAlign: 'right' }}>Adjusted</th>
              <th style={{ textAlign: 'right' }}>Closing</th>
              <th>Output Produced</th>
              <th style={{ textAlign: 'right' }}>Count Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const outputEntries = Object.entries(row.output_produced || {});
              const variance = row.physical_count_check?.variance;
              return (
                <tr key={row.material_id}>
                  <td>{row.name}<div style={{ fontSize: '9px', color: '#8B9BB0' }}>{row.material_ref}</div></td>
                  <td style={{ textAlign: 'right' }}>{Number(row.opening_stock || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>+{Number(row.purchased || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>-{Number(row.consumed || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{Number(row.adjusted || 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(row.closing_stock || 0).toLocaleString()} {row.unit}</td>
                  <td>{outputEntries.length === 0 ? '-' : outputEntries.map(([label, qty]) => `${Number(qty).toLocaleString()} ${label}`).join(', ')}</td>
                  <td style={{ textAlign: 'right' }}>{row.physical_count_check ? `${variance >= 0 ? '+' : ''}${Number(variance).toLocaleString()}` : 'Not counted'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data.flags?.count_variance?.length > 0 || data.flags?.unreconciled_count?.length > 0) && (
          <div style={{ marginTop: '20px', fontSize: '10px', color: '#8B9BB0', borderTop: '1px solid #E5E8ED', paddingTop: '12px' }}>
            {data.flags?.count_variance?.length > 0 && <div>Count variance: {data.flags.count_variance.join(', ')}</div>}
            {data.flags?.unreconciled_count?.length > 0 && <div>Not yet counted this month: {data.flags.unreconciled_count.join(', ')}</div>}
          </div>
        )}
      </div>
    </>
  );
}

export function PrintPreviewModal({ type, title, data, onClose, actions }) {
  if (!data) return null;
  const Layout = type === 'proposal' ? ProposalPrintLayout : type === 'job' ? JobTicketPrintLayout : type === 'materials_reconciliation' ? MaterialsReconciliationPrintLayout : type === 'report' ? ReportPrintLayout : InvoicePrintLayout;
  const reportRows = Array.isArray(data.rows) ? data.rows : [];

  // `actions` lets a caller (e.g. Jobs.jsx) inject its own quick-action
  // buttons into the preview header, so "Preview -> Edit" doesn't require
  // closing this shared modal first. Optional and type-agnostic: invoice/
  // proposal/report previews simply don't pass it and get the old header.
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '18px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <section className="card no-print" style={{ width: 'min(920px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderTop: '2px solid var(--primary)' }} onClick={event => event.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">{title || 'Preview'}</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {actions}
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