export function up(pgm) {
    // Needed for gen_random_uuid()
    pgm.createExtension("pgcrypto", { ifNotExists: true })
  
    pgm.createTable("receipts", {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
  
      // later used for the share link
      share_key: { type: "text", notNull: true, unique: true },
  
      merchant_name: { type: "text" },
  
      subtotal: { type: "numeric(10,2)" },
      tax: { type: "numeric(10,2)" },
      tip: { type: "numeric(10,2)" },
      total: { type: "numeric(10,2)" },
  
      status: { type: "text", notNull: true, default: "draft" }, // draft|active|locked|settled
  
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
      updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    })
  }
  
export function down(pgm) {
    pgm.dropTable("receipts")
    // usually you do NOT drop extensions in down migrations
  }
  