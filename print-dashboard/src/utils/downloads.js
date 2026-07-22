export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function shareText(title, text) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

export function openDownload(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function downloadPreviewPdf(title, html) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!popup) return false;
  popup.document.write(`<!doctype html>
    <html>
      <head>
        <title>${title || 'T-Tech document'}</title>
        <style>
          body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #1f2937; background: #fff; }
          .doc { max-width: 820px; margin: 0 auto; }
          .top { display: flex; justify-content: space-between; border-bottom: 2px solid #3A506B; padding-bottom: 14px; margin-bottom: 22px; }
          h1 { color: #3A506B; font-size: 20px; margin: 0 0 4px; }
          h2 { color: #3A506B; font-size: 15px; margin: 18px 0 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f8fafc; color: #475569; }
          .kv { display: grid; grid-template-columns: 180px 1fr; gap: 8px; font-size: 12px; margin: 6px 0; }
          .label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          .amount { font-size: 18px; font-weight: 800; color: #3A506B; text-align: right; margin-top: 16px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body><div class="doc">${html}</div><script>window.onload = () => { window.print(); };</script></body>
    </html>`);
  popup.document.close();
  return true;
}

export function recordToPdfHtml(title, data) {
  const entries = Object.entries(data || {}).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object');
  const rows = entries.map(([key, value]) => `<div class="kv"><div class="label">${key.replaceAll('_', ' ')}</div><div>${String(value)}</div></div>`).join('');
  const nestedTables = Object.entries(data || {})
    .filter(([, value]) => Array.isArray(value) && value.length)
    .map(([key, value]) => {
      const columns = Object.keys(value[0] || {}).slice(0, 6);
      return `<h2>${key.replaceAll('_', ' ')}</h2><table><thead><tr>${columns.map(col => `<th>${col.replaceAll('_', ' ')}</th>`).join('')}</tr></thead><tbody>${value.map(row => `<tr>${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    })
    .join('');
  const generatedOn = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  return `<div class="top"><div><h1>T-Tech Printing</h1><div>Area 47, Lilongwe</div></div><div><strong>${title || 'Record Preview'}</strong><br/>${generatedOn}</div></div>${rows}${nestedTables}`;
}
