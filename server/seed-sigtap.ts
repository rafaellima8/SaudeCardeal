import { db } from "./db";
import { sigtapMappings } from "@shared/schema";
import { invalidateSIGTAPCache } from "./integrations/esus/extractor";

/**
 * Seed da tabela sigtap_mappings com códigos SIGTAP oficiais
 * Códigos baseados em SIGTAB 2024 para Atenção Primária à Saúde
 */
export async function seedSIGTAPMappings() {
  console.log("[SEED] Iniciando seed SIGTAP mappings...");
  
  const mappings = [
    // CONSULTAS MÉDICAS
    {
      internalCode: "consulta_medica",
      sigtapCode: "0301010072",
      description: "Consulta médica em atenção básica",
      category: "consultation" as const,
    },
    {
      internalCode: "consulta_medica_demanda_espontanea",
      sigtapCode: "0301010072",
      description: "Consulta médica demanda espontânea",
      category: "consultation" as const,
    },
    {
      internalCode: "consulta_medica_agendada",
      sigtapCode: "0301010072",
      description: "Consulta médica agendada",
      category: "consultation" as const,
    },
    
    // CONSULTAS DE ENFERMAGEM
    {
      internalCode: "consulta_enfermagem",
      sigtapCode: "0301010080",
      description: "Consulta de enfermagem",
      category: "consultation" as const,
    },
    {
      internalCode: "consulta_enfermagem_puericultura",
      sigtapCode: "0301010129",
      description: "Consulta de enfermagem puericultura",
      category: "consultation" as const,
    },
    {
      internalCode: "consulta_enfermagem_pre_natal",
      sigtapCode: "0301010110",
      description: "Consulta de enfermagem pré-natal",
      category: "consultation" as const,
    },
    
    // CONSULTAS ODONTOLÓGICAS
    {
      internalCode: "consulta_odontologica",
      sigtapCode: "0301010064",
      description: "Consulta odontológica",
      category: "consultation" as const,
    },
    {
      internalCode: "consulta_odontologica_primeira",
      sigtapCode: "0301010064",
      description: "Consulta odontológica primeira vez",
      category: "consultation" as const,
    },
    
    // PROCEDIMENTOS BÁSICOS
    {
      internalCode: "afericao_pressao",
      sigtapCode: "0301060096",
      description: "Aferição de pressão arterial",
      category: "procedure" as const,
    },
    {
      internalCode: "afericao_temperatura",
      sigtapCode: "0301070016",
      description: "Aferição de temperatura",
      category: "procedure" as const,
    },
    {
      internalCode: "curativo_simples",
      sigtapCode: "0401010020",
      description: "Curativo grau I",
      category: "procedure" as const,
    },
    {
      internalCode: "curativo_medio",
      sigtapCode: "0401010039",
      description: "Curativo grau II",
      category: "procedure" as const,
    },
    {
      internalCode: "inalacao",
      sigtapCode: "0301070024",
      description: "Inalação",
      category: "procedure" as const,
    },
    
    // VISITAS DOMICILIARES
    {
      internalCode: "visita_domiciliar",
      sigtapCode: "0301010013",
      description: "Visita domiciliar por profissional de nível superior",
      category: "procedure" as const,
    },
    {
      internalCode: "visita_domiciliar_acs",
      sigtapCode: "0301010021",
      description: "Visita domiciliar por ACS",
      category: "procedure" as const,
    },
    
    // EXAMES LABORATORIAIS BÁSICOS
    {
      internalCode: "hemograma_completo",
      sigtapCode: "0202010473",
      description: "Hemograma completo",
      category: "exam" as const,
    },
    {
      internalCode: "glicemia_jejum",
      sigtapCode: "0202010384",
      description: "Glicemia de jejum",
      category: "exam" as const,
    },
    {
      internalCode: "colesterol_total",
      sigtapCode: "0202010317",
      description: "Colesterol total",
      category: "exam" as const,
    },
    {
      internalCode: "triglicerideos",
      sigtapCode: "0202010635",
      description: "Triglicerídeos",
      category: "exam" as const,
    },
    {
      internalCode: "eas",
      sigtapCode: "0202010678",
      description: "Exame de urina (EAS)",
      category: "exam" as const,
    },
    
    // VACINAS
    {
      internalCode: "vacina_bcg",
      sigtapCode: "0304010010",
      description: "Vacina BCG",
      category: "vaccine" as const,
    },
    {
      internalCode: "vacina_influenza",
      sigtapCode: "0304010036",
      description: "Vacina influenza",
      category: "vaccine" as const,
    },
    {
      internalCode: "vacina_covid",
      sigtapCode: "0304010184",
      description: "Vacina COVID-19",
      category: "vaccine" as const,
    },
    
    // PROCEDIMENTOS GENÉRICOS
    {
      internalCode: "procedimento",
      sigtapCode: "0301010072",
      description: "Procedimento genérico (consulta médica)",
      category: "procedure" as const,
    },
    {
      internalCode: "outros",
      sigtapCode: "0301010072",
      description: "Outros procedimentos não especificados",
      category: "other" as const,
    },
  ];
  
  try {
    // Inserir todos os mapeamentos
    for (const mapping of mappings) {
      await db.insert(sigtapMappings)
        .values({
          ...mapping,
          active: true,
        })
        .onConflictDoUpdate({
          target: sigtapMappings.internalCode,
          set: {
            sigtapCode: mapping.sigtapCode,
            description: mapping.description,
            category: mapping.category,
            active: true,
          },
        });
    }
    
    // Invalidar cache após seed para forçar reload
    invalidateSIGTAPCache();
    
    console.log(`[SEED] ✅ ${mappings.length} códigos SIGTAP inseridos/atualizados com sucesso`);
    return { success: true, count: mappings.length };
  } catch (error) {
    console.error("[SEED] ❌ Erro ao inserir códigos SIGTAP:", error);
    throw error;
  }
}

// Exportar função para uso em endpoints administrativos
export default seedSIGTAPMappings;
