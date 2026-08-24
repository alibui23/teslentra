import { connectionQuery } from "../config/database.js";

export function quoteIdentifier(
  value
) {
  return `\`${String(
    value
  ).replace(
    /`/g,
    "``"
  )}\``;
}

export async function getAssetForeignKeyReferences(
  connection
) {
  return connectionQuery(
    connection,
    `
      SELECT
        kcu.TABLE_NAME AS table_name,
        kcu.COLUMN_NAME AS column_name
      FROM information_schema.KEY_COLUMN_USAGE AS kcu
      WHERE kcu.REFERENCED_TABLE_SCHEMA =
        DATABASE()
        AND kcu.REFERENCED_TABLE_NAME =
          'assets'
        AND kcu.REFERENCED_COLUMN_NAME =
          'asset_id'
      ORDER BY
        kcu.TABLE_NAME ASC,
        kcu.COLUMN_NAME ASC
    `
  );
}
