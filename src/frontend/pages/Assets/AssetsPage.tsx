import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar.tsx";
import ExpandableHierarchyCell from "../../components/ExpandableHierarchyCell.tsx";
import { API_BASE } from "../../config/api.ts";
import {
  CONTEXT_TAG_ENDPOINT,
  TAG_COLOR_STORAGE_KEY,
  emptyAssetForm,
  TAG_COLOR_PALETTE,
  tagSelectorWrapperStyle,
  tagSelectorButtonStyle,
  tagDropdownStyle,
  tagSearchInputStyle,
  tagOptionStyle,
  tagChipContainerStyle,
  compactHeaderStyle,
  compactCellStyle,
  normalizeTagKey,
  cleanTagName,
  loadStoredTagColors,
  randomTagColorIndex,
  formatAssetStatus,
  toDatabaseStatus,
  parsePrice,
  formatPrice,
  formatPartOption,
  formatCommentDate,
  commentWasEdited,
  extractCreatedAssetId,
  readResponse
} from "./Assets.model.ts";
import type {
  AssetStatus,
  Asset,
  AssetComment,
  PartOption,
  AssetTypeOption,
  ContextTag,
  LocationOption,
  NewAssetForm
} from "./Assets.model.ts";

export default function Assets() {
    const navigate = useNavigate();
    const [assets, setAssets,] = useState<Asset[]>([]);
    const [parts, setParts,] = useState<PartOption[]>([]);
    const [locations, setLocations,] = useState<LocationOption[]>([]);
    const [assetTypes, setAssetTypes,] = useState<AssetTypeOption[]>([]);
    const [contextTags, setContextTags,] = useState<ContextTag[]>([]);
    const [tagColorIndexes, setTagColorIndexes,] = useState<Record<string, number>>(loadStoredTagColors);
    const [search, setSearch,] = useState("");
    const [statusFilter, setStatusFilter,] = useState<"All" | AssetStatus>("All");
    const [assetTypeFilter, setAssetTypeFilter,] = useState("All");
    const [structureFilter, setStructureFilter] = useState<"All" | "Assemblies" | "Components" | "Standalone">("All");
    const [selectedTagFilters, setSelectedTagFilters,] = useState<string[]>([]);
    const [tagFilterSearch, setTagFilterSearch,] = useState("");
    const [tagFilterOpen, setTagFilterOpen,] = useState(false);
    const [showAddAsset, setShowAddAsset,] = useState(false);
    const [newAsset, setNewAsset,] = useState<NewAssetForm>({
        ...emptyAssetForm,
    });
    const [partSearch, setPartSearch,] = useState("");
    const [partDropdownOpen, setPartDropdownOpen,] = useState(false);
    const [assetTypeSearch, setAssetTypeSearch,] = useState("");
    const [assetTypeDropdownOpen, setAssetTypeDropdownOpen,] = useState(false);
    const [assetTypeSaving, setAssetTypeSaving,] = useState(false);
    const [newAssetTags, setNewAssetTags,] = useState<string[]>([]);
    const [newAssetTagSearch, setNewAssetTagSearch,] = useState("");
    const [newAssetTagDropdownOpen, setNewAssetTagDropdownOpen,] = useState(false);
    const [newAssetStatusReason, setNewAssetStatusReason] = useState("");
    const [checkoutAfterCreate, setCheckoutAfterCreate] = useState(false);
    const [saving, setSaving,] = useState(false);
    const [updatingAssetStatusId, setUpdatingAssetStatusId,] = useState<number | null>(null);
    const [tagEditorAsset, setTagEditorAsset,] = useState<Asset | null>(null);
    const [tagEditorSearch, setTagEditorSearch,] = useState("");
    const [tagSaving, setTagSaving,] = useState(false);
    const [tagDeletingId, setTagDeletingId,] = useState<number | null>(null);
    const [selectedCommentAsset, setSelectedCommentAsset,] = useState<Asset | null>(null);
    const [comments, setComments,] = useState<AssetComment[]>([]);
    const [commentsLoading, setCommentsLoading,] = useState(false);
    const [commentSaving, setCommentSaving,] = useState(false);
    const [commentError, setCommentError,] = useState("");
    const [newCommentText, setNewCommentText,] = useState("");
    const [editingCommentId, setEditingCommentId,] = useState<number | null>(null);
    const [editCommentText, setEditCommentText,] = useState("");
    async function fetchAssets() {
        try {
            const response = await fetch(`${API_BASE}/assets`);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    "Failed to retrieve assets.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Assets response was not an array.");
            }
            const sequenceByAssetId = new Map<number, number>();
            const countByPartId = new Map<number, number>();
            [...data]
                .sort((a: any, b: any) => (Number(a.asset_id ??
                a.id) || 0) -
                (Number(b.asset_id ??
                    b.id) || 0))
                .forEach((row: any) => {
                const assetId = Number(row.asset_id ??
                    row.id) || 0;
                const partId = Number(row.part_id ??
                    row.partId) || 0;
                const next = (countByPartId.get(partId) ?? 0) + 1;
                countByPartId.set(partId, next);
                sequenceByAssetId.set(assetId, next);
            });
            const formatted: Asset[] = data.map((row: any) => {
                const id = Number(row.asset_id ??
                    row.id) || 0;
                const partId = Number(row.part_id ??
                    row.partId) || 0;
                const partNumber = row.part_number ??
                    row.part_num ??
                    row.partNumber ??
                    "-";
                const storedEquipmentNumber = String(row.equipment_number ??
                    row.equipmentNumber ??
                    "").trim();
                const fallbackEquipmentNumber = partNumber &&
                    partNumber !== "-"
                    ? `${partNumber}-${String(sequenceByAssetId.get(id) ?? 1).padStart(4, "0")}`
                    : storedEquipmentNumber;
                const equipmentNumber = /^TSLA-\d+-\d{4}$/i.test(storedEquipmentNumber)
                    ? storedEquipmentNumber
                    : fallbackEquipmentNumber ||
                        storedEquipmentNumber;
                return {
                    id,
                    partId,
                    partNumber,
                    partName: row.part_name ??
                        row.partName ??
                        "-",
                    equipmentNumber,
                    assetType: String(row.asset_type ??
                        row.assetType ??
                        row.asset_type_name ??
                        row.assetTypeName ??
                        "").trim(),
                    serialNumber: row.serial_number ??
                        row.serialNumber ??
                        "",
                    price: parsePrice(row.price ??
                        row.asset_price),
                    status: formatAssetStatus(row.status),
                    locationPath: row.location ??
                        row.location_path ??
                        row.locationPath ??
                        "",
                    commentCount: Number(row.comment_count ??
                        row.commentCount) || 0,
                    directSubAssetCount: Number(row.direct_sub_asset_count ??
                        row.directSubAssetCount) || 0,
                    usedInCount: Number(row.used_in_count ??
                        row.usedInCount) || 0,
                    hasOpenCheckout: Boolean(Number(row.has_open_checkout ?? row.hasOpenCheckout)),
                    isOverdue: Boolean(Number(row.is_overdue ?? row.isOverdue)),
                };
            });
            setAssets(formatted);
        }
        catch (error) {
            console.error("Error fetching assets:", error);
        }
    }
    async function fetchParts() {
        try {
            const response = await fetch(`${API_BASE}/parts`);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    "Failed to retrieve parts.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Parts response was not an array.");
            }
            setParts(data.map((part: any) => ({
                id: Number(part.part_id ??
                    part.id) || 0,
                partNumber: part.part_number ??
                    part.part_num ??
                    part.partNumber ??
                    "",
                partName: part.part_name ??
                    part.partName ??
                    "",
                supplierNumber: part.supplier_number ??
                    part.supplierNumber ??
                    "",
                price: parsePrice(part.price ??
                    part.unit_cost),
            })));
        }
        catch (error) {
            console.error("Error fetching parts:", error);
        }
    }
    async function fetchLocations() {
        try {
            const response = await fetch(`${API_BASE}/locations`);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    "Failed to retrieve locations.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Locations response was not an array.");
            }
            setLocations(data
                .map((location: any) => ({
                locationId: Number(location.location_id ??
                    location.locationId ??
                    location.id) || 0,
                parentLocationId: location.parent_location_id ===
                    null ||
                    location.parent_location_id ===
                        undefined ||
                    location.parent_location_id ===
                        ""
                    ? null
                    : Number(location.parent_location_id),
                locationName: location.location_name ??
                    location.locationName ??
                    location.name ??
                    "",
                locationPath: location.location_path ??
                    location.locationPath ??
                    location.location ??
                    location.location_name ??
                    location.name ??
                    "",
            }))
                .filter((location: LocationOption) => location.locationId >
                0 &&
                location.locationPath.trim() !==
                    "")
                .sort((a, b) => a.locationPath.localeCompare(b.locationPath)));
        }
        catch (error) {
            console.error("Error fetching locations:", error);
        }
    }
    async function fetchAssetTypes() {
        try {
            const response = await fetch(`${API_BASE}/asset-types`);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    "Failed to retrieve asset types.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Asset types response was not an array.");
            }
            const formatted: AssetTypeOption[] = data
                .map((assetType: any) => ({
                assetTypeName: String(typeof assetType ===
                    "string"
                    ? assetType
                    : assetType.asset_type ??
                        assetType.asset_type_name ??
                        assetType.assetType ??
                        assetType.assetTypeName ??
                        assetType.name ??
                        "").trim(),
            }))
                .filter((assetType: AssetTypeOption) => assetType.assetTypeName !==
                "")
                .filter((assetType: AssetTypeOption, index: number, array: AssetTypeOption[]) => array.findIndex((item) => item.assetTypeName.toLowerCase() ===
                assetType.assetTypeName.toLowerCase()) === index)
                .sort((a, b) => a.assetTypeName.localeCompare(b.assetTypeName));
            setAssetTypes(formatted);
        }
        catch (error) {
            console.error("Error fetching asset types:", error);
        }
    }
    async function fetchContextTags() {
        try {
            const response = await fetch(CONTEXT_TAG_ENDPOINT);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to retrieve context tags.");
            }
            const rows = Array.isArray(data)
                ? data
                : Array.isArray(data?.context_tag)
                    ? data.context_tag
                    : Array.isArray(data?.tags)
                        ? data.tags
                        : null;
            if (!rows) {
                throw new Error("Context tags response was not an array.");
            }
            const formatted: ContextTag[] = rows
                .map((tag: any) => ({
                contextTagId: Number(tag.context_tag_id ??
                    tag.contextTagId ??
                    tag.id) || 0,
                assetId: Number(tag.asset_id ??
                    tag.assetId) || 0,
                name: cleanTagName(String(tag.context_tag_name ??
                    tag.contextTagName ??
                    tag.tag_name ??
                    tag.tagName ??
                    tag.name ??
                    "")),
            }))
                .filter((tag: ContextTag) => tag.assetId >
                0 &&
                tag.name !== "");
            setContextTags(formatted);
            setTagColorIndexes((current) => {
                const next = {
                    ...current,
                };
                let changed = false;
                for (const tag of formatted) {
                    const key = normalizeTagKey(tag.name);
                    if (next[key] ===
                        undefined) {
                        next[key] =
                            randomTagColorIndex();
                        changed =
                            true;
                    }
                }
                return changed
                    ? next
                    : current;
            });
        }
        catch (error) {
            console.error("Error fetching context tags:", error);
            setContextTags([]);
        }
    }
    async function fetchComments(assetId: number) {
        try {
            setCommentsLoading(true);
            setCommentError("");
            const response = await fetch(`${API_BASE}/assets/${assetId}/comments`);
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to retrieve comments.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Comments response was not an array.");
            }
            setComments(data.map((comment: any) => ({
                commentId: Number(comment.comment_id ??
                    comment.commentId) || 0,
                assetId: Number(comment.asset_id ??
                    comment.assetId) ||
                    assetId,
                commentText: comment.comment_text ??
                    comment.commentText ??
                    "",
                createdAt: comment.created_at ??
                    comment.createdAt ??
                    "",
                updatedAt: comment.updated_at ??
                    comment.updatedAt ??
                    "",
            })));
        }
        catch (error) {
            console.error("Error fetching comments:", error);
            setComments([]);
            setCommentError(error instanceof Error
                ? error.message
                : "Failed to retrieve comments.");
        }
        finally {
            setCommentsLoading(false);
        }
    }
    async function createContextTag(assetId: number, tagName: string) {
        const cleanName = cleanTagName(tagName);
        if (!assetId ||
            !cleanName) {
            return;
        }
        const response = await fetch(CONTEXT_TAG_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                asset_id: assetId,
                context_tag_name: cleanName,
            }),
        });
        const data: any = await readResponse(response);
        if (!response.ok) {
            throw new Error(data.error ||
                data.details ||
                data.message ||
                `Failed to add tag "${cleanName}".`);
        }
    }
    useEffect(() => {
        void Promise.all([
            fetchAssets(),
            fetchParts(),
            fetchLocations(),
            fetchAssetTypes(),
            fetchContextTags(),
        ]);
    }, []);
    useEffect(() => {
        if (typeof window ===
            "undefined") {
            return;
        }
        try {
            window.localStorage.setItem(TAG_COLOR_STORAGE_KEY, JSON.stringify(tagColorIndexes));
        }
        catch {
            return;
        }
    }, [
        tagColorIndexes,
    ]);
    function getPartSupplierNumber(partId: number) {
        return (parts.find((part) => part.id === partId)?.supplierNumber ||
            "");
    }
    function ensureTagColor(tagName: string) {
        const key = normalizeTagKey(tagName);
        if (!key) {
            return;
        }
        setTagColorIndexes((current) => {
            if (current[key] !==
                undefined) {
                return current;
            }
            return {
                ...current,
                [key]: randomTagColorIndex(),
            };
        });
    }
    function getTagStyle(tagName: string): CSSProperties {
        const key = normalizeTagKey(tagName);
        const paletteIndex = tagColorIndexes[key] ?? 0;
        const palette = TAG_COLOR_PALETTE[paletteIndex %
            TAG_COLOR_PALETTE.length];
        return {
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            maxWidth: 180,
            padding: "3px 8px",
            border: `1px solid ${palette.borderColor}`,
            borderRadius: 999,
            backgroundColor: palette.backgroundColor,
            color: palette.color,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
        };
    }
    const tagsByAssetId = useMemo(() => {
        const map = new Map<number, string[]>();
        for (const tag of contextTags) {
            const current = map.get(tag.assetId) ?? [];
            if (!current.some((name) => normalizeTagKey(name) ===
                normalizeTagKey(tag.name))) {
                current.push(tag.name);
                current.sort((a, b) => a.localeCompare(b));
                map.set(tag.assetId, current);
            }
        }
        return map;
    }, [
        contextTags,
    ]);
    const allTagNames = useMemo(() => {
        const names = new Map<string, string>();
        for (const tag of contextTags) {
            const key = normalizeTagKey(tag.name);
            if (key &&
                !names.has(key)) {
                names.set(key, tag.name);
            }
        }
        return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
    }, [
        contextTags,
    ]);
    const quantityByPartId = useMemo(() => {
        const counts = new Map<number, number>();
        for (const asset of assets) {
            counts.set(asset.partId, (counts.get(asset.partId) ?? 0) + 1);
        }
        return counts;
    }, [
        assets,
    ]);
    const selectedNewAssetPart = useMemo(() => parts.find((part) => part.id ===
        Number(newAsset.partId)) ?? null, [
        parts,
        newAsset.partId,
    ]);
    function useSelectedPartPrice() {
        const partPrice = selectedNewAssetPart
            ?.price;
        if (partPrice === null ||
            partPrice === undefined) {
            return;
        }
        setNewAsset((current) => ({
            ...current,
            price: partPrice.toFixed(2),
        }));
    }
    const nextEquipmentNumberPreview = useMemo(() => {
        if (!selectedNewAssetPart
            ?.partNumber) {
            return "Auto-generated when saved";
        }
        const prefix = `${selectedNewAssetPart.partNumber}-`;
        let maxSequence = 0;
        for (const asset of assets) {
            if (asset.partId !==
                selectedNewAssetPart.id) {
                continue;
            }
            if (!asset.equipmentNumber.startsWith(prefix)) {
                continue;
            }
            const suffix = Number(asset.equipmentNumber.slice(prefix.length));
            if (Number.isInteger(suffix) &&
                suffix >
                    maxSequence) {
                maxSequence =
                    suffix;
            }
        }
        const currentQuantity = quantityByPartId.get(selectedNewAssetPart.id) ?? 0;
        const nextSequence = Math.max(maxSequence, currentQuantity) + 1;
        return `${selectedNewAssetPart.partNumber}-${String(nextSequence).padStart(4, "0")}`;
    }, [
        assets,
        quantityByPartId,
        selectedNewAssetPart,
    ]);
    const filteredAssets = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();
        return assets.filter((asset) => {
            const partSupplierNumber = getPartSupplierNumber(asset.partId).toLowerCase();
            const tagNames = tagsByAssetId.get(asset.id) ?? [];
            const matchesSearch = asset.equipmentNumber
                .toLowerCase()
                .includes(query) ||
                asset.partNumber
                    .toLowerCase()
                    .includes(query) ||
                asset.partName
                    .toLowerCase()
                    .includes(query) ||
                asset.assetType
                    .toLowerCase()
                    .includes(query) ||
                partSupplierNumber.includes(query) ||
                asset.serialNumber
                    .toLowerCase()
                    .includes(query) ||
                asset.locationPath
                    .toLowerCase()
                    .includes(query) ||
                tagNames.some((tagName) => tagName
                    .toLowerCase()
                    .includes(query));
            const matchesStatus = statusFilter ===
                "All" ||
                asset.status ===
                    statusFilter;
            const matchesType = assetTypeFilter ===
                "All" ||
                asset.assetType ===
                    assetTypeFilter;
            const matchesTags = selectedTagFilters.length ===
                0 ||
                selectedTagFilters.some((selectedTag) => tagNames.some((assetTag) => normalizeTagKey(assetTag) ===
                    normalizeTagKey(selectedTag)));
            const isAssembly = asset.directSubAssetCount > 0;
            const isComponent = asset.usedInCount > 0;
            const matchesStructure = structureFilter === "All" ||
                (structureFilter === "Assemblies" && isAssembly) ||
                (structureFilter === "Components" && isComponent) ||
                (structureFilter === "Standalone" && !isAssembly && !isComponent);
            return (matchesSearch &&
                matchesStatus &&
                matchesType &&
                matchesTags &&
                matchesStructure);
        });
    }, [
        assets,
        parts,
        search,
        statusFilter,
        assetTypeFilter,
        structureFilter,
        selectedTagFilters,
        tagsByAssetId,
    ]);
    const filteredPartOptions = useMemo(() => {
        const query = partSearch
            .trim()
            .toLowerCase();
        if (!query) {
            return parts;
        }
        return parts.filter((part) => part.partNumber
            .toLowerCase()
            .includes(query) ||
            part.partName
                .toLowerCase()
                .includes(query) ||
            part.supplierNumber
                .toLowerCase()
                .includes(query));
    }, [
        parts,
        partSearch,
    ]);
    const filteredAssetTypeOptions = useMemo(() => {
        const query = assetTypeSearch
            .trim()
            .toLowerCase();
        if (!query) {
            return assetTypes;
        }
        return assetTypes.filter((assetType) => assetType.assetTypeName
            .toLowerCase()
            .includes(query));
    }, [
        assetTypes,
        assetTypeSearch,
    ]);
    const assetTypeSearchHasExactMatch = useMemo(() => {
        const query = assetTypeSearch
            .trim()
            .toLowerCase();
        return (!!query &&
            assetTypes.some((assetType) => assetType.assetTypeName
                .trim()
                .toLowerCase() ===
                query));
    }, [
        assetTypes,
        assetTypeSearch,
    ]);
    const filteredTagFilterOptions = useMemo(() => {
        const query = tagFilterSearch
            .trim()
            .toLowerCase();
        return query
            ? allTagNames.filter((tagName) => tagName
                .toLowerCase()
                .includes(query))
            : allTagNames;
    }, [
        allTagNames,
        tagFilterSearch,
    ]);
    const filteredNewAssetTagOptions = useMemo(() => {
        const query = newAssetTagSearch
            .trim()
            .toLowerCase();
        return allTagNames.filter((tagName) => {
            const matchesSearch = !query ||
                tagName
                    .toLowerCase()
                    .includes(query);
            const notSelected = !newAssetTags.some((selected) => normalizeTagKey(selected) ===
                normalizeTagKey(tagName));
            return (matchesSearch &&
                notSelected);
        });
    }, [
        allTagNames,
        newAssetTagSearch,
        newAssetTags,
    ]);
    const newAssetTagHasExactMatch = useMemo(() => {
        const query = normalizeTagKey(newAssetTagSearch);
        return (!!query &&
            allTagNames.some((tagName) => normalizeTagKey(tagName) === query));
    }, [
        allTagNames,
        newAssetTagSearch,
    ]);
    function toggleTagFilter(tagName: string) {
        setSelectedTagFilters((current) => {
            const exists = current.some((selected) => normalizeTagKey(selected) ===
                normalizeTagKey(tagName));
            return exists
                ? current.filter((selected) => normalizeTagKey(selected) !==
                    normalizeTagKey(tagName))
                : [
                    ...current,
                    tagName,
                ];
        });
    }
    function addNewAssetTag(tagName: string) {
        const cleanName = cleanTagName(tagName);
        if (!cleanName) {
            return;
        }
        ensureTagColor(cleanName);
        setNewAssetTags((current) => current.some((selected) => normalizeTagKey(selected) ===
            normalizeTagKey(cleanName))
            ? current
            : [
                ...current,
                cleanName,
            ]);
        setNewAssetTagSearch("");
        setNewAssetTagDropdownOpen(true);
    }
    function removeNewAssetTag(tagName: string) {
        setNewAssetTags((current) => current.filter((selected) => normalizeTagKey(selected) !==
            normalizeTagKey(tagName)));
    }
    function openTagEditor(asset: Asset) {
        setTagEditorAsset(asset);
        setTagEditorSearch("");
    }
    function closeTagEditor() {
        if (tagSaving ||
            tagDeletingId !==
                null) {
            return;
        }
        setTagEditorAsset(null);
        setTagEditorSearch("");
    }
    async function handleAddTagToExistingAsset(tagName: string) {
        if (!tagEditorAsset) {
            return;
        }
        const typedName = cleanTagName(tagName);
        const cleanName = allTagNames.find((existingName) => normalizeTagKey(existingName) ===
            normalizeTagKey(typedName)) ?? typedName;
        if (!cleanName) {
            return;
        }
        const currentNames = tagsByAssetId.get(tagEditorAsset.id) ?? [];
        if (currentNames.some((name) => normalizeTagKey(name) ===
            normalizeTagKey(cleanName))) {
            setTagEditorSearch("");
            return;
        }
        try {
            setTagSaving(true);
            ensureTagColor(cleanName);
            await createContextTag(tagEditorAsset.id, cleanName);
            await fetchContextTags();
            setTagEditorSearch("");
        }
        catch (error) {
            console.error("Error adding context tag:", error);
            alert(error instanceof Error
                ? error.message
                : "Failed to add context tag.");
        }
        finally {
            setTagSaving(false);
        }
    }
    async function handleDeleteTagFromExistingAsset(tagName: string) {
        if (!tagEditorAsset) {
            return;
        }
        const tag = contextTags.find((item) => item.assetId ===
            tagEditorAsset.id &&
            normalizeTagKey(item.name) ===
                normalizeTagKey(tagName));
        if (!tag?.contextTagId) {
            alert("Unable to find this context tag assignment.");
            return;
        }
        if (!window.confirm(`Remove "${tag.name}" from ${tagEditorAsset.equipmentNumber ||
            "this asset"}?`)) {
            return;
        }
        try {
            setTagDeletingId(tag.contextTagId);
            const response = await fetch(`${API_BASE}/assets/${tagEditorAsset.id}/context_tag/${tag.contextTagId}`, {
                method: "DELETE",
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to remove context tag.");
            }
            await fetchContextTags();
        }
        catch (error) {
            console.error("Error removing context tag:", error);
            alert(error instanceof Error
                ? error.message
                : "Failed to remove context tag.");
        }
        finally {
            setTagDeletingId(null);
        }
    }
    function openAddAssetModal() {
        setNewAsset({
            ...emptyAssetForm,
        });
        setPartSearch("");
        setPartDropdownOpen(false);
        setAssetTypeSearch("");
        setAssetTypeDropdownOpen(false);
        setNewAssetTags([]);
        setNewAssetTagSearch("");
        setNewAssetTagDropdownOpen(false);
        setNewAssetStatusReason("");
        setCheckoutAfterCreate(false);
        setShowAddAsset(true);
    }
    function closeAddAssetModal() {
        if (saving ||
            assetTypeSaving ||
            tagSaving) {
            return;
        }
        setShowAddAsset(false);
        setPartDropdownOpen(false);
        setAssetTypeDropdownOpen(false);
        setNewAssetTagDropdownOpen(false);
    }
    function confirmCloseAddAssetModal() {
        if (saving ||
            assetTypeSaving ||
            tagSaving) {
            return;
        }
        const hasChanges = JSON.stringify(newAsset) !== JSON.stringify(emptyAssetForm) || newAssetTags.length > 0 || newAssetStatusReason !== "" || checkoutAfterCreate;
        if (!hasChanges) {
            closeAddAssetModal();
            return;
        }
        const shouldClose = window.confirm("Are you sure you want to cancel?\n\nAny unsaved asset changes will be lost.");
        if (!shouldClose) {
            return;
        }
        closeAddAssetModal();
    }
    function selectPart(part: PartOption) {
        setNewAsset((current) => ({
            ...current,
            partId: String(part.id),
        }));
        setPartSearch(formatPartOption(part));
        setPartDropdownOpen(false);
    }
    function selectAssetType(assetType: AssetTypeOption) {
        setNewAsset((current) => ({
            ...current,
            assetType: assetType.assetTypeName,
        }));
        setAssetTypeSearch(assetType.assetTypeName);
        setAssetTypeDropdownOpen(false);
    }
    async function handleAddAssetType() {
        const cleanAssetTypeName = assetTypeSearch.trim();
        if (!cleanAssetTypeName) {
            return;
        }
        const existing = assetTypes.find((assetType) => assetType.assetTypeName
            .trim()
            .toLowerCase() ===
            cleanAssetTypeName.toLowerCase());
        if (existing) {
            selectAssetType(existing);
            return;
        }
        try {
            setAssetTypeSaving(true);
            const response = await fetch(`${API_BASE}/asset-types`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    asset_type_name: cleanAssetTypeName,
                }),
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to add asset type.");
            }
            const newAssetType: AssetTypeOption = {
                assetTypeName: String(data.asset_type ??
                    data.asset_type_name ??
                    data.assetType ??
                    data.assetTypeName ??
                    data.name ??
                    cleanAssetTypeName).trim(),
            };
            setAssetTypes((current) => [
                ...current.filter((assetType) => assetType.assetTypeName.toLowerCase() !==
                    newAssetType.assetTypeName.toLowerCase()),
                newAssetType,
            ].sort((a, b) => a.assetTypeName.localeCompare(b.assetTypeName)));
            selectAssetType(newAssetType);
        }
        catch (error) {
            console.error("Error adding asset type:", error);
            alert(error instanceof Error
                ? error.message
                : "Failed to add asset type.");
        }
        finally {
            setAssetTypeSaving(false);
        }
    }
    async function handleAddAsset() {
        const partId = Number(newAsset.partId);
        const assetType = newAsset.assetType.trim();
        const price = newAsset.price.trim() ===
            ""
            ? null
            : Number(newAsset.price);
        if (!Number.isInteger(partId) ||
            partId <= 0) {
            alert("Please search or select a part.");
            return;
        }
        if (!assetType) {
            alert("Please search for or select an asset type.");
            return;
        }
        if (price !== null &&
            (!Number.isFinite(price) ||
                price < 0)) {
            alert("Price must be a valid non-negative number.");
            return;
        }
        const selectedLocation = newAsset.locationId
            ? locations.find((location) => location.locationId ===
                Number(newAsset.locationId))
            : null;
        if (newAsset.locationId &&
            !selectedLocation) {
            alert("Please select a valid location.");
            return;
        }
        const shouldSave = window.confirm(`Are you sure you want to save this new asset?\n\nEquipment Number: ${nextEquipmentNumberPreview}\nPart: ${selectedNewAssetPart
            ? `${selectedNewAssetPart.partNumber} — ${selectedNewAssetPart.partName}`
            : "—"}\nAsset Price: ${formatPrice(price)}`);
        if (!shouldSave) {
            return;
        }
        try {
            setSaving(true);
            const response = await fetch(`${API_BASE}/assets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    part_id: partId,
                    equipment_number: nextEquipmentNumberPreview ===
                        "Auto-generated when saved"
                        ? null
                        : nextEquipmentNumberPreview,
                    asset_type: assetType,
                    serial_number: newAsset.serialNumber.trim() ||
                        null,
                    price,
                    status: toDatabaseStatus(newAsset.status),
                    status_reason: newAssetStatusReason || undefined,
                    location: selectedLocation
                        ?.locationPath ??
                        null,
                }),
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to add asset.");
            }
            const createdAssetId = extractCreatedAssetId(data);
            let tagWarning = "";
            if (newAssetTags.length >
                0) {
                if (!createdAssetId) {
                    tagWarning =
                        " The asset was created, but context tags could not be assigned because the API did not return asset_id.";
                }
                else {
                    await Promise.all(newAssetTags.map((tagName) => createContextTag(createdAssetId, tagName)));
                }
            }
            setNewAsset({
                ...emptyAssetForm,
            });
            setPartSearch("");
            setPartDropdownOpen(false);
            setAssetTypeSearch("");
            setAssetTypeDropdownOpen(false);
            setNewAssetTags([]);
            setNewAssetTagSearch("");
            setNewAssetTagDropdownOpen(false);
            setShowAddAsset(false);
            await Promise.all([
                fetchAssets(),
                fetchAssetTypes(),
                fetchContextTags(),
            ]);
            alert(`Asset added successfully!${tagWarning}`);
            if (checkoutAfterCreate && createdAssetId) {
                navigate(`/assets/${createdAssetId}?checkout=1`);
            }
        }
        catch (error) {
            console.error("Error adding asset:", error);
            alert(error instanceof Error
                ? error.message
                : "Failed to add asset.");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleAssetStatusChange(asset: Asset, status: AssetStatus) {
        if (asset.status ===
            status) {
            return;
        }
        if (asset.hasOpenCheckout) {
            alert("Status is managed by the active checkout. Check the asset in before changing it.");
            return;
        }
        if (status === "Reserved") {
            alert("Reserved will be available after the purchase request and approval pages are established.");
            return;
        }
        if (status === "In Use") {
            const shouldCheckout = window.confirm("In Use is controlled by checkout. Would you like to check out this asset now?");
            if (shouldCheckout) navigate(`/assets/${asset.id}?checkout=1`);
            return;
        }
        let statusReason = "";
        if (status === "Disposed" || status === "Retired") {
            statusReason = window.prompt(`Why is this asset being marked ${status.toLowerCase()}?`)?.trim() ?? "";
            if (!statusReason) return;
        }
        const previousStatus = asset.status;
        setAssets((current) => current.map((item) => item.id ===
            asset.id
            ? {
                ...item,
                status,
            }
            : item));
        try {
            setUpdatingAssetStatusId(asset.id);
            const response = await fetch(`${API_BASE}/assets/${asset.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: toDatabaseStatus(status),
                    status_reason: statusReason || undefined,
                }),
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to update asset status.");
            }
            await fetchAssets();
        }
        catch (error) {
            console.error("Error updating asset status:", error);
            setAssets((current) => current.map((item) => item.id ===
                asset.id
                ? {
                    ...item,
                    status: previousStatus,
                }
                : item));
            alert(error instanceof Error
                ? error.message
                : "Failed to update asset status.");
        }
        finally {
            setUpdatingAssetStatusId(null);
        }
    }
    async function openComments(asset: Asset) {
        setSelectedCommentAsset(asset);
        setComments([]);
        setNewCommentText("");
        setEditingCommentId(null);
        setEditCommentText("");
        setCommentError("");
        await fetchComments(asset.id);
    }
    function closeCommentsModal() {
        if (commentSaving) {
            return;
        }
        setSelectedCommentAsset(null);
        setComments([]);
        setNewCommentText("");
        setEditingCommentId(null);
        setEditCommentText("");
        setCommentError("");
    }
    async function handleAddComment() {
        if (!selectedCommentAsset) {
            return;
        }
        const commentText = newCommentText.trim();
        if (!commentText) {
            setCommentError("Please enter a comment.");
            return;
        }
        try {
            setCommentSaving(true);
            setCommentError("");
            const response = await fetch(`${API_BASE}/assets/${selectedCommentAsset.id}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment_text: commentText,
                }),
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to add comment.");
            }
            setNewCommentText("");
            await Promise.all([
                fetchComments(selectedCommentAsset.id),
                fetchAssets(),
            ]);
        }
        catch (error) {
            console.error("Error adding comment:", error);
            setCommentError(error instanceof Error
                ? error.message
                : "Failed to add comment.");
        }
        finally {
            setCommentSaving(false);
        }
    }
    function startEditingComment(comment: AssetComment) {
        setEditingCommentId(comment.commentId);
        setEditCommentText(comment.commentText);
        setCommentError("");
    }
    function cancelEditingComment() {
        setEditingCommentId(null);
        setEditCommentText("");
        setCommentError("");
    }
    async function handleSaveComment(commentId: number) {
        if (!selectedCommentAsset) {
            return;
        }
        const commentText = editCommentText.trim();
        if (!commentText) {
            setCommentError("Comment cannot be empty.");
            return;
        }
        try {
            setCommentSaving(true);
            setCommentError("");
            const response = await fetch(`${API_BASE}/comments/${commentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment_text: commentText,
                }),
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to update comment.");
            }
            setEditingCommentId(null);
            setEditCommentText("");
            await fetchComments(selectedCommentAsset.id);
        }
        catch (error) {
            console.error("Error updating comment:", error);
            setCommentError(error instanceof Error
                ? error.message
                : "Failed to update comment.");
        }
        finally {
            setCommentSaving(false);
        }
    }
    async function handleDeleteComment(commentId: number) {
        if (!selectedCommentAsset) {
            return;
        }
        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }
        try {
            setCommentSaving(true);
            setCommentError("");
            const response = await fetch(`${API_BASE}/comments/${commentId}`, {
                method: "DELETE",
            });
            const data: any = await readResponse(response);
            if (!response.ok) {
                throw new Error(data.error ||
                    data.details ||
                    data.message ||
                    "Failed to delete comment.");
            }
            if (editingCommentId ===
                commentId) {
                setEditingCommentId(null);
                setEditCommentText("");
            }
            await Promise.all([
                fetchComments(selectedCommentAsset.id),
                fetchAssets(),
            ]);
        }
        catch (error) {
            console.error("Error deleting comment:", error);
            setCommentError(error instanceof Error
                ? error.message
                : "Failed to delete comment.");
        }
        finally {
            setCommentSaving(false);
        }
    }
    return (<div className="assets-layout">
      <Navbar />

      <main className="assets-content container-fluid">
        <div className="assets-header">
          <h3>
            Assets
          </h3>

          <button type="button" onClick={openAddAssetModal}>
            + New Asset
          </button>
        </div>

        <div className="assets-filters">
          <input type="text" placeholder="Search equipment numbers, parts, serials, locations, or tags..." value={search} onChange={(event) => setSearch(event.target.value)}/>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target
            .value as "All" | AssetStatus)}>
            <option value="All">
              All Statuses
            </option>

            <option value="Available">
              Available
            </option>

            <option value="Disposed">
              Disposed
            </option>

            <option value="In Use">
              In Use
            </option>

            <option value="Reserved" disabled title="Unavailable until purchase request and approval pages are established.">
              Reserved (Coming Soon)
            </option>

            <option value="Retired">
              Retired
            </option>
          </select>

          <select value={assetTypeFilter} onChange={(event) => setAssetTypeFilter(event.target.value)}>
            <option value="All">
              All Asset Types
            </option>

            {assetTypes.map((assetType) => (<option key={assetType.assetTypeName} value={assetType.assetTypeName}>
                  {assetType.assetTypeName}
                </option>))}
          </select>

          <select value={structureFilter} onChange={(event) => setStructureFilter(event.target.value as typeof structureFilter)} aria-label="Filter assets by hierarchy structure">
            <option value="All">All Structures</option>
            <option value="Assemblies">Assemblies</option>
            <option value="Components">Sub-Assets</option>
            <option value="Standalone">Standalone Assets</option>
          </select>

          <div style={tagSelectorWrapperStyle} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setTagFilterOpen(false);
            }
        }}>
            <button type="button" style={tagSelectorButtonStyle} onClick={() => setTagFilterOpen((current) => !current)} aria-expanded={tagFilterOpen}>
              <span>
                {selectedTagFilters.length ===
            0
            ? "All Context Tags"
            : `Context Tags (${selectedTagFilters.length})`}
              </span>

              <span aria-hidden="true">
                ▾
              </span>
            </button>

            {tagFilterOpen && (<div style={tagDropdownStyle}>
                <input type="text" value={tagFilterSearch} placeholder="Search context tags..." style={tagSearchInputStyle} onChange={(event) => setTagFilterSearch(event.target
                .value)}/>

                {selectedTagFilters.length >
                0 && (<div style={{
                    ...tagChipContainerStyle,
                    marginBottom: 8,
                }}>
                    {selectedTagFilters.map((tagName) => (<button key={tagName} type="button" title={`Remove ${tagName} filter`} style={{
                        ...getTagStyle(tagName),
                        cursor: "pointer",
                    }} onClick={() => toggleTagFilter(tagName)}>
                          {tagName}{" "}
                          ×
                        </button>))}
                  </div>)}

                {filteredTagFilterOptions.length >
                0 ? (filteredTagFilterOptions.map((tagName) => {
                const checked = selectedTagFilters.some((selected) => normalizeTagKey(selected) ===
                    normalizeTagKey(tagName));
                return (<button key={tagName} type="button" style={tagOptionStyle} onClick={() => toggleTagFilter(tagName)}>
                          <span aria-hidden="true" style={{
                        width: 18,
                    }}>
                            {checked
                        ? "✓"
                        : ""}
                          </span>

                          <span style={getTagStyle(tagName)}>
                            {tagName}
                          </span>
                        </button>);
            })) : (<div style={{
                    padding: 8,
                    color: "#64748b",
                    fontSize: 13,
                }}>
                    No matching
                    tags
                  </div>)}

                {selectedTagFilters.length >
                0 && (<button type="button" style={{
                    ...tagOptionStyle,
                    marginTop: 4,
                    color: "#475569",
                }} onClick={() => setSelectedTagFilters([])}>
                    Clear tag
                    filters
                  </button>)}
              </div>)}
          </div>
        </div>

        {selectedTagFilters.length >
            0 && (<div style={{
                ...tagChipContainerStyle,
                margin: "8px 0 12px",
            }}>
            <span style={{
                fontSize: 13,
                color: "#64748b",
            }}>
              Filtering by:
            </span>

            {selectedTagFilters.map((tagName) => (<button key={tagName} type="button" style={{
                    ...getTagStyle(tagName),
                    cursor: "pointer",
                }} onClick={() => toggleTagFilter(tagName)}>
                  {tagName}{" "}
                  ×
                </button>))}
          </div>)}

        <div className="assets-table-wrapper" style={{
            width: "100%",
            overflowX: "visible",
        }}>
          <table className="assets-table table table-hover align-middle mb-0" style={{
            width: "100%",
            minWidth: 0,
            tableLayout: "fixed",
        }}>
            <colgroup>
              <col style={{
            width: "12%",
        }}/>

              <col style={{
            width: "13%",
        }}/>

              <col style={{
            width: "8%",
        }}/>

              <col style={{
            width: "9%",
        }}/>

              <col style={{
            width: "10%",
        }}/>

              <col style={{
            width: "8%",
        }}/>

              <col style={{
            width: "8%",
        }}/>

              <col style={{
            width: "7%",
        }}/>

              <col style={{
            width: "5%",
        }}/>

              <col style={{
            width: "8%",
        }}/>

              <col style={{
            width: "8%",
        }}/>

              <col style={{
            width: "4%",
        }}/>
            </colgroup>

            <thead>
              <tr>
                <th style={compactHeaderStyle}>
                  Equipment Number
                </th>

                <th style={compactHeaderStyle}>
                  Context Tags
                </th>

                <th style={compactHeaderStyle}>
                  Asset Type
                </th>

                <th style={compactHeaderStyle}>
                  Part Number
                </th>

                <th style={compactHeaderStyle}>
                  Part Name
                </th>

                <th style={compactHeaderStyle}>
                  Supplier Number
                </th>

                <th style={compactHeaderStyle}>
                Serial Number
                </th>

                <th style={compactHeaderStyle}>
                  Price
                </th>

                <th style={compactHeaderStyle}>
                  Structure
                </th>

                <th style={compactHeaderStyle}>
                  Status
                </th>

                <th style={compactHeaderStyle}>
                  Location
                </th>

                <th style={compactHeaderStyle}>
                  Comments
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset) => (<tr key={asset.id} className="clickable-asset-row" tabIndex={0} onClick={() => navigate(`/assets/${asset.id}`)} onKeyDown={(event) => {
                if (event.key ===
                    "Enter" ||
                    event.key ===
                        " ") {
                    event.preventDefault();
                    navigate(`/assets/${asset.id}`);
                }
            }}>
                    <td style={compactCellStyle}>
                      <strong>
                        {asset.equipmentNumber ||
                "—"}
                      </strong>
                    </td>

                    <td style={compactCellStyle}>
                      <div style={{
                ...tagChipContainerStyle,
                gap: 4,
            }}>
                        {(tagsByAssetId.get(asset.id) ?? []).map((tagName) => (<span key={tagName} style={{
                    ...getTagStyle(tagName),
                    maxWidth: "100%",
                }}>
                              {tagName}
                            </span>))}

                        {(tagsByAssetId.get(asset.id) ?? []).some((tagName) => normalizeTagKey(tagName) === "incomplete") && (
                          <span className="incomplete-assembly-dot" title="A required assembly component is missing" aria-label="Incomplete assembly">!</span>
                        )}

                        <button type="button" onClick={(event) => {
                event.stopPropagation();
                openTagEditor(asset);
            }} onKeyDown={(event) => event.stopPropagation()} style={{
                padding: "3px 7px",
                border: "1px dashed #94a3b8",
                borderRadius: 999,
                background: "transparent",
                color: "#475569",
                fontSize: 11,
                cursor: "pointer",
            }} title="Manage context tags">
                          + Tag
                        </button>
                      </div>
                    </td>

                    <td style={compactCellStyle}>
                      {asset.assetType ||
                "—"}
                    </td>

                    <td style={compactCellStyle}>
                      <strong>
                        {asset.partNumber}
                      </strong>
                    </td>

                    <td style={compactCellStyle}>
                      {asset.partName}
                    </td>

                    <td style={compactCellStyle}>
                      {getPartSupplierNumber(asset.partId) ||
                "—"}
                    </td>

                    <td style={compactCellStyle}>
                      {asset.serialNumber ||
                "—"}
                    </td>

                    <td style={compactCellStyle}>
                      {formatPrice(asset.price)}
                    </td>

                    <td style={{
                ...compactCellStyle,
                textAlign: "center",
                fontWeight: 700,
            }}>
                      <ExpandableHierarchyCell kind="asset" id={asset.id} childCount={asset.directSubAssetCount} parentCount={asset.usedInCount} />
                    </td>

                    <td style={compactCellStyle}>
                      <div className="asset-status-control">
                      <select className={`status status-dropdown ${asset.status
                .toLowerCase()
                .replace(/\s+/g, "-")}`} value={asset.status} disabled={updatingAssetStatusId ===
                asset.id || asset.hasOpenCheckout} title={asset.hasOpenCheckout ? "Status is locked while this asset is checked out." : undefined} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => {
                event.stopPropagation();
                void handleAssetStatusChange(asset, event
                    .target
                    .value as AssetStatus);
            }} style={{
                width: "100%",
                minWidth: 0,
                fontSize: 11,
                padding: "5px 4px",
            }}>
                        <option value="Available">
                          Available
                        </option>

                        <option value="Disposed">
                          Disposed
                        </option>

                        <option value="In Use">
                          In Use
                        </option>

                        <option value="Reserved" disabled title="Unavailable until purchase request and approval pages are established.">
                          Reserved (Coming Soon)
                        </option>

                        <option value="Retired">
                          Retired
                        </option>
                      </select>
                      {asset.isOverdue && <span className="overdue-indicator" title="This asset is past its due-back date" aria-label="Overdue">!</span>}
                      </div>
                    </td>

                    <td style={compactCellStyle}>
                      {asset.locationPath ||
                "—"}
                    </td>

                    <td className="comments-cell" style={{
                ...compactCellStyle,
                textAlign: "center",
            }}>
                      <button type="button" className={`comment-button ${asset.commentCount >
                0
                ? "has-comments"
                : "no-comments"}`} title={asset.commentCount ===
                1
                ? "1 comment"
                : `${asset.commentCount} comments`} aria-label={`View ${asset.commentCount} comments for ${asset.equipmentNumber}`} onClick={(event) => {
                event.stopPropagation();
                void openComments(asset);
            }} onKeyDown={(event) => event.stopPropagation()}>
                        <span aria-hidden="true">
                          {asset.commentCount >
                0
                ? "💬"
                : "🗨️"}
                        </span>

                        {asset.commentCount >
                0 && (<span className="comment-count">
                            {asset.commentCount}
                          </span>)}
                      </button>
                    </td>
                  </tr>))}

              {filteredAssets.length ===
            0 && (<tr>
                  <td colSpan={12} className="no-assets">
                    No assets
                    found
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </main>

      {showAddAsset && (<div className="modal-overlay" role="presentation">
          <div className="add-asset-modal" role="dialog" aria-modal="true" aria-labelledby="add-asset-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="add-asset-modal-title">
                Add New Asset
              </h2>

              <button type="button" className="modal-close" onClick={confirmCloseAddAssetModal} disabled={saving ||
                assetTypeSaving ||
                tagSaving}>
                ×
              </button>
            </div>

            <div className="add-asset-form">
              <div className="form-group">
                <label htmlFor="partSearch">
                  Part *
                </label>

                <div className="part-search-wrapper">
                  <input id="partSearch" type="text" autoComplete="off" placeholder="Search by part number, name, or supplier number..." value={partSearch} onFocus={() => setPartDropdownOpen(true)} onBlur={() => setPartDropdownOpen(false)} onChange={(event) => {
                setPartSearch(event
                    .target
                    .value);
                setNewAsset((current) => ({
                    ...current,
                    partId: "",
                }));
                setPartDropdownOpen(true);
            }}/>

                  {partDropdownOpen && (<div className="part-search-dropdown">
                      {filteredPartOptions.length >
                    0 ? (filteredPartOptions.map((part) => (<button key={part.id} type="button" className="part-search-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPart(part)}>
                              <strong>
                                {part.partNumber}
                              </strong>

                              {" — "}

                              {part.partName}

                              {" — "}

                              Supplier
                              Number:{" "}
                              {part.supplierNumber ||
                        "—"}

                              {" — "}

                              Part
                              Price:{" "}
                              {formatPrice(part.price)}
                            </button>))) : (<div className="location-search-empty">
                          No
                          matching
                          parts
                          found
                        </div>)}
                    </div>)}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assetTypeSearch">
                  Asset Type *
                </label>

                <div className="asset-type-search-wrapper">
                  <input id="assetTypeSearch" type="text" autoComplete="off" placeholder="Search asset types (laptop, smartphone, etc.)..." value={assetTypeSearch} onFocus={() => setAssetTypeDropdownOpen(true)} onBlur={() => setAssetTypeDropdownOpen(false)} onChange={(event) => {
                setAssetTypeSearch(event
                    .target
                    .value);
                setNewAsset((current) => ({
                    ...current,
                    assetType: "",
                }));
                setAssetTypeDropdownOpen(true);
            }} disabled={assetTypeSaving}/>

                  {assetTypeDropdownOpen && (<div className="asset-type-search-dropdown">
                      {filteredAssetTypeOptions.map((assetType) => (<button key={assetType.assetTypeName} type="button" className="asset-type-search-option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAssetType(assetType)}>
                            {assetType.assetTypeName}
                          </button>))}

                      {assetTypeSearch.trim() &&
                    !assetTypeSearchHasExactMatch && (<button type="button" className="asset-type-add-option" onMouseDown={(event) => event.preventDefault()} onClick={() => void handleAddAssetType()} disabled={assetTypeSaving}>
                            {assetTypeSaving
                        ? "Adding asset type..."
                        : `+ Add "${assetTypeSearch.trim()}"`}
                          </button>)}

                      {filteredAssetTypeOptions.length ===
                    0 &&
                    !assetTypeSearch.trim() && (<div className="location-search-empty">
                            No
                            asset
                            types
                            have
                            been
                            added
                            yet
                          </div>)}
                    </div>)}
                </div>

                <small>
                  Search
                  previously
                  added asset
                  types or type
                  a new one to
                  add
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="equipmentNumber">
                  Equipment Number
                </label>

                <input id="equipmentNumber" type="text" value={nextEquipmentNumberPreview} readOnly disabled/>

                <small>
                  {selectedNewAssetPart
                ? `Next number for ${selectedNewAssetPart.partNumber}. Current quantity: ${quantityByPartId.get(selectedNewAssetPart.id) ?? 0}`
                : "Select a part to preview the next equipment number."}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="contextTagSearch">
                  Context Tags
                </label>

                {newAssetTags.length >
                0 && (<div style={{
                    ...tagChipContainerStyle,
                    marginBottom: 8,
                }}>
                    {newAssetTags.map((tagName) => (<button key={tagName} type="button" style={{
                        ...getTagStyle(tagName),
                        cursor: "pointer",
                    }} onClick={() => removeNewAssetTag(tagName)} title={`Remove ${tagName}`}>
                          {tagName}{" "}
                          ×
                        </button>))}
                  </div>)}

                <div style={tagSelectorWrapperStyle} onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setNewAssetTagDropdownOpen(false);
                }
            }}>
                  <input id="contextTagSearch" type="text" autoComplete="off" placeholder="Search or create context tags..." value={newAssetTagSearch} onFocus={() => setNewAssetTagDropdownOpen(true)} onChange={(event) => {
                setNewAssetTagSearch(event
                    .target
                    .value);
                setNewAssetTagDropdownOpen(true);
            }} onKeyDown={(event) => {
                if (event.key ===
                    "Enter" &&
                    newAssetTagSearch.trim()) {
                    event.preventDefault();
                    const exactExistingTag = allTagNames.find((tagName) => normalizeTagKey(tagName) ===
                        normalizeTagKey(newAssetTagSearch));
                    addNewAssetTag(exactExistingTag ??
                        newAssetTagSearch);
                }
            }}/>
                  <small className="incomplete-tag-help">Tip: selecting or creating <strong>Incomplete</strong> marks this asset as missing an assembly component.</small>

                  {newAssetTagDropdownOpen && (<div style={tagDropdownStyle}>
                      {filteredNewAssetTagOptions.map((tagName) => (<button key={tagName} type="button" style={tagOptionStyle} onMouseDown={(event) => event.preventDefault()} onClick={() => addNewAssetTag(tagName)}>
                            <span style={getTagStyle(tagName)}>
                              {tagName}
                            </span>
                          </button>))}

                      {newAssetTagSearch.trim() &&
                    !newAssetTagHasExactMatch && (<button type="button" style={{
                        ...tagOptionStyle,
                        fontWeight: 600,
                    }} onMouseDown={(event) => event.preventDefault()} onClick={() => addNewAssetTag(newAssetTagSearch)}>
                            + Create "
                            {cleanTagName(newAssetTagSearch)}
                            "
                          </button>)}
                    </div>)}
                </div>

                <small>
                  Select
                  multiple tags,
                  or type a new
                  tag and press
                  Enter to create
                  it.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="serialNumber">
                Serial Number
                </label>

                <input id="serialNumber" type="text" placeholder="Enter serial number" value={newAsset.serialNumber} onChange={(event) => setNewAsset((current) => ({
                ...current,
                serialNumber: event
                    .target
                    .value,
            }))}/>
              </div>

              <div className="form-group">
                <label htmlFor="assetPrice">
                  Price
                </label>

                <input id="assetPrice" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Enter asset price" value={newAsset.price} onChange={(event) => setNewAsset((current) => ({
                ...current,
                price: event
                    .target
                    .value,
            }))}/>

                <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 2,
            }}>
                  <small style={{
                marginTop: 0,
            }}>
                    {selectedNewAssetPart
                ? selectedNewAssetPart.price ===
                    null
                    ? "Selected part price is not set. Enter the asset price manually."
                    : `Selected part price: ${formatPrice(selectedNewAssetPart.price)}. Enter a different asset price or use the part price.`
                : "Select a part to reference its price, or enter the asset price manually."}
                  </small>

                  {selectedNewAssetPart &&
                selectedNewAssetPart.price !==
                    null && (<button type="button" className="cancel-button" style={{
                    minWidth: "auto",
                    padding: "6px 10px",
                    fontSize: 12,
                }} onClick={useSelectedPartPrice} disabled={saving}>
                        Use Part Price
                      </button>)}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assetStatus">
                  Status
                </label>

                <select id="assetStatus" value={newAsset.status} onChange={(event) => {
                  const nextStatus = event.target.value as AssetStatus;
                  if (nextStatus === "In Use") {
                    if (window.confirm("In Use requires checkout. Create this asset as Available and open the checkout form after saving?")) {
                      setCheckoutAfterCreate(true);
                      setNewAssetStatusReason("");
                    }
                    return;
                  }
                  if (nextStatus === "Disposed" || nextStatus === "Retired") {
                    const reason = window.prompt(`Why is this new asset being marked ${nextStatus.toLowerCase()}?`)?.trim() ?? "";
                    if (!reason) return;
                    setNewAssetStatusReason(reason);
                  } else {
                    setNewAssetStatusReason("");
                  }
                  setCheckoutAfterCreate(false);
                  setNewAsset((current) => ({ ...current, status: nextStatus }));
                }}>
                  <option value="Available">
                    Available
                  </option>

                  <option value="Disposed">
                    Disposed
                  </option>

                  <option value="In Use">
                    In Use
                  </option>

                  <option value="Reserved" disabled title="Unavailable until purchase request and approval pages are established.">
                    Reserved (Coming Soon)
                  </option>

                  <option value="Retired">
                    Retired
                  </option>
                </select>
                {checkoutAfterCreate && <small>Checkout will open after the asset is created.</small>}
                {newAssetStatusReason && <small>Reason: {newAssetStatusReason}</small>}
              </div>

              <div className="form-group">
                <label htmlFor="assetLocation">
                  Location
                </label>

                <select id="assetLocation" value={newAsset.locationId} onChange={(event) => setNewAsset((current) => ({
                ...current,
                locationId: event
                    .target
                    .value,
            }))}>
                  <option value="">
                    No location
                  </option>

                  {locations.map((location) => (<option key={location.locationId} value={location.locationId}>
                        {location.locationPath}
                      </option>))}
                </select>

                <small>
                  Locations are
                  managed from
                  the Locations
                  page
                </small>
              </div>

              <div className="modal-buttons">
                <button type="button" className="cancel-button" onClick={confirmCloseAddAssetModal} disabled={saving ||
                assetTypeSaving ||
                tagSaving}>
                  Cancel
                </button>

                <button type="button" className="add-button" onClick={handleAddAsset} disabled={saving ||
                assetTypeSaving ||
                tagSaving}>
                  {saving
                ? "Adding..."
                : "Add Asset"}
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {tagEditorAsset && (<div className="modal-overlay" role="presentation">
          <div className="comments-modal" role="dialog" aria-modal="true" aria-labelledby="context-tags-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="context-tags-modal-title">
                  Context Tags
                </h2>

                <small>
                  Equipment Number:{" "}
                  {tagEditorAsset.equipmentNumber ||
                tagEditorAsset.id}
                </small>
              </div>

              <button type="button" className="modal-close" onClick={closeTagEditor} disabled={tagSaving ||
                tagDeletingId !==
                    null}>
                ×
              </button>
            </div>

            <div className="comments-modal-body">
              <div className="form-group">
                <label htmlFor="existingAssetTagSearch">
                  Add context
                  tag
                </label>

                <input id="existingAssetTagSearch" type="text" autoComplete="off" placeholder="Search existing tags or type a new tag..." value={tagEditorSearch} onChange={(event) => setTagEditorSearch(event
                .target
                .value)} onKeyDown={(event) => {
                if (event.key ===
                    "Enter" &&
                    tagEditorSearch.trim()) {
                    event.preventDefault();
                    void handleAddTagToExistingAsset(tagEditorSearch);
                }
            }} disabled={tagSaving ||
                tagDeletingId !==
                    null}/>

                <small className="incomplete-tag-help">Use <strong>Incomplete</strong> when a required key, fob, tracker, or other assembly component is missing.</small>

                <small>
                  Press Enter to
                  create and
                  assign a new
                  tag
                </small>
              </div>

              <div style={{
                margin: "14px 0 8px",
                fontWeight: 600,
            }}>
                Current tags
              </div>

              <div style={tagChipContainerStyle}>
                {(tagsByAssetId.get(tagEditorAsset.id) ?? []).length >
                0 ? ((tagsByAssetId.get(tagEditorAsset.id) ?? []).map((tagName) => {
                const tagRecord = contextTags.find((item) => item.assetId ===
                    tagEditorAsset.id &&
                    normalizeTagKey(item.name) ===
                        normalizeTagKey(tagName));
                return (<button key={tagName} type="button" style={{
                        ...getTagStyle(tagName),
                        cursor: "pointer",
                    }} title={`Remove ${tagName}`} disabled={tagSaving ||
                        (tagRecord
                            ? tagDeletingId ===
                                tagRecord.contextTagId
                            : false)} onClick={() => void handleDeleteTagFromExistingAsset(tagName)}>
                          {tagDeletingId ===
                        tagRecord?.contextTagId
                        ? "Removing..."
                        : `${tagName} ×`}
                        </button>);
            })) : (<span style={{
                    color: "#64748b",
                    fontSize: 13,
                }}>
                    No context
                    tags assigned
                    yet
                  </span>)}
              </div>

              <div style={{
                margin: "18px 0 8px",
                fontWeight: 600,
            }}>
                Tag History
              </div>

              <div style={{
                display: "grid",
                gap: 4,
            }}>
                {allTagNames
                .filter((tagName) => {
                const query = tagEditorSearch
                    .trim()
                    .toLowerCase();
                const matchesSearch = !query ||
                    tagName
                        .toLowerCase()
                        .includes(query);
                const alreadyAssigned = (tagsByAssetId.get(tagEditorAsset.id) ?? []).some((assigned) => normalizeTagKey(assigned) ===
                    normalizeTagKey(tagName));
                return (matchesSearch &&
                    !alreadyAssigned);
            })
                .map((tagName) => (<button key={tagName} type="button" style={tagOptionStyle} disabled={tagSaving ||
                    tagDeletingId !==
                        null} onClick={() => void handleAddTagToExistingAsset(tagName)}>
                        <span style={getTagStyle(tagName)}>
                          {tagName}
                        </span>
                      </button>))}

                {tagEditorSearch.trim() &&
                !allTagNames.some((tagName) => normalizeTagKey(tagName) ===
                    normalizeTagKey(tagEditorSearch)) && (<button type="button" className="add-button" disabled={tagSaving ||
                    tagDeletingId !==
                        null} onClick={() => void handleAddTagToExistingAsset(tagEditorSearch)}>
                      {tagSaving
                    ? "Adding..."
                    : `+ Create "${cleanTagName(tagEditorSearch)}"`}
                    </button>)}
              </div>
            </div>
          </div>
        </div>)}

      {selectedCommentAsset && (<div className="modal-overlay" role="presentation">
          <div className="comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="comments-modal-title">
                  Comments
                </h2>

                <small>
                  Equipment Number:{" "}
                  {selectedCommentAsset.equipmentNumber ||
                selectedCommentAsset.id}
                </small>
              </div>

              <button type="button" className="modal-close" onClick={closeCommentsModal} disabled={commentSaving}>
                ×
              </button>
            </div>

            <div className="comments-modal-body">
              <div className="add-comment-section">
                <label htmlFor="newComment">
                  Add Comment
                </label>

                <textarea id="newComment" rows={4} placeholder="Enter a comment..." value={newCommentText} onChange={(event) => {
                setNewCommentText(event
                    .target
                    .value);
                if (commentError) {
                    setCommentError("");
                }
            }} disabled={commentSaving}/>

                <div className="comment-form-actions">
                  <button type="button" className="add-button" onClick={handleAddComment} disabled={commentSaving ||
                !newCommentText.trim()}>
                    {commentSaving
                ? "Saving..."
                : "Add Comment"}
                  </button>
                </div>
              </div>

              {commentError && (<div className="comment-error" role="alert">
                  {commentError}
                </div>)}

              <div className="comments-list">
                {commentsLoading ? (<div className="comments-empty">
                    Loading
                    comments...
                  </div>) : comments.length ===
                0 ? (<div className="comments-empty">
                    No comments
                    have been
                    added yet.
                  </div>) : (comments.map((comment) => (<div key={comment.commentId} className="comment-card">
                        {editingCommentId ===
                    comment.commentId ? (<>
                            <textarea rows={4} value={editCommentText} onChange={(event) => setEditCommentText(event
                        .target
                        .value)} disabled={commentSaving}/>

                            <div className="comment-actions">
                              <button type="button" className="cancel-button" onClick={cancelEditingComment} disabled={commentSaving}>
                                Cancel
                              </button>

                              <button type="button" className="add-button" onClick={() => handleSaveComment(comment.commentId)} disabled={commentSaving ||
                        !editCommentText.trim()}>
                                Save
                              </button>
                            </div>
                          </>) : (<>
                            <p className="comment-text">
                              {comment.commentText}
                            </p>

                            <div className="comment-meta">
                              <span>
                                {formatCommentDate(comment.createdAt)}
                              </span>

                              {commentWasEdited(comment) && (<span>
                                  Edited{" "}
                                  {formatCommentDate(comment.updatedAt)}
                                </span>)}
                            </div>

                            <div className="comment-actions">
                              <button type="button" onClick={() => startEditingComment(comment)} disabled={commentSaving}>
                                Edit
                              </button>

                              <button type="button" className="delete-comment-button" onClick={() => handleDeleteComment(comment.commentId)} disabled={commentSaving}>
                                Delete
                              </button>
                            </div>
                          </>)}
                      </div>)))}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
