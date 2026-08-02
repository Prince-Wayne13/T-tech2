// path: src/utils/downloads.js
//
// Build decision #12: Print removed entirely - every place that used to
// trigger the browser's Print dialog now downloads a real PDF instead, via
// InvoicePDF.jsx/TablePDF.jsx (@react-pdf/renderer). downloadPreviewPdf()/
// recordToPdfHtml() (the print-popup helpers previously here) and the
// unused downloadJson()/downloadText()/openDownload() exports have been
// removed - shareText() is the only thing in this file anything still
// imports.

export async function shareText(title, text) {
  if (navigator.share) {
    await navigator.share({ title, text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
