#!/usr/bin/env tsx

/**
 * e-SUS APS Export Scheduler
 * 
 * Job executável para gerar exportações e-SUS automaticamente.
 * Por padrão, executa em modo dry-run (apenas mostra o que seria feito).
 * 
 * Uso:
 *   tsx server/jobs/esus-scheduler.ts [--execute] [--days=30] [--cnes=XXXXXXX]
 * 
 * Opções:
 *   --execute: Executa a exportação (sem esta flag, apenas simula)
 *   --days=N: Exportar últimos N dias (padrão: 30)
 *   --cnes=XXXXXXX: CNES da unidade de saúde (padrão: obtém da primeira unidade)
 */

import { generateExport } from "../integrations/esus/exporter";

interface SchedulerOptions {
  execute: boolean;
  days: number;
  cnes?: string;
}

function parseArgs(): SchedulerOptions {
  const args = process.argv.slice(2);
  
  const options: SchedulerOptions = {
    execute: false,
    days: 30,
  };
  
  for (const arg of args) {
    if (arg === "--execute") {
      options.execute = true;
    } else if (arg.startsWith("--days=")) {
      options.days = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--cnes=")) {
      options.cnes = arg.split("=")[1];
    }
  }
  
  return options;
}

function calculateDateRange(days: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    from: startDate.toISOString().split("T")[0], // YYYY-MM-DD
    to: endDate.toISOString().split("T")[0],
  };
}

async function run() {
  console.log("=".repeat(60));
  console.log("e-SUS APS Export Scheduler");
  console.log("=".repeat(60));
  console.log();
  
  const options = parseArgs();
  const dateRange = calculateDateRange(options.days);
  const defaultCNES = options.cnes || "1234567"; // TODO: Buscar do banco
  
  console.log("Configuração:");
  console.log(`  Modo: ${options.execute ? "EXECUÇÃO" : "DRY-RUN (simulação)"}`);
  console.log(`  Período: últimos ${options.days} dias`);
  console.log(`  Data inicial: ${dateRange.from}`);
  console.log(`  Data final: ${dateRange.to}`);
  console.log(`  CNES: ${defaultCNES}`);
  console.log();
  
  if (!options.execute) {
    console.log("⚠️  Modo DRY-RUN ativo!");
    console.log("   Nenhuma exportação será gerada.");
    console.log("   Use --execute para executar a exportação real.");
    console.log();
    console.log("Exemplo:");
    console.log("  tsx server/jobs/esus-scheduler.ts --execute --days=30");
    console.log();
    process.exit(0);
  }
  
  console.log("🚀 Iniciando exportação...");
  console.log();
  
  try {
    const result = await generateExport({
      from: dateRange.from,
      to: dateRange.to,
      healthUnitCNES: defaultCNES,
    });
    
    console.log("✅ Exportação concluída com sucesso!");
    console.log();
    console.log("Resultados:");
    console.log(`  Batch ID: ${result.batchId}`);
    console.log(`  JSON: ${result.jsonPath}`);
    console.log(`  XML: ${result.xmlPath}`);
    console.log();
    console.log("Registros exportados:");
    console.log(`  Cidadãos: ${result.totalRegistros.cidadaos}`);
    console.log(`  Atendimentos: ${result.totalRegistros.atendimentos}`);
    console.log(`  Procedimentos: ${result.totalRegistros.procedimentos}`);
    console.log(`  Exames: ${result.totalRegistros.exames}`);
    console.log(`  TFD: ${result.totalRegistros.solicitacoesTFD}`);
    console.log();
    
    const total = Object.values(result.totalRegistros).reduce((a, b) => a + b, 0);
    console.log(`  TOTAL: ${total} registros`);
    console.log();
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Erro ao gerar exportação:");
    console.error(error instanceof Error ? error.message : String(error));
    console.log();
    process.exit(1);
  }
}

run();
