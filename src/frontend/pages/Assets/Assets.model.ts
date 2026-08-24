import type { CSSProperties } from "react";
import { API_BASE } from "../../config/api.ts";

export const CONTEXT_TAG_ENDPOINT = `${API_BASE}/context_tag`;
export const TAG_COLOR_STORAGE_KEY = "asset-context_tag-color";
export type AssetStatus = "Available" | "Disposed" | "In Use" | "Out On Job" | "Reserved" | "Retired";
export type Asset = {
    id: number;
    partId: number;
    partNumber: string;
    partName: string;
    equipmentNumber: string;
    assetType: string;
    serialNumber: string;
    price: number | null;
    status: AssetStatus;
    locationPath: string;
    commentCount: number;
    directSubAssetCount: number;
    usedInCount: number;
    hasOpenCheckout: boolean;
    isOverdue: boolean;
};
export type AssetComment = {
    commentId: number;
    assetId: number;
    commentText: string;
    createdAt: string;
    updatedAt: string;
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
    parentLocationId: number | null;
    locationName: string;
    locationPath: string;
};
export type NewAssetForm = {
    partId: string;
    assetType: string;
    serialNumber: string;
    price: string;
    status: AssetStatus;
    locationId: string;
};
export const emptyAssetForm: NewAssetForm = {
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
export const tagSelectorWrapperStyle: CSSProperties = {
    position: "relative",
    minWidth: 220,
};
export const tagSelectorButtonStyle: CSSProperties = {
    minHeight: 38,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
};
export const tagDropdownStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    zIndex: 80,
    width: 300,
    maxWidth: "min(360px, 90vw)",
    maxHeight: 330,
    overflowY: "auto",
    padding: 10,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.16)",
};
export const tagSearchInputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 8,
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
};
export const tagOptionStyle: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 6px",
    border: 0,
    borderRadius: 6,
    background: "transparent",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
};
export const tagChipContainerStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
};
export const compactHeaderStyle: CSSProperties = {
    padding: "8px 5px",
    fontSize: 11,
    lineHeight: 1.15,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    verticalAlign: "middle",
};
export const compactCellStyle: CSSProperties = {
    padding: "8px 5px",
    fontSize: 12,
    lineHeight: 1.2,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    verticalAlign: "middle",
};
export function normalizeTagKey(value: string) {
    return value
        .trim()
        .toLowerCase();
}
export function cleanTagName(value: string) {
    return value
        .trim()
        .replace(/\s+/g, " ");
}
export function loadStoredTagColors(): Record<string, number> {
    if (typeof window ===
        "undefined") {
        return {};
    }
    try {
        const stored = window.localStorage.getItem(TAG_COLOR_STORAGE_KEY);
        if (!stored) {
            return {};
        }
        const parsed = JSON.parse(stored);
        return parsed &&
            typeof parsed ===
                "object"
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
export function randomTagColorIndex() {
    return Math.floor(Math.random() *
        TAG_COLOR_PALETTE.length);
}
export function formatAssetStatus(value: unknown): AssetStatus {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
    switch (normalized) {
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
export function toDatabaseStatus(status: AssetStatus) {
    return status
        .toLowerCase()
        .replace(/\s+/g, "_");
}
export function parsePrice(value: unknown): number | null {
    if (value === undefined ||
        value === null ||
        value === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? parsed
        : null;
}
export function formatPrice(value: number | null) {
    if (value === null) {
        return "—";
    }
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}
export function formatPartOption(part: PartOption) {
    return `${part.partNumber} — ${part.partName} — Supplier Number: ${part.supplierNumber || "—"} — Part Price: ${formatPrice(part.price)}`;
}
export function formatCommentDate(value: string) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}
export function commentWasEdited(comment: AssetComment) {
    if (!comment.createdAt ||
        !comment.updatedAt) {
        return false;
    }
    const created = new Date(comment.createdAt).getTime();
    const updated = new Date(comment.updatedAt).getTime();
    if (Number.isNaN(created) ||
        Number.isNaN(updated)) {
        return (comment.createdAt !==
            comment.updatedAt);
    }
    return updated > created;
}
export async function readResponse(response: Response) {
    const responseText = await response.text();
    if (!responseText) {
        return {};
    }
    try {
        return JSON.parse(responseText);
    }
    catch {
        throw new Error(responseText ||
            "Invalid response from server.");
    }
}
export function extractCreatedAssetId(data: any) {
    return (Number(data?.asset_id ??
        data?.assetId ??
        data?.id ??
        data?.asset
            ?.asset_id ??
        data?.asset?.id ??
        data?.insertId) || 0);
}
