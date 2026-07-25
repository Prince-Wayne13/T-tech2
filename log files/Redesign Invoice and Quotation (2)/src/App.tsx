import { useState } from "react"
import InvoiceDocument from "./components/InvoiceDocument"
import QuotationDocument from "./components/QuotationDocument"
import { TTechLogo } from "./components/TTechLogo"

type Tab = "invoice" | "quotation"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("invoice")

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── TAB NAV (hidden on print) ── */}
      <nav className="no-print bg-white border-b border-slate-200">
        <div className="flex items-center gap-0 px-6">
          <div className="flex items-center gap-2.5 py-3 pr-8 border-r border-slate-200 mr-2">
            <TTechLogo size={28} />
            <div>
              <p className="text-[11px] font-black text-[#2d3748] leading-none tracking-tight">
                T-TECH SUPPLIERS
              </p>
              <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">
                Document Studio
              </p>
            </div>
          </div>

          {(
            [
              { id: "invoice", label: "Invoice", icon: "🧾" },
              { id: "quotation", label: "Quotation / Proposal", icon: "📋" },
            ] as { id: Tab; label: string; icon: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3.5 text-[12px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-[#2d3748]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4a6882]" />
              )}
            </button>
          ))}

          <div className="ml-auto py-3">
            <span className="text-[10px] text-slate-400">
              Click any field to edit &nbsp;·&nbsp; Use "Download / Print PDF" to export
            </span>
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      {activeTab === "invoice" ? <InvoiceDocument /> : <QuotationDocument />}
    </div>
  )
}
