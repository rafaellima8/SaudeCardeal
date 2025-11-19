import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, gte, lte, lt } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  InsertCitizen,
  Citizen,
  InsertAppointment,
  Appointment,
  InsertConsultation,
  Consultation,
  InsertPrescription,
  Prescription,
  InsertMedication,
  Medication,
  InsertMedicationStock,
  MedicationStock,
  InsertExam,
  Exam,
  InsertTfdRequest,
  TfdRequest,
  InsertAttendanceQueue,
  AttendanceQueue,
  InsertHealthUnit,
  HealthUnit,
  InsertProfessional,
  Professional,
  User,
  InsertDwelling,
  Dwelling,
  InsertFamily,
  Family,
  InsertHomeVisit,
  HomeVisit,
} from "@shared/schema";

export interface IStorage {
  // Citizens
  getCitizens(params: { search?: string; limit?: number; offset?: number }): Promise<Citizen[]>;
  getCitizenById(id: string): Promise<Citizen | undefined>;
  getCitizenByCpf(cpf: string): Promise<Citizen | undefined>;
  getCitizenByCns(cns: string): Promise<Citizen | undefined>;
  createCitizen(citizen: InsertCitizen): Promise<Citizen>;
  updateCitizen(id: string, citizen: Partial<InsertCitizen>): Promise<Citizen | undefined>;
  deleteCitizen(id: string): Promise<boolean>;

  // Appointments
  getAppointments(params: { 
    citizenId?: string; 
    professionalId?: string; 
    unitId?: string; 
    date?: Date;
    status?: string;
    limit?: number 
  }): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Attendance Queue
  getAttendanceQueue(unitId: string, status?: string): Promise<AttendanceQueue[]>;
  createQueueEntry(entry: InsertAttendanceQueue): Promise<AttendanceQueue>;
  updateQueueEntry(id: string, entry: Partial<InsertAttendanceQueue>): Promise<AttendanceQueue | undefined>;
  deleteQueueEntry(id: string): Promise<boolean>;

  // Consultations
  getConsultations(citizenId: string): Promise<Consultation[]>;
  getConsultationById(id: string): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  deleteConsultation(id: string): Promise<boolean>;

  // Prescriptions
  getPrescriptions(params: { citizenId?: string; consultationId?: string }): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  deletePrescription(id: string): Promise<boolean>;

  // Medications
  getMedications(params: { search?: string; unitId?: string }): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  deleteMedication(id: string): Promise<boolean>;

  // Medication Stock
  getMedicationStock(medicationId: string): Promise<MedicationStock[]>;
  createMedicationStock(stock: InsertMedicationStock): Promise<MedicationStock>;
  updateMedicationStock(id: string, stock: Partial<InsertMedicationStock>): Promise<MedicationStock | undefined>;
  deleteMedicationStock(id: string): Promise<boolean>;
  getLowStockMedications(unitId: string): Promise<any[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    appointmentsToday: number;
    queueWaiting: number;
    lowStockCount: number;
    totalCitizens: number;
  }>;

  // Reports
  getReports(days: number, unitId?: string): Promise<any>;

  // Exams
  getExams(citizenId: string): Promise<Exam[]>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<boolean>;

  // TFD
  getTfdRequests(params: { citizenId?: string; status?: string }): Promise<TfdRequest[]>;
  getTfdRequestById(id: string): Promise<TfdRequest | undefined>;
  createTfdRequest(request: InsertTfdRequest): Promise<TfdRequest>;
  updateTfdRequest(id: string, request: Partial<InsertTfdRequest>): Promise<TfdRequest | undefined>;
  deleteTfdRequest(id: string): Promise<boolean>;

  // Health Units
  getHealthUnits(): Promise<HealthUnit[]>;
  getHealthUnitById(id: string): Promise<HealthUnit | undefined>;
  createHealthUnit(unit: InsertHealthUnit): Promise<HealthUnit>;
  updateHealthUnit(id: string, unit: Partial<InsertHealthUnit>): Promise<HealthUnit | undefined>;
  deleteHealthUnit(id: string): Promise<boolean>;

