import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Navbar from "../../components/Navbar.tsx";
import { API_BASE } from "../../config/api.ts";
import AssetHierarchyCard from "./AssetHierarchyCard.tsx";
import HierarchyPriceCard from "../../components/HierarchyPriceCard.tsx";
import {
  CONTEXT_TAG_ENDPOINT,
  TAG_COLOR_STORAGE_KEY,
  emptyEditForm,
  TAG_COLOR_PALETTE,
  contextTagChipContainerStyle,
  contextTagPickerStyle,
  contextTagDropdownStyle,
  contextTagOptionStyle,
  normalizeTagKey,
  cleanTagName,
  loadStoredTagColors,
  randomTagColorIndex,
  normalizeStatus,
  toDatabaseStatus,
  parsePrice,
  formatPrice,
  formatDateTime,
  formatDate,
  readResponse
} from "./AssetDetails.model.ts";
import type {
  AssetStatus,
  AssetDetailsData,
  AssetListRow,
  PartOption,
  AssetTypeOption,
  ContextTag,
  LocationOption,
  CheckoutHistoryRow,
  EditAssetForm
} from "./AssetDetails.model.ts";

export default function AssetDetails() {
  const navigate =
    useNavigate();

  const { id } =
    useParams<{
      id: string;
    }>();

  const assetId =
    Number(id);

  const [
    asset,
    setAsset,
  ] =
    useState<
      AssetDetailsData | null
    >(null);

  const [
    assetList,
    setAssetList,
  ] =
    useState<
      AssetListRow[]
    >([]);

  const [
    parts,
    setParts,
  ] =
    useState<
      PartOption[]
    >([]);

  const [
    assetTypes,
    setAssetTypes,
  ] =
    useState<
      AssetTypeOption[]
    >([]);

  const [
    contextTags,
    setContextTags,
  ] =
    useState<
      ContextTag[]
    >([]);

  const [
    locations,
    setLocations,
  ] =
    useState<
      LocationOption[]
    >([]);

  const [
    history,
    setHistory,
  ] =
    useState<
      CheckoutHistoryRow[]
    >([]);

  const [
    tagColorIndexes,
    setTagColorIndexes,
  ] =
    useState<
      Record<string, number>
    >(
      loadStoredTagColors
    );

  const [
    tagSearch,
    setTagSearch,
  ] =
    useState("");

  const [
    tagPickerOpen,
    setTagPickerOpen,
  ] =
    useState(false);

  const [
    tagSaving,
    setTagSaving,
  ] =
    useState(false);

  const [
    tagDeletingId,
    setTagDeletingId,
  ] =
    useState<
      number | null
    >(null);

  const [
    tagError,
    setTagError,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    showEdit,
    setShowEdit,
  ] =
    useState(false);

  const [
    editForm,
    setEditForm,
  ] =
    useState<EditAssetForm>({
      ...emptyEditForm,
    });

  const [initialEditForm, setInitialEditForm] = useState<EditAssetForm>({
    ...emptyEditForm,
  });
  const [statusReason, setStatusReason] = useState("");

  const [
    showCheckout,
    setShowCheckout,
  ] =
    useState(false);

  const [
    checkoutForm,
    setCheckoutForm,
  ] =
    useState({
      holder: "",
      dueDate: "",
      notes: "",
    });

  const [
    showCheckin,
    setShowCheckin,
  ] =
    useState(false);

  const [
    checkinForm,
    setCheckinForm,
  ] =
    useState({
      locationId: "",
      notes: "",
    });

  const loadAsset =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            assetId
          ) ||
          assetId <= 0
        ) {
          throw new Error(
            "Invalid asset ID."
          );
        }

        const response =
          await fetch(
            `${API_BASE}/assets/${assetId}`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              `Asset request failed: ${response.status}`
          );
        }

        const raw =
          data.asset ??
          data;

        setAsset({
          id:
            Number(
              raw.asset_id ??
                raw.id ??
                assetId
            ) || assetId,

          equipmentNumber:
            String(
              raw.equipment_number ??
                raw.equipmentNumber ??
                raw.asset_number ??
                raw.assetNumber ??
                raw.assetTag ??
                ""
            ).trim(),

          assetType:
            raw.asset_type ??
            raw.asset_type_name ??
            raw.assetType ??
            raw.assetTypeName ??
            "-",

          partId:
            Number(
              raw.part_id ??
                raw.partId ??
                0
            ) || 0,

          partNumber:
            raw.part_number ??
            raw.part_num ??
            raw.partNumber ??
            "-",

          partName:
            raw.part_name ??
            raw.partName ??
            raw.name ??
            "-",

          serialNumber:
            raw.serial_number ??
            raw.serialNumber ??
            "-",

          price:
            parsePrice(
              raw.price ??
                raw.asset_price
            ),

          status:
            normalizeStatus(
              raw.status
            ),

          locationId:
            raw.location_id !=
            null
              ? Number(
                  raw.location_id
                )
              : raw.locationId !=
                  null
                ? Number(
                    raw.locationId
                  )
                : null,

          locationPath:
            raw.location_path ??
            raw.locationPath ??
            raw.location ??
            "-",

          hasOpenCheckout: Boolean(Number(raw.has_open_checkout ?? raw.hasOpenCheckout)),
          isOverdue: Boolean(Number(raw.is_overdue ?? raw.isOverdue)),
        });
      },
      [
        assetId,
      ]
    );

  const loadAssetList =
    useCallback(
      async () => {
        const response =
          await fetch(
            `${API_BASE}/assets`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve assets."
          );
        }

        if (
          !Array.isArray(data)
        ) {
          setAssetList([]);
          return;
        }

        setAssetList(
          data
            .map(
              (row: any) => ({
                id:
                  Number(
                    row.asset_id ??
                      row.id
                  ) || 0,

                partId:
                  Number(
                    row.part_id ??
                      row.partId
                  ) || 0,
              })
            )
            .filter(
              (
                row: AssetListRow
              ) =>
                row.id > 0 &&
                row.partId > 0
            )
        );
      },
      []
    );

  const loadParts =
    useCallback(
      async () => {
        const response =
          await fetch(
            `${API_BASE}/parts`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve parts."
          );
        }

        if (
          !Array.isArray(data)
        ) {
          setParts([]);
          return;
        }

        setParts(
          data.map(
            (part: any) => ({
              id:
                Number(
                  part.part_id ??
                    part.id
                ) || 0,

              partNumber:
                part.part_number ??
                part.part_num ??
                part.partNumber ??
                "",

              partName:
                part.part_name ??
                part.partName ??
                "",

              supplierNumber:
                part.supplier_number ??
                part.supplierNumber ??
                part.serial_number ??
                part.serialNumber ??
                "",

              price:
                parsePrice(
                  part.price ??
                    part.unit_cost
                ),
            })
          )
        );
      },
      []
    );

  const loadAssetTypes =
    useCallback(
      async () => {
        const response =
          await fetch(
            `${API_BASE}/asset-types`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve asset types."
          );
        }

        if (
          !Array.isArray(data)
        ) {
          setAssetTypes([]);
          return;
        }

        const formatted:
          AssetTypeOption[] =
          data
            .map(
              (
                item: any
              ) => ({
                assetTypeName:
                  String(
                    typeof item ===
                      "string"
                      ? item
                      : item.asset_type ??
                          item.asset_type_name ??
                          item.assetType ??
                          item.assetTypeName ??
                          item.name ??
                          ""
                  ).trim(),
              })
            )
            .filter(
              (
                item
              ) =>
                item.assetTypeName !==
                ""
            )
            .filter(
              (
                item,
                index,
                all
              ) =>
                all.findIndex(
                  (
                    candidate
                  ) =>
                    candidate.assetTypeName.toLowerCase() ===
                    item.assetTypeName.toLowerCase()
                ) === index
            )
            .sort(
              (a, b) =>
                a.assetTypeName.localeCompare(
                  b.assetTypeName
                )
            );

        setAssetTypes(
          formatted
        );
      },
      []
    );

  const loadContextTags =
    useCallback(
      async () => {
        const response =
          await fetch(
            CONTEXT_TAG_ENDPOINT
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve context tags."
          );
        }

        const rows =
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data?.context_tag
                )
              ? data.context_tag
              : Array.isArray(
                    data?.tags
                  )
                ? data.tags
                : [];

        const formatted:
          ContextTag[] =
          rows
            .map(
              (tag: any) => ({
                contextTagId:
                  Number(
                    tag.context_tag_id ??
                      tag.contextTagId ??
                      tag.id
                  ) || 0,

                assetId:
                  Number(
                    tag.asset_id ??
                      tag.assetId
                  ) || 0,

                name:
                  cleanTagName(
                    String(
                      tag.context_tag_name ??
                        tag.contextTagName ??
                        tag.tag_name ??
                        tag.tagName ??
                        tag.name ??
                        ""
                    )
                  ),
              })
            )
            .filter(
              (
                tag: ContextTag
              ) =>
                tag.assetId >
                  0 &&
                tag.name !== ""
            );

        setContextTags(
          formatted
        );

        setTagColorIndexes(
          (current) => {
            const next = {
              ...current,
            };

            let changed =
              false;

            for (
              const tag of
              formatted
            ) {
              const key =
                normalizeTagKey(
                  tag.name
                );

              if (
                next[key] ===
                undefined
              ) {
                next[key] =
                  randomTagColorIndex();

                changed =
                  true;
              }
            }

            return changed
              ? next
              : current;
          }
        );
      },
      []
    );

  const loadLocations =
    useCallback(
      async () => {
        const response =
          await fetch(
            `${API_BASE}/locations`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve locations."
          );
        }

        if (
          !Array.isArray(data)
        ) {
          setLocations([]);
          return;
        }

        setLocations(
          data
            .map(
              (
                location: any
              ): LocationOption => ({
                locationId:
                  Number(
                    location.location_id ??
                      location.locationId ??
                      location.id
                  ) || 0,

                parentLocationId:
                  location.parent_location_id ===
                    null ||
                  location.parent_location_id ===
                    undefined ||
                  location.parent_location_id ===
                    ""
                    ? null
                    : Number(
                        location.parent_location_id
                      ),

                locationName:
                  location.location_name ??
                  location.locationName ??
                  location.name ??
                  "",

                locationPath:
                  location.location_path ??
                  location.locationPath ??
                  location.location ??
                  location.location_name ??
                  location.name ??
                  "",
              })
            )
            .filter(
              (
                location
              ) =>
                location.locationId >
                  0 &&
                location.locationPath.trim() !==
                  ""
            )
            .sort(
              (a, b) =>
                a.locationPath.localeCompare(
                  b.locationPath
                )
            )
        );
      },
      []
    );

  const loadHistory =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            assetId
          ) ||
          assetId <= 0
        ) {
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/assets/${assetId}/history`
          );

        const data: any =
          await readResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.details ||
              data.error ||
              data.message ||
              "Failed to retrieve asset history."
          );
        }

        const rows =
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data?.history
                )
              ? data.history
              : Array.isArray(
                    data?.checkouts
                  )
                ? data.checkouts
                : [];

        setHistory(
          rows.map(
            (
              checkout: any
            ) => ({
              id:
                Number(
                  checkout.checkout_id ??
                    checkout.id
                ) || 0,

              holder:
                checkout.holder_name ??
                checkout.holder ??
                checkout.to_name ??
                checkout.checked_out_to ??
                "-",

              checkedOutAt:
                checkout.checked_out_at ??
                checkout.checkout_at ??
                checkout.out_at ??
                checkout.created_at ??
                null,

              dueBack:
                checkout.due_back ??
                checkout.due_date ??
                checkout.due_at ??
                null,

              returnedAt:
                checkout.returned_at ??
                checkout.checked_in_at ??
                null,

              returnLocation:
                checkout.return_location_path ??
                checkout.returned_location_path ??
                checkout.returned_location ??
                checkout.return_location_name ??
                checkout.location_name ??
                checkout.return_location ??
                "-",

              notes:
                checkout.notes ??
                "",
            })
          )
        );
      },
      [
        assetId,
      ]
    );

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadAsset(),
          loadAssetList(),
          loadParts(),
          loadAssetTypes(),
          loadLocations(),
          loadHistory(),

          loadContextTags().catch(
            (tagLoadError) => {
              console.error(
                "FAILED TO LOAD CONTEXT TAGS:",
                tagLoadError
              );

              setContextTags([]);
            }
          ),
        ]);
      } catch (
        loadError
      ) {
        console.error(
          "FAILED TO LOAD ASSET DETAILS:",
          loadError
        );

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Failed to load asset."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [
    loadAsset,
    loadAssetList,
    loadParts,
    loadAssetTypes,
    loadContextTags,
    loadLocations,
    loadHistory,
  ]);

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        TAG_COLOR_STORAGE_KEY,
        JSON.stringify(
          tagColorIndexes
        )
      );
    } catch {
      return;
    }
  }, [
    tagColorIndexes,
  ]);

  const assetContextTags =
    useMemo(() => {
      const unique =
        new Map<
          string,
          ContextTag
        >();

      for (
        const tag of
        contextTags
      ) {
        if (
          tag.assetId !==
          assetId
        ) {
          continue;
        }

        const key =
          normalizeTagKey(
            tag.name
          );

        if (
          key &&
          !unique.has(
            key
          )
        ) {
          unique.set(
            key,
            tag
          );
        }
      }

      return Array.from(
        unique.values()
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );
    }, [
      contextTags,
      assetId,
    ]);

  const allTagNames =
    useMemo(() => {
      const unique =
        new Map<
          string,
          string
        >();

      for (
        const tag of
        contextTags
      ) {
        const key =
          normalizeTagKey(
            tag.name
          );

        if (
          key &&
          !unique.has(
            key
          )
        ) {
          unique.set(
            key,
            tag.name
          );
        }
      }

      return Array.from(
        unique.values()
      ).sort(
        (a, b) =>
          a.localeCompare(
            b
          )
      );
    }, [
      contextTags,
    ]);

  const filteredContextTagOptions =
    useMemo(() => {
      const query =
        normalizeTagKey(
          tagSearch
        );

      return allTagNames.filter(
        (tagName) => {
          const matchesSearch =
            !query ||
            normalizeTagKey(
              tagName
            ).includes(
              query
            );

          const alreadyAssigned =
            assetContextTags.some(
              (tag) =>
                normalizeTagKey(
                  tag.name
                ) ===
                normalizeTagKey(
                  tagName
                )
            );

          return (
            matchesSearch &&
            !alreadyAssigned
          );
        }
      );
    }, [
      allTagNames,
      assetContextTags,
      tagSearch,
    ]);

  const tagSearchHasExactMatch =
    useMemo(() => {
      const query =
        normalizeTagKey(
          tagSearch
        );

      return (
        !!query &&
        allTagNames.some(
          (tagName) =>
            normalizeTagKey(
              tagName
            ) === query
        )
      );
    }, [
      allTagNames,
      tagSearch,
    ]);

  const assetQuantity =
    useMemo(() => {
      if (!asset) {
        return 0;
      }

      return assetList.filter(
        (row) =>
          row.partId ===
          asset.partId
      ).length;
    }, [
      asset,
      assetList,
    ]);

  const displayedEquipmentNumber =
    useMemo(() => {
      if (!asset) {
        return "";
      }

      if (
        /^TSLA-\d+-\d{4}$/i.test(
          asset.equipmentNumber
        )
      ) {
        return asset.equipmentNumber;
      }

      const samePart =
        assetList
          .filter(
            (row) =>
              row.partId ===
              asset.partId
          )
          .sort(
            (a, b) =>
              a.id - b.id
          );

      const index =
        samePart.findIndex(
          (row) =>
            row.id ===
            asset.id
        );

      if (
        index >= 0 &&
        asset.partNumber &&
        asset.partNumber !==
          "-"
      ) {
        return `${asset.partNumber}-${String(
          index + 1
        ).padStart(
          4,
          "0"
        )}`;
      }

      return (
        asset.equipmentNumber ||
        "-"
      );
    }, [
      asset,
      assetList,
    ]);

  const selectedPart =
    useMemo(() => {
      if (!asset) {
        return null;
      }

      return (
        parts.find(
          (part) =>
            part.id ===
            asset.partId
        ) ?? null
      );
    }, [
      asset,
      parts,
    ]);

  const selectedEditPart =
    useMemo(() => {
      const partId =
        Number(
          editForm.partId
        );

      if (
        !Number.isInteger(
          partId
        ) ||
        partId <= 0
      ) {
        return null;
      }

      return (
        parts.find(
          (part) =>
            part.id ===
            partId
        ) ?? null
      );
    }, [
      editForm.partId,
      parts,
    ]);

  const currentCustody =
    history.find(
      (row) =>
        !row.returnedAt
    );

  const isOverdue = Boolean(
    currentCustody?.dueBack &&
    new Date(currentCustody.dueBack).getTime() < Date.now()
  );

  useEffect(() => {
    if (!asset || currentCustody) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "1") return;
    const timeoutId = window.setTimeout(() => {
      setShowCheckout(true);
      params.delete("checkout");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [asset, currentCustody]);

  function ensureTagColor(
    tagName: string
  ) {
    const key =
      normalizeTagKey(
        tagName
      );

    if (!key) {
      return;
    }

    setTagColorIndexes(
      (current) => {
        if (
          current[key] !==
          undefined
        ) {
          return current;
        }

        return {
          ...current,

          [key]:
            randomTagColorIndex(),
        };
      }
    );
  }

  function getTagStyle(
    tagName: string
  ): CSSProperties {
    const key =
      normalizeTagKey(
        tagName
      );

    const paletteIndex =
      tagColorIndexes[
        key
      ] ?? 0;

    const palette =
      TAG_COLOR_PALETTE[
        paletteIndex %
          TAG_COLOR_PALETTE.length
      ];

    return {
      display:
        "inline-flex",

      alignItems:
        "center",

      gap: 4,

      maxWidth: 220,

      padding:
        "4px 9px",

      border:
        `1px solid ${palette.borderColor}`,

      borderRadius:
        999,

      backgroundColor:
        palette.backgroundColor,

      color:
        palette.color,

      fontSize:
        12,

      fontWeight:
        600,

      lineHeight:
        1.4,

      whiteSpace:
        "nowrap",
    };
  }

  async function handleAddContextTag(
    tagName: string
  ) {
    const typedName =
      cleanTagName(
        tagName
      );

    const cleanName =
      allTagNames.find(
        (
          existingName
        ) =>
          normalizeTagKey(
            existingName
          ) ===
          normalizeTagKey(
            typedName
          )
      ) ??
      typedName;

    if (!cleanName) {
      return;
    }

    const alreadyAssigned =
      assetContextTags.some(
        (tag) =>
          normalizeTagKey(
            tag.name
          ) ===
          normalizeTagKey(
            cleanName
          )
      );

    if (alreadyAssigned) {
      setTagSearch("");
      return;
    }

    try {
      setTagSaving(true);
      setTagError("");

      ensureTagColor(
        cleanName
      );

      const response =
        await fetch(
          CONTEXT_TAG_ENDPOINT,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                asset_id:
                  assetId,

                context_tag_name:
                  cleanName,
              }),
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Failed to add context tag "${cleanName}".`
        );
      }

      setTagSearch("");
      setTagPickerOpen(false);

      await loadContextTags();
    } catch (
      addError
    ) {
      console.error(
        "ADD CONTEXT TAG FAILED:",
        addError
      );

      setTagError(
        addError instanceof
          Error
          ? addError.message
          : "Failed to add context tag."
      );
    } finally {
      setTagSaving(false);
    }
  }

  async function handleRemoveContextTag(
    tag: ContextTag
  ) {
    if (
      !tag.contextTagId
    ) {
      return;
    }

    try {
      setTagDeletingId(
        tag.contextTagId
      );

      setTagError("");

      const response =
        await fetch(
          `${API_BASE}/assets/${assetId}/context_tag/${tag.contextTagId}`,
          {
            method:
              "DELETE",
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Failed to remove context tag "${tag.name}".`
        );
      }

      await loadContextTags();
    } catch (
      removeError
    ) {
      console.error(
        "REMOVE CONTEXT TAG FAILED:",
        removeError
      );

      setTagError(
        removeError instanceof
          Error
          ? removeError.message
          : "Failed to remove context tag."
      );
    } finally {
      setTagDeletingId(
        null
      );
    }
  }

  async function refreshAsset() {
    await Promise.all([
      loadAsset(),
      loadAssetList(),
      loadHistory(),
    ]);
  }

  function openEditModal() {
    if (!asset) {
      return;
    }

    const nextForm: EditAssetForm = {
      partId:
        String(
          asset.partId
        ),

      assetType:
        asset.assetType ===
        "-"
          ? ""
          : asset.assetType,

      serialNumber:
        asset.serialNumber ===
        "-"
          ? ""
          : asset.serialNumber,

      price:
        asset.price ===
        null
          ? ""
          : String(
              asset.price
            ),

      status:
        asset.status,

      locationId:
        asset.locationId !=
        null
          ? String(
              asset.locationId
            )
          : "",
    };

    setEditForm(nextForm);
    setInitialEditForm(nextForm);
    setStatusReason("");

    setTagSearch("");
    setTagPickerOpen(false);
    setTagError("");
    setShowEdit(true);
  }

  function closeEditModal() {
    if (
      actionLoading ||
      tagSaving ||
      tagDeletingId !==
        null
    ) {
      return;
    }

    setShowEdit(false);
    setTagSearch("");
    setTagPickerOpen(false);
    setTagError("");
  }

  function confirmCloseEditModal() {
    if (
      actionLoading ||
      tagSaving ||
      tagDeletingId !==
        null
    ) {
      return;
    }

    const hasChanges = JSON.stringify(editForm) !== JSON.stringify(initialEditForm) || statusReason.trim() !== "";
    if (!hasChanges) {
      closeEditModal();
      return;
    }

    const shouldClose =
      window.confirm(
        "Are you sure you want to cancel?\n\nAny unsaved asset changes will be lost."
      );

    if (!shouldClose) {
      return;
    }

    closeEditModal();
  }

  function useSelectedPartPrice() {
    if (
      !selectedEditPart ||
      selectedEditPart.price ===
        null
    ) {
      return;
    }

    setEditForm(
      (current) => ({
        ...current,

        price:
          String(
            selectedEditPart.price
          ),
      })
    );
  }

  async function handleEditAsset() {
    if (!asset) {
      return;
    }

    const partId =
      Number(
        editForm.partId
      );

    if (
      !Number.isInteger(
        partId
      ) ||
      partId <= 0
    ) {
      alert(
        "Please select a valid part."
      );

      return;
    }

    const cleanAssetType =
      editForm.assetType.trim();

    if (!cleanAssetType) {
      alert(
        "Please select a valid asset type."
      );

      return;
    }

    const price =
      editForm.price.trim() ===
      ""
        ? null
        : Number(
            editForm.price
          );

    if (
      price !== null &&
      (
        !Number.isFinite(
          price
        ) ||
        price < 0
      )
    ) {
      alert(
        "Price must be a valid non-negative number."
      );

      return;
    }

    const selectedLocation =
      editForm.locationId
        ? locations.find(
            (location) =>
              location.locationId ===
              Number(
                editForm.locationId
              )
          )
        : null;

    if (
      editForm.locationId &&
      !selectedLocation
    ) {
      alert(
        "Please select a valid location."
      );

      return;
    }

    const shouldSave =
      window.confirm(
        `Are you sure you want to save changes to ${
          displayedEquipmentNumber ||
          "this asset"
        }?\n\nPart: ${
          selectedEditPart
            ? `${selectedEditPart.partNumber} — ${selectedEditPart.partName}`
            : "—"
        }\nAsset Price: ${formatPrice(
          price
        )}`
      );

    if (!shouldSave) {
      return;
    }

    try {
      setActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/assets/${asset.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                part_id:
                  partId,

                asset_type:
                  cleanAssetType,

                serial_number:
                  editForm.serialNumber.trim() ||
                  null,

                price,

                location_id:
                  selectedLocation
                    ?.locationId ??
                  null,

                location:
                  selectedLocation
                    ?.locationPath ??
                  null,

                ...(editForm.status !== initialEditForm.status
                  ? {
                      status: toDatabaseStatus(editForm.status),
                      status_reason: statusReason || undefined,
                    }
                  : {}),
              }),
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Update failed: ${response.status}`
        );
      }

      setShowEdit(false);
      setTagSearch("");
      setTagPickerOpen(false);
      setTagError("");

      await Promise.all([
        loadAsset(),
        loadAssetList(),
      ]);
    } catch (
      editError
    ) {
      console.error(
        "EDIT ASSET FAILED:",
        editError
      );

      alert(
        editError instanceof
          Error
          ? editError.message
          : "Failed to update asset."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  async function handleCheckout() {
    if (!asset) {
      return;
    }

    if (
      !checkoutForm.holder.trim()
    ) {
      alert(
        "Please select or enter the person checking out this asset."
      );

      return;
    }

    try {
      setActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/assets/${asset.id}/checkout`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                holder:
                  checkoutForm.holder.trim(),

                due_date:
                  checkoutForm.dueDate ||
                  null,

                notes:
                  checkoutForm.notes.trim() ||
                  null,
              }),
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Checkout failed: ${response.status}`
        );
      }

      setCheckoutForm({
        holder: "",
        dueDate: "",
        notes: "",
      });

      setShowCheckout(
        false
      );

      await refreshAsset();
    } catch (
      checkoutError
    ) {
      console.error(
        "CHECKOUT FAILED:",
        checkoutError
      );

      alert(
        checkoutError instanceof
          Error
          ? checkoutError.message
          : "Failed to check out asset."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  async function handleCheckin() {
    if (!asset) {
      return;
    }

    const selectedLocation =
      locations.find(
        (location) =>
          location.locationId ===
          Number(
            checkinForm.locationId
          )
      );

    if (!selectedLocation) {
      alert(
        "Please select the return location."
      );

      return;
    }

    try {
      setActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/assets/${asset.id}/checkin`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                location_id:
                  selectedLocation.locationId,

                location:
                  selectedLocation.locationPath,

                notes:
                  checkinForm.notes.trim() ||
                  null,
              }),
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Check-in failed: ${response.status}`
        );
      }

      setCheckinForm({
        locationId: "",
        notes: "",
      });

      setShowCheckin(
        false
      );

      await refreshAsset();
    } catch (
      checkinError
    ) {
      console.error(
        "CHECK-IN FAILED:",
        checkinError
      );

      alert(
        checkinError instanceof
          Error
          ? checkinError.message
          : "Failed to check in asset."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  async function handleDelete() {
    if (!asset) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${displayedEquipmentNumber}?\n\nSerial Number: ${asset.serialNumber}\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        true
      );

      const response =
        await fetch(
          `${API_BASE}/assets/${asset.id}`,
          {
            method:
              "DELETE",
          }
        );

      const data: any =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            data.message ||
            `Delete failed: ${response.status}`
        );
      }

      navigate(
        "/assets"
      );
    } catch (
      deleteError
    ) {
      console.error(
        "DELETE ASSET FAILED:",
        deleteError
      );

      alert(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Failed to delete asset."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  if (loading) {
    return (
      <div className="asset-details-layout">
        <Navbar />

        <main className="asset-details-content">
          <div className="asset-details-message">
            Loading asset...
          </div>
        </main>
      </div>
    );
  }

  if (
    error ||
    !asset
  ) {
    return (
      <div className="asset-details-layout">
        <Navbar />

        <main className="asset-details-content">
          <button
            type="button"
            className="asset-back-button"
            onClick={() =>
              navigate(
                "/assets"
              )
            }
          >
            ← Assets
          </button>

          <div className="asset-details-error">
            <h2>
              Asset could not be loaded
            </h2>

            <p>
              {error ||
                "Asset not found."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const statusClass =
    asset.status
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );

  return (
    <div className="asset-details-layout">
      <Navbar />

      <main className="asset-details-content">
        <button
          type="button"
          className="asset-back-button"
          onClick={() =>
            navigate(
              "/assets"
            )
          }
        >
          ← Assets
        </button>

        <div className="asset-details-header">
          <div>
            <h1>
              {displayedEquipmentNumber}
            </h1>

            <div className="asset-details-subtitle">
              Serial:{" "}
              {asset.serialNumber}
            </div>

            <div className="asset-details-subtitle">
              {asset.partNumber}
              {" · "}
              {asset.partName}
            </div>

            {assetContextTags.length >
              0 && (
              <div
                style={{
                  ...contextTagChipContainerStyle,
                  marginTop:
                    10,
                }}
              >
                {assetContextTags.map(
                  (tag) => (
                    <span
                      key={
                        tag.contextTagId ||
                        `${tag.assetId}-${tag.name}`
                      }
                      style={
                        getTagStyle(
                          tag.name
                        )
                      }
                    >
                      {tag.name}
                    </span>
                  )
                )}
                {assetContextTags.some((tag) => normalizeTagKey(tag.name) === "incomplete") && (
                  <span className="incomplete-assembly-indicator" title="This assembly is marked incomplete because a required component is missing">
                    <span aria-hidden="true">!</span> Missing assembly component
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="asset-details-header-actions">
            <span
              className={`status ${statusClass}`}
            >
              {asset.status}
            </span>

            {isOverdue && (
              <span className="overdue-badge" title="This asset is past its due-back date">
                <span aria-hidden="true">!</span> Overdue
              </span>
            )}

            {!currentCustody && (
              <button
                type="button"
                className="primary-action"
                onClick={() =>
                  setShowCheckout(
                    true
                  )
                }
              >
                Check Out
              </button>
            )}

            {currentCustody && (
              <button
                type="button"
                className="primary-action"
                onClick={() =>
                  setShowCheckin(
                    true
                  )
                }
              >
                Check In
              </button>
            )}
          </div>
        </div>

        <section className="asset-details-card card">
          <div className="asset-card-header">
            <div>
              <h2>
                Asset Details
              </h2>

              <p>
                Information for this individual physical unit
              </p>
            </div>
          </div>

          <div className="asset-info-grid">
            <div className="asset-info-item">
              <span className="asset-info-label">
                Equipment Number
              </span>

              <strong>
                {displayedEquipmentNumber}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Asset Type
              </span>

              <strong>
                {asset.assetType ||
                  "-"}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Serial Number
              </span>

              <strong>
                {asset.serialNumber}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Price
              </span>

              <strong>
                {formatPrice(
                  asset.price
                )}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Quantity
              </span>

              <strong>
                {assetQuantity}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Status
              </span>

              <span
                className={`status ${statusClass}`}
              >
                {asset.status}
              </span>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Location
              </span>

              {asset.locationId ? (
                <button
                  type="button"
                  className="asset-location-link"
                  onClick={() =>
                    navigate(
                      `/locations?locationId=${asset.locationId}`
                    )
                  }
                  title="Open this location"
                >
                  {asset.locationPath || "View location"}
                  <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <strong>{asset.locationPath || "-"}</strong>
              )}
            </div>
          </div>
        </section>

        <section className="asset-details-card card">
          <div className="asset-card-header">
            <div>
              <h2>
                Part
              </h2>

              <p>
                The catalog part this physical asset belongs to.
              </p>
            </div>

            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                navigate(
                  `/parts/${asset.partId}`
                )
              }
            >
              Open Part
            </button>
          </div>

          <div className="asset-info-grid">
            <div className="asset-info-item">
              <span className="asset-info-label">
                Part Number
              </span>

              <strong>
                {asset.partNumber}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Part Name
              </span>

              <strong>
                {asset.partName}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Part Supplier Number
              </span>

              <strong>
                {selectedPart
                  ?.supplierNumber ||
                  "—"}
              </strong>
            </div>

            <div className="asset-info-item">
              <span className="asset-info-label">
                Part Price
              </span>

              <strong>
                {formatPrice(
                  selectedPart
                    ?.price ??
                    null
                )}
              </strong>
            </div>
          </div>
        </section>

        <AssetHierarchyCard assetId={asset.id} />

        <HierarchyPriceCard kind="asset" id={asset.id} basePrice={asset.price} />

        <section className="asset-details-card card">
          <div className="asset-card-header">
            <div>
              <h2>
                Current Custody
              </h2>

              <p>
                Current checkout information for this asset.
              </p>
            </div>
          </div>

          {currentCustody ? (
            <div className="current-custody">
              <div>
                <span>
                  Holder
                </span>

                <strong>
                  {
                    currentCustody.holder
                  }
                </strong>
              </div>

              <div>
                <span>
                  Due Back
                </span>

                <strong>
                  {formatDate(
                    currentCustody.dueBack
                  )}
                </strong>
              </div>
            </div>
          ) : (
            <div className="asset-empty-state">
              This asset is not currently out on job
            </div>
          )}
        </section>

        <section className="asset-details-card card">
          <div className="asset-card-header">
            <div>
              <h2>
                Custody History
              </h2>

              <p>
                Previous check-outs and returns for this asset
              </p>
            </div>
          </div>

          <div className="asset-history-table-wrapper">
            <table className="asset-history-table table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>
                    Holder
                  </th>

                  <th>
                    Checked Out
                  </th>

                  <th>
                    Due Back
                  </th>

                  <th>
                    Returned
                  </th>

                  <th>
                    Return Location
                  </th>

                  <th>
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map(
                  (row) => (
                    <tr
                      key={
                        row.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            row.holder
                          }
                        </strong>
                      </td>

                      <td>
                        {formatDateTime(
                          row.checkedOutAt
                        )}
                      </td>

                      <td>
                        {formatDate(
                          row.dueBack
                        )}
                      </td>

                      <td>
                        {row.returnedAt ? (
                          formatDateTime(
                            row.returnedAt
                          )
                        ) : (
                          <span className="history-open">
                            Currently out
                          </span>
                        )}
                      </td>

                      <td>
                        {
                          row.returnLocation
                        }
                      </td>

                      <td>
                        {row.notes ||
                          "-"}
                      </td>
                    </tr>
                  )
                )}

                {history.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="asset-history-empty"
                    > No custody history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="asset-details-card card">
          <div className="asset-card-header">
            <div>
              <h2>
                Asset Actions
              </h2>
            </div>
          </div>

          <div className="asset-management-actions">
            <button
              type="button"
              className="secondary-action"
              disabled={
                actionLoading
              }
              onClick={
                openEditModal
              }
            >
              Edit Asset
            </button>

            <button
              type="button"
              className="danger-action"
              disabled={
                actionLoading
              }
              onClick={
                handleDelete
              }
            >
              Delete Asset
            </button>
          </div>
        </section>
      </main>

      {showEdit && (
        <div
          className="modal-overlay"
          role="presentation"
        >
          <div
            className="asset-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-asset-title"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2 id="edit-asset-title">
                  Edit Asset
                </h2>

                <p>
                  {displayedEquipmentNumber}
                  {" · "}
                  {asset.partNumber}
                  {" · "}
                  {asset.serialNumber}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                disabled={
                  actionLoading ||
                  tagSaving ||
                  tagDeletingId !==
                    null
                }
                onClick={
                  confirmCloseEditModal
                }
              >
                ×
              </button>
            </div>

            <div className="asset-action-form">
              <div className="form-group">
                <label htmlFor="editPart">
                  Part
                </label>

                <select
                  id="editPart"
                  value={
                    editForm.partId
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (
                        current
                      ) => ({
                        ...current,

                        partId:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select a part
                  </option>

                  {parts.map(
                    (part) => (
                      <option
                        key={
                          part.id
                        }
                        value={
                          part.id
                        }
                      >
                        {
                          part.partNumber
                        }

                        {" — "}

                        {
                          part.partName
                        }

                        {" — "}

                        Supplier Number:{" "}

                        {part.supplierNumber ||
                          "—"}

                        {" — "}

                        Part Price:{" "}

                        {formatPrice(
                          part.price
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editAssetType">
                  Asset Type
                </label>

                <select
                  id="editAssetType"
                  value={
                    editForm.assetType
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (
                        current
                      ) => ({
                        ...current,

                        assetType:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select an asset type
                  </option>

                  {assetTypes.map(
                    (
                      assetType
                    ) => (
                      <option
                        key={
                          assetType.assetTypeName
                        }
                        value={
                          assetType.assetTypeName
                        }
                      >
                        {
                          assetType.assetTypeName
                        }
                      </option>
                    )
                  )}
                </select>

                <small>
                  New asset types can be added from the Assets page
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editEquipmentNumber">
                  Equipment Number
                </label>

                <input
                  id="editEquipmentNumber"
                  type="text"
                  value={
                    displayedEquipmentNumber
                  }
                  readOnly
                  disabled
                />

                <small>
                  Equipment Numbers are assigned automatically and cannot be changed manually
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editAssetSerial">
                  Serial Number
                </label>

                <input
                  id="editAssetSerial"
                  type="text"
                  placeholder="Enter serial number"
                  value={
                    editForm.serialNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (
                        current
                      ) => ({
                        ...current,

                        serialNumber:
                          event.target
                            .value,
                      })
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="editAssetPrice">
                  Price
                </label>

                <input
                  id="editAssetPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Enter asset price"
                  value={
                    editForm.price
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (
                        current
                      ) => ({
                        ...current,

                        price:
                          event.target
                            .value,
                      })
                    )
                  }
                />

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    flexWrap:
                      "wrap",

                    gap: 8,

                    marginTop: 2,
                  }}
                >
                  <small
                    style={{
                      marginTop: 0,
                    }}
                  >
                    {selectedEditPart
                      ? selectedEditPart.price ===
                        null
                        ? "Selected part price is not set. Enter the asset price manually."
                        : `Selected part price: ${formatPrice(
                            selectedEditPart.price
                          )}. Enter a different asset price or use the part price.`
                      : "Select a part to reference its price, or enter the asset price manually."}
                  </small>

                  {selectedEditPart &&
                    selectedEditPart.price !==
                      null && (
                    <button
                      type="button"
                      className="cancel-button"
                      style={{
                        minWidth:
                          "auto",

                        padding:
                          "6px 10px",

                        fontSize:
                          12,
                      }}
                      onClick={
                        useSelectedPartPrice
                      }
                      disabled={
                        actionLoading ||
                        tagSaving ||
                        tagDeletingId !==
                          null
                      }
                    >
                      Use Part Price
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>
                  Context Tags
                </label>

                <div
                  style={{
                    ...contextTagChipContainerStyle,

                    marginBottom:
                      assetContextTags.length >
                      0
                        ? 8
                        : 0,
                  }}
                >
                  {assetContextTags.length >
                  0 ? (
                    assetContextTags.map(
                      (tag) => (
                        <button
                          key={
                            tag.contextTagId ||
                            `${tag.assetId}-${tag.name}`
                          }
                          type="button"
                          title={`Remove ${tag.name}`}
                          style={{
                            ...getTagStyle(
                              tag.name
                            ),

                            cursor:
                              "pointer",
                          }}
                          disabled={
                            tagSaving ||
                            tagDeletingId !==
                              null
                          }
                          onClick={() =>
                            void handleRemoveContextTag(
                              tag
                            )
                          }
                        >
                          {tagDeletingId ===
                          tag.contextTagId
                            ? "Removing..."
                            : `${tag.name} ×`}
                        </button>
                      )
                    )
                  ) : (
                    <span
                      style={{
                        color:
                          "#667085",

                        fontSize:
                          13,
                      }}
                    >
                      No context tags assigned.
                    </span>
                  )}
                </div>

                <div
                  style={
                    contextTagPickerStyle
                  }
                  onClick={(
                    event
                  ) =>
                    event.stopPropagation()
                  }
                >
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Search or create a context tag..."
                    value={
                      tagSearch
                    }
                    disabled={
                      tagSaving ||
                      tagDeletingId !==
                        null
                    }
                    onFocus={() =>
                      setTagPickerOpen(
                        true
                      )
                    }
                    onChange={(
                      event
                    ) => {
                      setTagSearch(
                        event.target
                          .value
                      );

                      setTagPickerOpen(
                        true
                      );

                      if (
                        tagError
                      ) {
                        setTagError(
                          ""
                        );
                      }
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        tagSearch.trim()
                      ) {
                        event.preventDefault();

                        void handleAddContextTag(
                          tagSearch
                        );
                      }

                      if (
                        event.key ===
                        "Escape"
                      ) {
                        setTagPickerOpen(
                          false
                        );
                      }
                    }}
                  />
                  <small className="incomplete-tag-help">Selecting or typing <strong>Incomplete</strong> displays a missing-assembly warning on this asset.</small>

                  {tagPickerOpen && (
                    <div
                      style={
                        contextTagDropdownStyle
                      }
                      onClick={(
                        event
                      ) =>
                        event.stopPropagation()
                      }
                    >
                      {filteredContextTagOptions.map(
                        (
                          tagName
                        ) => (
                          <button
                            key={
                              tagName
                            }
                            type="button"
                            disabled={
                              tagSaving ||
                              tagDeletingId !==
                                null
                            }
                            style={
                              contextTagOptionStyle
                            }
                            onMouseDown={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              void handleAddContextTag(
                                tagName
                              )
                            }
                          >
                            <span
                              style={
                                getTagStyle(
                                  tagName
                                )
                              }
                            >
                              {
                                tagName
                              }
                            </span>
                          </button>
                        )
                      )}

                      {tagSearch.trim() &&
                        !tagSearchHasExactMatch && (
                          <button
                            type="button"
                            className="primary-action"
                            disabled={
                              tagSaving ||
                              tagDeletingId !==
                                null
                            }
                            onMouseDown={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              void handleAddContextTag(
                                tagSearch
                              )
                            }
                            style={{
                              width:
                                "100%",

                              marginTop:
                                filteredContextTagOptions.length >
                                0
                                  ? 6
                                  : 0,
                            }}
                          >
                            {tagSaving
                              ? "Adding..."
                              : `+ Create "${cleanTagName(
                                  tagSearch
                                )}"`}
                          </button>
                        )}

                      {filteredContextTagOptions.length ===
                        0 &&
                        !tagSearch.trim() && (
                          <div
                            style={{
                              padding:
                                "10px 8px",

                              color:
                                "#667085",

                              fontSize:
                                13,
                            }}
                          >
                            Type a tag name or choose an existing tag.
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {tagError && (
                  <div
                    role="alert"
                    style={{
                      marginTop:
                        8,

                      padding:
                        "9px 11px",

                      border:
                        "1px solid #f1b5b5",

                      borderRadius:
                        7,

                      background:
                        "#fff1f1",

                      color:
                        "#8c2424",

                      fontSize:
                        13,
                    }}
                  >
                    {tagError}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="editAssetLocation">
                  Location
                </label>

                <select
                  id="editAssetLocation"
                  value={
                    editForm.locationId
                  }
                  onChange={(
                    event
                  ) =>
                    setEditForm(
                      (
                        current
                      ) => ({
                        ...current,

                        locationId:
                          event.target
                            .value,
                      })
                    )
                  }
                >
                  <option value="">
                    No location
                  </option>

                  {locations.map(
                    (
                      location
                    ) => (
                      <option
                        key={
                          location.locationId
                        }
                        value={
                          location.locationId
                        }
                      >
                        {
                          location.locationPath
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="editAssetStatus">
                  Status
                </label>

                <select
                  id="editAssetStatus"
                  value={
                    editForm.status
                  }
                  disabled={Boolean(currentCustody)}
                  title={currentCustody ? "Status is controlled by the active checkout." : undefined}
                  onChange={(event) => {
                    const nextStatus = event.target.value as AssetStatus;
                    if (nextStatus === "Reserved") return;
                    if (nextStatus === "In Use") {
                      if (window.confirm("In Use is controlled by checkout. Would you like to check out this asset now?")) {
                        closeEditModal();
                        setShowCheckout(true);
                      }
                      return;
                    }
                    if (nextStatus === "Disposed" || nextStatus === "Retired") {
                      const reason = window.prompt(`Why is this asset being marked ${nextStatus.toLowerCase()}?`)?.trim() ?? "";
                      if (!reason) return;
                      setStatusReason(reason);
                    } else {
                      setStatusReason("");
                    }
                    setEditForm((current) => ({ ...current, status: nextStatus }));
                  }}
                >
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
                <small>
                  {currentCustody
                    ? "Status is locked until this asset is checked in."
                    : "In Use starts checkout. Disposed and Retired require a reason."}
                </small>
                {statusReason && <small className="status-reason-preview">Reason: {statusReason}</small>}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={
                    actionLoading ||
                    tagSaving ||
                    tagDeletingId !==
                      null
                  }
                  onClick={
                    confirmCloseEditModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="add-button"
                  disabled={
                    actionLoading ||
                    tagSaving ||
                    tagDeletingId !==
                      null
                  }
                  onClick={
                    handleEditAsset
                  }
                >
                  {actionLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowCheckout(
              false
            )
          }
        >
          <div
            className="asset-action-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  Check Out Asset
                </h2>

                <p>
                  {displayedEquipmentNumber}
                  {" · "}
                  {asset.serialNumber}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowCheckout(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="asset-action-form">
              <div className="form-group">
                <label htmlFor="checkoutHolder">
                  Who is checking out this asset?
                </label>

                <input
                  id="checkoutHolder"
                  type="text"
                  placeholder="Search Entra directory"
                  value={
                    checkoutForm.holder
                  }
                  onChange={(
                    event
                  ) =>
                    setCheckoutForm({
                      ...checkoutForm,

                      holder:
                        event.target
                          .value,
                    })
                  }
                />

                <small>
                  Replace input with an Entra directory people-picker when component is available
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="checkoutDueDate">
                  Due Back
                </label>

                <input
                  id="checkoutDueDate"
                  type="date"
                  min={new Intl.DateTimeFormat("en-CA").format(new Date())}
                  value={
                    checkoutForm.dueDate
                  }
                  onChange={(
                    event
                  ) =>
                    setCheckoutForm({
                      ...checkoutForm,

                      dueDate:
                        event.target
                          .value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="checkoutNotes">
                  Notes
                </label>

                <textarea
                  id="checkoutNotes"
                  placeholder="Optional checkout notes"
                  rows={
                    4
                  }
                  value={
                    checkoutForm.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setCheckoutForm({
                      ...checkoutForm,

                      notes:
                        event.target
                          .value,
                    })
                  }
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    setShowCheckout(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="add-button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleCheckout
                  }
                >
                  {actionLoading
                    ? "Checking Out..."
                    : "Check Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCheckin && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowCheckin(
              false
            )
          }
        >
          <div
            className="asset-action-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  Check In Asset
                </h2>

                <p>
                  {displayedEquipmentNumber}
                  {" · "}
                  {asset.serialNumber}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowCheckin(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="asset-action-form">
              <div className="form-group">
                <label htmlFor="returnLocation">
                  Return Location
                </label>

                <select
                  id="returnLocation"
                  value={
                    checkinForm.locationId
                  }
                  onChange={(
                    event
                  ) =>
                    setCheckinForm({
                      ...checkinForm,

                      locationId:
                        event.target
                          .value,
                    })
                  }
                >
                  <option value="">
                    Select return location
                  </option>

                  {locations.map(
                    (
                      location
                    ) => (
                      <option
                        key={
                          location.locationId
                        }
                        value={
                          location.locationId
                        }
                      >
                        {
                          location.locationPath
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="checkinNotes">
                  Notes
                </label>

                <textarea
                  id="checkinNotes"
                  placeholder="Condition, damage, return notes..."
                  rows={
                    4
                  }
                  value={
                    checkinForm.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setCheckinForm({
                      ...checkinForm,

                      notes:
                        event.target
                          .value,
                    })
                  }
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    setShowCheckin(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="add-button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleCheckin
                  }
                >
                  {actionLoading
                    ? "Checking In..."
                    : "Check In"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
