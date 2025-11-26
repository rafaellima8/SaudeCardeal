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
  cboCode: text("cbo_code"), // CBO (Código Brasileiro de Ocupação) - OBRIGATÓRIO e-SUS SISAB
  phone: text("phone"),
  email: text("email"),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  teamINE: text("team_ine"), // Identificador Nacional de Equipes (10 dígitos CNES)
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Citizens/Patients (Cidadãos/Pacientes) - Conforme e-SUS PEC v5.3
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
  phoneSecondary: text("phone_secondary"),
  email: text("email"),
  responsibleName: text("responsible_name"),
  responsiblePhone: text("responsible_phone"),
  address: text("address").notNull(),
  addressNumber: text("address_number"),
  addressComplement: text("address_complement"),
  neighborhood: text("neighborhood"),
  city: text("city").notNull().default("Cardeal da Silva"),
  state: text("state").notNull().default("BA"),
  zipCode: text("zip_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  bloodType: text("blood_type", { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "desconhecido"] }),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  observations: text("observations"),
  photoUrl: text("photo_url"),
  microarea: text("microarea"),
  familyId: text("family_id").references(() => families.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  cadsusSync: integer("cadsus_sync", { mode: "boolean" }).default(false),
  cadsusSyncAt: integer("cadsus_sync_at", { mode: "timestamp" }),
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

// Attendance Queue (Fila de Atendimento) - COM LINHA DE CUIDADO ✅
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
  consultationId: text("consultation_id").references(() => consultations.id), // Vincula fila ao atendimento médico
  professionalId: text("professional_id").references(() => professionals.id), // Profissional que chamou o paciente
  careLineId: text("care_line_id").references(() => careLines.id), // Linha de cuidado para encaninhamento inteligente
  referralReason: text("referral_reason"), // Motivo do encaminhamento (para triagem especializada)
  clinicalRisk: text("clinical_risk", { enum: ["baixo", "medio", "alto"] }), // Classificação de risco clínico
});

