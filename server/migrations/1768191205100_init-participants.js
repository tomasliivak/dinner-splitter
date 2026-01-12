
export function up(pgm) {
    pgm.createTable("participants", {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
  
      receipt_id: {
        type: "uuid",
        notNull: true,
        references: "receipts",
        onDelete: "cascade",
      },
  
      display_name: { type: "text", notNull: true },
      venmo_handle: { type: "text" },
  
      
      token_hash: { type: "text", notNull: true },
  
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    })
  
    pgm.createIndex("participants", "receipt_id")
  
  }
  
export function down(pgm) {
    pgm.dropTable("participants")
  }
  