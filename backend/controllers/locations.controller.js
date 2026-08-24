import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { nullableString, validPositiveId } from "../utils/values.js";



export async function listLocations(req, res) {
    try {
      const results =
        await query(`
          SELECT
            location_id,
            parent_location_id,
            location_name,
            location_path
          FROM locations
          ORDER BY location_path ASC
        `);

      return res.json(
        results.map(
          (row) => ({
            ...row,

            id:
              row.location_id,

            name:
              row.location_name,

            location:
              row.location_path,
          })
        )
      );
    } catch (err) {
      return sendDatabaseError(
        res,
        "Failed to retrieve locations.",
        err
      );
    }
  }

export async function createLocation(req, res) {
    const cleanName =
      nullableString(
        req.body
          .location_name ??
          req.body.name ??
          req.body.location
      );

    if (
      !cleanName
    ) {
      return res
        .status(400)
        .json({
          error:
            "Location name is required.",
        });
    }

    let parentLocationId =
      null;

    if (
      req.body
        .parent_location_id !==
        undefined &&
      req.body
        .parent_location_id !==
        null &&
      req.body
        .parent_location_id !==
        ""
    ) {
      parentLocationId =
        validPositiveId(
          req.body
            .parent_location_id
        );

      if (
        parentLocationId ===
        null
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid parent location ID.",
          });
      }
    }

    try {
      let locationPath =
        cleanName;

      if (
        parentLocationId !==
        null
      ) {
        const parents =
          await query(
            `
              SELECT
                location_id,
                location_path
              FROM locations
              WHERE location_id = ?
            `,
            [
              parentLocationId,
            ]
          );

        if (
          parents.length === 0
        ) {
          return res
            .status(404)
            .json({
              error:
                "Parent location not found.",
            });
        }

        const parentPath =
          nullableString(
            parents[0]
              .location_path
          );

        if (
          !parentPath
        ) {
          return res
            .status(500)
            .json({
              error:
                "Parent location does not have a valid location path.",
            });
        }

        locationPath =
          `${parentPath} / ${cleanName}`;
      }

      const result =
        await query(
          `
            INSERT INTO locations (
              parent_location_id,
              location_name,
              location_path
            )
            VALUES (?, ?, ?)
          `,
          [
            parentLocationId,
            cleanName,
            locationPath,
          ]
        );

      const newLocationId =
        result.insertId;

      return res
        .status(201)
        .json({
          message:
            "Location added successfully!",

          locationId:
            newLocationId,

          location_id:
            newLocationId,

          parent_location_id:
            parentLocationId,

          location_name:
            cleanName,

          location_path:
            locationPath,

          id:
            newLocationId,

          name:
            cleanName,

          location:
            locationPath,
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
              "A location with this path already exists.",

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
              "The selected parent location does not exist.",

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
        "Failed to add location.",
        err
      );
    }
  }
