import { useEffect, useState } from "react";
import { Boxes, ChevronRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config/api.ts";

type AssignedAsset = { id: number; equipmentNumber: string; assetType: string; serialNumber: string; status: string; location: string };

export default function AssignedAssetsCard({ partId }: { partId: number }) {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/assets`);
        const data = await response.json();
        setAssets(Array.isArray(data) ? data.filter((row) => Number(row.part_id ?? row.partId) === partId).map((row) => ({
          id: Number(row.asset_id ?? row.assetId), equipmentNumber: String(row.equipment_number ?? row.equipmentNumber ?? ""), assetType: String(row.asset_type ?? row.assetType ?? ""), serialNumber: String(row.serial_number ?? row.serialNumber ?? ""), status: String(row.status ?? "available").replaceAll("_", " "), location: String(row.location_path ?? row.location ?? ""),
        })) : []);
      } finally { setLoading(false); }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [partId]);

  return <section className="part-details-card assigned-assets-card card">
    <div className="part-hierarchy-heading"><div><span className="section-icon"><Boxes size={18} /></span><div><h2>Assigned assets</h2><p>Physical inventory created from this part.</p></div></div><span className="hierarchy-count">{assets.length} assigned</span></div>
    {loading ? <p className="empty-detail mt-3">Loading assigned assets…</p> : assets.length === 0 ? <p className="empty-detail mt-3">No assets are currently assigned to this part.</p> : <div className="assigned-asset-list">{assets.map((asset) => <button type="button" key={asset.id} onClick={() => navigate(`/assets/${asset.id}`)}><span className="assigned-asset-icon"><Boxes size={17} /></span><span><strong>{asset.equipmentNumber}</strong><small>{[asset.assetType, asset.serialNumber && `Serial ${asset.serialNumber}`, asset.status].filter(Boolean).join(" · ")}</small>{asset.location && <small><MapPin size={11} /> {asset.location}</small>}</span><ChevronRight size={18} /></button>)}</div>}
  </section>;
}
