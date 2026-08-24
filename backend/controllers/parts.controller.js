import { randomUUID } from "node:crypto";
import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { formatPartRow, formatPartNumber } from "../utils/formatters.js";
import { getRequestUrlEntries, nullableString, parsePrice, validPositiveId } from "../utils/values.js";
import { logActivity } from "../services/activity-log.service.js";

function formatSubPartRow(row) {
  const formatted =
    formatPartRow(row);

  const result = {
    ...formatted,

    sub_part_id:
      Number(row.sub_part_id),

    parent_part_id:
      Number(row.parent_part_id),

    child_part_id:
      Number(row.child_part_id),

    quantity:
      Number(row.quantity),
  };

  if (
    row.depth !== undefined &&
    row.depth !== null
  ) {
    result.depth =
      Number(row.depth);
  }

  if (
    row.id_path !== undefined
  ) {
    result.id_path =
      row.id_path;
  }

  return result;
}

async function partExists(
  partId
) {
  const rows =
    await query(
      `
        SELECT part_id
        FROM parts
        WHERE part_id = ?
        LIMIT 1
      `,
      [partId]
    );

  return rows.length > 0;
}

async function wouldCreatePartCycle(
  parentPartId,
  childPartId
) {
  if (
    parentPartId === childPartId
  ) {
    return true;
  }

  const rows =
    await query(
      `
        WITH RECURSIVE descendants AS (
          SELECT
            sp.child_part_id
          FROM sub_parts AS sp
          WHERE sp.parent_part_id = ?

          UNION DISTINCT

          SELECT
            sp.child_part_id
          FROM sub_parts AS sp
          INNER JOIN descendants AS d
            ON sp.parent_part_id =
               d.child_part_id
        )
        SELECT
          child_part_id
        FROM descendants
        WHERE child_part_id = ?
        LIMIT 1
      `,
      [
        childPartId,
        parentPartId,
      ]
    );

  return rows.length > 0;
}


