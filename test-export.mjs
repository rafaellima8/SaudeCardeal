#!/usr/bin/env node

// Script para testar exportação e-SUS completa
import { db } from './server/db.js';
import { professionals } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testExport() {
  try {
    console.log('🔍 Verificando usuários admin/gestor...\n');
    
    const admins = await db
      .select({
        id: professionals.id,
        username: professionals.username,
        name: professionals.name,
        role: professionals.role,
      })
      .from(professionals)
      .where(eq(professionals.role, 'admin'))
      .limit(5);
    
    if (admins.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado no banco');
      console.log('\n💡 Criando usuário admin de teste...\n');
      
      // Importar bcrypt
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.insert(professionals).values({
        username: 'admin',
        password: hashedPassword,
        name: 'Administrador Teste',
        cpf: '00000000001',
        role: 'admin',
        cns: '',
        specialization: 'Administração',
      });
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
    } else {
      console.log('✅ Usuários admin encontrados:');
      admins.forEach(admin => {
        console.log(`   - ${admin.name} (@${admin.username}) [${admin.role}]`);
      });
      console.log('');
    }
    
    // Verificar dados disponíveis
    console.log('📊 Verificando dados disponíveis para exportação...\n');
    
    const { citizens } = await import('./shared/schema.js');
    const { consultations } = await import('./shared/schema.js');
    
    const citizenCount = (await db.select({ count: citizens.id }).from(citizens)).length;
    const consultationCount = (await db.select({ count: consultations.id }).from(consultations)).length;
    
    console.log(`   Cidadãos: ${citizenCount}`);
    console.log(`   Consultas: ${consultationCount}`);
    console.log('');
    
    if (citizenCount === 0 && consultationCount === 0) {
      console.log('⚠️  Nenhum dado encontrado - exportação estará vazia');
      console.log('💡 Use a interface web para cadastrar cidadãos e consultas\n');
    }
    
    console.log('✅ Sistema pronto para testar exportação!');
    console.log('\n📝 Use o seguinte comando curl para testar:\n');
    console.log('curl -X POST http://localhost:5000/api/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"username":"admin","password":"admin123"}\' \\');
    console.log('  -c /tmp/cookies.txt\n');
    console.log('curl -X POST http://localhost:5000/api/esus/export \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -b /tmp/cookies.txt \\');
    console.log('  -d \'{"startDate":"2024-01-01","endDate":"2025-12-31","format":"xml","includeTypes":["citizens","consultations","procedures","exams","tfd"]}\'\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testExport();
