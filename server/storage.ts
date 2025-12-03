import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, gte, lte, lt } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  InsertCitizen,
  Citizen,
  InsertPrescription,
  Prescription,
  InsertDispensation,
  Dispensation,
  InsertMedication,
  Medication,
  InsertMedicationStock,
  MedicationStock,
  InsertTfdRequest,
  TfdRequest,
  UpdateTfdRequest,
  InsertTfdVehicle,
  TfdVehicle,
  InsertTfdDriver,
  TfdDriver,
  InsertTfdTrip,
  TfdTrip,
  InsertTfdTripPassenger,
  TfdTripPassenger,
  InsertHealthUnit,
  HealthUnit,
  InsertProfessional,
  Professional,
  User,
  DiaperStock,
  InsertDiaperStock,
  DiaperStockMovement,
  InsertDiaperStockMovement,
  SaBeneficiary,
  InsertSaBeneficiary,
  DiaperRequest,
  InsertDiaperRequest,
  DiaperAuthorization,
  InsertDiaperAuthorization,
  DiaperDelivery,
  InsertDiaperDelivery,
  DiaperMonthlyList,
  InsertDiaperMonthlyList,
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

  // Prescriptions
  getPrescriptions(params: { 
    citizenId?: string; 
    professionalId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    unitId?: string;
  }): Promise<Prescription[]>;
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
  getAllMedicationStock(params: { unitId?: string; search?: string; status?: string; includeExpired?: boolean }): Promise<MedicationStock[]>;
  getExpiringStock(unitId: string, daysAhead?: number): Promise<MedicationStock[]>;
  createMedicationStock(stock: InsertMedicationStock): Promise<MedicationStock>;
  updateMedicationStock(id: string, stock: Partial<InsertMedicationStock>): Promise<MedicationStock | undefined>;
  deleteMedicationStock(id: string): Promise<boolean>;
  getLowStockMedications(unitId: string): Promise<MedicationStock[]>;
  
  // Stock Movements
  createStockMovement(movement: any): Promise<any>;
  getStockMovements(params: { unitId?: string; medicationId?: string; limit?: number }): Promise<any[]>;

  // Dashboard Stats
  getDashboardStats(unitId?: string): Promise<{
    totalCitizens: number;
    lowStockCount: number;
    pendingPrescriptions: number;
    pendingTfd: number;
  }>;

  // Reports
  getReports(days: number, unitId?: string): Promise<any>;

  // TFD Requests
  getTfdRequests(params: { citizenId?: string; status?: string; unitId?: string }): Promise<TfdRequest[]>;
  getTfdRequestById(id: string): Promise<TfdRequest | undefined>;
  createTfdRequest(request: InsertTfdRequest): Promise<TfdRequest>;
  updateTfdRequest(id: string, request: Partial<InsertTfdRequest>): Promise<TfdRequest | undefined>;
  deleteTfdRequest(id: string): Promise<boolean>;

  // TFD Vehicles
  getTfdVehicles(params: { unitId?: string; status?: string; active?: boolean }): Promise<TfdVehicle[]>;
  getTfdVehicleById(id: string): Promise<TfdVehicle | undefined>;
  createTfdVehicle(vehicle: InsertTfdVehicle): Promise<TfdVehicle>;
  updateTfdVehicle(id: string, vehicle: Partial<InsertTfdVehicle>): Promise<TfdVehicle | undefined>;
  deleteTfdVehicle(id: string): Promise<boolean>;

  // TFD Drivers
  getTfdDrivers(params: { unitId?: string; status?: string; active?: boolean }): Promise<TfdDriver[]>;
  getTfdDriverById(id: string): Promise<TfdDriver | undefined>;
  createTfdDriver(driver: InsertTfdDriver): Promise<TfdDriver>;
  updateTfdDriver(id: string, driver: Partial<InsertTfdDriver>): Promise<TfdDriver | undefined>;
  deleteTfdDriver(id: string): Promise<boolean>;

  // TFD Trips
  getTfdTrips(params: { unitId?: string; vehicleId?: string; driverId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<TfdTrip[]>;
  getTfdTripById(id: string): Promise<TfdTrip | undefined>;
  createTfdTrip(trip: InsertTfdTrip): Promise<TfdTrip>;
  updateTfdTrip(id: string, trip: Partial<InsertTfdTrip>): Promise<TfdTrip | undefined>;
  deleteTfdTrip(id: string): Promise<boolean>;

  // TFD Trip Passengers
  getTfdTripPassengers(tripId: string): Promise<TfdTripPassenger[]>;
  createTfdTripPassenger(passenger: InsertTfdTripPassenger): Promise<TfdTripPassenger>;
  updateTfdTripPassenger(id: string, passenger: Partial<InsertTfdTripPassenger>): Promise<TfdTripPassenger | undefined>;

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
  updateUser(id: string, data: Partial<{ name: string; email: string; phone: string; password: string }>): Promise<User | undefined>;

  // RENAME Catalog
  searchRenameCatalog(params: { search?: string; therapeuticClass?: string; limit?: number }): Promise<schema.RenameCatalog[]>;

  // Diaper Stock
  getDiaperStock(params: { unitId?: string; size?: string; status?: string; search?: string }): Promise<DiaperStock[]>;
  getDiaperStockById(id: string): Promise<DiaperStock | undefined>;
  createDiaperStock(stock: InsertDiaperStock): Promise<DiaperStock>;
  updateDiaperStock(id: string, stock: Partial<InsertDiaperStock>): Promise<DiaperStock | undefined>;
  deleteDiaperStock(id: string): Promise<boolean>;
  getLowDiaperStock(unitId: string): Promise<DiaperStock[]>;
  getExpiringDiaperStock(unitId: string, daysAhead?: number): Promise<DiaperStock[]>;
  getDiaperStockByFIFO(unitId: string, size: string, quantity: number): Promise<DiaperStock[]>;

  // Diaper Stock Movements
  createDiaperStockMovement(movement: InsertDiaperStockMovement): Promise<DiaperStockMovement>;
  getDiaperStockMovements(params: { unitId?: string; stockId?: string; limit?: number }): Promise<DiaperStockMovement[]>;

  // Social Assistance Beneficiaries
  getSaBeneficiaries(params: { unitId?: string; search?: string; status?: string; limit?: number }): Promise<SaBeneficiary[]>;
  getSaBeneficiaryById(id: string): Promise<SaBeneficiary | undefined>;
  getSaBeneficiaryByCpf(cpf: string): Promise<SaBeneficiary | undefined>;
  createSaBeneficiary(beneficiary: InsertSaBeneficiary): Promise<SaBeneficiary>;
  updateSaBeneficiary(id: string, beneficiary: Partial<InsertSaBeneficiary>): Promise<SaBeneficiary | undefined>;
  deleteSaBeneficiary(id: string): Promise<boolean>;

  // Diaper Requests
  getDiaperRequests(params: { unitId?: string; beneficiaryId?: string; status?: string; limit?: number }): Promise<DiaperRequest[]>;
  getDiaperRequestById(id: string): Promise<DiaperRequest | undefined>;
  createDiaperRequest(request: InsertDiaperRequest): Promise<DiaperRequest>;
  updateDiaperRequest(id: string, request: Partial<InsertDiaperRequest>): Promise<DiaperRequest | undefined>;
  deleteDiaperRequest(id: string): Promise<boolean>;
  generateDiaperRequestNumber(): Promise<string>;

  // Diaper Authorizations
  getDiaperAuthorizations(params: { unitId?: string; beneficiaryId?: string; requestId?: string; status?: string }): Promise<DiaperAuthorization[]>;
  getDiaperAuthorizationById(id: string): Promise<DiaperAuthorization | undefined>;
  createDiaperAuthorization(auth: InsertDiaperAuthorization): Promise<DiaperAuthorization>;
  updateDiaperAuthorization(id: string, auth: Partial<InsertDiaperAuthorization>): Promise<DiaperAuthorization | undefined>;
  generateDiaperAuthorizationNumber(): Promise<string>;

  // Diaper Deliveries
  getDiaperDeliveries(params: { unitId?: string; beneficiaryId?: string; authorizationId?: string }): Promise<DiaperDelivery[]>;
  getDiaperDeliveryById(id: string): Promise<DiaperDelivery | undefined>;
  createDiaperDelivery(delivery: InsertDiaperDelivery): Promise<DiaperDelivery>;
  generateDiaperDeliveryNumber(): Promise<string>;

  // Diaper Monthly Lists
  getDiaperMonthlyLists(params: { unitId?: string; status?: string }): Promise<DiaperMonthlyList[]>;
  getDiaperMonthlyListById(id: string): Promise<DiaperMonthlyList | undefined>;
  createDiaperMonthlyList(list: InsertDiaperMonthlyList): Promise<DiaperMonthlyList>;
  updateDiaperMonthlyList(id: string, list: Partial<InsertDiaperMonthlyList>): Promise<DiaperMonthlyList | undefined>;
  generateDiaperMonthlyListNumber(): Promise<string>;

  // Social Assistance Dashboard Stats
  getSaStats(unitId: string): Promise<{
    totalBeneficiaries: number;
    pendingRequests: number;
    authorizedThisMonth: number;
    deliveredThisMonth: number;
    lowDiaperStock: number;
  }>;

  // Demand Forecasting (3-month moving average)
  getDiaperDemandForecast(unitId: string): Promise<{
    size: string;
    avgMonthlyDemand: number;
    currentStock: number;
    monthsOfStock: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  }[]>;
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

  async deleteCitizen(id: string): Promise<boolean> {
    const result = await db.delete(schema.citizens).where(eq(schema.citizens.id, id));
    return true;
  }

  // Prescriptions
  async getPrescriptions(params: any): Promise<Prescription[]> {
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.prescriptions.citizenId, params.citizenId));
    if (params.professionalId) conditions.push(eq(schema.prescriptions.professionalId, params.professionalId));
    if (params.unitId) conditions.push(eq(schema.prescriptions.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.prescriptions.status, params.status as any));

    let query = db.select().from(schema.prescriptions);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.prescriptions.createdAt)).limit(100);
  }

  async getPrescriptionById(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db.select().from(schema.prescriptions).where(eq(schema.prescriptions.id, id));
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

  async deletePrescription(id: string): Promise<boolean> {
    await db.delete(schema.prescriptions).where(eq(schema.prescriptions.id, id));
    return true;
  }

  // Dispensations
  async createDispensation(dispensation: InsertDispensation): Promise<Dispensation> {
    const [created] = await db.insert(schema.dispensations).values(dispensation).returning();
    return created;
  }

  async getDispensations(params: any): Promise<Dispensation[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.dispensations.unitId, params.unitId));
    if (params.citizenId) conditions.push(eq(schema.dispensations.citizenId, params.citizenId));

    let query = db.select().from(schema.dispensations);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.dispensations.dispensedAt)).limit(params.limit || 100);
  }

  // Medications
  async getMedications(params: { search?: string; unitId?: string }): Promise<Medication[]> {
    const conditions: any[] = [];

    if (params.search) {
      conditions.push(
        or(
          like(schema.medications.name, `%${params.search}%`),
          like(schema.medications.genericName, `%${params.search}%`)
        )
      );
    }

    if (params.unitId) {
      conditions.push(eq(schema.medications.unitId, params.unitId));
    }

    let query = db.select().from(schema.medications);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(asc(schema.medications.name));
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [created] = await db.insert(schema.medications).values(medication).returning();
    return created;
  }

  async deleteMedication(id: string): Promise<boolean> {
    await db.delete(schema.medications).where(eq(schema.medications.id, id));
    return true;
  }

  // Medication Stock
  async getAllMedicationStock(params: any): Promise<MedicationStock[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.medicationStock.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.medicationStock.status, params.status as any));
    if (params.search) {
      conditions.push(
        or(
          like(schema.medicationStock.medicationName, `%${params.search}%`),
          like(schema.medicationStock.genericName, `%${params.search}%`)
        )
      );
    }

    let query = db.select().from(schema.medicationStock);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(asc(schema.medicationStock.medicationName));
  }

  async getExpiringStock(unitId: string, daysAhead: number = 30): Promise<MedicationStock[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return db
      .select()
      .from(schema.medicationStock)
      .where(
        and(
          eq(schema.medicationStock.unitId, unitId),
          lte(schema.medicationStock.expirationDate, futureDate)
        )
      )
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

  async deleteMedicationStock(id: string): Promise<boolean> {
    await db.delete(schema.medicationStock).where(eq(schema.medicationStock.id, id));
    return true;
  }

  async getLowStockMedications(unitId: string): Promise<MedicationStock[]> {
    return db
      .select()
      .from(schema.medicationStock)
      .where(
        and(
          eq(schema.medicationStock.unitId, unitId),
          eq(schema.medicationStock.status, "low_stock")
        )
      );
  }

  // Stock Movements
  async createStockMovement(movement: any): Promise<any> {
    const [created] = await db.insert(schema.stockMovements).values(movement).returning();
    return created;
  }

  async getStockMovements(params: any): Promise<any[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.stockMovements.unitId, params.unitId));
    if (params.stockId) conditions.push(eq(schema.stockMovements.stockId, params.stockId));

    let query = db.select().from(schema.stockMovements);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.stockMovements.createdAt)).limit(params.limit || 100);
  }

  // Dashboard Stats
  async getDashboardStats(unitId?: string): Promise<any> {
    const citizensConditions = unitId ? [eq(schema.citizens.unitId, unitId)] : [];
    const stockConditions = unitId ? [eq(schema.medicationStock.unitId, unitId), eq(schema.medicationStock.status, "low_stock")] : [eq(schema.medicationStock.status, "low_stock")];
    const prescriptionsConditions = unitId ? [eq(schema.prescriptions.unitId, unitId), eq(schema.prescriptions.status, "pending")] : [eq(schema.prescriptions.status, "pending")];
    const tfdConditions = unitId ? [eq(schema.tfdRequests.originUnitId, unitId), eq(schema.tfdRequests.status, "pending")] : [eq(schema.tfdRequests.status, "pending")];

    const [citizensResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.citizens).where(citizensConditions.length > 0 ? and(...citizensConditions) : undefined);
    const [stockResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.medicationStock).where(and(...stockConditions));
    const [prescriptionsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.prescriptions).where(and(...prescriptionsConditions));
    const [tfdResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.tfdRequests).where(and(...tfdConditions));

    return {
      totalCitizens: citizensResult?.count || 0,
      lowStockCount: stockResult?.count || 0,
      pendingPrescriptions: prescriptionsResult?.count || 0,
      pendingTfd: tfdResult?.count || 0,
    };
  }

  // Reports
  async getReports(days: number, unitId?: string): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const prescriptionsConditions = [gte(schema.prescriptions.createdAt, startDate)];
    if (unitId) prescriptionsConditions.push(eq(schema.prescriptions.unitId, unitId));

    const dispensationsConditions = [gte(schema.dispensations.dispensedAt, startDate)];
    if (unitId) dispensationsConditions.push(eq(schema.dispensations.unitId, unitId));

    const prescriptions = await db.select().from(schema.prescriptions).where(and(...prescriptionsConditions));
    const dispensations = await db.select().from(schema.dispensations).where(and(...dispensationsConditions));

    return {
      prescriptions: prescriptions.length,
      dispensations: dispensations.length,
      period: `${days} dias`,
    };
  }

  // TFD Requests
  async getTfdRequests(params: any): Promise<TfdRequest[]> {
    const conditions: any[] = [];

    if (params.citizenId) conditions.push(eq(schema.tfdRequests.citizenId, params.citizenId));
    if (params.unitId) conditions.push(eq(schema.tfdRequests.originUnitId, params.unitId));
    if (params.status) conditions.push(eq(schema.tfdRequests.status, params.status as any));

    let query = db.select().from(schema.tfdRequests);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.tfdRequests.createdAt));
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

  async deleteTfdRequest(id: string): Promise<boolean> {
    await db.delete(schema.tfdRequests).where(eq(schema.tfdRequests.id, id));
    return true;
  }

  // TFD Vehicles
  async getTfdVehicles(params: any): Promise<TfdVehicle[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.tfdVehicles.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.tfdVehicles.status, params.status as any));
    if (params.active !== undefined) conditions.push(eq(schema.tfdVehicles.active, params.active));

    let query = db.select().from(schema.tfdVehicles);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(asc(schema.tfdVehicles.model));
  }

  async getTfdVehicleById(id: string): Promise<TfdVehicle | undefined> {
    const [vehicle] = await db.select().from(schema.tfdVehicles).where(eq(schema.tfdVehicles.id, id));
    return vehicle;
  }

  async createTfdVehicle(vehicle: InsertTfdVehicle): Promise<TfdVehicle> {
    const [created] = await db.insert(schema.tfdVehicles).values(vehicle).returning();
    return created;
  }

  async updateTfdVehicle(id: string, vehicle: Partial<InsertTfdVehicle>): Promise<TfdVehicle | undefined> {
    const [updated] = await db
      .update(schema.tfdVehicles)
      .set({ ...vehicle, updatedAt: new Date() })
      .where(eq(schema.tfdVehicles.id, id))
      .returning();
    return updated;
  }

  async deleteTfdVehicle(id: string): Promise<boolean> {
    await db.delete(schema.tfdVehicles).where(eq(schema.tfdVehicles.id, id));
    return true;
  }

  // TFD Drivers
  async getTfdDrivers(params: any): Promise<TfdDriver[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.tfdDrivers.unitId, params.unitId));
    if (params.status) conditions.push(eq(schema.tfdDrivers.status, params.status as any));
    if (params.active !== undefined) conditions.push(eq(schema.tfdDrivers.active, params.active));

    let query = db.select().from(schema.tfdDrivers);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(asc(schema.tfdDrivers.name));
  }

  async getTfdDriverById(id: string): Promise<TfdDriver | undefined> {
    const [driver] = await db.select().from(schema.tfdDrivers).where(eq(schema.tfdDrivers.id, id));
    return driver;
  }

  async createTfdDriver(driver: InsertTfdDriver): Promise<TfdDriver> {
    const [created] = await db.insert(schema.tfdDrivers).values(driver).returning();
    return created;
  }

  async updateTfdDriver(id: string, driver: Partial<InsertTfdDriver>): Promise<TfdDriver | undefined> {
    const [updated] = await db
      .update(schema.tfdDrivers)
      .set({ ...driver, updatedAt: new Date() })
      .where(eq(schema.tfdDrivers.id, id))
      .returning();
    return updated;
  }

  async deleteTfdDriver(id: string): Promise<boolean> {
    await db.delete(schema.tfdDrivers).where(eq(schema.tfdDrivers.id, id));
    return true;
  }

  // TFD Trips
  async getTfdTrips(params: any): Promise<TfdTrip[]> {
    const conditions: any[] = [];

    if (params.unitId) conditions.push(eq(schema.tfdTrips.unitId, params.unitId));
    if (params.vehicleId) conditions.push(eq(schema.tfdTrips.vehicleId, params.vehicleId));
    if (params.driverId) conditions.push(eq(schema.tfdTrips.driverId, params.driverId));
    if (params.status) conditions.push(eq(schema.tfdTrips.status, params.status as any));

    let query = db.select().from(schema.tfdTrips);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(schema.tfdTrips.scheduledDeparture));
  }

  async getTfdTripById(id: string): Promise<TfdTrip | undefined> {
    const [trip] = await db.select().from(schema.tfdTrips).where(eq(schema.tfdTrips.id, id));
    return trip;
  }

  async createTfdTrip(trip: InsertTfdTrip): Promise<TfdTrip> {
    const [created] = await db.insert(schema.tfdTrips).values(trip).returning();
    return created;
  }

  async updateTfdTrip(id: string, trip: Partial<InsertTfdTrip>): Promise<TfdTrip | undefined> {
    const [updated] = await db
      .update(schema.tfdTrips)
      .set({ ...trip, updatedAt: new Date() })
      .where(eq(schema.tfdTrips.id, id))
      .returning();
    return updated;
  }

  async deleteTfdTrip(id: string): Promise<boolean> {
    await db.delete(schema.tfdTrips).where(eq(schema.tfdTrips.id, id));
    return true;
  }

  // TFD Trip Passengers
  async getTfdTripPassengers(tripId: string): Promise<TfdTripPassenger[]> {
    return db.select().from(schema.tfdTripPassengers).where(eq(schema.tfdTripPassengers.tripId, tripId));
  }

  async createTfdTripPassenger(passenger: InsertTfdTripPassenger): Promise<TfdTripPassenger> {
    const [created] = await db.insert(schema.tfdTripPassengers).values(passenger).returning();
    return created;
  }

  async updateTfdTripPassenger(id: string, passenger: Partial<InsertTfdTripPassenger>): Promise<TfdTripPassenger | undefined> {
    const [updated] = await db
      .update(schema.tfdTripPassengers)
      .set(passenger)
      .where(eq(schema.tfdTripPassengers.id, id))
      .returning();
    return updated;
  }

  // Health Units
  async getHealthUnits(): Promise<HealthUnit[]> {
    return db.select().from(schema.healthUnits).orderBy(asc(schema.healthUnits.name));
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
    await db.delete(schema.healthUnits).where(eq(schema.healthUnits.id, id));
    return true;
  }

  // Professionals
  async getProfessionals(unitId?: string): Promise<Professional[]> {
    if (unitId) {
      return db.select().from(schema.professionals).where(eq(schema.professionals.unitId, unitId)).orderBy(asc(schema.professionals.name));
    }
    return db.select().from(schema.professionals).orderBy(asc(schema.professionals.name));
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
    await db.delete(schema.professionals).where(eq(schema.professionals.id, id));
    return true;
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

  async updateUser(id: string, data: Partial<{ name: string; email: string; phone: string; password: string }>): Promise<User | undefined> {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) updateData.passwordHash = data.password;

    const [updated] = await db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  // RENAME Catalog
  async searchRenameCatalog(params: { search?: string; therapeuticClass?: string; limit?: number }): Promise<schema.RenameCatalog[]> {
    const conditions: any[] = [eq(schema.renameCatalog.active, true)];

    if (params.search) {
      conditions.push(
        or(
          like(schema.renameCatalog.commercialName, `%${params.search}%`),
          like(schema.renameCatalog.activeIngredient, `%${params.search}%`)
        )
      );
    }

    if (params.therapeuticClass) {
      conditions.push(eq(schema.renameCatalog.therapeuticClass, params.therapeuticClass));
    }

    return db
      .select()
      .from(schema.renameCatalog)
      .where(and(...conditions))
      .limit(params.limit || 50)
      .orderBy(asc(schema.renameCatalog.commercialName));
  }

  // ============================================================================
  // DIAPER STOCK
  // ============================================================================
  
  async getDiaperStock(params: { unitId?: string; size?: string; status?: string; search?: string }): Promise<DiaperStock[]> {
    const conditions: any[] = [eq(schema.diaperStock.active, true)];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperStock.unitId, params.unitId));
    }
    if (params.size) {
      conditions.push(eq(schema.diaperStock.size, params.size as any));
    }
    if (params.status) {
      conditions.push(eq(schema.diaperStock.status, params.status as any));
    }
    if (params.search) {
      conditions.push(
        or(
          like(schema.diaperStock.name, `%${params.search}%`),
          like(schema.diaperStock.batch, `%${params.search}%`),
          like(schema.diaperStock.brand, `%${params.search}%`)
        )
      );
    }
    
    return db
      .select()
      .from(schema.diaperStock)
      .where(and(...conditions))
      .orderBy(asc(schema.diaperStock.expirationDate));
  }

  async getDiaperStockById(id: string): Promise<DiaperStock | undefined> {
    const [stock] = await db.select().from(schema.diaperStock).where(eq(schema.diaperStock.id, id));
    return stock;
  }

  async createDiaperStock(stock: InsertDiaperStock): Promise<DiaperStock> {
    const availableQuantity = (stock.currentQuantity || 0) - (stock.reservedQuantity || 0);
    const [created] = await db.insert(schema.diaperStock).values({
      ...stock,
      availableQuantity: availableQuantity,
    }).returning();
    return created;
  }

  async updateDiaperStock(id: string, stock: Partial<InsertDiaperStock>): Promise<DiaperStock | undefined> {
    const existing = await this.getDiaperStockById(id);
    if (!existing) return undefined;
    
    const currentQty = stock.currentQuantity ?? existing.currentQuantity;
    const reservedQty = stock.reservedQuantity ?? existing.reservedQuantity;
    const availableQuantity = currentQty - reservedQty;
    
    let status = existing.status;
    if (currentQty <= 0) {
      status = 'depleted';
    } else if (existing.expirationDate && new Date(existing.expirationDate) < new Date()) {
      status = 'expired';
    } else if (currentQty <= existing.minStock) {
      status = 'low_stock';
    } else {
      status = 'active';
    }
    
    const [updated] = await db
      .update(schema.diaperStock)
      .set({ ...stock, availableQuantity, status, updatedAt: new Date() })
      .where(eq(schema.diaperStock.id, id))
      .returning();
    return updated;
  }

  async deleteDiaperStock(id: string): Promise<boolean> {
    await db.update(schema.diaperStock).set({ active: false }).where(eq(schema.diaperStock.id, id));
    return true;
  }

  async getLowDiaperStock(unitId: string): Promise<DiaperStock[]> {
    return db
      .select()
      .from(schema.diaperStock)
      .where(
        and(
          eq(schema.diaperStock.unitId, unitId),
          eq(schema.diaperStock.active, true),
          sql`${schema.diaperStock.currentQuantity} <= ${schema.diaperStock.minStock}`
        )
      )
      .orderBy(asc(schema.diaperStock.currentQuantity));
  }

  async getExpiringDiaperStock(unitId: string, daysAhead: number = 60): Promise<DiaperStock[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return db
      .select()
      .from(schema.diaperStock)
      .where(
        and(
          eq(schema.diaperStock.unitId, unitId),
          eq(schema.diaperStock.active, true),
          lte(schema.diaperStock.expirationDate, futureDate),
          sql`${schema.diaperStock.currentQuantity} > 0`
        )
      )
      .orderBy(asc(schema.diaperStock.expirationDate));
  }

  async getDiaperStockByFIFO(unitId: string, size: string, quantity: number): Promise<DiaperStock[]> {
    return db
      .select()
      .from(schema.diaperStock)
      .where(
        and(
          eq(schema.diaperStock.unitId, unitId),
          eq(schema.diaperStock.size, size as any),
          eq(schema.diaperStock.active, true),
          sql`${schema.diaperStock.availableQuantity} > 0`,
          gte(schema.diaperStock.expirationDate, new Date())
        )
      )
      .orderBy(asc(schema.diaperStock.expirationDate));
  }

  // Diaper Stock Movements
  async createDiaperStockMovement(movement: InsertDiaperStockMovement): Promise<DiaperStockMovement> {
    const [created] = await db.insert(schema.diaperStockMovements).values(movement).returning();
    
    const stock = await this.getDiaperStockById(movement.stockId);
    if (stock) {
      await this.updateDiaperStock(movement.stockId, {
        currentQuantity: movement.newQuantity,
      });
    }
    
    return created;
  }

  async getDiaperStockMovements(params: { unitId?: string; stockId?: string; limit?: number }): Promise<DiaperStockMovement[]> {
    const conditions: any[] = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperStockMovements.unitId, params.unitId));
    }
    if (params.stockId) {
      conditions.push(eq(schema.diaperStockMovements.stockId, params.stockId));
    }
    
    let query = db.select().from(schema.diaperStockMovements);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.diaperStockMovements.createdAt)).limit(params.limit || 100);
  }

  // ============================================================================
  // SOCIAL ASSISTANCE BENEFICIARIES
  // ============================================================================
  
  async getSaBeneficiaries(params: { unitId?: string; search?: string; status?: string; limit?: number }): Promise<SaBeneficiary[]> {
    const conditions: any[] = [eq(schema.saBeneficiaries.active, true)];
    
    if (params.unitId) {
      conditions.push(eq(schema.saBeneficiaries.unitId, params.unitId));
    }
    if (params.status) {
      conditions.push(eq(schema.saBeneficiaries.status, params.status as any));
    }
    if (params.search) {
      conditions.push(
        or(
          like(schema.saBeneficiaries.name, `%${params.search}%`),
          like(schema.saBeneficiaries.cpf, `%${params.search}%`),
          like(schema.saBeneficiaries.nis, `%${params.search}%`)
        )
      );
    }
    
    return db
      .select()
      .from(schema.saBeneficiaries)
      .where(and(...conditions))
      .orderBy(asc(schema.saBeneficiaries.name))
      .limit(params.limit || 100);
  }

  async getSaBeneficiaryById(id: string): Promise<SaBeneficiary | undefined> {
    const [beneficiary] = await db.select().from(schema.saBeneficiaries).where(eq(schema.saBeneficiaries.id, id));
    return beneficiary;
  }

  async getSaBeneficiaryByCpf(cpf: string): Promise<SaBeneficiary | undefined> {
    const [beneficiary] = await db.select().from(schema.saBeneficiaries).where(eq(schema.saBeneficiaries.cpf, cpf));
    return beneficiary;
  }

  async createSaBeneficiary(beneficiary: InsertSaBeneficiary): Promise<SaBeneficiary> {
    const [created] = await db.insert(schema.saBeneficiaries).values(beneficiary).returning();
    return created;
  }

  async updateSaBeneficiary(id: string, beneficiary: Partial<InsertSaBeneficiary>): Promise<SaBeneficiary | undefined> {
    const [updated] = await db
      .update(schema.saBeneficiaries)
      .set({ ...beneficiary, updatedAt: new Date() })
      .where(eq(schema.saBeneficiaries.id, id))
      .returning();
    return updated;
  }

  async deleteSaBeneficiary(id: string): Promise<boolean> {
    await db.update(schema.saBeneficiaries).set({ active: false }).where(eq(schema.saBeneficiaries.id, id));
    return true;
  }

  // ============================================================================
  // DIAPER REQUESTS
  // ============================================================================
  
  async getDiaperRequests(params: { unitId?: string; beneficiaryId?: string; status?: string; limit?: number }): Promise<DiaperRequest[]> {
    const conditions: any[] = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperRequests.unitId, params.unitId));
    }
    if (params.beneficiaryId) {
      conditions.push(eq(schema.diaperRequests.beneficiaryId, params.beneficiaryId));
    }
    if (params.status) {
      conditions.push(eq(schema.diaperRequests.status, params.status as any));
    }
    
    let query = db.select().from(schema.diaperRequests);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.diaperRequests.createdAt)).limit(params.limit || 100);
  }

  async getDiaperRequestById(id: string): Promise<DiaperRequest | undefined> {
    const [request] = await db.select().from(schema.diaperRequests).where(eq(schema.diaperRequests.id, id));
    return request;
  }

  async createDiaperRequest(request: InsertDiaperRequest): Promise<DiaperRequest> {
    const [created] = await db.insert(schema.diaperRequests).values(request).returning();
    return created;
  }

  async updateDiaperRequest(id: string, request: Partial<InsertDiaperRequest>): Promise<DiaperRequest | undefined> {
    const [updated] = await db
      .update(schema.diaperRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(schema.diaperRequests.id, id))
      .returning();
    return updated;
  }

  async deleteDiaperRequest(id: string): Promise<boolean> {
    await db.update(schema.diaperRequests).set({ status: 'cancelado' }).where(eq(schema.diaperRequests.id, id));
    return true;
  }

  async generateDiaperRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperRequests)
      .where(like(schema.diaperRequests.requestNumber, `SOL-${year}-%`));
    
    const count = result[0]?.count || 0;
    return `SOL-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ============================================================================
  // DIAPER AUTHORIZATIONS
  // ============================================================================
  
  async getDiaperAuthorizations(params: { unitId?: string; beneficiaryId?: string; requestId?: string; status?: string }): Promise<DiaperAuthorization[]> {
    const conditions: any[] = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperAuthorizations.unitId, params.unitId));
    }
    if (params.beneficiaryId) {
      conditions.push(eq(schema.diaperAuthorizations.beneficiaryId, params.beneficiaryId));
    }
    if (params.requestId) {
      conditions.push(eq(schema.diaperAuthorizations.requestId, params.requestId));
    }
    if (params.status) {
      conditions.push(eq(schema.diaperAuthorizations.status, params.status as any));
    }
    
    let query = db.select().from(schema.diaperAuthorizations);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.diaperAuthorizations.createdAt));
  }

  async getDiaperAuthorizationById(id: string): Promise<DiaperAuthorization | undefined> {
    const [auth] = await db.select().from(schema.diaperAuthorizations).where(eq(schema.diaperAuthorizations.id, id));
    return auth;
  }

  async createDiaperAuthorization(auth: InsertDiaperAuthorization): Promise<DiaperAuthorization> {
    const quantityRemaining = auth.quantityAuthorized - (auth.quantityDelivered || 0);
    const [created] = await db.insert(schema.diaperAuthorizations).values({
      ...auth,
      quantityRemaining,
    }).returning();
    return created;
  }

  async updateDiaperAuthorization(id: string, auth: Partial<InsertDiaperAuthorization>): Promise<DiaperAuthorization | undefined> {
    const existing = await this.getDiaperAuthorizationById(id);
    if (!existing) return undefined;
    
    const quantityDelivered = auth.quantityDelivered ?? existing.quantityDelivered ?? 0;
    const quantityAuthorized = auth.quantityAuthorized ?? existing.quantityAuthorized;
    const quantityRemaining = quantityAuthorized - quantityDelivered;
    
    let status = existing.status;
    if (quantityRemaining <= 0) {
      status = 'utilizada';
    } else if (quantityDelivered > 0) {
      status = 'parcialmente_utilizada';
    }
    
    const [updated] = await db
      .update(schema.diaperAuthorizations)
      .set({ ...auth, quantityRemaining, status, updatedAt: new Date() })
      .where(eq(schema.diaperAuthorizations.id, id))
      .returning();
    return updated;
  }

  async generateDiaperAuthorizationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperAuthorizations)
      .where(like(schema.diaperAuthorizations.authorizationNumber, `AUT-${year}-%`));
    
    const count = result[0]?.count || 0;
    return `AUT-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ============================================================================
  // DIAPER DELIVERIES
  // ============================================================================
  
  async getDiaperDeliveries(params: { unitId?: string; beneficiaryId?: string; authorizationId?: string }): Promise<DiaperDelivery[]> {
    const conditions: any[] = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperDeliveries.unitId, params.unitId));
    }
    if (params.beneficiaryId) {
      conditions.push(eq(schema.diaperDeliveries.beneficiaryId, params.beneficiaryId));
    }
    if (params.authorizationId) {
      conditions.push(eq(schema.diaperDeliveries.authorizationId, params.authorizationId));
    }
    
    let query = db.select().from(schema.diaperDeliveries);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.diaperDeliveries.createdAt));
  }

  async getDiaperDeliveryById(id: string): Promise<DiaperDelivery | undefined> {
    const [delivery] = await db.select().from(schema.diaperDeliveries).where(eq(schema.diaperDeliveries.id, id));
    return delivery;
  }

  async createDiaperDelivery(delivery: InsertDiaperDelivery): Promise<DiaperDelivery> {
    const [created] = await db.insert(schema.diaperDeliveries).values(delivery).returning();
    return created;
  }

  async generateDiaperDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperDeliveries)
      .where(like(schema.diaperDeliveries.deliveryNumber, `ENT-${year}-%`));
    
    const count = result[0]?.count || 0;
    return `ENT-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ============================================================================
  // DIAPER MONTHLY LISTS
  // ============================================================================
  
  async getDiaperMonthlyLists(params: { unitId?: string; status?: string }): Promise<DiaperMonthlyList[]> {
    const conditions: any[] = [];
    
    if (params.unitId) {
      conditions.push(eq(schema.diaperMonthlyLists.unitId, params.unitId));
    }
    if (params.status) {
      conditions.push(eq(schema.diaperMonthlyLists.processingStatus, params.status as any));
    }
    
    let query = db.select().from(schema.diaperMonthlyLists);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query.orderBy(desc(schema.diaperMonthlyLists.createdAt));
  }

  async getDiaperMonthlyListById(id: string): Promise<DiaperMonthlyList | undefined> {
    const [list] = await db.select().from(schema.diaperMonthlyLists).where(eq(schema.diaperMonthlyLists.id, id));
    return list;
  }

  async createDiaperMonthlyList(list: InsertDiaperMonthlyList): Promise<DiaperMonthlyList> {
    const [created] = await db.insert(schema.diaperMonthlyLists).values(list).returning();
    return created;
  }

  async updateDiaperMonthlyList(id: string, list: Partial<InsertDiaperMonthlyList>): Promise<DiaperMonthlyList | undefined> {
    const [updated] = await db
      .update(schema.diaperMonthlyLists)
      .set({ ...list, updatedAt: new Date() })
      .where(eq(schema.diaperMonthlyLists.id, id))
      .returning();
    return updated;
  }

  async generateDiaperMonthlyListNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperMonthlyLists)
      .where(like(schema.diaperMonthlyLists.listNumber, `LIST-${year}${String(month).padStart(2, '0')}-%`));
    
    const count = result[0]?.count || 0;
    return `LIST-${year}${String(month).padStart(2, '0')}-${String(count + 1).padStart(3, '0')}`;
  }

  // ============================================================================
  // SOCIAL ASSISTANCE STATS
  // ============================================================================
  
  async getSaStats(unitId: string): Promise<{
    totalBeneficiaries: number;
    pendingRequests: number;
    authorizedThisMonth: number;
    deliveredThisMonth: number;
    lowDiaperStock: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [beneficiariesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.saBeneficiaries)
      .where(and(
        eq(schema.saBeneficiaries.unitId, unitId),
        eq(schema.saBeneficiaries.active, true)
      ));
    
    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperRequests)
      .where(and(
        eq(schema.diaperRequests.unitId, unitId),
        eq(schema.diaperRequests.status, 'pendente')
      ));
    
    const [authorizedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperAuthorizations)
      .where(and(
        eq(schema.diaperAuthorizations.unitId, unitId),
        gte(schema.diaperAuthorizations.issuedAt, startOfMonth)
      ));
    
    const [deliveredResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.diaperDeliveries)
      .where(and(
        eq(schema.diaperDeliveries.unitId, unitId),
        gte(schema.diaperDeliveries.deliveredAt, startOfMonth)
      ));
    
    const lowStock = await this.getLowDiaperStock(unitId);
    
    return {
      totalBeneficiaries: beneficiariesResult?.count || 0,
      pendingRequests: pendingResult?.count || 0,
      authorizedThisMonth: authorizedResult?.count || 0,
      deliveredThisMonth: deliveredResult?.count || 0,
      lowDiaperStock: lowStock.length,
    };
  }

  async getDiaperDemandForecast(unitId: string): Promise<{
    size: string;
    avgMonthlyDemand: number;
    currentStock: number;
    monthsOfStock: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    recommendation: string;
  }[]> {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const sizes = ['RN', 'P', 'M', 'G', 'XG', 'XXG', 'geriatrica_P', 'geriatrica_M', 'geriatrica_G', 'geriatrica_XG'];
    const forecasts: {
      size: string;
      avgMonthlyDemand: number;
      currentStock: number;
      monthsOfStock: number;
      trend: 'increasing' | 'stable' | 'decreasing';
      recommendation: string;
    }[] = [];

    for (const size of sizes) {
      const deliveriesM3 = await db
        .select({ total: sql<number>`COALESCE(SUM(${schema.diaperDeliveries.quantityDelivered}), 0)` })
        .from(schema.diaperDeliveries)
        .where(and(
          eq(schema.diaperDeliveries.unitId, unitId),
          eq(schema.diaperDeliveries.diaperSize, size as any),
          gte(schema.diaperDeliveries.deliveredAt, threeMonthsAgo),
          lt(schema.diaperDeliveries.deliveredAt, twoMonthsAgo)
        ));

      const deliveriesM2 = await db
        .select({ total: sql<number>`COALESCE(SUM(${schema.diaperDeliveries.quantityDelivered}), 0)` })
        .from(schema.diaperDeliveries)
        .where(and(
          eq(schema.diaperDeliveries.unitId, unitId),
          eq(schema.diaperDeliveries.diaperSize, size as any),
          gte(schema.diaperDeliveries.deliveredAt, twoMonthsAgo),
          lt(schema.diaperDeliveries.deliveredAt, oneMonthAgo)
        ));

      const deliveriesM1 = await db
        .select({ total: sql<number>`COALESCE(SUM(${schema.diaperDeliveries.quantityDelivered}), 0)` })
        .from(schema.diaperDeliveries)
        .where(and(
          eq(schema.diaperDeliveries.unitId, unitId),
          eq(schema.diaperDeliveries.diaperSize, size as any),
          gte(schema.diaperDeliveries.deliveredAt, oneMonthAgo)
        ));

      const m3 = deliveriesM3[0]?.total || 0;
      const m2 = deliveriesM2[0]?.total || 0;
      const m1 = deliveriesM1[0]?.total || 0;

      const avgMonthlyDemand = Math.round((m1 + m2 + m3) / 3);

      const stockResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${schema.diaperStock.currentQuantity}), 0)` })
        .from(schema.diaperStock)
        .where(and(
          eq(schema.diaperStock.unitId, unitId),
          eq(schema.diaperStock.size, size as any),
          eq(schema.diaperStock.active, true)
        ));

      const currentStock = stockResult[0]?.total || 0;
      const monthsOfStock = avgMonthlyDemand > 0 ? Math.round((currentStock / avgMonthlyDemand) * 10) / 10 : 999;

      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (m1 > m2 * 1.1 && m2 > m3 * 1.1) {
        trend = 'increasing';
      } else if (m1 < m2 * 0.9 && m2 < m3 * 0.9) {
        trend = 'decreasing';
      }

      let recommendation = '';
      if (monthsOfStock < 1) {
        recommendation = 'URGENTE: Estoque crítico, reabastecer imediatamente';
      } else if (monthsOfStock < 2) {
        recommendation = 'ATENÇÃO: Estoque baixo, programar reposição';
      } else if (monthsOfStock > 6) {
        recommendation = 'Estoque elevado, considerar redistribuição';
      } else {
        recommendation = 'Estoque adequado';
      }

      if (trend === 'increasing' && monthsOfStock < 3) {
        recommendation += ' (demanda em alta)';
      }

      forecasts.push({
        size,
        avgMonthlyDemand,
        currentStock,
        monthsOfStock,
        trend,
        recommendation,
      });
    }

    return forecasts.filter(f => f.avgMonthlyDemand > 0 || f.currentStock > 0);
  }
}

export const storage = new DbStorage();
