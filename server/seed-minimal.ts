import { db } from "./db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seed() {
  console.log("🌱 Iniciando seed mínimo do banco de dados...");

  try {
    const unitCnes = "0000001";
    const adminEmail = "admin@saude.gov.br";
    const acsEmail = "acs@saude.gov.br";

    let unit = await db.select().from(schema.healthUnits).where(eq(schema.healthUnits.cnes, unitCnes)).get();

    if (!unit) {
      [unit] = await db.insert(schema.healthUnits).values({
        name: "UBS Centro",
        cnes: unitCnes,
        address: "Rua Principal, 100 - Centro, Cardeal da Silva - BA",
        phone: "(75) 3000-0001",
      }).returning();
      console.log("✅ Unidade de saúde criada");
    } else {
      console.log("✓ Unidade de saúde já existe");
    }

    const adminPassword = "Admin@2025";
    const acsPassword = "Acs@2025";

    let adminUser = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)).get();
    if (!adminUser) {
      [adminUser] = await db.insert(schema.users).values({
        email: adminEmail,
        name: "Administrador do Sistema",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        unitId: unit.id,
      }).returning();
      console.log("✅ Usuário administrador criado");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Senha: ${adminPassword}`);
    } else {
      console.log("✓ Usuário administrador já existe");
    }

    let acsUser = await db.select().from(schema.users).where(eq(schema.users.email, acsEmail)).get();
    if (!acsUser) {
      [acsUser] = await db.insert(schema.users).values({
        email: acsEmail,
        name: "João Silva - ACS",
        passwordHash: await bcrypt.hash(acsPassword, 10),
        role: "acs",
        unitId: unit.id,
      }).returning();
      console.log("✅ Usuário ACS criado");
      console.log(`   Email: ${acsEmail}`);
      console.log(`   Senha: ${acsPassword}`);
    } else {
      console.log("✓ Usuário ACS já existe");
    }

    // Create Social Assistance user
    const saEmail = "assistente@saude.gov.br";
    const saPassword = "Assistente@2025";
    
    let saUser = await db.select().from(schema.users).where(eq(schema.users.email, saEmail)).get();
    if (!saUser) {
      [saUser] = await db.insert(schema.users).values({
        email: saEmail,
        name: "Maria Oliveira - Assistência Social",
        passwordHash: await bcrypt.hash(saPassword, 10),
        role: "assistencia_social",
        unitId: unit.id,
      }).returning();
      console.log("✅ Usuário Assistência Social criado");
      console.log(`   Email: ${saEmail}`);
      console.log(`   Senha: ${saPassword}`);
    } else {
      console.log("✓ Usuário Assistência Social já existe");
    }

    // Create Pharmacist user
    const pharmEmail = "farmaceutico@saude.gov.br";
    const pharmPassword = "Farmaceutico@2025";
    
    let pharmUser = await db.select().from(schema.users).where(eq(schema.users.email, pharmEmail)).get();
    if (!pharmUser) {
      [pharmUser] = await db.insert(schema.users).values({
        email: pharmEmail,
        name: "Carlos Santos - Farmacêutico",
        passwordHash: await bcrypt.hash(pharmPassword, 10),
        role: "farmaceutico",
        unitId: unit.id,
      }).returning();
      console.log("✅ Usuário Farmacêutico criado");
      console.log(`   Email: ${pharmEmail}`);
      console.log(`   Senha: ${pharmPassword}`);
    } else {
      console.log("✓ Usuário Farmacêutico já existe");
    }

    // Seed Diaper Stock
    const existingStock = await db.select().from(schema.diaperStock).limit(1).get();
    if (!existingStock) {
      const sizeLabels: Record<string, string> = {
        'RN': 'Fralda Recém-Nascido',
        'P': 'Fralda Pequena',
        'M': 'Fralda Média',
        'G': 'Fralda Grande',
        'XG': 'Fralda Extra Grande',
        'XXG': 'Fralda XXG',
        'geriatrica_P': 'Fralda Geriátrica P',
        'geriatrica_M': 'Fralda Geriátrica M',
        'geriatrica_G': 'Fralda Geriátrica G',
        'geriatrica_XG': 'Fralda Geriátrica XG',
      };

      const sizes = [
        { size: 'RN', qty: 200, min: 50 },
        { size: 'P', qty: 500, min: 100 },
        { size: 'M', qty: 800, min: 150 },
        { size: 'G', qty: 600, min: 120 },
        { size: 'XG', qty: 400, min: 80 },
        { size: 'XXG', qty: 200, min: 40 },
        { size: 'geriatrica_P', qty: 150, min: 30 },
        { size: 'geriatrica_M', qty: 300, min: 60 },
        { size: 'geriatrica_G', qty: 250, min: 50 },
        { size: 'geriatrica_XG', qty: 100, min: 20 },
      ];

      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 12);

      for (const s of sizes) {
        await db.insert(schema.diaperStock).values({
          unitId: unit.id,
          name: sizeLabels[s.size],
          size: s.size as any,
          batch: `LOTE-2024-${s.size}`,
          expirationDate,
          unitsPerPackage: 1,
          currentQuantity: s.qty,
          reservedQuantity: 0,
          availableQuantity: s.qty,
          minStock: s.min,
          supplier: 'Distribuidora Saúde Ltda',
          storageLocation: 'Depósito Central',
          active: true,
        });
      }
      console.log("✅ Estoque de fraldas criado (10 tamanhos)");
    } else {
      console.log("✓ Estoque de fraldas já existe");
    }

    // Seed Sample Beneficiaries
    const existingBeneficiary = await db.select().from(schema.saBeneficiaries).limit(1).get();
    if (!existingBeneficiary) {
      const beneficiaries = [
        { name: 'José da Silva', cpf: '12345678901', nis: '12345678901', type: 'idoso', size: 'geriatrica_M' },
        { name: 'Maria Santos', cpf: '23456789012', nis: '23456789012', type: 'acamado', size: 'geriatrica_G' },
        { name: 'Ana Oliveira', cpf: '34567890123', nis: '34567890123', type: 'pessoa_com_deficiencia', size: 'M' },
        { name: 'Pedro Costa', cpf: '45678901234', nis: '45678901234', type: 'idoso', size: 'geriatrica_XG' },
        { name: 'Bebê Lucas', cpf: '56789012345', nis: '56789012345', type: 'crianca', size: 'P' },
      ];

      for (const b of beneficiaries) {
        await db.insert(schema.saBeneficiaries).values({
          unitId: unit.id,
          name: b.name,
          cpf: b.cpf,
          nis: b.nis,
          beneficiaryType: b.type as any,
          recommendedSize: b.size as any,
          address: 'Rua das Flores, Centro',
          city: 'Cardeal da Silva',
          state: 'BA',
          status: 'ativo',
          registeredById: saUser?.id || adminUser.id,
        });
      }
      console.log("✅ Beneficiários de exemplo criados (5 cadastros)");
    } else {
      console.log("✓ Beneficiários já existem");
    }

    console.log("\n✅ Seed mínimo concluído com sucesso!");
    console.log("\n📋 Credenciais de acesso:");
    console.log("   Administrador: admin@saude.gov.br / Admin@2025");
    console.log("   ACS: acs@saude.gov.br / Acs@2025");
    console.log("   Assistência Social: assistente@saude.gov.br / Assistente@2025");
    console.log("   Farmacêutico: farmaceutico@saude.gov.br / Farmaceutico@2025");
    
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
}
