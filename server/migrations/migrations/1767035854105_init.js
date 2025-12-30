/*
example code: 
export async function up(pgm) {
    pgm.createTable("users", {
      id: "id",
      email: { type: "text", notNull: true, unique: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") }
    });
  }
  
  export async function down(pgm) {
    pgm.dropTable("users");
  }
*/