  // Professionals
  getProfessionals(unitId?: string): Promise<Professional[]>;
  getProfessionalById(id: string): Promise<Professional | undefined>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: string, professional: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: string): Promise<boolean>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: schema.InsertUser): Promise<User>;

  // Dashboard Stats
  getDashboardStats(unitId?: string): Promise<any>;

  // e-SUS Exports
  getEsusExports(params: { limit?: number; offset?: number }): Promise<schema.EsusExport[]>;
  getEsusExportById(id: string): Promise<schema.EsusExport | undefined>;

  // Territorial Management - Dwellings
  getDwellings(params: { unitId?: string; microarea?: string; search?: string; limit?: number; offset?: number }): Promise<Dwelling[]>;
  getDwellingById(id: string): Promise<Dwelling | undefined>;
  createDwelling(dwelling: InsertDwelling): Promise<Dwelling>;
  updateDwelling(id: string, dwelling: Partial<InsertDwelling>): Promise<Dwelling | undefined>;
  deleteDwelling(id: string): Promise<boolean>;

  // Families
  getFamilies(params: { dwellingId?: string; unitId?: string; search?: string; limit?: number; offset?: number }): Promise<Family[]>;
  getFamilyById(id: string): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  updateFamily(id: string, family: Partial<InsertFamily>): Promise<Family | undefined>;
  deleteFamily(id: string): Promise<boolean>;

  // Home Visits
  getHomeVisits(params: { familyId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<HomeVisit[]>;
  getHomeVisitById(id: string): Promise<HomeVisit | undefined>;
  createHomeVisit(visit: InsertHomeVisit): Promise<HomeVisit>;
  deleteHomeVisit(id: string): Promise<boolean>;

  // Endemic Control - Cycles
  getEndemicCycles(params: { unitId?: string; status?: string; limit?: number; offset?: number }): Promise<schema.EndemicCycle[]>;
  getEndemicCycleById(id: string): Promise<schema.EndemicCycle | undefined>;
  createEndemicCycle(cycle: schema.InsertEndemicCycle): Promise<schema.EndemicCycle>;
  updateEndemicCycle(id: string, cycle: Partial<schema.InsertEndemicCycle>): Promise<schema.EndemicCycle | undefined>;
  deleteEndemicCycle(id: string): Promise<boolean>;

  // Endemic Control - FAD Evaluations
  getFadEvaluations(params: { cycleId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<schema.FadEvaluation[]>;
  getFadEvaluationById(id: string): Promise<schema.FadEvaluation | undefined>;
  createFadEvaluation(evaluation: schema.InsertFadEvaluation): Promise<schema.FadEvaluation>;
  updateFadEvaluation(id: string, evaluation: Partial<schema.InsertFadEvaluation>): Promise<schema.FadEvaluation | undefined>;
  deleteFadEvaluation(id: string): Promise<boolean>;

  // Endemic Control - Foci
  getFoci(params: { fadId?: string; dwellingId?: string; depositType?: string; limit?: number; offset?: number }): Promise<schema.Focus[]>;
  getFocusById(id: string): Promise<schema.Focus | undefined>;
  createFocus(focus: schema.InsertFocus): Promise<schema.Focus>;
  updateFocus(id: string, focus: Partial<schema.InsertFocus>): Promise<schema.Focus | undefined>;
  deleteFocus(id: string): Promise<boolean>;

  // Endemic Control - Focal Treatments
  getFocalTreatments(params: { cycleId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<schema.FocalTreatment[]>;
  getFocalTreatmentById(id: string): Promise<schema.FocalTreatment | undefined>;
  createFocalTreatment(treatment: schema.InsertFocalTreatment): Promise<schema.FocalTreatment>;
  updateFocalTreatment(id: string, treatment: Partial<schema.InsertFocalTreatment>): Promise<schema.FocalTreatment | undefined>;
  deleteFocalTreatment(id: string): Promise<boolean>;

  // Endemic Control - Statistics & Indicators
  getEndemicStats(params: { unitId?: string; cycleId?: string; startDate?: Date; endDate?: Date }): Promise<any>;
}

export class DbStorage implements IStorage {
  // Citizens
  async getCitizens(params: { search?: string; limit?: number; offset?: number }): Promise<Citizen[]> {
    let query = db.select().from(schema.citizens);

    if (params.search) {
      query = query.where(
        or(
          like(schema.citizens.name, `%${params.search}%`),
          like(schema.citizens.cpf, `%${params.search}%`),
          like(schema.citizens.cns, `%${params.search}%`)
        )
      ) as any;
    }

    return query
      .orderBy(desc(schema.citizens.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getCitizenById(id: string): Promise<Citizen | undefined> {
    const [citizen] = await db.select().from(schema.citizens).where(eq(schema.citizens.id, id));
    return citizen;
  }

  async getCitizenByCpf(cpf: string): Promise<Citizen | undefined> {
    const [citizen] = await db.select().from(schema.citizens).where(eq(schema.citizens.cpf, cpf));
    return citizen;
  }

  async getCitizenByCns(cns: string): Promise<Citizen | undefined> {
    const [citizen] = await db.select().from(schema.citizens).where(eq(schema.citizens.cns, cns));
    return citizen;
  }

  async createCitizen(citizen: InsertCitizen): Promise<Citizen> {
    const [created] = await db.insert(schema.citizens).values(citizen).returning();
    return created;
  }

  async updateCitizen(id: string, citizen: Partial<InsertCitizen>): Promise<Citizen | undefined> {
    const [updated] = await db
      .update(schema.citizens)
      .set({ ...citizen, updatedAt: new Date() })
      .where(eq(schema.citizens.id, id))
      .returning();
    return updated;
  }

  // Appointments
  async getAppointments(params: any): Promise<Appointment[]> {
    let query = db.select().from(schema.appointments);
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.appointments.citizenId, params.citizenId));
    if (params.professionalId) conditions.push(eq(schema.appointments.professionalId, params.professionalId));
    if (params.unitId) conditions.push(eq(schema.appointments.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.appointments.status, params.status as any));
    if (params.date) {
      const startOfDay = new Date(params.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(params.date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(gte(schema.appointments.appointmentDate, startOfDay));
      conditions.push(lte(schema.appointments.appointmentDate, endOfDay));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(asc(schema.appointments.appointmentDate))
      .limit(params.limit || 100);
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(schema.appointments).where(eq(schema.appointments.id, id));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(schema.appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db
      .update(schema.appointments)
      .set(appointment)
      .where(eq(schema.appointments.id, id))
      .returning();
    return updated;
  }

  // Attendance Queue
  async getAttendanceQueue(unitId: string, status?: string): Promise<AttendanceQueue[]> {
    if (status) {
      return db.select()
        .from(schema.attendanceQueue)
        .where(
          and(
            eq(schema.attendanceQueue.unitId, unitId),
            eq(schema.attendanceQueue.status, status as any)
          )
        )
        .orderBy(
          desc(schema.attendanceQueue.priority),
          asc(schema.attendanceQueue.arrivedAt)
        );
    }

    return db.select()
      .from(schema.attendanceQueue)
      .where(eq(schema.attendanceQueue.unitId, unitId))
      .orderBy(
        desc(schema.attendanceQueue.priority),
        asc(schema.attendanceQueue.arrivedAt)
      );
  }

  async createQueueEntry(entry: InsertAttendanceQueue): Promise<AttendanceQueue> {
    const [created] = await db.insert(schema.attendanceQueue).values(entry).returning();
    return created;
  }

  async updateQueueEntry(id: string, entry: Partial<InsertAttendanceQueue>): Promise<AttendanceQueue | undefined> {
    const [updated] = await db
      .update(schema.attendanceQueue)
      .set(entry)
      .where(eq(schema.attendanceQueue.id, id))
      .returning();
    return updated;
  }

  // Consultations
  async getConsultations(citizenId: string): Promise<Consultation[]> {
    return db.select()
      .from(schema.consultations)
      .where(eq(schema.consultations.citizenId, citizenId))
      .orderBy(desc(schema.consultations.consultationDate));
  }

  async getConsultationById(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(schema.consultations).where(eq(schema.consultations.id, id));
    return consultation;
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [created] = await db.insert(schema.consultations).values(consultation).returning();
    return created;
  }

  // Prescriptions
  async getPrescriptions(params: { citizenId?: string; consultationId?: string }): Promise<Prescription[]> {
    let query = db.select().from(schema.prescriptions);

    if (params.citizenId) {
      query = query.where(eq(schema.prescriptions.citizenId, params.citizenId)) as any;
    } else if (params.consultationId) {
      query = query.where(eq(schema.prescriptions.consultationId, params.consultationId)) as any;
    }

    return query.orderBy(desc(schema.prescriptions.createdAt));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [created] = await db.insert(schema.prescriptions).values(prescription).returning();
    return created;
  }

  async updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [updated] = await db
      .update(schema.prescriptions)
      .set(prescription)
      .where(eq(schema.prescriptions.id, id))
      .returning();
    return updated;
  }

  // Medications
  async getMedications(params: { search?: string; unitId?: string }): Promise<Medication[]> {
    let query = db.select().from(schema.medications);
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.medications.unitId, params.unitId));
    if (params.search) {
      conditions.push(
        or(
          like(schema.medications.name, `%${params.search}%`),
          like(schema.medications.genericName, `%${params.search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(asc(schema.medications.name));
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [created] = await db.insert(schema.medications).values(medication).returning();
    return created;
  }

  // Medication Stock
  async getMedicationStock(medicationId: string): Promise<MedicationStock[]> {
    return db.select()
      .from(schema.medicationStock)
      .where(eq(schema.medicationStock.medicationId, medicationId))
      .orderBy(asc(schema.medicationStock.expirationDate));
  }

  async createMedicationStock(stock: InsertMedicationStock): Promise<MedicationStock> {
    const [created] = await db.insert(schema.medicationStock).values(stock).returning();
    return created;
  }

  async updateMedicationStock(id: string, stock: Partial<InsertMedicationStock>): Promise<MedicationStock | undefined> {
    const [updated] = await db
      .update(schema.medicationStock)
      .set({ ...stock, updatedAt: new Date() })
      .where(eq(schema.medicationStock.id, id))
      .returning();
    return updated;
  }

  async getLowStockMedications(unitId: string): Promise<any[]> {
    return db.select({
      medication: schema.medications,
      stock: schema.medicationStock,
    })
      .from(schema.medications)
      .innerJoin(schema.medicationStock, eq(schema.medications.id, schema.medicationStock.medicationId))
      .where(
        and(
          eq(schema.medications.unitId, unitId),
          sql`${schema.medicationStock.quantity} < ${schema.medicationStock.minStock}`
        )
      );
  }

  // Exams
  async getExams(citizenId: string): Promise<Exam[]> {
    return db.select()
      .from(schema.exams)
      .where(eq(schema.exams.citizenId, citizenId))
      .orderBy(desc(schema.exams.requestDate));
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const [created] = await db.insert(schema.exams).values(exam).returning();
    return created;
  }

  async updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam | undefined> {
    const [updated] = await db
      .update(schema.exams)
      .set(exam)
      .where(eq(schema.exams.id, id))
      .returning();
    return updated;
  }

  // TFD
  async getTfdRequests(params: { citizenId?: string; status?: string }): Promise<TfdRequest[]> {
    let query = db.select().from(schema.tfdRequests);
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.tfdRequests.citizenId, params.citizenId));
    if (params.status) conditions.push(eq(schema.tfdRequests.status, params.status as any));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.tfdRequests.requestDate));
  }

  async getTfdRequestById(id: string): Promise<TfdRequest | undefined> {
    const [request] = await db.select().from(schema.tfdRequests).where(eq(schema.tfdRequests.id, id));
    return request;
  }

  async createTfdRequest(request: InsertTfdRequest): Promise<TfdRequest> {
    const [created] = await db.insert(schema.tfdRequests).values(request).returning();
    return created;
  }

  async updateTfdRequest(id: string, request: Partial<InsertTfdRequest>): Promise<TfdRequest | undefined> {
    const [updated] = await db
      .update(schema.tfdRequests)
      .set(request)
      .where(eq(schema.tfdRequests.id, id))
      .returning();
    return updated;
  }

  // Health Units
  async getHealthUnits(): Promise<HealthUnit[]> {
    return db.select().from(schema.healthUnits).where(eq(schema.healthUnits.isActive, true));
  }

  async getHealthUnitById(id: string): Promise<HealthUnit | undefined> {
    const [unit] = await db.select().from(schema.healthUnits).where(eq(schema.healthUnits.id, id));
    return unit;
  }

  async createHealthUnit(unit: InsertHealthUnit): Promise<HealthUnit> {
    const [created] = await db.insert(schema.healthUnits).values(unit).returning();
    return created;
  }

  async updateHealthUnit(id: string, unit: Partial<InsertHealthUnit>): Promise<HealthUnit | undefined> {
    const [updated] = await db
      .update(schema.healthUnits)
      .set(unit)
      .where(eq(schema.healthUnits.id, id))
      .returning();
    return updated;
  }

  async deleteHealthUnit(id: string): Promise<boolean> {
    const result = await db.delete(schema.healthUnits).where(eq(schema.healthUnits.id, id));
    return result.changes > 0;
  }

  // Professionals
  async getProfessionals(unitId?: string): Promise<Professional[]> {
    if (unitId) {
      return db.select()
        .from(schema.professionals)
        .where(
          and(
            eq(schema.professionals.active, true),
            eq(schema.professionals.unitId, unitId)
          )
        )
        .orderBy(asc(schema.professionals.name));
    }

    return db.select()
      .from(schema.professionals)
      .where(eq(schema.professionals.active, true))
      .orderBy(asc(schema.professionals.name));
  }

  async getProfessionalById(id: string): Promise<Professional | undefined> {
    const [professional] = await db.select().from(schema.professionals).where(eq(schema.professionals.id, id));
    return professional;
  }

  async createProfessional(professional: InsertProfessional): Promise<Professional> {
    const [created] = await db.insert(schema.professionals).values(professional).returning();
    return created;
  }

  async updateProfessional(id: string, professional: Partial<InsertProfessional>): Promise<Professional | undefined> {
    const [updated] = await db
      .update(schema.professionals)
      .set(professional)
      .where(eq(schema.professionals.id, id))
      .returning();
    return updated;
  }

  async deleteProfessional(id: string): Promise<boolean> {
    const result = await db.delete(schema.professionals).where(eq(schema.professionals.id, id));
    return result.changes > 0;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(user: schema.InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  // Dashboard Stats
  async getDashboardStats(unitId?: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count appointments today
    let appointmentsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.appointments)
      .where(
        and(
          gte(schema.appointments.appointmentDate, today),
          lt(schema.appointments.appointmentDate, tomorrow),
          eq(schema.appointments.status, 'scheduled')
        )
      );
    
    if (unitId) {
      appointmentsQuery = appointmentsQuery.where(eq(schema.appointments.unitId, unitId)) as any;
    }
    
    const [{ count: appointmentsToday }] = await appointmentsQuery;

    // Count queue waiting
    let queueQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.attendanceQueue)
      .where(eq(schema.attendanceQueue.status, 'waiting'));
    
    if (unitId) {
      queueQuery = queueQuery.where(eq(schema.attendanceQueue.unitId, unitId)) as any;
    }
    
    const [{ count: queueWaiting }] = await queueQuery;

    // Count low stock items
    let stockQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.medicationStock)
      .where(sql`${schema.medicationStock.quantity} < ${schema.medicationStock.minStock}`);
    
    if (unitId) {
      stockQuery = stockQuery.where(eq(schema.medicationStock.unitId, unitId)) as any;
    }
    
    const [{ count: lowStockCount }] = await stockQuery;

    // Count total citizens
    let citizensQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.citizens);
    
    if (unitId) {
      citizensQuery = citizensQuery.where(eq(schema.citizens.unitId, unitId)) as any;
    }
    
    const [{ count: totalCitizens }] = await citizensQuery;

    return {
      appointmentsToday: Number(appointmentsToday) || 0,
      queueWaiting: Number(queueWaiting) || 0,
      lowStockCount: Number(lowStockCount) || 0,
      totalCitizens: Number(totalCitizens) || 0,
    };
  }

  // Reports
  async getReports(days: number, unitId?: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total patients
    let patientsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.citizens);
    
    if (unitId) {
      patientsQuery = patientsQuery.where(eq(schema.citizens.unitId, unitId)) as any;
    }
    
    const [{ count: totalPatients }] = await patientsQuery;

    // New patients in period
    let newPatientsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.citizens)
      .where(gte(schema.citizens.createdAt, startDate));
    
    if (unitId) {
      newPatientsQuery = newPatientsQuery.where(eq(schema.citizens.unitId, unitId)) as any;
    }
    
    const [{ count: newPatients }] = await newPatientsQuery;

    // Total consultations in period
    let consultationsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.consultations)
      .where(gte(schema.consultations.consultationDate, startDate));
    
    if (unitId) {
      consultationsQuery = consultationsQuery.where(eq(schema.consultations.unitId, unitId)) as any;
    }
    
    const [{ count: totalConsultations }] = await consultationsQuery;

    // Total prescriptions in period
    let prescriptionsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.prescriptions)
      .where(gte(schema.prescriptions.createdAt, startDate));
    
    const [{ count: totalPrescriptions }] = await prescriptionsQuery;

    // Total exams in period
    let examsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.exams)
      .where(gte(schema.exams.requestDate, startDate));
    
    if (unitId) {
      examsQuery = examsQuery.where(eq(schema.exams.unitId, unitId)) as any;
    }
    
    const [{ count: totalExams }] = await examsQuery;

    // TFD requests in period
    let tfdQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.tfdRequests)
      .where(gte(schema.tfdRequests.requestDate, startDate));
    
    if (unitId) {
      tfdQuery = tfdQuery.where(eq(schema.tfdRequests.unitId, unitId)) as any;
    }
    
    const [{ count: tfdRequests }] = await tfdQuery;

    // Consultations by type
    let consultationsByTypeQuery = db.select({
      type: schema.consultations.type,
      count: sql<number>`count(*)`
    })
      .from(schema.consultations)
      .where(gte(schema.consultations.consultationDate, startDate))
      .groupBy(schema.consultations.type);
    
    if (unitId) {
      consultationsByTypeQuery = consultationsByTypeQuery.where(eq(schema.consultations.unitId, unitId)) as any;
    }
    
    const consultationsByType = await consultationsByTypeQuery;

    return {
      summary: {
        totalPatients: Number(totalPatients) || 0,
        newPatients: Number(newPatients) || 0,
        totalConsultations: Number(totalConsultations) || 0,
        totalPrescriptions: Number(totalPrescriptions) || 0,
        totalExams: Number(totalExams) || 0,
        tfdRequests: Number(tfdRequests) || 0,
      },
      consultationsByType: consultationsByType.map(c => ({ type: c.type, count: Number(c.count) })),
      topDiagnoses: [],
      medicationUsage: [],
      ageDistribution: [],
    };
  }

  // Delete methods
  async deleteCitizen(id: string): Promise<boolean> {
    const result = await db.delete(schema.citizens).where(eq(schema.citizens.id, id));
    return result.changes > 0;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(schema.appointments).where(eq(schema.appointments.id, id));
    return result.changes > 0;
  }

  async deleteQueueEntry(id: string): Promise<boolean> {
    const result = await db.delete(schema.attendanceQueue).where(eq(schema.attendanceQueue.id, id));
    return result.changes > 0;
  }

  async deleteConsultation(id: string): Promise<boolean> {
    const result = await db.delete(schema.consultations).where(eq(schema.consultations.id, id));
    return result.changes > 0;
  }

  async deletePrescription(id: string): Promise<boolean> {
    const result = await db.delete(schema.prescriptions).where(eq(schema.prescriptions.id, id));
    return result.changes > 0;
  }

  async deleteMedication(id: string): Promise<boolean> {
    const result = await db.delete(schema.medications).where(eq(schema.medications.id, id));
    return result.changes > 0;
  }

  async deleteMedicationStock(id: string): Promise<boolean> {
    const result = await db.delete(schema.medicationStock).where(eq(schema.medicationStock.id, id));
    return result.changes > 0;
  }

  async deleteExam(id: string): Promise<boolean> {
    const result = await db.delete(schema.exams).where(eq(schema.exams.id, id));
    return result.changes > 0;
  }

  async deleteTfdRequest(id: string): Promise<boolean> {
    const result = await db.delete(schema.tfdRequests).where(eq(schema.tfdRequests.id, id));
    return result.changes > 0;
  }

  // e-SUS Exports
  async getEsusExports(params: { limit?: number; offset?: number }): Promise<schema.EsusExport[]> {
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    return await db.select()
      .from(schema.esusExports)
      .orderBy(desc(schema.esusExports.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getEsusExportById(id: string): Promise<schema.EsusExport | undefined> {
    const results = await db.select()
      .from(schema.esusExports)
      .where(eq(schema.esusExports.id, id))
      .limit(1);
    
    return results[0];
  }

  // Territorial Management - Dwellings
  async getDwellings(params: { unitId?: string; microarea?: string; search?: string; limit?: number; offset?: number }): Promise<Dwelling[]> {
    let query = db.select().from(schema.dwellings);
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.dwellings.unitId, params.unitId));
    if (params.microarea) conditions.push(eq(schema.dwellings.microarea, params.microarea));
    if (params.search) {
      conditions.push(
        or(
          like(schema.dwellings.address, `%${params.search}%`),
          like(schema.dwellings.neighborhood, `%${params.search}%`),
          like(schema.dwellings.number, `%${params.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.dwellings.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getDwellingById(id: string): Promise<Dwelling | undefined> {
    const [dwelling] = await db.select().from(schema.dwellings).where(eq(schema.dwellings.id, id));
    return dwelling;
  }

  async createDwelling(dwelling: InsertDwelling): Promise<Dwelling> {
    const [created] = await db.insert(schema.dwellings).values(dwelling).returning();
    return created;
  }

  async updateDwelling(id: string, dwelling: Partial<InsertDwelling>): Promise<Dwelling | undefined> {
    const [updated] = await db
      .update(schema.dwellings)
      .set({ ...dwelling, updatedAt: new Date() })
      .where(eq(schema.dwellings.id, id))
      .returning();
    return updated;
  }

  async deleteDwelling(id: string): Promise<boolean> {
    const result = await db.delete(schema.dwellings).where(eq(schema.dwellings.id, id));
    return result.changes > 0;
  }

  // Families
  async getFamilies(params: { dwellingId?: string; unitId?: string; search?: string; limit?: number; offset?: number }): Promise<Family[]> {
    let query = db.select().from(schema.families);
    const conditions: any[] = [];

    if (params.dwellingId) conditions.push(eq(schema.families.dwellingId, params.dwellingId));
    if (params.unitId) conditions.push(eq(schema.families.unitId, params.unitId));
    if (params.search) {
      conditions.push(like(schema.families.familyCode, `%${params.search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.families.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getFamilyById(id: string): Promise<Family | undefined> {
    const [family] = await db.select().from(schema.families).where(eq(schema.families.id, id));
    return family;
  }

  async createFamily(family: InsertFamily): Promise<Family> {
    const [created] = await db.insert(schema.families).values(family).returning();
    return created;
  }

  async updateFamily(id: string, family: Partial<InsertFamily>): Promise<Family | undefined> {
    const [updated] = await db
      .update(schema.families)
      .set({ ...family, updatedAt: new Date() })
      .where(eq(schema.families.id, id))
      .returning();
    return updated;
  }

  async deleteFamily(id: string): Promise<boolean> {
    const result = await db.delete(schema.families).where(eq(schema.families.id, id));
    return result.changes > 0;
  }

  // Home Visits
  async getHomeVisits(params: { familyId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<HomeVisit[]> {
    let query = db.select().from(schema.homeVisits);
    const conditions: any[] = [];

    if (params.familyId) conditions.push(eq(schema.homeVisits.familyId, params.familyId));
    if (params.dwellingId) conditions.push(eq(schema.homeVisits.dwellingId, params.dwellingId));
    if (params.professionalId) conditions.push(eq(schema.homeVisits.professionalId, params.professionalId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.homeVisits.visitDate))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getHomeVisitById(id: string): Promise<HomeVisit | undefined> {
    const [visit] = await db.select().from(schema.homeVisits).where(eq(schema.homeVisits.id, id));
    return visit;
  }

  async createHomeVisit(visit: InsertHomeVisit): Promise<HomeVisit> {
    const [created] = await db.insert(schema.homeVisits).values(visit).returning();
    return created;
  }

  async deleteHomeVisit(id: string): Promise<boolean> {
    const result = await db.delete(schema.homeVisits).where(eq(schema.homeVisits.id, id));
    return result.changes > 0;
  }

  // ============================================================================
  // ENDEMIC CONTROL METHODS
  // ============================================================================

  // Endemic Cycles
  async getEndemicCycles(params: { unitId?: string; status?: string; limit?: number; offset?: number }): Promise<schema.EndemicCycle[]> {
    let query = db.select().from(schema.endemicCycles);
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.endemicCycles.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.endemicCycles.status, params.status as any));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.endemicCycles.startDate))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getEndemicCycleById(id: string): Promise<schema.EndemicCycle | undefined> {
    const [cycle] = await db.select().from(schema.endemicCycles).where(eq(schema.endemicCycles.id, id));
    return cycle;
  }

  async createEndemicCycle(cycle: schema.InsertEndemicCycle): Promise<schema.EndemicCycle> {
    const [created] = await db.insert(schema.endemicCycles).values(cycle).returning();
    return created;
  }

  async updateEndemicCycle(id: string, cycle: Partial<schema.InsertEndemicCycle>): Promise<schema.EndemicCycle | undefined> {
    const [updated] = await db
      .update(schema.endemicCycles)
      .set({ ...cycle, updatedAt: new Date() })
      .where(eq(schema.endemicCycles.id, id))
      .returning();
    return updated;
  }

  async deleteEndemicCycle(id: string): Promise<boolean> {
    const result = await db.delete(schema.endemicCycles).where(eq(schema.endemicCycles.id, id));
    return result.changes > 0;
  }

  // FAD Evaluations
  async getFadEvaluations(params: { cycleId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<schema.FadEvaluation[]> {
    let query = db.select().from(schema.fadEvaluations);
    const conditions: any[] = [];

    if (params.cycleId) conditions.push(eq(schema.fadEvaluations.cycleId, params.cycleId));
    if (params.dwellingId) conditions.push(eq(schema.fadEvaluations.dwellingId, params.dwellingId));
    if (params.professionalId) conditions.push(eq(schema.fadEvaluations.professionalId, params.professionalId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.fadEvaluations.visitDate))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getFadEvaluationById(id: string): Promise<schema.FadEvaluation | undefined> {
    const [evaluation] = await db.select().from(schema.fadEvaluations).where(eq(schema.fadEvaluations.id, id));
    return evaluation;
  }

  async createFadEvaluation(evaluation: schema.InsertFadEvaluation): Promise<schema.FadEvaluation> {
    const [created] = await db.insert(schema.fadEvaluations).values(evaluation).returning();
    return created;
  }

  async updateFadEvaluation(id: string, evaluation: Partial<schema.InsertFadEvaluation>): Promise<schema.FadEvaluation | undefined> {
    const [updated] = await db
      .update(schema.fadEvaluations)
      .set(evaluation)
      .where(eq(schema.fadEvaluations.id, id))
      .returning();
    return updated;
  }

  async deleteFadEvaluation(id: string): Promise<boolean> {
    const result = await db.delete(schema.fadEvaluations).where(eq(schema.fadEvaluations.id, id));
    return result.changes > 0;
  }

  // Foci
  async getFoci(params: { fadId?: string; dwellingId?: string; depositType?: string; limit?: number; offset?: number }): Promise<schema.Focus[]> {
    let query = db.select().from(schema.foci);
    const conditions: any[] = [];

    if (params.fadId) conditions.push(eq(schema.foci.fadId, params.fadId));
    if (params.dwellingId) conditions.push(eq(schema.foci.dwellingId, params.dwellingId));
    if (params.depositType) conditions.push(eq(schema.foci.depositType, params.depositType as any));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.foci.createdAt))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getFocusById(id: string): Promise<schema.Focus | undefined> {
    const [focus] = await db.select().from(schema.foci).where(eq(schema.foci.id, id));
    return focus;
  }

  async createFocus(focus: schema.InsertFocus): Promise<schema.Focus> {
    const [created] = await db.insert(schema.foci).values(focus).returning();
    return created;
  }

  async updateFocus(id: string, focus: Partial<schema.InsertFocus>): Promise<schema.Focus | undefined> {
    const [updated] = await db
      .update(schema.foci)
      .set(focus)
      .where(eq(schema.foci.id, id))
      .returning();
    return updated;
  }

  async deleteFocus(id: string): Promise<boolean> {
    const result = await db.delete(schema.foci).where(eq(schema.foci.id, id));
    return result.changes > 0;
  }

  // Focal Treatments
  async getFocalTreatments(params: { cycleId?: string; dwellingId?: string; professionalId?: string; limit?: number; offset?: number }): Promise<schema.FocalTreatment[]> {
    let query = db.select().from(schema.focalTreatments);
    const conditions: any[] = [];

    if (params.cycleId) conditions.push(eq(schema.focalTreatments.cycleId, params.cycleId));
    if (params.dwellingId) conditions.push(eq(schema.focalTreatments.dwellingId, params.dwellingId));
    if (params.professionalId) conditions.push(eq(schema.focalTreatments.professionalId, params.professionalId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(schema.focalTreatments.treatmentDate))
      .limit(params.limit || 50)
      .offset(params.offset || 0);
  }

  async getFocalTreatmentById(id: string): Promise<schema.FocalTreatment | undefined> {
    const [treatment] = await db.select().from(schema.focalTreatments).where(eq(schema.focalTreatments.id, id));
    return treatment;
  }

  async createFocalTreatment(treatment: schema.InsertFocalTreatment): Promise<schema.FocalTreatment> {
    const [created] = await db.insert(schema.focalTreatments).values(treatment).returning();
    return created;
  }

  async updateFocalTreatment(id: string, treatment: Partial<schema.InsertFocalTreatment>): Promise<schema.FocalTreatment | undefined> {
    const [updated] = await db
      .update(schema.focalTreatments)
      .set(treatment)
      .where(eq(schema.focalTreatments.id, id))
      .returning();
    return updated;
  }

  async deleteFocalTreatment(id: string): Promise<boolean> {
    const result = await db.delete(schema.focalTreatments).where(eq(schema.focalTreatments.id, id));
    return result.changes > 0;
  }

  // Endemic Statistics & Indicators
  async getEndemicStats(params: { unitId?: string; cycleId?: string; startDate?: Date; endDate?: Date }): Promise<any> {
    const conditions: any[] = [];
    
    // IIP - Índice de Infestação Predial
    // IIP = (Imóveis positivos / Imóveis inspecionados) x 100
    let iipQuery = db.select({
      inspected: sql<number>`count(CASE WHEN ${schema.fadEvaluations.dwellingInspected} = 1 THEN 1 END)`,
      positive: sql<number>`count(CASE WHEN ${schema.fadEvaluations.containersWithLarvae} > 0 THEN 1 END)`
    }).from(schema.fadEvaluations);

    if (params.cycleId) {
      iipQuery = iipQuery.where(eq(schema.fadEvaluations.cycleId, params.cycleId)) as any;
    }

    const [iipData] = await iipQuery;
    const iip = iipData.inspected > 0 ? (Number(iipData.positive) / Number(iipData.inspected)) * 100 : 0;

    // IB - Índice de Breteau
    // IB = (Recipientes positivos / Imóveis inspecionados) x 100
    let ibQuery = db.select({
      inspected: sql<number>`count(CASE WHEN ${schema.fadEvaluations.dwellingInspected} = 1 THEN 1 END)`,
      containers: sql<number>`sum(${schema.fadEvaluations.containersWithLarvae})`
    }).from(schema.fadEvaluations);

    if (params.cycleId) {
      ibQuery = ibQuery.where(eq(schema.fadEvaluations.cycleId, params.cycleId)) as any;
    }

    const [ibData] = await ibQuery;
    const ib = ibData.inspected > 0 ? (Number(ibData.containers) / Number(ibData.inspected)) * 100 : 0;

    // Total de focos por tipo de depósito
    let fociByTypeQuery = db.select({
      depositType: schema.foci.depositType,
      count: sql<number>`count(*)`
    }).from(schema.foci).groupBy(schema.foci.depositType);

    const fociByType = await fociByTypeQuery;

    // Total de tratamentos por tipo
    let treatmentsByTypeQuery = db.select({
      treatmentType: schema.focalTreatments.treatmentType,
      count: sql<number>`count(*)`
    }).from(schema.focalTreatments).groupBy(schema.focalTreatments.treatmentType);

    const treatmentsByType = await treatmentsByTypeQuery;

    return {
      indicators: {
        iip: Number(iip.toFixed(2)),
        ib: Number(ib.toFixed(2)),
        dwellingsInspected: Number(iipData.inspected) || 0,
        dwellingsPositive: Number(iipData.positive) || 0,
        containersWithLarvae: Number(ibData.containers) || 0,
      },
      fociByType: fociByType.map(f => ({
        depositType: f.depositType,
        count: Number(f.count)
      })),
      treatmentsByType: treatmentsByType.map(t => ({
        treatmentType: t.treatmentType,
        count: Number(t.count)
      })),
    };
  }
}

export const storage = new DbStorage();