export function up(pgm) {
    pgm.addColumns("receipts",
        {
            creator: {
                type: "text",
                notNull: true
              },
            venmo_handle: {
                type: "varchar(50)",
                notNull: true
            }
        }
    )
}

export function down(pgm) {
    pgm.dropColumns("receipts",["creator", "venmo_handle"])
}
