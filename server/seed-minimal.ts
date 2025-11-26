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

    console.log("\n✅ Seed mínimo concluído com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
}
