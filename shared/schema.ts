import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const generateId = () => crypto.randomUUID();

// ============================================================================
// CORE TABLES
// ============================================================================

export const healthUnits = sqliteTable("health_units", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  cnes: text("cnes").notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  cpf: text("cpf"),
  role: text("role", { 
    enum: ["admin", "medico", "enfermeiro", "acs", "farmaceutico", "gestor", "recepcao", "assistencia_social"] 
  }).notNull().default("recepcao"),
  unitId: text("unit_id").references(() => healthUnits.id),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const professionals = sqliteTable("professionals", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  cns: text("cns"),
  specialty: text("specialty").notNull(),
  councilType: text("council_type").notNull(),
  councilNumber: text("council_number").notNull(),
  councilState: text("council_state").notNull(),
  cboCode: text("cbo_code"),
  phone: text("phone"),
  email: text("email"),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  teamINE: text("team_ine"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

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
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  cadsusSync: integer("cadsus_sync", { mode: "boolean" }).default(false),
  cadsusSyncAt: integer("cadsus_sync_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// PHARMACY TABLES
// ============================================================================

export const renameCatalog = sqliteTable("rename_catalog", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  code: text("code").notNull().unique(),
  commercialName: text("commercial_name").notNull(),
  activeIngredient: text("active_ingredient").notNull(),
  therapeuticClass: text("therapeutic_class"),
  presentation: text("presentation").notNull(),
  concentration: text("concentration"),
  unit: text("unit"),
  administrationRoute: text("administration_route", { 
    enum: ["oral", "topical", "injectable", "inhalation", "sublingual", "rectal", "ophthalmic", "nasal", "auricular"] 
  }).notNull().default("oral"),
  isControlled: integer("is_controlled", { mode: "boolean" }).default(false),
  controlType: text("control_type", { 
    enum: ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5", "D1", "D2"] 
  }),
  maxPrescriptionDays: integer("max_prescription_days").default(30),
  requiresSpecialForm: integer("requires_special_form", { mode: "boolean" }).default(false),
  pediatricDosePerKg: text("pediatric_dose_per_kg"),
  contraindications: text("contraindications", { mode: "json" }).$type<string[]>(),
  interactions: text("interactions", { mode: "json" }).$type<string[]>(),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const citizenAllergies = sqliteTable("citizen_allergies", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id, { onDelete: "cascade" }),
  allergyType: text("allergy_type", { 
    enum: ["medication", "food", "environmental", "other"] 
  }).notNull(),
  allergen: text("allergen").notNull(),
  severity: text("severity", { enum: ["mild", "moderate", "severe", "anaphylactic"] }).notNull(),
  reaction: text("reaction"),
  diagnosedDate: integer("diagnosed_date", { mode: "timestamp" }),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const medications = sqliteTable("medications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  renameId: text("rename_id").references(() => renameCatalog.id),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  manufacturer: text("manufacturer"),
  presentation: text("presentation").notNull(),
  concentration: text("concentration"),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const prescriptions = sqliteTable("prescriptions", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  renameId: text("rename_id").references(() => renameCatalog.id),
  
  medication: text("medication").notNull(),
  genericName: text("generic_name"),
  dosage: text("dosage").notNull(),
  dosageUnit: text("dosage_unit", { enum: ["mg", "ml", "g", "UI", "mcg", "comprimido", "gota"] }),
  
  frequency: text("frequency").notNull(),
  frequencyUnit: text("frequency_unit", { enum: ["hours", "daily", "weekly", "monthly", "asNeeded"] }),
  duration: text("duration").notNull(),
  durationDays: integer("duration_days"),
  quantity: integer("quantity").notNull(),
  
  administrationRoute: text("administration_route", { 
    enum: ["oral", "topical", "injectable", "inhalation", "sublingual", "rectal", "ophthalmic", "nasal", "auricular"] 
  }).default("oral"),
  
  instructions: text("instructions"),
  specialInstructions: text("special_instructions"),
  useContinuous: integer("use_continuous", { mode: "boolean" }).default(false),
  
  isControlled: integer("is_controlled", { mode: "boolean" }).default(false),
  controlType: text("control_type", { enum: ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5", "D1", "D2"] }),
  specialFormNumber: text("special_form_number"),
  
  allergyChecked: integer("allergy_checked", { mode: "boolean" }).default(false),
  interactionChecked: integer("interaction_checked", { mode: "boolean" }).default(false),
  dosageValidated: integer("dosage_validated", { mode: "boolean" }).default(false),
  pediatricDoseCalculated: integer("pediatric_dose_calculated", { mode: "boolean" }).default(false),
  patientWeight: integer("patient_weight"),
  
  signatureHash: text("signature_hash"),
  signedAt: integer("signed_at", { mode: "timestamp" }),
  qrCodeData: text("qr_code_data"),
  
  status: text("status", { enum: ["draft", "pending", "dispensed", "partial", "cancelled", "expired"] }).notNull().default("pending"),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  dispensedAt: integer("dispensed_at", { mode: "timestamp" }),
  dispensedBy: text("dispensed_by").references(() => professionals.id),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const dispensations = sqliteTable("dispensations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  prescriptionId: text("prescription_id").notNull().references(() => prescriptions.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  medication: text("medication").notNull(),
  quantity: integer("quantity").notNull(),
  dispensedAt: integer("dispensed_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const medicationStock = sqliteTable("medication_stock", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  medicationName: text("medication_name").notNull(),
  genericName: text("generic_name"),
  commercialName: text("commercial_name"),
  activeIngredient: text("active_ingredient"),
  
  presentation: text("presentation").notNull(),
  concentration: text("concentration"),
  pharmaceuticalForm: text("pharmaceutical_form", { 
    enum: ["comprimido", "capsula", "xarope", "injetavel", "pomada", "creme", "gotas", "suspensao", "aerosol", "supositorio", "solucao", "outro"] 
  }).default("comprimido"),
  
  batch: text("batch").notNull(),
  expirationDate: integer("expiration_date", { mode: "timestamp" }).notNull(),
  manufacturer: text("manufacturer"),
  supplier: text("supplier"),
  
  currentQuantity: integer("current_quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(10),
  maxStock: integer("max_stock"),
  unit: text("unit").default("unidade"),
  
  unitCost: real("unit_cost"),
  totalCost: real("total_cost"),
  
  location: text("location"),
  storageConditions: text("storage_conditions"),
  
  isControlled: integer("is_controlled", { mode: "boolean" }).default(false),
  controlType: text("control_type", { enum: ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5", "D1", "D2"] }),
  renameCode: text("rename_code"),
  
  status: text("status", { enum: ["active", "low_stock", "expired", "depleted", "blocked"] }).default("active"),
  active: integer("active", { mode: "boolean" }).default(true),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  stockId: text("stock_id").notNull().references(() => medicationStock.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  movementType: text("movement_type", { 
    enum: ["entrada", "saida", "ajuste_positivo", "ajuste_negativo", "transferencia_entrada", "transferencia_saida", "perda", "vencimento", "devolucao"] 
  }).notNull(),
  
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  
  reason: text("reason").notNull(),
  documentNumber: text("document_number"),
  
  dispensationId: text("dispensation_id").references(() => dispensations.id),
  prescriptionId: text("prescription_id").references(() => prescriptions.id),
  
  sourceUnitId: text("source_unit_id").references(() => healthUnits.id),
  destinationUnitId: text("destination_unit_id").references(() => healthUnits.id),
  
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  authorizedBy: text("authorized_by").references(() => professionals.id),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// TFD TABLES (Tratamento Fora de Domicílio)
// ============================================================================

export const tfdVehicles = sqliteTable("tfd_vehicles", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  plate: text("plate").notNull().unique(),
  model: text("model").notNull(),
  brand: text("brand").notNull(),
  year: integer("year"),
  vehicleType: text("vehicle_type", { 
    enum: ["ambulancia", "van", "micro_onibus", "onibus", "carro"] 
  }).notNull(),
  capacity: integer("capacity").notNull(),
  currentKm: integer("current_km").default(0),
  lastMaintenanceKm: integer("last_maintenance_km"),
  nextMaintenanceKm: integer("next_maintenance_km"),
  insuranceExpiry: integer("insurance_expiry", { mode: "timestamp" }),
  inspectionExpiry: integer("inspection_expiry", { mode: "timestamp" }),
  status: text("status", { 
    enum: ["disponivel", "em_viagem", "manutencao", "inativo"] 
  }).notNull().default("disponivel"),
  observations: text("observations"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const sigtapTfdCatalog = sqliteTable("sigtap_tfd_catalog", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  grupo: text("grupo").notNull(),
  subgrupo: text("subgrupo"),
  formaOrganizacao: text("forma_organizacao"),
  valorSp: real("valor_sp").notNull(),
  valorSa: real("valor_sa").default(0),
  valorTotal: real("valor_total").notNull(),
  unidade: text("unidade").default("km"),
  modalidade: text("modalidade", { 
    enum: ["ambulatorial", "hospitalar"] 
  }).notNull().default("ambulatorial"),
  descricao: text("descricao"),
  requerAutorizacao: integer("requer_autorizacao", { mode: "boolean" }).default(false),
  documentoNecessario: text("documento_necessario"),
  cboCompativel: text("cbo_compativel"),
  distanciaMinima: integer("distancia_minima").default(50),
  ativo: integer("ativo", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const tfdDrivers = sqliteTable("tfd_drivers", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  name: text("name").notNull(),
  cpf: text("cpf").notNull().unique(),
  cnh: text("cnh").notNull(),
  cnhCategory: text("cnh_category", { 
    enum: ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"] 
  }).notNull(),
  cnhExpiry: integer("cnh_expiry", { mode: "timestamp" }).notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  status: text("status", { 
    enum: ["disponivel", "em_viagem", "ferias", "afastado", "inativo"] 
  }).notNull().default("disponivel"),
  observations: text("observations"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const tfdTrips = sqliteTable("tfd_trips", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  vehicleId: text("vehicle_id").notNull().references(() => tfdVehicles.id),
  driverId: text("driver_id").notNull().references(() => tfdDrivers.id),
  destination: text("destination").notNull(),
  destinationMunicipality: text("destination_municipality"),
  destinationState: text("destination_state"),
  scheduledDeparture: integer("scheduled_departure", { mode: "timestamp" }).notNull(),
  scheduledReturn: integer("scheduled_return", { mode: "timestamp" }),
  actualDeparture: integer("actual_departure", { mode: "timestamp" }),
  actualReturn: integer("actual_return", { mode: "timestamp" }),
  route: text("route"),
  initialKm: integer("initial_km"),
  finalKm: integer("final_km"),
  totalKm: integer("total_km"),
  fuelLiters: real("fuel_liters"),
  fuelCost: real("fuel_cost"),
  tollCost: real("toll_cost"),
  otherCosts: real("other_costs"),
  totalCost: real("total_cost"),
  passengersCount: integer("passengers_count").notNull(),
  status: text("status", { 
    enum: ["agendada", "em_andamento", "concluida", "cancelada"] 
  }).notNull().default("agendada"),
  tripReport: text("trip_report"),
  incidents: text("incidents"),
  observations: text("observations"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const tfdRequests = sqliteTable("tfd_requests", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  originUnitId: text("origin_unit_id").notNull().references(() => healthUnits.id),
  requestedById: text("requested_by_id").notNull().references(() => professionals.id),
  
  desiredDate: integer("desired_date", { mode: "timestamp" }),
  travelDate: integer("travel_date", { mode: "timestamp" }),
  returnDate: integer("return_date", { mode: "timestamp" }),
  destination: text("destination").notNull(),
  destinationMunicipality: text("destination_municipality"),
  destinationState: text("destination_state"),
  destinationFacility: text("destination_facility"),
  
  originIbgeCode: text("origin_ibge_code"),
  destinationIbgeCode: text("destination_ibge_code"),
  distanceKm: integer("distance_km"),
  
  cidPrimary: text("cid_primary"),
  cidSecondary: text("cid_secondary"),
  
  sigtapCode: text("sigtap_code"),
  sigtapCompanionCode: text("sigtap_companion_code"),
  sigtapQuantity: integer("sigtap_quantity").default(1),
  sigtapValue: real("sigtap_value"),
  
  apacAuthorizationNumber: text("apac_authorization_number"),
  apacStatus: text("apac_status", { 
    enum: ["pendente", "autorizada", "negada", "em_analise"] 
  }),
  apacIssuedAt: integer("apac_issued_at", { mode: "timestamp" }),
  
  patientRace: text("patient_race", { 
    enum: ["branca", "preta", "parda", "amarela", "indigena", "sem_declaracao"] 
  }),
  patientEthnicity: text("patient_ethnicity"),
  
  professionalCbo: text("professional_cbo"),
  
  reason: text("reason", { 
    enum: ["consulta", "exame", "internacao", "quimioterapia", "radioterapia", "hemodialise", "cirurgia", "outro"] 
  }).notNull(),
  reasonDetail: text("reason_detail"),
  procedure: text("procedure"),
  procedureCode: text("procedure_code"),
  
  accompaniedBy: text("accompanied_by"),
  companion: integer("companion", { mode: "boolean" }).default(false),
  companionJustification: text("companion_justification"),
  companionCpf: text("companion_cpf"),
  companionCns: text("companion_cns"),
  companionName: text("companion_name"),
  companionPhone: text("companion_phone"),
  
  pernoite: integer("pernoite", { mode: "boolean" }).default(false),
  pernoiteQuantity: integer("pernoite_quantity"),
  pernoiteNotes: text("pernoite_notes"),
  
  transportType: text("transport_type", { 
    enum: ["ambulancia", "van", "onibus", "carro", "micro_onibus"] 
  }),
  urgencyLevel: text("urgency_level", { 
    enum: ["eletivo", "urgente", "emergencia"] 
  }).notNull().default("eletivo"),
  
  medicalDocument: text("medical_document"),
  medicalDocumentType: text("medical_document_type", { 
    enum: ["laudo", "encaminhamento", "prescricao", "exame", "outro"] 
  }),
  justification: text("justification"),
  
  budgetVerified: integer("budget_verified", { mode: "boolean" }).default(false),
  budgetNotes: text("budget_notes"),
  observations: text("observations"),
  
  susExported: integer("sus_exported", { mode: "boolean" }).default(false),
  susExportedAt: integer("sus_exported_at", { mode: "timestamp" }),
  susExportType: text("sus_export_type", { enum: ["bpa", "apac"] }),
  susExportBatch: text("sus_export_batch"),
  
  status: text("status", { 
    enum: ["pending", "approved", "rejected", "scheduled", "in_transit", "completed", "cancelled", "no_show"] 
  }).notNull().default("pending"),
  statusHistory: text("status_history", { mode: "json" }).$type<Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>>(),
  
  tripId: text("trip_id").references(() => tfdTrips.id),
  
  approvedBy: text("approved_by").references(() => professionals.id),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  approvalJustification: text("approval_justification"),
  
  rejectedBy: text("rejected_by").references(() => professionals.id),
  rejectedAt: integer("rejected_at", { mode: "timestamp" }),
  rejectionReason: text("rejection_reason"),
  
  scheduledBy: text("scheduled_by").references(() => professionals.id),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const tfdTripPassengers = sqliteTable("tfd_trip_passengers", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  tripId: text("trip_id").notNull().references(() => tfdTrips.id, { onDelete: "cascade" }),
  tfdRequestId: text("tfd_request_id").notNull().references(() => tfdRequests.id),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  isCompanion: integer("is_companion", { mode: "boolean" }).default(false),
  companionOf: text("companion_of").references(() => citizens.id),
  seatNumber: integer("seat_number"),
  boarded: integer("boarded", { mode: "boolean" }).default(false),
  boardedAt: integer("boarded_at", { mode: "timestamp" }),
  disembarked: integer("disembarked", { mode: "boolean" }).default(false),
  disembarkedAt: integer("disembarked_at", { mode: "timestamp" }),
  status: text("status", { 
    enum: ["confirmado", "embarcado", "desembarcado", "nao_compareceu", "cancelado"] 
  }).notNull().default("confirmado"),
  observations: text("observations"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// DIAPER STOCK TABLES (Pharmacy Extension)
// ============================================================================

export const diaperStock = sqliteTable("diaper_stock", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  sku: text("sku"),
  name: text("name").notNull(),
  brand: text("brand"),
  size: text("size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }).notNull(),
  
  unitsPerPackage: integer("units_per_package").notNull().default(1),
  batch: text("batch").notNull(),
  expirationDate: integer("expiration_date", { mode: "timestamp" }).notNull(),
  
  manufacturer: text("manufacturer"),
  supplier: text("supplier"),
  invoiceNumber: text("invoice_number"),
  receivedDate: integer("received_date", { mode: "timestamp" }),
  
  currentQuantity: integer("current_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  availableQuantity: integer("available_quantity").notNull().default(0),
  
  minStock: integer("min_stock").notNull().default(50),
  maxStock: integer("max_stock"),
  reorderPoint: integer("reorder_point").default(100),
  
  unitCost: real("unit_cost"),
  totalCost: real("total_cost"),
  
  location: text("location"),
  storageConditions: text("storage_conditions"),
  
  status: text("status", { 
    enum: ["active", "low_stock", "expired", "depleted", "blocked"] 
  }).default("active"),
  active: integer("active", { mode: "boolean" }).default(true),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperStockMovements = sqliteTable("diaper_stock_movements", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  stockId: text("stock_id").notNull().references(() => diaperStock.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  movementType: text("movement_type", { 
    enum: ["entrada", "saida", "ajuste_positivo", "ajuste_negativo", "transferencia_entrada", "transferencia_saida", "perda", "vencimento", "devolucao", "reserva", "liberacao_reserva", "doacao_assistencia"] 
  }).notNull(),
  
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  
  reason: text("reason").notNull(),
  documentNumber: text("document_number"),
  
  diaperRequestId: text("diaper_request_id"),
  diaperDeliveryId: text("diaper_delivery_id"),
  
  sourceUnitId: text("source_unit_id").references(() => healthUnits.id),
  destinationUnitId: text("destination_unit_id").references(() => healthUnits.id),
  
  userId: text("user_id").notNull().references(() => users.id),
  authorizedBy: text("authorized_by").references(() => users.id),
  
  observations: text("observations"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// SOCIAL ASSISTANCE TABLES (Diaper Management)
// ============================================================================

export const saBeneficiaries = sqliteTable("sa_beneficiaries", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").references(() => citizens.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  name: text("name").notNull(),
  cpf: text("cpf"),
  nis: text("nis"),
  cns: text("cns"),
  
  birthDate: integer("birth_date", { mode: "timestamp" }),
  gender: text("gender", { enum: ["M", "F", "outro"] }),
  
  phone: text("phone"),
  phoneSecondary: text("phone_secondary"),
  email: text("email"),
  
  address: text("address"),
  addressNumber: text("address_number"),
  neighborhood: text("neighborhood"),
  city: text("city").default("Cardeal da Silva"),
  state: text("state").default("BA"),
  zipCode: text("zip_code"),
  
  crasId: text("cras_id"),
  crasName: text("cras_name"),
  
  responsibleName: text("responsible_name"),
  responsibleCpf: text("responsible_cpf"),
  responsiblePhone: text("responsible_phone"),
  responsibleRelationship: text("responsible_relationship"),
  
  medicalDocumentUrl: text("medical_document_url"),
  medicalDocumentType: text("medical_document_type"),
  diagnosisCid: text("diagnosis_cid"),
  diagnosisDescription: text("diagnosis_description"),
  
  beneficiaryType: text("beneficiary_type", { 
    enum: ["idoso", "crianca", "pessoa_com_deficiencia", "acamado", "outro"] 
  }),
  incontinenceLevel: text("incontinence_level", { 
    enum: ["leve", "moderada", "grave", "total"] 
  }),
  
  recommendedSize: text("recommended_size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }),
  recommendedQuantityPerDay: integer("recommended_quantity_per_day").default(6),
  recommendedQuantityPerMonth: integer("recommended_quantity_per_month").default(180),
  
  incomePerCapita: real("income_per_capita"),
  familySize: integer("family_size"),
  
  observations: text("observations"),
  
  status: text("status", { 
    enum: ["ativo", "inativo", "suspenso", "aguardando_documentacao"] 
  }).default("ativo"),
  active: integer("active", { mode: "boolean" }).default(true),
  
  registeredById: text("registered_by_id").references(() => users.id),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperRequests = sqliteTable("diaper_requests", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  requestNumber: text("request_number").notNull().unique(),
  beneficiaryId: text("beneficiary_id").notNull().references(() => saBeneficiaries.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  diaperSize: text("diaper_size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }).notNull(),
  quantityRequested: integer("quantity_requested").notNull(),
  quantityApproved: integer("quantity_approved"),
  
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
  
  justification: text("justification"),
  medicalReportUrl: text("medical_report_url"),
  medicalReportDate: integer("medical_report_date", { mode: "timestamp" }),
  
  requestType: text("request_type", { 
    enum: ["individual", "lista_mensal", "renovacao", "emergencial"] 
  }).notNull().default("individual"),
  
  monthlyListId: text("monthly_list_id"),
  
  crasResponsibleName: text("cras_responsible_name"),
  crasResponsibleId: text("cras_responsible_id").references(() => users.id),
  
  priority: text("priority", { 
    enum: ["baixa", "normal", "alta", "urgente"] 
  }).default("normal"),
  
  status: text("status", { 
    enum: ["pendente", "em_analise", "autorizado", "parcialmente_autorizado", "negado", "entregue", "cancelado", "expirado"] 
  }).notNull().default("pendente"),
  
  statusHistory: text("status_history", { mode: "json" }).$type<Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>>(),
  
  requestedById: text("requested_by_id").notNull().references(() => users.id),
  requestedAt: integer("requested_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  
  analyzedById: text("analyzed_by_id").references(() => users.id),
  analyzedAt: integer("analyzed_at", { mode: "timestamp" }),
  analysisNotes: text("analysis_notes"),
  
  approvedById: text("approved_by_id").references(() => users.id),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  approvalNotes: text("approval_notes"),
  
  rejectedById: text("rejected_by_id").references(() => users.id),
  rejectedAt: integer("rejected_at", { mode: "timestamp" }),
  rejectionReason: text("rejection_reason"),
  
  observations: text("observations"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperAuthorizations = sqliteTable("diaper_authorizations", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  authorizationNumber: text("authorization_number").notNull().unique(),
  requestId: text("request_id").notNull().references(() => diaperRequests.id),
  beneficiaryId: text("beneficiary_id").notNull().references(() => saBeneficiaries.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  diaperSize: text("diaper_size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }).notNull(),
  quantityAuthorized: integer("quantity_authorized").notNull(),
  
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
  
  authorizationType: text("authorization_type", { 
    enum: ["individual", "batch", "renovacao", "emergencial"] 
  }).notNull().default("individual"),
  
  documentGenerated: integer("document_generated", { mode: "boolean" }).default(false),
  documentUrl: text("document_url"),
  documentGeneratedAt: integer("document_generated_at", { mode: "timestamp" }),
  
  issuedById: text("issued_by_id").notNull().references(() => users.id),
  issuedAt: integer("issued_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  
  validUntil: integer("valid_until", { mode: "timestamp" }),
  
  status: text("status", { 
    enum: ["ativa", "utilizada", "parcialmente_utilizada", "expirada", "cancelada"] 
  }).notNull().default("ativa"),
  
  quantityDelivered: integer("quantity_delivered").default(0),
  quantityRemaining: integer("quantity_remaining"),
  
  observations: text("observations"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperDeliveries = sqliteTable("diaper_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  deliveryNumber: text("delivery_number").notNull().unique(),
  authorizationId: text("authorization_id").notNull().references(() => diaperAuthorizations.id),
  beneficiaryId: text("beneficiary_id").notNull().references(() => saBeneficiaries.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  diaperSize: text("diaper_size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }).notNull(),
  quantityDelivered: integer("quantity_delivered").notNull(),
  
  stockId: text("stock_id").references(() => diaperStock.id),
  batch: text("batch"),
  
  receivedByName: text("received_by_name").notNull(),
  receivedByCpf: text("received_by_cpf"),
  receivedByRelationship: text("received_by_relationship"),
  signatureUrl: text("signature_url"),
  
  deliveredById: text("delivered_by_id").notNull().references(() => users.id),
  deliveredAt: integer("delivered_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  
  deliveryTermGenerated: integer("delivery_term_generated", { mode: "boolean" }).default(false),
  deliveryTermUrl: text("delivery_term_url"),
  
  observations: text("observations"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperMonthlyLists = sqliteTable("diaper_monthly_lists", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  listNumber: text("list_number").notNull().unique(),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  referenceMonth: integer("reference_month").notNull(),
  referenceYear: integer("reference_year").notNull(),
  
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),
  
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileType: text("file_type", { enum: ["csv", "xlsx", "xls"] }),
  csvContent: text("csv_content"),
  
  totalRecords: integer("total_records").default(0),
  validRecords: integer("valid_records").default(0),
  invalidRecords: integer("invalid_records").default(0),
  
  validationErrors: text("validation_errors", { mode: "json" }).$type<Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>>(),
  
  processingStatus: text("processing_status", { 
    enum: ["pendente", "validando", "validado", "processando", "concluido", "erro"] 
  }).default("pendente"),
  processingStartedAt: integer("processing_started_at", { mode: "timestamp" }),
  processingCompletedAt: integer("processing_completed_at", { mode: "timestamp" }),
  
  uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  
  approvedById: text("approved_by_id").references(() => users.id),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  
  requestsGenerated: integer("requests_generated").default(0),
  authorizationsGenerated: integer("authorizations_generated").default(0),
  
  observations: text("observations"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const diaperDemandForecast = sqliteTable("diaper_demand_forecast", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  referenceMonth: integer("reference_month").notNull(),
  referenceYear: integer("reference_year").notNull(),
  
  diaperSize: text("diaper_size", { 
    enum: ["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"] 
  }).notNull(),
  
  forecastMethod: text("forecast_method", { 
    enum: ["media_movel_3m", "media_movel_6m", "tendencia_linear", "sazonalidade"] 
  }).notNull().default("media_movel_3m"),
  
  predictedQuantity: integer("predicted_quantity").notNull(),
  actualQuantity: integer("actual_quantity"),
  
  lowerBound: integer("lower_bound"),
  upperBound: integer("upper_bound"),
  
  confidence: real("confidence"),
  accuracy: real("accuracy"),
  
  historicalData: text("historical_data", { mode: "json" }).$type<Array<{
    month: number;
    year: number;
    quantity: number;
  }>>(),
  
  calculatedAt: integer("calculated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  calculatedById: text("calculated_by_id").references(() => users.id),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const saAuditLog = sqliteTable("sa_audit_log", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  entityType: text("entity_type", { 
    enum: ["beneficiario", "solicitacao", "autorizacao", "entrega", "estoque", "lista_mensal"] 
  }).notNull(),
  entityId: text("entity_id").notNull(),
  
  action: text("action", { 
    enum: ["criar", "atualizar", "excluir", "aprovar", "rejeitar", "entregar", "cancelar", "estornar"] 
  }).notNull(),
  
  previousData: text("previous_data", { mode: "json" }),
  newData: text("new_data", { mode: "json" }),
  
  userId: text("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  description: text("description"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// SYSTEM TABLES
// ============================================================================

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id").references(() => users.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  type: text("type", {
    enum: ["prescription_ready", "stock_low", "system", "tfd_update"]
  }).notNull(),
  priority: text("priority", {
    enum: ["low", "medium", "high", "critical"]
  }).notNull().default("medium"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  actionUrl: text("action_url"),
  metadata: text("metadata", { mode: "json" }),
  readAt: integer("read_at", { mode: "timestamp" }),
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const documentSignatures = sqliteTable("document_signatures", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  documentType: text("document_type", {
    enum: ["prescription"]
  }).notNull(),
  documentId: text("document_id").notNull(),
  signerId: text("signer_id").notNull().references(() => professionals.id),
  signerName: text("signer_name").notNull(),
  signerCredentials: text("signer_credentials"),
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

// ============================================================================
// SINAN - SISTEMA DE INFORMAÇÃO DE AGRAVOS DE NOTIFICAÇÃO
// ============================================================================

export const sinanNotifications = sqliteTable("sinan_notifications", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  notificationNumber: text("notification_number").notNull().unique(),
  notificationDate: integer("notification_date", { mode: "timestamp" }).notNull(),
  notificationWeek: integer("notification_week").notNull(),
  notificationYear: integer("notification_year").notNull(),
  
  agravo: text("agravo", {
    enum: [
      "dengue", "chikungunya", "zika", "leishmaniose_visceral", "leishmaniose_tegumentar",
      "hanseniase", "tuberculose", "malaria", "covid19", "hepatite_a", "hepatite_b", 
      "hepatite_c", "meningite", "tetano", "coqueluche", "difteria", "poliomielite",
      "sarampo", "rubeola", "varicela", "febre_amarela", "raiva_humana", "leptospirose",
      "esquistossomose", "doenca_chagas", "hantavirose", "febre_maculosa", "botulismo",
      "colera", "febre_tifoide", "antraz", "peste", "tularemia", "acidentes_animais",
      "intoxicacao_exogena", "violencia_domestica", "acidente_trabalho", "outros"
    ]
  }).notNull(),
  
  cidPrimary: text("cid_primary").notNull(),
  cidSecondary: text("cid_secondary"),
  
  patientName: text("patient_name").notNull(),
  patientBirthDate: integer("patient_birth_date", { mode: "timestamp" }),
  patientAge: integer("patient_age"),
  patientAgeUnit: text("patient_age_unit", { enum: ["anos", "meses", "dias"] }).default("anos"),
  patientSex: text("patient_sex", { enum: ["M", "F", "I"] }).notNull(),
  patientPregnant: text("patient_pregnant", { enum: ["sim", "nao", "nao_se_aplica", "ignorado"] }),
  patientRace: text("patient_race", { 
    enum: ["branca", "preta", "parda", "amarela", "indigena", "ignorado"] 
  }),
  patientSchooling: text("patient_schooling", {
    enum: [
      "analfabeto", "fundamental_incompleto", "fundamental_completo",
      "medio_incompleto", "medio_completo", "superior_incompleto",
      "superior_completo", "ignorado", "nao_se_aplica"
    ]
  }),
  patientOccupation: text("patient_occupation"),
  patientCpf: text("patient_cpf"),
  patientCns: text("patient_cns"),
  patientMotherName: text("patient_mother_name"),
  
  patientPhone: text("patient_phone"),
  patientAddress: text("patient_address"),
  patientAddressNumber: text("patient_address_number"),
  patientComplement: text("patient_complement"),
  patientNeighborhood: text("patient_neighborhood"),
  patientMunicipalityIbge: text("patient_municipality_ibge"),
  patientMunicipalityName: text("patient_municipality_name"),
  patientState: text("patient_state"),
  patientCep: text("patient_cep"),
  patientZone: text("patient_zone", { enum: ["urbana", "rural", "periurbana", "ignorado"] }),
  patientCountry: text("patient_country").default("Brasil"),
  
  symptomStartDate: integer("symptom_start_date", { mode: "timestamp" }),
  hospitalization: integer("hospitalization", { mode: "boolean" }).default(false),
  hospitalizationDate: integer("hospitalization_date", { mode: "timestamp" }),
  hospitalizationUnit: text("hospitalization_unit"),
  hospitalizationUnitCnes: text("hospitalization_unit_cnes"),
  uti: integer("uti", { mode: "boolean" }).default(false),
  
  evolution: text("evolution", { 
    enum: ["cura", "obito_agravo", "obito_outras_causas", "ignorado", "em_investigacao"] 
  }),
  evolutionDate: integer("evolution_date", { mode: "timestamp" }),
  autopsyPerformed: integer("autopsy_performed", { mode: "boolean" }).default(false),
  
  classification: text("classification", {
    enum: ["confirmado", "provavel", "descartado", "inconclusivo", "em_investigacao"]
  }).default("em_investigacao"),
  confirmationCriteria: text("confirmation_criteria", {
    enum: ["laboratorial", "clinico_epidemiologico", "clinico", "ignorado"]
  }),
  
  investigatorName: text("investigator_name"),
  investigatorCns: text("investigator_cns"),
  investigationDate: integer("investigation_date", { mode: "timestamp" }),
  investigationStatus: text("investigation_status", {
    enum: ["pendente", "em_andamento", "concluida", "encerrada"]
  }).default("pendente"),
  
  status: text("status", {
    enum: ["rascunho", "preenchida", "validada", "exportada", "cancelada"]
  }).default("rascunho"),
  
  notifierId: text("notifier_id").references(() => professionals.id),
  notifierName: text("notifier_name"),
  
  additionalData: text("additional_data", { mode: "json" }),
  labResults: text("lab_results", { mode: "json" }),
  observations: text("observations"),
  
  exportedAt: integer("exported_at", { mode: "timestamp" }),
  exportBatch: text("export_batch"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const sinanLabExams = sqliteTable("sinan_lab_exams", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  notificationId: text("notification_id").notNull().references(() => sinanNotifications.id),
  
  examType: text("exam_type").notNull(),
  examName: text("exam_name").notNull(),
  collectionDate: integer("collection_date", { mode: "timestamp" }),
  resultDate: integer("result_date", { mode: "timestamp" }),
  result: text("result", { enum: ["positivo", "negativo", "inconclusivo", "nao_realizado", "em_andamento"] }),
  resultValue: text("result_value"),
  resultUnit: text("result_unit"),
  referenceValue: text("reference_value"),
  laboratory: text("laboratory"),
  laboratoryCnes: text("laboratory_cnes"),
  method: text("method"),
  observations: text("observations"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export const sinanExportBatches = sqliteTable("sinan_export_batches", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  
  batchNumber: text("batch_number").notNull().unique(),
  exportDate: integer("export_date", { mode: "timestamp" }).notNull(),
  referenceMonth: integer("reference_month").notNull(),
  referenceYear: integer("reference_year").notNull(),
  
  totalRecords: integer("total_records").notNull().default(0),
  agravo: text("agravo"),
  
  exportedBy: text("exported_by").references(() => users.id),
  exportedByName: text("exported_by_name"),
  
  fileFormat: text("file_format", { enum: ["dbf", "txt", "xml"] }).default("dbf"),
  filePath: text("file_path"),
  fileHash: text("file_hash"),
  
  status: text("status", { 
    enum: ["gerado", "enviado", "aceito", "rejeitado", "processando"] 
  }).default("gerado"),
  responseMessage: text("response_message"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ============================================================================
// INSERT SCHEMAS
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

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});

export const insertDispensationSchema = createInsertSchema(dispensations).omit({ 
  id: true, 
  createdAt: true 
});

export const insertMedicationStockSchema = createInsertSchema(medicationStock).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertTfdVehicleSchema = createInsertSchema(tfdVehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTfdDriverSchema = createInsertSchema(tfdDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTfdTripSchema = createInsertSchema(tfdTrips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTfdRequestSchema = createInsertSchema(tfdRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  statusHistory: true,
});

export const insertTfdTripPassengerSchema = createInsertSchema(tfdTripPassengers).omit({
  id: true,
  createdAt: true,
});

export const insertSinanNotificationSchema = createInsertSchema(sinanNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSinanNotificationSchema = z.object({
  agravo: z.enum([
    "dengue", "chikungunya", "zika", "leishmaniose_visceral", "leishmaniose_tegumentar",
    "hanseniase", "tuberculose", "malaria", "covid19", "hepatite_a", "hepatite_b",
    "hepatite_c", "meningite", "tetano", "coqueluche", "difteria", "poliomielite",
    "sarampo", "rubeola", "varicela", "febre_amarela", "raiva_humana", "leptospirose",
    "esquistossomose", "doenca_chagas", "hantavirose", "febre_maculosa", "botulismo",
    "colera", "febre_tifoide", "antraz", "peste", "tularemia", "acidentes_animais",
    "intoxicacao_exogena", "violencia_domestica", "acidente_trabalho", "outros"
  ]).optional(),
  cidPrimary: z.string().optional(),
  cidSecondary: z.string().nullable().optional(),
  patientName: z.string().optional(),
  patientSex: z.enum(["M", "F", "I"]).optional(),
  classification: z.enum(["confirmado", "provavel", "descartado", "inconclusivo", "em_investigacao"]).optional(),
  investigationStatus: z.enum(["pendente", "em_andamento", "concluida", "encerrada"]).optional(),
  status: z.enum(["rascunho", "preenchida", "validada", "exportada", "cancelada"]).optional(),
  observations: z.string().nullable().optional(),
});

export const insertSinanLabExamSchema = createInsertSchema(sinanLabExams).omit({
  id: true,
  createdAt: true,
});

export const insertSinanExportBatchSchema = createInsertSchema(sinanExportBatches).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// ============================================================================
// UPDATE SCHEMAS
// ============================================================================

export const updateTfdVehicleSchema = z.object({
  model: z.string().optional(),
  brand: z.string().optional(),
  capacity: z.number().min(1).max(50).optional(),
  currentKm: z.number().min(0).optional(),
  lastMaintenanceKm: z.number().nullable().optional(),
  nextMaintenanceKm: z.number().nullable().optional(),
  insuranceExpiry: z.date().nullable().optional(),
  inspectionExpiry: z.date().nullable().optional(),
  status: z.enum(["disponivel", "em_viagem", "manutencao", "inativo"]).optional(),
  observations: z.string().nullable().optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const updateTfdDriverSchema = z.object({
  name: z.string().min(2).optional(),
  cnh: z.string().optional(),
  cnhCategory: z.enum(["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"]).optional(),
  cnhExpiry: z.date().optional(),
  phone: z.string().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  status: z.enum(["disponivel", "em_viagem", "ferias", "afastado", "inativo"]).optional(),
  observations: z.string().nullable().optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const updateTfdTripSchema = z.object({
  scheduledDeparture: z.date().optional(),
  scheduledReturn: z.date().nullable().optional(),
  actualDeparture: z.date().nullable().optional(),
  actualReturn: z.date().nullable().optional(),
  route: z.string().nullable().optional(),
  initialKm: z.number().nullable().optional(),
  finalKm: z.number().nullable().optional(),
  totalKm: z.number().nullable().optional(),
  fuelLiters: z.number().nullable().optional(),
  fuelCost: z.number().nullable().optional(),
  tollCost: z.number().nullable().optional(),
  otherCosts: z.number().nullable().optional(),
  totalCost: z.number().nullable().optional(),
  passengersCount: z.number().min(1).optional(),
  status: z.enum(["agendada", "em_andamento", "concluida", "cancelada"]).optional(),
  tripReport: z.string().nullable().optional(),
  incidents: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const updateTfdRequestSchema = z.object({
  desiredDate: z.date().nullable().optional(),
  travelDate: z.date().nullable().optional(),
  returnDate: z.date().nullable().optional(),
  destination: z.string().optional(),
  destinationMunicipality: z.string().nullable().optional(),
  destinationState: z.string().nullable().optional(),
  destinationFacility: z.string().nullable().optional(),
  originIbgeCode: z.string().nullable().optional(),
  destinationIbgeCode: z.string().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  cidPrimary: z.string().nullable().optional(),
  cidSecondary: z.string().nullable().optional(),
  sigtapCode: z.string().nullable().optional(),
  sigtapCompanionCode: z.string().nullable().optional(),
  sigtapQuantity: z.number().nullable().optional(),
  sigtapValue: z.number().nullable().optional(),
  apacAuthorizationNumber: z.string().nullable().optional(),
  apacStatus: z.enum(["pendente", "autorizada", "negada", "em_analise"]).nullable().optional(),
  apacIssuedAt: z.date().nullable().optional(),
  patientRace: z.enum(["branca", "preta", "parda", "amarela", "indigena", "sem_declaracao"]).nullable().optional(),
  patientEthnicity: z.string().nullable().optional(),
  professionalCbo: z.string().nullable().optional(),
  reason: z.enum(["consulta", "exame", "internacao", "quimioterapia", "radioterapia", "hemodialise", "cirurgia", "outro"]).optional(),
  reasonDetail: z.string().nullable().optional(),
  procedure: z.string().nullable().optional(),
  procedureCode: z.string().nullable().optional(),
  accompaniedBy: z.string().nullable().optional(),
  companion: z.boolean().optional(),
  companionJustification: z.string().nullable().optional(),
  companionCpf: z.string().nullable().optional(),
  companionCns: z.string().nullable().optional(),
  companionName: z.string().nullable().optional(),
  companionPhone: z.string().nullable().optional(),
  pernoite: z.boolean().optional(),
  pernoiteQuantity: z.number().nullable().optional(),
  pernoiteNotes: z.string().nullable().optional(),
  transportType: z.enum(["ambulancia", "van", "onibus", "carro", "micro_onibus"]).nullable().optional(),
  urgencyLevel: z.enum(["eletivo", "urgente", "emergencia"]).optional(),
  medicalDocument: z.string().nullable().optional(),
  medicalDocumentType: z.enum(["laudo", "encaminhamento", "prescricao", "exame", "outro"]).nullable().optional(),
  justification: z.string().nullable().optional(),
  budgetVerified: z.boolean().optional(),
  budgetNotes: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
  susExported: z.boolean().optional(),
  susExportedAt: z.date().nullable().optional(),
  susExportType: z.enum(["bpa", "apac"]).nullable().optional(),
  susExportBatch: z.string().nullable().optional(),
  status: z.enum(["pending", "approved", "rejected", "scheduled", "in_transit", "completed", "cancelled", "no_show"]).optional(),
  tripId: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  approvalJustification: z.string().nullable().optional(),
  rejectedBy: z.string().nullable().optional(),
  rejectedAt: z.date().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  scheduledBy: z.string().nullable().optional(),
  scheduledAt: z.date().nullable().optional(),
  statusHistory: z.array(z.object({
    status: z.string(),
    changedAt: z.string(),
    changedBy: z.string(),
    reason: z.string().optional(),
  })).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const insertSigtapTfdCatalogSchema = createInsertSchema(sigtapTfdCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Diaper Stock Schemas
export const insertDiaperStockSchema = createInsertSchema(diaperStock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiaperStockMovementSchema = createInsertSchema(diaperStockMovements).omit({
  id: true,
  createdAt: true,
});

// Social Assistance Schemas
export const insertSaBeneficiarySchema = createInsertSchema(saBeneficiaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiaperRequestSchema = createInsertSchema(diaperRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  statusHistory: true,
});

export const insertDiaperAuthorizationSchema = createInsertSchema(diaperAuthorizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiaperDeliverySchema = createInsertSchema(diaperDeliveries).omit({
  id: true,
  createdAt: true,
});

export const insertDiaperMonthlyListSchema = createInsertSchema(diaperMonthlyLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  validationErrors: true,
});

export const insertDiaperDemandForecastSchema = createInsertSchema(diaperDemandForecast).omit({
  id: true,
  createdAt: true,
  historicalData: true,
});

// ============================================================================
// UPDATE SCHEMAS (Social Assistance)
// ============================================================================

export const updateSaBeneficiarySchema = z.object({
  name: z.string().min(2).optional(),
  cpf: z.string().nullable().optional(),
  nis: z.string().nullable().optional(),
  cns: z.string().nullable().optional(),
  birthDate: z.date().nullable().optional(),
  gender: z.enum(["M", "F", "outro"]).nullable().optional(),
  phone: z.string().nullable().optional(),
  phoneSecondary: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  addressNumber: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  crasId: z.string().nullable().optional(),
  crasName: z.string().nullable().optional(),
  responsibleName: z.string().nullable().optional(),
  responsibleCpf: z.string().nullable().optional(),
  responsiblePhone: z.string().nullable().optional(),
  responsibleRelationship: z.string().nullable().optional(),
  medicalDocumentUrl: z.string().nullable().optional(),
  medicalDocumentType: z.string().nullable().optional(),
  diagnosisCid: z.string().nullable().optional(),
  diagnosisDescription: z.string().nullable().optional(),
  beneficiaryType: z.enum(["idoso", "crianca", "pessoa_com_deficiencia", "acamado", "outro"]).nullable().optional(),
  incontinenceLevel: z.enum(["leve", "moderada", "grave", "total"]).nullable().optional(),
  recommendedSize: z.enum(["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"]).nullable().optional(),
  recommendedQuantityPerDay: z.number().nullable().optional(),
  recommendedQuantityPerMonth: z.number().nullable().optional(),
  incomePerCapita: z.number().nullable().optional(),
  familySize: z.number().nullable().optional(),
  observations: z.string().nullable().optional(),
  status: z.enum(["ativo", "inativo", "suspenso", "aguardando_documentacao"]).optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const updateDiaperRequestSchema = z.object({
  diaperSize: z.enum(["RN", "P", "M", "G", "XG", "XXG", "geriatrica_P", "geriatrica_M", "geriatrica_G", "geriatrica_XG"]).optional(),
  quantityRequested: z.number().optional(),
  quantityApproved: z.number().nullable().optional(),
  periodStart: z.date().optional(),
  periodEnd: z.date().optional(),
  justification: z.string().nullable().optional(),
  medicalReportUrl: z.string().nullable().optional(),
  medicalReportDate: z.date().nullable().optional(),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]).optional(),
  status: z.enum(["pendente", "em_analise", "autorizado", "parcialmente_autorizado", "negado", "entregue", "cancelado", "expirado"]).optional(),
  analysisNotes: z.string().nullable().optional(),
  approvalNotes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

export const updateDiaperStockSchema = z.object({
  name: z.string().optional(),
  brand: z.string().nullable().optional(),
  currentQuantity: z.number().optional(),
  reservedQuantity: z.number().optional(),
  availableQuantity: z.number().optional(),
  minStock: z.number().optional(),
  maxStock: z.number().nullable().optional(),
  reorderPoint: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  storageConditions: z.string().nullable().optional(),
  status: z.enum(["active", "low_stock", "expired", "depleted", "blocked"]).optional(),
  active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nenhum campo para atualizar" });

// ============================================================================
// TYPES
// ============================================================================

export type HealthUnit = typeof healthUnits.$inferSelect;
export type InsertHealthUnit = z.infer<typeof insertHealthUnitSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;

export type Citizen = typeof citizens.$inferSelect;
export type InsertCitizen = z.infer<typeof insertCitizenSchema>;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;

export type Dispensation = typeof dispensations.$inferSelect;
export type InsertDispensation = z.infer<typeof insertDispensationSchema>;

export type MedicationStock = typeof medicationStock.$inferSelect;
export type InsertMedicationStock = z.infer<typeof insertMedicationStockSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;

export type TfdVehicle = typeof tfdVehicles.$inferSelect;
export type InsertTfdVehicle = z.infer<typeof insertTfdVehicleSchema>;

export type TfdDriver = typeof tfdDrivers.$inferSelect;
export type InsertTfdDriver = z.infer<typeof insertTfdDriverSchema>;

export type TfdTrip = typeof tfdTrips.$inferSelect;
export type InsertTfdTrip = z.infer<typeof insertTfdTripSchema>;

export type TfdRequest = typeof tfdRequests.$inferSelect;
export type InsertTfdRequest = z.infer<typeof insertTfdRequestSchema>;
export type UpdateTfdRequest = z.infer<typeof updateTfdRequestSchema>;

export type TfdTripPassenger = typeof tfdTripPassengers.$inferSelect;
export type InsertTfdTripPassenger = z.infer<typeof insertTfdTripPassengerSchema>;

export type Notification = typeof notifications.$inferSelect;
export type DocumentSignature = typeof documentSignatures.$inferSelect;

export type RenameCatalog = typeof renameCatalog.$inferSelect;
export type CitizenAllergy = typeof citizenAllergies.$inferSelect;

export type SigtapTfdCatalog = typeof sigtapTfdCatalog.$inferSelect;
export type InsertSigtapTfdCatalog = z.infer<typeof insertSigtapTfdCatalogSchema>;

// Diaper Stock Types
export type DiaperStock = typeof diaperStock.$inferSelect;
export type InsertDiaperStock = z.infer<typeof insertDiaperStockSchema>;
export type UpdateDiaperStock = z.infer<typeof updateDiaperStockSchema>;

export type DiaperStockMovement = typeof diaperStockMovements.$inferSelect;
export type InsertDiaperStockMovement = z.infer<typeof insertDiaperStockMovementSchema>;

// Social Assistance Types
export type SaBeneficiary = typeof saBeneficiaries.$inferSelect;
export type InsertSaBeneficiary = z.infer<typeof insertSaBeneficiarySchema>;
export type UpdateSaBeneficiary = z.infer<typeof updateSaBeneficiarySchema>;

export type DiaperRequest = typeof diaperRequests.$inferSelect;
export type InsertDiaperRequest = z.infer<typeof insertDiaperRequestSchema>;
export type UpdateDiaperRequest = z.infer<typeof updateDiaperRequestSchema>;

export type DiaperAuthorization = typeof diaperAuthorizations.$inferSelect;
export type InsertDiaperAuthorization = z.infer<typeof insertDiaperAuthorizationSchema>;

export type DiaperDelivery = typeof diaperDeliveries.$inferSelect;
export type InsertDiaperDelivery = z.infer<typeof insertDiaperDeliverySchema>;

export type DiaperMonthlyList = typeof diaperMonthlyLists.$inferSelect;
export type InsertDiaperMonthlyList = z.infer<typeof insertDiaperMonthlyListSchema>;

export type DiaperDemandForecast = typeof diaperDemandForecast.$inferSelect;
export type InsertDiaperDemandForecast = z.infer<typeof insertDiaperDemandForecastSchema>;

export type SaAuditLog = typeof saAuditLog.$inferSelect;

// SINAN Types
export type SinanNotification = typeof sinanNotifications.$inferSelect;
export type InsertSinanNotification = z.infer<typeof insertSinanNotificationSchema>;
export type UpdateSinanNotification = z.infer<typeof updateSinanNotificationSchema>;

export type SinanLabExam = typeof sinanLabExams.$inferSelect;
export type InsertSinanLabExam = z.infer<typeof insertSinanLabExamSchema>;

export type SinanExportBatch = typeof sinanExportBatches.$inferSelect;
export type InsertSinanExportBatch = z.infer<typeof insertSinanExportBatchSchema>;
