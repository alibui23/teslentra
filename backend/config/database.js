import mysql from "mysql2";
import "./environment.js";

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventory_system",
});

db.connect((error) => {
  if (error) {
    console.error("Database connection failed:", error);
    return;
  }

  console.log("Connected to MySQL!");
});

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });
}

export function connectionQuery(
  connection,
  sql,
  params = []
) {
  return new Promise(
    (resolve, reject) => {
      connection.query(
        sql,
        params,
        (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(results);
        }
      );
    }
  );
}

export function getDatabaseConnection() {
  if (
    typeof db.getConnection !==
    "function"
  ) {
    return Promise.resolve(
      db
    );
  }

  return new Promise(
    (resolve, reject) => {
      db.getConnection(
        (err, connection) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(
            connection
          );
        }
      );
    }
  );
}

export function beginTransaction(
  connection
) {
  return new Promise(
    (resolve, reject) => {
      connection.beginTransaction(
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    }
  );
}

export function commitTransaction(
  connection
) {
  return new Promise(
    (resolve, reject) => {
      connection.commit(
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    }
  );
}

export function rollbackTransaction(
  connection
) {
  return new Promise(
    (resolve) => {
      connection.rollback(
        () => resolve()
      );
    }
  );
}

export function releaseDatabaseConnection(
  connection
) {
  if (
    connection !== db &&
    typeof connection.release ===
      "function"
  ) {
    connection.release();
  }
}


export default db;
