import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Navbar from "../../components/Navbar.tsx";
import { API_ORIGIN as API_URL } from "../../config/api.ts";
import PartHierarchyTree from "./PartHierarchyTree.tsx";
import HierarchyPriceCard from "../../components/HierarchyPriceCard.tsx";
import AssignedAssetsCard from "./AssignedAssetsCard.tsx";
import AssemblyTemplateHint from "../../components/AssemblyTemplateHint.tsx";
import {
  CATEGORY_HISTORY_KEY,
  MANUFACTURER_HISTORY_KEY,
  normalizeUrlEntries,
  mapPartRecord,
  mapSubPartRecord,
  mapPartOption,
  getStoredHistory,
  saveHistory,
  mergeHistory,
  parseApiResponse
} from "./PartDetails.model.ts";
import type {
  PartDetailsType,
  SubPartType,
  PartOptionType
} from "./PartDetails.model.ts";

export default function PartDetails() {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const [
    part,
    setPart,
  ] =
    useState<PartDetailsType | null>(
      null
    );

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
    editingPart,
    setEditingPart,
  ] =
    useState<PartDetailsType | null>(
      null
    );

  const [
    savingEdit,
    setSavingEdit,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    imageIndex,
    setImageIndex,
  ] =
    useState(0);

  const [
    sharepointIndex,
    setSharepointIndex,
  ] =
    useState(0);

  const [
    categoryHistory,
    setCategoryHistory,
  ] =
    useState<string[]>(
      []
    );

  const [
    manufacturerHistory,
    setManufacturerHistory,
  ] =
    useState<string[]>(
      []
    );


  const [
    subParts,
    setSubParts,
  ] =
    useState<SubPartType[]>(
      []
    );

  const [
    usedIn,
    setUsedIn,
  ] =
    useState<SubPartType[]>(
      []
    );

  const [
    loadingSubParts,
    setLoadingSubParts,
  ] =
    useState(false);

  const [
    subPartError,
    setSubPartError,
  ] =
    useState("");

  const [
    showAddSubPart,
    setShowAddSubPart,
  ] =
    useState(false);

  const [
    partOptions,
    setPartOptions,
  ] =
    useState<PartOptionType[]>(
      []
    );

  const [
    loadingPartOptions,
    setLoadingPartOptions,
  ] =
    useState(false);

  const [
    subPartSearch,
    setSubPartSearch,
  ] =
    useState("");

  const [
    selectedChildPartId,
    setSelectedChildPartId,
  ] =
    useState<number | null>(
      null
    );

  const [
    savingSubPart,
    setSavingSubPart,
  ] =
    useState(false);

  const [
    removingSubPartId,
    setRemovingSubPartId,
  ] =
    useState<number | null>(
      null
    );

  useEffect(() => {
    setCategoryHistory(
      getStoredHistory(
        CATEGORY_HISTORY_KEY
      )
    );

    setManufacturerHistory(
      getStoredHistory(
        MANUFACTURER_HISTORY_KEY
      )
    );
  }, []);

  function addCategoryToHistory(
    category: string
  ) {
    const cleanCategory =
      category.trim();

    if (!cleanCategory) {
      return;
    }

    setCategoryHistory(
      (current) => {
        const updated =
          mergeHistory(
            current,
            [cleanCategory]
          );

        saveHistory(
          CATEGORY_HISTORY_KEY,
          updated
        );

        return updated;
      }
    );
  }

  function addManufacturerToHistory(
    manufacturer: string
  ) {
    const cleanManufacturer =
      manufacturer.trim();

    if (
      !cleanManufacturer
    ) {
      return;
    }

    setManufacturerHistory(
      (current) => {
        const updated =
          mergeHistory(
            current,
            [
              cleanManufacturer,
            ]
          );

        saveHistory(
          MANUFACTURER_HISTORY_KEY,
          updated
        );

        return updated;
      }
    );
  }

  async function getSubPartData() {
    if (!id) {
      return;
    }

    try {
      setLoadingSubParts(
        true
      );

      setSubPartError(
        ""
      );

      const [
        subPartsResponse,
        usedInResponse,
      ] =
        await Promise.all([
          fetch(
            `${API_URL}/api/parts/${id}/sub-parts`
          ),
          fetch(
            `${API_URL}/api/parts/${id}/used-in`
          ),
        ]);

      const [
        subPartData,
        usedInData,
      ] =
        await Promise.all([
          parseApiResponse(
            subPartsResponse
          ),
          parseApiResponse(
            usedInResponse
          ),
        ]);

      setSubParts(
        Array.isArray(
          subPartData
        )
          ? subPartData.map(
              mapSubPartRecord
            )
          : []
      );

      setUsedIn(
        Array.isArray(
          usedInData
        )
          ? usedInData.map(
              mapSubPartRecord
            )
          : []
      );
    } catch (error) {
      console.error(
        "Error fetching sub-parts:",
        error
      );

      setSubPartError(
        error instanceof Error
          ? error.message
          : "Unable to load sub-parts."
      );
    } finally {
      setLoadingSubParts(
        false
      );
    }
  }

  async function getPartOptions() {
    try {
      setLoadingPartOptions(
        true
      );

      const response =
        await fetch(
          `${API_URL}/api/parts`
        );

      const data =
        await parseApiResponse(
          response
        );

      setPartOptions(
        Array.isArray(data)
          ? data.map(
              mapPartOption
            )
          : []
      );
    } catch (error) {
      console.error(
        "Error fetching parts for sub-part selection:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load parts."
      );
    } finally {
      setLoadingPartOptions(
        false
      );
    }
  }

  async function openAddSubPartModal() {
    setSubPartSearch(
      ""
    );

    setSelectedChildPartId(
      null
    );

    setShowAddSubPart(
      true
    );

    if (
      partOptions.length === 0
    ) {
      await getPartOptions();
    }
  }

  function closeAddSubPartModal() {
    if (savingSubPart) {
      return;
    }

    setShowAddSubPart(
      false
    );

    setSelectedChildPartId(
      null
    );

    setSubPartSearch(
      ""
    );

  }

  async function handleAddSubPart() {
    if (
      !part ||
      savingSubPart
    ) {
      return;
    }

    if (
      selectedChildPartId ===
      null
    ) {
      alert(
        "Select a part to add."
      );

      return;
    }

    try {
      setSavingSubPart(
        true
      );

      const response =
        await fetch(
          `${API_URL}/api/parts/${part.id}/sub-parts`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                child_part_id:
                  selectedChildPartId,
              }),
          }
        );

      await parseApiResponse(
        response
      );

      setShowAddSubPart(
        false
      );

      setSelectedChildPartId(
        null
      );

      setSubPartSearch(
        ""
      );

      await getSubPartData();
    } catch (error) {
      console.error(
        "Error adding sub-part:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add sub-part."
      );
    } finally {
      setSavingSubPart(
        false
      );
    }
  }

  async function handleRemoveSubPart(
    subPart: SubPartType
  ) {
    if (
      !part ||
      removingSubPartId !==
        null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove one ${
          subPart.partNumber ||
          subPart.partName
        } from ${
          part.partNumber ||
          part.partName
        }?\n\nThe stored quantity will decrease automatically. The part record itself will not be deleted.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingSubPartId(
        subPart.subPartId
      );

      const response =
        await fetch(
          `${API_URL}/api/parts/${part.id}/sub-parts/${subPart.subPartId}`,
          {
            method:
              "DELETE",
          }
        );

      await parseApiResponse(
        response
      );

      await getSubPartData();
    } catch (error) {
      console.error(
        "Error removing sub-part:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to remove sub-part."
      );
    } finally {
      setRemovingSubPartId(
        null
      );
    }
  }

  async function getPart() {
    if (!id) {
      setError(
        "No part ID was provided."
      );

      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/parts/${id}`
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};
      } catch {
        data = {
          error:
            responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            data.message ||
            "Failed to retrieve part."
        );
      }

      const record =
        data.part ??
        data;

      const formattedPart =
        mapPartRecord(
          record
        );

      setPart(
        formattedPart
      );

      setImageIndex(0);
      setSharepointIndex(0);

      if (
        formattedPart.category
      ) {
        addCategoryToHistory(
          formattedPart.category
        );
      }

      if (
        formattedPart.manufacturer
      ) {
        addManufacturerToHistory(
          formattedPart.manufacturer
        );
      }
    } catch (error) {
      console.error(
        "Error fetching part details:",
        error
      );

      if (
        error instanceof
        Error
      ) {
        setError(
          error.message
        );
      } else {
        setError(
          "Unable to load part details."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getPart();
  }, [id]);


  useEffect(() => {
    getSubPartData();
  }, [id]);

  useEffect(() => {
    if (!part) {
      return;
    }

    setImageIndex(
      (current) =>
        Math.min(
          current,
          Math.max(
            part.images.length -
              1,
            0
          )
        )
    );

    setSharepointIndex(
      (current) =>
        Math.min(
          current,
          Math.max(
            part
              .sharepointUrls
              .length - 1,
            0
          )
        )
    );
  }, [
    part?.images.length,
    part?.sharepointUrls.length,
  ]);

  function formatDate(
    value: string
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

  function formatPrice(
    price: number | null
  ) {
    if (
      price === null
    ) {
      return "-";
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD",
      }
    ).format(price);
  }

  function createPartUpdatePayload(
    currentPart:
      PartDetailsType
  ) {
    const images =
      normalizeUrlEntries(
        currentPart.images
      );

    const sharepointUrls =
      normalizeUrlEntries(
        currentPart.sharepointUrls
      );

    return {
      part_name:
        currentPart.partName
          .trim(),

      description:
        currentPart.description
          .trim() ||
        null,

      category:
        currentPart.category
          .trim() ||
        null,

      manufacturer:
        currentPart.manufacturer
          .trim() ||
        null,

      price:
        currentPart.price,

      supplier_number:
        currentPart.supplierNumber
          .trim() ||
        null,

      images,

      image_url:
        images[0]?.url ||
        null,

      image_description:
        images[0]
          ?.description ||
        null,

      sharepoint_urls:
        sharepointUrls,

      sharepoint_url:
        sharepointUrls[0]
          ?.url ||
        null,

      sharepoint_description:
        sharepointUrls[0]
          ?.description ||
        null,

      updated_by:
        currentPart.updatedBy
          .trim() ||
        null,
    };
  }

  async function sendPartUpdate(
    updatedPart:
      PartDetailsType
  ) {
    const response =
      await fetch(
        `${API_URL}/api/parts/${updatedPart.id}`,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              createPartUpdatePayload(
                updatedPart
              )
            ),
        }
      );

    const responseText =
      await response.text();

    let data: any = {};

    try {
      data =
        responseText
          ? JSON.parse(
              responseText
            )
          : {};
    } catch {
      data = {
        error:
          responseText,
      };
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.details ||
          data.message ||
          "Failed to update part."
      );
    }

    return data;
  }

  function openEditPart() {
    if (!part) {
      return;
    }

    setEditingPart({
      ...part,

      images:
        part.images.map(
          (image) => ({
            ...image,
          })
        ),

      sharepointUrls:
        part.sharepointUrls.map(
          (entry) => ({
            ...entry,
          })
        ),
    });
  }

  function closeEditPart() {
    if (
      savingEdit
    ) {
      return;
    }

    setEditingPart(
      null
    );
  }

  function confirmCloseEditPart() {
    if (
      savingEdit
    ) {
      return;
    }

    const hasChanges = Boolean(part) && JSON.stringify(editingPart) !== JSON.stringify(part);
    if (!hasChanges) {
      closeEditPart();
      return;
    }

    const shouldClose =
      window.confirm(
        "Are you sure you want to cancel?\n\nAny unsaved changes will be lost."
      );

    if (!shouldClose) {
      return;
    }

    closeEditPart();
  }

  function addEditingImage() {
    setEditingPart(
      (current) =>
        current
          ? {
              ...current,

              images: [
                ...current.images,
                {
                  description:
                    "",
                  url: "",
                },
              ],
            }
          : current
    );
  }

  function updateEditingImage(
    index: number,
    field:
      | "description"
      | "url",
    value: string
  ) {
    setEditingPart(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          images:
            current.images.map(
              (
                image,
                imageIndex
              ) =>
                imageIndex ===
                index
                  ? {
                      ...image,
                      [field]:
                        value,
                    }
                  : image
            ),
        };
      }
    );
  }

  function removeEditingImage(
    index: number
  ) {
    setEditingPart(
      (current) =>
        current
          ? {
              ...current,

              images:
                current.images.filter(
                  (
                    _,
                    imageIndex
                  ) =>
                    imageIndex !==
                    index
                ),
            }
          : current
    );
  }

  function addEditingSharepointUrl() {
    setEditingPart(
      (current) =>
        current
          ? {
              ...current,

              sharepointUrls: [
                ...current
                  .sharepointUrls,
                {
                  description:
                    "",
                  url: "",
                },
              ],
            }
          : current
    );
  }

  function updateEditingSharepointUrl(
    index: number,
    field:
      | "description"
      | "url",
    value: string
  ) {
    setEditingPart(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          sharepointUrls:
            current
              .sharepointUrls
              .map(
                (
                  entry,
                  entryIndex
                ) =>
                  entryIndex ===
                  index
                    ? {
                        ...entry,
                        [field]:
                          value,
                      }
                    : entry
              ),
        };
      }
    );
  }

  function removeEditingSharepointUrl(
    index: number
  ) {
    setEditingPart(
      (current) =>
        current
          ? {
              ...current,

              sharepointUrls:
                current
                  .sharepointUrls
                  .filter(
                    (
                      _,
                      entryIndex
                    ) =>
                      entryIndex !==
                      index
                  ),
            }
          : current
    );
  }

  function showPreviousImage() {
    if (!part) {
      return;
    }

    const imageCount =
      part.images.length;

    if (imageCount <= 1) {
      return;
    }

    setImageIndex(
      (current) =>
        current === 0
          ? imageCount - 1
          : current - 1
    );
  }

  function showNextImage() {
    if (!part) {
      return;
    }

    const imageCount =
      part.images.length;

    if (imageCount <= 1) {
      return;
    }

    setImageIndex(
      (current) =>
        current ===
        imageCount - 1
          ? 0
          : current + 1
    );
  }

  function showPreviousSharepoint() {
    if (!part) {
      return;
    }

    const sharepointCount =
      part.sharepointUrls.length;

    if (sharepointCount <= 1) {
      return;
    }

    setSharepointIndex(
      (current) =>
        current === 0
          ? sharepointCount - 1
          : current - 1
    );
  }

  function showNextSharepoint() {
    if (!part) {
      return;
    }

    const sharepointCount =
      part.sharepointUrls.length;

    if (sharepointCount <= 1) {
      return;
    }

    setSharepointIndex(
      (current) =>
        current ===
        sharepointCount - 1
          ? 0
          : current + 1
    );
  }

  async function handleUpdatePart() {
    if (
      !editingPart ||
      savingEdit
    ) {
      return;
    }

    if (
      !editingPart.partName
        .trim()
    ) {
      alert(
        "Part Name is required."
      );

      return;
    }

    if (
      editingPart.price !==
        null &&
      (
        !Number.isFinite(
          editingPart.price
        ) ||
        editingPart.price <
          0
      )
    ) {
      alert(
        "Price must be a valid non-negative number."
      );

      return;
    }

    const shouldSave =
      window.confirm(
        `Are you sure you want to save changes to ${
          editingPart.partNumber ||
          editingPart.partName ||
          "this part"
        }?`
      );

    if (!shouldSave) {
      return;
    }

    const cleanImages =
      normalizeUrlEntries(
        editingPart.images
      );

    const cleanSharepointUrls =
      normalizeUrlEntries(
        editingPart.sharepointUrls
      );

    try {
      setSavingEdit(
        true
      );

      const updatedPart = {
        ...editingPart,

        category:
          editingPart.category
            .trim(),

        manufacturer:
          editingPart
            .manufacturer
            .trim(),

        images:
          cleanImages,

        sharepointUrls:
          cleanSharepointUrls,
      };

      const data =
        await sendPartUpdate(
          updatedPart
        );

      if (
        updatedPart.category
      ) {
        addCategoryToHistory(
          updatedPart.category
        );
      }

      if (
        updatedPart.manufacturer
      ) {
        addManufacturerToHistory(
          updatedPart.manufacturer
        );
      }

      if (
        data.part_id ||
        data.part?.part_id
      ) {
        const returnedPart =
          mapPartRecord(
            data.part ??
              data
          );

        const returnedHasArrays =
          Array.isArray(
            data.images
          ) ||
          Array.isArray(
            data.part?.images
          ) ||
          Array.isArray(
            data.sharepoint_urls
          ) ||
          Array.isArray(
            data.part
              ?.sharepoint_urls
          );

        setPart(
          returnedHasArrays
            ? returnedPart
            : {
                ...updatedPart,

                updatedAt:
                  returnedPart.updatedAt ||
                  new Date()
                    .toISOString(),
              }
        );
      } else {
        setPart({
          ...updatedPart,

          updatedAt:
            new Date()
              .toISOString(),
        });
      }

      setImageIndex(0);
      setSharepointIndex(0);

      setEditingPart(
        null
      );
    } catch (error) {
      console.error(
        "Error updating part:",
        error
      );

      alert(
        error instanceof
          Error
          ? error.message
          : "Failed to update part."
      );
    } finally {
      setSavingEdit(
        false
      );
    }
  }

  async function handleDeletePart() {
    if (
      !part ||
      deleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${
          part.partNumber ||
          part.partName
        }?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setDeleting(
        true
      );

      const response =
        await fetch(
          `${API_URL}/api/parts/${part.id}`,
          {
            method:
              "DELETE",
          }
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};
      } catch {
        data = {
          error:
            responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            data.message ||
            "Failed to delete part."
        );
      }

      navigate(
        "/parts"
      );
    } catch (error) {
      console.error(
        "Error deleting part:",
        error
      );

      alert(
        error instanceof
          Error
          ? error.message
          : "Failed to delete part."
      );
    } finally {
      setDeleting(
        false
      );
    }
  }

  if (loading) {
    return (
      <div className="part-details-layout">
        <Navbar />

        <main className="part-details-content">
          <div className="part-details-status">
            Loading part...
          </div>
        </main>
      </div>
    );
  }

  if (
    error ||
    !part
  ) {
    return (
      <div className="part-details-layout">
        <Navbar />

        <main className="part-details-content">
          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(
                "/parts"
              )
            }
          >
            ← Parts
          </button>

          <div className="part-details-error">
            <h2>
              Unable to load part
            </h2>

            <p>
              {error ||
                "Part was not found."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const availableCategories =
    mergeHistory(
      categoryHistory,
      part.category
        ? [
            part.category,
          ]
        : []
    );

  const availableManufacturers =
    mergeHistory(
      manufacturerHistory,
      part.manufacturer
        ? [
            part.manufacturer,
          ]
        : []
    );

  const activeImage =
    part.images[
      imageIndex
    ] ??
    part.images[0] ?? {
      url: "",
      description: "",
    };

  const activeSharepoint =
    part.sharepointUrls[
      sharepointIndex
    ] ??
    part.sharepointUrls[0] ?? {
      url: "",
      description: "",
    };

  const normalizedSubPartSearch =
    subPartSearch
      .trim()
      .toLowerCase();

  const filteredPartOptions =
    partOptions.filter(
      (option) => {
        if (
          option.id === part.id
        ) {
          return false;
        }

        if (
          !normalizedSubPartSearch
        ) {
          return true;
        }

        return [
          option.partNumber,
          option.partName,
          option.category,
          option.manufacturer,
        ].some((value) =>
          value
            .toLowerCase()
            .includes(
              normalizedSubPartSearch
            )
        );
      }
    );

  return (
    <div className="part-details-layout">
      <Navbar />

      <main className="part-details-content">
        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate(
              "/parts"
            )
          }
        >
          ← Parts
        </button>

        <div className="part-details-header">
          <div>
            <div className="part-number-label">
              {part.partNumber ||
                "No Part Number"}
            </div>

            <h1>
              {part.partName ||
                "Unnamed Part"}
            </h1>

            <div className="part-header-meta">
              {part.category && (
                <span>
                  {part.category}
                </span>
              )}

              {part.manufacturer && (
                <span>
                  {
                    part.manufacturer
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="part-details-grid">
          <section className="part-details-card card">
            <h2>
              Part Information
            </h2>

            <div className="detail-row">
              <span className="detail-label">
                Part Number
              </span>

              <span className="detail-value">
                {part.partNumber ||
                  "-"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Part Name
              </span>

              <span className="detail-value">
                {part.partName ||
                  "-"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Category
              </span>

              <span className="detail-value">
                {part.category ||
                  "-"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Manufacturer
              </span>

              <span className="detail-value">
                {part.manufacturer ||
                  "-"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Price
              </span>

              <span className="detail-value">
                {formatPrice(
                  part.price
                )}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                Supplier Number
              </span>

              <span className="detail-value">
                {part.supplierNumber ||
                  "-"}
              </span>
            </div>
          </section>

          <section className="part-details-card part-image-card card">
            <h2>
              Part Images
            </h2>

            {activeImage.url ? (
              <>
                <img
                  src={
                    activeImage.url
                  }
                  alt={
                    activeImage.description ||
                    part.partName ||
                    "Part"
                  }
                  className="part-details-image"
                />

                <div
                  style={{
                    marginTop:
                      "16px",
                  }}
                >
                  <div className="detail-row">
                    <span className="detail-label">
                      Description
                    </span>

                    <span className="detail-value">
                      {activeImage.description ||
                        "-"}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">
                      Image URL
                    </span>

                    <span className="detail-value">
                      <a
                        href={
                          activeImage.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {
                          activeImage.url
                        }
                      </a>
                    </span>
                  </div>
                </div>

                {part.images.length >
                  1 && (
                  <div className="part-carousel-controls">
                    <button
                      type="button"
                      className="part-carousel-arrow"
                      aria-label="Previous image"
                      title="Previous image"
                      onClick={
                        showPreviousImage
                      }
                    >
                      ←
                    </button>

                    <span className="part-carousel-counter">
                      {imageIndex +
                        1}{" "}
                      /{" "}
                      {
                        part.images
                          .length
                      }
                    </span>

                    <button
                      type="button"
                      className="part-carousel-arrow"
                      aria-label="Next image"
                      title="Next image"
                      onClick={
                        showNextImage
                      }
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-part-image">
                No image available
              </div>
            )}
          </section>
        </div>

        <section className="part-details-card card">
          <h2>
            Description
          </h2>

          <p className="part-description">
            {part.description ||
              "No description has been provided for this part."}
          </p>
        </section>

        <PartHierarchyTree
          key={`${part.id}-${subParts
            .map((subPart) => `${subPart.subPartId}:${subPart.quantity}`)
            .join("|")}`}
          partId={part.id}
        />

        <HierarchyPriceCard kind="part" id={part.id} basePrice={part.price} />

        <AssignedAssetsCard partId={part.id} />

        <section className="part-details-card card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  marginBottom:
                    "4px",
                }}
              >
                Components / Sub-Parts
              </h2>

              <p
                className="empty-detail"
                style={{
                  margin: 0,
                }}
              >
                Parts directly contained in this part.
              </p>
            </div>

            <button
              type="button"
              className="edit-part-button"
              onClick={
                openAddSubPartModal
              }
            >
              + Add Sub Part
            </button>
          </div>

          {loadingSubParts ? (
            <p className="empty-detail">
              Loading sub parts...
            </p>
          ) : subPartError ? (
            <p className="part-details-error">
              {subPartError}
            </p>
          ) : subParts.length ===
            0 ? (
            <p className="empty-detail">
              No sub parts have been added to this part.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              {subParts.map(
                (subPart) => (
                  <div
                    key={
                      subPart.subPartId
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1fr) auto",
                      gap: "16px",
                      alignItems: "center",
                      padding: "14px",
                      border:
                        "1px solid rgba(127, 127, 127, 0.25)",
                      borderRadius:
                        "10px",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/parts/${subPart.partId}`
                          )
                        }
                        style={{
                          padding: 0,
                          border: "none",
                          background:
                            "transparent",
                          cursor:
                            "pointer",
                          fontWeight: 700,
                          textAlign:
                            "left",
                          fontSize:
                            "inherit",
                        }}
                      >
                        {subPart.partNumber ||
                          "No Part Number"}
                        {" — "}
                        {subPart.partName ||
                          "Unnamed Part"}
                      </button>

                      <div
                        style={{
                          marginTop:
                            "6px",
                          display: "flex",
                          gap: "12px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <span>
                          Quantity: {
                            subPart.quantity
                          }
                        </span>

                        {subPart.category && (
                          <span>
                            {subPart.category}
                          </span>
                        )}

                        {subPart.manufacturer && (
                          <span>
                            {subPart.manufacturer}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap:
                          "wrap",
                        justifyContent:
                          "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="delete-part-button"
                        onClick={() =>
                          handleRemoveSubPart(
                            subPart
                          )
                        }
                        disabled={
                          removingSubPartId ===
                          subPart.subPartId
                        }
                      >
                        {removingSubPartId ===
                        subPart.subPartId
                          ? "Removing..."
                          : "Remove One"}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <section className="part-details-card card">
          <h2>
            Used In
          </h2>

          {loadingSubParts ? (
            <p className="empty-detail">
              Loading parent parts...
            </p>
          ) : usedIn.length === 0 ? (
            <p className="empty-detail">
              This part is not currently used as a sub part of another part
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {usedIn.map(
                (parent) => (
                  <button
                    key={
                      parent.subPartId
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        `/parts/${parent.partId}`
                      )
                    }
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "16px",
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid rgba(127, 127, 127, 0.25)",
                      borderRadius:
                        "10px",
                      background:
                        "transparent",
                      cursor:
                        "pointer",
                      textAlign:
                        "left",
                    }}
                  >
                    <span>
                      <strong>
                        {parent.partNumber ||
                          "No Part Number"}
                      </strong>
                      {" — "}
                      {parent.partName ||
                        "Unnamed Part"}
                    </span>

                    <span>
                      Qty {
                        parent.quantity
                      }
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        <section className="part-details-card card">
          <h2>
            SharePoint
          </h2>

          {activeSharepoint.url ? (
            <>
              {activeSharepoint
                .description && (
                <p className="sharepoint-description">
                  {
                    activeSharepoint.description
                  }
                </p>
              )}

              <a
                href={
                  activeSharepoint.url
                }
                target="_blank"
                rel="noopener noreferrer"
                className="sharepoint-button"
              >
                {activeSharepoint.description
                  ? `Open ${activeSharepoint.description} ↗`
                  : "Open in SharePoint ↗"}
              </a>

              <div
                style={{
                  marginTop:
                    "20px",
                }}
              >
                <div className="detail-row">
                  <span className="detail-label">
                    Description
                  </span>

                  <span className="detail-value">
                    {activeSharepoint.description ||
                      "-"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">
                    SharePoint URL
                  </span>

                  <span className="detail-value">
                    <a
                      href={
                        activeSharepoint.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {
                        activeSharepoint.url
                      }
                    </a>
                  </span>
                </div>
              </div>

              {part.sharepointUrls
                .length > 1 && (
                <div className="part-carousel-controls">
                  <button
                    type="button"
                    className="part-carousel-arrow"
                    aria-label="Previous SharePoint link"
                    title="Previous SharePoint link"
                    onClick={
                      showPreviousSharepoint
                    }
                  >
                    ←
                  </button>

                  <span className="part-carousel-counter">
                    {sharepointIndex +
                      1}{" "}
                    /{" "}
                    {
                      part
                        .sharepointUrls
                        .length
                    }
                  </span>

                  <button
                    type="button"
                    className="part-carousel-arrow"
                    aria-label="Next SharePoint link"
                    title="Next SharePoint link"
                    onClick={
                      showNextSharepoint
                    }
                  >
                    →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="empty-detail">
              No SharePoint document
              is associated with
              this part.
            </p>
          )}
        </section>

        <section className="part-details-card card">
          <h2>
            Record Information
          </h2>

          <div className="detail-row">
            <span className="detail-label">
              Created
            </span>

            <span className="detail-value">
              {formatDate(
                part.createdAt
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Created By
            </span>

            <span className="detail-value">
              {part.createdBy ||
                "-"}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Last Updated
            </span>

            <span className="detail-value">
              {formatDate(
                part.updatedAt
              )}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">
              Updated By
            </span>

            <span className="detail-value">
              {part.updatedBy ||
                "-"}
            </span>
          </div>
        </section>

        <section className="part-details-card part-actions-card card">
          <div className="part-actions-header">
            <h2>
              Part Actions
            </h2>
          </div>

          <div className="part-actions-buttons">
            <button
              type="button"
              className="edit-part-button"
              onClick={
                openEditPart
              }
            >
              Edit Part
            </button>

            <button
              type="button"
              className="delete-part-button"
              onClick={
                handleDeletePart
              }
              disabled={
                deleting
              }
            >
              {deleting
                ? "Deleting..."
                : "Delete Part"}
            </button>
          </div>
        </section>
      </main>

      {showAddSubPart && (
        <div
          className="edit-part-modal-overlay"
          role="presentation"
        >
          <div
            className="edit-part-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-sub-part-title"
          >
            <div className="edit-part-modal-header">
              <h2 id="add-sub-part-title">
                Add Sub Part
              </h2>

              <button
                type="button"
                className="edit-part-modal-close"
                onClick={
                  closeAddSubPartModal
                }
                disabled={
                  savingSubPart
                }
                aria-label="Close add sub-part dialog"
              >
                ×
              </button>
            </div>

            <div className="edit-part-form-grid">
              <div className="form-group form-group-full">
                <AssemblyTemplateHint kind="part" />
              </div>
              <div className="form-group form-group-full">
                <label htmlFor="subPartSearch">
                  Find a part *
                </label>

                {loadingPartOptions ? (
                  <p className="empty-detail">
                    Loading parts...
                  </p>
                ) : (
                  <>
                    <input
                      id="subPartSearch"
                      type="text"
                      list="sub-part-options"
                      placeholder="Search or select a current part"
                      value={subPartSearch}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSubPartSearch(value);
                        const normalized = value.trim().toLowerCase();
                        const match = partOptions.find((option) =>
                          `${option.partNumber || "No Part Number"} — ${option.partName || "Unnamed Part"}`.toLowerCase() === normalized ||
                          option.partNumber.toLowerCase() === normalized
                        );
                        setSelectedChildPartId(match?.id ?? null);
                      }}
                      disabled={savingSubPart}
                      autoComplete="off"
                    />
                    <datalist id="sub-part-options">
                      {filteredPartOptions.map((option) => (
                        <option key={option.id} value={`${option.partNumber || "No Part Number"} — ${option.partName || "Unnamed Part"}`}>
                          {[option.category, option.manufacturer].filter(Boolean).join(" · ")}
                        </option>
                      ))}
                    </datalist>
                  </>
                )}

                {!loadingPartOptions &&
                  filteredPartOptions.length ===
                    0 && (
                    <small>
                      No current parts match this search.
                    </small>
                  )}

                <small>
                  Select a result from the dropdown. Adding the same part again automatically increases its quantity.
                </small>
              </div>

              <div className="edit-part-modal-actions">
                <button
                  type="button"
                  className="edit-part-cancel-button"
                  onClick={
                    closeAddSubPartModal
                  }
                  disabled={
                    savingSubPart
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="edit-part-save-button"
                  onClick={
                    handleAddSubPart
                  }
                  disabled={
                    savingSubPart ||
                    selectedChildPartId ===
                      null
                  }
                >
                  {savingSubPart
                    ? "Adding..."
                    : "Add Sub-Part"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPart && (
        <div
          className="edit-part-modal-overlay"
          role="presentation"
        >
          <div
            className="edit-part-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-part-title"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="edit-part-modal-header">
              <h2 id="edit-part-title">
                Edit Part
              </h2>

              <button
                type="button"
                className="edit-part-modal-close"
                onClick={
                  confirmCloseEditPart
                }
                disabled={
                  savingEdit
                }
                aria-label="Close edit part dialog"
              >
                ×
              </button>
            </div>

            <div className="edit-part-form-grid">
              <div className="form-group">
                <label htmlFor="editPartNumber">
                  Part Number
                </label>

                <input
                  id="editPartNumber"
                  type="text"
                  value={
                    editingPart.partNumber
                  }
                  readOnly
                  disabled
                />

                <small>
                  Part numbers use
                  the TSLA-###
                  format and cannot
                  be changed.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editPartName">
                  Part Name *
                </label>

                <input
                  id="editPartName"
                  type="text"
                  placeholder="Enter part name"
                  value={
                    editingPart.partName
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              partName:
                                event
                                  .target
                                  .value,
                            }
                          : current
                    )
                  }
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="editDescription">
                  Description
                </label>

                <textarea
                  id="editDescription"
                  placeholder="Enter part description"
                  value={
                    editingPart.description
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              description:
                                event
                                  .target
                                  .value,
                            }
                          : current
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="editCategory">
                  Category
                </label>

                <input
                  id="editCategory"
                  type="text"
                  list="edit-category-options"
                  autoComplete="off"
                  placeholder="Search or add category"
                  value={
                    editingPart.category
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              category:
                                event
                                  .target
                                  .value,
                            }
                          : current
                    )
                  }
                />

                <datalist id="edit-category-options">
                  {availableCategories.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      />
                    )
                  )}
                </datalist>

                <small>
                  Select an existing
                  category or type a
                  new one.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editManufacturer">
                  Manufacturer
                </label>

                <input
                  id="editManufacturer"
                  type="text"
                  list="edit-manufacturer-options"
                  autoComplete="off"
                  placeholder="Search or add manufacturer"
                  value={
                    editingPart.manufacturer
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              manufacturer:
                                event
                                  .target
                                  .value,
                            }
                          : current
                    )
                  }
                />

                <datalist id="edit-manufacturer-options">
                  {availableManufacturers.map(
                    (
                      manufacturer
                    ) => (
                      <option
                        key={
                          manufacturer
                        }
                        value={
                          manufacturer
                        }
                      />
                    )
                  )}
                </datalist>

                <small>
                  Select an existing
                  manufacturer or
                  type a new one.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editPrice">
                  Price
                </label>

                <input
                  id="editPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Enter part price"
                  value={
                    editingPart.price ??
                    ""
                  }
                  onChange={(
                    event
                  ) => {
                    const value =
                      event.target
                        .value;

                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              price:
                                value ===
                                ""
                                  ? null
                                  : Number(
                                      value
                                    ),
                            }
                          : current
                    );
                  }}
                />

                <small>
                  Enter the price
                  of the individual
                  part.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="editSupplierNumber">
                  Supplier Number
                </label>

                <input
                  id="editSupplierNumber"
                  type="text"
                  placeholder="Enter supplier number"
                  value={
                    editingPart.supplierNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPart(
                      (
                        current
                      ) =>
                        current
                          ? {
                              ...current,

                              supplierNumber:
                                event
                                  .target
                                  .value,
                            }
                          : current
                    )
                  }
                />
              </div>

              <div className="form-group form-group-full">
                <div className="url-section-header">
                  <div>
                    <label>
                      Images
                    </label>

                    <small>
                      Add as many
                      image URLs as
                      needed.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="add-url-button"
                    onClick={
                      addEditingImage
                    }
                    disabled={
                      savingEdit
                    }
                  >
                    + Add Image
                  </button>
                </div>

                {editingPart.images
                  .length === 0 ? (
                  <p className="empty-detail">
                    No images are
                    associated with
                    this part.
                  </p>
                ) : (
                  <div className="url-entry-list">
                    {editingPart.images.map(
                      (
                        image,
                        index
                      ) => (
                        <div
                          key={`image-${index}`}
                          className="url-entry-card"
                        >
                          {image.url
                            .trim() && (
                            <img
                              src={
                                image.url
                              }
                              alt={
                                image.description ||
                                `Part image ${
                                  index +
                                  1
                                }`
                              }
                              className="edit-part-image-preview"
                            />
                          )}

                          <div className="form-group">
                            <label
                              htmlFor={`editImageDescription-${index}`}
                            >
                              Image
                              Description
                            </label>

                            <input
                              id={`editImageDescription-${index}`}
                              type="text"
                              placeholder="Example: Front view"
                              value={
                                image.description
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditingImage(
                                  index,
                                  "description",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label
                              htmlFor={`editImageUrl-${index}`}
                            >
                              Image URL
                            </label>

                            <input
                              id={`editImageUrl-${index}`}
                              type="url"
                              placeholder="https://..."
                              value={
                                image.url
                              }
                              onChange={(
                                event
                              ) =>
                                updateEditingImage(
                                  index,
                                  "url",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="url-entry-actions">
                            {image.url
                              .trim() && (
                              <a
                                href={
                                  image.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="url-open-link"
                              >
                                Open Image
                                ↗
                              </a>
                            )}

                            <button
                              type="button"
                              className="remove-url-button"
                              onClick={() =>
                                removeEditingImage(
                                  index
                                )
                              }
                              disabled={
                                savingEdit
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="form-group form-group-full">
                <div className="url-section-header">
                  <div>
                    <label>
                      SharePoint
                      Links
                    </label>

                    <small>
                      Add as many
                      SharePoint
                      URLs as needed.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="add-url-button"
                    onClick={
                      addEditingSharepointUrl
                    }
                    disabled={
                      savingEdit
                    }
                  >
                    + Add
                    SharePoint
                  </button>
                </div>

                {editingPart
                  .sharepointUrls
                  .length ===
                0 ? (
                  <p className="empty-detail">
                    No SharePoint
                    links are
                    associated with
                    this part.
                  </p>
                ) : (
                  <div className="url-entry-list">
                    {editingPart
                      .sharepointUrls
                      .map(
                        (
                          entry,
                          index
                        ) => (
                          <div
                            key={`sharepoint-${index}`}
                            className="url-entry-card"
                          >
                            <div className="form-group">
                              <label
                                htmlFor={`editSharepointDescription-${index}`}
                              >
                                SharePoint
                                Description
                              </label>

                              <input
                                id={`editSharepointDescription-${index}`}
                                type="text"
                                placeholder="Example: Engineering drawing"
                                value={
                                  entry.description
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateEditingSharepointUrl(
                                    index,
                                    "description",
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />
                            </div>

                            <div className="form-group">
                              <label
                                htmlFor={`editSharepointUrl-${index}`}
                              >
                                SharePoint
                                URL
                              </label>

                              <input
                                id={`editSharepointUrl-${index}`}
                                type="url"
                                placeholder="https://..."
                                value={
                                  entry.url
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateEditingSharepointUrl(
                                    index,
                                    "url",
                                    event
                                      .target
                                      .value
                                  )
                                }
                              />
                            </div>

                            <div className="url-entry-actions">
                              {entry.url
                                .trim() && (
                                <a
                                  href={
                                    entry.url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="url-open-link"
                                >
                                  Open in
                                  SharePoint
                                  ↗
                                </a>
                              )}

                              <button
                                type="button"
                                className="remove-url-button"
                                onClick={() =>
                                  removeEditingSharepointUrl(
                                    index
                                  )
                                }
                                disabled={
                                  savingEdit
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>

              <div className="edit-part-modal-actions">
                <button
                  type="button"
                  className="edit-part-cancel-button"
                  onClick={
                    confirmCloseEditPart
                  }
                  disabled={
                    savingEdit
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="edit-part-save-button"
                  onClick={
                    handleUpdatePart
                  }
                  disabled={
                    savingEdit
                  }
                >
                  {savingEdit
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
