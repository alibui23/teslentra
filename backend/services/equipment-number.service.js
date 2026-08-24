import { query } from "../config/database.js";
import { formatEquipmentNumber } from "../utils/formatters.js";

export async function getNextEquipmentSequence(
  partId,
  partNumber,
  excludeAssetId = null
) {
  const params = [
    `${partNumber}-%`,
    partId,
  ];

  let excludeClause =
    "";

  if (
    excludeAssetId !== null
  ) {
    excludeClause =
      "AND asset_id <> ?";

    params.push(
      excludeAssetId
    );
  }

  const rows =
    await query(
      `
        SELECT
          COUNT(*) AS part_count,

          MAX(
            CASE
              WHEN equipment_number LIKE ?
              THEN CAST(
                SUBSTRING_INDEX(
                  equipment_number,
                  '-',
                  -1
                ) AS UNSIGNED
              )
              ELSE 0
            END
          ) AS max_sequence

        FROM assets
        WHERE part_id = ?
          ${excludeClause}
      `,
      params
    );

  const partCount =
    Number(
      rows[0]
        ?.part_count ??
        0
    ) || 0;

  const maxSequence =
    Number(
      rows[0]
        ?.max_sequence ??
        0
    ) || 0;

  const currentSequence =
    Math.max(
      partCount,
      maxSequence
    );

  if (
    currentSequence >= 9999
  ) {
    const error =
      new Error(
        `No additional equipment numbers are available for ${partNumber}.`
      );

    error.status =
      409;

    throw error;
  }

  return (
    currentSequence + 1
  );
}

export async function assignGeneratedEquipmentNumber(
  assetId,
  partId,
  partNumber
) {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const sequence =
      await getNextEquipmentSequence(
        partId,
        partNumber,
        assetId
      );

    const equipmentNumber =
      formatEquipmentNumber(
        partNumber,
        sequence
      );

    try {
      await query(
        `
          UPDATE assets
          SET equipment_number = ?
          WHERE asset_id = ?
        `,
        [
          equipmentNumber,
          assetId,
        ]
      );

      return equipmentNumber;
    } catch (err) {
      if (
        err.code !==
        "ER_DUP_ENTRY"
      ) {
        throw err;
      }
    }
  }

  const error =
    new Error(
      `Could not generate a unique equipment number for ${partNumber}.`
    );

  error.status =
    409;

  throw error;
}


export { formatEquipmentNumber };
