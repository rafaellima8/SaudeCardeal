import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, gte, lte, lt, isNull } from "drizzle-orm";
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
  InsertDispensation,
  Dispensation,
  InsertMedication,
  Medication,
  InsertMedicationStock,
  MedicationStock,
  InsertExam,
  Exam,
  InsertMedicalReferral,
  MedicalReferral,
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
  InsertFamilyMember,
  FamilyMember,
  InsertHomeVisit,
  HomeVisit,
  InsertCitizenProblem,
  CitizenProblem,
} from "@shared/schema";

export interface IStorage {
  // Citizens
  getCitizens(params: { search?: string; limit?: number; offset?: number; unitId?: string }): Promise<Citizen[]>;
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
  getAttendanceQueue(params: { unitId: string; professionalId?: string; status?: string }): Promise<AttendanceQueue[]>;
  getAttendanceQueueByCareLine(params: { unitId: string; careLineId: string; status?: string }): Promise<AttendanceQueue[]>;
  getQueueEntry(id: string): Promise<AttendanceQueue | undefined>; // Get single queue entry by ID ✅
  createQueueEntry(entry: InsertAttendanceQueue): Promise<AttendanceQueue>;
  updateQueueEntry(id: string, entry: Partial<InsertAttendanceQueue>): Promise<AttendanceQueue | undefined>;
  deleteQueueEntry(id: string): Promise<boolean>;

  // Consultations
  getConsultations(params?: { citizenId?: string; professionalId?: string; unitId?: string; limit?: number }): Promise<Consultation[]>;
  getConsultationById(id: string): Promise<Consultation | undefined>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  updateConsultation(id: string, consultation: Partial<InsertConsultation>): Promise<Consultation | undefined>;
  createConsultationWithPrescriptions(
    consultation: InsertConsultation, 
    prescriptions: Omit<InsertPrescription, 'consultationId' | 'citizenId' | 'professionalId'>[]
  ): Promise<{ consultation: Consultation; prescriptions: Prescription[] }>;
  deleteConsultation(id: string): Promise<boolean>;

  // Medical Attendance (Atendimento Médico - e-SUS PEC) ✅
  getNextPatientInQueue(unitId: string, professionalId?: string): Promise<AttendanceQueue | undefined>;
  startConsultation(queueId: string, professionalId: string, unitId: string): Promise<{ // Multi-tenant safety ✅
    consultation: Consultation;
    patient: Citizen;
    history: {
      consultations: Consultation[];
      prescriptions: Prescription[];
      exams: Exam[];
      problems: CitizenProblem[];
    };
  }>;
  getPatientHistory(citizenId: string, unitId: string): Promise<{ // Multi-tenant safety ✅
    consultations: Consultation[];
    prescriptions: Prescription[];
    exams: Exam[];
    problems: CitizenProblem[];
  }>;

  // Citizen Problems/Conditions (Problemas do Cidadão - CIAP-2) ✅
  getCitizenProblems(citizenId: string, unitId: string): Promise<CitizenProblem[]>; // Multi-tenant safety ✅
  createCitizenProblem(problem: InsertCitizenProblem): Promise<CitizenProblem>;
  updateCitizenProblem(id: string, citizenId: string, problem: Partial<InsertCitizenProblem>): Promise<CitizenProblem | undefined>; // Security ✅
  deleteCitizenProblem(id: string, citizenId: string): Promise<boolean>; // Security ✅

  // Clinical Protocols
  getClinicalProtocols(params: { active?: boolean }): Promise<any[]>;
  getClinicalProtocolById(id: string): Promise<any | undefined>;
  createClinicalProtocol(protocol: any): Promise<any>;
  updateClinicalProtocol(id: string, protocol: any): Promise<any | undefined>;
  deleteClinicalProtocol(id: string): Promise<boolean>;

  // Consultation Templates (Dynamic Forms)
  getConsultationTemplates(params: { careLineId?: string; active?: boolean }): Promise<any[]>;
  getConsultationTemplateById(id: string): Promise<any | undefined>;
  createConsultationTemplate(template: any): Promise<any>;
  updateConsultationTemplate(id: string, template: any): Promise<any | undefined>;
  deleteConsultationTemplate(id: string): Promise<boolean>;
  getTemplateFields(templateId: string): Promise<any[]>;

  // Prescriptions
  getPrescriptions(params: { 
    citizenId?: string; 
    consultationId?: string; 
    professionalId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    unitId?: string;
  }): Promise<any[]>;
  getPrescriptionById(id: string): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  deletePrescription(id: string): Promise<boolean>;

  // Dispensations
  createDispensation(dispensation: InsertDispensation): Promise<Dispensation>;
  getDispensations(params: { 
    unitId?: string; 
    citizenId?: string; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number 
  }): Promise<Dispensation[]>;

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
  
  // Stock Movements
  createStockMovement(movement: any): Promise<any>;
  getStockMovements(params: { unitId?: string; medicationId?: string; limit?: number }): Promise<any[]>;

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
  getExams(params: { citizenId?: string; consultationId?: string; unitId?: string }): Promise<Exam[]>;
  getExamById(id: string): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<boolean>;

  // Medical Referrals
  getMedicalReferrals(params: { citizenId?: string; consultationId?: string; unitId?: string; status?: string }): Promise<MedicalReferral[]>;
  getMedicalReferralById(id: string): Promise<MedicalReferral | undefined>;
  createMedicalReferral(referral: InsertMedicalReferral): Promise<MedicalReferral>;
  updateMedicalReferral(id: string, referral: Partial<InsertMedicalReferral>): Promise<MedicalReferral | undefined>;
  deleteMedicalReferral(id: string): Promise<boolean>;

  // TFD
  getTfdRequests(params: { citizenId?: string; status?: string; unitId?: string }): Promise<TfdRequest[]>;
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
  getEsusExports(params: { limit?: number; offset?: number }): Promise<(typeof schema.esusExports.$inferSelect)[]>;
  getEsusExportById(id: string): Promise<typeof schema.esusExports.$inferSelect | undefined>;

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
  
