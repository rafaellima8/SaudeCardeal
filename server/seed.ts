import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Create Health Units
  const [unit1] = await db.insert(schema.healthUnits).values({
    name: "UBS Centro",
    cnes: "0000001",
    address: "Rua Principal, 100 - Centro, Cardeal da Silva - BA",
    phone: "(75) 3000-0001",
  }).returning();

  const [unit2] = await db.insert(schema.healthUnits).values({
    name: "UBS Vila Nova",
    cnes: "0000002",
    address: "Av. das Flores, 250 - Vila Nova, Cardeal da Silva - BA",
    phone: "(75) 3000-0002",
  }).returning();

  console.log("✅ Unidades de saúde criadas");

  // Create Users WITH PASSWORDS
  const adminPassword = "Admin@2025";
  const acsPassword = "Acs@2025";
  const defaultPassword = "Senha@2025";
  
  const [user1] = await db.insert(schema.users).values({
    email: "dra.maria@cardealdasilva.ba.gov.br",
    name: "Dra. Maria Silva",
    passwordHash: await bcrypt.hash(defaultPassword, 10),
    role: "medico",
    unitId: unit1.id,
  }).returning();

  const [user2] = await db.insert(schema.users).values({
    email: "enf.carlos@cardealdasilva.ba.gov.br",
    name: "Enf. Carlos Santos",
    passwordHash: await bcrypt.hash(defaultPassword, 10),
    role: "enfermeiro",
    unitId: unit1.id,
  }).returning();

  const [user3] = await db.insert(schema.users).values({
    email: "recepcao@cardealdasilva.ba.gov.br",
    name: "Ana Paula Recepcionista",
    passwordHash: await bcrypt.hash(defaultPassword, 10),
    role: "recepcao",
    unitId: unit1.id,
  }).returning();

  // ADMINISTRATOR USER - Full access
  const [adminUser] = await db.insert(schema.users).values({
    email: "admin@saude.gov.br",
    name: "Administrador do Sistema",
    passwordHash: await bcrypt.hash(adminPassword, 10),
    role: "admin",
    unitId: unit1.id,
  }).returning();

  // ACS USER - Restricted to Territory and ACE
  const [acsUser] = await db.insert(schema.users).values({
    email: "acs@saude.gov.br",
    name: "João Silva",
    passwordHash: await bcrypt.hash(acsPassword, 10),
    role: "acs",
    unitId: unit1.id,
  }).returning();

  console.log("✅ Usuários criados");
  console.log("\n📝 CREDENCIAIS DE ACESSO:");
  console.log("\n🔐 ADMINISTRADOR:");
  console.log(`   Email: admin@saude.gov.br`);
  console.log(`   Senha: ${adminPassword}`);
  console.log("\n🔐 AGENTE COMUNITÁRIO (ACS):");
  console.log(`   Email: acs@saude.gov.br`);
  console.log(`   Senha: ${acsPassword}`);

  // Create Professionals
  const [prof1] = await db.insert(schema.professionals).values({
    userId: user1.id,
    name: "Dra. Maria Silva",
    specialty: "Clínica Geral",
    cns: "123456789012345",
    crm: "BA-12345",
    unitId: unit1.id,
  }).returning();

  const [prof2] = await db.insert(schema.professionals).values({
    userId: user2.id,
    name: "Enf. Carlos Santos",
    specialty: "Enfermagem",
    cns: "987654321098765",
    unitId: unit1.id,
  }).returning();

  const [prof3] = await db.insert(schema.professionals).values({
    name: "Dr. Roberto Lima",
    specialty: "Pediatria",
    cns: "456789012345678",
    crm: "BA-67890",
    unitId: unit2.id,
  }).returning();

  console.log("✅ Profissionais criados");

  // Create Citizens
  const citizens = await db.insert(schema.citizens).values([
    {
      name: "João Silva Santos",
      cpf: "123.456.789-00",
      cns: "123 4567 8901 2345",
      birthDate: new Date("1979-03-15"),
      gender: "M",
      phone: "(75) 98888-0001",
      address: "Rua das Acácias, 45 - Centro",
      bloodType: "O+",
      allergies: ["Penicilina", "Dipirona"],
      unitId: unit1.id,
    },
    {
      name: "Maria Oliveira Costa",
      cpf: "987.654.321-00",
      cns: "987 6543 2109 8765",
      birthDate: new Date("1992-08-22"),
      gender: "F",
      phone: "(75) 98888-0002",
      address: "Av. Brasil, 120 - Vila Nova",
      bloodType: "A+",
      allergies: [],
      unitId: unit1.id,
    },
    {
      name: "Pedro Almeida Souza",
      cpf: "456.789.123-00",
      cns: "456 7891 2345 6789",
      birthDate: new Date("1957-11-10"),
      gender: "M",
      phone: "(75) 98888-0003",
      address: "Rua das Palmeiras, 78",
      bloodType: "B+",
      allergies: [],
      unitId: unit1.id,
    },
    {
      name: "Ana Paula Ferreira",
      cpf: "321.654.987-00",
      cns: "321 6549 8765 4321",
      birthDate: new Date("1996-05-18"),
      gender: "F",
      phone: "(75) 98888-0004",
      address: "Travessa São João, 12",
      bloodType: "AB+",
      allergies: [],
      unitId: unit2.id,
    },
  ]).returning();

  console.log("✅ Cidadãos criados");

  // Create Consultations
  const [consultation1] = await db.insert(schema.consultations).values({
    citizenId: citizens[0].id,
    professionalId: prof1.id,
    unitId: unit1.id,
    consultationDate: new Date("2025-01-15T08:00:00"),
    type: "Consulta Médica",
    chiefComplaint: "Pressão alta",
    anamnesis: "Paciente relata dores de cabeça frequentes e tontura",
    physicalExam: "PA: 150/95 mmHg, FC: 78 bpm, Peso: 85kg",
    diagnosis: "Hipertensão arterial sistêmica",
    cid10: ["I10"],
    treatment: "Iniciado tratamento anti-hipertensivo",
    notes: "Orientado sobre dieta e exercícios físicos",
  }).returning();

  const [consultation2] = await db.insert(schema.consultations).values({
    citizenId: citizens[0].id,
    professionalId: prof2.id,
    unitId: unit1.id,
    consultationDate: new Date("2024-12-10T09:30:00"),
    type: "Consulta Enfermagem",
    chiefComplaint: "Controle de rotina",
    physicalExam: "PA: 140/90 mmHg, FC: 72 bpm",
    diagnosis: "Controle de hipertensão",
    cid10: ["I10"],
    notes: "Sinais vitais estáveis. Orientações sobre medicação.",
  }).returning();

  console.log("✅ Consultas criadas");

  // Create Prescriptions
  await db.insert(schema.prescriptions).values([
    {
      consultationId: consultation1.id,
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      medication: "Losartana 50mg",
      dosage: "50mg",
      frequency: "1 vez ao dia",
      duration: "30 dias",
      quantity: 30,
      instructions: "Tomar pela manhã, em jejum",
    },
    {
      consultationId: consultation1.id,
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      medication: "Hidroclorotiazida 25mg",
      dosage: "25mg",
      frequency: "1 vez ao dia",
      duration: "30 dias",
      quantity: 30,
      instructions: "Tomar junto com Losartana",
    },
  ]);

  console.log("✅ Prescrições criadas");

  // Create Medications
  const medications = await db.insert(schema.medications).values([
    {
      name: "Losartana 50mg",
      category: "Anti-hipertensivo",
      activeIngredient: "Losartana potássica",
      dosageForm: "Comprimido",
      strength: "50mg",
      manufacturer: "EMS",
      unitId: unit1.id,
    },
    {
      name: "Dipirona 500mg",
      category: "Analgésico",
      activeIngredient: "Dipirona sódica",
      dosageForm: "Comprimido",
      strength: "500mg",
      manufacturer: "Neo Química",
      unitId: unit1.id,
    },
    {
      name: "Amoxicilina 500mg",
      category: "Antibiótico",
      activeIngredient: "Amoxicilina",
      dosageForm: "Cápsula",
      strength: "500mg",
      manufacturer: "Medley",
      unitId: unit1.id,
    },
    {
      name: "Paracetamol 750mg",
      category: "Analgésico",
      activeIngredient: "Paracetamol",
      dosageForm: "Comprimido",
      strength: "750mg",
      manufacturer: "EMS",
      unitId: unit1.id,
    },
    {
      name: "Metformina 850mg",
      category: "Antidiabético",
      activeIngredient: "Cloridrato de metformina",
      dosageForm: "Comprimido",
      strength: "850mg",
      manufacturer: "Neo Química",
      unitId: unit1.id,
    },
  ]).returning();

  console.log("✅ Medicamentos criados");

  // Create Medication Stock
  await db.insert(schema.medicationStock).values([
    {
      medicationId: medications[0].id,
      batch: "L2024-001",
      quantity: 450,
      minStock: 200,
      unit: "comp",
      expirationDate: new Date("2025-12-15"),
    },
    {
      medicationId: medications[1].id,
      batch: "D2024-032",
      quantity: 180,
      minStock: 300,
      unit: "comp",
      expirationDate: new Date("2025-08-20"),
    },
    {
      medicationId: medications[2].id,
      batch: "A2024-015",
      quantity: 95,
      minStock: 150,
      unit: "cáps",
      expirationDate: new Date("2025-06-10"),
    },
    {
      medicationId: medications[3].id,
      batch: "P2024-098",
      quantity: 520,
      minStock: 250,
      unit: "comp",
      expirationDate: new Date("2026-03-25"),
    },
    {
      medicationId: medications[4].id,
      batch: "M2024-056",
      quantity: 140,
      minStock: 180,
      unit: "comp",
      expirationDate: new Date("2025-09-30"),
    },
  ]);

  console.log("✅ Estoque de medicamentos criado");

  // Create Exams
  await db.insert(schema.exams).values([
    {
      consultationId: consultation1.id,
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      type: "Hemograma completo",
      requestDate: new Date("2025-01-12"),
      completionDate: new Date("2025-01-13"),
      result: "Normal",
      status: "completed",
    },
    {
      consultationId: consultation1.id,
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      type: "Glicemia de jejum",
      requestDate: new Date("2025-01-12"),
      completionDate: new Date("2025-01-13"),
      result: "95 mg/dL",
      status: "completed",
    },
  ]);

  console.log("✅ Exames criados");

  // Create Appointments
  const today = new Date();
  await db.insert(schema.appointments).values([
    {
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      appointmentDate: new Date(today.setHours(9, 0, 0, 0)),
      type: "Retorno",
      status: "confirmed",
    },
    {
      citizenId: citizens[1].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      appointmentDate: new Date(today.setHours(9, 30, 0, 0)),
      type: "Consulta Médica",
      status: "confirmed",
    },
    {
      citizenId: citizens[2].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      appointmentDate: new Date(today.setHours(10, 0, 0, 0)),
      type: "Consulta Médica",
      status: "scheduled",
    },
  ]);

  console.log("✅ Agendamentos criados");

  // Create TFD Requests
  await db.insert(schema.tfdRequests).values([
    {
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      destination: "Salvador - BA",
      procedure: "Ressonância Magnética",
      justification: "Investigação de cefaleia persistente",
      requestDate: new Date("2025-01-10"),
      travelDate: new Date("2025-01-20"),
      status: "approved",
    },
    {
      citizenId: citizens[1].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      destination: "Feira de Santana - BA",
      procedure: "Consulta Cardiologia",
      justification: "Avaliação cardiológica especializada",
      requestDate: new Date("2025-01-12"),
      travelDate: new Date("2025-01-25"),
      status: "scheduled",
    },
    {
      citizenId: citizens[2].id,
      professionalId: prof3.id,
      unitId: unit2.id,
      destination: "Salvador - BA",
      procedure: "Cirurgia Ortopédica",
      justification: "Correção de hérnia de disco",
      requestDate: new Date("2025-01-14"),
      status: "pending",
    },
  ]);

  console.log("✅ Solicitações TFD criadas");

  // Create Attendance Queue
  await db.insert(schema.attendanceQueue).values([
    {
      citizenId: citizens[0].id,
      unitId: unit1.id,
      ticket: "A001",
      priority: "normal",
      type: "Consulta Médica",
      status: "in_progress",
      professionalId: prof1.id,
      room: "Consultório 1",
      calledAt: new Date(),
    },
    {
      citizenId: citizens[1].id,
      unitId: unit1.id,
      ticket: "A002",
      priority: "normal",
      type: "Retorno",
      status: "waiting",
    },
    {
      citizenId: citizens[2].id,
      unitId: unit1.id,
      ticket: "P001",
      priority: "urgent",
      type: "Urgência",
      status: "waiting",
    },
  ]);

  console.log("✅ Fila de atendimento criada");

  console.log("🎉 Seed concluído com sucesso!");
}

seed().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});
