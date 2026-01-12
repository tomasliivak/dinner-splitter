import pg from "pg"

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL")
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Deployment note:
  // Many hosted Postgres providers require SSL.
  // We'll turn SSL on only in production.
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false,
})
