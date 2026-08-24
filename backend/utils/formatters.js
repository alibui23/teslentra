import { normalizeUrlEntries } from "./values.js";

export function formatPartRow(row) {
  const numericPrice =
    row.price === null ||
    row.price === undefined ||
    row.price === ""
      ? null
      : Number(
          row.price
        );

  const imageUrls =
    normalizeUrlEntries(
      row.image_urls
    );

  const sharepointUrls =
    normalizeUrlEntries(
      row.sharepoint_urls
    );

  const formatted = {
    ...row,

    image_urls:
      imageUrls,

    images:
      imageUrls,

    image_url:
      imageUrls[0]?.url ??
      null,

    image_description:
      imageUrls[0]
        ?.description ??
      null,

    sharepoint_urls:
      sharepointUrls,

    sharepoint_url:
      sharepointUrls[0]
        ?.url ??
      null,

    sharepoint_description:
      sharepointUrls[0]
        ?.description ??
      null,

    price:
      numericPrice !== null &&
      Number.isFinite(
        numericPrice
      )
        ? numericPrice
        : null,

    supplierNumber:
      row.supplier_number ??
      null,
  };

  if (
    row.direct_sub_part_count !== undefined ||
    row.directSubPartCount !== undefined
  ) {
    const directSubPartCount =
      Number(
        row.direct_sub_part_count ??
        row.directSubPartCount ??
        0
      ) || 0;

    formatted.direct_sub_part_count =
      directSubPartCount;

    formatted.directSubPartCount =
      directSubPartCount;

    formatted.is_assembly =
      directSubPartCount > 0;

    formatted.isAssembly =
      directSubPartCount > 0;
  }

  if (
    row.used_in_count !== undefined ||
    row.usedInCount !== undefined
  ) {
    const usedInCount =
      Number(
        row.used_in_count ??
        row.usedInCount ??
        0
      ) || 0;

    formatted.used_in_count =
      usedInCount;

    formatted.usedInCount =
      usedInCount;

    formatted.is_component =
      usedInCount > 0;

    formatted.isComponent =
      usedInCount > 0;
  }

  return formatted;
}

export function formatContextTagRow(row) {
  return {
    context_tag_id:
      Number(
        row.context_tag_id
      ),

    contextTagId:
      Number(
        row.context_tag_id
      ),

    id:
      Number(
        row.context_tag_id
      ),

    asset_id:
      Number(
        row.asset_id
      ),

    assetId:
      Number(
        row.asset_id
      ),

    context_tag_name:
      row.context_tag_name,

    contextTagName:
      row.context_tag_name,

    name:
      row.context_tag_name,
  };
}


export function formatPartNumber(partId) {
  return `TSLA-${String(
    partId
  ).padStart(
    3,
    "0"
  )}`;
}

export function formatEquipmentNumber(
  partNumber,
  sequence
) {
  return `${partNumber}-${String(
    sequence
  ).padStart(
    4,
    "0"
  )}`;
}