// Nursing Triage (Triagem de Enfermagem) - Etapa obrigatória antes da consulta médica
export const nursingTriage = sqliteTable("nursing_triage", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  queueEntryId: text("queue_entry_id").notNull().references(() => attendanceQueue.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  nurseId: text("nurse_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  triageDate: integer("triage_date", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  
  // Manchester Triage Classification (Protocolo de Manchester)
  riskClassification: text("risk_classification", { 
    enum: ["emergencia", "muito_urgente", "urgente", "pouco_urgente", "nao_urgente"] 
  }).notNull(),
  riskColor: text("risk_color", { 
    enum: ["vermelho", "laranja", "amarelo", "verde", "azul"] 
  }).notNull(),
  
  // Chief Complaint
  chiefComplaint: text("chief_complaint").notNull(),
  symptomDuration: text("symptom_duration"),
  painScale: integer("pain_scale"),
  
  // Vital Signs
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  temperature: real("temperature"),
  oxygenSaturation: integer("oxygen_saturation"),
  bloodGlucose: integer("blood_glucose"),
  weight: real("weight"),
  height: real("height"),
  
  // Anthropometric (calculated)
  bmi: real("bmi"),
  
  // Glasgow Scale (for emergency cases)
  glasgowScore: integer("glasgow_score"),
  
  // Nursing Notes
  observations: text("observations"),
  nursingDiagnosis: text("nursing_diagnosis"),
  
  // Allergies/Alerts confirmed at triage
  allergiesConfirmed: text("allergies_confirmed"),
  
  // Status
  status: text("status", { enum: ["completed", "pending_medical", "cancelled"] }).notNull().default("completed"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Consultations (Consultas Médicas) - COM CAMPOS SOAP COMPLETOS ✅
export const consultations = sqliteTable("consultations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  appointmentId: text("appointment_id").references(() => appointments.id),
  consultationDate: integer("consultation_date", { mode: "timestamp" }).notNull(),
  
  // Dynamic Forms - Care Line Assignment
  careLineId: text("care_line_id").references(() => careLines.id),
  
  // e-SUS PEC Attendance Type (replaces legacy 'type') ✅
  attendanceType: text("attendance_type", { 
    enum: ["consulta", "procedimento", "vacina", "visita_domiciliar", "grupo", "atendimento_odonto"] 
  }).notNull().default("consulta"), // Tipo de atendimento
  
  type: text("type"), // DEPRECATED - Mantido para compatibilidade, usar attendanceType
  
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
  
  // e-SUS PEC Additional Fields (Atendimento Individual) ✅
  allergies: text("allergies", { mode: "json" }).$type<string[]>(), // Lista de alergias
  chronicConditions: text("chronic_conditions", { mode: "json" }).$type<string[]>(), // Problemas crônicos
  
  familyHistory: text("family_history"), // História familiar
  socialHistory: text("social_history"), // História social (tabagismo, etilismo, etc)
  
  prescriptionRationale: text("prescription_rationale"), // Racionalização de medicamento (e-SUS PEC)
  
  // Legacy fields (mantidos para compatibilidade)
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  physicalExam: text("physical_exam"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatment_plan"),
  notes: text("notes"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Citizen Problems/Conditions (Problemas/Condições do Cidadão - CIAP-2) ✅
export const citizenProblems = sqliteTable("citizen_problems", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id, { onDelete: "cascade" }),
  unitId: text("unit_id").notNull().references(() => healthUnits.id), // Multi-tenant safety ✅
  ciap2Code: text("ciap2_code").notNull(), // Código CIAP-2
  description: text("description").notNull(), // Descrição do problema
  status: text("status", { 
    enum: ["active", "resolved", "controlled"] 
  }).notNull().default("active"), // Ativo, Resolvido, Controlado
  diagnosedAt: integer("diagnosed_at", { mode: "timestamp" }).notNull(), // Data do diagnóstico
  notes: text("notes"), // Observações
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
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
  unitId: text("unit_id").notNull().references(() => healthUnits.id), // Multi-tenant safety ✅
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions"),
  status: text("status", { enum: ["pending", "dispensed", "cancelled"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Medication Dispensations (Dispensações de Medicamentos) ✅
export const dispensations = sqliteTable("dispensations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  prescriptionId: text("prescription_id").notNull().references(() => prescriptions.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id), // Profissional que dispensou
  unitId: text("unit_id").notNull().references(() => healthUnits.id), // Multi-tenant safety ✅
  medication: text("medication").notNull(),
  quantity: integer("quantity").notNull(),
  dispensedAt: integer("dispensed_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Dispensation = typeof dispensations.$inferSelect;
export const insertDispensationSchema = createInsertSchema(dispensations).omit({ id: true, createdAt: true });
export type InsertDispensation = z.infer<typeof insertDispensationSchema>;

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

// Medical Referrals (Encaminhamentos Médicos) - COM SUGESTÃO INTELIGENTE ✅
export const medicalReferrals = sqliteTable("medical_referrals", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  consultationId: text("consultation_id").references(() => consultations.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  destination: text("destination").notNull(),
  specialty: text("specialty"), // LEGACY: Texto livre, mantido para compatibilidade
  
  // Encaminhamento Inteligente - Sugestão de Especialidade ✅
  suggestedSpecialtyId: text("suggested_specialty_id").references(() => specialties.id), // Especialidade sugerida pelo motor
  chosenSpecialtyId: text("chosen_specialty_id").references(() => specialties.id), // Especialidade escolhida pelo médico
  suggestionScore: integer("suggestion_score"), // Score da sugestão (0-100)
  suggestionJustification: text("suggestion_justification"), // Justificativa textual da sugestão
  hypothesisDiagnosis: text("hypothesis_diagnosis"), // Hipótese diagnóstica (texto ou CID)
  cidCode: text("cid_code"), // Código CID-10 da hipótese diagnóstica
  complementaryData: text("complementary_data", { mode: "json" }).$type<{
    alarmSigns?: {
      fever?: boolean;
      weightLoss?: boolean;
      bleeding?: boolean;
      recentTrauma?: boolean;
      severeHeadache?: boolean;
      dyspnea?: boolean;
    };
    attendanceType?: "acute" | "chronic" | "followup" | "emergency";
    patientAge?: number;
    patientGender?: string;
  }>(), // Dados complementares para refinamento da sugestão
  
  reason: text("reason").notNull(),
  priority: text("priority", { enum: ["normal", "urgent", "emergency"] }).notNull().default("normal"),
  status: text("status", { 
    enum: ["pending", "scheduled", "in_progress", "completed", "cancelled"] 
  }).notNull().default("pending"),
  referralDate: integer("referral_date", { mode: "timestamp" }).notNull(),
  scheduledDate: integer("scheduled_date", { mode: "timestamp" }),
  completedDate: integer("completed_date", { mode: "timestamp" }),
  observations: text("observations"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
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

// SIGTAP Code Mappings (Mapeamento de Códigos SIGTAP)
// Mapeia tipos de procedimentos/exames internos para códigos SIGTAP oficiais
export const sigtapMappings = sqliteTable("sigtap_mappings", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  internalCode: text("internal_code").notNull().unique(), // Código interno do sistema (ex: "consulta_medica_demanda_espontanea")
  sigtapCode: text("sigtap_code").notNull(), // Código SIGTAP (ex: "0301010039")
  description: text("description").notNull(), // Descrição do procedimento
  category: text("category", { 
    enum: ["consultation", "procedure", "exam", "vaccine", "other"] 
  }).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
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

// Notifications (Sistema de Notificações)
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").references(() => users.id), // null = notificação para toda unidade
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  type: text("type", {
    enum: ["clinical_alert", "prescription_ready", "stock_low", "exam_result", "referral_update", "appointment_reminder", "system", "tfd_update"]
  }).notNull(),
  priority: text("priority", {
    enum: ["low", "medium", "high", "critical"]
  }).notNull().default("medium"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"), // Ex: "consultation", "prescription"
  entityId: text("entity_id"),
  actionUrl: text("action_url"),
  metadata: text("metadata", { mode: "json" }),
  readAt: integer("read_at", { mode: "timestamp" }),
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Document Signatures (Assinaturas Digitais)
export const documentSignatures = sqliteTable("document_signatures", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  documentType: text("document_type", {
    enum: ["prescription", "certificate", "referral", "exam_request", "consultation"]
  }).notNull(),
  documentId: text("document_id").notNull(),
  signerId: text("signer_id").notNull().references(() => professionals.id),
  signerName: text("signer_name").notNull(),
  signerCredentials: text("signer_credentials"), // CRM, CNS, etc
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  hash: text("hash").notNull(),
  signature: text("signature").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  validationCode: text("validation_code").notNull().unique(),
  version: text("version").notNull().default("1.0"),
  algorithm: text("algorithm").notNull().default("RSA-SHA256"),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  revokedReason: text("revoked_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Medical Certificates (Atestados Médicos)
export const medicalCertificates = sqliteTable("medical_certificates", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  consultationId: text("consultation_id").notNull().references(() => consultations.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  certificateType: text("certificate_type", {
    enum: ["trabalho", "escola", "acompanhante", "comparecimento", "aptidao", "outros"]
  }).notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  daysCount: integer("days_count").notNull(),
  reason: text("reason"),
  cid10Code: text("cid10_code"),
  observations: text("observations"),
  signatureId: text("signature_id").references(() => documentSignatures.id),
  printedAt: integer("printed_at", { mode: "timestamp" }),
  status: text("status", {
    enum: ["draft", "signed", "printed", "cancelled"]
  }).notNull().default("draft"),
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

export const insertNursingTriageSchema = createInsertSchema(nursingTriage).omit({
  id: true,
  createdAt: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
});

export const insertCitizenProblemSchema = createInsertSchema(citizenProblems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertMedicalReferralSchema = createInsertSchema(medicalReferrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// SIGTAP Mapping Insert Schema
export const insertSigtapMappingSchema = createInsertSchema(sigtapMappings).omit({
  id: true,
  createdAt: true,
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

// Medical Records Audit Logs (Auditoria de Acesso a Prontuários - LGPD Compliance)
export const medicalRecordsAuditLogs = sqliteTable("medical_records_audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  userId: text("user_id").notNull().references(() => users.id),
  professionalId: text("professional_id").references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  action: text("action", { 
    enum: ["view", "create", "update", "delete", "print", "export", "share"] 
  }).notNull(),
  entityType: text("entity_type", { 
    enum: ["consultation", "prescription", "exam", "referral", "certificate", "triage", "history", "full_record"] 
  }).notNull(),
  entityId: text("entity_id"),
  accessReason: text("access_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  sensitiveDataAccessed: integer("sensitive_data_accessed", { mode: "boolean" }).default(false).notNull(),
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

export const insertMedicalRecordsAuditLogSchema = createInsertSchema(medicalRecordsAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// ============================================================================
// SPECIALTY & CARE LINES MANAGEMENT (Dynamic Forms System)
// ============================================================================

// Specialties (Especialidades Médicas)
export const specialties = sqliteTable("specialties", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull().unique(), // "Endocrinologia", "Pediatria", etc
  code: text("code").notNull().unique(), // "ENDO", "PEDI", etc
  slug: text("slug").notNull().unique(), // "endocrino", "pediatria", etc (para matching)
  description: text("description"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Referral Rules (Regras de Encaminhamento Inteligente)
// Motor rule-based para sugestão automática de especialidades
export const referralRules = sqliteTable("referral_rules", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  specialtyId: text("specialty_id").notNull().references(() => specialties.id, { onDelete: "cascade" }),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(), // ["diabetes", "hipotireoidismo", "tireoide"]
  cidCodes: text("cid_codes", { mode: "json" }).$type<string[]>(), // ["E11", "E03"] - códigos CID relacionados
  ciapCodes: text("ciap_codes", { mode: "json" }).$type<string[]>(), // Códigos CIAP-2 relacionados
  baseWeight: integer("base_weight").notNull().default(10), // Peso base para cálculo de score
  cidWeight: integer("cid_weight").notNull().default(20), // Peso adicional para match de CID
  observations: text("observations"), // Notas sobre a regra
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Care Lines (Linhas de Cuidado - transversais a especialidades)
export const careLines = sqliteTable("care_lines", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "Diabetes", "Pré-natal", "Hipertensão"
  code: text("code").notNull(), // REMOVED .unique() - allowing per-unit duplicates
  description: text("description"),
  specialtyId: text("specialty_id").references(() => specialties.id), // Opcional
  unitId: text("unit_id").notNull().references(() => healthUnits.id), // SECURITY: Multi-tenant isolation
  priority: integer("priority").default(0), // For specialty fallback ordering
  riskStratification: integer("risk_stratification", { mode: "boolean" }).default(false),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Consultation Templates (Modelos de Formulário)
export const consultationTemplates = sqliteTable("consultation_templates", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "Consulta Pré-natal", "Puericultura"
  specialtyId: text("specialty_id").references(() => specialties.id),
  careLineId: text("care_line_id").references(() => careLines.id),
  description: text("description"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Template Fields (Campos Dinâmicos do Formulário)
export const templateFields = sqliteTable("template_fields", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  templateId: text("template_id").notNull().references(() => consultationTemplates.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(), // "peso", "ig_semanas", "hba1c"
  fieldLabel: text("field_label").notNull(), // "Peso (kg)", "Idade Gestacional"
  fieldType: text("field_type", { 
    enum: ["text", "number", "date", "select", "checkbox", "textarea", "range"] 
  }).notNull(),
  fieldOptions: text("field_options", { mode: "json" }).$type<string[]>(), // Para select/checkbox
  required: integer("required", { mode: "boolean" }).default(false).notNull(),
  order: integer("order").notNull(), // Ordem de exibição
  validationRules: text("validation_rules", { mode: "json" }).$type<{
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  }>(),
  helperText: text("helper_text"), // Texto de ajuda
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Consultation Field Data (Dados Preenchidos do Formulário Dinâmico)
export const consultationFieldData = sqliteTable("consultation_field_data", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  consultationId: text("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  fieldId: text("field_id").notNull().references(() => templateFields.id),
  fieldValue: text("field_value"), // Armazena qualquer tipo como string/JSON
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Clinical Protocols (Protocolos Clínicos - Alertas Automáticos)
export const clinicalProtocols = sqliteTable("clinical_protocols", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "HbA1c descompensada", "VDRL pendente"
  careLineId: text("care_line_id").references(() => careLines.id),
  specialtyId: text("specialty_id").references(() => specialties.id),
  triggerCondition: text("trigger_condition", { mode: "json" }).$type<{
    field: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains";
    value: any;
  }[]>(), // Condições para disparar alerta
  alertMessage: text("alert_message").notNull(),
  alertLevel: text("alert_level", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  action: text("action", { mode: "json" }).$type<{
    type: "notify" | "auto_referral" | "schedule_followup";
    target?: string;
    days?: number;
  }>(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Therapeutic Plans (Planos Terapêuticos Compartilhados)
export const therapeuticPlans = sqliteTable("therapeutic_plans", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id, { onDelete: "cascade" }),
  careLineId: text("care_line_id").references(() => careLines.id),
  title: text("title").notNull(), // "Plano de cuidado - Diabetes tipo 2"
  objective: text("objective"), // Objetivo terapêutico
  status: text("status", { enum: ["active", "completed", "suspended"] }).notNull().default("active"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  createdBy: text("created_by").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Therapeutic Plan Items (Itens/Tarefas do Plano Terapêutico)
export const therapeuticPlanItems = sqliteTable("therapeutic_plan_items", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  planId: text("plan_id").notNull().references(() => therapeuticPlans.id, { onDelete: "cascade" }),
  description: text("description").notNull(), // "Acompanhamento nutricional mensal"
  responsibleProfessionalId: text("responsible_professional_id").references(() => professionals.id),
  responsibleSpecialty: text("responsible_specialty"), // "Nutricionista", "Psicólogo"
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).notNull().default("pending"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  completedDate: integer("completed_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Care Line Diagnoses Mapping - Automatic care line detection via diagnosis codes
export const careLineDiagnoses = sqliteTable("care_line_diagnoses", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  careLineId: text("care_line_id").notNull().references(() => careLines.id, { onDelete: "cascade" }),
  diagnosisType: text("diagnosis_type", { enum: ["ciap2" as const, "cid10" as const] }).notNull(),
  diagnosisCode: text("diagnosis_code").notNull(), // "W78", "O11", "E10", etc
  priority: integer("priority").default(0), // Higher priority = preferred match
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Care Line Triggers - Events that auto-assign care lines
export const careLineTriggers = sqliteTable("care_line_triggers", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  careLineId: text("care_line_id").notNull().references(() => careLines.id, { onDelete: "cascade" }),
  triggerType: text("trigger_type", { 
    enum: ["problem", "procedure", "medication", "exam", "age_range", "gender", "appointment_specialty"] 
  }).notNull(),
  triggerValue: text("trigger_value").notNull(), // JSON with trigger criteria
  priority: integer("priority").default(0),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Insert Schemas for new tables
export const insertSpecialtySchema = createInsertSchema(specialties).omit({
  id: true,
  createdAt: true,
});

export const insertReferralRuleSchema = createInsertSchema(referralRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareLineSchema = createInsertSchema(careLines).omit({
  id: true,
  createdAt: true,
});

export const insertConsultationTemplateSchema = createInsertSchema(consultationTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateFieldSchema = createInsertSchema(templateFields).omit({
  id: true,
  createdAt: true,
});

export const insertConsultationFieldDataSchema = createInsertSchema(consultationFieldData).omit({
  id: true,
  createdAt: true,
});

export const insertClinicalProtocolSchema = createInsertSchema(clinicalProtocols).omit({
  id: true,
  createdAt: true,
});

export const insertTherapeuticPlanSchema = createInsertSchema(therapeuticPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTherapeuticPlanItemSchema = createInsertSchema(therapeuticPlanItems).omit({
  id: true,
  createdAt: true,
});

export const insertCareLineDiagnosisSchema = createInsertSchema(careLineDiagnoses).omit({
  id: true,
  createdAt: true,
});

export const insertCareLineTriggerSchema = createInsertSchema(careLineTriggers).omit({
  id: true,
  createdAt: true,
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

export type InsertNursingTriage = z.infer<typeof insertNursingTriageSchema>;
export type NursingTriage = typeof nursingTriage.$inferSelect;

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

export type InsertCitizenProblem = z.infer<typeof insertCitizenProblemSchema>;
export type CitizenProblem = typeof citizenProblems.$inferSelect;

export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export type InsertMedicationStock = z.infer<typeof insertMedicationStockSchema>;
export type MedicationStock = typeof medicationStock.$inferSelect;

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

export type InsertMedicalReferral = z.infer<typeof insertMedicalReferralSchema>;
export type MedicalReferral = typeof medicalReferrals.$inferSelect;

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

export type InsertSigtapMapping = z.infer<typeof insertSigtapMappingSchema>;
export type SigtapMapping = typeof sigtapMappings.$inferSelect;

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

export type InsertMedicalRecordsAuditLog = z.infer<typeof insertMedicalRecordsAuditLogSchema>;
export type MedicalRecordsAuditLog = typeof medicalRecordsAuditLogs.$inferSelect;

// Dynamic Forms System Types
export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;
export type Specialty = typeof specialties.$inferSelect;

export type InsertReferralRule = z.infer<typeof insertReferralRuleSchema>;
export type ReferralRule = typeof referralRules.$inferSelect;

export type InsertCareLine = z.infer<typeof insertCareLineSchema>;
export type CareLine = typeof careLines.$inferSelect;

export type InsertConsultationTemplate = z.infer<typeof insertConsultationTemplateSchema>;
export type ConsultationTemplate = typeof consultationTemplates.$inferSelect;

export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type TemplateField = typeof templateFields.$inferSelect;

export type InsertConsultationFieldData = z.infer<typeof insertConsultationFieldDataSchema>;
export type ConsultationFieldData = typeof consultationFieldData.$inferSelect;

export type InsertClinicalProtocol = z.infer<typeof insertClinicalProtocolSchema>;
export type ClinicalProtocol = typeof clinicalProtocols.$inferSelect;

export type InsertTherapeuticPlan = z.infer<typeof insertTherapeuticPlanSchema>;
export type TherapeuticPlan = typeof therapeuticPlans.$inferSelect;

export type InsertTherapeuticPlanItem = z.infer<typeof insertTherapeuticPlanItemSchema>;
export type TherapeuticPlanItem = typeof therapeuticPlanItems.$inferSelect;

export type CareLineDiagnosis = typeof careLineDiagnoses.$inferSelect;
export type InsertCareLineDiagnosis = z.infer<typeof insertCareLineDiagnosisSchema>;

export type CareLineTrigger = typeof careLineTriggers.$inferSelect;
export type InsertCareLineTrigger = z.infer<typeof insertCareLineTriggerSchema>;

// Stock Movement Validation Schemas (for API validation)
export const stockMovementSchema = z.object({
  medicationId: z.string().uuid(),
  unitId: z.string().uuid(),
  movementType: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.number().int().positive(), // Always positive in schema, route handles negation for saida
  batchNumber: z.string().min(1).optional(), // Optional for adjustments/outputs
  expirationDate: z.coerce.date().optional(), // Optional for adjustments/outputs
  reason: z.string().min(1), // Required for audit purposes
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

// ============================================================================
// SPECIALTY SUGGESTION ENGINE SCHEMAS
// ============================================================================

// Input schema para sugestão de especialidade
export const specialtySuggestionInputSchema = z.object({
  motivoEncaminhamento: z.string().min(1, "Motivo do encaminhamento é obrigatório"),
  hipoteseDiagnostica: z.string().optional(),
  cid: z.string().optional(),
  dadosComplementares: z.object({
    sinaisAlarme: z.object({
      perdaPeso: z.boolean().optional(),
      febre: z.boolean().optional(),
      traumaRecente: z.boolean().optional(),
      sangramento: z.boolean().optional(),
      cefaleiaSevera: z.boolean().optional(),
      dispneia: z.boolean().optional(),
    }).optional(),
    tipoAtendimento: z.enum(["agudo", "cronico", "acompanhamento", "emergencia"]).optional(),
    idadePaciente: z.number().optional(),
    generoPaciente: z.string().optional(),
  }).optional(),
});

export type SpecialtySuggestionInput = z.infer<typeof specialtySuggestionInputSchema>;

// Output schema para sugestão de especialidade
export const specialtySuggestionOutputSchema = z.object({
  especialidadeId: z.string(),
  nome: z.string(),
  slug: z.string(),
  score: z.number(),
  justificativa: z.string(),
});

export type SpecialtySuggestion = z.infer<typeof specialtySuggestionOutputSchema>;

// Complementary data type for referral
export type ReferralComplementaryData = {
  alarmSigns?: {
    fever?: boolean;
    weightLoss?: boolean;
    bleeding?: boolean;
    recentTrauma?: boolean;
    severeHeadache?: boolean;
    dyspnea?: boolean;
  };
  attendanceType?: "acute" | "chronic" | "followup" | "emergency";
  patientAge?: number;
  patientGender?: string;
};

