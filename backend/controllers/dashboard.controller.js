import { query } from "../config/database.js";
import { sendDatabaseError } from "../middleware/error-handler.js";
import { ensureActivityLogTable } from "../services/activity-log.service.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDashboard(req, res) {
  try {
    await ensureActivityLogTable();
    const [summaryRows, activityRows, eventRows, mutationRows] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM parts) AS total_parts,
          (SELECT COUNT(*) FROM assets) AS total_assets,
          (
            SELECT COUNT(*)
            FROM assets
            WHERE LOWER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'available'
          ) AS available_assets,
          (
            SELECT COUNT(*)
            FROM checkouts
            WHERE returned_at IS NULL
          ) AS active_checkouts,
          (
            SELECT COUNT(*)
            FROM checkouts
            WHERE returned_at IS NULL
              AND due_at IS NOT NULL
              AND due_at < CURRENT_TIMESTAMP
          ) AS overdue_checkouts,
          (
            SELECT COUNT(*)
            FROM purchases
            WHERE received_at IS NULL
          ) AS open_purchases,
          (
            SELECT COALESCE(SUM(quantity), 0)
            FROM sub_parts
          ) AS component_units,
          (
            SELECT COUNT(*)
            FROM locations
          ) AS total_locations
      `),
      query(`
        SELECT *
        FROM (
          SELECT
            CONCAT('part-', p.part_id, '-', UNIX_TIMESTAMP(p.created_at)) AS event_id,
            'part_added' AS event_type,
            p.created_at AS occurred_at,
            p.part_id AS record_id,
            p.part_number AS reference,
            p.part_name AS title,
            CONCAT(p.part_number, ' was added to inventory') AS description
          FROM parts AS p

          UNION ALL

          SELECT
            CONCAT('checkout-', c.checkout_id) AS event_id,
            'asset_checked_out' AS event_type,
            c.out_at AS occurred_at,
            a.asset_id AS record_id,
            a.equipment_number AS reference,
            COALESCE(c.to_name, 'Unassigned holder') AS title,
            CONCAT(a.equipment_number, ' checked out to ', COALESCE(c.to_name, 'unknown')) AS description
          FROM checkouts AS c
          INNER JOIN assets AS a ON a.asset_id = c.asset_id
          WHERE c.out_at IS NOT NULL

          UNION ALL

          SELECT
            CONCAT('checkin-', c.checkout_id) AS event_id,
            'asset_checked_in' AS event_type,
            c.returned_at AS occurred_at,
            a.asset_id AS record_id,
            a.equipment_number AS reference,
            COALESCE(c.returned_location, a.location, 'No location') AS title,
            CONCAT(a.equipment_number, ' checked in at ', COALESCE(c.returned_location, a.location, 'an unspecified location')) AS description
          FROM checkouts AS c
          INNER JOIN assets AS a ON a.asset_id = c.asset_id
          WHERE c.returned_at IS NOT NULL

          UNION ALL

          SELECT
            CONCAT('purchase-', p.purchases_id) AS event_id,
            CASE WHEN p.received_at IS NULL THEN 'purchase_ordered' ELSE 'purchase_received' END AS event_type,
            COALESCE(p.received_at, p.ordered_at) AS occurred_at,
            p.purchases_id AS record_id,
            COALESCE(p.po_number, CONCAT('Purchase ', p.purchases_id)) AS reference,
            COALESCE(p.vendor, 'Unknown vendor') AS title,
            CONCAT(COALESCE(p.po_number, CONCAT('Purchase ', p.purchases_id)), IF(p.received_at IS NULL, ' was ordered', ' was received')) AS description
          FROM purchases AS p
          WHERE COALESCE(p.received_at, p.ordered_at) IS NOT NULL
        ) AS activity
        ORDER BY occurred_at DESC
        LIMIT 12
      `),
      query(`
        SELECT
          c.checkout_id,
          c.asset_id,
          a.equipment_number,
          COALESCE(p.part_name, a.asset_type, 'Asset') AS asset_name,
          c.to_name,
          c.out_at,
          c.due_at,
          c.returned_at,
          c.returned_location
        FROM checkouts AS c
        INNER JOIN assets AS a ON a.asset_id = c.asset_id
        LEFT JOIN parts AS p ON p.part_id = a.part_id
        WHERE COALESCE(c.returned_at, c.due_at, c.out_at) >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
        ORDER BY COALESCE(c.due_at, c.out_at) DESC
      `),
      query(`
        SELECT
          CONCAT('log-', activity_id) AS event_id,
          event_type,
          occurred_at,
          entity_id AS record_id,
          reference,
          title,
          description
        FROM activity_log
        ORDER BY occurred_at DESC, activity_id DESC
        LIMIT 24
      `),
    ]);

    const summary = summaryRows[0] ?? {};

    return res.json({
      summary: {
        totalParts: toNumber(summary.total_parts),
        totalAssets: toNumber(summary.total_assets),
        availableAssets: toNumber(summary.available_assets),
        activeCheckouts: toNumber(summary.active_checkouts),
        overdueCheckouts: toNumber(summary.overdue_checkouts),
        openPurchases: toNumber(summary.open_purchases),
        componentUnits: toNumber(summary.component_units),
        totalLocations: toNumber(summary.total_locations),
      },
      recentActivity: [...activityRows, ...mutationRows]
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 12),
      checkoutEvents: eventRows,
    });
  } catch (err) {
    return sendDatabaseError(res, "Failed to retrieve dashboard data.", err);
  }
}
