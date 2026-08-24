import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config/api.ts";
import AssemblyTemplateHint from "../../components/AssemblyTemplateHint.tsx";

type AssetOption = {
  assetId: number;
  equipmentNumber: string;
  assetType: string;
  serialNumber: string;
  status: string;
  location: string;
  partNumber: string;
  partName: string;
};

type SubAssetRecord = AssetOption & {
  subAssetId: number;
  parentAssetId: number;
  childAssetId: number;
  depth?: number;
};

type AssetTreeResponse = {
  descendants?: unknown[];
};

function mapAsset(row: Record<string, unknown>): AssetOption {
  return {
    assetId: Number(row.asset_id ?? row.assetId ?? row.id) || 0,
    equipmentNumber: String(
      row.equipment_number ?? row.equipmentNumber ?? ""
    ),
    assetType: String(row.asset_type ?? row.assetType ?? ""),
    serialNumber: String(row.serial_number ?? row.serialNumber ?? ""),
    status: String(row.status ?? ""),
    location: String(row.location ?? row.location_path ?? ""),
    partNumber: String(row.part_number ?? row.partNumber ?? ""),
    partName: String(row.part_name ?? row.partName ?? ""),
  };
}

function mapRelationship(row: Record<string, unknown>): SubAssetRecord {
  return {
    ...mapAsset(row),
    subAssetId: Number(row.sub_asset_id ?? row.subAssetId) || 0,
    parentAssetId: Number(row.parent_asset_id ?? row.parentAssetId) || 0,
    childAssetId: Number(row.child_asset_id ?? row.childAssetId) || 0,
    depth:
      row.depth === undefined || row.depth === null
        ? undefined
        : Number(row.depth),
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(text || "The server returned an invalid response.");
  }
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    return String(record.error ?? record.message ?? record.details ?? fallback);
  }
  return fallback;
}

