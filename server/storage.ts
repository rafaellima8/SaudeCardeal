import { db } from "./db";
import { eq, and, or, desc, asc, like, sql, gte, lte } from "drizzle-orm";
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
}

export const storage = new DbStorage();
