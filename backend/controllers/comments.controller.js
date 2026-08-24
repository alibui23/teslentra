import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { nullableString, validPositiveId } from "../utils/values.js";

export async function listAssetComments(req, res) {
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

      const comments =
        await query(
          `
            SELECT
              comment_id,
              asset_id,
              comment_text,
              created_at,
              updated_at
            FROM comments
            WHERE asset_id = ?
              AND deleted_at IS NULL
            ORDER BY
              created_at DESC,
              comment_id DESC
          `,
          [
            assetId,
          ]
        );

      return res.json(
        comments
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve comments.",
        err
      );
    }
  }

export async function createAssetComment(req, res) {
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

    const cleanCommentText =
      nullableString(
        req.body
          .comment_text ??
          req.body
            .commentText
      );

    if (
      !cleanCommentText
    ) {
      return res
        .status(400)
        .json({
          error:
            "Comment text is required.",
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

      const result =
        await query(
          `
            INSERT INTO comments (
              asset_id,
              comment_text
            )
            VALUES (?, ?)
          `,
          [
            assetId,
            cleanCommentText,
          ]
        );

      const commentId =
        result.insertId;

      const comments =
        await query(
          `
            SELECT
              comment_id,
              asset_id,
              comment_text,
              created_at,
              updated_at
            FROM comments
            WHERE comment_id = ?
            LIMIT 1
          `,
          [
            commentId,
          ]
        );

      return res
        .status(201)
        .json({
          message:
            "Comment added successfully.",

          ...comments[0],
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

      return sendDatabaseError(
        res,
        "Failed to add comment.",
        err
      );
    }
  }

export async function updateAssetComment(req, res) {
    const commentId =
      validPositiveId(
        req.params
          .commentId
      );

    if (
      commentId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid comment ID.",
        });
    }

    const cleanCommentText =
      nullableString(
        req.body
          .comment_text ??
          req.body
            .commentText
      );

    if (
      !cleanCommentText
    ) {
      return res
        .status(400)
        .json({
          error:
            "Comment text is required.",
        });
    }

    try {
      const existingComments =
        await query(
          `
            SELECT
              comment_id
            FROM comments
            WHERE comment_id = ?
              AND deleted_at IS NULL
            LIMIT 1
          `,
          [
            commentId,
          ]
        );

      if (
        existingComments.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Comment not found.",
          });
      }

      await query(
        `
          UPDATE comments
          SET
            comment_text = ?,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE comment_id = ?
            AND deleted_at IS NULL
        `,
        [
          cleanCommentText,
          commentId,
        ]
      );

      const comments =
        await query(
          `
            SELECT
              comment_id,
              asset_id,
              comment_text,
              created_at,
              updated_at
            FROM comments
            WHERE comment_id = ?
            LIMIT 1
          `,
          [
            commentId,
          ]
        );

      return res.json({
        message:
          "Comment updated successfully.",

        ...comments[0],
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to update comment.",
        err
      );
    }
  }

export async function deleteAssetComment(req, res) {
    const commentId =
      validPositiveId(
        req.params
          .commentId
      );

    if (
      commentId === null
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid comment ID.",
        });
    }

    try {
      const result =
        await query(
          `
            UPDATE comments
            SET
              deleted_at =
                CURRENT_TIMESTAMP,
              updated_at =
                CURRENT_TIMESTAMP
            WHERE comment_id = ?
              AND deleted_at IS NULL
          `,
          [
            commentId,
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
              "Comment not found.",
          });
      }

      return res.json({
        message:
          "Comment deleted successfully.",

        commentId,

        comment_id:
          commentId,
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to delete comment.",
        err
      );
    }
  }
