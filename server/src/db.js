import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const isProd = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Local Postgres → no SSL
  // Render → requires SSL but RDS cert isn't trusted → disable verification
  ssl: isProd
    ? { rejectUnauthorized: false }
    : false,
});


