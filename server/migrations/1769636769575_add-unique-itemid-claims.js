export function up(pgm) {
    pgm.addConstraint("claims", "claims_one_per_item_unique", {
      unique: ["receipt_item_id"],
    });
  }
  
  export function down(pgm) {
    pgm.dropConstraint("claims", "claims_one_per_item_unique");
  }
  