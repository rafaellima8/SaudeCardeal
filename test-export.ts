import { db } from './server/db';
import { professionals, citizens, consultations } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🔍 Verificando dados do sistema...\n');
  
  // Verificar usuários admin
  const admins = await db
    .select()
    .from(professionals)
    .where(eq(professionals.role, 'admin'))
    .limit(1);
  
  if (admins.length === 0) {
    console.log('⚙️  Criando usuário admin de teste...');
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
    
    console.log('✅ Admin criado: username=admin, password=admin123\n');
  } else {
    console.log(`✅ Admin encontrado: ${admins[0].name} (@${admins[0].username})\n`);
  }
  
  // Verificar dados
  const citizenCount = (await db.select().from(citizens)).length;
  const consultationCount = (await db.select().from(consultations)).length;
  
  console.log('📊 Dados disponíveis:');
  console.log(`   - Cidadãos: ${citizenCount}`);
  console.log(`   - Consultas: ${consultationCount}`);
  console.log('');
  
  console.log('✅ Sistema pronto para exportação!\n');
  console.log('📝 Credenciais para teste:');
  console.log('   Username: admin');
  console.log('   Password: admin123\n');
}

main().catch(console.error);
