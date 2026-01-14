export function up(pgm) {
    pgm.addColumn("claims",
        {
            receipt_id: {
                type: "uuid",
                notNull: true,
                references: "receipts(id)",
                onDelete: "cascade",
              }
        }
    )
}

export function down(pgm) {
    pgm.dropColumn("claims","receipt_id")
}
