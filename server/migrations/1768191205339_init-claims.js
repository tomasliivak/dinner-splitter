export function up(pgm) {
    pgm.createTable("claims", {
      id: {
        type: "uuid",
        primaryKey: true,
        default: pgm.func("gen_random_uuid()"),
      },
  
      receipt_item_id: {
        type: "uuid",
        notNull: true,
        references: "receipt_items",
        onDelete: "cascade",
      },
  
      participant_id: {
        type: "uuid",
        notNull: true,
        references: "participants",
        onDelete: "cascade",
      },
  
      quantity_claimed: { type: "numeric(10,2)", notNull: true, default: 1 },
  
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    })
  
    // Fast lookups
    pgm.createIndex("claims", "receipt_item_id")
    pgm.createIndex("claims", "participant_id")
  
    // Optional: prevent the same participant from creating multiple rows for same item
    // (they would edit quantity instead)
    pgm.createConstraint("claims", "claims_item_participant_unique", {
      unique: ["receipt_item_id", "participant_id"],
    })
  }
  
export function down(pgm) {
    pgm.dropTable("claims")
  }
  