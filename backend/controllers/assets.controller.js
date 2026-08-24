import { randomUUID } from "node:crypto";
import {
  beginTransaction,
  commitTransaction,
  connectionQuery,
  getDatabaseConnection,
  query,
  releaseDatabaseConnection,
  rollbackTransaction,
} from "../config/database.js";
import { sendDatabaseError, sendLocationError } from "../middleware/error-handler.js";
import { assignGeneratedEquipmentNumber, formatEquipmentNumber, getNextEquipmentSequence } from "../services/equipment-number.service.js";
import { getAssetForeignKeyReferences, quoteIdentifier } from "../services/foreign-key.service.js";
import { resolveLocationReference } from "../services/location.service.js";
import { normalizeAssetStatus, nullableString, parsePrice, validPositiveId } from "../utils/values.js";
import { logActivity } from "../services/activity-log.service.js";

async function wouldCreateAssetCycle(
  assetId,
  parentAssetId
) {
  if (
    assetId ===
    parentAssetId
  ) {
    return true;
  }

  const rows =
    await query(
      `
        WITH RECURSIVE ancestors AS (
          SELECT
            asset_id,
            parent_asset_id
          FROM assets
          WHERE asset_id = ?

          UNION DISTINCT

          SELECT
            parent.asset_id,
            parent.parent_asset_id
          FROM assets AS parent
          INNER JOIN ancestors AS a
            ON parent.asset_id =
               a.parent_asset_id
        )

        SELECT
          asset_id
        FROM ancestors
        WHERE asset_id = ?
        LIMIT 1
      `,
      [
        parentAssetId,
        assetId,
      ]
    );

  return rows.length > 0;
}

