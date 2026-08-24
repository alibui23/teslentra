import { query } from "../config/database.js";
import { nullableString, validPositiveId } from "../utils/values.js";

export async function resolveLocationReference(
  locationIdValue,
  locationValue,
  required = false
) {
  const hasLocationId =
    locationIdValue !==
      undefined &&
    locationIdValue !==
      null &&
    locationIdValue !==
      "";

  const cleanLocationPath =
    nullableString(
      locationValue
    );

  let rows;

  if (hasLocationId) {
    const locationId =
      validPositiveId(
        locationIdValue
      );

    if (
      locationId === null
    ) {
      const error =
        new Error(
          "Invalid location ID."
        );

      error.status =
        400;

      throw error;
    }

    rows =
      await query(
        `
          SELECT
            location_id,
            parent_location_id,
            location_name,
            location_path
          FROM locations
          WHERE location_id = ?
          LIMIT 1
        `,
        [
          locationId,
        ]
      );
  } else if (
    cleanLocationPath
  ) {
    rows =
      await query(
        `
          SELECT
            location_id,
            parent_location_id,
            location_name,
            location_path
          FROM locations
          WHERE location_path = ?
          LIMIT 1
        `,
        [
          cleanLocationPath,
        ]
      );
  } else {
    if (required) {
      const error =
        new Error(
          "A location is required."
        );

      error.status =
        400;

      throw error;
    }

    return {
      locationId:
        null,

      parentLocationId:
        null,

      locationName:
        null,

      locationPath:
        null,
    };
  }

  if (
    rows.length === 0
  ) {
    const error =
      new Error(
        "The selected location does not exist."
      );

    error.status =
      400;

    throw error;
  }

  return {
    locationId:
      rows[0]
        .location_id,

    parentLocationId:
      rows[0]
        .parent_location_id,

    locationName:
      rows[0]
        .location_name,

    locationPath:
      rows[0]
        .location_path,
  };
}
