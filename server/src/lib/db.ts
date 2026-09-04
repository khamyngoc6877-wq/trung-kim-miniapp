import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("Thiếu biến môi trường DATABASE_URL");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
