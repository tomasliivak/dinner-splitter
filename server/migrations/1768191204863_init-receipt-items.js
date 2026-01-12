
export function up(pgm) {
    pgm.createTable("receipt_items", {
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
  
      name: { type: "text", notNull: true },
  
      quantity: { type: "numeric(10,2)", notNull: true, default: 1 },
      unit_price: { type: "numeric(10,2)" },
      line_total: { type: "numeric(10,2)" },
  
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
      updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    })
  
    // Makes it not have to search every row
    pgm.createIndex("receipt_items", "receipt_id")
  }
  
export function down(pgm) {
    pgm.dropTable("receipt_items")
  }
  