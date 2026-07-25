import { useState } from "react"
import { TTechLogo } from "./TTechLogo"

type LineItem = {
  id: string
  description: string
  qty: number
  unit: string
  rate: number
}

type QuotationData = {
  quotationRef: string
  issueDate: string
  validUntil: string
  estimateDetails: string
  clientName: string
  clientAddress: string
  clientPhone: string
  projectTitle: string
  notes: string
  items: LineItem[]
  vatEnabled: boolean
  discount: number
}

const VAT_RATE = 0.165

const fmt = (n: number) =>
  `MK ${n.toLocaleString("en-MW", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const fmtDate = (s: string) => {
  if (!s) return "-"
  const d = new Date(s)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const DEFAULT_ITEMS: LineItem[] = [
  { id: "1", description: "Full Colour Brochure — A4, 8 Pages, Gloss (500 copies)", qty: 500, unit: "copies", rate: 3200 },
  { id: "2", description: "Banner Printing — 6ft × 3ft Vinyl", qty: 4, unit: "banners", rate: 28000 },
  { id: "3", description: "Business Cards — 400gsm, Matt Laminate, Both Sides", qty: 1000, unit: "cards", rate: 350 },
]

export default function QuotationDocument() {
  const [data, setData] = useState<QuotationData>({
    quotationRef: "QT-2026-001",
    issueDate: "2026-07-25",
    validUntil: "2026-08-24",
    estimateDetails: "30 Days",
    clientName: "Lilongwe City Council",
    clientAddress: "P.O. Box 67, Lilongwe, Malawi",
    clientPhone: "+265 1 753 600",
    projectTitle: "Corporate Branding & Print Package",
    notes:
      "50% deposit required to commence production. Balance due upon delivery. Prices valid for 30 days. Final artwork must be supplied in PDF/X-1a at 300 dpi.",
    items: DEFAULT_ITEMS,
    vatEnabled: true,
    discount: 0,
  })

  const set = <K extends keyof QuotationData>(key: K, value: QuotationData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }))

  const setItem = (id: string, field: keyof LineItem, value: string | number) =>
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))

  const addItem = () =>
    setData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now().toString(), description: "", qty: 1, unit: "item", rate: 0 },
      ],
    }))

  const removeItem = (id: string) =>
    setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))

  const subtotal = data.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const discountAmt = data.discount
  const taxable = Math.max(subtotal - discountAmt, 0)
  const vat = data.vatEnabled ? taxable * VAT_RATE : 0
  const total = taxable + vat

  return (
    <div className="quotation-root">
      {/* ── TOOLBAR ── */}
      <div className="no-print flex items-center justify-between gap-3 px-6 py-2.5 bg-[#2d3748] text-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <TTechLogo size={28} />
          <span className="text-xs font-semibold tracking-wide text-white/80">Quotation Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set("vatEnabled", !data.vatEnabled)}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
              data.vatEnabled
                ? "bg-[#4a6882] border-[#4a6882] text-white"
                : "border-white/20 text-white/50 hover:border-white/40"
            }`}
          >
            VAT 16.5%: {data.vatEnabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-1.5 rounded bg-[#4a6882] hover:bg-[#3d5870] text-white text-xs font-semibold transition"
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 1v7.5M3.5 6l3 3 3-3M1.5 10.5h10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download / Print PDF
          </button>
        </div>
      </div>

      {/* ── PAGE WRAPPER ── */}
      <div className="doc-page-bg bg-[#e8ecf0] min-h-screen py-10 px-4 flex justify-center print:bg-white print:py-0 print:block">
        <div className="doc-page bg-white w-full max-w-[794px] shadow-lg print:shadow-none flex flex-col">
          {/* Top rule */}
          <div className="h-[3px] bg-[#4a6882]" />

          <div className="flex flex-col gap-6 px-10 pt-8 pb-6 flex-1">
            {/* ── HEADER ── */}
            <div className="flex justify-between items-start gap-4">
              {/* Left — branding */}
              <div className="flex items-start gap-3">
                <TTechLogo size={52} />
                <div>
                  <p className="font-black text-[#2d3748] text-[16px] leading-tight tracking-tight">
                    T-TECH SUPPLIERS &amp;
                    <br />
                    GENERAL DEALERS LTD
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Digital Printing &amp; Binding Services
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">MRA TIN: 1002345678</p>
                </div>
              </div>

              {/* Right — document badge + meta */}
              <div className="text-right shrink-0">
                <div className="inline-block bg-[#2d3748] text-white text-[20px] font-black px-5 py-2 tracking-[0.18em]">
                  QUOTATION
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: "Quotation No.", field: "quotationRef" as const },
                    { label: "Estimate Details", field: "estimateDetails" as const },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center justify-end gap-2">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">
                        {label}
                      </span>
                      <input
                        value={data[field] as string}
                        onChange={(e) => set(field, e.target.value)}
                        className="bg-transparent border-none outline-none text-right text-[11px] font-bold text-[#2d3748] w-32"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">Issue Date</span>
                    <input
                      type="date"
                      value={data.issueDate}
                      onChange={(e) => set("issueDate", e.target.value)}
                      className="bg-transparent border-none outline-none text-right text-[11px] font-bold text-[#2d3748] w-28"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">Valid Until</span>
                    <input
                      type="date"
                      value={data.validUntil}
                      onChange={(e) => set("validUntil", e.target.value)}
                      className="bg-transparent border-none outline-none text-right text-[11px] font-bold text-[#2d3748] w-28"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── DIVIDER ── */}
            <div className="border-t border-slate-300" />

            {/* ── PROJECT TITLE ── */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1">
                Project / Proposal Title
              </p>
              <input
                value={data.projectTitle}
                onChange={(e) => set("projectTitle", e.target.value)}
                placeholder="Enter project title"
                className="bg-transparent border-none outline-none font-bold text-[#2d3748] text-[15px] w-full"
              />
            </div>

            {/* ── PREPARED FOR + PREPARED BY ── */}
            <div className="flex gap-6">
              <div className="flex-1 border border-slate-200 p-4 bg-[#f9fafb]">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2">
                  Prepared For
                </p>
                <input
                  value={data.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="Client / Organisation Name"
                  className="bg-transparent border-none outline-none font-bold text-[#2d3748] text-[14px] w-full block mb-1"
                />
                <input
                  value={data.clientAddress}
                  onChange={(e) => set("clientAddress", e.target.value)}
                  placeholder="Address"
                  className="bg-transparent border-none outline-none text-[11px] text-slate-600 w-full block mb-0.5"
                />
                <input
                  value={data.clientPhone}
                  onChange={(e) => set("clientPhone", e.target.value)}
                  placeholder="Phone"
                  className="bg-transparent border-none outline-none text-[11px] text-slate-500 w-full block"
                />
              </div>

              <div className="flex-1 text-right flex flex-col justify-start pt-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">Prepared By</p>
                <p className="font-bold text-[#2d3748] text-[13px] leading-snug">
                  T-TECH SUPPLIERS &amp;
                  <br />
                  GENERAL DEALERS LTD
                </p>
                <p className="text-[11px] text-slate-500 mt-1">+265 988 231 291</p>
                <p className="text-[11px] text-slate-500">ttechsuppliers@gmail.com</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Lilongwe, City Mall</p>
                <p className="text-[10px] text-slate-400">Standard Bank Corridor</p>
              </div>
            </div>

            {/* ── ITEMS TABLE ── */}
            <div>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#3d4f5c] text-white">
                    <th className="text-left py-2.5 px-3 font-semibold text-[9px] uppercase tracking-wider w-7">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-[9px] uppercase tracking-wider">
                      Service / Item Description
                    </th>
                    <th className="text-center py-2.5 px-2 font-semibold text-[9px] uppercase tracking-wider w-16">Qty</th>
                    <th className="text-center py-2.5 px-2 font-semibold text-[9px] uppercase tracking-wider w-16">Unit</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-[9px] uppercase tracking-wider w-28">Rate (MK)</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-[9px] uppercase tracking-wider w-28">Amount (MK)</th>
                    <th className="no-print w-7 bg-[#3d4f5c]" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => {
                    const amt = item.qty * item.rate
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            value={item.description}
                            onChange={(e) => setItem(item.id, "description", e.target.value)}
                            placeholder="Service / item description"
                            className="bg-transparent border-none outline-none w-full text-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => setItem(item.id, "qty", Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-center w-full text-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            value={item.unit}
                            onChange={(e) => setItem(item.id, "unit", e.target.value)}
                            className="bg-transparent border-none outline-none text-center w-full text-slate-400 text-[10px]"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.rate}
                            onChange={(e) => setItem(item.id, "rate", Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-right w-full text-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[#2d3748]">{fmt(amt)}</td>
                        <td className="no-print py-2.5 px-1 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            title="Remove row"
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-red-50 text-red-300 hover:bg-red-100 transition"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="no-print mt-2">
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 text-[11px] text-slate-500 border border-dashed border-slate-300 px-3 py-1.5 hover:bg-slate-50 hover:text-slate-700 transition"
                >
                  <span className="text-sm leading-none">+</span> Add Line Item
                </button>
              </div>
            </div>

            {/* ── ESTIMATE TOTALS ── */}
            <div className="flex justify-end">
              <div className="w-68">
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between text-slate-500 gap-16">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-700">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 gap-16 text-[11px]">
                    <span>Discount</span>
                    <input
                      type="number"
                      min="0"
                      value={data.discount}
                      onChange={(e) => set("discount", Number(e.target.value))}
                      className="bg-transparent border-none outline-none text-right text-slate-500 w-32"
                    />
                  </div>
                  {data.vatEnabled && (
                    <div className="flex justify-between text-slate-400 text-[11px] gap-16">
                      <span>VAT (16.5%)</span>
                      <span>{fmt(vat)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white bg-[#3d4f5c] px-3 py-2.5 text-[12px] gap-16">
                    <span>ESTIMATE TOTAL</span>
                    <span>{fmt(total)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 text-right pt-0.5">
                    Valid until {fmtDate(data.validUntil)} · Subject to artwork approval
                  </p>
                </div>
              </div>
            </div>

            {/* ── NOTES / TERMS ── */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5">
                Terms &amp; Notes
              </p>
              <textarea
                value={data.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className="w-full bg-transparent border-none outline-none text-[11px] text-slate-500 resize-none leading-relaxed"
              />
            </div>

            {/* ── AGREE BOX ── */}
            <div className="flex items-center gap-3 border border-slate-200 bg-[#f9fafb] px-5 py-3.5">
              <div className="w-4 h-4 shrink-0 border border-slate-400 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-300" />
              </div>
              <p className="text-[12px] font-semibold text-[#2d3748]">
                Agree and send the agreed advance / deposit
              </p>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="border-t border-slate-200 bg-[#f9fafb] px-10 py-4 mt-auto">
            <p className="text-center text-[10px] font-bold text-[#3d4f5c] uppercase tracking-widest mb-1.5">
              Thank You For Your Business
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-slate-400">
              <span>+265 988 231 291</span>
              <span>ttechsuppliers@gmail.com</span>
              <span>Lilongwe, City Mall — Standard Bank Corridor</span>
            </div>
            <p className="text-center text-[9px] text-slate-300 mt-1.5">
              {data.quotationRef} · Issued: {fmtDate(data.issueDate)} · Valid Until: {fmtDate(data.validUntil)}
            </p>
          </div>

          {/* Bottom rule */}
          <div className="h-[3px] bg-[#3d4f5c]" />
        </div>
      </div>
    </div>
  )
}
