import Database from "better-sqlite3";

const db = new Database("./saude.db");
db.pragma('journal_mode = WAL');

console.log("🔄 Migrando campos SOAP para o banco de dados...\n");

try {
  // Verificar se as colunas já existem
  const tableInfo = db.prepare("PRAGMA table_info(consultations)").all();
  const columnNames = tableInfo.map((col: any) => col.name);
  
  // Adicionar campos SOAP se não existirem
  const fieldsToAdd = [
    { name: "subjective", sql: "ALTER TABLE consultations ADD COLUMN subjective TEXT" },
    { name: "objective", sql: "ALTER TABLE consultations ADD COLUMN objective TEXT" },
    { name: "assessment", sql: "ALTER TABLE consultations ADD COLUMN assessment TEXT" },
    { name: "plan", sql: "ALTER TABLE consultations ADD COLUMN plan TEXT" },
    { name: "vital_signs", sql: "ALTER TABLE consultations ADD COLUMN vital_signs TEXT" },
    { name: "ciap2_codes", sql: "ALTER TABLE consultations ADD COLUMN ciap2_codes TEXT" },
    { name: "cid10_codes", sql: "ALTER TABLE consultations ADD COLUMN cid10_codes TEXT" },
    { name: "appointment_id", sql: "ALTER TABLE consultations ADD COLUMN appointment_id TEXT" },
  ];

  let added = 0;
  let skipped = 0;

  for (const field of fieldsToAdd) {
    if (!columnNames.includes(field.name)) {
      try {
        db.exec(field.sql);
        console.log(`✅ Campo '${field.name}' adicionado com sucesso`);
        added++;
      } catch (error: any) {
        console.log(`⚠️  Erro ao adicionar '${field.name}': ${error.message}`);
      }
    } else {
      console.log(`⏭️  Campo '${field.name}' já existe`);
      skipped++;
    }
  }

  // Adicionar campos TFD se não existirem
  const tfdTableInfo = db.prepare("PRAGMA table_info(tfd_requests)").all();
  const tfdColumnNames = tfdTableInfo.map((col: any) => col.name);

  const tfdFieldsToAdd = [
    { name: "return_date", sql: "ALTER TABLE tfd_requests ADD COLUMN return_date INTEGER" },
    { name: "companion", sql: "ALTER TABLE tfd_requests ADD COLUMN companion INTEGER DEFAULT 0" },
    { name: "transport_type", sql: "ALTER TABLE tfd_requests ADD COLUMN transport_type TEXT" },
    { name: "justification", sql: "ALTER TABLE tfd_requests ADD COLUMN justification TEXT" },
    { name: "approved_by", sql: "ALTER TABLE tfd_requests ADD COLUMN approved_by TEXT" },
    { name: "approved_at", sql: "ALTER TABLE tfd_requests ADD COLUMN approved_at INTEGER" },
    { name: "updated_at", sql: "ALTER TABLE tfd_requests ADD COLUMN updated_at INTEGER" },
  ];

  for (const field of tfdFieldsToAdd) {
    if (!tfdColumnNames.includes(field.name)) {
      try {
        db.exec(field.sql);
        console.log(`✅ Campo TFD '${field.name}' adicionado com sucesso`);
        added++;
      } catch (error: any) {
        console.log(`⚠️  Erro ao adicionar TFD '${field.name}': ${error.message}`);
      }
    } else {
      console.log(`⏭️  Campo TFD '${field.name}' já existe`);
      skipped++;
    }
  }

  console.log(`\n✨ Migração concluída!`);
  console.log(`   📝 Campos adicionados: ${added}`);
  console.log(`   ⏭️  Campos já existentes: ${skipped}`);
  
} catch (error) {
  console.error("❌ Erro na migração:", error);
  process.exit(1);
} finally {
  db.close();
}
