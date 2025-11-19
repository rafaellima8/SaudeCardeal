import { db } from "./db";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

export async function seed() {
  console.log("🌱 Iniciando seed mínimo do banco de dados...");

  try {
    // Create Health Units
    const [unit1] = await db.insert(schema.healthUnits).values({
      name: "UBS Centro",
      cnes: "0000001",
      address: "Rua Principal, 100 - Centro, Cardeal da Silva - BA",
      phone: "(75) 3000-0001",
    }).returning();

    console.log("✅ Unidade de saúde criada");

    // Create Users WITH PASSWORDS
    const adminPassword = "Admin@2025";
    const acsPassword = "Acs@2025";
    
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
      name: "João Silva - ACS",
      passwordHash: await bcrypt.hash(acsPassword, 10),
      role: "acs",
      unitId: unit1.id,
    }).returning();

    console.log("✅ Usuários criados");
    console.log("\n📝 CREDENCIAIS DE ACESSO:");
    console.log("\n🔐 ADMINISTRADOR:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Senha: ${adminPassword}`);
    console.log("\n👤 AGENTE COMUNITÁRIO DE SAÚDE:");
    console.log(`   Email: ${acsUser.email}`);
    console.log(`   Senha: ${acsPassword}`);
    console.log("\n✅ Seed concluído com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
}
