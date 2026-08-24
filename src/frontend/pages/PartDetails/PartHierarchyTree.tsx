import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_ORIGIN as API_URL } from "../../config/api.ts";
import { mapSubPartRecord, parseApiResponse } from "./PartDetails.model.ts";
import type { SubPartType } from "./PartDetails.model.ts";

type Props = { partId: number };

function partLabel(part: SubPartType) {
  return `${part.partNumber || "No part number"} — ${part.partName || "Unnamed part"}`;
}

export default function PartHierarchyTree({ partId }: Props) {
  const navigate = useNavigate();
  const [components, setComponents] = useState<SubPartType[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/parts/${partId}/part-tree`);
        const data = await parseApiResponse(response);
        const mapped: SubPartType[] = Array.isArray(data.components) ? data.components.map(mapSubPartRecord) : [];
        setComponents(mapped);
        setExpanded(new Set(mapped.map((item: SubPartType) => item.parentPartId)));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the part hierarchy.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [partId]);

  const childrenByParent = useMemo(() => {
    const result = new Map<number, SubPartType[]>();
    components.forEach((component) => {
      const siblings = result.get(component.parentPartId) ?? [];
      siblings.push(component);
      result.set(component.parentPartId, siblings);
    });
    return result;
  }, [components]);

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderBranch(parentId: number, depth = 0): React.ReactNode {
    return (childrenByParent.get(parentId) ?? []).map((component) => {
      const children = childrenByParent.get(component.partId) ?? [];
      const isExpanded = expanded.has(component.partId);
      return (
        <div key={`${component.subPartId}-${depth}`} className="part-tree-branch">
          <div className="part-tree-node" style={{ "--tree-depth": depth } as React.CSSProperties}>
            <button type="button" className="part-tree-expander" onClick={() => toggle(component.partId)} disabled={children.length === 0} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${partLabel(component)}`}>
              {children.length === 0 ? <span className="part-tree-dot" /> : isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </button>
            <button type="button" className="part-tree-link" onClick={() => navigate(`/parts/${component.partId}`)}>
              <span>{component.partNumber || "No part number"}</span><strong>{component.partName || "Unnamed part"}</strong>
            </button>
            <span className="part-tree-quantity" title="Automatically counted component units">×{component.quantity}</span>
          </div>
          {children.length > 0 && isExpanded && renderBranch(component.partId, depth + 1)}
        </div>
      );
    });
  }

  return (
    <section className="part-details-card part-hierarchy-card card">
      <div className="part-hierarchy-heading">
        <div><span className="section-icon"><Network size={18} /></span><div><h2>Part hierarchy</h2><p>Every component nested beneath this part.</p></div></div>
        <span className="hierarchy-count">{components.length} nested</span>
      </div>
      {loading ? <p className="empty-detail">Loading hierarchy…</p> : error ? <p className="part-details-error">{error}</p> : components.length === 0 ? <p className="empty-detail">This part does not contain nested components.</p> : <div className="part-tree" role="tree">{renderBranch(partId)}</div>}
    </section>
  );
}
