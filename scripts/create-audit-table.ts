import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "saude.db");
const db = new Database(dbPath);

const createTableSQL = `
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('diagnose', 'drug_interactions', 'validate_prescription', 'generate_care_plan')),
  input_data TEXT,
  success INTEGER NOT NULL CHECK(success IN (0, 1)),
  error_code TEXT,
  error_message TEXT,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  citizen_id TEXT,
  consultation_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

db.exec(createTableSQL);
console.log("✅ Tabela ai_audit_logs criada com sucesso!");
db.close();
