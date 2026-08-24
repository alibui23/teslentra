export const CATEGORY_HISTORY_KEY =
  "parts_category_history";

export const MANUFACTURER_HISTORY_KEY =
  "parts_manufacturer_history";

export type UrlEntry = {
  url: string;
  description: string;
};

export type PartDetailsType = {
  id: number;
  partNumber: string;
  partName: string;
  description: string;
  category: string;
  images: UrlEntry[];
  manufacturer: string;
  price: number | null;
  supplierNumber: string;
  sharepointUrls: UrlEntry[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};


export type SubPartType = {
  subPartId: number;
  parentPartId: number;
  childPartId: number;
  quantity: number;
  partId: number;
  partNumber: string;
  partName: string;
  description: string;
  category: string;
  manufacturer: string;
  price: number | null;
  depth?: number;
};

export type PartOptionType = {
  id: number;
  partNumber: string;
  partName: string;
  category: string;
  manufacturer: string;
};

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

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function normalizeUrlEntries(
  value: unknown
): UrlEntry[] {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  let values: unknown[] = [];

  if (Array.isArray(value)) {
    values = value;
  } else if (
    typeof value === "string"
  ) {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    if (
      (trimmed.startsWith("[") &&
        trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") &&
        trimmed.endsWith("}"))
    ) {
      try {
        const parsed =
          JSON.parse(trimmed);

        values =
          Array.isArray(parsed)
            ? parsed
            : [parsed];
      } catch {
        values = [trimmed];
      }
    } else {
      values = [trimmed];
    }
  } else {
    values = [value];
  }

  const normalized =
    values
      .map((item) => {
        if (
          typeof item ===
          "string"
        ) {
          return {
            url: item.trim(),
            description: "",
          };
        }

        if (
          item &&
          typeof item ===
            "object"
        ) {
          const record =
            item as Record<
              string,
              unknown
            >;

          return {
            url:
              String(
                record.url ??
                  record.href ??
                  record.link ??
                  record.image_url ??
                  ""
              ).trim(),

            description:
              String(
                record.description ??
                  record.label ??
                  record.title ??
                  record.name ??
                  ""
              ).trim(),
          };
        }

        return {
          url: "",
          description: "",
        };
      })
      .filter(
        (entry) =>
          entry.url !== ""
      );

  const unique =
    new Map<
      string,
      UrlEntry
    >();

  normalized.forEach(
    (entry) => {
      const key =
        entry.url
          .trim()
          .toLowerCase();

      const existing =
        unique.get(key);

      if (!existing) {
        unique.set(
          key,
          entry
        );

        return;
      }

      if (
        !existing.description &&
        entry.description
      ) {
        unique.set(
          key,
          entry
        );
      }
    }
  );

  return Array.from(
    unique.values()
  );
}

export function mapPartRecord(
  record: any
): PartDetailsType {
  let images =
    normalizeUrlEntries(
      record.images ??
        record.image_urls
    );

  if (
    images.length === 0 &&
    record.image_url
  ) {
    images = [
      {
        url:
          String(
            record.image_url
          ).trim(),

        description:
          String(
            record.image_description ??
              ""
          ).trim(),
      },
    ];
  }

  if (
    images.length > 0 &&
    !images[0].description &&
    record.image_description
  ) {
    images[0] = {
      ...images[0],

      description:
        String(
          record.image_description
        ).trim(),
    };
  }

  let sharepointUrls =
    normalizeUrlEntries(
      record.sharepoint_urls ??
        record.sharepointUrls
    );

  if (
    sharepointUrls.length === 0 &&
    record.sharepoint_url
  ) {
    sharepointUrls = [
      {
        url:
          String(
            record.sharepoint_url
          ).trim(),

        description:
          String(
            record.sharepoint_description ??
              ""
          ).trim(),
      },
    ];
  }

  if (
    sharepointUrls.length >
      0 &&
    !sharepointUrls[0]
      .description &&
    record.sharepoint_description
  ) {
    sharepointUrls[0] = {
      ...sharepointUrls[0],

      description:
        String(
          record.sharepoint_description
        ).trim(),
    };
  }

  return {
    id:
      Number(
        record.part_id
      ) || 0,

    partNumber:
      record.part_number ??
      record.part_num ??
      "",

    partName:
      record.part_name ??
      "",

    description:
      record.description ??
      "",

    category:
      record.category ??
      "",

    images,

    manufacturer:
      record.manufacturer ??
      "",

    price:
      parsePrice(
        record.price ??
          record.unit_cost
      ),

    supplierNumber:
      record.supplier_number ??
      "",

    sharepointUrls,

    createdAt:
      record.created_at ??
      "",

    createdBy:
      record.created_by ??
      "",

    updatedAt:
      record.updated_at ??
      "",

    updatedBy:
      record.updated_by ??
      "",
  };
}

export function mapSubPartRecord(
  record: any
): SubPartType {
  return {
    subPartId:
      Number(
        record.sub_part_id
      ) || 0,

    parentPartId:
      Number(
        record.parent_part_id
      ) || 0,

    childPartId:
      Number(
        record.child_part_id
      ) || 0,

    quantity:
      Number(
        record.quantity
      ) || 1,

    partId:
      Number(
        record.part_id
      ) || 0,

    partNumber:
      record.part_number ??
      "",

    partName:
      record.part_name ??
      "",

    description:
      record.description ??
      "",

    category:
      record.category ??
      "",

    manufacturer:
      record.manufacturer ??
      "",

    price:
      parsePrice(
        record.price
      ),

    depth:
      record.depth ===
        undefined ||
      record.depth === null
        ? undefined
        : Number(
            record.depth
          ),
  };
}

export function mapPartOption(
  record: any
): PartOptionType {
  return {
    id:
      Number(
        record.part_id
      ) || 0,

    partNumber:
      record.part_number ??
      "",

    partName:
      record.part_name ??
      "",

    category:
      record.category ??
      "",

    manufacturer:
      record.manufacturer ??
      "",
  };
}

export async function parseApiResponse(
  response: Response
) {
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
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

export function getStoredHistory(
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

export function saveHistory(
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

export function mergeHistory(
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
    .forEach(
      (value) => {
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
      }
    );

  return Array.from(
    valueMap.values()
  ).sort((a, b) =>
    a.localeCompare(b)
  );
}
