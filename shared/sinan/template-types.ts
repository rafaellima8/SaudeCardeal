import { z } from "zod";

export const SINAN_FORM_GROUP_IDS = [
  "dados_gerais",
  "notificacao", 
  "residencia",
  "antecedentes",
  "clinicos",
  "laboratoriais",
  "tratamento",
  "conclusao",
  "investigador",
] as const;

export type SinanFormGroupId = typeof SINAN_FORM_GROUP_IDS[number];

export type SinanFieldType = 
  | "text" 
  | "number" 
  | "date" 
  | "select" 
  | "checkbox" 
  | "radio" 
  | "textarea"
  | "cpf"
  | "cns"
  | "cep"
  | "phone"
  | "ibge";

export interface SinanFieldOption {
  value: string;
  label: string;
  codigo?: string;
}

export interface SinanFieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  customValidator?: string;
}

export interface SinanFormGroup {
  id: SinanFormGroupId;
  nome: string;
  ordem: number;
  descricao?: string;
  collapsed?: boolean;
}

export interface SinanField {
  key: string;
  label: string;
  type: SinanFieldType;
  required: boolean;
  group: SinanFormGroupId;
  subgroup?: string;
  options?: SinanFieldOption[];
  validation?: SinanFieldValidation;
  mask?: string;
  helpText?: string;
  dependsOn?: {
    field: string;
    value: string | string[];
    condition?: "equals" | "notEquals" | "in" | "notIn";
  };
  defaultValue?: string | number | boolean;
  order: number;
  sinanCode?: string;
  width?: "full" | "half" | "third" | "quarter";
}

export interface SinanValidationRule {
  id: string;
  type: "required_if" | "date_range" | "age_limit" | "cross_field" | "custom";
  message: string;
  condition: {
    field?: string;
    operator?: "equals" | "notEquals" | "greaterThan" | "lessThan" | "in" | "between";
    value?: any;
    fields?: string[];
    customLogic?: string;
  };
}

export interface SinanFormTemplate {
  id: string;
  nome: string;
  agravoCode: string;
  cid10: string;
  cid10Range?: string;
  categoria: string;
  versaoFicha: string;
  prazoNotificacao: "imediata" | "semanal";
  fichaInvestigacao: boolean;
  groups: SinanFormGroup[];
  fields: SinanField[];
  requiredFields: string[];
  validationRules?: SinanValidationRule[];
}

export const SINAN_FORM_GROUPS: Record<string, SinanFormGroup> = {
  DADOS_GERAIS: { id: "dados_gerais", nome: "Dados Gerais", ordem: 1 },
  NOTIFICACAO_INDIVIDUAL: { id: "notificacao", nome: "Notificação Individual", ordem: 2 },
  DADOS_RESIDENCIA: { id: "residencia", nome: "Dados de Residência", ordem: 3 },
  ANTECEDENTES_EPIDEMIO: { id: "antecedentes", nome: "Antecedentes Epidemiológicos", ordem: 4 },
  DADOS_CLINICOS: { id: "clinicos", nome: "Dados Clínicos", ordem: 5 },
  DADOS_LABORATORIAIS: { id: "laboratoriais", nome: "Dados Laboratoriais", ordem: 6 },
  TRATAMENTO: { id: "tratamento", nome: "Tratamento", ordem: 7 },
  CONCLUSAO: { id: "conclusao", nome: "Conclusão", ordem: 8 },
  INVESTIGADOR: { id: "investigador", nome: "Investigador", ordem: 9 },
};

