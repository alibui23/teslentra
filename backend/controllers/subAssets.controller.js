import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { validPositiveId } from "../utils/values.js";
import { logActivity } from "../services/activity-log.service.js";

function formatSubAssetRow(row) {
  return {
    ...row,
    sub_asset_id: Number(row.sub_asset_id),
    subAssetId: Number(row.sub_asset_id),
    parent_asset_id: Number(row.parent_asset_id),
    parentAssetId: Number(row.parent_asset_id),
    child_asset_id: Number(row.child_asset_id),
    childAssetId: Number(row.child_asset_id),
    asset_id: Number(row.asset_id),
    assetId: Number(row.asset_id),
    part_id: Number(row.part_id),
    partId: Number(row.part_id),
    price:
      row.price === null || row.price === undefined
        ? null
        : Number(row.price),
    depth:
      row.depth === null || row.depth === undefined
        ? undefined
        : Number(row.depth),
  };
}

async function assetExists(assetId) {
  const rows = await query(
    "SELECT asset_id FROM assets WHERE asset_id = ? LIMIT 1",
    [assetId]
  );
  return rows.length > 0;
}

async function wouldCreateAssetCycle(parentAssetId, childAssetId) {
  if (parentAssetId === childAssetId) return true;

  const rows = await query(
    `
      WITH RECURSIVE descendants AS (
        SELECT child_asset_id
        FROM sub_assets
        WHERE parent_asset_id = ?

        UNION DISTINCT

        SELECT sa.child_asset_id
        FROM sub_assets AS sa
        INNER JOIN descendants AS d
          ON sa.parent_asset_id = d.child_asset_id
      )
      SELECT child_asset_id
      FROM descendants
      WHERE child_asset_id = ?
      LIMIT 1
    `,
    [childAssetId, parentAssetId]
  );

  return rows.length > 0;
}

const relationshipSelect = `
  SELECT
    sa.sub_asset_id,
    sa.parent_asset_id,
    sa.child_asset_id,
    a.asset_id,
    a.equipment_number,
    a.asset_type,
    a.part_id,
    a.serial_number,
    a.price,
    a.status,
    a.location,
    a.barcode,
    a.parent_asset_id AS legacy_parent_asset_id,
    p.part_number,
    p.part_name
  FROM sub_assets AS sa
`;

export async function listSubAssets(req, res) {
  const assetId = validPositiveId(req.params.assetId);
  if (assetId === null) {
    return res.status(400).json({ error: "Invalid asset ID." });
  }

  try {
    if (!(await assetExists(assetId))) {
      return res.status(404).json({ error: "Asset not found." });
    }

    const rows = await query(
      `${relationshipSelect}
       INNER JOIN assets AS a ON a.asset_id = sa.child_asset_id
       LEFT JOIN parts AS p ON p.part_id = a.part_id
       WHERE sa.parent_asset_id = ?
       ORDER BY a.equipment_number ASC`,
      [assetId]
    );

    return res.json(rows.map(formatSubAssetRow));
  } catch (error) {
    return sendDatabaseError(res, "Failed to retrieve sub-assets.", error);
  }
}

export async function listAssetParents(req, res) {
  const assetId = validPositiveId(req.params.assetId);
  if (assetId === null) {
    return res.status(400).json({ error: "Invalid asset ID." });
  }

  try {
    if (!(await assetExists(assetId))) {
      return res.status(404).json({ error: "Asset not found." });
    }

    const rows = await query(
      `${relationshipSelect}
       INNER JOIN assets AS a ON a.asset_id = sa.parent_asset_id
       LEFT JOIN parts AS p ON p.part_id = a.part_id
       WHERE sa.child_asset_id = ?
       ORDER BY a.equipment_number ASC`,
      [assetId]
    );

    return res.json(rows.map(formatSubAssetRow));
  } catch (error) {
    return sendDatabaseError(res, "Failed to retrieve parent assets.", error);
  }
}