  // Family Members
  getFamilyMembers(familyId: string): Promise<FamilyMember[]>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, member: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: string): Promise<boolean>;
  transferFamilyMember(memberId: string, newFamilyId: string): Promise<FamilyMember | undefined>;
  
  // Territorial Hierarchy (Complete Integration)
  getDwellingWithFamilies(dwellingId: string): Promise<{ dwelling: Dwelling; families: Array<Family & { members: Citizen[] }> }>;
  getFamilyWithMembers(familyId: string): Promise<{ family: Family; members: Citizen[]; dwelling: Dwelling }>;
  getTerritorialHierarchy(dwellingId: string): Promise<{ 
    dwelling: Dwelling; 
    families: Array<{ family: Family; members: Citizen[] }> 
  }>;

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

  // Dynamic Forms System - Specialties
  getSpecialties(params?: { active?: boolean }): Promise<schema.Specialty[]>;
  getSpecialtyById(id: string): Promise<schema.Specialty | undefined>;
  getSpecialtyByCode(code: string): Promise<schema.Specialty | undefined>;
  getSpecialtyBySlug(slug: string): Promise<schema.Specialty | undefined>;
  createSpecialty(specialty: schema.InsertSpecialty): Promise<schema.Specialty>;
  updateSpecialty(id: string, specialty: Partial<schema.InsertSpecialty>): Promise<schema.Specialty | undefined>;

  // Referral Rules (Regras de Encaminhamento Inteligente)
  getReferralRules(params?: { specialtyId?: string; active?: boolean }): Promise<schema.ReferralRule[]>;
  getReferralRuleById(id: string): Promise<schema.ReferralRule | undefined>;
  createReferralRule(rule: schema.InsertReferralRule): Promise<schema.ReferralRule>;
  updateReferralRule(id: string, rule: Partial<schema.InsertReferralRule>): Promise<schema.ReferralRule | undefined>;
  deleteReferralRule(id: string): Promise<boolean>;
  getReferralRulesWithSpecialties(): Promise<Array<schema.ReferralRule & { specialty: schema.Specialty }>>;

  // Dynamic Forms System - Care Lines
  getCareLines(params?: { specialtyId?: string; active?: boolean }): Promise<schema.CareLine[]>;
  getCareLineById(id: string): Promise<schema.CareLine | undefined>;
  getCareLineByCode(code: string): Promise<schema.CareLine | undefined>;
  createCareLine(careLine: schema.InsertCareLine): Promise<schema.CareLine>;
  updateCareLine(id: string, careLine: Partial<schema.InsertCareLine>): Promise<schema.CareLine | undefined>;

  // Dynamic Forms System - Consultation Templates
  getConsultationTemplates(params?: { specialtyId?: string; careLineId?: string; active?: boolean }): Promise<schema.ConsultationTemplate[]>;
  getConsultationTemplateById(id: string): Promise<schema.ConsultationTemplate | undefined>;
  createConsultationTemplate(template: schema.InsertConsultationTemplate): Promise<schema.ConsultationTemplate>;
  updateConsultationTemplate(id: string, template: Partial<schema.InsertConsultationTemplate>): Promise<schema.ConsultationTemplate | undefined>;

  // Dynamic Forms System - Template Fields
  getTemplateFields(templateId: string): Promise<schema.TemplateField[]>;
  getTemplateFieldById(id: string): Promise<schema.TemplateField | undefined>;
  createTemplateField(field: schema.InsertTemplateField): Promise<schema.TemplateField>;
  updateTemplateField(id: string, field: Partial<schema.InsertTemplateField>): Promise<schema.TemplateField | undefined>;
  deleteTemplateField(id: string): Promise<boolean>;

  // Dynamic Forms System - Consultation Field Data
  getConsultationFieldData(consultationId: string): Promise<schema.ConsultationFieldData[]>;
  saveConsultationFieldData(consultationId: string, fieldData: Array<{ fieldId: string; fieldValue: string }>): Promise<schema.ConsultationFieldData[]>;
  deleteConsultationFieldData(consultationId: string): Promise<boolean>;

  // Dynamic Forms System - Clinical Protocols
  getClinicalProtocols(params?: { careLineId?: string; specialtyId?: string; active?: boolean }): Promise<schema.ClinicalProtocol[]>;
  getClinicalProtocolById(id: string): Promise<schema.ClinicalProtocol | undefined>;
  evaluateProtocols(fieldData: Record<string, any>, careLineId?: string, specialtyId?: string): Promise<schema.ClinicalProtocol[]>;
  createClinicalProtocol(protocol: schema.InsertClinicalProtocol): Promise<schema.ClinicalProtocol>;
  updateClinicalProtocol(id: string, protocol: Partial<schema.InsertClinicalProtocol>): Promise<schema.ClinicalProtocol | undefined>;

  // Dynamic Forms System - Therapeutic Plans
  getTherapeuticPlans(params: { citizenId?: string; careLineId?: string; status?: string; unitId?: string }): Promise<schema.TherapeuticPlan[]>;
  getTherapeuticPlanById(id: string): Promise<schema.TherapeuticPlan | undefined>;
  createTherapeuticPlan(plan: schema.InsertTherapeuticPlan): Promise<schema.TherapeuticPlan>;
  updateTherapeuticPlan(id: string, plan: Partial<schema.InsertTherapeuticPlan>): Promise<schema.TherapeuticPlan | undefined>;
  deleteTherapeuticPlan(id: string): Promise<boolean>;

  // Dynamic Forms System - Therapeutic Plan Items
  getTherapeuticPlanItems(planId: string): Promise<schema.TherapeuticPlanItem[]>;
  createTherapeuticPlanItem(item: schema.InsertTherapeuticPlanItem): Promise<schema.TherapeuticPlanItem>;
  updateTherapeuticPlanItem(id: string, item: Partial<schema.InsertTherapeuticPlanItem>): Promise<schema.TherapeuticPlanItem | undefined>;
  deleteTherapeuticPlanItem(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // Citizens
  async getCitizens(params: { search?: string; limit?: number; offset?: number; unitId?: string }): Promise<Citizen[]> {
    const conditions: any[] = [];

    if (params.search) {
      conditions.push(
        or(
          like(schema.citizens.name, `%${params.search}%`),
          like(schema.citizens.cpf, `%${params.search}%`),
          like(schema.citizens.cns, `%${params.search}%`)
        )
      );
    }
    
    // Multi-tenant filtering: scope to unit if provided
    if (params.unitId) {
      conditions.push(eq(schema.citizens.unitId, params.unitId));
    }

    let query = db.select().from(schema.citizens);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
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
  async getAttendanceQueue(params: { unitId: string; professionalId?: string; status?: string }): Promise<AttendanceQueue[]> {
    const conditions = [eq(schema.attendanceQueue.unitId, params.unitId)];

    if (params.status) {
      conditions.push(eq(schema.attendanceQueue.status, params.status as any));
    }

    if (params.professionalId) {
      conditions.push(eq(schema.attendanceQueue.professionalId, params.professionalId));
    }

    return db.select()
      .from(schema.attendanceQueue)
      .where(and(...conditions))
      .orderBy(
        desc(schema.attendanceQueue.priority),
        asc(schema.attendanceQueue.arrivedAt)
      );
  }

  async getAttendanceQueueByCareLine(params: { unitId: string; careLineId: string; status?: string }): Promise<AttendanceQueue[]> {
    const conditions = [
      eq(schema.attendanceQueue.unitId, params.unitId),
      eq(schema.attendanceQueue.careLineId, params.careLineId)
    ];

    if (params.status) {
      conditions.push(eq(schema.attendanceQueue.status, params.status as any));
    }

    return db.select()
      .from(schema.attendanceQueue)
      .where(and(...conditions))
      .orderBy(
        desc(schema.attendanceQueue.priority),
        asc(schema.attendanceQueue.arrivedAt)
      );
  }

  async getQueueEntry(id: string): Promise<AttendanceQueue | undefined> {
    const result = await db.select()
      .from(schema.attendanceQueue)
      .where(eq(schema.attendanceQueue.id, id))
      .limit(1);
    return result[0];
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
  async getConsultations(params?: { citizenId?: string; professionalId?: string; unitId?: string; limit?: number }): Promise<any[]> {
    const conditions = [];
    
    if (params?.citizenId) {
      conditions.push(eq(schema.consultations.citizenId, params.citizenId));
    }
    if (params?.professionalId) {
      conditions.push(eq(schema.consultations.professionalId, params.professionalId));
    }
    // Multi-tenant filtering: scope to unit if provided
    if (params?.unitId) {
      conditions.push(eq(schema.consultations.unitId, params.unitId));
    }

    let query = db.select({
      id: schema.consultations.id,
      citizenId: schema.consultations.citizenId,
      professionalId: schema.consultations.professionalId,
      unitId: schema.consultations.unitId,
      appointmentId: schema.consultations.appointmentId,
      consultationDate: schema.consultations.consultationDate,
      type: schema.consultations.type,
      // SOAP fields ✅
      subjective: schema.consultations.subjective,
      objective: schema.consultations.objective,
      assessment: schema.consultations.assessment,
      plan: schema.consultations.plan,
      vitalSigns: schema.consultations.vitalSigns,
      ciap2Codes: schema.consultations.ciap2Codes,
      cid10Codes: schema.consultations.cid10Codes,
      // Legacy fields
      chiefComplaint: schema.consultations.chiefComplaint,
      historyOfPresentIllness: schema.consultations.historyOfPresentIllness,
      physicalExam: schema.consultations.physicalExam,
      diagnosis: schema.consultations.diagnosis,
      treatmentPlan: schema.consultations.treatmentPlan,
      notes: schema.consultations.notes,
      createdAt: schema.consultations.createdAt,
      citizen: {
        name: schema.citizens.name,
        cns: schema.citizens.cns,
      },
      professional: {
        name: schema.professionals.name,
      },
    })
      .from(schema.consultations)
      .leftJoin(schema.citizens, eq(schema.consultations.citizenId, schema.citizens.id))
      .leftJoin(schema.professionals, eq(schema.consultations.professionalId, schema.professionals.id))
      .$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(schema.consultations.consultationDate));

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    return query;
  }

  async getConsultationById(id: string): Promise<Consultation | undefined> {
    const [consultation] = await db.select().from(schema.consultations).where(eq(schema.consultations.id, id));
    return consultation;
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [created] = await db.insert(schema.consultations).values(consultation).returning();
    return created;
  }

  async updateConsultation(id: string, consultation: Partial<InsertConsultation>): Promise<Consultation | undefined> {
    const [updated] = await db
      .update(schema.consultations)
      .set(consultation)
      .where(eq(schema.consultations.id, id))
      .returning();
    return updated;
  }

  async createConsultationWithPrescriptions(
    consultation: InsertConsultation,
    prescriptions: Omit<InsertPrescription, 'consultationId' | 'citizenId' | 'professionalId'>[]
  ): Promise<{ consultation: Consultation; prescriptions: Prescription[] }> {
    return await db.transaction(async (tx) => {
      // 1. Criar consulta
      const [createdConsultation] = await tx
        .insert(schema.consultations)
        .values(consultation)
        .returning();

      // 2. Criar prescrições vinculadas
      const createdPrescriptions: Prescription[] = [];
      
      if (prescriptions.length > 0) {
        for (const prescription of prescriptions) {
          const [created] = await tx
            .insert(schema.prescriptions)
            .values({
              ...prescription,
              consultationId: createdConsultation.id,
              citizenId: consultation.citizenId,
              professionalId: consultation.professionalId,
            })
            .returning();
          createdPrescriptions.push(created);
        }
      }

      return {
        consultation: createdConsultation,
        prescriptions: createdPrescriptions,
      };
    });
  }

  // Prescriptions
  async getPrescriptions(params: { 
    citizenId?: string; 
    consultationId?: string; 
    professionalId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    unitId?: string;
  }): Promise<any[]> {
    const conditions = [];
    
    if (params.citizenId) {
      conditions.push(eq(schema.prescriptions.citizenId, params.citizenId));
    }
    if (params.consultationId) {
      conditions.push(eq(schema.prescriptions.consultationId, params.consultationId));
    }
    if (params.professionalId) {
      conditions.push(eq(schema.prescriptions.professionalId, params.professionalId));
    }
    if (params.status) {
      conditions.push(eq(schema.prescriptions.status, params.status));
    }
    if (params.unitId) {
      conditions.push(eq(schema.prescriptions.unitId, params.unitId));
    }
    if (params.startDate) {
      conditions.push(sql`${schema.prescriptions.createdAt} >= ${params.startDate}`);
    }
    if (params.endDate) {
      conditions.push(sql`${schema.prescriptions.createdAt} <= ${params.endDate}`);
    }

    let query = db.select({
      id: schema.prescriptions.id,
      consultationId: schema.prescriptions.consultationId,
      citizenId: schema.prescriptions.citizenId,
      professionalId: schema.prescriptions.professionalId,
      medication: schema.prescriptions.medication,
      dosage: schema.prescriptions.dosage,
      frequency: schema.prescriptions.frequency,
      duration: schema.prescriptions.duration,
      quantity: schema.prescriptions.quantity,
      instructions: schema.prescriptions.instructions,
      createdAt: schema.prescriptions.createdAt,
      citizen: {
        name: schema.citizens.name,
        cns: schema.citizens.cns,
        birthDate: schema.citizens.birthDate,
      },
      professional: {
        name: schema.professionals.name,
        specialty: schema.professionals.specialty,
        councilType: schema.professionals.councilType,
        councilNumber: schema.professionals.councilNumber,
      },
      consultation: {
        consultationDate: schema.consultations.consultationDate,
        type: schema.consultations.type,
      },
    })
      .from(schema.prescriptions)
      .leftJoin(schema.citizens, eq(schema.prescriptions.citizenId, schema.citizens.id))
      .leftJoin(schema.professionals, eq(schema.prescriptions.professionalId, schema.professionals.id))
      .leftJoin(schema.consultations, eq(schema.prescriptions.consultationId, schema.consultations.id))
      .$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(schema.prescriptions.createdAt));
  }

  async getPrescriptionById(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.id, id))
      .limit(1);
    return prescription;
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

  // Dispensations
  async createDispensation(dispensation: InsertDispensation): Promise<Dispensation> {
    const [created] = await db.insert(schema.dispensations).values(dispensation).returning();
    return created;
  }

  async getDispensations(params: { 
    unitId?: string; 
    citizenId?: string; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number 
  }): Promise<Dispensation[]> {
    const conditions = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.dispensations.unitId, params.unitId));
    }
    if (params.citizenId) {
      conditions.push(eq(schema.dispensations.citizenId, params.citizenId));
    }
    if (params.startDate) {
      conditions.push(gte(schema.dispensations.dispensedAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(schema.dispensations.dispensedAt, params.endDate));
    }

    let query = db.select().from(schema.dispensations).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(schema.dispensations.dispensedAt)) as any;

    if (params.limit) {
      query = query.limit(params.limit) as any;
    }

    return query;
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
  async getExams(params: { citizenId?: string; consultationId?: string; unitId?: string }): Promise<Exam[]> {
    const conditions = [];
    if (params.citizenId) conditions.push(eq(schema.exams.citizenId, params.citizenId));
    if (params.consultationId) conditions.push(eq(schema.exams.consultationId, params.consultationId));
    if (params.unitId) conditions.push(eq(schema.exams.unitId, params.unitId));

    return db.select()
      .from(schema.exams)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.exams.requestDate));
  }

  async getExamById(id: string): Promise<Exam | undefined> {
    const [exam] = await db.select()
      .from(schema.exams)
      .where(eq(schema.exams.id, id));
    return exam;
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

  // Medical Referrals
  async getMedicalReferrals(params: { 
    citizenId?: string; 
    consultationId?: string; 
    unitId?: string; 
    status?: string;
  }): Promise<MedicalReferral[]> {
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.medicalReferrals.citizenId, params.citizenId));
    if (params.consultationId) conditions.push(eq(schema.medicalReferrals.consultationId, params.consultationId));
    if (params.unitId) conditions.push(eq(schema.medicalReferrals.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.medicalReferrals.status, params.status as any));

    let query = db.select().from(schema.medicalReferrals);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.medicalReferrals.referralDate));
  }

  async getMedicalReferralById(id: string): Promise<MedicalReferral | undefined> {
    const [referral] = await db.select().from(schema.medicalReferrals).where(eq(schema.medicalReferrals.id, id));
    return referral;
  }

  async createMedicalReferral(referral: InsertMedicalReferral): Promise<MedicalReferral> {
    const [created] = await db.insert(schema.medicalReferrals).values(referral).returning();
    return created;
  }

  async updateMedicalReferral(id: string, referral: Partial<InsertMedicalReferral>): Promise<MedicalReferral | undefined> {
    const [updated] = await db
      .update(schema.medicalReferrals)
      .set({ ...referral, updatedAt: new Date() })
      .where(eq(schema.medicalReferrals.id, id))
      .returning();
    return updated;
  }

  // TFD
  async getTfdRequests(params: { citizenId?: string; status?: string; unitId?: string }): Promise<TfdRequest[]> {
    let query = db.select().from(schema.tfdRequests);
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.tfdRequests.citizenId, params.citizenId));
    if (params.status) conditions.push(eq(schema.tfdRequests.status, params.status as any));
    // Multi-tenant filtering: scope to origin unit if provided
    if (params.unitId) conditions.push(eq(schema.tfdRequests.originUnitId, params.unitId));

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

    // Top diagnoses
    const topDiagnosesQuery = db.select({
      diagnosis: schema.consultations.diagnosis,
      count: sql<number>`count(*)`
    })
      .from(schema.consultations)
      .where(
        and(
          gte(schema.consultations.consultationDate, startDate),
          sql`${schema.consultations.diagnosis} IS NOT NULL AND ${schema.consultations.diagnosis} != ''`
        )
      )
      .groupBy(schema.consultations.diagnosis)
      .orderBy(desc(sql`count(*)`))
      .limit(5);
    
    const topDiagnoses = await topDiagnosesQuery;

    // Medication usage (top 5 from prescriptions)
    const medicationUsageQuery = db.select({
      medication: schema.prescriptions.medication,
      quantity: sql<number>`sum(${schema.prescriptions.quantity})`
    })
      .from(schema.prescriptions)
      .where(gte(schema.prescriptions.createdAt, startDate))
      .groupBy(schema.prescriptions.medication)
      .orderBy(desc(sql`sum(${schema.prescriptions.quantity})`))
      .limit(5);
    
    const medicationUsage = await medicationUsageQuery;

    // Age distribution
    const ageDistributionQuery = db.select({
      range: sql<string>`
        CASE
          WHEN (unixepoch('now') - ${schema.citizens.birthDate}) / 31557600 < 18 THEN '0-17 anos'
          WHEN (unixepoch('now') - ${schema.citizens.birthDate}) / 31557600 < 30 THEN '18-29 anos'
          WHEN (unixepoch('now') - ${schema.citizens.birthDate}) / 31557600 < 45 THEN '30-44 anos'
          WHEN (unixepoch('now') - ${schema.citizens.birthDate}) / 31557600 < 60 THEN '45-59 anos'
          ELSE '60+ anos'
        END
      `,
      count: sql<number>`count(*)`
    })
      .from(schema.citizens)
      .groupBy(sql`range`)
      .orderBy(sql`
        CASE range
          WHEN '0-17 anos' THEN 1
          WHEN '18-29 anos' THEN 2
          WHEN '30-44 anos' THEN 3
          WHEN '45-59 anos' THEN 4
          WHEN '60+ anos' THEN 5
        END
      `);
    
    const ageDistribution = await ageDistributionQuery;

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
      topDiagnoses: topDiagnoses.map(d => ({ diagnosis: d.diagnosis || 'Não especificado', count: Number(d.count) })),
      medicationUsage: medicationUsage.map(m => ({ medication: m.medication, quantity: Number(m.quantity) })),
      ageDistribution: ageDistribution.map(a => ({ range: a.range, count: Number(a.count) })),
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

  // ============================================================================
  // MEDICAL ATTENDANCE METHODS (Atendimento Médico - e-SUS PEC) ✅
  // ============================================================================

  async getNextPatientInQueue(unitId: string, professionalId?: string): Promise<AttendanceQueue | undefined> {
    const conditions: any[] = [
      eq(schema.attendanceQueue.unitId, unitId),
      eq(schema.attendanceQueue.status, 'waiting'), // APENAS waiting - exclui in_progress, completed, cancelled ✅
    ];

    if (professionalId) {
      // Se especificado profissional, busca pacientes vinculados a ele ou sem profissional definido
      conditions.push(
        or(
          eq(schema.attendanceQueue.professionalId, professionalId),
          isNull(schema.attendanceQueue.professionalId)
        )!
      );
    }

    const results = await db.select()
      .from(schema.attendanceQueue)
      .where(and(...conditions))
      .orderBy(
        desc(schema.attendanceQueue.priority), // Urgências primeiro
        asc(schema.attendanceQueue.arrivedAt)   // Depois por ordem de chegada
      )
      .limit(1);

    return results[0];
  }

  async startConsultation(queueId: string, professionalId: string, unitId: string): Promise<{ // Multi-tenant safety ✅
    consultation: Consultation;
    patient: Citizen;
    history: {
      consultations: Consultation[];
      prescriptions: Prescription[];
      exams: Exam[];
      problems: CitizenProblem[];
    };
  }> {
    // 1. Buscar item da fila - SECURITY: validate unitId ✅
    const queueItem = await db.select()
      .from(schema.attendanceQueue)
      .where(and(
        eq(schema.attendanceQueue.id, queueId),
        eq(schema.attendanceQueue.unitId, unitId) // Multi-tenant safety
      ))
      .limit(1)
      .then(r => r[0]);

    if (!queueItem) {
      throw new Error('Item da fila não encontrado ou não pertence à unidade');
    }

    // 2. Buscar dados do paciente - SECURITY: re-validate unitId ✅
    const patient = await db.select()
      .from(schema.citizens)
      .where(and(
        eq(schema.citizens.id, queueItem.citizenId),
        eq(schema.citizens.unitId, unitId) // Security: double-check tenant boundary
      ))
      .limit(1)
      .then(r => r[0]);

    if (!patient) {
      throw new Error('Paciente não encontrado ou não pertence à unidade');
    }

    // 3. Criar consulta
    const consultation = await this.createConsultation({
      citizenId: queueItem.citizenId,
      professionalId,
      unitId: queueItem.unitId,
      consultationDate: new Date(),
      attendanceType: 'consulta',
    });

    // 4. Atualizar fila: status = in_progress e vincular consulta
    await this.updateQueueEntry(queueId, {
      status: 'in_progress',
      calledAt: new Date(),
      consultationId: consultation.id,
      professionalId,
    });

    // 5. Buscar histórico do paciente
    const history = await this.getPatientHistory(queueItem.citizenId, queueItem.unitId);

    return {
      consultation,
      patient,
      history,
    };
  }

  async getPatientHistory(citizenId: string, unitId: string): Promise<{ // Multi-tenant safety ✅
    consultations: Consultation[];
    prescriptions: Prescription[];
    exams: Exam[];
    problems: CitizenProblem[];
  }> {
    // SECURITY: Multi-tenant validation - verify citizen belongs to unit ✅
    const citizen = await db.select()
      .from(schema.citizens)
      .where(and(
        eq(schema.citizens.id, citizenId),
        eq(schema.citizens.unitId, unitId) // Multi-tenant safety
      ))
      .limit(1)
      .then(r => r[0]);

    if (!citizen) {
      throw new Error('Paciente não encontrado ou não pertence à unidade');
    }

    // Buscar consultas anteriores (últimas 10) - FILTRADO POR UNIT ID ✅
    const consultations = await db.select()
      .from(schema.consultations)
      .where(and(
        eq(schema.consultations.citizenId, citizenId),
        eq(schema.consultations.unitId, citizen.unitId) // Multi-tenant safety
      ))
      .orderBy(desc(schema.consultations.consultationDate))
      .limit(10);

    // Buscar prescrições (últimas 20) - FILTRADO POR UNIT via JOIN com consultations ✅
    const prescriptions = await db
      .select({
        id: schema.prescriptions.id,
        consultationId: schema.prescriptions.consultationId,
        citizenId: schema.prescriptions.citizenId,
        professionalId: schema.prescriptions.professionalId,
        medication: schema.prescriptions.medication,
        dosage: schema.prescriptions.dosage,
        frequency: schema.prescriptions.frequency,
        duration: schema.prescriptions.duration,
        quantity: schema.prescriptions.quantity,
        instructions: schema.prescriptions.instructions,
        status: schema.prescriptions.status,
        createdAt: schema.prescriptions.createdAt,
      })
      .from(schema.prescriptions)
      .innerJoin(schema.consultations, eq(schema.prescriptions.consultationId, schema.consultations.id)) // INNER JOIN - somente com consulta válida ✅
      .where(and(
        eq(schema.prescriptions.citizenId, citizenId),
        eq(schema.consultations.unitId, unitId) // Multi-tenant safety - apenas da unidade correta
      ))
      .orderBy(desc(schema.prescriptions.createdAt))
      .limit(20);

    // Buscar exames (últimos 10) - FILTRADO POR UNIT ID ✅
    const exams = await db.select()
      .from(schema.exams)
      .where(and(
        eq(schema.exams.citizenId, citizenId),
        eq(schema.exams.unitId, citizen.unitId) // Multi-tenant safety
      ))
      .orderBy(desc(schema.exams.createdAt))
      .limit(10);

    // Buscar problemas ativos - FILTRADO POR UNIT ID ✅
    const problems = await db.select()
      .from(schema.citizenProblems)
      .where(and(
        eq(schema.citizenProblems.citizenId, citizenId),
        eq(schema.citizenProblems.unitId, citizen.unitId) // Multi-tenant safety
      ))
      .orderBy(desc(schema.citizenProblems.diagnosedAt));

    return {
      consultations,
      prescriptions,
      exams,
      problems,
    };
  }

  // ============================================================================
  // CITIZEN PROBLEMS METHODS (Problemas do Cidadão - CIAP-2) ✅
  // ============================================================================

  async getCitizenProblems(citizenId: string, unitId: string): Promise<CitizenProblem[]> {
    // SECURITY: Multi-tenant safety - MUST filter by unitId ✅
    return await db.select()
      .from(schema.citizenProblems)
      .where(and(
        eq(schema.citizenProblems.citizenId, citizenId),
        eq(schema.citizenProblems.unitId, unitId) // Multi-tenant safety
      ))
      .orderBy(
        desc(schema.citizenProblems.status), // Ativos primeiro
        desc(schema.citizenProblems.diagnosedAt)
      );
  }

  async createCitizenProblem(problem: InsertCitizenProblem): Promise<CitizenProblem> {
    const result = await db.insert(schema.citizenProblems).values(problem).returning();
    return result[0];
  }

  async updateCitizenProblem(id: string, citizenId: string, problem: Partial<InsertCitizenProblem>): Promise<CitizenProblem | undefined> {
    // SECURITY: Remove citizenId and unitId from payload to prevent takeover ✅
    const { citizenId: _, unitId: __, ...safePayload } = problem;
    
    // SECURITY: WHERE clause MUST include both id AND citizenId to prevent cross-citizen updates ✅
    const result = await db.update(schema.citizenProblems)
      .set({ ...safePayload, updatedAt: new Date() })
      .where(and(
        eq(schema.citizenProblems.id, id),
        eq(schema.citizenProblems.citizenId, citizenId) // Security: prevent cross-citizen updates
      ))
      .returning();
    return result[0];
  }

  async deleteCitizenProblem(id: string, citizenId: string): Promise<boolean> {
    // SECURITY: WHERE clause MUST include both id AND citizenId to prevent cross-citizen deletes ✅
    const result = await db.delete(schema.citizenProblems)
      .where(and(
        eq(schema.citizenProblems.id, id),
        eq(schema.citizenProblems.citizenId, citizenId) // Security: prevent cross-citizen deletes
      ));
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

  async deleteMedicalReferral(id: string): Promise<boolean> {
    const result = await db.delete(schema.medicalReferrals).where(eq(schema.medicalReferrals.id, id));
    return result.changes > 0;
  }

  async deleteTfdRequest(id: string): Promise<boolean> {
    const result = await db.delete(schema.tfdRequests).where(eq(schema.tfdRequests.id, id));
    return result.changes > 0;
  }

  // e-SUS Exports
  async getEsusExports(params: { limit?: number; offset?: number }): Promise<(typeof schema.esusExports.$inferSelect)[]> {
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    return await db.select()
      .from(schema.esusExports)
      .orderBy(desc(schema.esusExports.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getEsusExportById(id: string): Promise<typeof schema.esusExports.$inferSelect | undefined> {
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

  // Family Members (Membros da Família)
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return db
      .select()
      .from(schema.familyMembers)
      .where(eq(schema.familyMembers.familyId, familyId))
      .orderBy(desc(schema.familyMembers.isHeadOfFamily), desc(schema.familyMembers.joinedAt));
  }

  async getCitizenFamilyMembership(citizenId: string): Promise<FamilyMember | undefined> {
    const [membership] = await db
      .select()
      .from(schema.familyMembers)
      .where(
        and(
          eq(schema.familyMembers.citizenId, citizenId),
          isNull(schema.familyMembers.leftAt)
        )
      )
      .orderBy(desc(schema.familyMembers.joinedAt))
      .limit(1);
    return membership;
  }

  async addFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const [created] = await db.insert(schema.familyMembers).values(member).returning();
    
    // Update family membersCount
    await db
      .update(schema.families)
      .set({ 
        membersCount: sql`(SELECT COUNT(*) FROM ${schema.familyMembers} WHERE family_id = ${created.familyId} AND left_at IS NULL)` 
      })
      .where(eq(schema.families.id, created.familyId));
    
    return created;
  }

  async updateFamilyMember(id: string, member: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined> {
    const [updated] = await db
      .update(schema.familyMembers)
      .set(member)
      .where(eq(schema.familyMembers.id, id))
      .returning();
    return updated;
  }

  async removeFamilyMember(id: string): Promise<boolean> {
    const result = await db.delete(schema.familyMembers).where(eq(schema.familyMembers.id, id));
    return result.changes > 0;
  }

  async getFamilyHierarchy(familyId: string): Promise<any> {
    const family = await this.getFamilyById(familyId);
    if (!family) return null;

    const members = await db
      .select({
        id: schema.familyMembers.id,
        relationshipType: schema.familyMembers.relationshipType,
        isHeadOfFamily: schema.familyMembers.isHeadOfFamily,
        joinedAt: schema.familyMembers.joinedAt,
        leftAt: schema.familyMembers.leftAt,
        citizen: {
          id: schema.citizens.id,
          name: schema.citizens.name,
          cpf: schema.citizens.cpf,
          birthDate: schema.citizens.birthDate,
          gender: schema.citizens.gender,
        },
      })
      .from(schema.familyMembers)
      .innerJoin(schema.citizens, eq(schema.familyMembers.citizenId, schema.citizens.id))
      .where(eq(schema.familyMembers.familyId, familyId))
      .orderBy(desc(schema.familyMembers.isHeadOfFamily), desc(schema.familyMembers.joinedAt));

    const dwelling = await this.getDwellingById(family.dwellingId);

    return {
      family,
      dwelling,
      members,
    };
  }
  
  // Alias methods for interface compatibility
  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    return this.addFamilyMember(member);
  }
  
  async deleteFamilyMember(id: string): Promise<boolean> {
    return this.removeFamilyMember(id);
  }
  
  // Transfer citizen from one family to another with complete validation in atomic transaction
  async transferFamilyMember(memberId: string, newFamilyId: string): Promise<FamilyMember | undefined> {
    return await db.transaction(async (tx) => {
      // 1. Validate source member exists and is still active
      const member = await tx.select().from(schema.familyMembers).where(
        and(
          eq(schema.familyMembers.id, memberId),
          isNull(schema.familyMembers.leftAt)
        )
      ).limit(1);
      if (!member[0]) {
        throw new Error(`Membro ativo ${memberId} não encontrado ou já foi transferido`);
      }
      
      const oldFamilyId = member[0].familyId;
      const citizenId = member[0].citizenId;
      
      // 2. Validate destination family exists
      const newFamily = await tx.select().from(schema.families).where(eq(schema.families.id, newFamilyId)).limit(1);
      if (!newFamily[0]) {
        throw new Error(`Família de destino ${newFamilyId} não encontrada`);
      }
      
      // 3. Validate both families belong to same dwelling
      const oldFamily = await tx.select().from(schema.families).where(eq(schema.families.id, oldFamilyId)).limit(1);
      if (oldFamily[0] && oldFamily[0].dwellingId !== newFamily[0].dwellingId) {
        throw new Error(`Não é possível transferir entre famílias de domicílios diferentes`);
      }
      
      // 4. Check for duplicate active membership in destination family
      const existingMember = await tx.select().from(schema.familyMembers).where(
        and(
          eq(schema.familyMembers.familyId, newFamilyId),
          eq(schema.familyMembers.citizenId, citizenId),
          isNull(schema.familyMembers.leftAt)
        )
      ).limit(1);
      if (existingMember[0]) {
        throw new Error(`Cidadão já é membro ativo da família de destino`);
      }
      
      // 5. Execute transfer atomically
      // Mark as left from old family (only if not already set)
      await tx
        .update(schema.familyMembers)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(schema.familyMembers.id, memberId),
            isNull(schema.familyMembers.leftAt)
          )
        );
      
      // Update citizen's primary family link
      await tx
        .update(schema.citizens)
        .set({ familyId: newFamilyId })
        .where(eq(schema.citizens.id, citizenId));
      
      // Update family member counts
      await tx
        .update(schema.families)
        .set({ 
          membersCount: sql`(SELECT COUNT(*) FROM ${schema.familyMembers} WHERE family_id = ${oldFamilyId} AND left_at IS NULL)` 
        })
        .where(eq(schema.families.id, oldFamilyId));
      
      // Create new membership using insert to ensure consistent behavior
      const [newMember] = await tx
        .insert(schema.familyMembers)
        .values({
          familyId: newFamilyId,
          citizenId: citizenId,
          relationshipType: member[0].relationshipType,
          isHeadOfFamily: false,
          notes: `Transferido da família ${oldFamilyId}`
        })
        .returning();
      
      // Update new family member count
      await tx
        .update(schema.families)
        .set({ 
          membersCount: sql`(SELECT COUNT(*) FROM ${schema.familyMembers} WHERE family_id = ${newFamilyId} AND left_at IS NULL)` 
        })
        .where(eq(schema.families.id, newFamilyId));
      
      return newMember;
    });
  }
  
  // Territorial Hierarchy Integration Methods
  async getDwellingWithFamilies(dwellingId: string): Promise<{ dwelling: Dwelling; families: Array<Family & { members: Citizen[] }> }> {
    const dwelling = await this.getDwellingById(dwellingId);
    if (!dwelling) {
      throw new Error(`Dwelling ${dwellingId} not found`);
    }
    
    const families = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.dwellingId, dwellingId))
      .orderBy(schema.families.familyCode);
    
    const familiesWithMembers = await Promise.all(
      families.map(async (family) => {
        const members = await db
          .select()
          .from(schema.citizens)
          .innerJoin(schema.familyMembers, eq(schema.citizens.id, schema.familyMembers.citizenId))
          .where(
            and(
              eq(schema.familyMembers.familyId, family.id),
              isNull(schema.familyMembers.leftAt)
            )
          )
          .orderBy(desc(schema.familyMembers.isHeadOfFamily));
        
        return {
          ...family,
          members: members.map(m => m.citizens)
        };
      })
    );
    
    return {
      dwelling,
      families: familiesWithMembers
    };
  }
  
  async getFamilyWithMembers(familyId: string): Promise<{ family: Family; members: Citizen[]; dwelling: Dwelling }> {
    const family = await this.getFamilyById(familyId);
    if (!family) {
      throw new Error(`Family ${familyId} not found`);
    }
    
    const members = await db
      .select()
      .from(schema.citizens)
      .innerJoin(schema.familyMembers, eq(schema.citizens.id, schema.familyMembers.citizenId))
      .where(
        and(
          eq(schema.familyMembers.familyId, familyId),
          isNull(schema.familyMembers.leftAt)
        )
      )
      .orderBy(desc(schema.familyMembers.isHeadOfFamily));
    
    const dwelling = await this.getDwellingById(family.dwellingId);
    if (!dwelling) {
      throw new Error(`Dwelling ${family.dwellingId} not found`);
    }
    
    return {
      family,
      members: members.map(m => m.citizens),
      dwelling
    };
  }
  
  async getTerritorialHierarchy(dwellingId: string): Promise<{ 
    dwelling: Dwelling; 
    families: Array<{ family: Family; members: Citizen[] }> 
  }> {
    const dwelling = await this.getDwellingById(dwellingId);
    if (!dwelling) {
      throw new Error(`Dwelling ${dwellingId} not found`);
    }
    
    const families = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.dwellingId, dwellingId))
      .orderBy(schema.families.familyCode);
    
    const familiesWithMembers = await Promise.all(
      families.map(async (family) => {
        const members = await db
          .select()
          .from(schema.citizens)
          .innerJoin(schema.familyMembers, eq(schema.citizens.id, schema.familyMembers.citizenId))
          .where(
            and(
              eq(schema.familyMembers.familyId, family.id),
              isNull(schema.familyMembers.leftAt)
            )
          )
          .orderBy(desc(schema.familyMembers.isHeadOfFamily));
        
        return {
          family,
          members: members.map(m => m.citizens)
        };
      })
    );
    
    return {
      dwelling,
      families: familiesWithMembers
    };
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

  async updateHomeVisit(id: string, visit: Partial<InsertHomeVisit>): Promise<HomeVisit | undefined> {
    const [updated] = await db
      .update(schema.homeVisits)
      .set(visit)
      .where(eq(schema.homeVisits.id, id))
      .returning();
    return updated;
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

  // ===================================================================
  // DYNAMIC FORMS SYSTEM - IMPLEMENTATION
  // ===================================================================

  // Specialties
  async getSpecialties(params?: { active?: boolean }): Promise<schema.Specialty[]> {
    let query = db.select().from(schema.specialties);
    
    if (params?.active !== undefined) {
      query = query.where(eq(schema.specialties.active, params.active)) as any;
    }
    
    return query.orderBy(asc(schema.specialties.name));
  }

  async getSpecialtyById(id: string): Promise<schema.Specialty | undefined> {
    const [specialty] = await db.select().from(schema.specialties).where(eq(schema.specialties.id, id));
    return specialty;
  }

  async getSpecialtyByCode(code: string): Promise<schema.Specialty | undefined> {
    const [specialty] = await db.select().from(schema.specialties).where(eq(schema.specialties.code, code));
    return specialty;
  }

  async getSpecialtyBySlug(slug: string): Promise<schema.Specialty | undefined> {
    const [specialty] = await db.select().from(schema.specialties).where(eq(schema.specialties.slug, slug));
    return specialty;
  }

  async createSpecialty(specialty: schema.InsertSpecialty): Promise<schema.Specialty> {
    const [created] = await db.insert(schema.specialties).values(specialty).returning();
    return created;
  }

  async updateSpecialty(id: string, specialty: Partial<schema.InsertSpecialty>): Promise<schema.Specialty | undefined> {
    const [updated] = await db
      .update(schema.specialties)
      .set(specialty)
      .where(eq(schema.specialties.id, id))
      .returning();
    return updated;
  }

  // Referral Rules (Regras de Encaminhamento Inteligente)
  async getReferralRules(params?: { specialtyId?: string; active?: boolean }): Promise<schema.ReferralRule[]> {
    const conditions = [];
    if (params?.specialtyId) conditions.push(eq(schema.referralRules.specialtyId, params.specialtyId));
    if (params?.active !== undefined) conditions.push(eq(schema.referralRules.active, params.active));
    
    if (conditions.length === 0) {
      return db.select().from(schema.referralRules).orderBy(desc(schema.referralRules.baseWeight));
    }
    return db.select().from(schema.referralRules).where(and(...conditions)).orderBy(desc(schema.referralRules.baseWeight));
  }

  async getReferralRuleById(id: string): Promise<schema.ReferralRule | undefined> {
    const [rule] = await db.select().from(schema.referralRules).where(eq(schema.referralRules.id, id));
    return rule;
  }

  async createReferralRule(rule: schema.InsertReferralRule): Promise<schema.ReferralRule> {
    const [created] = await db.insert(schema.referralRules).values(rule).returning();
    return created;
  }

  async updateReferralRule(id: string, rule: Partial<schema.InsertReferralRule>): Promise<schema.ReferralRule | undefined> {
    const [updated] = await db
      .update(schema.referralRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(schema.referralRules.id, id))
      .returning();
    return updated;
  }

  async deleteReferralRule(id: string): Promise<boolean> {
    const result = await db.delete(schema.referralRules).where(eq(schema.referralRules.id, id)).returning();
    return result.length > 0;
  }

  async getReferralRulesWithSpecialties(): Promise<Array<schema.ReferralRule & { specialty: schema.Specialty }>> {
    const rules = await db
      .select()
      .from(schema.referralRules)
      .innerJoin(schema.specialties, eq(schema.referralRules.specialtyId, schema.specialties.id))
      .where(eq(schema.referralRules.active, true))
      .orderBy(desc(schema.referralRules.baseWeight));
    
    return rules.map(r => ({
      ...r.referral_rules,
      specialty: r.specialties,
    }));
  }

  // Care Lines
  async getCareLines(params?: { specialtyId?: string; active?: boolean }): Promise<schema.CareLine[]> {
    let query = db.select().from(schema.careLines);
    
    const conditions = [];
    if (params?.specialtyId) {
      conditions.push(eq(schema.careLines.specialtyId, params.specialtyId));
    }
    if (params?.active !== undefined) {
      conditions.push(eq(schema.careLines.active, params.active));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(asc(schema.careLines.name));
  }

  async getCareLineById(id: string): Promise<schema.CareLine | undefined> {
    const [careLine] = await db.select().from(schema.careLines).where(eq(schema.careLines.id, id));
    return careLine;
  }

  async getCareLineByCode(code: string): Promise<schema.CareLine | undefined> {
    const [careLine] = await db.select().from(schema.careLines).where(eq(schema.careLines.code, code));
    return careLine;
  }

  async createCareLine(careLine: schema.InsertCareLine): Promise<schema.CareLine> {
    const [created] = await db.insert(schema.careLines).values(careLine).returning();
    return created;
  }

  async updateCareLine(id: string, careLine: Partial<schema.InsertCareLine>): Promise<schema.CareLine | undefined> {
    const [updated] = await db
      .update(schema.careLines)
      .set(careLine)
      .where(eq(schema.careLines.id, id))
      .returning();
    return updated;
  }

  // Consultation Templates
  async getConsultationTemplates(params?: { specialtyId?: string; careLineId?: string; active?: boolean }): Promise<schema.ConsultationTemplate[]> {
    let query = db.select().from(schema.consultationTemplates);
    
    const conditions = [];
    if (params?.specialtyId) {
      conditions.push(eq(schema.consultationTemplates.specialtyId, params.specialtyId));
    }
    if (params?.careLineId) {
      conditions.push(eq(schema.consultationTemplates.careLineId, params.careLineId));
    }
    if (params?.active !== undefined) {
      conditions.push(eq(schema.consultationTemplates.active, params.active));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(asc(schema.consultationTemplates.name));
  }

  async getConsultationTemplateById(id: string): Promise<schema.ConsultationTemplate | undefined> {
    const [template] = await db.select().from(schema.consultationTemplates).where(eq(schema.consultationTemplates.id, id));
    return template;
  }

  async createConsultationTemplate(template: schema.InsertConsultationTemplate): Promise<schema.ConsultationTemplate> {
    const [created] = await db.insert(schema.consultationTemplates).values(template).returning();
    return created;
  }

  async updateConsultationTemplate(id: string, template: Partial<schema.InsertConsultationTemplate>): Promise<schema.ConsultationTemplate | undefined> {
    const [updated] = await db
      .update(schema.consultationTemplates)
      .set(template)
      .where(eq(schema.consultationTemplates.id, id))
      .returning();
    return updated;
  }

  // Template Fields
  async getTemplateFields(templateId: string): Promise<schema.TemplateField[]> {
    return db
      .select()
      .from(schema.templateFields)
      .where(eq(schema.templateFields.templateId, templateId))
      .orderBy(asc(schema.templateFields.order));
  }

  async getTemplateFieldById(id: string): Promise<schema.TemplateField | undefined> {
    const [field] = await db.select().from(schema.templateFields).where(eq(schema.templateFields.id, id));
    return field;
  }

  async createTemplateField(field: schema.InsertTemplateField): Promise<schema.TemplateField> {
    const [created] = await db.insert(schema.templateFields).values(field).returning();
    return created;
  }

  async updateTemplateField(id: string, field: Partial<schema.InsertTemplateField>): Promise<schema.TemplateField | undefined> {
    const [updated] = await db
      .update(schema.templateFields)
      .set(field)
      .where(eq(schema.templateFields.id, id))
      .returning();
    return updated;
  }

  async deleteTemplateField(id: string): Promise<boolean> {
    const result = await db.delete(schema.templateFields).where(eq(schema.templateFields.id, id));
    return result.changes > 0;
  }

  // Consultation Field Data
  async getConsultationFieldData(consultationId: string): Promise<schema.ConsultationFieldData[]> {
    return db
      .select()
      .from(schema.consultationFieldData)
      .where(eq(schema.consultationFieldData.consultationId, consultationId));
  }

  async saveConsultationFieldData(
    consultationId: string, 
    fieldData: Array<{ fieldId: string; fieldValue: string }>
  ): Promise<schema.ConsultationFieldData[]> {
    // Delete existing data for this consultation
    await db.delete(schema.consultationFieldData).where(eq(schema.consultationFieldData.consultationId, consultationId));
    
    // Insert new data
    if (fieldData.length === 0) {
      return [];
    }
    
    const dataToInsert = fieldData.map(item => ({
      consultationId,
      fieldId: item.fieldId,
      fieldValue: item.fieldValue,
      createdAt: new Date(),
    }));
    
    return db.insert(schema.consultationFieldData).values(dataToInsert).returning();
  }

  async deleteConsultationFieldData(consultationId: string): Promise<boolean> {
    const result = await db.delete(schema.consultationFieldData).where(eq(schema.consultationFieldData.consultationId, consultationId));
    return result.changes > 0;
  }

  // Clinical Protocols
  async getClinicalProtocols(params?: { careLineId?: string; specialtyId?: string; active?: boolean }): Promise<schema.ClinicalProtocol[]> {
    let query = db.select().from(schema.clinicalProtocols);
    
    const conditions = [];
    if (params?.careLineId) {
      conditions.push(eq(schema.clinicalProtocols.careLineId, params.careLineId));
    }
    if (params?.specialtyId) {
      conditions.push(eq(schema.clinicalProtocols.specialtyId, params.specialtyId));
    }
    if (params?.active !== undefined) {
      conditions.push(eq(schema.clinicalProtocols.active, params.active));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(asc(schema.clinicalProtocols.name));
  }

  async getClinicalProtocolById(id: string): Promise<schema.ClinicalProtocol | undefined> {
    const [protocol] = await db.select().from(schema.clinicalProtocols).where(eq(schema.clinicalProtocols.id, id));
    return protocol;
  }

  async evaluateProtocols(
    fieldData: Record<string, any>, 
    careLineId?: string, 
    specialtyId?: string
  ): Promise<schema.ClinicalProtocol[]> {
    // Get all active protocols for this care line/specialty
    const protocols = await this.getClinicalProtocols({ 
      careLineId, 
      specialtyId, 
      active: true 
    });
    
    const triggeredProtocols: schema.ClinicalProtocol[] = [];
    
    for (const protocol of protocols) {
      if (!protocol.triggerCondition) continue;
      
      const conditions = protocol.triggerCondition as Array<{
        field: string;
        operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains";
        value: any;
      }>;
      
      // Check if all conditions are met (AND logic)
      const allConditionsMet = conditions.every(condition => {
        const fieldValue = fieldData[condition.field];
        
        if (fieldValue === undefined || fieldValue === null) {
          return false;
        }
        
        switch (condition.operator) {
          case "gt":
            return Number(fieldValue) > Number(condition.value);
          case "gte":
            return Number(fieldValue) >= Number(condition.value);
          case "lt":
            return Number(fieldValue) < Number(condition.value);
          case "lte":
            return Number(fieldValue) <= Number(condition.value);
          case "eq":
            return fieldValue === condition.value;
          case "contains":
            return String(fieldValue).includes(String(condition.value));
          default:
            return false;
        }
      });
      
      if (allConditionsMet) {
        triggeredProtocols.push(protocol);
      }
    }
    
    return triggeredProtocols;
  }

  async createClinicalProtocol(protocol: schema.InsertClinicalProtocol): Promise<schema.ClinicalProtocol> {
    const [created] = await db.insert(schema.clinicalProtocols).values(protocol).returning();
    return created;
  }

  async updateClinicalProtocol(id: string, protocol: Partial<schema.InsertClinicalProtocol>): Promise<schema.ClinicalProtocol | undefined> {
    const [updated] = await db
      .update(schema.clinicalProtocols)
      .set(protocol)
      .where(eq(schema.clinicalProtocols.id, id))
      .returning();
    return updated;
  }

  // Therapeutic Plans
  async getTherapeuticPlans(params: { citizenId?: string; careLineId?: string; status?: string; unitId?: string }): Promise<schema.TherapeuticPlan[]> {
    let query = db.select().from(schema.therapeuticPlans);
    
    const conditions = [];
    if (params.citizenId) {
      conditions.push(eq(schema.therapeuticPlans.citizenId, params.citizenId));
    }
    if (params.careLineId) {
      conditions.push(eq(schema.therapeuticPlans.careLineId, params.careLineId));
    }
    if (params.status) {
      conditions.push(eq(schema.therapeuticPlans.status, params.status as "active" | "completed" | "suspended"));
    }
    if (params.unitId) {
      conditions.push(eq(schema.therapeuticPlans.unitId, params.unitId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.therapeuticPlans.createdAt));
  }

  async getTherapeuticPlanById(id: string): Promise<schema.TherapeuticPlan | undefined> {
    const [plan] = await db.select().from(schema.therapeuticPlans).where(eq(schema.therapeuticPlans.id, id));
    return plan;
  }

  async createTherapeuticPlan(plan: schema.InsertTherapeuticPlan): Promise<schema.TherapeuticPlan> {
    const [created] = await db.insert(schema.therapeuticPlans).values(plan).returning();
    return created;
  }

  async updateTherapeuticPlan(id: string, plan: Partial<schema.InsertTherapeuticPlan>): Promise<schema.TherapeuticPlan | undefined> {
    const [updated] = await db
      .update(schema.therapeuticPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(schema.therapeuticPlans.id, id))
      .returning();
    return updated;
  }

  async deleteTherapeuticPlan(id: string): Promise<boolean> {
    const result = await db.delete(schema.therapeuticPlans).where(eq(schema.therapeuticPlans.id, id));
    return result.changes > 0;
  }

  // Therapeutic Plan Items
  async getTherapeuticPlanItems(planId: string): Promise<schema.TherapeuticPlanItem[]> {
    return db
      .select()
      .from(schema.therapeuticPlanItems)
      .where(eq(schema.therapeuticPlanItems.planId, planId))
      .orderBy(asc(schema.therapeuticPlanItems.createdAt));
  }

  async createTherapeuticPlanItem(item: schema.InsertTherapeuticPlanItem): Promise<schema.TherapeuticPlanItem> {
    const [created] = await db.insert(schema.therapeuticPlanItems).values(item).returning();
    return created;
  }

  async updateTherapeuticPlanItem(id: string, item: Partial<schema.InsertTherapeuticPlanItem>): Promise<schema.TherapeuticPlanItem | undefined> {
    const [updated] = await db
      .update(schema.therapeuticPlanItems)
      .set(item)
      .where(eq(schema.therapeuticPlanItems.id, id))
      .returning();
    return updated;
  }

  async deleteTherapeuticPlanItem(id: string): Promise<boolean> {
    const result = await db.delete(schema.therapeuticPlanItems).where(eq(schema.therapeuticPlanItems.id, id));
    return result.changes > 0;
  }

  // ============================================================================
  // STOCK MOVEMENTS ✅ (Pharmacy Inventory Management)
  // ============================================================================

  async createStockMovement(movement: any): Promise<any> {
    // Validate medication exists
    const [medication] = await db
      .select()
      .from(schema.medications)
      .where(eq(schema.medications.id, movement.medicationId))
      .limit(1);
    
    if (!medication) {
      throw new Error("Medicamento não encontrado");
    }

    const currentStock = await db
      .select()
      .from(schema.medicationStock)
      .where(
        and(
          eq(schema.medicationStock.medicationId, movement.medicationId),
          eq(schema.medicationStock.unitId, movement.unitId)
        )
      )
      .limit(1);

    // SECURITY: Validate negative balance (prevent stock from going below zero)
    const currentQuantity = currentStock.length > 0 ? currentStock[0].quantity : 0;
    const newQuantity = currentQuantity + movement.quantity;

    if (newQuantity < 0) {
      throw new Error(
        `Estoque insuficiente: ${medication.name}. ` +
        `Disponível: ${currentQuantity}, Solicitado: ${Math.abs(movement.quantity)}`
      );
    }

    if (currentStock.length === 0) {
      // Create new stock record (only for positive quantities)
      if (movement.quantity <= 0) {
        throw new Error("Não é possível criar estoque com quantidade negativa ou zero");
      }

      await db.insert(schema.medicationStock).values({
        medicationId: movement.medicationId,
        unitId: movement.unitId,
        quantity: movement.quantity,
        minimumQuantity: 10,
        batchNumber: movement.batchNumber,
        expirationDate: movement.expirationDate,
        lastUpdated: new Date(),
      });
    } else {
      // Update existing stock with validated new quantity
      await db
        .update(schema.medicationStock)
        .set({
          quantity: newQuantity,
          lastUpdated: new Date(),
        })
        .where(eq(schema.medicationStock.id, currentStock[0].id));
    }

    return {
      id: `mov_${Date.now()}`,
      ...movement,
      createdAt: new Date(),
      medicationName: medication.name,
      previousQuantity: currentQuantity,
      newQuantity: newQuantity,
    };
  }

  async getStockMovements(params: { unitId?: string; medicationId?: string; limit?: number }): Promise<any[]> {
    // For now, return empty array (movements are tracked via stock updates)
    // Future: Create dedicated stock_movements table for audit trail
    return [];
  }
}

export const storage = new DbStorage();