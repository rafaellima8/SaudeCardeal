import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, gte, lte } from "drizzle-orm";
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
} from "@shared/schema";

export interface IStorage {
  // Citizens
  getCitizens(params: { search?: string; limit?: number; offset?: number }): Promise<Citizen[]>;
  getCitizenById(id: string): Promise<Citizen | undefined>;
  getCitizenByCpf(cpf: string): Promise<Citizen | undefined>;
  getCitizenByCns(cns: string): Promise<Citizen | undefined>;
  createCitizen(citizen: InsertCitizen): Promise<Citizen>;
  updateCitizen(id: string, citizen: Partial<InsertCitizen>): Promise<Citizen | undefined>;

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

  // Attendance Queue
  getAttendanceQueue(unitId: string, status?: string): Promise<AttendanceQueue[]>;
  createQueueEntry(entry: InsertAttendanceQueue): Promise<AttendanceQueue>;
  updateQueueEntry(id: string, entry: Partial<InsertAttendanceQueue>): Promise<AttendanceQueue | undefined>;
  
  // Consultations
  getConsultations(citizenId: string): Promise<Consultation[]>;
  getConsultationById(id: string): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;

  // Prescriptions
  getPrescriptions(params: { citizenId?: string; consultationId?: string }): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;

  // Medications
  getMedications(params: { search?: string; unitId?: string }): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  
  // Medication Stock
  getMedicationStock(medicationId: string): Promise<MedicationStock[]>;
  createMedicationStock(stock: InsertMedicationStock): Promise<MedicationStock>;
  updateMedicationStock(id: string, stock: Partial<InsertMedicationStock>): Promise<MedicationStock | undefined>;
  getLowStockMedications(unitId: string): Promise<any[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    appointmentsToday: number;
    queueWaiting: number;
    lowStockCount: number;
    totalCitizens: number;
  }>;

  // Exams
  getExams(citizenId: string): Promise<Exam[]>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam | undefined>;

  // TFD
  getTfdRequests(params: { citizenId?: string; status?: string }): Promise<TfdRequest[]>;
  getTfdRequestById(id: string): Promise<TfdRequest | undefined>;
  createTfdRequest(request: InsertTfdRequest): Promise<TfdRequest>;
  updateTfdRequest(id: string, request: Partial<InsertTfdRequest>): Promise<TfdRequest | undefined>;

  // Health Units
  getHealthUnits(): Promise<HealthUnit[]>;
  getHealthUnitById(id: string): Promise<HealthUnit | undefined>;
  createHealthUnit(unit: InsertHealthUnit): Promise<HealthUnit>;

  // Professionals
  getProfessionals(unitId?: string): Promise<Professional[]>;
  getProfessionalById(id: string): Promise<Professional | undefined>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: schema.InsertUser): Promise<User>;

  // Dashboard Stats
  getDashboardStats(unitId?: string): Promise<any>;
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
      .set({ ...appointment, updatedAt: new Date() })
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
          like(schema.medications.category, `%${params.search}%`)
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
      .set({ ...request, updatedAt: new Date() })
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

  // Professionals
  async getProfessionals(unitId?: string): Promise<Professional[]> {
    if (unitId) {
      return db.select()
        .from(schema.professionals)
        .where(
          and(
            eq(schema.professionals.isActive, true),
            eq(schema.professionals.unitId, unitId)
          )
        )
        .orderBy(asc(schema.professionals.name));
    }

    return db.select()
      .from(schema.professionals)
      .where(eq(schema.professionals.isActive, true))
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

    // Get today's appointments count
    const appointmentsQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.appointments)
      .where(
        and(
          gte(schema.appointments.appointmentDate, today),
          lte(schema.appointments.appointmentDate, tomorrow),
          unitId ? eq(schema.appointments.unitId, unitId) : undefined
        )
      );

    const [{ count: appointmentsToday }] = await appointmentsQuery as any;

    // Get queue waiting count
    const queueQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.attendanceQueue)
      .where(
        and(
          eq(schema.attendanceQueue.status, 'waiting'),
          unitId ? eq(schema.attendanceQueue.unitId, unitId) : undefined
        )
      );

    const [{ count: queueWaiting }] = await queueQuery as any;

    // Get low stock count
    const lowStockQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.medications)
      .innerJoin(schema.medicationStock, eq(schema.medications.id, schema.medicationStock.medicationId))
      .where(
        and(
          unitId ? eq(schema.medications.unitId, unitId) : undefined,
          sql`${schema.medicationStock.quantity} < ${schema.medicationStock.minStock}`
        )
      );

    const [{ count: lowStockCount }] = await lowStockQuery as any;

    // Get total citizens
    const citizensQuery = db.select({ count: sql<number>`count(*)` })
      .from(schema.citizens);

    const [{ count: totalCitizens }] = await citizensQuery as any;

    return {
      appointmentsToday: Number(appointmentsToday),
      queueWaiting: Number(queueWaiting),
      lowStockCount: Number(lowStockCount),
      totalCitizens: Number(totalCitizens),
    };
  }
}

export const storage = new DbStorage();
