import { query } from "../config/database.js";

let tableReady = false;

export async function ensureActivityLogTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      activity_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      event_type VARCHAR(80) NOT NULL,
      entity_type VARCHAR(40) NOT NULL,
      entity_id BIGINT UNSIGNED NULL,
      reference VARCHAR(255) NULL,
      title VARCHAR(255) NULL,
      description TEXT NOT NULL,
      occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (activity_id),
      KEY idx_activity_log_occurred_at (occurred_at),
      KEY idx_activity_log_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  tableReady = true;
}

export async function logActivity({ eventType, entityType, entityId = null, reference = null, title = null, description }) {
  try {
    await ensureActivityLogTable();
    await query(
      `INSERT INTO activity_log (event_type, entity_type, entity_id, reference, title, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [eventType, entityType, entityId, reference, title, description]
    );
  } catch (error) {
    console.error("Activity logging failed:", error);
  }
}