export default function AssetHierarchyCard({ assetId }: { assetId: number }) {
  const navigate = useNavigate();
  const [subAssets, setSubAssets] = useState<SubAssetRecord[]>([]);
  const [parents, setParents] = useState<SubAssetRecord[]>([]);
  const [descendants, setDescendants] = useState<SubAssetRecord[]>([]);
  const [assetOptions, setAssetOptions] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [savingAssetId, setSavingAssetId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const loadHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [subResponse, parentResponse, treeResponse, assetsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/assets/${assetId}/sub-assets`),
          fetch(`${API_BASE}/assets/${assetId}/used-in`),
          fetch(`${API_BASE}/assets/${assetId}/asset-tree`),
          fetch(`${API_BASE}/assets`),
        ]);

      const [subData, parentData, treeData, assetsData] = await Promise.all([
        readJson(subResponse),
        readJson(parentResponse),
        readJson(treeResponse),
        readJson(assetsResponse),
      ]);

      const responses = [subResponse, parentResponse, treeResponse, assetsResponse];
      const payloads = [subData, parentData, treeData, assetsData];
      const failedIndex = responses.findIndex((response) => !response.ok);

      if (failedIndex >= 0) {
        throw new Error(
          getErrorMessage(payloads[failedIndex], "Failed to load asset hierarchy.")
        );
      }

      setSubAssets(
        Array.isArray(subData)
          ? subData.map((row) => mapRelationship(row as Record<string, unknown>))
          : []
      );
      setParents(
        Array.isArray(parentData)
          ? parentData.map((row) => mapRelationship(row as Record<string, unknown>))
          : []
      );

      const tree = treeData as AssetTreeResponse;
      const mappedDescendants = Array.isArray(tree.descendants)
        ? tree.descendants.map((row) => mapRelationship(row as Record<string, unknown>))
        : [];
      setDescendants(mappedDescendants);
      setExpanded(new Set(mappedDescendants.map((item) => item.parentAssetId)));
      setAssetOptions(
        Array.isArray(assetsData)
          ? assetsData
              .map((row) => mapAsset(row as Record<string, unknown>))
              .filter((asset) => asset.assetId > 0)
          : []
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load asset hierarchy."
      );
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHierarchy();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHierarchy]);

  const candidateAssets = useMemo(() => {
    const assignedIds = new Set(subAssets.map((item) => item.childAssetId));
    const query = search.trim().toLowerCase();

    return assetOptions.filter((asset) => {
      if (asset.assetId === assetId || assignedIds.has(asset.assetId)) return false;
      if (!query) return true;

      return [
        asset.equipmentNumber,
        asset.serialNumber,
        asset.assetType,
        asset.partNumber,
        asset.partName,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [assetId, assetOptions, search, subAssets]);

  async function addSubAsset(childAssetId: number) {
    try {
      setSavingAssetId(childAssetId);
      setError("");
      const response = await fetch(`${API_BASE}/assets/${assetId}/sub-assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_asset_id: childAssetId }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to add sub-asset."));
      }

      setShowAdd(false);
      setSearch("");
      await loadHierarchy();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to add sub-asset."
      );
    } finally {
      setSavingAssetId(null);
    }
  }

  async function removeSubAsset(record: SubAssetRecord) {
    if (!window.confirm(`Remove ${record.equipmentNumber} from this asset?`)) return;

    try {
      setRemovingId(record.subAssetId);
      setError("");
      const response = await fetch(
        `${API_BASE}/assets/${assetId}/sub-assets/${record.subAssetId}`,
        { method: "DELETE" }
      );
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Failed to remove sub-asset."));
      }

      await loadHierarchy();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove sub-asset."
      );
    } finally {
      setRemovingId(null);
    }
  }

  function assetSummary(asset: AssetOption) {
    const details = [asset.assetType, asset.serialNumber, asset.status].filter(Boolean);
    return details.join(" · ") || "No additional asset details";
  }

  const childrenByParent = useMemo(() => {
    const result = new Map<number, SubAssetRecord[]>();
    descendants.forEach((record) => {
      const children = result.get(record.parentAssetId) ?? [];
      children.push(record);
      result.set(record.parentAssetId, children);
    });
    return result;
  }, [descendants]);

  function toggleTree(assetIdToToggle: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(assetIdToToggle)) next.delete(assetIdToToggle); else next.add(assetIdToToggle);
      return next;
    });
  }

  function renderTree(parentId: number, depth = 0): React.ReactNode {
    return (childrenByParent.get(parentId) ?? []).map((record) => {
      const children = childrenByParent.get(record.childAssetId) ?? [];
      const isExpanded = expanded.has(record.childAssetId);
      return (
        <div className="part-tree-branch" key={`${record.subAssetId}-${depth}`}>
          <div className="part-tree-node" style={{ "--tree-depth": depth } as React.CSSProperties}>
            <button type="button" className="part-tree-expander" disabled={children.length === 0} onClick={() => toggleTree(record.childAssetId)} aria-label={isExpanded ? "Collapse sub-assets" : "Expand sub-assets"}>
              {children.length === 0 ? <span className="part-tree-dot" /> : isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
            </button>
            <button type="button" className="part-tree-link" onClick={() => navigate(`/assets/${record.childAssetId}`)}>
              <span>{record.equipmentNumber}</span><strong>{record.partName || record.assetType || "Unnamed asset"}</strong>
            </button>
            <span className="part-tree-quantity">{record.status || "Unknown"}</span>
          </div>
          {children.length > 0 && isExpanded && renderTree(record.childAssetId, depth + 1)}
        </div>
      );
    });
  }

  return (
    <>
      <section className="asset-details-card part-hierarchy-card card">
        <div className="part-hierarchy-heading">
          <div><span className="section-icon"><Network size={18} /></span><div><h2>Asset hierarchy</h2><p>Every physical asset nested beneath this asset.</p></div></div>
          <span className="hierarchy-count">{descendants.length} nested</span>
        </div>
        {loading ? <p className="empty-detail mt-3">Loading hierarchy…</p> : descendants.length === 0 ? <p className="empty-detail mt-3">This asset does not contain nested assets.</p> : <div className="part-tree" role="tree">{renderTree(assetId)}</div>}
      </section>

      <section className="asset-details-card card">
        <div className="asset-card-header">
          <div>
            <h2>Sub-Assets</h2>
            <p>Physical assets directly contained in this asset.</p>
          </div>
          <button
            type="button"
            className="primary-action btn btn-dark"
            onClick={() => setShowAdd(true)}
          >
            + Add Sub-Asset
          </button>
        </div>

        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        {loading ? (
          <p className="empty-detail mt-3">Loading asset hierarchy...</p>
        ) : subAssets.length === 0 ? (
          <p className="empty-detail mt-3">No sub-assets have been assigned.</p>
        ) : (
          <div className="list-group list-group-flush mt-3">
            {subAssets.map((record) => (
              <div
                className="list-group-item d-flex align-items-center justify-content-between gap-3 px-0"
                key={record.subAssetId}
              >
                <button
                  type="button"
                  className="btn btn-link text-start text-decoration-none p-0"
                  onClick={() => navigate(`/assets/${record.childAssetId}`)}
                >
                  <strong className="d-block">{record.equipmentNumber}</strong>
                  <span className="small text-body-secondary">
                    {assetSummary(record)}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  disabled={removingId === record.subAssetId}
                  onClick={() => void removeSubAsset(record)}
                >
                  {removingId === record.subAssetId ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="asset-details-card card">
        <div className="asset-card-header">
          <div>
            <h2>Used In</h2>
            <p>Parent assets that contain this asset.</p>
          </div>
        </div>

        {parents.length === 0 ? (
          <p className="empty-detail mt-3">This asset is not used in another asset.</p>
        ) : (
          <div className="list-group list-group-flush mt-3">
            {parents.map((record) => (
              <button
                type="button"
                className="list-group-item list-group-item-action px-0"
                key={record.subAssetId}
                onClick={() => navigate(`/assets/${record.parentAssetId}`)}
              >
                <strong className="d-block">{record.equipmentNumber}</strong>
                <span className="small text-body-secondary">
                  {assetSummary(record)}
                </span>
              </button>
            ))}
          </div>
        )}

      </section>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div
            className="add-part-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-sub-asset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="add-sub-asset-title">Add Sub-Asset</h2>
                <p>Select an existing asset to place beneath this asset.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close add sub-asset dialog"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>
            </div>

            <AssemblyTemplateHint kind="asset" />

            <input
              className="form-control my-3"
              value={search}
              placeholder="Search equipment number, serial, part, or type..."
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />

            <div className="list-group overflow-auto" style={{ maxHeight: 420 }}>
              {candidateAssets.map((candidate) => (
                <button
                  type="button"
                  className="list-group-item list-group-item-action d-flex justify-content-between gap-3"
                  key={candidate.assetId}
                  disabled={savingAssetId !== null}
                  onClick={() => void addSubAsset(candidate.assetId)}
                >
                  <span className="text-start">
                    <strong className="d-block">{candidate.equipmentNumber}</strong>
                    <span className="small text-body-secondary">
                      {assetSummary(candidate)}
                    </span>
                  </span>
                  <span>{savingAssetId === candidate.assetId ? "Adding..." : "Add"}</span>
                </button>
              ))}
              {candidateAssets.length === 0 && (
                <div className="list-group-item text-body-secondary">
                  No eligible assets match this search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
