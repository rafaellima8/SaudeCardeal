import { z } from "zod";

/**
 * Schemas de Exportação e-SUS APS
 * 
 * Estes schemas validam os DTOs de exportação para o formato e-SUS,
 * conforme especificações do DATASUS/Ministério da Saúde.
 * 
 * Não confundir com os schemas de banco (shared/schema.ts).
 * Estes são específicos para o formato de exportação.
 */

// ============================================================================
// CIDADÃO (Citizen) - Ficha de Cadastro Individual
// ============================================================================

export const ESUSAddressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  cityCode: z.string().length(7).optional(), // Código IBGE (7 dígitos)
  state: z.string().length(2).optional(), // UF
  zipCode: z.string().regex(/^\d{8}$/).optional(), // CEP sem hífen
});

export const ESUSCitizenSchema = z.object({
  // Identificação obrigatória
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"), // Sem pontuação
  cns: z.string().regex(/^\d{15}$/, "CNS deve ter 15 dígitos").optional(), // Cartão Nacional de Saúde
  
  // Dados pessoais
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato YYYY-MM-DD"),
  sex: z.enum(["M", "F", "O"], { errorMap: () => ({ message: "Sexo deve ser M, F ou O" }) }),
  
  // Contato
  phone: z.string().optional(),
  email: z.string().email().optional(),
  
  // Endereço
  address: ESUSAddressSchema.optional(),
  
  // Dados clínicos opcionais
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  
  // Vínculo territorial
  familyGroup: z.string().optional(),
  healthUnitCNES: z.string().length(7, "CNES deve ter 7 dígitos").optional(),
});

export type ESUSCitizenDTO = z.infer<typeof ESUSCitizenSchema>;

// ============================================================================
// CONSULTA (Consultation) - Ficha de Atendimento Individual
// ============================================================================

export const ESUSConsultationSchema = z.object({
  // Identificadores
  id: z.string().uuid().optional(),
  citizenCPF: z.string().regex(/^\d{11}$/),
  citizenCNS: z.string().regex(/^\d{15}$/).optional(),
  professionalCNS: z.string().regex(/^\d{15}$/),
  
  // Data e horário
  consultationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  consultationTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), // HH:MM ou HH:MM:SS
  shift: z.enum(["morning", "afternoon", "night"]).optional(), // Turno
  
  // Local de atendimento
  unitCNES: z.string().length(7),
  unitINE: z.string().optional(), // Código INE da equipe
  
  // Tipo de atendimento
  type: z.string(), // consulta_medica, consulta_enfermagem, procedimento, etc
  appointmentType: z.enum(["scheduled", "spontaneous", "home_visit"]).optional(),
  
  // Dados clínicos
  chiefComplaint: z.string().optional(),
  cid10: z.array(z.string().regex(/^[A-Z]\d{2}(\.\d{1,2})?$/)).optional(), // CID-10: A00, A00.1, A00.12
  ciap2: z.array(z.string()).optional(), // CIAP-2 (Classificação Internacional de Atenção Primária)
  diagnosis: z.string().optional(),
  
  // Procedimentos realizados (códigos SIGTAP)
  procedures: z.array(z.object({
    code: z.string(), // Código do procedimento SIGTAP
    quantity: z.number().int().positive().default(1),
  })).optional(),
  
  // Conduta
  conduct: z.enum([
    "return_scheduled",
    "referral",
    "discharge",
    "home_monitoring",
  ]).optional(),
  
  // Encaminhamento
  referral: z.object({
    specialty: z.string(),
    urgency: z.enum(["routine", "priority", "urgent"]),
  }).optional(),
});

export type ESUSConsultationDTO = z.infer<typeof ESUSConsultationSchema>;

// ============================================================================
// PROCEDIMENTO (Procedure) - Produção e Marcadores
// ============================================================================

