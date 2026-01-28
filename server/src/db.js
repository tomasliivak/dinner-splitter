import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");

const isLocal =
  process.env.DATABASE_URL.includes("localhost") ||
  process.env.DATABASE_URL.includes("127.0.0.1");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});