export async function updateAsset(
  req,
  res
) {
  const assetId =
    validPositiveId(
      req.params.id
    );

  if (
    assetId === null
  ) {
    return res
      .status(400)
      .json({
        error:
          "Invalid asset ID.",
      });
  }

  const {
    part_id,
    asset_type,
    asset_type_name,
    status,
    location_id,
    location,
    serial_number,
    price,
    barcode,
    parent_asset_id,
    status_reason,
  } = req.body;

  console.log(
    `PATCH /api/assets/${assetId}`,
    req.body
  );

  if (
    part_id === undefined &&
    asset_type === undefined &&
    asset_type_name ===
      undefined &&
    status === undefined &&
    location_id ===
      undefined &&
    location === undefined &&
    serial_number ===
      undefined &&
    price === undefined &&
    barcode === undefined &&
    parent_asset_id ===
      undefined
  ) {
    return res
      .status(400)
      .json({
        error:
          "No asset changes were provided.",
      });
  }

  let existingAsset;

  try {
    const existingRows =
      await query(
        `
          SELECT
            asset_id,
            equipment_number,
            part_id,
            status
          FROM assets
          WHERE asset_id = ?
          LIMIT 1
        `,
        [
          assetId,
        ]
      );

    if (
      existingRows.length ===
      0
    ) {
      return res
        .status(404)
        .json({
          error:
            "Asset not found.",
        });
    }

    existingAsset =
      existingRows[0];
  } catch (err) {
    return sendDatabaseError(
      res,
      "Failed to retrieve asset before update.",
      err
    );
  }

  const fields =
    [];

  const values =
    [];

  let targetPartId =
    Number(
      existingAsset.part_id
    );

  let targetPartNumber =
    null;

  let partChanged =
    false;

  if (
    part_id !== undefined
  ) {
    const partId =
      validPositiveId(
        part_id
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "A valid part ID is required.",
        });
    }

    try {
      const parts =
        await query(
          `
            SELECT
              part_id,
              part_number
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [
            partId,
          ]
        );

      if (
        parts.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "The selected part does not exist.",
          });
      }

      targetPartId =
        partId;

      targetPartNumber =
        parts[0]
          .part_number;

      partChanged =
        Number(
          existingAsset
            .part_id
        ) !==
        partId;
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to validate part.",
        err
      );
    }

    fields.push(
      "part_id = ?"
    );

    values.push(
      partId
    );
  }

  if (
    partChanged
  ) {
    try {
      const sequence =
        await getNextEquipmentSequence(
          targetPartId,
          targetPartNumber,
          assetId
        );

      fields.push(
        "equipment_number = ?"
      );

      values.push(
        formatEquipmentNumber(
          targetPartNumber,
          sequence
        )
      );
    } catch (err) {
      if (
        err.status
      ) {
        return res
          .status(
            err.status
          )
          .json({
            error:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to generate the equipment number for the selected part.",
        err
      );
    }
  }

  const assetTypeWasProvided =
    asset_type !==
      undefined ||
    asset_type_name !==
      undefined;

  if (
    assetTypeWasProvided
  ) {
    const cleanAssetType =
      nullableString(
        asset_type ??
          asset_type_name
      );

    if (
      !cleanAssetType
    ) {
      return res
        .status(400)
        .json({
          error:
            "Asset type is required.",
        });
    }

    if (
      cleanAssetType.length >
      100
    ) {
      return res
        .status(400)
        .json({
          error:
            "Asset type cannot be longer than 100 characters.",
        });
    }

    fields.push(
      "asset_type = ?"
    );

    values.push(
      cleanAssetType
    );
  }

  if (
    status !== undefined
  ) {
    const cleanStatus =
      normalizeAssetStatus(
        status
      );

    if (
      cleanStatus === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid asset status. Use 'available', 'disposed', 'in_use', 'out_on_job', 'reserved', or 'retired'.",
        });
    }

    if (cleanStatus === "reserved") {
      return res.status(409).json({
        error: "Reserved status is not available until the purchase request and approval workflow is established.",
      });
    }

    if (cleanStatus === "in_use" || cleanStatus === "out_on_job") {
      return res.status(409).json({
        error: "In Use status is controlled by the checkout workflow. Check out the asset instead of changing its status manually.",
      });
    }

    const openCheckouts = await query(
      `
        SELECT checkout_id
        FROM checkouts
        WHERE asset_id = ?
          AND returned_at IS NULL
        LIMIT 1
      `,
      [assetId]
    );

    if (openCheckouts.length > 0) {
      return res.status(409).json({
        error: "Status cannot be changed while this asset is checked out. Check it in first.",
      });
    }

    if (
      (cleanStatus === "disposed" || cleanStatus === "retired") &&
      !nullableString(status_reason)
    ) {
      return res.status(400).json({
        error: `A reason is required before marking an asset ${cleanStatus}.`,
      });
    }

    fields.push(
      "status = ?"
    );

    values.push(
      cleanStatus
    );
  }

  if (
    serial_number !==
    undefined
  ) {
    fields.push(
      "serial_number = ?"
    );

    values.push(
      nullableString(
        serial_number
      )
    );
  }

  if (
    price !== undefined
  ) {
    const priceResult =
      parsePrice(
        price
      );

    if (
      !priceResult.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            "Price must be a valid non-negative number.",
        });
    }

    fields.push(
      "price = ?"
    );

    values.push(
      priceResult.value
    );
  }

  if (
    barcode !== undefined
  ) {
    fields.push(
      "barcode = ?"
    );

    values.push(
      nullableString(
        barcode
      )
    );
  }

  if (
    parent_asset_id !==
    undefined
  ) {
    let parentAssetId =
      null;

    if (
      parent_asset_id !==
        null &&
      parent_asset_id !==
        ""
    ) {
      parentAssetId =
        validPositiveId(
          parent_asset_id
        );

      if (
        parentAssetId ===
        null
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid parent asset ID.",
          });
      }

      if (
        parentAssetId ===
        assetId
      ) {
        return res
          .status(400)
          .json({
            error:
              "An asset cannot be its own parent asset.",
          });
      }

      try {
        const parents =
          await query(
            `
              SELECT
                asset_id
              FROM assets
              WHERE asset_id = ?
            `,
            [
              parentAssetId,
            ]
          );

        if (
          parents.length ===
          0
        ) {
          return res
            .status(400)
            .json({
              error:
                "The selected parent asset does not exist.",
            });
        }

        const createsCycle =
          await wouldCreateAssetCycle(
            assetId,
            parentAssetId
          );

        if (createsCycle) {
          return res
            .status(409)
            .json({
              error:
                "This parent asset relationship would create a circular asset hierarchy.",
            });
        }
      } catch (err) {
        return sendDatabaseError(
          res,
          "Failed to validate parent asset.",
          err
        );
      }
    }

    fields.push(
      "parent_asset_id = ?"
    );

    values.push(
      parentAssetId
    );
  }

  const locationWasProvided =
    location_id !==
      undefined ||
    location !==
      undefined;

  if (
    locationWasProvided
  ) {
    let selectedLocation;

    try {
      selectedLocation =
        await resolveLocationReference(
          location_id,
          location,
          false
        );
    } catch (err) {
      return sendLocationError(
        res,
        err
      );
    }

    fields.push(
      "location = ?"
    );

    values.push(
      selectedLocation
        .locationPath
    );
  }

  if (
    fields.length === 0
  ) {
    return res
      .status(400)
      .json({
        error:
          "No valid asset changes were provided.",
      });
  }

  values.push(
    assetId
  );

  try {
    let result;

    try {
      result =
        await query(
          `
            UPDATE assets
            SET ${fields.join(
              ", "
            )}
            WHERE asset_id = ?
          `,
          values
        );
    } catch (
      updateErr
    ) {
      if (
        partChanged &&
        updateErr.code ===
          "ER_DUP_ENTRY" &&
        fields.includes(
          "equipment_number = ?"
        )
      ) {
        const equipmentNumberIndex =
          fields.indexOf(
            "equipment_number = ?"
          );

        let updated =
          false;

        for (
          let attempt = 0;
          attempt < 4;
          attempt += 1
        ) {
          const sequence =
            await getNextEquipmentSequence(
              targetPartId,
              targetPartNumber,
              assetId
            );

          values[
            equipmentNumberIndex
          ] =
            formatEquipmentNumber(
              targetPartNumber,
              sequence
            );

          try {
            result =
              await query(
                `
                  UPDATE assets
                  SET ${fields.join(
                    ", "
                  )}
                  WHERE asset_id = ?
                `,
                values
              );

            updated =
              true;

            break;
          } catch (
            retryErr
          ) {
            if (
              retryErr.code !==
              "ER_DUP_ENTRY"
            ) {
              throw retryErr;
            }
          }
        }

        if (
          !updated
        ) {
          throw updateErr;
        }
      } else {
        throw updateErr;
      }
    }

    if (
      result.affectedRows ===
      0
    ) {
      return res
        .status(404)
        .json({
          error:
            "Asset not found.",
        });
    }

    const cleanStatusReason = nullableString(status_reason);
    if (status !== undefined && cleanStatusReason) {
      const cleanStatus = normalizeAssetStatus(status);
      await query(
        `
          INSERT INTO comments (asset_id, user_name, comment_text)
          VALUES (?, 'System', ?)
        `,
        [assetId, `Status changed to ${cleanStatus}: ${cleanStatusReason}`]
      );
    }

    const results =
      await query(
        `
          SELECT
            a.asset_id,
            a.equipment_number,
            a.equipment_number AS equipmentNumber,
            a.equipment_number AS equipment_tag,
            a.equipment_number AS asset_tag,
            a.asset_type,
            a.part_id,
            a.serial_number,
            a.price,
            a.status,
            a.location,
            a.barcode,
            a.parent_asset_id,

            l.location_id,
            l.parent_location_id,
            l.location_name,
            l.location_path,

            p.part_number,
            p.part_name,
            p.supplier_number,
            p.supplier_number AS supplierNumber,
            p.price AS part_price,
            p.price AS partPrice,

            (
              SELECT
                COUNT(*)
              FROM assets AS aq
              WHERE aq.part_id =
                a.part_id
            ) AS quantity,

            (
              SELECT
                COUNT(*)
              FROM comments AS c
              WHERE c.asset_id =
                a.asset_id
                AND c.deleted_at
                  IS NULL
            ) AS comment_count,

            (
              SELECT COUNT(*)
              FROM sub_assets AS children
              WHERE children.parent_asset_id = a.asset_id
            ) AS direct_sub_asset_count,

            (
              SELECT COUNT(*)
              FROM sub_assets AS parents
              WHERE parents.child_asset_id = a.asset_id
            ) AS used_in_count

          FROM assets AS a

          LEFT JOIN parts AS p
            ON a.part_id =
               p.part_id

          LEFT JOIN locations AS l
            ON a.location =
               l.location_path

          WHERE a.asset_id = ?
        `,
        [
          assetId,
        ]
      );

    await logActivity({ eventType: "asset_modified", entityType: "asset", entityId: assetId, reference: results[0].equipment_number, title: results[0].part_name, description: `${results[0].equipment_number} details were modified.` });

    return res.json({
      message:
        "Asset updated successfully.",

      ...results[0],
    });
  } catch (err) {
    if (
      err.code ===
      "ER_DUP_ENTRY"
    ) {
      return res
        .status(409)
        .json({
          error:
            "An asset with this serial number, barcode, or equipment number already exists.",

          code:
            err.code,

          sqlMessage:
            err.sqlMessage,

          details:
            err.message,
        });
    }

    if (
      err.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res
        .status(400)
        .json({
          error:
            "The selected part or parent asset does not exist.",

          code:
            err.code,

          sqlMessage:
            err.sqlMessage,

          details:
            err.message,
        });
    }

    return sendDatabaseError(
      res,
      "Failed to update asset.",
      err
    );
  }
}

export async function listAssets(req, res) {
    try {
      const results =
        await query(`
          SELECT
            a.asset_id,
            a.equipment_number,
            a.equipment_number AS equipmentNumber,
            a.equipment_number AS equipment_tag,
            a.equipment_number AS asset_tag,
            a.asset_type,
            a.part_id,
            a.serial_number,
            a.price,
            a.status,
            a.location,
            a.barcode,
            a.parent_asset_id,
            l.location_id,
            l.parent_location_id,
            l.location_name,
            l.location_path,
            p.part_number,
            p.part_name,
            p.supplier_number,
            p.supplier_number AS supplierNumber,
            p.price AS part_price,
            p.price AS partPrice,
            (
              SELECT
                COUNT(*)
              FROM assets AS aq
              WHERE aq.part_id =
                a.part_id
            ) AS quantity,

            (
              SELECT
                COUNT(*)
              FROM comments AS c
              WHERE c.asset_id =
                a.asset_id
                AND c.deleted_at
                  IS NULL
            ) AS comment_count

            ,(
              SELECT COUNT(*)
              FROM sub_assets AS children
              WHERE children.parent_asset_id = a.asset_id
            ) AS direct_sub_asset_count

            ,(
              SELECT COUNT(*)
              FROM sub_assets AS parents
              WHERE parents.child_asset_id = a.asset_id
            ) AS used_in_count

            ,(
              SELECT COUNT(*)
              FROM checkouts AS active_checkout
              WHERE active_checkout.asset_id = a.asset_id
                AND active_checkout.returned_at IS NULL
            ) AS has_open_checkout

            ,EXISTS(
              SELECT 1
              FROM checkouts AS overdue_checkout
              WHERE overdue_checkout.asset_id = a.asset_id
                AND overdue_checkout.returned_at IS NULL
                AND overdue_checkout.due_at IS NOT NULL
                AND overdue_checkout.due_at < CURRENT_TIMESTAMP
            ) AS is_overdue

          FROM assets AS a

          LEFT JOIN parts AS p
            ON a.part_id =
               p.part_id

          LEFT JOIN locations AS l
            ON a.location =
               l.location_path

          ORDER BY
            a.asset_id DESC
        `);

      return res.json(
        results
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve assets.",
        err
      );
    }
  }

export async function getAsset(req, res) {
    const assetId =
      validPositiveId(
        req.params.id
      );

    if (
      assetId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid asset ID.",
        });
    }

    try {
      const results =
        await query(
          `
            SELECT
              a.asset_id,
              a.equipment_number,
              a.equipment_number AS equipmentNumber,
              a.equipment_number AS equipment_tag,
              a.equipment_number AS asset_tag,
              a.asset_type,
              a.part_id,
              a.serial_number,
              a.price,
              a.status,
              a.location,
              a.barcode,
              a.parent_asset_id,

              l.location_id,
              l.parent_location_id,
              l.location_name,
              l.location_path,
              p.part_number,
              p.part_name,
              p.supplier_number,
              p.supplier_number AS supplierNumber,
              p.price AS part_price,
              p.price AS partPrice,

              (
                SELECT
                  COUNT(*)
                FROM assets AS aq
                WHERE aq.part_id =
                  a.part_id
              ) AS quantity,

              (
                SELECT
                  COUNT(*)
                FROM comments AS c
                WHERE c.asset_id =
                  a.asset_id
                  AND c.deleted_at
                    IS NULL
              ) AS comment_count,

              (
                SELECT COUNT(*)
                FROM sub_assets AS children
                WHERE children.parent_asset_id = a.asset_id
              ) AS direct_sub_asset_count,

              (
                SELECT COUNT(*)
                FROM sub_assets AS parents
                WHERE parents.child_asset_id = a.asset_id
              ) AS used_in_count

              ,(
                SELECT COUNT(*)
                FROM checkouts AS active_checkout
                WHERE active_checkout.asset_id = a.asset_id
                  AND active_checkout.returned_at IS NULL
              ) AS has_open_checkout

              ,EXISTS(
                SELECT 1
                FROM checkouts AS overdue_checkout
                WHERE overdue_checkout.asset_id = a.asset_id
                  AND overdue_checkout.returned_at IS NULL
                  AND overdue_checkout.due_at IS NOT NULL
                  AND overdue_checkout.due_at < CURRENT_TIMESTAMP
              ) AS is_overdue

            FROM assets AS a

            LEFT JOIN parts AS p
              ON a.part_id =
                 p.part_id

            LEFT JOIN locations AS l
              ON a.location =
                 l.location_path

            WHERE a.asset_id = ?
          `,
          [
            assetId,
          ]
        );

      if (
        results.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Asset not found.",
          });
      }

      return res.json(
        results[0]
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve asset.",
        err
      );
    }
  }

export async function createAsset(req, res) {
    const {
      part_id,
      asset_type,
      asset_type_name,
      serial_number,
      price,
      status,
      location_id,
      location,
      barcode,
      parent_asset_id,
      status_reason,
    } = req.body;

    console.log(
      "Asset request received:",
      req.body
    );

    const partId =
      validPositiveId(
        part_id
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "A valid part ID is required.",
        });
    }

    const cleanAssetType =
      nullableString(
        asset_type ??
          asset_type_name
      );

    if (
      !cleanAssetType
    ) {
      return res
        .status(400)
        .json({
          error:
            "Asset type is required.",
        });
    }

    if (
      cleanAssetType.length >
      100
    ) {
      return res
        .status(400)
        .json({
          error:
            "Asset type cannot be longer than 100 characters.",
        });
    }

    const priceResult =
      parsePrice(
        price
      );

    if (
      !priceResult.valid
    ) {
      return res
        .status(400)
        .json({
          error:
            "Price must be a valid non-negative number.",
        });
    }

    let cleanStatus =
      "available";

    if (
      status !== undefined &&
      status !== null &&
      status !== ""
    ) {
      cleanStatus =
        normalizeAssetStatus(
          status
        );

      if (
        cleanStatus === null
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid asset status. Use 'available', 'disposed', 'in_use', 'out_on_job', 'reserved', or 'retired'.",
          });
      }

      if (cleanStatus === "reserved") {
        return res.status(409).json({
          error: "Reserved status is unavailable until the purchase request and approval workflow is established.",
        });
      }

      if (cleanStatus === "in_use" || cleanStatus === "out_on_job") {
        return res.status(409).json({
          error: "Create the asset as Available, then use checkout to place it In Use.",
        });
      }

      if (
        (cleanStatus === "disposed" || cleanStatus === "retired") &&
        !nullableString(status_reason)
      ) {
        return res.status(400).json({
          error: `A reason is required before creating an asset as ${cleanStatus}.`,
        });
      }
    }

    let parentAssetId =
      null;

    if (
      parent_asset_id !==
        undefined &&
      parent_asset_id !==
        null &&
      parent_asset_id !==
        ""
    ) {
      parentAssetId =
        validPositiveId(
          parent_asset_id
        );

      if (
        parentAssetId === null
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid parent asset ID.",
          });
      }
    }

    let selectedLocation;

    try {
      selectedLocation =
        await resolveLocationReference(
          location_id,
          location,
          false
        );
    } catch (err) {
      return sendLocationError(
        res,
        err
      );
    }

    try {
      const parts =
        await query(
          `
            SELECT
              part_id,
              part_number,
              part_name,
              supplier_number,
              price AS part_price
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [
            partId,
          ]
        );

      if (
        parts.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "The selected part does not exist.",
          });
      }

      if (
        parentAssetId !==
        null
      ) {
        const parents =
          await query(
            `
              SELECT
                asset_id
              FROM assets
              WHERE asset_id = ?
            `,
            [
              parentAssetId,
            ]
          );

        if (
          parents.length ===
          0
        ) {
          return res
            .status(400)
            .json({
              error:
                "The selected parent asset does not exist.",
            });
        }
      }

      const temporaryEquipmentNumber =
        `TMP-${randomUUID()}`;

      const result =
        await query(
          `
            INSERT INTO assets (
              equipment_number,
              asset_type,
              part_id,
              serial_number,
              price,
              status,
              location,
              barcode,
              parent_asset_id
            )
            VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?
            )
          `,
          [
            temporaryEquipmentNumber,

            cleanAssetType,

            partId,

            nullableString(
              serial_number
            ),

            priceResult.value,

            cleanStatus,

            selectedLocation
              .locationPath,

            nullableString(
              barcode
            ),

            parentAssetId,
          ]
        );

      const newAssetId =
        result.insertId;

      const cleanStatusReason = nullableString(status_reason);
      if (cleanStatusReason) {
        await query(
          `
            INSERT INTO comments (asset_id, user_name, comment_text)
            VALUES (?, 'System', ?)
          `,
          [newAssetId, `Initial status ${cleanStatus}: ${cleanStatusReason}`]
        );
      }

      const selectedPart =
        parts[0];

      const selectedPartPrice =
        parsePrice(
          selectedPart
            .part_price
        ).value;

      let generatedEquipmentNumber;

      try {
        generatedEquipmentNumber =
          await assignGeneratedEquipmentNumber(
            newAssetId,
            partId,
            selectedPart
              .part_number
          );
      } catch (
        updateErr
      ) {
        try {
          await query(
            `
              DELETE FROM assets
              WHERE asset_id = ?
                AND equipment_number = ?
            `,
            [
              newAssetId,
              temporaryEquipmentNumber,
            ]
          );
        } catch (
          cleanupErr
        ) {
          console.error(
            "Failed to clean up incomplete asset:",
            cleanupErr
          );
        }

        if (
          updateErr.status
        ) {
          return res
            .status(
              updateErr.status
            )
            .json({
              error:
                updateErr.message,
            });
        }

        return sendDatabaseError(
          res,
          "Failed to generate the equipment number.",
          updateErr
        );
      }

      const quantityRows =
        await query(
          `
            SELECT
              COUNT(*) AS quantity
            FROM assets
            WHERE part_id = ?
          `,
          [
            partId,
          ]
        );

      const quantity =
        Number(
          quantityRows[0]
            ?.quantity ??
            0
        ) || 0;

      await logActivity({ eventType: "asset_created", entityType: "asset", entityId: newAssetId, reference: generatedEquipmentNumber, title: selectedPart.part_name, description: `${generatedEquipmentNumber} was created and assigned to ${selectedPart.part_number}.` });

      return res
        .status(201)
        .json({
          message:
            "Asset added successfully!",

          assetId:
            newAssetId,

          asset_id:
            newAssetId,

          equipment_number:
            generatedEquipmentNumber,

          equipmentNumber:
            generatedEquipmentNumber,

          equipment_tag:
            generatedEquipmentNumber,

          asset_tag:
            generatedEquipmentNumber,

          asset_type:
            cleanAssetType,

          asset_type_name:
            cleanAssetType,

          part_id:
            partId,

          part_number:
            selectedPart
              .part_number,

          part_name:
            selectedPart
              .part_name,

          supplier_number:
            selectedPart
              .supplier_number ??
            null,

          supplierNumber:
            selectedPart
              .supplier_number ??
            null,

          part_price:
            selectedPartPrice,

          partPrice:
            selectedPartPrice,

          serial_number:
            nullableString(
              serial_number
            ),

          price:
            priceResult.value,

          quantity,

          status:
            cleanStatus,

          location_id:
            selectedLocation
              .locationId,

          parent_location_id:
            selectedLocation
              .parentLocationId,

          location_name:
            selectedLocation
              .locationName,

          location_path:
            selectedLocation
              .locationPath,

          location:
            selectedLocation
              .locationPath,

          barcode:
            nullableString(
              barcode
            ),

          parent_asset_id:
            parentAssetId,

          comment_count:
            0,
        });
    } catch (err) {
      if (
        err.code ===
        "ER_DUP_ENTRY"
      ) {
        return res
          .status(409)
          .json({
            error:
              "An asset with this serial number, barcode, or equipment number already exists.",

            details:
              err.message,
          });
      }

      if (
        err.code ===
        "ER_NO_REFERENCED_ROW_2"
      ) {
        return res
          .status(400)
          .json({
            error:
              "The selected part or parent asset does not exist.",

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to add asset.",
        err
      );
    }
  }

export async function deleteAsset(req, res) {
    const assetId =
      validPositiveId(
        req.params.id
      );

    if (
      assetId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid asset ID.",
        });
    }

    let connection;

    try {
      connection =
        await getDatabaseConnection();

      await beginTransaction(
        connection
      );

      const existing =
        await connectionQuery(
          connection,
          `
            SELECT
              asset_id,
              equipment_number
            FROM assets
            WHERE asset_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [
            assetId,
          ]
        );

      if (
        existing.length === 0
      ) {
        await rollbackTransaction(
          connection
        );

        releaseDatabaseConnection(
          connection
        );

        return res
          .status(404)
          .json({
            error:
              "Asset not found.",
          });
      }

      const deleted = {
        context_tags: 0,
        comments: 0,
        checkouts: 0,
        other_records: 0,
        child_assets_detached: 0,
      };

      const contextTagResult =
        await connectionQuery(
          connection,
          `
            DELETE FROM context_tag
            WHERE asset_id = ?
          `,
          [
            assetId,
          ]
        );

      deleted.context_tags =
        Number(
          contextTagResult
            .affectedRows ??
            0
        ) || 0;

      const commentResult =
        await connectionQuery(
          connection,
          `
            DELETE FROM comments
            WHERE asset_id = ?
          `,
          [
            assetId,
          ]
        );

      deleted.comments =
        Number(
          commentResult
            .affectedRows ??
            0
        ) || 0;

      const checkoutResult =
        await connectionQuery(
          connection,
          `
            DELETE FROM checkouts
            WHERE asset_id = ?
          `,
          [
            assetId,
          ]
        );

      deleted.checkouts =
        Number(
          checkoutResult
            .affectedRows ??
            0
        ) || 0;

      const childAssetResult =
        await connectionQuery(
          connection,
          `
            UPDATE assets
            SET parent_asset_id = NULL
            WHERE parent_asset_id = ?
          `,
          [
            assetId,
          ]
        );

      deleted.child_assets_detached =
        Number(
          childAssetResult
            .affectedRows ??
            0
        ) || 0;

      const references =
        await getAssetForeignKeyReferences(
          connection
        );

      const alreadyHandled =
        new Set([
          "context_tag.asset_id",
          "comments.asset_id",
          "checkouts.asset_id",
          "assets.parent_asset_id",
        ]);

      for (
        const reference of
        references
      ) {
        const tableName =
          String(
            reference
              .table_name ??
              ""
          ).trim();

        const columnName =
          String(
            reference
              .column_name ??
              ""
          ).trim();

        if (
          !tableName ||
          !columnName
        ) {
          continue;
        }

        const referenceKey =
          `${tableName}.${columnName}`;

        if (
          alreadyHandled.has(
            referenceKey
          )
        ) {
          continue;
        }

        if (
          tableName ===
          "assets"
        ) {
          const detachResult =
            await connectionQuery(
              connection,
              `
                UPDATE ${quoteIdentifier(
                  tableName
                )}
                SET ${quoteIdentifier(
                  columnName
                )} = NULL
                WHERE ${quoteIdentifier(
                  columnName
                )} = ?
              `,
              [
                assetId,
              ]
            );

          deleted.child_assets_detached +=
            Number(
              detachResult
                .affectedRows ??
                0
            ) || 0;

          continue;
        }

        const deleteResult =
          await connectionQuery(
            connection,
            `
              DELETE FROM ${quoteIdentifier(
                tableName
              )}
              WHERE ${quoteIdentifier(
                columnName
              )} = ?
            `,
            [
              assetId,
            ]
          );

        deleted.other_records +=
          Number(
            deleteResult
              .affectedRows ??
              0
          ) || 0;
      }

      const assetDeleteResult =
        await connectionQuery(
          connection,
          `
            DELETE FROM assets
            WHERE asset_id = ?
          `,
          [
            assetId,
          ]
        );

      if (
        assetDeleteResult
          .affectedRows === 0
      ) {
        throw new Error(
          "Asset disappeared before deletion could complete."
        );
      }

      await commitTransaction(
        connection
      );

      releaseDatabaseConnection(
        connection
      );

      await logActivity({ eventType: "asset_deleted", entityType: "asset", entityId: assetId, reference: existing[0].equipment_number, title: "Asset deleted", description: `${existing[0].equipment_number} and its related records were deleted.` });

      return res.json({
        message:
          "Asset and all related records deleted successfully.",

        assetId,

        asset_id:
          assetId,

        equipment_number:
          existing[0]
            .equipment_number,

        equipmentNumber:
          existing[0]
            .equipment_number,

        deleted,
      });
    } catch (err) {
      if (connection) {
        try {
          await rollbackTransaction(
            connection
          );
        } catch (
          rollbackErr
        ) {
          console.error(
            "Failed to roll back asset deletion:",
            rollbackErr
          );
        }

        releaseDatabaseConnection(
          connection
        );
      }

      if (
        err.code ===
        "ER_ROW_IS_REFERENCED_2"
      ) {
        return res
          .status(409)
          .json({
            error:
              "A related record still blocks deletion. The delete was rolled back so no partial cleanup occurred.",

            code:
              err.code,

            sqlMessage:
              err.sqlMessage,

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to fully delete asset.",
        err
      );
    }
  }
