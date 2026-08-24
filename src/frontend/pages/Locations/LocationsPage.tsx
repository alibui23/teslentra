import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import Navbar from "../../components/Navbar.tsx";
import { API_ORIGIN as API_URL } from "../../config/api.ts";
import {
  normalizeAssetStatus,
  statusLabel,
  getRequestedLocationId,
  getLocationAncestorIds
} from "./Locations.model.ts";
import type {
  Location,
  Asset,
  LocationForm
} from "./Locations.model.ts";

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );

  const [expandedLocationIds, setExpandedLocationIds] = useState<Set<number>>(
    () => new Set<number>()
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<LocationForm>({
    name: "",
    parentId: "",
  });

  function updateLocationUrl(locationId: number) {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("locationId", String(locationId));

    window.history.replaceState({}, "", url);
  }

  function expandLocationPath(
    locationId: number,
    sourceLocations: Location[] = locations
  ) {
    const ancestorIds = getLocationAncestorIds(
      locationId,
      sourceLocations
    );

    setExpandedLocationIds((current) => {
      const next = new Set(current);

      ancestorIds.forEach((ancestorId) => {
        next.add(ancestorId);
      });

      return next;
    });
  }

  function selectLocation(
    locationId: number,
    sourceLocations: Location[] = locations
  ) {
    setSelectedLocationId(locationId);

    setForm((current) => ({
      ...current,
      parentId: String(locationId),
    }));

    expandLocationPath(locationId, sourceLocations);
    updateLocationUrl(locationId);
  }

  function toggleLocation(locationId: number) {
    setExpandedLocationIds((current) => {
      const next = new Set(current);

      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }

      return next;
    });
  }

  function navigateToAssetDetail(assetId: number) {
    /*
      Asset detail route.

      If your app uses a different route, this is the only line
      that needs to change.

      Example current route:
      /assets/123
    */
    window.location.href = `/assets/${assetId}`;
  }

  function handleAssetRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    assetId: number
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToAssetDetail(assetId);
    }
  }

  async function fetchLocations() {
    const response = await fetch(`${API_URL}/api/locations`);
    const responseText = await response.text();

    let data: any = [];

    try {
      data = responseText ? JSON.parse(responseText) : [];
    } catch {
      throw new Error(responseText || "Invalid locations response");
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.details ||
          data.message ||
          "Failed to retrieve locations"
      );
    }

    if (!Array.isArray(data)) {
      throw new Error("Locations response was not an array");
    }

    const mappedLocations: Location[] = data
      .map((location: any) => ({
        location_id: Number(location.location_id) || 0,

        parent_location_id:
          location.parent_location_id === null ||
          location.parent_location_id === undefined ||
          location.parent_location_id === ""
            ? null
            : Number(location.parent_location_id),

        location_name: String(
          location.location_name ?? ""
        ).trim(),

        location_path: String(
          location.location_path ??
            location.location_name ??
            ""
        ).trim(),
      }))
      .filter(
        (location) =>
          location.location_id > 0 &&
          location.location_name !== "" &&
          location.location_path !== ""
      );

    setLocations(mappedLocations);

    const requestedLocationId = getRequestedLocationId();

    const requestedLocationExists =
      requestedLocationId !== null &&
      mappedLocations.some(
        (location) =>
          location.location_id === requestedLocationId
      );

    /*
      If the page was opened from an asset detail page with:
      /locations?locationId=123
      select that location and expand all parents leading to it
    */
    if (requestedLocationExists && requestedLocationId !== null) {
      setSelectedLocationId(requestedLocationId);

      setForm((current) => ({
        ...current,
        parentId: String(requestedLocationId),
      }));

      const ancestorIds = getLocationAncestorIds(
        requestedLocationId,
        mappedLocations
      );

      setExpandedLocationIds((current) => {
        const next = new Set(current);

        ancestorIds.forEach((ancestorId) => {
          next.add(ancestorId);
        });

        return next;
      });

      return mappedLocations;
    }

    setSelectedLocationId((current) => {
      if (
        current !== null &&
        mappedLocations.some(
          (location) => location.location_id === current
        )
      ) {
        return current;
      }

      const firstTopLevel = mappedLocations.find(
        (location) =>
          location.parent_location_id === null
      );

      return (
        firstTopLevel?.location_id ??
        mappedLocations[0]?.location_id ??
        null
      );
    });

    /*
      Open top-level locations initially.
      Users can collapse them afterward.
    */
    setExpandedLocationIds((current) => {
      if (current.size > 0) {
        return current;
      }

      const next = new Set<number>();

      mappedLocations
        .filter(
          (location) =>
            location.parent_location_id === null
        )
        .forEach((location) => {
          next.add(location.location_id);
        });

      return next;
    });

    return mappedLocations;
  }

  async function fetchAssets() {
    try {
      const response = await fetch(`${API_URL}/api/assets`);
      const responseText = await response.text();

      let data: any = [];

      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch {
        throw new Error(
          responseText || "Invalid assets response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            data.message ||
            "Failed to retrieve assets."
        );
      }

      if (!Array.isArray(data)) {
        setAssets([]);
        return;
      }

      const mappedAssets: Asset[] = data.map(
        (asset: any) => ({
          asset_id: Number(asset.asset_id) || 0,
          asset_tag: asset.asset_tag || "",
          part_number: asset.part_number || "",
          part_name: asset.part_name || "",

          status: normalizeAssetStatus(
            asset.status
          ),

          location_id:
            asset.location_id === null ||
            asset.location_id === undefined ||
            asset.location_id === ""
              ? null
              : Number(asset.location_id),

          location:
            asset.location === null ||
            asset.location === undefined
              ? null
              : String(asset.location),
        })
      );

      setAssets(mappedAssets);
    } catch (error) {
      console.error(
        "Error fetching assets:",
        error
      );

      setAssets([]);
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      await Promise.all([
        fetchLocations(),
        fetchAssets(),
      ]);
    } catch (error) {
      console.error(
        "Error loading locations:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load locations."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          location.location_id === selectedLocationId
      ) ?? null,
    [locations, selectedLocationId]
  );

  const selectedAssets = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }

    return assets.filter((asset) => {
      if (asset.location_id !== null) {
        return (
          asset.location_id ===
          selectedLocation.location_id
        );
      }

      return (
        asset.location ===
        selectedLocation.location_path
      );
    });
  }, [assets, selectedLocation]);

  const selectedChildren = useMemo(() => {
    if (selectedLocationId === null) {
      return [];
    }

    return locations.filter(
      (location) =>
        location.parent_location_id ===
        selectedLocationId
    );
  }, [locations, selectedLocationId]);

  const locationPathPreview = useMemo(() => {
    const locationName = form.name.trim();

    if (!locationName) {
      return "";
    }

    if (!form.parentId) {
      return locationName;
    }

    const parentLocation = locations.find(
      (location) =>
        location.location_id ===
        Number(form.parentId)
    );

    return parentLocation
      ? `${parentLocation.location_path} / ${locationName}`
      : locationName;
  }, [
    form.name,
    form.parentId,
    locations,
  ]);

  function getChildren(
    parentId: number | null
  ) {
    return locations.filter(
      (location) =>
        location.parent_location_id === parentId
    );
  }

  function renderLocationBranch(
    parentId: number | null,
    depth = 0,
    visited = new Set<number>()
  ): ReactNode {
    return getChildren(parentId).map(
      (location) => {
        if (
          visited.has(location.location_id)
        ) {
          return null;
        }

        const nextVisited = new Set(visited);

        nextVisited.add(
          location.location_id
        );

        const children = getChildren(
          location.location_id
        );

        const hasChildren =
          children.length > 0;

        const isSelected =
          location.location_id ===
          selectedLocationId;

        const isExpanded =
          expandedLocationIds.has(
            location.location_id
          );

        return (
          <div key={location.location_id}>
            <button
              type="button"
              className={
                isSelected
                  ? "location-tree-item location-tree-item--selected"
                  : "location-tree-item"
              }
              style={{
                paddingLeft: `${
                  14 + depth * 20
                }px`,
              }}
              aria-expanded={
                hasChildren
                  ? isExpanded
                  : undefined
              }
              onClick={() => {
                selectLocation(
                  location.location_id
                );

                if (hasChildren) {
                  toggleLocation(
                    location.location_id
                  );
                }
              }}
            >
              <span
                className="location-tree-marker"
                aria-hidden="true"
              >
                {hasChildren
                  ? isExpanded
                    ? "▾"
                    : "▸"
                  : "•"}
              </span>

              <span>
                {location.location_name}
              </span>
            </button>

            {hasChildren &&
              isExpanded &&
              renderLocationBranch(
                location.location_id,
                depth + 1,
                nextVisited
              )}
          </div>
        );
      }
    );
  }

  async function handleAddLocation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

    const locationName =
      form.name.trim();

    const parentLocationId =
      form.parentId
        ? Number(form.parentId)
        : null;

    if (!locationName) {
      setMessage(
        "Location name is required."
      );

      return;
    }

    if (
      parentLocationId !== null &&
      (!Number.isInteger(
        parentLocationId
      ) ||
        parentLocationId <= 0)
    ) {
      setMessage(
        "Invalid parent location."
      );

      return;
    }

    const parentLocation =
      parentLocationId === null
        ? null
        : locations.find(
            (location) =>
              location.location_id ===
              parentLocationId
          ) ?? null;

    if (
      parentLocationId !== null &&
      !parentLocation
    ) {
      setMessage(
        "The selected parent location does not exist."
      );

      return;
    }

    const expectedPath =
      parentLocation
        ? `${parentLocation.location_path} / ${locationName}`
        : locationName;

    const duplicatePath =
      locations.some(
        (location) =>
          location.location_path
            .trim()
            .toLowerCase() ===
          expectedPath.toLowerCase()
      );

    if (duplicatePath) {
      setMessage(
        `Location "${expectedPath}" already exists.`
      );

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/locations`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            location_name:
              locationName,

            parent_location_id:
              parentLocationId,
          }),
        }
      );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          error: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            data.message ||
            "Failed to add location."
        );
      }

      const refreshedLocations =
        await fetchLocations();

      const newLocationId =
        Number(
          data.location_id ??
            data.locationId
        ) || null;

      if (newLocationId !== null) {
        selectLocation(
          newLocationId,
          refreshedLocations
        );

        /*
          Expand the newly created location's
          parent branch automatically.
        */
        expandLocationPath(
          newLocationId,
          refreshedLocations
        );
      }

      setForm({
        name: "",

        parentId:
          newLocationId !== null
            ? String(newLocationId)
            : parentLocationId !== null
              ? String(
                  parentLocationId
                )
              : "",
      });

      setShowAddForm(false);

      setMessage(
        `Location "${
          data.location_path ||
          expectedPath
        }" was added.`
      );
    } catch (error) {
      console.error(
        "Error adding location:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to add location."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="locations-layout">
        <Navbar />

        <main className="locations-page container-fluid">
          <div className="location-message">
            Loading locations...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="locations-layout">
      <Navbar />

      <main className="locations-page container-fluid">
        <header className="locations-header">
          <div>
            <h2>Locations</h2>
            <p>
              Browse the storage hierarchy and see which assets are
              stored in each location
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setShowAddForm(
                (current) => !current
              );

              if (selectedLocation) {
                setForm((current) => ({
                  ...current,

                  parentId: String(
                    selectedLocation.location_id
                  ),
                }));
              }
            }}
          >
            {showAddForm
              ? "Close"
              : "+ Add Location"}
          </button>
        </header>

        {message && (
          <div
            className="location-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        {showAddForm && (
          <section className="location-card add-location-card card">
            <div className="section-heading">
              <div>
                <h2>Add Location</h2>

                <p>
                  Create a top-level location or place it
                  underneath an existing location
                </p>
              </div>
            </div>

            <form
              className="location-form"
              onSubmit={
                handleAddLocation
              }
            >
              <div className="location-form-grid">
                <div className="form-field">
                  <label htmlFor="location-name">
                    Location name
                  </label>

                  <input
                    id="location-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          name: event
                            .target
                            .value,
                        })
                      )
                    }
                    placeholder="Enter location name (e.g. Shelf 3)"
                    autoComplete="off"
                  />
                </div>

                <div className="form-field form-field--wide">
                  <label htmlFor="parent-location">
                    Parent location
                  </label>

                  <select
                    id="parent-location"
                    value={form.parentId}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          parentId:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      No parent location (top level)
                    </option>

                    {locations.map(
                      (location) => (
                        <option
                          key={
                            location.location_id
                          }
                          value={
                            location.location_id
                          }
                        >
                          {
                            location.location_path
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-field form-field--wide">
                  <label>
                    Location path
                  </label>

                  <input
                    type="text"
                    value={
                      locationPathPreview
                    }
                    readOnly
                    disabled
                  />

                  <small>
                    Enter location name and select parent location to generate
                    a location path
                  </small>
                </div>
              </div>

              <div className="location-form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setShowAddForm(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Location"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="locations-browser">
          <aside className="location-tree-panel">
            <div className="section-heading">
              <div>
                <h2>Location Tree</h2>

                <p>
                  {locations.length}{" "}
                  {locations.length === 1
                    ? "location"
                    : "locations"}
                </p>
              </div>
            </div>

            <div className="location-tree">
              {locations.length > 0 ? (
                renderLocationBranch(
                  null
                )
              ) : (
                <p className="empty-detail">
                  No locations have been created
                </p>
              )}
            </div>
          </aside>

          <section className="location-details-panel">
            {selectedLocation ? (
              <>
                <div className="selected-location-heading">
                  <div>
                    <span className="selected-location-label">
                      Selected location
                    </span>

                    <h2>
                      {
                        selectedLocation.location_name
                      }
                    </h2>
                  </div>

                  <span className="location-barcode-badge">
                    {selectedLocation.parent_location_id ===
                    null
                      ? "Top level"
                      : "Nested location"}
                  </span>
                </div>

                <div className="location-detail-grid">
                  <div className="detail-item">
                    <span>
                      Full path
                    </span>

                    <strong>
                      {
                        selectedLocation.location_path
                      }
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>Parent</span>

                    <strong>
                      {selectedLocation.parent_location_id ===
                      null
                        ? "Top level"
                        : locations.find(
                            (
                              location
                            ) =>
                              location.location_id ===
                              selectedLocation.parent_location_id
                          )
                            ?.location_path ??
                          "Unknown"}
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>
                      Child locations
                    </span>

                    <strong>
                      {
                        selectedChildren.length
                      }
                    </strong>
                  </div>

                  <div className="detail-item">
                    <span>
                      Assets here
                    </span>

                    <strong>
                      {
                        selectedAssets.length
                      }
                    </strong>
                  </div>
                </div>

                <div className="assets-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        Assets in this location
                      </h2>

                      <p>
                        Physical asset units assigned
                        directly to{" "}
                        {
                          selectedLocation.location_path
                        }
                      </p>
                    </div>
                  </div>

                  <div className="asset-table-wrapper">
                    <table className="asset-table table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>
                            Equipment Number 
                          </th>

                          <th>
                            Part Number
                          </th>

                          <th>
                            Part
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedAssets.length ===
                        0 ? (
                          <tr>
                            <td
                              className="empty-assets"
                              colSpan={4}
                            > No assets are stored in this location
                            </td>
                          </tr>
                        ) : (
                          selectedAssets.map(
                            (asset) => (
                              <tr
                                key={
                                  asset.asset_id
                                }
                                role="link"
                                tabIndex={
                                  0
                                }
                                title="View asset details"
                                onClick={() =>
                                  navigateToAssetDetail(
                                    asset.asset_id
                                  )
                                }
                                onKeyDown={(
                                  event
                                ) =>
                                  handleAssetRowKeyDown(
                                    event,
                                    asset.asset_id
                                  )
                                }
                                style={{
                                  cursor:
                                    "pointer",
                                }}
                              >
                                <td className="asset-tag-cell">
                                  {
                                    asset.asset_tag
                                  }
                                </td>

                                <td>
                                  {asset.part_number ||
                                    "—"}
                                </td>

                                <td>
                                  {asset.part_name ||
                                    "—"}
                                </td>

                                <td>
                                  <span
                                    className={`asset-status asset-status--${asset.status.replace(
                                      /_/g,
                                      "-"
                                    )}`}
                                  >
                                    {statusLabel(
                                      asset.status
                                    )}
                                  </span>
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-location-selected">
                Select a location from the tree
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
