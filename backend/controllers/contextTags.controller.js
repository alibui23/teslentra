import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { formatContextTagRow } from "../utils/formatters.js";
import { nullableString, validPositiveId } from "../utils/values.js";



export async function listContextTags(req, res) {
    try {
      const results =
        await query(`
          SELECT
            context_tag_id,
            asset_id,
            context_tag_name
          FROM context_tag
          ORDER BY
            LOWER(
              TRIM(
                context_tag_name
              )
            ) ASC,
            context_tag_id ASC
        `);

      return res.json(
        results.map(
          formatContextTagRow
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve context tags.",
        err
      );
    }
  }

export async function listAssetContextTags(req, res) {
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
      const assets =
        await query(
          `
            SELECT
              asset_id
            FROM assets
            WHERE asset_id = ?
            LIMIT 1
          `,
          [
            assetId,
          ]
        );

      if (
        assets.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Asset not found.",
          });
      }

      const results =
        await query(
          `
            SELECT
              context_tag_id,
              asset_id,
              context_tag_name
            FROM context_tag
            WHERE asset_id = ?
            ORDER BY
              LOWER(
                TRIM(
                  context_tag_name
                )
              ) ASC,
              context_tag_id ASC
          `,
          [
            assetId,
          ]
        );

      return res.json(
        results.map(
          formatContextTagRow
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve asset context tags.",
        err
      );
    }
  }

export async function createContextTag(req, res) {
    const assetId =
      validPositiveId(
        req.body
          .asset_id ??
          req.body
            .assetId
      );

    if (
      assetId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "A valid asset ID is required.",
        });
    }

    const cleanTagName =
      nullableString(
        req.body
          .context_tag_name ??
          req.body
            .contextTagName ??
          req.body
            .tag_name ??
          req.body
            .tagName ??
          req.body.name
      );

    if (
      !cleanTagName
    ) {
      return res
        .status(400)
        .json({
          error:
            "Context tag name is required.",
        });
    }

    try {
      const assets =
        await query(
          `
            SELECT
              asset_id
            FROM assets
            WHERE asset_id = ?
            LIMIT 1
          `,
          [
            assetId,
          ]
        );

      if (
        assets.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Asset not found.",
          });
      }

      const existingTags =
        await query(
          `
            SELECT
              context_tag_id,
              asset_id,
              context_tag_name
            FROM context_tag
            WHERE asset_id = ?
              AND LOWER(
                TRIM(
                  context_tag_name
                )
              ) =
              LOWER(
                TRIM(?)
              )
            LIMIT 1
          `,
          [
            assetId,
            cleanTagName,
          ]
        );

      if (
        existingTags.length >
        0
      ) {
        return res.json({
          message:
            "Context tag is already assigned to this asset.",

          created:
            false,

          ...formatContextTagRow(
            existingTags[0]
          ),
        });
      }

      const result =
        await query(
          `
            INSERT INTO context_tag (
              asset_id,
              context_tag_name
            )
            VALUES (?, ?)
          `,
          [
            assetId,
            cleanTagName,
          ]
        );

      const rows =
        await query(
          `
            SELECT
              context_tag_id,
              asset_id,
              context_tag_name
            FROM context_tag
            WHERE context_tag_id = ?
            LIMIT 1
          `,
          [
            result.insertId,
          ]
        );

      return res
        .status(201)
        .json({
          message:
            "Context tag added successfully.",

          created:
            true,

          ...formatContextTagRow(
            rows[0]
          ),
        });
    } catch (err) {
      if (
        err.code ===
        "ER_NO_REFERENCED_ROW_2"
      ) {
        return res
          .status(400)
          .json({
            error:
              "The selected asset does not exist.",

            details:
              err.message,
          });
      }

      if (
        err.code ===
        "ER_DUP_ENTRY"
      ) {
        try {
          const existingTags =
            await query(
              `
                SELECT
                  context_tag_id,
                  asset_id,
                  context_tag_name
                FROM context_tag
                WHERE asset_id = ?
                  AND LOWER(
                    TRIM(
                      context_tag_name
                    )
                  ) =
                  LOWER(
                    TRIM(?)
                  )
                LIMIT 1
              `,
              [
                assetId,
                cleanTagName,
              ]
            );

          if (
            existingTags.length >
            0
          ) {
            return res.json({
              message:
                "Context tag is already assigned to this asset.",

              created:
                false,

              ...formatContextTagRow(
                existingTags[0]
              ),
            });
          }
        } catch (
          lookupErr
        ) {
          console.error(
            "Failed to retrieve duplicate context tag:",
            lookupErr
          );
        }

        return res
          .status(409)
          .json({
            error:
              "This context tag is already assigned to the asset.",

            details:
              err.message,
          });
      }

      return sendDatabaseError(
        res,
        "Failed to add context tag.",
        err
      );
    }
  }

export async function deleteContextTag(req, res) {
    const contextTagId =
      validPositiveId(
        req.params
          .contextTagId
      );

    if (
      contextTagId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid context tag ID.",
        });
    }

    try {
      const rows =
        await query(
          `
            SELECT
              context_tag_id,
              asset_id,
              context_tag_name
            FROM context_tag
            WHERE context_tag_id = ?
            LIMIT 1
          `,
          [
            contextTagId,
          ]
        );

      if (
        rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Context tag not found",
          });
      }

      await query(
        `
          DELETE FROM context_tag
          WHERE context_tag_id = ?
        `,
        [
          contextTagId,
        ]
      );

      return res.json({
        message:
          "Context tag removed successfully",

        ...formatContextTagRow(
          rows[0]
        ),
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to remove context tag.",
        err
      );
    }
  }

export async function deleteAssetContextTag(req, res) {
    const assetId =
      validPositiveId(
        req.params
          .assetId
      );

    const contextTagId =
      validPositiveId(
        req.params
          .contextTagId
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

    if (
      contextTagId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid context tag ID.",
        });
    }

    try {
      const rows =
        await query(
          `
            SELECT
              context_tag_id,
              asset_id,
              context_tag_name
            FROM context_tag
            WHERE context_tag_id = ?
              AND asset_id = ?
            LIMIT 1
          `,
          [
            contextTagId,
            assetId,
          ]
        );

      if (
        rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Context tag assignment not found.",
          });
      }

      await query(
        `
          DELETE FROM context_tag
          WHERE context_tag_id = ?
            AND asset_id = ?
        `,
        [
          contextTagId,
          assetId,
        ]
      );

      return res.json({
        message:
          "Context tag removed from asset successfully",

        ...formatContextTagRow(
          rows[0]
        ),
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to remove context tag from asset",
        err
      );
    }
  }
