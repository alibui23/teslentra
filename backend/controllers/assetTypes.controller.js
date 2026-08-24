import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { nullableString } from "../utils/values.js";



export async function listAssetTypes(req, res) {
    try {
      const results =
        await query(`
          SELECT DISTINCT
            TRIM(asset_type) AS asset_type
          FROM assets
          WHERE asset_type IS NOT NULL
            AND TRIM(asset_type) <> ''
          ORDER BY asset_type ASC
        `);

      return res.json(
        results.map(
          (row) => ({
            asset_type:
              row.asset_type,

            asset_type_name:
              row.asset_type,

            assetTypeName:
              row.asset_type,

            name:
              row.asset_type,
          })
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve asset types.",
        err
      );
    }
  }

export async function createAssetType(req, res) {
    const cleanAssetType =
      nullableString(
        req.body
          .asset_type ??
          req.body
            .asset_type_name ??
          req.body
            .assetType ??
          req.body
            .assetTypeName ??
          req.body.name
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

    try {
      const existingTypes =
        await query(
          `
            SELECT DISTINCT
              TRIM(asset_type) AS asset_type
            FROM assets
            WHERE asset_type IS NOT NULL
              AND TRIM(asset_type) <> ''
              AND LOWER(TRIM(asset_type)) =
                  LOWER(?)
            LIMIT 1
          `,
          [
            cleanAssetType,
          ]
        );

      const assetType =
        existingTypes.length >
        0
          ? existingTypes[0]
              .asset_type
          : cleanAssetType;

      return res.json({
        message:
          existingTypes.length >
          0
            ? "Asset type already exists."
            : "Asset type is ready to use and will be saved when the asset is created.",

        asset_type:
          assetType,

        asset_type_name:
          assetType,

        assetType:
          assetType,

        assetTypeName:
          assetType,

        name:
          assetType,
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to validate asset type.",
        err
      );
    }
  }