export const ESUSProcedureSchema = z.object({
  // Identificação
  citizenCPF: z.string().regex(/^\d{11}$/).optional(),
  citizenCNS: z.string().regex(/^\d{15}$/).optional(),
  professionalCNS: z.string().regex(/^\d{15}$/),
  
  // Procedimento
  procedureCode: z.string(), // Código SIGTAP
  procedureName: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  
  // Local e data
  unitCNES: z.string().length(7),
  executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum(["morning", "afternoon", "night"]).optional(),
  
  // Equipe
  teamINE: z.string().optional(), // Código INE da equipe
  teamType: z.enum([
    "eSF", // Equipe Saúde da Família
    "eAP", // Equipe Atenção Primária
    "NASF", // Núcleo Ampliado Saúde da Família
    "eCR", // Equipe Consultório na Rua
  ]).optional(),
  
  // Observações
  notes: z.string().optional(),
});

export type ESUSProcedureDTO = z.infer<typeof ESUSProcedureSchema>;

// ============================================================================
// EXAME (Exam) - Solicitação e Resultado
// ============================================================================

export const ESUSExamSchema = z.object({
  // Identificação
  citizenCPF: z.string().regex(/^\d{11}$/),
  citizenCNS: z.string().regex(/^\d{15}$/).optional(),
  professionalCNS: z.string().regex(/^\d{15}$/),
  
  // Tipo de exame
  examCode: z.string(), // Código SIGTAP do exame
  examType: z.string(),
  
  // Datas
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Status
  status: z.enum(["requested", "collected", "completed", "cancelled"]),
  
  // Resultado
  result: z.string().optional(),
  
  // Local
  unitCNES: z.string().length(7),
});

export type ESUSExamDTO = z.infer<typeof ESUSExamSchema>;

// ============================================================================
// TFD (Tratamento Fora do Domicílio)
// ============================================================================

export const ESUSTFDSchema = z.object({
  // Identificação
  citizenCPF: z.string().regex(/^\d{11}$/),
  citizenCNS: z.string().regex(/^\d{15}$/).optional(),
  professionalCNS: z.string().regex(/^\d{15}$/),
  
  // Destino
  destination: z.string(),
  destinationCity: z.string().optional(),
  destinationCityCode: z.string().length(7).optional(), // IBGE
  
  // Procedimento
  procedure: z.string(),
  procedureCode: z.string().optional(), // Código SIGTAP
  justification: z.string(),
  
  // Datas
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Status
  status: z.enum(["pending", "approved", "scheduled", "completed", "cancelled"]),
  
  // Transporte
  transportType: z.enum(["ambulance", "vehicle", "air"]).optional(),
  hasCompanion: z.boolean().default(false),
  
  // Local de origem
  originUnitCNES: z.string().length(7),
});

export type ESUSTFDDTO = z.infer<typeof ESUSTFDSchema>;

// ============================================================================
// LOTE DE EXPORTAÇÃO (Batch)
// ============================================================================

export const ESUSExportBatchSchema = z.object({
  // Metadados do lote
  batchId: z.string().uuid(),
  exportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/), // ISO 8601 completo
  
  // Período dos dados
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  
  // Origem
  municipalityCode: z.string().length(7), // Código IBGE do município
  healthUnitCNES: z.string().length(7),
  
  // Sistema
  systemName: z.string().default("PEC Integrado Municipal"),
  systemVersion: z.string().optional(),
  
  // Dados (nomes em português conforme DATASUS)
  cidadaos: z.array(ESUSCitizenSchema).optional(),
  atendimentos: z.array(ESUSConsultationSchema).optional(),
  procedimentos: z.array(ESUSProcedureSchema).optional(),
  exames: z.array(ESUSExamSchema).optional(),
  solicitacoesTFD: z.array(ESUSTFDSchema).optional(),
  
  // Estatísticas (nomes em português conforme DATASUS)
  totalRegistros: z.object({
    cidadaos: z.number().int().nonnegative(),
    atendimentos: z.number().int().nonnegative(),
    procedimentos: z.number().int().nonnegative(),
    exames: z.number().int().nonnegative(),
    solicitacoesTFD: z.number().int().nonnegative(),
  }),
});

export type ESUSExportBatchDTO = z.infer<typeof ESUSExportBatchSchema>;
