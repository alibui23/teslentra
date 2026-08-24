import type { CSSProperties } from "react";
import { API_BASE } from "../../config/api.ts";

export const CONTEXT_TAG_ENDPOINT =
  `${API_BASE}/context_tag`;

export const TAG_COLOR_STORAGE_KEY =
  "asset-context_tag-color";

export type AssetStatus =
  | "Available"
  | "Disposed"
  | "In Use"
  | "Out On Job"
  | "Reserved"
  | "Retired";

export type AssetDetailsData = {
  id: number;
  equipmentNumber: string;
  assetType: string;
  partId: number;
  partNumber: string;
  partName: string;
  serialNumber: string;
  price: number | null;
  status: AssetStatus;
  locationId: number | null;
  locationPath: string;
  hasOpenCheckout: boolean;
  isOverdue: boolean;
};

export type AssetListRow = {
  id: number;
  partId: number;
};

export type PartOption = {
  id: number;
  partNumber: string;
  partName: string;
  supplierNumber: string;
  price: number | null;
};

export type AssetTypeOption = {
  assetTypeName: string;
};

export type ContextTag = {
  contextTagId: number;
  assetId: number;
  name: string;
};

export type LocationOption = {
  locationId: number;
  parentLocationId:
    number | null;
  locationName: string;
  locationPath: string;
};

export type CheckoutHistoryRow = {
  id: number;
  holder: string;
  checkedOutAt:
    string | null;
  dueBack:
    string | null;
  returnedAt:
    string | null;
  returnLocation: string;
  notes: string;
};

export type EditAssetForm = {
  partId: string;
  assetType: string;
  serialNumber: string;
  price: string;
  status: AssetStatus;
  locationId: string;
};

export const emptyEditForm: EditAssetForm = {
  partId: "",
  assetType: "",
  serialNumber: "",
  price: "",
  status: "Available",
  locationId: "",
};

export const TAG_COLOR_PALETTE = [
  {
    backgroundColor: "#DBEAFE",
    color: "#1E3A8A",
    borderColor: "#93C5FD",
  },
  {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    borderColor: "#86EFAC",
  },
  {
    backgroundColor: "#FCE7F3",
    color: "#9D174D",
    borderColor: "#F9A8D4",
  },
  {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderColor: "#FCD34D",
  },
  {
    backgroundColor: "#EDE9FE",
    color: "#5B21B6",
    borderColor: "#C4B5FD",
  },
  {
    backgroundColor: "#CFFAFE",
    color: "#155E75",
    borderColor: "#67E8F9",
  },
  {
    backgroundColor: "#FFEDD5",
    color: "#9A3412",
    borderColor: "#FDBA74",
  },
  {
    backgroundColor: "#F1F5F9",
    color: "#334155",
    borderColor: "#CBD5E1",
  },
];

export const contextTagChipContainerStyle:
  CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  };

export const contextTagPickerStyle:
  CSSProperties = {
    position: "relative",
    width: "100%",
  };

export const contextTagDropdownStyle:
  CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    zIndex: 80,
    maxHeight: 220,
    overflowY: "auto",
    padding: 8,
    border:
      "1px solid #d0d5dd",
    borderRadius: 8,
    background: "#fff",
    boxShadow:
      "0 10px 28px rgba(15, 23, 42, 0.14)",
  };

export const contextTagOptionStyle:
  CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "8px 9px",
    border: 0,
    borderRadius: 6,
    background: "transparent",
    color: "#101828",
    textAlign: "left",
    cursor: "pointer",
  };

export function normalizeTagKey(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

export function cleanTagName(
  value: string
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

export function loadStoredTagColors():
  Record<string, number> {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const stored =
      window.localStorage.getItem(
        TAG_COLOR_STORAGE_KEY
      );

    if (!stored) {
      return {};
    }

    const parsed =
      JSON.parse(stored);

    return parsed &&
      typeof parsed ===
        "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function randomTagColorIndex() {
  return Math.floor(
    Math.random() *
      TAG_COLOR_PALETTE.length
  );
}

export function normalizeStatus(
  value: unknown
): AssetStatus {
  const status =
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");

  switch (status) {
    case "disposed":
      return "Disposed";

    case "in_use":
      return "In Use";

    case "out_on_job":
    case "checked_out":
      return "In Use";

    case "reserved":
      return "Reserved";

    case "retired":
      return "Retired";

    default:
      return "Available";
  }
}

export function toDatabaseStatus(
  status: AssetStatus
) {
  return status
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function parsePrice(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

export function formatPrice(
  value: number | null
) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(value);
}

export function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

export function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
}

export async function readResponse(
  response: Response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      text ||
        "Invalid response from server."
    );
  }
}
