export function up(pgm) {
    pgm.addColumn("receipts",
        {
            creator_id: {
                type: "uuid",
                notNull: true
              }
        }
    )
}

export function down(pgm) {
    pgm.dropColumn("receipts","creator_id")
}