import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper for UUID generation in SQLite
const generateId = () => crypto.randomUUID();

// ============================================================================
// CORE TABLES
// ============================================================================

// Health Units (Unidades Básicas de Saúde)
export const healthUnits = sqliteTable("health_units", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  cnes: text("cnes").notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Users and Authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  cpf: text("cpf"),
  role: text("role", { 
    enum: ["admin", "medico", "enfermeiro", "acs", "farmaceutico", "gestor", "recepcao"] 
  }).notNull().default("recepcao"),
  unitId: text("unit_id").references(() => healthUnits.id),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Professionals (Profissionais de Saúde)
export const professionals = sqliteTable("professionals", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  cns: text("cns"),
  specialty: text("specialty").notNull(),
  councilType: text("council_type").notNull(),
  councilNumber: text("council_number").notNull(),
  councilState: text("council_state").notNull(),
  phone: text("phone"),
  email: text("email"),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Citizens/Patients (Cidadãos/Pacientes)
export const citizens = sqliteTable("citizens", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  cns: text("cns").unique(),
  rg: text("rg"),
  birthDate: integer("birth_date", { mode: "timestamp" }).notNull(),
  gender: text("gender", { enum: ["M", "F", "outro"] }).notNull(),
  motherName: text("mother_name"),
  fatherName: text("father_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address").notNull(),
  neighborhood: text("neighborhood"),
  city: text("city").notNull().default("Cardeal da Silva"),
  state: text("state").notNull().default("BA"),
  zipCode: text("zip_code"),
  familyId: text("family_id").references(() => families.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// ATTENDANCE TABLES
// ============================================================================

// Appointments (Agendamentos)
export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  appointmentDate: integer("appointment_date", { mode: "timestamp" }).notNull(),
  type: text("type").notNull(),
  status: text("status", { 
    enum: ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"] 
  }).notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Attendance Queue (Fila de Atendimento)
export const attendanceQueue = sqliteTable("attendance_queue", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  ticket: text("ticket").notNull(),
  priority: text("priority", { enum: ["normal", "urgent", "emergency"] }).notNull().default("normal"),
  type: text("type").notNull(),
  status: text("status", { enum: ["waiting", "in_progress", "completed", "cancelled"] }).notNull().default("waiting"),
  arrivedAt: integer("arrived_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  calledAt: integer("called_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Consultations (Consultas Médicas) - COM CAMPOS SOAP COMPLETOS ✅
export const consultations = sqliteTable("consultations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  appointmentId: text("appointment_id").references(() => appointments.id),
  consultationDate: integer("consultation_date", { mode: "timestamp" }).notNull(),
  type: text("type").notNull(),
  
  // SOAP Fields (e-SUS PEC v5.3 compliant) ✅
  subjective: text("subjective"), // S - Subjetivo (queixa, história)
  objective: text("objective"), // O - Objetivo (exame físico)
  assessment: text("assessment"), // A - Avaliação (diagnóstico)
  plan: text("plan"), // P - Plano (conduta)
  
  // Vital Signs (JSON as TEXT in SQLite) ✅
  vitalSigns: text("vital_signs", { mode: "json" }).$type<{
    bloodPressure?: string; // PA
    heartRate?: number; // FC
    temperature?: number; // Temperatura
    respiratoryRate?: number; // FR
    oxygenSaturation?: number; // SpO2
    weight?: number; // Peso
    height?: number; // Altura
    bmi?: number; // IMC
    abdominalCircumference?: number; // Circunferência abdominal
  }>(),
  
  // Diagnosis Codes (JSON Arrays as TEXT in SQLite) ✅
  ciap2Codes: text("ciap2_codes", { mode: "json" }).$type<string[]>(), // Códigos CIAP-2
  cid10Codes: text("cid10_codes", { mode: "json" }).$type<string[]>(), // Códigos CID-10
  
  // Legacy fields (mantidos para compatibilidade)
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  physicalExam: text("physical_exam"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatment_plan"),
  notes: text("notes"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// PHARMACY TABLES
// ============================================================================

// Medications (Medicamentos)
export const medications = sqliteTable("medications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  manufacturer: text("manufacturer"),
  presentation: text("presentation").notNull(),
  concentration: text("concentration"),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Medication Stock (Estoque de Medicamentos)
export const medicationStock = sqliteTable("medication_stock", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  medicationId: text("medication_id").notNull().references(() => medications.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  batchNumber: text("batch_number").notNull(),
  quantity: integer("quantity").notNull(),
  minStock: integer("min_stock").notNull().default(10),
  expirationDate: integer("expiration_date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Prescriptions (Receitas Médicas)
export const prescriptions = sqliteTable("prescriptions", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  consultationId: text("consultation_id").references(() => consultations.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions"),
  status: text("status", { enum: ["pending", "dispensed", "cancelled"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// EXAMS AND TFD TABLES
// ============================================================================

// Exams (Exames)
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  consultationId: text("consultation_id").references(() => consultations.id),
  examType: text("exam_type").notNull(),
  requestDate: integer("request_date", { mode: "timestamp" }).notNull(),
  resultDate: integer("result_date", { mode: "timestamp" }),
  status: text("status", { enum: ["requested", "scheduled", "completed", "cancelled"] }).notNull().default("requested"),
  result: text("result"),
  observations: text("observations"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// TFD Requests (Solicitações de Transporte Intermunicipal)
export const tfdRequests = sqliteTable("tfd_requests", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  requestDate: integer("request_date", { mode: "timestamp" }).notNull(),
  travelDate: integer("travel_date", { mode: "timestamp" }),
  returnDate: integer("return_date", { mode: "timestamp" }),
  destination: text("destination").notNull(),
  reason: text("reason").notNull(),
  procedure: text("procedure"),
  accompaniedBy: text("accompanied_by"),
  companion: integer("companion", { mode: "boolean" }).default(false),
  transportType: text("transport_type"),
  justification: text("justification"),
  status: text("status", { 
    enum: ["pending", "approved", "scheduled", "completed", "cancelled", "rejected"] 
  }).notNull().default("pending"),
  observations: text("observations"),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// TERRITORIAL MANAGEMENT TABLES (e-SUS Território)
// ============================================================================

// Dwellings (Domicílios)
export const dwellings = sqliteTable("dwellings", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  microarea: text("microarea").notNull(),
  address: text("address").notNull(),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  zipCode: text("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  dwellingType: text("dwelling_type", { 
    enum: ["casa", "apartamento", "comodo", "outro"] 
  }).notNull().default("casa"),
  sanitation: text("sanitation", { 
    enum: ["rede_esgoto", "fossa_septica", "ceu_aberto", "outro"] 
  }),
  waterSupply: text("water_supply", { 
    enum: ["rede_publica", "poco", "cisterna", "outro"] 
  }),
  hasElectricity: integer("has_electricity", { mode: "boolean" }).default(true),
  hasAnimals: integer("has_animals", { mode: "boolean" }).default(false),
  familiesCount: integer("families_count").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Families (Famílias)
export const families = sqliteTable("families", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  dwellingId: text("dwelling_id").notNull().references(() => dwellings.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  familyCode: text("family_code").notNull(),
  headOfFamilyId: text("head_of_family_id").references(() => citizens.id),
  monthlyIncome: real("monthly_income"),
  benefitsReceived: text("benefits_received"),
  membersCount: integer("members_count").default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Family Members (Membros da Família) - Relationship tracking
export const familyMembers = sqliteTable("family_members", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  citizenId: text("citizen_id").notNull().references(() => citizens.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type", {
    enum: ["responsavel_familiar", "conjuge", "filho", "neto", "pai_mae", "avo", "irmao", "outro"]
  }).notNull().default("outro"),
  isHeadOfFamily: integer("is_head_of_family", { mode: "boolean" }).default(false).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  leftAt: integer("left_at", { mode: "timestamp" }),
  notes: text("notes"),
});

// Home Visits (Visitas Domiciliares)
export const homeVisits = sqliteTable("home_visits", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  dwellingId: text("dwelling_id").notNull().references(() => dwellings.id),
  familyId: text("family_id").references(() => families.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  visitDate: integer("visit_date", { mode: "timestamp" }).notNull(),
  visitType: text("visit_type", { 
    enum: ["rotina", "busca_ativa", "acompanhamento", "urgencia"] 
  }).notNull(),
  visitMotive: text("visit_motive", { 
    enum: ["gestante", "crianca", "idoso", "doenca_cronica", "controle_ambiental", "outro"] 
  }),
  findings: text("findings"),
  actions: text("actions"),
  referrals: text("referrals"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// e-SUS EXPORT TABLES
// ============================================================================

// e-SUS Exports (Exportações e-SUS)
export const esusExports = sqliteTable("esus_exports", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  batchId: text("batch_id"),
  cnes: text("cnes").notNull(),
  ine: text("ine"),
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
  recordsCount: integer("records_count").notNull(),
  fileSize: integer("file_size").notNull(),
  jsonPath: text("json_path"),
  xmlPath: text("xml_path"),
  status: text("status", { enum: ["processing", "completed", "failed"] }).notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ============================================================================
// ENDEMIC CONTROL TABLES (Controle de Endemias)
// ============================================================================

// Endemic Cycles (Ciclos de Trabalho - LIRAa, PVE)
export const endemicCycles = sqliteTable("endemic_cycles", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  name: text("name").notNull(), // Ex: "LIRAa Outubro 2025"
  cycleType: text("cycle_type", {
    enum: ["liraa", "pve", "rotina", "bloqueio"]
  }).notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  targetMicroareas: text("target_microareas").notNull(), // JSON array of microarea codes
  status: text("status", {
    enum: ["planned", "in_progress", "completed", "cancelled"]
  }).notNull().default("planned"),
  totalDwellings: integer("total_dwellings").default(0),
  visitedDwellings: integer("visited_dwellings").default(0),
  fociFound: integer("foci_found").default(0),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// FAD - Ficha de Avaliação de Densidade
export const fadEvaluations = sqliteTable("fad_evaluations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  cycleId: text("cycle_id").notNull().references(() => endemicCycles.id),
  dwellingId: text("dwelling_id").notNull().references(() => dwellings.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  visitDate: integer("visit_date", { mode: "timestamp" }).notNull(),
  dwellingInspected: integer("dwelling_inspected", { mode: "boolean" }).notNull().default(true),
  dwellingClosed: integer("dwelling_closed", { mode: "boolean" }).default(false),
  dwellingRefused: integer("dwelling_refused", { mode: "boolean" }).default(false),
  residentsCount: integer("residents_count"),
  containersInspected: integer("containers_inspected").default(0),
  containersWithLarvae: integer("containers_with_larvae").default(0),
  containersEliminated: integer("containers_eliminated").default(0),
  larvicideApplied: integer("larvicide_applied", { mode: "boolean" }).default(false),
  larvicideType: text("larvicide_type"), // Ex: "Bti", "Pyriproxyfen"
  observations: text("observations"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Foci / Criadouros (Breeding Sites)
export const foci = sqliteTable("foci", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  fadId: text("fad_id").notNull().references(() => fadEvaluations.id),
  dwellingId: text("dwelling_id").notNull().references(() => dwellings.id),
  depositType: text("deposit_type", {
    enum: ["A1", "A2", "B", "C", "D1", "D2", "E"]
  }).notNull(),
  depositDescription: text("deposit_description").notNull(), // Ex: "Caixa d'água", "Pneu"
  larvaeFound: integer("larvae_found", { mode: "boolean" }).notNull().default(true),
  pupaeFound: integer("pupae_found", { mode: "boolean" }).default(false),
  actionTaken: text("action_taken", {
    enum: ["elimination", "treatment", "protection", "education"]
  }).notNull(),
  larvicideApplied: text("larvicide_applied"), // Tipo de larvicida
  quantity: integer("quantity").default(1), // Quantidade de depósitos
  latitude: real("latitude"),
  longitude: real("longitude"),
  photoUrl: text("photo_url"), // URL da foto do foco
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Focal Treatments (Tratamentos Focais)
export const focalTreatments = sqliteTable("focal_treatments", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  cycleId: text("cycle_id").references(() => endemicCycles.id),
  dwellingId: text("dwelling_id").notNull().references(() => dwellings.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  treatmentDate: integer("treatment_date", { mode: "timestamp" }).notNull(),
  treatmentType: text("treatment_type", {
    enum: ["perifocal", "focal", "nebulizacao", "bloqueio"]
  }).notNull(),
  productUsed: text("product_used").notNull(), // Ex: "Malathion", "Deltametrina"
  dosage: text("dosage"), // Ex: "50ml/m²"
  targetArea: real("target_area"), // Área tratada em m²
  containersCount: integer("containers_count").default(0),
  reinspectionDate: integer("reinspection_date", { mode: "timestamp" }),
  reinspected: integer("reinspected", { mode: "boolean" }).default(false),
  effectiveness: text("effectiveness", {
    enum: ["effective", "partially_effective", "ineffective", "pending"]
  }).default("pending"),
  observations: text("observations"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// AI Audit Logs (Registros de Auditoria de IA para Compliance Médico)
export const aiAuditLogs = sqliteTable("ai_audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  operation: text("operation", {
    enum: ["diagnose", "drug_interactions", "validate_prescription", "generate_care_plan"]
  }).notNull(),
  inputData: text("input_data", { mode: "json" }), // Dados de entrada (JSON)
  success: integer("success", { mode: "boolean" }).notNull(),
  errorCode: text("error_code"), // ID de correlação de erro
  errorMessage: text("error_message"), // Mensagem de erro (se houver)
  completionTokens: integer("completion_tokens"), // Tokens usados pela IA
  latencyMs: integer("latency_ms"), // Latência em milissegundos
  citizenId: text("citizen_id"), // ID do cidadão (se aplicável)
  consultationId: text("consultation_id"), // ID da consulta (se aplicável)
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// INSERT SCHEMAS (Zod Validation)
// ============================================================================

export const insertHealthUnitSchema = createInsertSchema(healthUnits).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProfessionalSchema = createInsertSchema(professionals).omit({
  id: true,
  createdAt: true,
});

export const insertCitizenSchema = createInsertSchema(citizens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceQueueSchema = createInsertSchema(attendanceQueue).omit({
  id: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationStockSchema = createInsertSchema(medicationStock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
});

export const insertTfdRequestSchema = createInsertSchema(tfdRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDwellingSchema = createInsertSchema(dwellings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomeVisitSchema = createInsertSchema(homeVisits).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  joinedAt: true,
});

// e-SUS Export Insert Schema
export const insertEsusExportSchema = createInsertSchema(esusExports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Endemic Control Insert Schemas
export const insertEndemicCycleSchema = createInsertSchema(endemicCycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFadEvaluationSchema = createInsertSchema(fadEvaluations).omit({
  id: true,
  createdAt: true,
});

export const insertFocusSchema = createInsertSchema(foci).omit({
  id: true,
  createdAt: true,
});

export const insertFocalTreatmentSchema = createInsertSchema(focalTreatments).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// ACE MODULE TABLES (Agente de Combate a Endemias)
// ============================================================================

// ACE Dwellings (Imóveis ACE)
export const aceDwellings = sqliteTable("ace_dwellings", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  externalId: text("external_id").unique(),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  microarea: text("microarea"),
  street: text("street").notNull(),
  number: text("number"),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  dwellingType: text("dwelling_type"),
  sanitation: text("sanitation"),
  waterSupply: text("water_supply"),
  hasElectricity: integer("has_electricity", { mode: "boolean" }).default(true).notNull(),
  hasAnimals: integer("has_animals", { mode: "boolean" }).default(false).notNull(),
  animalTypes: text("animal_types", { mode: "json" }).$type<string[]>().default(sql`'[]'`).notNull(),
  householdMembers: integer("household_members").default(0).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ACE Visits (Visitas ACE)
export const aceVisits = sqliteTable("ace_visits", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  externalId: text("external_id").unique(),
  dwellingId: text("dwelling_id").notNull().references(() => aceDwellings.id, { onDelete: "cascade" }),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  visitDate: integer("visit_date", { mode: "timestamp" }).notNull(),
  visitType: text("visit_type"),
  visitMotive: text("visit_motive"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  temperature: real("temperature"),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  bloodGlucose: integer("blood_glucose"),
  weight: real("weight"),
  height: real("height"),
  observations: text("observations"),
  findings: text("findings", { mode: "json" }).$type<Record<string, any>>().default(sql`'{}'`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ACE Foci (Focos Vetoriais)
export const aceFoci = sqliteTable("ace_foci", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  visitId: text("visit_id").notNull().references(() => aceVisits.id, { onDelete: "cascade" }),
  dwellingId: text("dwelling_id").notNull().references(() => aceDwellings.id, { onDelete: "cascade" }),
  fociType: text("foci_type").notNull(),
  locationDescription: text("location_description"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  quantity: integer("quantity").default(1).notNull(),
  actionTaken: text("action_taken"),
  status: text("status", { enum: ["active", "resolved", "monitoring"] }).default("active").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});

// ACE Audit Logs (Logs de Auditoria ACE)
export const aceAuditLogs = sqliteTable("ace_audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  userId: text("user_id").references(() => users.id),
  changes: text("changes", { mode: "json" }).$type<Record<string, any>>().default(sql`'{}'`).notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>().default(sql`'{}'`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ACE Insert Schemas
export const insertAceDwellingSchema = createInsertSchema(aceDwellings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAceVisitSchema = createInsertSchema(aceVisits).omit({
  id: true,
  createdAt: true,
});

export const insertAceFocusSchema = createInsertSchema(aceFoci).omit({
  id: true,
  createdAt: true,
});

export const insertAceAuditLogSchema = createInsertSchema(aceAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// ============================================================================
// TYPES
// ============================================================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertHealthUnit = z.infer<typeof insertHealthUnitSchema>;
export type HealthUnit = typeof healthUnits.$inferSelect;

export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionals.$inferSelect;

export type InsertCitizen = z.infer<typeof insertCitizenSchema>;
export type Citizen = typeof citizens.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertAttendanceQueue = z.infer<typeof insertAttendanceQueueSchema>;
export type AttendanceQueue = typeof attendanceQueue.$inferSelect;

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export type InsertMedicationStock = z.infer<typeof insertMedicationStockSchema>;
export type MedicationStock = typeof medicationStock.$inferSelect;

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

export type InsertTfdRequest = z.infer<typeof insertTfdRequestSchema>;
export type TfdRequest = typeof tfdRequests.$inferSelect;

export type InsertDwelling = z.infer<typeof insertDwellingSchema>;
export type Dwelling = typeof dwellings.$inferSelect;

export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

export type InsertHomeVisit = z.infer<typeof insertHomeVisitSchema>;
export type HomeVisit = typeof homeVisits.$inferSelect;

export type InsertEsusExport = z.infer<typeof insertEsusExportSchema>;
export type EsusExport = typeof esusExports.$inferSelect;

export type InsertEndemicCycle = z.infer<typeof insertEndemicCycleSchema>;
export type EndemicCycle = typeof endemicCycles.$inferSelect;

export type InsertFadEvaluation = z.infer<typeof insertFadEvaluationSchema>;
export type FadEvaluation = typeof fadEvaluations.$inferSelect;

export type InsertFocus = z.infer<typeof insertFocusSchema>;
export type Focus = typeof foci.$inferSelect;

export type InsertFocalTreatment = z.infer<typeof insertFocalTreatmentSchema>;
export type FocalTreatment = typeof focalTreatments.$inferSelect;

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;
export type AiAuditLog = typeof aiAuditLogs.$inferSelect;

// ACE Module Types
export type InsertAceDwelling = z.infer<typeof insertAceDwellingSchema>;
export type AceDwelling = typeof aceDwellings.$inferSelect;

export type InsertAceVisit = z.infer<typeof insertAceVisitSchema>;
export type AceVisit = typeof aceVisits.$inferSelect;

export type InsertAceFocus = z.infer<typeof insertAceFocusSchema>;
export type AceFocus = typeof aceFoci.$inferSelect;

export type InsertAceAuditLog = z.infer<typeof insertAceAuditLogSchema>;
export type AceAuditLog = typeof aceAuditLogs.$inferSelect;
