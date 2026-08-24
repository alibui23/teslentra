import { query } from "../config/database.js";
import { sendDatabaseError, sendLocationError } from "../middleware/error-handler.js";
import { resolveLocationReference } from "../services/location.service.js";
import { normalizeAssetStatus, nullableString, validPositiveId } from "../utils/values.js";

export async function getAssetHistory(req, res) {
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

      const history =
        await query(
          `
            SELECT
              checkout_id,
              asset_id,
              to_name,
              to_name AS holder,
              out_at,
              out_at AS checked_out_at,
              due_at,
              due_at AS due_back,
              returned_at,
              returned_location AS return_location,
              returned_location,
              notes
            FROM checkouts
            WHERE asset_id = ?
            ORDER BY
              out_at DESC,
              checkout_id DESC
          `,
          [
            assetId,
          ]
        );

      return res.json(
        history
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve asset history.",
        err
      );
    }
  }

export async function checkoutAsset(req, res) {
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
      holder,
      due_date,
      to_name,
      due_at,
      notes,
    } = req.body;

    const cleanHolder =
      nullableString(
        to_name ??
          holder
      );

    const cleanDueAt =
      nullableString(
        due_at ??
          due_date
      );

    const cleanNotes =
      nullableString(
        notes
      );

    if (
      !cleanHolder
    ) {
      return res
        .status(400)
        .json({
          error:
            "A checkout holder is required.",
        });
    }

    if (cleanDueAt) {
      const dueDate = new Date(cleanDueAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(dueDate.getTime()) || dueDate < today) {
        return res.status(400).json({
          error: "Due Back cannot be earlier than today.",
        });
      }
    }

    try {
      const assets =
        await query(
          `
            SELECT
              asset_id,
              status
            FROM assets
            WHERE asset_id = ?
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

      const currentStatus =
        normalizeAssetStatus(
          assets[0]
            .status
        );

      if (
        currentStatus !==
        "available"
      ) {
        return res
          .status(409)
          .json({
            error:
              "Only an available asset can be checked out.",
          });
      }

      const openCheckouts =
        await query(
          `
            SELECT
              checkout_id
            FROM checkouts
            WHERE asset_id = ?
              AND returned_at
                IS NULL
            ORDER BY
              checkout_id DESC
            LIMIT 1
          `,
          [
            assetId,
          ]
        );

      if (
        openCheckouts.length >
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "This asset is already checked out.",
          });
      }

      const result =
        await query(
          `
            INSERT INTO checkouts (
              asset_id,
              to_name,
              out_at,
              due_at,
              returned_at,
              returned_location,
              notes
            )
            VALUES (
              ?,
              ?,
              CURRENT_TIMESTAMP,
              ?,
              NULL,
              NULL,
              ?
            )
          `,
          [
            assetId,
            cleanHolder,
            cleanDueAt,
            cleanNotes,
          ]
        );

      const checkoutId =
        result.insertId;

      try {
        await query(
          `
            UPDATE assets
            SET
              status =
                'out_on_job'
            WHERE asset_id = ?
          `,
          [
            assetId,
          ]
        );
      } catch (
        updateErr
      ) {
        try {
          await query(
            `
              DELETE FROM checkouts
              WHERE checkout_id = ?
            `,
            [
              checkoutId,
            ]
          );
        } catch (
          cleanupErr
        ) {
          console.error(
            "Failed to clean up checkout:",
            cleanupErr
          );
        }

        return sendDatabaseError(
          res,
          "Checkout was not completed because the asset status could not be updated.",
          updateErr
        );
      }

      return res
        .status(201)
        .json({
          message:
            "Asset checked out successfully.",

          asset_id:
            assetId,

          assetId,

          checkout_id:
            checkoutId,

          checkoutId,

          status:
            "out_on_job",

          holder:
            cleanHolder,

          due_date:
            cleanDueAt,
        });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to check out asset.",
        err
      );
    }
  }

export async function checkinAsset(req, res) {
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
      location_id,
      location,
      notes,
    } = req.body;

    const cleanCheckinNotes =
      nullableString(
        notes
      );

    let selectedLocation;

    try {
      selectedLocation =
        await resolveLocationReference(
          location_id,
          location,
          true
        );
    } catch (err) {
      return sendLocationError(
        res,
        err
      );
    }

    try {
      const assets =
        await query(
          `
            SELECT
              asset_id
            FROM assets
            WHERE asset_id = ?
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

      const openCheckouts =
        await query(
          `
            SELECT
              checkout_id,
              notes
            FROM checkouts
            WHERE asset_id = ?
              AND returned_at
                IS NULL
            ORDER BY
              checkout_id DESC
            LIMIT 1
          `,
          [
            assetId,
          ]
        );

      if (
        openCheckouts.length ===
        0
      ) {
        return res
          .status(409)
          .json({
            error:
              "This asset does not have an open checkout.",
          });
      }

      const checkoutId =
        openCheckouts[0]
          .checkout_id;

      const originalNotes =
        openCheckouts[0]
          .notes ??
        null;

      let updatedNotes =
        originalNotes;

      if (
        cleanCheckinNotes
      ) {
        updatedNotes =
          nullableString(
            originalNotes
          )
            ? `${originalNotes}\nCheck-in: ${cleanCheckinNotes}`
            : `Check-in: ${cleanCheckinNotes}`;
      }

      await query(
        `
          UPDATE checkouts
          SET
            returned_at =
              CURRENT_TIMESTAMP,
            returned_location = ?,
            notes = ?
          WHERE checkout_id = ?
        `,
        [
          selectedLocation
            .locationPath,

          updatedNotes,

          checkoutId,
        ]
      );

      try {
        await query(
          `
            UPDATE assets
            SET
              status =
                'available',
              location = ?
            WHERE asset_id = ?
          `,
          [
            selectedLocation
              .locationPath,

            assetId,
          ]
        );
      } catch (
        updateErr
      ) {
        try {
          await query(
            `
              UPDATE checkouts
              SET
                returned_at =
                  NULL,
                returned_location =
                  NULL,
                notes = ?
              WHERE checkout_id = ?
            `,
            [
              originalNotes,
              checkoutId,
            ]
          );
        } catch (
          rollbackErr
        ) {
          console.error(
            "Failed to roll back check-in:",
            rollbackErr
          );
        }

        return sendDatabaseError(
          res,
          "Check-in was not completed because the asset could not be updated.",
          updateErr
        );
      }

      return res.json({
        message:
          "Asset checked in successfully.",

        asset_id:
          assetId,

        assetId,

        checkout_id:
          checkoutId,

        checkoutId,

        status:
          "available",

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
      });
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to check in asset.",
        err
      );
    }
  }
