export function nullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === ""
    ? null
    : trimmed;
}

export function normalizeUrlEntries(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  let parsed = value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = [trimmed];
    }
  }

  const values =
    Array.isArray(parsed)
      ? parsed
      : [parsed];

  const entries =
    values
      .map((item) => {
        if (typeof item === "string") {
          return {
            url: item.trim(),
            description: "",
          };
        }

        if (
          !item ||
          typeof item !== "object"
        ) {
          return {
            url: "",
            description: "",
          };
        }

        return {
          url:
            nullableString(
              item.url ??
                item.href ??
                item.link
            ) ?? "",

          description:
            nullableString(
              item.description ??
                item.label ??
                item.title ??
                item.name
            ) ?? "",
        };
      })
      .filter(
        (entry) =>
          entry.url
      );

  const unique =
    new Map();

  for (const entry of entries) {
    const key =
      entry.url.toLowerCase();

    const existing =
      unique.get(key);

    if (!existing) {
      unique.set(
        key,
        entry
      );

      continue;
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

  return Array.from(
    unique.values()
  );
}

export function getRequestUrlEntries(
  primaryValue,
  alternateValue,
  singleUrl,
  singleDescription
) {
  const arrayWasProvided =
    primaryValue !== undefined ||
    alternateValue !== undefined;

  if (arrayWasProvided) {
    return normalizeUrlEntries(
      primaryValue !== undefined
        ? primaryValue
        : alternateValue
    );
  }

  const cleanUrl =
    nullableString(
      singleUrl
    );

  if (!cleanUrl) {
    return [];
  }

  return [
    {
      url:
        cleanUrl,

      description:
        nullableString(
          singleDescription
        ) ?? "",
    },
  ];
}


export function validPositiveId(value) {
  const id =
    Number(value);

  return (
    Number.isInteger(id) &&
    id > 0
  )
    ? id
    : null;
}

export const VALID_ASSET_STATUSES =
  new Set([
    "available",
    "disposed",
    "in_use",
    "out_on_job",
    "reserved",
    "retired",
  ]);

export function normalizeAssetStatus(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase()
      .replace(
        /-/g,
        "_"
      )
      .replace(
        /\s+/g,
        "_"
      );

  if (
    normalized ===
    "in_stock"
  ) {
    return "available";
  }

  if (
    normalized ===
    "checked_out"
  ) {
    return "out_on_job";
  }

  return VALID_ASSET_STATUSES.has(
    normalized
  )
    ? normalized
    : null;
}

export function parsePrice(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed < 0
  ) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}
