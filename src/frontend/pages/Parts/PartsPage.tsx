import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar.tsx";
import ExpandableHierarchyCell from "../../components/ExpandableHierarchyCell.tsx";
import { API_ORIGIN as API_URL } from "../../config/api.ts";
import {
  emptyPartForm,
  CATEGORY_HISTORY_KEY,
  MANUFACTURER_HISTORY_KEY
} from "./Parts.model.ts";
import type {
  Part,
  NewPart
} from "./Parts.model.ts";

export default function Parts() {
  const navigate = useNavigate();

  const [parts, setParts] =
    useState<Part[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("All");

  const [
    manufacturerFilter,
    setManufacturerFilter,
  ] = useState("All");

  const [
    structureFilter,
    setStructureFilter,
  ] = useState("All");

  const [
    categoryHistory,
    setCategoryHistory,
  ] = useState<string[]>([]);

  const [
    manufacturerHistory,
    setManufacturerHistory,
  ] = useState<string[]>([]);

  const [
    showAddPart,
    setShowAddPart,
  ] = useState(false);

  const [
    newPart,
    setNewPart,
  ] = useState<NewPart>({
    ...emptyPartForm,
  });

  /* ========================================================
     MAP PART FROM API
  ======================================================== */

  function mapPart(
    part: any
  ): Part {
    let mappedPrice:
      | number
      | null = null;

    /*
      "price" is now the official
      field name.

      unit_cost remains here only
      as a temporary fallback for
      older API responses.
    */
    const rawPrice =
      part.price ??
      part.unit_cost ??
      null;

    if (
      rawPrice !== null &&
      rawPrice !== undefined &&
      rawPrice !== ""
    ) {
      const numericPrice =
        Number(rawPrice);

      mappedPrice =
        Number.isFinite(
          numericPrice
        )
          ? numericPrice
          : null;
    }

    return {
      id:
        Number(
          part.part_id
        ) || 0,

      partNumber:
        part.part_number ??
        part.part_num ??
        "",

      partName:
        part.part_name ??
        "",

      description:
        part.description ??
        "",

      category:
        part.category ??
        "",

      imageUrl:
        part.image_url ??
        part.image ??
        "",

      imageDescription:
        part.image_description ??
        "",

      manufacturer:
        part.manufacturer ??
        "",

      price:
        mappedPrice,

      supplierNumber:
        part.supplier_number ??
        "",

      sharepointUrl:
        part.sharepoint_url ??
        "",

      sharepointDescription:
        part.sharepoint_description ??
        "",

      createdAt:
        part.created_at ??
        null,

      createdBy:
        part.created_by ??
        null,

      updatedAt:
        part.updated_at ??
        null,

      updatedBy:
        part.updated_by ??
        null,

      directSubPartCount:
        Number(
          part.direct_sub_part_count ??
          part.directSubPartCount ??
          0
        ) || 0,

      usedInCount:
        Number(
          part.used_in_count ??
          part.usedInCount ??
          0
        ) || 0,
    };
  }

  /* ========================================================
     HISTORY HELPERS
  ======================================================== */

  function getStoredHistory(
    key: string
  ): string[] {
    try {
      const storedValue =
        localStorage.getItem(
          key
        );

      if (!storedValue) {
        return [];
      }

      const parsedValue =
        JSON.parse(
          storedValue
        );

      if (
        !Array.isArray(
          parsedValue
        )
      ) {
        return [];
      }

      return parsedValue.filter(
        (value) =>
          typeof value ===
            "string" &&
          value.trim() !== ""
      );
    } catch (error) {
      console.error(
        `Error reading ${key}:`,
        error
      );

      return [];
    }
  }

  function saveHistory(
    key: string,
    values: string[]
  ) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(values)
      );
    } catch (error) {
      console.error(
        `Error saving ${key}:`,
        error
      );
    }
  }

  function mergeHistory(
    currentValues: string[],
    incomingValues: string[]
  ) {
    const valueMap =
      new Map<
        string,
        string
      >();

    [
      ...currentValues,
      ...incomingValues,
    ]
      .map((value) =>
        value.trim()
      )
      .filter(Boolean)
      .forEach((value) => {
        const normalized =
          value.toLowerCase();

        if (
          !valueMap.has(
            normalized
          )
        ) {
          valueMap.set(
            normalized,
            value
          );
        }
      });

    return Array.from(
      valueMap.values()
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }

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
            [cleanManufacturer]
          );

        saveHistory(
          MANUFACTURER_HISTORY_KEY,
          updated
        );

        return updated;
      }
    );
  }

  /* ========================================================
     FETCH PARTS
  ======================================================== */

  async function fetchParts() {
    try {
      const response =
        await fetch(
          `${API_URL}/api/parts`
        );

      const responseText =
        await response.text();

      let data: any = [];

      try {
        data = responseText
          ? JSON.parse(
              responseText
            )
          : [];
      } catch {
        throw new Error(
          responseText ||
            "Invalid response from server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.sqlMessage ||
            data.details ||
            "Failed to fetch parts."
        );
      }

      if (
        !Array.isArray(data)
      ) {
        throw new Error(
          "Parts response was not an array."
        );
      }

      const mappedParts =
        data.map(mapPart);

      setParts(
        mappedParts
      );

      const categories =
        mappedParts
          .map(
            (part: Part) =>
              part.category
          )
          .filter(Boolean);

      const manufacturers =
        mappedParts
          .map(
            (part: Part) =>
              part.manufacturer
          )
          .filter(Boolean);

      setCategoryHistory(
        (current) => {
          const updated =
            mergeHistory(
              current,
              categories
            );

          saveHistory(
            CATEGORY_HISTORY_KEY,
            updated
          );

          return updated;
        }
      );

      setManufacturerHistory(
        (current) => {
          const updated =
            mergeHistory(
              current,
              manufacturers
            );

          saveHistory(
            MANUFACTURER_HISTORY_KEY,
            updated
          );

          return updated;
        }
      );
    } catch (error) {
      console.error(
        "Error fetching parts:",
        error
      );
    }
  }

  /* ========================================================
     INITIAL LOAD
  ======================================================== */

  useEffect(() => {
    const savedCategories =
      getStoredHistory(
        CATEGORY_HISTORY_KEY
      );

    const savedManufacturers =
      getStoredHistory(
        MANUFACTURER_HISTORY_KEY
      );

    setCategoryHistory(
      savedCategories
    );

    setManufacturerHistory(
      savedManufacturers
    );

    fetchParts();
  }, []);

  /* ========================================================
     PART NUMBER PREVIEW
  ======================================================== */

  function getNextPartNumber() {
    let highestNumber = 0;

    parts.forEach(
      (part) => {
        const match =
          part.partNumber.match(
            /^TSLA-(\d+)$/i
          );

        if (!match) {
          return;
        }

        const numericValue =
          Number(
            match[1]
          );

        if (
          Number.isInteger(
            numericValue
          ) &&
          numericValue >
            highestNumber
        ) {
          highestNumber =
            numericValue;
        }
      }
    );

    return `TSLA-${String(
      highestNumber + 1
    ).padStart(3, "0")}`;
  }

  /*
    This is only a frontend preview.

    The server should generate the
    actual part_number when saving.
  */
  const nextPartNumber =
    getNextPartNumber();

  /* ========================================================
     FILTER OPTIONS
  ======================================================== */

  const availableCategories =
    mergeHistory(
      categoryHistory,
      parts
        .map(
          (part) =>
            part.category
        )
        .filter(Boolean)
    );

  const availableManufacturers =
    mergeHistory(
      manufacturerHistory,
      parts
        .map(
          (part) =>
            part.manufacturer
        )
        .filter(Boolean)
    );

  /* ========================================================
     FILTER PARTS
  ======================================================== */

  const filteredParts =
    parts.filter(
      (part) => {
        const text =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          text === "" ||

          part.partNumber
            .toLowerCase()
            .includes(text) ||

          part.partName
            .toLowerCase()
            .includes(text) ||

          part.description
            .toLowerCase()
            .includes(text) ||

          part.category
            .toLowerCase()
            .includes(text) ||

          part.manufacturer
            .toLowerCase()
            .includes(text) ||

          part.supplierNumber
            .toLowerCase()
            .includes(text) ||

          part.imageDescription
            .toLowerCase()
            .includes(text) ||

          part.sharepointDescription
            .toLowerCase()
            .includes(text) ||

          (part.price !== null &&
            String(
              part.price
            ).includes(text));

        const matchesCategory =
          categoryFilter ===
            "All" ||
          part.category ===
            categoryFilter;

        const matchesManufacturer =
          manufacturerFilter ===
            "All" ||
          part.manufacturer ===
            manufacturerFilter;

        const isAssembly =
          part.directSubPartCount > 0;

        const isComponent =
          part.usedInCount > 0;

        const matchesStructure =
          structureFilter === "All" ||
          (structureFilter === "Assemblies" &&
            isAssembly) ||
          (structureFilter === "Components" &&
            isComponent) ||
          (structureFilter === "Standalone" &&
            !isAssembly &&
            !isComponent);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesManufacturer &&
          matchesStructure
        );
      }
    );

  /* ========================================================
     OPEN PART DETAILS
  ======================================================== */

  function openPartDetails(
    id: number
  ) {
    navigate(
      `/parts/${id}`
    );
  }

  /* ========================================================
     FORMAT PRICE
  ======================================================== */

  function formatPrice(
    price: number | null
  ) {
    if (
      price === null
    ) {
      return "—";
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
      }
    ).format(price);
  }

  /* ========================================================
     CLOSE ADD MODAL
  ======================================================== */

  function closeAddPartModal() {
    setShowAddPart(false);

    setNewPart({
      ...emptyPartForm,
    });
  }

  function confirmCloseAddPartModal() {
    const hasChanges = Object.values(newPart).some((value) => value.trim() !== "");
    if (!hasChanges) {
      closeAddPartModal();
      return;
    }

    const shouldClose =
      window.confirm(
        "Are you sure you want to cancel?\n\nAny unsaved changes will be lost."
      );

    if (!shouldClose) {
      return;
    }

    closeAddPartModal();
  }

  /* ========================================================
     ADD PART
  ======================================================== */

  async function handleAddPart() {
    if (
      !newPart.partName.trim()
    ) {
      alert(
        "Part Name is required."
      );

      return;
    }

    let price:
      | number
      | null = null;

    if (
      newPart.price.trim() !==
      ""
    ) {
      price =
        Number(
          newPart.price
        );

      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {
        alert(
          "Price must be a valid non-negative number."
        );

        return;
      }
    }

    const shouldSave =
      window.confirm(
        "Are you sure you want to save this new part?"
      );

    if (!shouldSave) {
      return;
    }

    /*
      Do NOT send part_number.

      The backend should generate
      the actual TSLA-### number.
    */
    const payload = {
      part_name:
        newPart.partName
          .trim(),

      description:
        newPart.description
          .trim() ||
        null,

      category:
        newPart.category
          .trim() ||
        null,

      manufacturer:
        newPart.manufacturer
          .trim() ||
        null,

      price,

      supplier_number:
        newPart.supplierNumber
          .trim() ||
        null,

      image_url:
        newPart.imageUrl
          .trim() ||
        null,

      image_description:
        newPart
          .imageDescription
          .trim() ||
        null,

      sharepoint_url:
        newPart.sharepointUrl
          .trim() ||
        null,

      sharepoint_description:
        newPart
          .sharepointDescription
          .trim() ||
        null,
    };

    try {
      const response =
        await fetch(
          `${API_URL}/api/parts`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data = responseText
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
            data.sqlMessage ||
            data.details ||
            data.message ||
            "Failed to add part."
        );
      }

      if (
        newPart.category.trim()
      ) {
        addCategoryToHistory(
          newPart.category
        );
      }

      if (
        newPart.manufacturer
          .trim()
      ) {
        addManufacturerToHistory(
          newPart.manufacturer
        );
      }

      setNewPart({
        ...emptyPartForm,
      });

      setShowAddPart(false);

      await fetchParts();

      const createdPartNumber =
        data.part_number ||
        data.partNumber ||
        data.part_num ||
        nextPartNumber;

      alert(
        `Part added successfully!\n\nPart Number: ${createdPartNumber}`
      );
    } catch (error) {
      console.error(
        "Error adding part:",
        error
      );

      alert(
        error instanceof Error
          ? `Failed to add part:\n\n${error.message}`
          : "Failed to add part."
      );
    }
  }

  /* ========================================================
     PAGE
  ======================================================== */

  return (
    <div className="parts-layout">
      <Navbar />

      <main className="parts-content container-fluid">

        {/* HEADER */}

        <div className="parts-header">
          <div>
            <h3>
              Parts
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowAddPart(
                true
              )
            }
          >
            + New Part
          </button>
        </div>

        {/* FILTERS */}

        <div className="parts-filters">
          <input
            type="text"
            placeholder="Search parts..."
            aria-label="Search parts"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
          />

          <select
            aria-label="Filter parts by category"
            value={
              categoryFilter
            }
            onChange={(
              event
            ) =>
              setCategoryFilter(
                event.target
                  .value
              )
            }
          >
            <option value="All">
              All Categories
            </option>

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
                >
                  {category}
                </option>
              )
            )}
          </select>

          <select
            aria-label="Filter parts by manufacturer"
            value={
              manufacturerFilter
            }
            onChange={(
              event
            ) =>
              setManufacturerFilter(
                event.target
                  .value
              )
            }
          >
            <option value="All">
              All Manufacturers
            </option>

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
                >
                  {
                    manufacturer
                  }
                </option>
              )
            )}
          </select>

          <select
            aria-label="Filter parts by structure"
            value={structureFilter}
            onChange={(event) =>
              setStructureFilter(
                event.target.value
              )
            }
          >
            <option value="All">
              All Structures
            </option>

            <option value="Assemblies">
              Assemblies
            </option>

            <option value="Components">
              Components
            </option>

            <option value="Standalone">
              Standalone Parts
            </option>
          </select>
        </div>

        {/* TABLE */}

        <div className="parts-table-wrapper">
          <table className="parts-table table table-hover align-middle mb-0">
            <colgroup>
              <col
                style={{
                  width: "14%",
                }}
              />

              <col
                style={{
                  width: "20%",
                }}
              />

              <col
                style={{
                  width: "13%",
                }}
              />

              <col
                style={{
                  width: "14%",
                }}
              />

              <col
                style={{
                  width: "15%",
                }}
              />

              <col
                style={{
                  width: "14%",
                }}
              />

              <col
                style={{
                  width: "10%",
                }}
              />
            </colgroup>

            <thead>
              <tr>
                <th>
                  Part Number
                </th>

                <th>
                  Part Name
                </th>

                <th>
                  Category
                </th>

                <th>
                  Supplier Number
                </th>

                <th>
                  Manufacturer
                </th>

                <th>
                  Structure
                </th>

                <th>
                  Price
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredParts.map(
                (part) => (
                  <tr
                    key={
                      part.id
                    }
                    className="clickable-part-row"
                    tabIndex={0}
                    onClick={() =>
                      openPartDetails(
                        part.id
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key ===
                          " "
                      ) {
                        event.preventDefault();

                        openPartDetails(
                          part.id
                        );
                      }
                    }}
                  >
                    <td className="part-catalog-number">
                      <strong>{part.partNumber}</strong>
                      <small>{part.updatedAt ? `Updated ${new Date(part.updatedAt).toLocaleDateString()}` : "Inventory part"}</small>
                    </td>

                    <td>
                      <div className="part-catalog-item">
                        {part.imageUrl && (
                          <img src={part.imageUrl} alt={part.imageDescription || part.partName} loading="lazy" />
                        )}
                        <div>
                          <strong>{part.partName}</strong>
                          {part.description && <small>{part.description}</small>}
                        </div>
                      </div>
                    </td>

                    <td>
                      {part.category ||
                        "—"}
                    </td>

                    <td>
                      {part.supplierNumber ||
                        "—"}
                    </td>

                    <td>
                      {part.manufacturer ||
                        "—"}
                    </td>

                    <td>
                      <ExpandableHierarchyCell kind="part" id={part.id} childCount={part.directSubPartCount} parentCount={part.usedInCount} />
                    </td>

                    <td>
                      {formatPrice(
                        part.price
                      )}
                    </td>
                  </tr>
                )
              )}

              {filteredParts.length ===
                0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="no-parts"
                  >
                    No parts were
                    found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ====================================================
          ADD PART MODAL
      ==================================================== */}

      {showAddPart && (
        <div
          className="modal-overlay"
        >
          <div
            className="add-part-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="modal-header">
              <h2>
                Add New Part
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={
                  confirmCloseAddPartModal
                }
                aria-label="Close add part modal"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <div className="add-part-form">

              {/* PART NUMBER */}

              <div className="form-group">
                <label htmlFor="partNumber">
                  Part Number
                </label>

                <input
                  id="partNumber"
                  type="text"
                  value={
                    nextPartNumber
                  }
                  readOnly
                  disabled
                />

                <small>
                  Server will automatically generate the final TSLA part
                  number when the part is saved
                </small>
              </div>

              {/* PART NAME */}

              <div className="form-group">
                <label htmlFor="partName">
                  Part Name *
                </label>

                <input
                  id="partName"
                  type="text"
                  placeholder="Enter part name"
                  value={
                    newPart.partName
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        partName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              {/* DESCRIPTION */}

              <div className="form-group">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  placeholder="Enter part description"
                  value={
                    newPart.description
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              {/* CATEGORY */}

              <div className="form-group">
                <label htmlFor="category">
                  Category
                </label>

                <input
                  id="category"
                  type="text"
                  list="category-options"
                  autoComplete="off"
                  placeholder="Search or add category"
                  value={
                    newPart.category
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        category:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <datalist id="category-options">
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
                  Select an existing category or type a new one
                </small>
              </div>

              {/* MANUFACTURER */}

              <div className="form-group">
                <label htmlFor="manufacturer">
                  Manufacturer
                </label>

                <input
                  id="manufacturer"
                  type="text"
                  list="manufacturer-options"
                  autoComplete="off"
                  placeholder="Search or add manufacturer"
                  value={
                    newPart.manufacturer
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        manufacturer:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <datalist id="manufacturer-options">
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
                  Select an existing manufacturer or type a new one
                </small>
              </div>

              {/* PRICE */}

              <div className="form-group">
                <label htmlFor="price">
                  Price
                </label>

                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Enter part price"
                  value={
                    newPart.price
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        price:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <small>
                  Enter the price of the individual part
                </small>
              </div>

              {/* SUPPLIER NUMBER */}

              <div className="form-group">
                <label htmlFor="supplierNumber">
                  Supplier Number
                </label>

                <input
                  id="supplierNumber"
                  type="text"
                  placeholder="Enter supplier number"
                  value={
                    newPart.supplierNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        supplierNumber:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              {/* IMAGE URL */}

              <div className="form-group">
                <label htmlFor="imageUrl">
                  Image URL
                </label>

                <input
                  id="imageUrl"
                  type="url"
                  placeholder="https://..."
                  value={
                    newPart.imageUrl
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        imageUrl:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <small>
                  Enter URL for part image
                </small>
              </div>

              {/* IMAGE DESCRIPTION */}

              <div className="form-group">
                <label htmlFor="imageDescription">
                  Image Description
                </label>

                <input
                  id="imageDescription"
                  type="text"
                  placeholder="Example: Front view"
                  value={
                    newPart.imageDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        imageDescription:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <small>
                  Add a short description to identify the image
                </small>
              </div>

              {/* SHAREPOINT URL */}

              <div className="form-group">
                <label htmlFor="sharepointUrl">
                  SharePoint URL
                </label>

                <input
                  id="sharepointUrl"
                  type="url"
                  placeholder="https://..."
                  value={
                    newPart.sharepointUrl
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        sharepointUrl:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <small>
                  Enter SharePoint document URL
                </small>
              </div>

              {/* SHAREPOINT DESCRIPTION */}

              <div className="form-group">
                <label htmlFor="sharepointDescription">
                  SharePoint Description
                </label>

                <input
                  id="sharepointDescription"
                  type="text"
                  placeholder="Example: Engineering drawing"
                  value={
                    newPart.sharepointDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setNewPart(
                      (
                        current
                      ) => ({
                        ...current,

                        sharepointDescription:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />

                <small>
                  Add a short description so
                  the document is easy to identify
                </small>
              </div>

              {/* BUTTONS */}

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    confirmCloseAddPartModal
                  }
                > Cancel
                </button>

                <button
                  type="button"
                  className="add-button"
                  onClick={
                    handleAddPart
                  }
                >
                  Add Part
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
