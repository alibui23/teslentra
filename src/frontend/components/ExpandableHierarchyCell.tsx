import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.ts";

type Child = { id: number; reference: string; name: string; quantity: number };

export default function ExpandableHierarchyCell({ kind, id, childCount, parentCount }: { kind: "part" | "asset"; id: number; childCount: number; parentCount: number }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.stopPropagation();
    if (childCount === 0) return;
    const next = !open;
    setOpen(next);
    if (!next || children.length) return;
    try {
      setLoading(true);
      const endpoint = kind === "part" ? `${API_BASE}/parts/${id}/sub-parts` : `${API_BASE}/assets/${id}/sub-assets`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setChildren(Array.isArray(data) ? data.map((row) => ({
        id: Number(kind === "part" ? row.child_part_id ?? row.part_id : row.child_asset_id ?? row.asset_id),
        reference: String(kind === "part" ? row.part_number ?? "" : row.equipment_number ?? ""),
        name: String(kind === "part" ? row.part_name ?? "" : row.part_name ?? row.asset_type ?? ""),
        quantity: kind === "part" ? Number(row.quantity) || 1 : 1,
      })) : []);
    } finally { setLoading(false); }
  }

  return <div className="expandable-hierarchy-cell">
    <button type="button" className="hierarchy-expand-button" onClick={(event) => void toggle(event)} disabled={childCount === 0} aria-expanded={open}>
      {childCount > 0 ? open ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span className="hierarchy-single-dot" />}
      <span>{childCount > 0 ? `${childCount} below` : parentCount > 0 ? `${parentCount} above` : "Single item"}</span>
    </button>
    {parentCount > 0 && childCount > 0 && <small>{parentCount} parent {parentCount === 1 ? "record" : "records"}</small>}
    {open && <div className="nested-catalog-children">{loading ? <span>Loading…</span> : children.map((child) => <button type="button" key={child.id} onClick={(event) => { event.stopPropagation(); navigate(`/${kind === "part" ? "parts" : "assets"}/${child.id}`); }}><span className="nested-connector" aria-hidden="true">└</span><span><strong>{child.reference}</strong><small>{child.name}{child.quantity > 1 ? ` · ×${child.quantity}` : ""}</small></span></button>)}</div>}
  </div>;
}