export async function getAssetTree(req, res) {
  const assetId = validPositiveId(req.params.assetId);
  if (assetId === null) {
    return res.status(400).json({ error: "Invalid asset ID." });
  }

  try {
    const rootRows = await query(
      `
        SELECT
          a.asset_id,
          a.equipment_number,
          a.asset_type,
          a.part_id,
          a.serial_number,
          a.price,
          a.status,
          a.location,
          a.barcode,
          p.part_number,
          p.part_name
        FROM assets AS a
        LEFT JOIN parts AS p ON p.part_id = a.part_id
        WHERE a.asset_id = ?
        LIMIT 1
      `,
      [assetId]
    );

    if (rootRows.length === 0) {
      return res.status(404).json({ error: "Asset not found." });
    }

    const rows = await query(
      `
        WITH RECURSIVE asset_tree AS (
          SELECT
            sa.sub_asset_id,
            sa.parent_asset_id,
            sa.child_asset_id,
            1 AS depth,
            CAST(CONCAT(',', sa.parent_asset_id, ',', sa.child_asset_id, ',') AS CHAR(5000)) AS id_path
          FROM sub_assets AS sa
          WHERE sa.parent_asset_id = ?

          UNION ALL

          SELECT
            sa.sub_asset_id,
            sa.parent_asset_id,
            sa.child_asset_id,
            tree.depth + 1,
            CONCAT(tree.id_path, sa.child_asset_id, ',')
          FROM sub_assets AS sa
          INNER JOIN asset_tree AS tree
            ON sa.parent_asset_id = tree.child_asset_id
          WHERE tree.id_path NOT LIKE CONCAT('%,', sa.child_asset_id, ',%')
        )
        SELECT
          tree.sub_asset_id,
          tree.parent_asset_id,
          tree.child_asset_id,
          tree.depth,
          tree.id_path,
          a.asset_id,
          a.equipment_number,
          a.asset_type,
          a.part_id,
          a.serial_number,
          a.price,
          a.status,
          a.location,
          a.barcode,
          a.parent_asset_id AS legacy_parent_asset_id,
          p.part_number,
          p.part_name
        FROM asset_tree AS tree
        INNER JOIN assets AS a ON a.asset_id = tree.child_asset_id
        LEFT JOIN parts AS p ON p.part_id = a.part_id
        ORDER BY tree.depth, tree.id_path, a.equipment_number
      `,
      [assetId]
    );

    return res.json({
      root: {
        ...rootRows[0],
        asset_id: Number(rootRows[0].asset_id),
        assetId: Number(rootRows[0].asset_id),
      },
      descendants: rows.map(formatSubAssetRow),
    });
  } catch (error) {
    return sendDatabaseError(res, "Failed to retrieve asset tree.", error);
  }
}

export async function addSubAsset(req, res) {
  const parentAssetId = validPositiveId(req.params.assetId);
  const childAssetId = validPositiveId(
    req.body.child_asset_id ?? req.body.childAssetId
  );

  if (parentAssetId === null) {
    return res.status(400).json({ error: "Invalid parent asset ID." });
  }
  if (childAssetId === null) {
    return res.status(400).json({ error: "A valid child asset ID is required." });
  }
  if (parentAssetId === childAssetId) {
    return res.status(400).json({ error: "An asset cannot be its own sub-asset." });
  }

  try {
    const assets = await query(
      "SELECT asset_id FROM assets WHERE asset_id IN (?, ?)",
      [parentAssetId, childAssetId]
    );
    const foundIds = new Set(assets.map((row) => Number(row.asset_id)));

    if (!foundIds.has(parentAssetId)) {
      return res.status(404).json({ error: "Parent asset not found." });
    }
    if (!foundIds.has(childAssetId)) {
      return res.status(404).json({ error: "Child asset not found." });
    }
    if (await wouldCreateAssetCycle(parentAssetId, childAssetId)) {
      return res.status(409).json({
        error: "This sub-asset relationship would create a circular asset hierarchy.",
      });
    }

    const result = await query(
      "INSERT INTO sub_assets (parent_asset_id, child_asset_id) VALUES (?, ?)",
      [parentAssetId, childAssetId]
    );
    const rows = await query(
      `${relationshipSelect}
       INNER JOIN assets AS a ON a.asset_id = sa.child_asset_id
       LEFT JOIN parts AS p ON p.part_id = a.part_id
       WHERE sa.sub_asset_id = ?
       LIMIT 1`,
      [result.insertId]
    );

    await logActivity({ eventType: "sub_asset_added", entityType: "asset", entityId: parentAssetId, reference: rows[0].equipment_number, title: rows[0].part_name, description: `${rows[0].equipment_number} was nested beneath asset ${parentAssetId}.` });

    return res.status(201).json({
      message: "Sub-asset added successfully.",
      ...formatSubAssetRow(rows[0]),
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "This asset is already assigned to the selected parent.",
      });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        error: "The selected parent or child asset does not exist.",
      });
    }
    return sendDatabaseError(res, "Failed to add sub-asset.", error);
  }
}

export async function removeSubAsset(req, res) {
  const parentAssetId = validPositiveId(req.params.assetId);
  const subAssetId = validPositiveId(req.params.subAssetId);

  if (parentAssetId === null || subAssetId === null) {
    return res.status(400).json({ error: "Invalid asset relationship ID." });
  }

  try {
    const rows = await query(
      `SELECT sub_asset_id, parent_asset_id, child_asset_id
       FROM sub_assets
       WHERE sub_asset_id = ? AND parent_asset_id = ?
       LIMIT 1`,
      [subAssetId, parentAssetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Sub-asset relationship not found." });
    }

    await query("DELETE FROM sub_assets WHERE sub_asset_id = ?", [subAssetId]);
    await logActivity({ eventType: "sub_asset_removed", entityType: "asset", entityId: parentAssetId, reference: String(rows[0].child_asset_id), title: "Sub-asset removed", description: `A sub-asset was removed from asset ${parentAssetId}.` });
    return res.json({
      message: "Sub-asset removed successfully.",
      sub_asset_id: subAssetId,
      subAssetId,
      parent_asset_id: parentAssetId,
      parentAssetId,
      child_asset_id: Number(rows[0].child_asset_id),
      childAssetId: Number(rows[0].child_asset_id),
    });
  } catch (error) {
    return sendDatabaseError(res, "Failed to remove sub-asset.", error);
  }
}
