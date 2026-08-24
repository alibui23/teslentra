export type Location = {
  location_id: number;
  parent_location_id: number | null;
  location_name: string;
  location_path: string;
};

export type AssetStatus =
  | "available"
  | "disposed"
  | "in_use"
  | "out_on_job"
  | "reserved"
  | "retired";

export type Asset = {
  asset_id: number;
  asset_tag: string;
  part_number: string;
  part_name: string;
  status: AssetStatus;
  location_id: number | null;
  location: string | null;
};

export type LocationForm = {
  name: string;
  parentId: string;
};

export function normalizeAssetStatus(value: unknown): AssetStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  switch (normalized) {
    case "disposed":
      return "disposed";

    case "in_use":
      return "in_use";

    case "out_on_job":
    case "checked_out":
      return "out_on_job";

    case "reserved":
      return "reserved";

    case "retired":
      return "retired";

    case "available":
    case "in_stock":
    default:
      return "available";
  }
}

export function statusLabel(status: AssetStatus) {
  switch (status) {
    case "available":
      return "Available";

    case "disposed":
      return "Disposed";

    case "in_use":
      return "In Use";

    case "out_on_job":
      return "Out On Job";

    case "reserved":
      return "Reserved";

    case "retired":
      return "Retired";
  }
}

export function getRequestedLocationId() {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const rawLocationId = searchParams.get("locationId");

  if (!rawLocationId) {
    return null;
  }

  const locationId = Number(rawLocationId);

  if (!Number.isInteger(locationId) || locationId <= 0) {
    return null;
  }

  return locationId;
}

export function getLocationAncestorIds(
  locationId: number,
  sourceLocations: Location[]
) {
  const locationsById = new Map(
    sourceLocations.map((location) => [location.location_id, location])
  );

  const ancestorIds: number[] = [];
  const visited = new Set<number>();

  let currentLocation = locationsById.get(locationId);

  while (
    currentLocation &&
    currentLocation.parent_location_id !== null &&
    !visited.has(currentLocation.location_id)
  ) {
    visited.add(currentLocation.location_id);

    const parentLocation = locationsById.get(
      currentLocation.parent_location_id
    );

    if (!parentLocation) {
      break;
    }

    ancestorIds.push(parentLocation.location_id);
    currentLocation = parentLocation;
  }

  return ancestorIds;
}
