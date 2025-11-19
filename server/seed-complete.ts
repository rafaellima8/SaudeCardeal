import { db } from "./db";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Iniciando seed completo do banco de dados SQLite...");

  try {
    // ============================================================================
    // HEALTH UNITS
    // ============================================================================
    console.log("\n📍 Criando unidades de saúde...");
    const [unit1] = await db.insert(schema.healthUnits).values({
      name: "UBS Centro - Dr. José Carlos",
      cnes: "2906501",
      address: "Rua Principal, 100 - Centro, Cardeal da Silva - BA, 48370-000",
      phone: "(75) 3000-0001",
    }).returning();

    const [unit2] = await db.insert(schema.healthUnits).values({
      name: "UBS Vila Nova",
      cnes: "2906502",
      address: "Av. das Flores, 250 - Vila Nova, Cardeal da Silva - BA, 48370-000",
      phone: "(75) 3000-0002",
    }).returning();

    console.log("✅ Unidades criadas:", unit1.name, unit2.name);

    // ============================================================================
    // USERS
    // ============================================================================
    console.log("\n👥 Criando usuários...");
    const adminPassword = "Admin@2025";
    const acsPassword = "Acs@2025";
    const defaultPassword = "Senha@2025";

    await db.insert(schema.users).values([
      {
        email: "admin@saude.gov.br",
        name: "Administrador do Sistema",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        unitId: unit1.id,
        cpf: "000.000.001-00",
      },
      {
        email: "acs@saude.gov.br",
        name: "João Silva (ACS)",
        passwordHash: await bcrypt.hash(acsPassword, 10),
        role: "acs",
        unitId: unit1.id,
        cpf: "000.000.002-00",
      },
      {
        email: "dra.maria@cardealdasilva.ba.gov.br",
        name: "Dra. Maria Silva",
        passwordHash: await bcrypt.hash(defaultPassword, 10),
        role: "medico",
        unitId: unit1.id,
        cpf: "123.456.789-01",
      },
      {
        email: "enf.carlos@cardealdasilva.ba.gov.br",
        name: "Enf. Carlos Santos",
        passwordHash: await bcrypt.hash(defaultPassword, 10),
        role: "enfermeiro",
        unitId: unit1.id,
        cpf: "987.654.321-01",
      },
      {
        email: "recepcao@cardealdasilva.ba.gov.br",
        name: "Ana Paula (Recepção)",
        passwordHash: await bcrypt.hash(defaultPassword, 10),
        role: "recepcao",
        unitId: unit1.id,
        cpf: "456.789.123-01",
      },
      {
        email: "farmacia@cardealdasilva.ba.gov.br",
        name: "Pedro Costa (Farmacêutico)",
        passwordHash: await bcrypt.hash(defaultPassword, 10),
        role: "farmaceutico",
        unitId: unit1.id,
        cpf: "321.654.987-01",
      },
    ]);

    console.log("✅ Usuários criados");
    console.log("\n📝 CREDENCIAIS DE ACESSO:");
    console.log("\n🔐 ADMINISTRADOR:");
    console.log(`   Email: admin@saude.gov.br`);
    console.log(`   Senha: ${adminPassword}`);
    console.log("\n🔐 AGENTE COMUNITÁRIO (ACS):");
    console.log(`   Email: acs@saude.gov.br`);
    console.log(`   Senha: ${acsPassword}`);
    console.log("\n🔐 DEMAIS USUÁRIOS:");
    console.log(`   Senha padrão: ${defaultPassword}`);

    // ============================================================================
    // PROFESSIONALS
    // ============================================================================
    console.log("\n👨‍⚕️ Criando profissionais...");
    const [prof1] = await db.insert(schema.professionals).values({
      name: "Dra. Maria Silva",
      cpf: "123.456.789-01",
      cns: "123456789012345",
      specialty: "Clínica Geral",
      councilType: "CRM",
      councilNumber: "12345",
      councilState: "BA",
      phone: "(75) 99999-0001",
      email: "dra.maria@cardealdasilva.ba.gov.br",
      unitId: unit1.id,
    }).returning();

    const [prof2] = await db.insert(schema.professionals).values({
      name: "Enf. Carlos Santos",
      cpf: "987.654.321-01",
      cns: "987654321098765",
      specialty: "Enfermagem",
      councilType: "COREN",
      councilNumber: "67890",
      councilState: "BA",
      phone: "(75) 99999-0002",
      email: "enf.carlos@cardealdasilva.ba.gov.br",
      unitId: unit1.id,
    }).returning();

    const [prof3] = await db.insert(schema.professionals).values({
      name: "Dr. Roberto Lima",
      cpf: "456.789.123-02",
      cns: "456789012345678",
      specialty: "Pediatria",
      councilType: "CRM",
      councilNumber: "54321",
      councilState: "BA",
      phone: "(75) 99999-0003",
      unitId: unit2.id,
    }).returning();

    const [profAcs] = await db.insert(schema.professionals).values({
      name: "João Silva (ACS)",
      cpf: "000.000.002-00",
      cns: "111222333444555",
      specialty: "Agente Comunitário de Saúde",
      councilType: "ACS",
      councilNumber: "ACS-001",
      councilState: "BA",
      phone: "(75) 99999-0010",
      unitId: unit1.id,
    }).returning();

    console.log("✅ Profissionais criados:", prof1.name, prof2.name, prof3.name, profAcs.name);

    // ============================================================================
    // CITIZENS
    // ============================================================================
    console.log("\n👨‍👩‍👧‍👦 Criando cidadãos...");
    const citizens = await db.insert(schema.citizens).values([
      {
        name: "João Silva Santos",
        cpf: "123.456.789-10",
        cns: "123 4567 8901 2345",
        birthDate: new Date("1979-03-15"),
        gender: "M",
        motherName: "Ana Silva Santos",
        phone: "(75) 98888-0001",
        address: "Rua das Acácias, 45",
        neighborhood: "Centro",
        city: "Cardeal da Silva",
        state: "BA",
        zipCode: "48370-000",
        unitId: unit1.id,
      },
      {
        name: "Maria Oliveira Costa",
        cpf: "987.654.321-10",
        cns: "987 6543 2109 8765",
        birthDate: new Date("1992-08-22"),
        gender: "F",
        motherName: "Rosa Oliveira",
        phone: "(75) 98888-0002",
        address: "Av. Brasil, 120",
        neighborhood: "Vila Nova",
        city: "Cardeal da Silva",
        state: "BA",
        zipCode: "48370-000",
        unitId: unit1.id,
      },
      {
        name: "Pedro Almeida Souza",
        cpf: "456.789.123-10",
        cns: "456 7891 2345 6789",
        birthDate: new Date("1957-11-10"),
        gender: "M",
        motherName: "Clara Almeida",
        phone: "(75) 98888-0003",
        address: "Rua das Palmeiras, 78",
        neighborhood: "Centro",
        city: "Cardeal da Silva",
        state: "BA",
        unitId: unit1.id,
      },
      {
        name: "Ana Paula Ferreira",
        cpf: "321.654.987-10",
        cns: "321 6549 8765 4321",
        birthDate: new Date("1996-05-18"),
        gender: "F",
        motherName: "Lucia Ferreira",
        phone: "(75) 98888-0004",
        address: "Travessa São João, 12",
        neighborhood: "Vila Nova",
        city: "Cardeal da Silva",
        state: "BA",
        unitId: unit2.id,
      },
      {
        name: "Carlos Eduardo Lima",
        cpf: "789.123.456-10",
        cns: "789 1234 5678 9012",
        birthDate: new Date("2010-02-05"),
        gender: "M",
        motherName: "Maria Lima",
        phone: "(75) 98888-0005",
        address: "Rua das Flores, 89",
        neighborhood: "Centro",
        city: "Cardeal da Silva",
        state: "BA",
        unitId: unit1.id,
      },
    ]).returning();

    console.log("✅ Cidadãos criados:", citizens.length);

    // ============================================================================
    // APPOINTMENTS
    // ============================================================================
    console.log("\n📅 Criando agendamentos...");
    await db.insert(schema.appointments).values([
      {
        citizenId: citizens[0].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        appointmentDate: new Date("2025-11-25T08:00:00"),
        type: "Consulta Médica",
        status: "scheduled",
        notes: "Retorno hipertensão",
      },
      {
        citizenId: citizens[1].id,
        professionalId: prof2.id,
        unitId: unit1.id,
        appointmentDate: new Date("2025-11-25T09:00:00"),
        type: "Consulta de Enfermagem",
        status: "scheduled",
      },
      {
        citizenId: citizens[2].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        appointmentDate: new Date("2025-11-20T10:30:00"),
        type: "Consulta Médica",
        status: "completed",
        notes: "Consulta realizada",
      },
      {
        citizenId: citizens[4].id,
        professionalId: prof3.id,
        unitId: unit2.id,
        appointmentDate: new Date("2025-11-26T14:00:00"),
        type: "Pediatria",
        status: "scheduled",
      },
    ]);

    console.log("✅ Agendamentos criados");

    // ============================================================================
    // ATTENDANCE QUEUE
    // ============================================================================
    console.log("\n🎫 Criando fila de atendimento...");
    await db.insert(schema.attendanceQueue).values([
      {
        citizenId: citizens[0].id,
        unitId: unit1.id,
        ticket: "P001",
        priority: "urgent",
        type: "Urgência",
        status: "waiting",
      },
      {
        citizenId: citizens[1].id,
        unitId: unit1.id,
        ticket: "N002",
        priority: "normal",
        type: "Consulta",
        status: "waiting",
      },
    ]);

    console.log("✅ Fila de atendimento criada");

    // ============================================================================
    // CONSULTATIONS
    // ============================================================================
    console.log("\n🩺 Criando consultas...");
    const [consultation1] = await db.insert(schema.consultations).values({
      citizenId: citizens[0].id,
      professionalId: prof1.id,
      unitId: unit1.id,
      consultationDate: new Date("2025-11-15T08:00:00"),
      type: "Consulta Médica",
      chiefComplaint: "Pressão alta e dores de cabeça",
      historyOfPresentIllness: "Paciente relata dores de cabeça frequentes há 2 semanas, tontura ocasional",
      physicalExam: "PA: 150/95 mmHg, FC: 78 bpm, Peso: 85kg, Altura: 1.75m",
      diagnosis: "Hipertensão arterial sistêmica (CID I10)",
      treatmentPlan: "Iniciado tratamento anti-hipertensivo com Losartana 50mg. Orientações sobre dieta hipossódica e exercícios físicos.",
      notes: "Retorno em 30 dias para reavaliação",
    }).returning();

    const [consultation2] = await db.insert(schema.consultations).values({
      citizenId: citizens[1].id,
      professionalId: prof2.id,
      unitId: unit1.id,
      consultationDate: new Date("2025-11-18T09:30:00"),
      type: "Consulta de Enfermagem",
      chiefComplaint: "Controle de rotina",
      physicalExam: "PA: 120/80 mmHg, FC: 72 bpm, Peso: 65kg",
      diagnosis: "Paciente saudável",
      notes: "Orientações sobre alimentação saudável",
    }).returning();

    console.log("✅ Consultas criadas");

    // ============================================================================
    // PRESCRIPTIONS
    // ============================================================================
    console.log("\n💊 Criando prescrições...");
    await db.insert(schema.prescriptions).values([
      {
        consultationId: consultation1.id,
        citizenId: citizens[0].id,
        professionalId: prof1.id,
        medication: "Losartana Potássica 50mg",
        dosage: "50mg",
        frequency: "1 vez ao dia",
        duration: "30 dias",
        quantity: 30,
        instructions: "Tomar pela manhã, em jejum, com água",
        status: "pending",
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
        status: "pending",
      },
    ]);

    console.log("✅ Prescrições criadas");

    // ============================================================================
    // MEDICATIONS
    // ============================================================================
    console.log("\n🧴 Criando medicamentos...");
    const medications = await db.insert(schema.medications).values([
      {
        name: "Losartana Potássica",
        genericName: "Losartana",
        manufacturer: "EMS",
        presentation: "Comprimido revestido",
        concentration: "50mg",
        unitId: unit1.id,
      },
      {
        name: "Hidroclorotiazida",
        genericName: "Hidroclorotiazida",
        manufacturer: "Neo Química",
        presentation: "Comprimido",
        concentration: "25mg",
        unitId: unit1.id,
      },
      {
        name: "Dipirona Sódica",
        genericName: "Dipirona",
        manufacturer: "Medley",
        presentation: "Comprimido",
        concentration: "500mg",
        unitId: unit1.id,
      },
      {
        name: "Amoxicilina",
        genericName: "Amoxicilina",
        manufacturer: "EMS",
        presentation: "Cápsula",
        concentration: "500mg",
        unitId: unit1.id,
      },
      {
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: "Medley",
        presentation: "Comprimido",
        concentration: "750mg",
        unitId: unit1.id,
      },
      {
        name: "Metformina",
        genericName: "Cloridrato de Metformina",
        manufacturer: "EMS",
        presentation: "Comprimido revestido",
        concentration: "850mg",
        unitId: unit1.id,
      },
    ]).returning();

    console.log("✅ Medicamentos criados:", medications.length);

    // ============================================================================
    // MEDICATION STOCK
    // ============================================================================
    console.log("\n📦 Criando estoque de medicamentos...");
    await db.insert(schema.medicationStock).values([
      {
        medicationId: medications[0].id,
        unitId: unit1.id,
        batchNumber: "L2024-001",
        quantity: 450,
        minStock: 200,
        expirationDate: new Date("2025-12-15"),
      },
      {
        medicationId: medications[1].id,
        unitId: unit1.id,
        batchNumber: "H2024-032",
        quantity: 180,
        minStock: 300,
        expirationDate: new Date("2025-08-20"),
      },
      {
        medicationId: medications[2].id,
        unitId: unit1.id,
        batchNumber: "D2024-015",
        quantity: 95,
        minStock: 150,
        expirationDate: new Date("2025-06-10"),
      },
      {
        medicationId: medications[3].id,
        unitId: unit1.id,
        batchNumber: "A2024-018",
        quantity: 280,
        minStock: 150,
        expirationDate: new Date("2025-07-22"),
      },
      {
        medicationId: medications[4].id,
        unitId: unit1.id,
        batchNumber: "P2024-098",
        quantity: 520,
        minStock: 250,
        expirationDate: new Date("2026-03-25"),
      },
      {
        medicationId: medications[5].id,
        unitId: unit1.id,
        batchNumber: "M2024-056",
        quantity: 140,
        minStock: 180,
        expirationDate: new Date("2025-09-30"),
      },
    ]);

    console.log("✅ Estoque de medicamentos criado");

    // ============================================================================
    // EXAMS
    // ============================================================================
    console.log("\n🔬 Criando exames...");
    await db.insert(schema.exams).values([
      {
        consultationId: consultation1.id,
        citizenId: citizens[0].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        examType: "Hemograma Completo",
        requestDate: new Date("2025-11-15T08:30:00"),
        status: "requested",
        observations: "Solicitar em jejum de 12 horas",
      },
      {
        consultationId: consultation1.id,
        citizenId: citizens[0].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        examType: "Glicemia em Jejum",
        requestDate: new Date("2025-11-15T08:30:00"),
        status: "requested",
      },
      {
        citizenId: citizens[2].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        examType: "Radiografia de Tórax",
        requestDate: new Date("2025-11-10T10:00:00"),
        resultDate: new Date("2025-11-12T14:00:00"),
        status: "completed",
        result: "Ausência de alterações radiológicas significativas",
      },
    ]);

    console.log("✅ Exames criados");

    // ============================================================================
    // TFD REQUESTS
    // ============================================================================
    console.log("\n🚗 Criando solicitações de TFD...");
    await db.insert(schema.tfdRequests).values([
      {
        citizenId: citizens[2].id,
        professionalId: prof1.id,
        unitId: unit1.id,
        requestDate: new Date("2025-11-18T11:00:00"),
        destination: "Salvador - BA",
        reason: "Consulta especializada em Cardiologia",
        procedure: "Ecocardiograma",
        status: "pending",
        observations: "Paciente hipertenso, necessita avaliação cardiológica especializada",
      },
      {
        citizenId: citizens[3].id,
        professionalId: prof2.id,
        unitId: unit2.id,
        requestDate: new Date("2025-11-10T09:00:00"),
        travelDate: new Date("2025-11-22T07:00:00"),
        destination: "Feira de Santana - BA",
        reason: "Exame de Ressonância Magnética",
        procedure: "RM de Coluna Lombar",
        status: "approved",
        observations: "Agendar para 22/11/2025 às 09:00",
      },
    ]);

    console.log("✅ Solicitações de TFD criadas");

    // ============================================================================
    // DWELLINGS (Territorial Management)
    // ============================================================================
    console.log("\n🏠 Criando domicílios...");
    const [dwelling1] = await db.insert(schema.dwellings).values({
      unitId: unit1.id,
      microarea: "01",
      address: "Rua das Acácias",
      number: "45",
      neighborhood: "Centro",
      zipCode: "48370-000",
      latitude: -11.8452,
      longitude: -38.0937,
      dwellingType: "casa",
      sanitation: "rede_esgoto",
      waterSupply: "rede_publica",
      hasElectricity: true,
      hasAnimals: false,
      familiesCount: 1,
    }).returning();

    const [dwelling2] = await db.insert(schema.dwellings).values({
      unitId: unit1.id,
      microarea: "01",
      address: "Av. Brasil",
      number: "120",
      neighborhood: "Vila Nova",
      zipCode: "48370-000",
      latitude: -11.8465,
      longitude: -38.0945,
      dwellingType: "apartamento",
      sanitation: "rede_esgoto",
      waterSupply: "rede_publica",
      hasElectricity: true,
      hasAnimals: true,
      familiesCount: 1,
    }).returning();

    const [dwelling3] = await db.insert(schema.dwellings).values({
      unitId: unit1.id,
      microarea: "02",
      address: "Rua das Palmeiras",
      number: "78",
      neighborhood: "Centro",
      zipCode: "48370-000",
      latitude: -11.8478,
      longitude: -38.0928,
      dwellingType: "casa",
      sanitation: "fossa_septica",
      waterSupply: "rede_publica",
      hasElectricity: true,
      hasAnimals: true,
      familiesCount: 1,
    }).returning();

    console.log("✅ Domicílios criados:", dwelling1.address, dwelling2.address, dwelling3.address);

    // ============================================================================
    // FAMILIES
    // ============================================================================
    console.log("\n👨‍👩‍👧‍👦 Criando famílias...");
    const [family1] = await db.insert(schema.families).values({
      dwellingId: dwelling1.id,
      unitId: unit1.id,
      familyCode: "FAM-001-2025",
      headOfFamilyId: citizens[0].id,
      monthlyIncome: 2500.00,
      benefitsReceived: "Bolsa Família",
      membersCount: 4,
    }).returning();

    const [family2] = await db.insert(schema.families).values({
      dwellingId: dwelling2.id,
      unitId: unit1.id,
      familyCode: "FAM-002-2025",
      headOfFamilyId: citizens[1].id,
      monthlyIncome: 3200.00,
      membersCount: 3,
    }).returning();

    const [family3] = await db.insert(schema.families).values({
      dwellingId: dwelling3.id,
      unitId: unit1.id,
      familyCode: "FAM-003-2025",
      headOfFamilyId: citizens[2].id,
      monthlyIncome: 1800.00,
      benefitsReceived: "BPC",
      membersCount: 2,
    }).returning();

    console.log("✅ Famílias criadas:", family1.familyCode, family2.familyCode, family3.familyCode);

    // ============================================================================
    // HOME VISITS
    // ============================================================================
    console.log("\n🚶 Criando visitas domiciliares...");
    await db.insert(schema.homeVisits).values([
      {
        dwellingId: dwelling1.id,
        familyId: family1.id,
        professionalId: profAcs.id,
        visitDate: new Date("2025-11-18T10:00:00"),
        visitType: "rotina",
        visitMotive: "gestante",
        findings: "Família acompanhada. Gestante com pré-natal em dia. Ambiente domiciliar limpo e organizado.",
        actions: "Orientações sobre alimentação durante gestação. Reforço da importância do pré-natal.",
        referrals: "Encaminhamento para grupo de gestantes",
      },
      {
        dwellingId: dwelling2.id,
        familyId: family2.id,
        professionalId: profAcs.id,
        visitDate: new Date("2025-11-15T14:30:00"),
        visitType: "acompanhamento",
        visitMotive: "crianca",
        findings: "Criança com calendário vacinal atualizado. Desenvolvimento adequado para idade.",
        actions: "Orientações sobre alimentação complementar. Incentivo ao aleitamento materno.",
      },
      {
        dwellingId: dwelling3.id,
        familyId: family3.id,
        professionalId: profAcs.id,
        visitDate: new Date("2025-11-12T09:00:00"),
        visitType: "busca_ativa",
        visitMotive: "idoso",
        findings: "Idoso com dificuldade de locomoção. Necessita acompanhamento domiciliar.",
        actions: "Verificação de sinais vitais. Orientação sobre medicação.",
        referrals: "Solicitação de atendimento médico domiciliar",
      },
    ]);

    console.log("✅ Visitas domiciliares criadas");

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log("\n" + "=".repeat(70));
    console.log("✅ SEED COMPLETO FINALIZADO COM SUCESSO!");
    console.log("=".repeat(70));
    console.log("\n📊 Resumo dos dados criados:");
    console.log("   • 2 Unidades de Saúde");
    console.log("   • 6 Usuários do sistema");
    console.log("   • 4 Profissionais de saúde");
    console.log("   • 5 Cidadãos/Pacientes");
    console.log("   • 4 Agendamentos");
    console.log("   • 2 Fila de atendimento");
    console.log("   • 2 Consultas médicas");
    console.log("   • 2 Prescrições");
    console.log("   • 6 Medicamentos");
    console.log("   • 6 Lotes de estoque");
    console.log("   • 3 Exames");
    console.log("   • 2 Solicitações de TFD");
    console.log("   • 3 Domicílios");
    console.log("   • 3 Famílias");
    console.log("   • 3 Visitas domiciliares");
    console.log("\n🔐 Credenciais para login:");
    console.log("   Admin: admin@saude.gov.br / Admin@2025");
    console.log("   ACS: acs@saude.gov.br / Acs@2025");
    console.log("   Outros: (email listado) / Senha@2025");
    console.log("\n");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("🎉 Processo de seed concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no seed:", error);
    process.exit(1);
  });