export const SINAN_COMMON_FIELDS: SinanField[] = [
  {
    key: "tipo_notificacao",
    label: "Tipo de Notificação",
    type: "select",
    required: true,
    group: "dados_gerais",
    options: [
      { value: "1", label: "Individual" },
      { value: "2", label: "Surto" },
      { value: "3", label: "Agregado" },
    ],
    order: 1,
    sinanCode: "TP_NOT",
    width: "half",
  },
  {
    key: "agravo_doenca",
    label: "Agravo/Doença",
    type: "text",
    required: true,
    group: "dados_gerais",
    order: 2,
    sinanCode: "ID_AGRAVO",
    width: "half",
  },
  {
    key: "dt_notificacao",
    label: "Data da Notificação",
    type: "date",
    required: true,
    group: "dados_gerais",
    order: 3,
    sinanCode: "DT_NOTIFIC",
    width: "third",
  },
  {
    key: "uf_notificacao",
    label: "UF",
    type: "select",
    required: true,
    group: "dados_gerais",
    order: 4,
    sinanCode: "SG_UF_NOT",
    width: "quarter",
  },
  {
    key: "municipio_notificacao",
    label: "Município de Notificação",
    type: "text",
    required: true,
    group: "dados_gerais",
    order: 5,
    sinanCode: "ID_MUNICIP",
    width: "half",
  },
  {
    key: "cod_ibge_municipio",
    label: "Código IBGE",
    type: "ibge",
    required: false,
    group: "dados_gerais",
    order: 6,
    sinanCode: "ID_MUNICIP",
    validation: { pattern: "^\\d{7}$" },
    width: "quarter",
  },
  {
    key: "unidade_saude",
    label: "Unidade de Saúde (ou outra fonte notificadora)",
    type: "text",
    required: true,
    group: "dados_gerais",
    order: 7,
    sinanCode: "NM_US",
    width: "half",
  },
  {
    key: "cnes",
    label: "Código CNES",
    type: "text",
    required: false,
    group: "dados_gerais",
    order: 8,
    sinanCode: "CO_UNID_NOT",
    validation: { pattern: "^\\d{7}$" },
    width: "quarter",
  },
  {
    key: "dt_primeiros_sintomas",
    label: "Data dos Primeiros Sintomas",
    type: "date",
    required: false,
    group: "dados_gerais",
    order: 9,
    sinanCode: "DT_SIN_PRI",
    width: "third",
  },
  {
    key: "paciente_nome",
    label: "Nome do Paciente",
    type: "text",
    required: true,
    group: "notificacao",
    order: 10,
    sinanCode: "NM_PACIENT",
    validation: { minLength: 3 },
    width: "full",
  },
  {
    key: "paciente_dt_nascimento",
    label: "Data de Nascimento",
    type: "date",
    required: false,
    group: "notificacao",
    order: 11,
    sinanCode: "DT_NASC",
    width: "third",
  },
  {
    key: "paciente_idade",
    label: "Idade",
    type: "number",
    required: true,
    group: "notificacao",
    order: 12,
    sinanCode: "NU_IDADE_N",
    validation: { min: 0, max: 150 },
    width: "quarter",
  },
  {
    key: "paciente_idade_tipo",
    label: "Tipo de Idade",
    type: "select",
    required: true,
    group: "notificacao",
    options: [
      { value: "1", label: "Hora" },
      { value: "2", label: "Dia" },
      { value: "3", label: "Mês" },
      { value: "4", label: "Ano" },
    ],
    order: 13,
    sinanCode: "TP_IDADE",
    width: "quarter",
  },
  {
    key: "paciente_sexo",
    label: "Sexo",
    type: "select",
    required: true,
    group: "notificacao",
    options: [
      { value: "M", label: "Masculino" },
      { value: "F", label: "Feminino" },
      { value: "I", label: "Ignorado" },
    ],
    order: 14,
    sinanCode: "CS_SEXO",
    width: "quarter",
  },
  {
    key: "paciente_gestante",
    label: "Gestante",
    type: "select",
    required: false,
    group: "notificacao",
    options: [
      { value: "1", label: "1º Trimestre" },
      { value: "2", label: "2º Trimestre" },
      { value: "3", label: "3º Trimestre" },
      { value: "4", label: "Idade gestacional ignorada" },
      { value: "5", label: "Não" },
      { value: "6", label: "Não se aplica" },
      { value: "9", label: "Ignorado" },
    ],
    order: 15,
    sinanCode: "CS_GESTANT",
    dependsOn: { field: "paciente_sexo", value: "F" },
    width: "third",
  },
  {
    key: "paciente_raca_cor",
    label: "Raça/Cor",
    type: "select",
    required: false,
    group: "notificacao",
    options: [
      { value: "1", label: "Branca" },
      { value: "2", label: "Preta" },
      { value: "3", label: "Amarela" },
      { value: "4", label: "Parda" },
      { value: "5", label: "Indígena" },
      { value: "9", label: "Ignorado" },
    ],
    order: 16,
    sinanCode: "CS_RACA",
    width: "quarter",
  },
  {
    key: "paciente_escolaridade",
    label: "Escolaridade",
    type: "select",
    required: false,
    group: "notificacao",
    options: [
      { value: "0", label: "Analfabeto" },
      { value: "1", label: "1ª a 4ª série incompleta do EF" },
      { value: "2", label: "4ª série completa do EF" },
      { value: "3", label: "5ª a 8ª série incompleta do EF" },
      { value: "4", label: "Ensino fundamental completo" },
      { value: "5", label: "Ensino médio incompleto" },
      { value: "6", label: "Ensino médio completo" },
      { value: "7", label: "Educação superior incompleta" },
      { value: "8", label: "Educação superior completa" },
      { value: "9", label: "Ignorado" },
      { value: "10", label: "Não se aplica" },
    ],
    order: 17,
    sinanCode: "CS_ESCOL_N",
    width: "half",
  },
  {
    key: "paciente_cns",
    label: "Número do Cartão SUS (CNS)",
    type: "cns",
    required: false,
    group: "notificacao",
    order: 18,
    sinanCode: "ID_CNS_SUS",
    validation: { pattern: "^\\d{15}$" },
    mask: "999 9999 9999 9999",
    width: "third",
  },
  {
    key: "paciente_nome_mae",
    label: "Nome da Mãe",
    type: "text",
    required: false,
    group: "notificacao",
    order: 19,
    sinanCode: "NM_MAE_PAC",
    width: "full",
  },
  {
    key: "paciente_cpf",
    label: "CPF",
    type: "cpf",
    required: false,
    group: "notificacao",
    order: 20,
    validation: { pattern: "^\\d{11}$" },
    mask: "999.999.999-99",
    width: "third",
  },
  {
    key: "res_uf",
    label: "UF de Residência",
    type: "select",
    required: true,
    group: "residencia",
    order: 21,
    sinanCode: "SG_UF",
    width: "quarter",
  },
  {
    key: "res_municipio",
    label: "Município de Residência",
    type: "text",
    required: true,
    group: "residencia",
    order: 22,
    sinanCode: "ID_MN_RESI",
    width: "half",
  },
  {
    key: "res_cod_ibge",
    label: "Código IBGE",
    type: "ibge",
    required: false,
    group: "residencia",
    order: 23,
    validation: { pattern: "^\\d{7}$" },
    width: "quarter",
  },
  {
    key: "res_distrito",
    label: "Distrito",
    type: "text",
    required: false,
    group: "residencia",
    order: 24,
    sinanCode: "NM_DISTRIT",
    width: "half",
  },
  {
    key: "res_bairro",
    label: "Bairro",
    type: "text",
    required: false,
    group: "residencia",
    order: 25,
    sinanCode: "NM_BAIRRO",
    width: "half",
  },
  {
    key: "res_logradouro",
    label: "Logradouro (rua, avenida, ...)",
    type: "text",
    required: false,
    group: "residencia",
    order: 26,
    sinanCode: "NM_LOGRADO",
    width: "half",
  },
  {
    key: "res_numero",
    label: "Número",
    type: "text",
    required: false,
    group: "residencia",
    order: 27,
    sinanCode: "NU_NUMERO",
    width: "quarter",
  },
  {
    key: "res_complemento",
    label: "Complemento",
    type: "text",
    required: false,
    group: "residencia",
    order: 28,
    sinanCode: "NM_COMPLEM",
    width: "quarter",
  },
  {
    key: "res_ponto_referencia",
    label: "Ponto de Referência",
    type: "text",
    required: false,
    group: "residencia",
    order: 29,
    sinanCode: "NM_REFEREN",
    width: "half",
  },
  {
    key: "res_cep",
    label: "CEP",
    type: "cep",
    required: false,
    group: "residencia",
    order: 30,
    sinanCode: "NU_CEP",
    validation: { pattern: "^\\d{8}$" },
    mask: "99999-999",
    width: "quarter",
  },
  {
    key: "res_telefone",
    label: "Telefone",
    type: "phone",
    required: false,
    group: "residencia",
    order: 31,
    sinanCode: "NU_DDD_TEL",
    mask: "(99) 99999-9999",
    width: "quarter",
  },
  {
    key: "res_zona",
    label: "Zona",
    type: "select",
    required: false,
    group: "residencia",
    options: [
      { value: "1", label: "Urbana" },
      { value: "2", label: "Rural" },
      { value: "3", label: "Periurbana" },
      { value: "9", label: "Ignorado" },
    ],
    order: 32,
    sinanCode: "CS_ZONA",
    width: "quarter",
  },
  {
    key: "res_pais",
    label: "País (se residente fora do Brasil)",
    type: "text",
    required: false,
    group: "residencia",
    order: 33,
    sinanCode: "ID_PAIS",
    width: "half",
  },
  {
    key: "classificacao_final",
    label: "Classificação Final",
    type: "select",
    required: false,
    group: "conclusao",
    options: [
      { value: "1", label: "Confirmado" },
      { value: "2", label: "Descartado" },
      { value: "8", label: "Inconclusivo" },
    ],
    order: 100,
    sinanCode: "CLASSI_FIN",
    width: "half",
  },
  {
    key: "criterio_confirmacao",
    label: "Critério de Confirmação/Descarte",
    type: "select",
    required: false,
    group: "conclusao",
    options: [
      { value: "1", label: "Laboratorial" },
      { value: "2", label: "Clínico-epidemiológico" },
      { value: "3", label: "Em investigação" },
    ],
    order: 101,
    sinanCode: "CRITERIO",
    width: "half",
  },
  {
    key: "evolucao_caso",
    label: "Evolução do Caso",
    type: "select",
    required: false,
    group: "conclusao",
    options: [
      { value: "1", label: "Cura" },
      { value: "2", label: "Óbito pelo agravo notificado" },
      { value: "3", label: "Óbito por outras causas" },
      { value: "9", label: "Ignorado" },
    ],
    order: 102,
    sinanCode: "EVOLUCAO",
    width: "half",
  },
  {
    key: "dt_obito",
    label: "Data do Óbito",
    type: "date",
    required: false,
    group: "conclusao",
    order: 103,
    sinanCode: "DT_OBITO",
    dependsOn: { field: "evolucao_caso", value: ["2", "3"] },
    width: "third",
  },
  {
    key: "dt_encerramento",
    label: "Data de Encerramento",
    type: "date",
    required: false,
    group: "conclusao",
    order: 104,
    sinanCode: "DT_ENCERRA",
    width: "third",
  },
  {
    key: "observacoes",
    label: "Observações",
    type: "textarea",
    required: false,
    group: "conclusao",
    order: 105,
    sinanCode: "OBSERVACAO",
    width: "full",
  },
  {
    key: "nome_investigador",
    label: "Nome do Investigador",
    type: "text",
    required: false,
    group: "investigador",
    order: 200,
    width: "half",
  },
  {
    key: "funcao_investigador",
    label: "Função",
    type: "text",
    required: false,
    group: "investigador",
    order: 201,
    width: "half",
  },
  {
    key: "assinatura_investigador",
    label: "Assinatura",
    type: "text",
    required: false,
    group: "investigador",
    order: 202,
    width: "half",
  },
];

export const SINAN_REQUIRED_CORE_FIELDS = [
  "tipo_notificacao",
  "agravo_doenca",
  "dt_notificacao",
  "uf_notificacao",
  "municipio_notificacao",
  "unidade_saude",
  "paciente_nome",
  "paciente_idade",
  "paciente_idade_tipo",
  "paciente_sexo",
  "res_uf",
  "res_municipio",
];

export function createFormValidationSchema(template: SinanFormTemplate): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  for (const field of template.fields) {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case "number":
        fieldSchema = z.number();
        if (field.validation?.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min);
        }
        if (field.validation?.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max);
        }
        break;
      case "date":
        fieldSchema = z.date();
        break;
      case "checkbox":
        fieldSchema = z.boolean();
        break;
      default:
        fieldSchema = z.string();
        if (field.validation?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(field.validation.minLength);
        }
        if (field.validation?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(field.validation.maxLength);
        }
        if (field.validation?.pattern) {
          fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(field.validation.pattern));
        }
    }
    
    if (!field.required) {
      fieldSchema = fieldSchema.optional().nullable();
    }
    
    shape[field.key] = fieldSchema;
  }
  
  return z.object(shape);
}
