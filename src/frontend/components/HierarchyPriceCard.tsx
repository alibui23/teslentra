import { useEffect, useState } from "react";
import { Calculator, PencilLine } from "lucide-react";
import { API_BASE } from "../config/api.ts";

type Props = { kind: "part" | "asset"; id: number; basePrice: number | null };

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function HierarchyPriceCard({ kind, id, basePrice }: Props) {
  const [mode, setMode] = useState<"automatic" | "manual">("automatic");
  const [automaticTotal, setAutomaticTotal] = useState(0);
  const [manualDraft, setManualDraft] = useState("");
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; label: string; quantity: number; price: number }>>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        const endpoint = kind === "part" ? `${API_BASE}/parts/${id}/part-tree` : `${API_BASE}/assets/${id}/asset-tree`;
        const response = await fetch(endpoint);
        const data = await response.json();
        const rows = kind === "part" ? data.components : data.descendants;
        const calculatedItems = Array.isArray(rows) ? rows.map((row: Record<string, unknown>, index: number) => {
          const price = Number(row.price) || 0;
          const quantity = kind === "part" ? Number(row.quantity) || 1 : 1;
          return { id: String(row.sub_part_id ?? row.sub_asset_id ?? `${index}`), label: String(kind === "part" ? `${row.part_number ?? "Component"} — ${row.part_name ?? "Unnamed"}` : `${row.equipment_number ?? "Asset"} — ${row.part_name ?? row.asset_type ?? "Unnamed"}`), quantity, price };
        }) : [];
        const total = calculatedItems.reduce((sum: number, item: { quantity: number; price: number }) => sum + item.price * item.quantity, 0);
        setItems(calculatedItems);
        setAutomaticTotal(total);
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [id, kind]);

  function applyManualTotal() {
    const value = Number(manualDraft);
    if (!Number.isFinite(value) || value < 0) {
      alert("Enter a valid non-negative total.");
      return;
    }
    if (!window.confirm(`Use ${money(value)} as the displayed manual total?\n\nThis number is temporary and will not be saved to the database.`)) return;
    setManualTotal(value);
  }

  const displayedTotal = mode === "automatic" ? automaticTotal : manualTotal;
  return (
    <section className="hierarchy-price-card card">
      <div className="hierarchy-price-heading"><div><span className="section-icon">{mode === "automatic" ? <Calculator size={18} /> : <PencilLine size={18} />}</span><div><h2>Hierarchy price total</h2><p>Choose a calculated total or a temporary manual display.</p></div></div><strong>{loading && mode === "automatic" ? "Calculating…" : displayedTotal === null ? "Not applied" : money(displayedTotal)}</strong></div>
      <div className="price-mode-selector" role="group" aria-label="Price total mode"><button type="button" className={mode === "automatic" ? "active" : ""} onClick={() => setMode("automatic")}>Automatic</button><button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>Manual</button></div>
      {mode === "automatic" ? <div><p className="price-mode-note">Calculated from every nested {kind === "part" ? "component price multiplied by its quantity" : "sub-asset price"}. Base item price: {basePrice === null ? "not set" : money(basePrice)}.</p><div className="price-breakdown">{items.length === 0 ? <p>No priced nested records are available.</p> : items.map((item) => <div key={item.id}><span><strong>{item.label}</strong><small>{money(item.price)} each{item.quantity > 1 ? ` × ${item.quantity}` : ""}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}</div></div> : <div className="manual-price-row"><input type="number" min="0" step="0.01" value={manualDraft} onChange={(event) => setManualDraft(event.target.value)} placeholder="Enter temporary total" /><button type="button" onClick={applyManualTotal}>Apply Total</button><small>Manual totals remain in this page session and are not saved to MySQL. Automatic context includes {items.length} nested {items.length === 1 ? "record" : "records"}.</small></div>}
    </section>
  );
}