export async function listParts(req, res) {
    try {
      const results =
        await query(`
          SELECT
            p.part_id,
            p.part_number,
            p.part_name,
            p.description,
            p.category,
            p.image_urls,
            p.manufacturer,
            p.price,
            p.supplier_number,
            p.sharepoint_urls,
            p.created_at,
            p.created_by,
            p.updated_at,
            p.updated_by,

            COALESCE(
              children.direct_sub_part_count,
              0
            ) AS direct_sub_part_count,

            COALESCE(
              parents.used_in_count,
              0
            ) AS used_in_count

          FROM parts AS p

          LEFT JOIN (
            SELECT
              parent_part_id,
              COUNT(*) AS direct_sub_part_count
            FROM sub_parts
            GROUP BY parent_part_id
          ) AS children
            ON children.parent_part_id =
               p.part_id

          LEFT JOIN (
            SELECT
              child_part_id,
              COUNT(*) AS used_in_count
            FROM sub_parts
            GROUP BY child_part_id
          ) AS parents
            ON parents.child_part_id =
               p.part_id

          ORDER BY
            p.part_id DESC
        `);

      return res.json(
        results.map(
          formatPartRow
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve parts.",
        err
      );
    }
  }

export async function getPart(req, res) {
    const partId =
      validPositiveId(
        req.params.id
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    try {
      const results =
        await query(
          `
            SELECT
              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by,

              (
                SELECT COUNT(*)
                FROM sub_parts AS sp
                WHERE sp.parent_part_id =
                  p.part_id
              ) AS direct_sub_part_count,

              (
                SELECT COUNT(*)
                FROM sub_parts AS sp
                WHERE sp.child_part_id =
                  p.part_id
              ) AS used_in_count

            FROM parts AS p
            WHERE p.part_id = ?
            LIMIT 1
          `,
          [
            partId,
          ]
        );

      if (
        results.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      return res.json(
        formatPartRow(
          results[0]
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve part.",
        err
      );
    }
  }

export async function createPart(req, res) {
    const {
      part_name,
      description,
      category,
      image_urls,
      images,
      image_url,
      image_description,
      manufacturer,
      price,
      supplier_number,
      sharepoint_urls,
      sharepoint_url,
      sharepoint_description,
      created_by,
      updated_by,
    } = req.body;

    const cleanPartName =
      nullableString(
        part_name
      );

    if (
      !cleanPartName
    ) {
      return res
        .status(400)
        .json({
          error:
            "Part Name is required.",
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

    const cleanImageUrls =
      getRequestUrlEntries(
        image_urls,
        images,
        image_url,
        image_description
      );

    const cleanSharepointUrls =
      getRequestUrlEntries(
        sharepoint_urls,
        undefined,
        sharepoint_url,
        sharepoint_description
      );

    const temporaryPartNumber =
      `TMP-${randomUUID()}`;

    try {
      const result =
        await query(
          `
            INSERT INTO parts (
              part_number,
              part_name,
              description,
              category,
              image_urls,
              manufacturer,
              price,
              supplier_number,
              sharepoint_urls,
              created_by,
              updated_by
            )
            VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            )
          `,
          [
            temporaryPartNumber,

            cleanPartName,

            nullableString(
              description
            ),

            nullableString(
              category
            ),

            JSON.stringify(
              cleanImageUrls
            ),

            nullableString(
              manufacturer
            ),

            priceResult.value,

            nullableString(
              supplier_number
            ),

            JSON.stringify(
              cleanSharepointUrls
            ),

            nullableString(
              created_by
            ),

            nullableString(
              updated_by
            ),
          ]
        );

      const newPartId =
        result.insertId;

      const generatedPartNumber =
        formatPartNumber(
          newPartId
        );

      try {
        await query(
          `
            UPDATE parts
            SET part_number = ?
            WHERE part_id = ?
          `,
          [
            generatedPartNumber,
            newPartId,
          ]
        );
      } catch (
        updateErr
      ) {
        try {
          await query(
            `
              DELETE FROM parts
              WHERE part_id = ?
                AND part_number = ?
            `,
            [
              newPartId,
              temporaryPartNumber,
            ]
          );
        } catch (
          cleanupErr
        ) {
          console.error(
            "Failed to clean up incomplete part:",
            cleanupErr
          );
        }

        return sendDatabaseError(
          res,
          "Failed to generate the part number.",
          updateErr
        );
      }

      const results =
        await query(
          `
            SELECT
              part_id,
              part_number,
              part_name,
              description,
              category,
              image_urls,
              manufacturer,
              price,
              supplier_number,
              sharepoint_urls,
              created_at,
              created_by,
              updated_at,
              updated_by
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [
            newPartId,
          ]
        );

      await logActivity({ eventType: "part_created", entityType: "part", entityId: newPartId, reference: results[0].part_number, title: results[0].part_name, description: `${results[0].part_number} was created.` });

      return res
        .status(201)
        .json({
          message:
            "Part added successfully!",

          ...formatPartRow(
            results[0]
          ),
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
              "A part with this generated part number already exists.",

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
        "Failed to add part.",
        err
      );
    }
  }

export async function updatePart(req, res) {
    const partId =
      validPositiveId(
        req.params.id
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    const {
      part_name,
      description,
      category,
      image_urls,
      images,
      image_url,
      image_description,
      manufacturer,
      price,
      supplier_number,
      sharepoint_urls,
      sharepoint_url,
      sharepoint_description,
      updated_by,
    } = req.body;

    const cleanPartName =
      nullableString(
        part_name
      );

    if (
      !cleanPartName
    ) {
      return res
        .status(400)
        .json({
          error:
            "Part Name is required.",
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

    const cleanImageUrls =
      getRequestUrlEntries(
        image_urls,
        images,
        image_url,
        image_description
      );

    const cleanSharepointUrls =
      getRequestUrlEntries(
        sharepoint_urls,
        undefined,
        sharepoint_url,
        sharepoint_description
      );

    try {
      const existing =
        await query(
          `
            SELECT
              part_id
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [
            partId,
          ]
        );

      if (
        existing.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      await query(
        `
          UPDATE parts
          SET
            part_name = ?,
            description = ?,
            category = ?,
            image_urls = ?,
            manufacturer = ?,
            price = ?,
            supplier_number = ?,
            sharepoint_urls = ?,
            updated_by = ?
          WHERE part_id = ?
        `,
        [
          cleanPartName,

          nullableString(
            description
          ),

          nullableString(
            category
          ),

          JSON.stringify(
            cleanImageUrls
          ),

          nullableString(
            manufacturer
          ),

          priceResult.value,

          nullableString(
            supplier_number
          ),

          JSON.stringify(
            cleanSharepointUrls
          ),

          nullableString(
            updated_by
          ),

          partId,
        ]
      );

      const results =
        await query(
          `
            SELECT
              part_id,
              part_number,
              part_name,
              description,
              category,
              image_urls,
              manufacturer,
              price,
              supplier_number,
              sharepoint_urls,
              created_at,
              created_by,
              updated_at,
              updated_by
            FROM parts
            WHERE part_id = ?
          `,
          [
            partId,
          ]
        );

      await logActivity({ eventType: "part_modified", entityType: "part", entityId: partId, reference: results[0].part_number, title: results[0].part_name, description: `${results[0].part_number} details were modified.` });

      return res.json({
        message:
          "Part updated successfully!",

        ...formatPartRow(
          results[0]
        ),
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to update part.",
        err
      );
    }
  }

export async function deletePart(req, res) {
    const partId =
      validPositiveId(
        req.params.id
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    try {
      const existing =
        await query(
          `
            SELECT
              part_id,
              part_number,
              part_name
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [
            partId,
          ]
        );

      if (
        existing.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      const usageRows =
        await query(
          `
            SELECT
              COUNT(*) AS used_in_count
            FROM sub_parts
            WHERE child_part_id = ?
          `,
          [
            partId,
          ]
        );

      const usedInCount =
        Number(
          usageRows[0]
            ?.used_in_count ??
            0
        ) || 0;

      if (
        usedInCount > 0
      ) {
        return res
          .status(409)
          .json({
            error:
              "Cannot delete this part because it is currently used as a component by another part.",

            used_in_count:
              usedInCount,

            usedInCount,
          });
      }

      const result =
        await query(
          `
            DELETE FROM parts
            WHERE part_id = ?
          `,
          [
            partId,
          ]
        );

      if (
        result.affectedRows ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      await logActivity({ eventType: "part_deleted", entityType: "part", entityId: partId, reference: existing[0].part_number, title: existing[0].part_name, description: `${existing[0].part_number} was deleted from inventory.` });

      return res.json({
        message:
          "Part deleted successfully!",

        partId,

        part_id:
          partId,
      });
    } catch (err) {
      if (
        err.code ===
        "ER_ROW_IS_REFERENCED_2"
      ) {
        return res
          .status(409)
          .json({
            error:
              "Cannot delete this part because another record, such as an asset, purchase, or part relationship, is using it.",

            code:
              err.code,

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to delete part.",
        err
      );
    }
  }

export async function listSubParts(req, res) {
    const partId =
      validPositiveId(
        req.params.partId
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    try {
      if (
        !(await partExists(partId))
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      const rows =
        await query(
          `
            SELECT
              sp.sub_part_id,
              sp.parent_part_id,
              sp.child_part_id,
              sp.quantity,

              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by
            FROM sub_parts AS sp
            INNER JOIN parts AS p
              ON p.part_id =
                 sp.child_part_id
            WHERE sp.parent_part_id = ?
            ORDER BY
              p.part_name ASC,
              p.part_number ASC
          `,
          [partId]
        );

      return res.json(
        rows.map(
          formatSubPartRow
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve sub-parts.",
        err
      );
    }
  }

export async function listUsedInParts(req, res) {
    const partId =
      validPositiveId(
        req.params.partId
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    try {
      if (
        !(await partExists(partId))
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      const rows =
        await query(
          `
            SELECT
              sp.sub_part_id,
              sp.parent_part_id,
              sp.child_part_id,
              sp.quantity,

              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by
            FROM sub_parts AS sp
            INNER JOIN parts AS p
              ON p.part_id =
                 sp.parent_part_id
            WHERE sp.child_part_id = ?
            ORDER BY
              p.part_name ASC,
              p.part_number ASC
          `,
          [partId]
        );

      return res.json(
        rows.map(
          formatSubPartRow
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve parent parts.",
        err
      );
    }
  }

export async function getPartTree(req, res) {
    const partId =
      validPositiveId(
        req.params.partId
      );

    if (
      partId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid part ID.",
        });
    }

    try {
      const rootRows =
        await query(
          `
            SELECT
              part_id,
              part_number,
              part_name,
              description,
              category,
              image_urls,
              manufacturer,
              price,
              supplier_number,
              sharepoint_urls,
              created_at,
              created_by,
              updated_at,
              updated_by
            FROM parts
            WHERE part_id = ?
            LIMIT 1
          `,
          [partId]
        );

      if (
        rootRows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Part not found.",
          });
      }

      const rows =
        await query(
          `
            WITH RECURSIVE part_tree AS (
              SELECT
                sp.sub_part_id,
                sp.parent_part_id,
                sp.child_part_id,
                sp.quantity,
                1 AS depth,
                CAST(
                  CONCAT(
                    ',',
                    sp.parent_part_id,
                    ',',
                    sp.child_part_id,
                    ','
                  ) AS CHAR(5000)
                ) AS id_path
              FROM sub_parts AS sp
              WHERE sp.parent_part_id = ?

              UNION ALL

              SELECT
                sp.sub_part_id,
                sp.parent_part_id,
                sp.child_part_id,
                sp.quantity,
                pt.depth + 1,
                CONCAT(
                  pt.id_path,
                  sp.child_part_id,
                  ','
                ) AS id_path
              FROM sub_parts AS sp
              INNER JOIN part_tree AS pt
                ON sp.parent_part_id =
                   pt.child_part_id
              WHERE pt.id_path NOT LIKE
                CONCAT(
                  '%,',
                  sp.child_part_id,
                  ',%'
                )
            )
            SELECT
              pt.sub_part_id,
              pt.parent_part_id,
              pt.child_part_id,
              pt.quantity,
              pt.depth,
              pt.id_path,

              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by
            FROM part_tree AS pt
            INNER JOIN parts AS p
              ON p.part_id =
                 pt.child_part_id
            ORDER BY
              pt.depth ASC,
              pt.id_path ASC,
              p.part_name ASC
          `,
          [partId]
        );

      return res.json({
        root:
          formatPartRow(
            rootRows[0]
          ),

        components:
          rows.map(
            formatSubPartRow
          ),
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve part tree.",
        err
      );
    }
  }

export async function addSubPart(req, res) {
    const parentPartId =
      validPositiveId(
        req.params.partId
      );

    const childPartId =
      validPositiveId(
        req.body.child_part_id ??
          req.body.childPartId
      );

    if (
      parentPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid parent part ID.",
        });
    }

    if (
      childPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "A valid child part ID is required.",
        });
    }

    if (
      parentPartId === childPartId
    ) {
      return res
        .status(400)
        .json({
          error:
            "A part cannot be its own sub-part.",
        });
    }

    try {
      const parts =
        await query(
          `
            SELECT part_id
            FROM parts
            WHERE part_id IN (?, ?)
          `,
          [
            parentPartId,
            childPartId,
          ]
        );

      const foundIds =
        new Set(
          parts.map(
            (row) =>
              Number(row.part_id)
          )
        );

      if (
        !foundIds.has(parentPartId)
      ) {
        return res
          .status(404)
          .json({
            error:
              "Parent part not found.",
          });
      }

      if (
        !foundIds.has(childPartId)
      ) {
        return res
          .status(404)
          .json({
            error:
              "Child part not found.",
          });
      }

      const createsCycle =
        await wouldCreatePartCycle(
          parentPartId,
          childPartId
        );

      if (createsCycle) {
        return res
          .status(409)
          .json({
            error:
              "This sub-part relationship would create a circular part hierarchy.",
          });
      }

      const result =
        await query(
          `
            INSERT INTO sub_parts (
              parent_part_id,
              child_part_id,
              quantity
            )
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE
              quantity = quantity + 1,
              sub_part_id = LAST_INSERT_ID(sub_part_id)
          `,
          [
            parentPartId,
            childPartId,
          ]
        );

      const rows =
        await query(
          `
            SELECT
              sp.sub_part_id,
              sp.parent_part_id,
              sp.child_part_id,
              sp.quantity,

              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by
            FROM sub_parts AS sp
            INNER JOIN parts AS p
              ON p.part_id =
                 sp.child_part_id
            WHERE sp.sub_part_id = ?
            LIMIT 1
          `,
          [result.insertId]
        );

      await logActivity({ eventType: "component_added", entityType: "part", entityId: parentPartId, reference: rows[0].part_number, title: rows[0].part_name, description: `${rows[0].part_number} was added beneath part ${parentPartId}; quantity is now ${rows[0].quantity}.` });

      return res
        .status(201)
        .json({
          message:
            result.affectedRows === 1
              ? "Sub-part added successfully."
              : "Sub-part quantity increased automatically.",

          ...formatSubPartRow(
            rows[0]
          ),
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
              "This part is already assigned as a sub-part of the selected parent.",

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
              "The selected parent or child part does not exist.",

            details:
              err.message,
          });
      }

      if (
        err.code ===
        "ER_CHECK_CONSTRAINT_VIOLATED"
      ) {
        return res
          .status(400)
          .json({
            error:
              "The sub-part relationship violates a database constraint.",

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to add sub-part.",
        err
      );
    }
  }

export async function updateSubPart(req, res) {
    const parentPartId =
      validPositiveId(
        req.params.partId
      );

    const subPartId =
      validPositiveId(
        req.params.subPartId
      );

    const quantity =
      Number(req.body.quantity);

    if (
      parentPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid parent part ID.",
        });
    }

    if (
      subPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid sub-part relationship ID.",
        });
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Quantity must be a positive whole number.",
        });
    }

    try {
      const result =
        await query(
          `
            UPDATE sub_parts
            SET quantity = ?
            WHERE sub_part_id = ?
              AND parent_part_id = ?
          `,
          [
            quantity,
            subPartId,
            parentPartId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Sub-part relationship not found.",
          });
      }

      const rows =
        await query(
          `
            SELECT
              sp.sub_part_id,
              sp.parent_part_id,
              sp.child_part_id,
              sp.quantity,

              p.part_id,
              p.part_number,
              p.part_name,
              p.description,
              p.category,
              p.image_urls,
              p.manufacturer,
              p.price,
              p.supplier_number,
              p.sharepoint_urls,
              p.created_at,
              p.created_by,
              p.updated_at,
              p.updated_by
            FROM sub_parts AS sp
            INNER JOIN parts AS p
              ON p.part_id =
                 sp.child_part_id
            WHERE sp.sub_part_id = ?
            LIMIT 1
          `,
          [subPartId]
        );

      return res.json({
        message:
          "Sub-part quantity updated successfully.",

        ...formatSubPartRow(
          rows[0]
        ),
      });
    } catch (err) {
      if (
        err.code ===
        "ER_CHECK_CONSTRAINT_VIOLATED"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Quantity must be greater than zero.",

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to update sub-part.",
        err
      );
    }
  }

export async function removeSubPart(req, res) {
    const parentPartId =
      validPositiveId(
        req.params.partId
      );

    const subPartId =
      validPositiveId(
        req.params.subPartId
      );

    if (
      parentPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid parent part ID.",
        });
    }

    if (
      subPartId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid sub-part relationship ID.",
        });
    }

    try {
      const rows =
        await query(
          `
            SELECT
              sub_part_id,
              parent_part_id,
              child_part_id,
              quantity
            FROM sub_parts
            WHERE sub_part_id = ?
              AND parent_part_id = ?
            LIMIT 1
          `,
          [
            subPartId,
            parentPartId,
          ]
        );

      if (
        rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Sub-part relationship not found.",
          });
      }

      const currentQuantity = Number(rows[0].quantity) || 1;

      if (currentQuantity > 1) {
        await query(
          `
            UPDATE sub_parts
            SET quantity = quantity - 1
            WHERE sub_part_id = ?
              AND parent_part_id = ?
          `,
          [subPartId, parentPartId]
        );
      } else {
        await query(
          `
            DELETE FROM sub_parts
            WHERE sub_part_id = ?
              AND parent_part_id = ?
          `,
          [subPartId, parentPartId]
        );
      }

      await logActivity({ eventType: "component_removed", entityType: "part", entityId: parentPartId, reference: String(rows[0].child_part_id), title: "Sub-part changed", description: `A component was removed from part ${parentPartId}; remaining quantity is ${Math.max(0, currentQuantity - 1)}.` });

      return res.json({
        message:
          currentQuantity > 1
            ? "Sub-part quantity decreased automatically."
            : "Sub-part removed successfully.",

        sub_part_id:
          Number(
            rows[0].sub_part_id
          ),

        parent_part_id:
          Number(
            rows[0].parent_part_id
          ),

        child_part_id:
          Number(
            rows[0].child_part_id
          ),

        quantity:
          Math.max(0, currentQuantity - 1),
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to remove sub-part.",
        err
      );
    }
  }
