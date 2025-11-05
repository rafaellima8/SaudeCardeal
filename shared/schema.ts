import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, date, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "medico", "enfermeiro", "acs", "farmaceutico", "gestor", "recepcao"]);
export const genderEnum = pgEnum("gender", ["M", "F", "Outro"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["waiting", "in_progress", "completed", "cancelled"]);
export const priorityEnum = pgEnum("priority", ["normal", "urgent", "emergency"]);
export const tfdStatusEnum = pgEnum("tfd_status", ["pending", "approved", "scheduled", "completed", "cancelled"]);
export const prescriptionStatusEnum = pgEnum("prescription_status", ["active", "dispensed", "cancelled"]);

// Users and Authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("recepcao"),
  unitId: uuid("unit_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Health Units (Unidades Básicas de Saúde)
export const healthUnits = pgTable("health_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cnes: varchar("cnes", { length: 7 }).notNull().unique(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Professionals
export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  specialty: text("specialty"),
  cns: varchar("cns", { length: 20 }).notNull().unique(),
  crm: varchar("crm", { length: 20 }),
  unitId: uuid("unit_id").references(() => healthUnits.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Citizens/Patients
export const citizens = pgTable("citizens", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cpf: varchar("cpf", { length: 20 }).notNull().unique(),
  cns: varchar("cns", { length: 20 }).notNull().unique(),
  birthDate: date("birth_date").notNull(),
  gender: genderEnum("gender").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  address: text("address"),
  bloodType: varchar("blood_type", { length: 5 }),
  allergies: text("allergies").array().default(sql`ARRAY[]::text[]`),
  unitId: uuid("unit_id").references(() => healthUnits.id),
  familyGroup: text("family_group"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  professionalId: uuid("professional_id").references(() => professionals.id).notNull(),
  unitId: uuid("unit_id").references(() => healthUnits.id).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  type: text("type").notNull(),
  status: appointmentStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attendance Queue (Fila de Atendimento)
export const attendanceQueue = pgTable("attendance_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  unitId: uuid("unit_id").references(() => healthUnits.id).notNull(),
  ticket: varchar("ticket", { length: 10 }).notNull(),
  priority: priorityEnum("priority").default("normal").notNull(),
  type: text("type").notNull(),
  status: attendanceStatusEnum("status").default("waiting").notNull(),
  arrivedAt: timestamp("arrived_at").defaultNow().notNull(),
  calledAt: timestamp("called_at"),
  completedAt: timestamp("completed_at"),
  professionalId: uuid("professional_id").references(() => professionals.id),
  room: text("room"),
});

// Medical Consultations
export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  professionalId: uuid("professional_id").references(() => professionals.id).notNull(),
  unitId: uuid("unit_id").references(() => healthUnits.id).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  consultationDate: timestamp("consultation_date").defaultNow().notNull(),
  type: text("type").notNull(),
  chiefComplaint: text("chief_complaint"),
  anamnesis: text("anamnesis"),
  physicalExam: text("physical_exam"),
  diagnosis: text("diagnosis"),
  cid10: text("cid10").array().default(sql`ARRAY[]::text[]`),
  treatment: text("treatment"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id").references(() => consultations.id).notNull(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  professionalId: uuid("professional_id").references(() => professionals.id).notNull(),
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions"),
  status: prescriptionStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medications (Estoque)
export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  activeIngredient: text("active_ingredient"),
  dosageForm: text("dosage_form"),
  strength: text("strength"),
  manufacturer: text("manufacturer"),
  unitId: uuid("unit_id").references(() => healthUnits.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Medication Stock
export const medicationStock = pgTable("medication_stock", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicationId: uuid("medication_id").references(() => medications.id).notNull(),
  batch: varchar("batch", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  minStock: integer("min_stock").notNull().default(100),
  unit: varchar("unit", { length: 20 }).notNull(),
  expirationDate: date("expiration_date").notNull(),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Medication Dispensing
export const medicationDispensing = pgTable("medication_dispensing", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id).notNull(),
  stockId: uuid("stock_id").references(() => medicationStock.id).notNull(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  quantity: integer("quantity").notNull(),
  dispensedBy: uuid("dispensed_by").references(() => users.id).notNull(),
  dispensedAt: timestamp("dispensed_at").defaultNow().notNull(),
});

// Exams
export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id").references(() => consultations.id),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  professionalId: uuid("professional_id").references(() => professionals.id).notNull(),
  type: text("type").notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  completionDate: timestamp("completion_date"),
  result: text("result"),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// TFD Requests
export const tfdRequests = pgTable("tfd_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id").references(() => citizens.id).notNull(),
  professionalId: uuid("professional_id").references(() => professionals.id).notNull(),
  unitId: uuid("unit_id").references(() => healthUnits.id).notNull(),
  destination: text("destination").notNull(),
  procedure: text("procedure").notNull(),
  justification: text("justification").notNull(),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  travelDate: date("travel_date"),
  returnDate: date("return_date"),
  status: tfdStatusEnum("status").default("pending").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  transportType: text("transport_type"),
  companion: boolean("companion").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Log (LGPD Compliance)
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertHealthUnitSchema = createInsertSchema(healthUnits).omit({ id: true, createdAt: true });
export const insertProfessionalSchema = createInsertSchema(professionals).omit({ id: true, createdAt: true });
export const insertCitizenSchema = createInsertSchema(citizens).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendanceQueueSchema = createInsertSchema(attendanceQueue).omit({ id: true, arrivedAt: true });
export const insertConsultationSchema = createInsertSchema(consultations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, createdAt: true });
export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true, createdAt: true });
export const insertMedicationStockSchema = createInsertSchema(medicationStock).omit({ id: true, entryDate: true, updatedAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export const insertTfdRequestSchema = createInsertSchema(tfdRequests).omit({ id: true, createdAt: true, updatedAt: true });

// Types
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
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedicationStock = z.infer<typeof insertMedicationStockSchema>;
export type MedicationStock = typeof medicationStock.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;
export type InsertTfdRequest = z.infer<typeof insertTfdRequestSchema>;
export type TfdRequest = typeof tfdRequests.$inferSelect;
