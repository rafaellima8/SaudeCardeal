# Arquitetura de Linhas de Cuidado e Formulários Dinâmicos

## Visão Geral

Sistema modular para suportar **formulários dinâmicos por especialidade**, **linhas de cuidado**, **protocolos automáticos** e **indicadores clínicos**, sem travar funcionalidades no código.

---

## FASE 1: Infraestrutura Base (Fundação)

### 1.1. Schema - Tabelas Principais

```typescript
// ============================================================================
// SPECIALTY & CARE LINES MANAGEMENT
// ============================================================================

// Especialidades médicas
export const specialties = sqliteTable("specialties", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull().unique(), // "Endocrinologia", "Pediatria", etc
  code: text("code").notNull().unique(), // "ENDO", "PEDI", etc
  description: text("description"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Linhas de cuidado (transversais a especialidades)
export const careLines = sqliteTable("care_lines", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "Diabetes", "Pré-natal", "Hipertensão", "Saúde do Idoso"
  code: text("code").notNull().unique(), // "DIABETES", "PRENATAL", etc
  description: text("description"),
  specialtyId: text("specialty_id").references(() => specialties.id), // Opcional: pode ser transversal
  riskStratification: integer("risk_stratification", { mode: "boolean" }).default(false), // Tem estratificação de risco?
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Fila de especialidade/linha de cuidado (substitui campo "type" genérico)
export const specialtyQueue = sqliteTable("specialty_queue", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  specialtyId: text("specialty_id").references(() => specialties.id),
  careLineId: text("care_line_id").references(() => careLines.id),
  referralId: text("referral_id").references(() => medicalReferrals.id), // Vínculo com encaminhamento
  priority: text("priority", { enum: ["routine", "preferential", "urgent", "emergency"] }).notNull().default("routine"),
  riskLevel: text("risk_level", { enum: ["baixo", "medio", "alto"] }), // Risco clínico
  referralReason: text("referral_reason"), // Motivo do encaminhamento
  status: text("status", { enum: ["waiting", "in_progress", "completed", "cancelled"] }).notNull().default("waiting"),
  arrivedAt: integer("arrived_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  scheduledDate: integer("scheduled_date", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  professionalId: text("professional_id").references(() => professionals.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Modelos de formulário (template de consulta por especialidade/linha de cuidado)
export const consultationTemplates = sqliteTable("consultation_templates", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "Consulta Pré-natal", "Puericultura", "Pé Diabético"
  specialtyId: text("specialty_id").references(() => specialties.id),
  careLineId: text("care_line_id").references(() => careLines.id),
  description: text("description"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Campos dinâmicos do formulário
export const templateFields = sqliteTable("template_fields", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  templateId: text("template_id").notNull().references(() => consultationTemplates.id),
  fieldName: text("field_name").notNull(), // "peso", "altura", "ig_semanas", "pressao_arterial"
  fieldLabel: text("field_label").notNull(), // "Peso (kg)", "Idade Gestacional (semanas)"
  fieldType: text("field_type", { 
    enum: ["text", "number", "date", "select", "checkbox", "textarea", "range"] 
  }).notNull(),
  fieldOptions: text("field_options", { mode: "json" }).$type<string[]>(), // Para select/checkbox
  required: integer("required", { mode: "boolean" }).default(false).notNull(),
  order: integer("order").notNull(), // Ordem de exibição
  validationRules: text("validation_rules", { mode: "json" }).$type<{
    min?: number;
    max?: number;
    pattern?: string;
    customMessage?: string;
  }>(),
  helperText: text("helper_text"), // Texto de ajuda
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Dados do formulário preenchido (valores dos campos dinâmicos)
export const consultationFieldData = sqliteTable("consultation_field_data", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  consultationId: text("consultation_id").notNull().references(() => consultations.id),
  fieldId: text("field_id").notNull().references(() => templateFields.id),
  fieldValue: text("field_value"), // Armazena qualquer tipo como string/JSON
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Protocolos clínicos (regras de alerta automático)
export const clinicalProtocols = sqliteTable("clinical_protocols", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  name: text("name").notNull(), // "Pré-natal de risco", "HbA1c descompensada"
  careLineId: text("care_line_id").references(() => careLines.id),
  specialtyId: text("specialty_id").references(() => specialties.id),
  triggerCondition: text("trigger_condition", { mode: "json" }).$type<{
    field: string; // Nome do campo a monitorar
    operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains";
    value: any;
  }[]>(), // Ex: [{ field: "hba1c", operator: "gt", value: 9 }]
  alertMessage: text("alert_message").notNull(), // "HbA1c > 9% - Considerar ajuste terapêutico"
  alertLevel: text("alert_level", { enum: ["info", "warning", "critical"] }).notNull().default("info"),
  action: text("action", { mode: "json" }).$type<{
    type: "notify" | "auto_referral" | "schedule_followup";
    target?: string;
    days?: number;
  }>(), // Ação automática ao disparar alerta
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Plano terapêutico compartilhado
export const therapeuticPlans = sqliteTable("therapeutic_plans", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  citizenId: text("citizen_id").notNull().references(() => citizens.id),
  careLineId: text("care_line_id").references(() => careLines.id),
  title: text("title").notNull(), // "Plano de cuidado - Diabetes tipo 2"
  objective: text("objective"), // Objetivo terapêutico
  status: text("status", { enum: ["active", "completed", "suspended"] }).notNull().default("active"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  createdBy: text("created_by").notNull().references(() => professionals.id),
  unitId: text("unit_id").notNull().references(() => healthUnits.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// Itens do plano terapêutico (tarefas/responsáveis)
export const therapeuticPlanItems = sqliteTable("therapeutic_plan_items", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  planId: text("plan_id").notNull().references(() => therapeuticPlans.id),
  description: text("description").notNull(), // "Acompanhamento nutricional mensal"
  responsibleProfessionalId: text("responsible_professional_id").references(() => professionals.id),
  responsibleSpecialty: text("responsible_specialty"), // "Nutricionista", "Psicólogo"
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).notNull().default("pending"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  completedDate: integer("completed_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});
```

---

## 1.2. Integração com Sistema Atual

### Modificações Necessárias:

1. **Tabela `consultations` - Adicionar campos:**
```typescript
// Em consultations
careLineId: text("care_line_id").references(() => careLines.id),
templateId: text("template_id").references(() => consultationTemplates.id),
riskLevel: text("risk_level", { enum: ["baixo", "medio", "alto"] }),
```

2. **Tabela `medicalReferrals` - Adicionar campos:**
```typescript
// Em medicalReferrals (já existe specialty, adicionar)
careLineId: text("care_line_id").references(() => careLines.id),
requiredExams: text("required_exams", { mode: "json" }).$type<string[]>(), // Exames obrigatórios
warningSignsChecked: integer("warning_signs_checked", { mode: "boolean" }).default(false),
```

3. **Tabela `professionals` - Adicionar campo:**
```typescript
// Em professionals
specialties: text("specialties", { mode: "json" }).$type<string[]>(), // Múltiplas especialidades
```

---

## FASE 2: Implementação Frontend

### 2.1. Componente Dinâmico de Formulário

```typescript
// client/src/components/DynamicConsultationForm.tsx
interface DynamicConsultationFormProps {
  templateId: string;
  consultationId?: string; // Para edição
  onSubmit: (data: Record<string, any>) => void;
}

// Carrega template e renderiza campos dinamicamente
// Usa react-hook-form + zod para validação
```

### 2.2. Painel de Fila por Especialidade

```typescript
// client/src/pages/specialty-queue.tsx
// Filtros: especialidade, linha de cuidado, prioridade, risco
// Tabela com: paciente, linha de cuidado, prioridade, risco, tempo de espera
```

### 2.3. Sistema de Alertas Clínicos

```typescript
// client/src/components/ClinicalAlerts.tsx
// Exibe alertas baseados em protocolos
// Ex: "HbA1c > 9% há 6 meses", "Gestante sem VDRL no 1º trimestre"
```

---

## FASE 3: Backend - Lógica de Negócio

### 3.1. Motor de Protocolos

```typescript
// server/services/protocol-engine.ts
export async function evaluateProtocols(
  consultationId: string, 
  fieldData: Record<string, any>
): Promise<Alert[]> {
  // Busca protocolos ativos da especialidade/linha de cuidado
  // Avalia condições (field, operator, value)
  // Retorna alertas disparados
}
```

### 3.2. Cálculo de Indicadores

```typescript
// server/services/indicators.ts
export async function calculateCareLineIndicators(
  careLineId: string, 
  unitId: string, 
  period: { start: Date; end: Date }
): Promise<Indicator[]> {
  // Ex: % diabéticos com HbA1c < 7%
  // Ex: % gestantes com pré-natal completo
}
```

### 3.3. Encaminhamento Inteligente

```typescript
// server/services/referral-suggestions.ts
export function suggestSpecialty(
  symptoms: string[], 
  diagnoses: string[]
): { specialty: string; confidence: number; requiredExams: string[] }[] {
  // Regras baseadas em sintomas/diagnósticos
  // Ex: "hipotireoidismo" → Endocrinologia + TSH obrigatório
}
```

---

## Exemplos de Uso

### Exemplo 1: Pré-natal

**Template:**
- Campos: IG (semanas), DPP, altura uterina, BCF, PA, peso

**Protocolo:**
- Se IG > 12 semanas E sem VDRL → Alerta "VDRL pendente"
- Se PA > 140/90 → Alerta "Suspeita pré-eclâmpsia - encaminhar alto risco"

**Indicador:**
- % gestantes com 6+ consultas
- % gestantes com exames 1º trimestre completos

### Exemplo 2: Diabetes

**Template:**
- Campos: HbA1c, glicemia jejum, peso, IMC, inspeção pé

**Protocolo:**
- Se HbA1c > 9% → Alerta "Descompensado - revisar tratamento"
- Se última HbA1c > 6 meses → Alerta "HbA1c vencida"

**Indicador:**
- % diabéticos controlados (HbA1c < 7%)
- % diabéticos com avaliação pé diabético nos últimos 12 meses

### Exemplo 3: Pediatria (Puericultura)

**Template:**
- Campos: peso, altura, perímetro cefálico, desenvolvimento

**Protocolo:**
- Se peso < percentil 3 → Alerta "Baixo peso - considerar NASF"
- Se vacinas atrasadas → Alerta "Atualizar cartão vacinal"

**Indicador:**
- % crianças < 2 anos com peso adequado
- % crianças com cartão vacinal em dia

---

## Próximos Passos

### Prioridades de Implementação:

1. ✅ **Criar schema das tabelas** (specialties, careLines, templates, fields)
2. ✅ **Seed inicial**: Especialidades e linhas de cuidado básicas
3. ✅ **API CRUD**: Gerenciar templates e campos
4. ⏳ **Frontend**: Componente de formulário dinâmico
5. ⏳ **Motor de protocolos**: Backend de avaliação
6. ⏳ **Indicadores**: Cálculo e visualização

### Templates Prioritários (seed inicial):

- Pré-natal (alto impacto)
- Puericultura (obrigatório APS)
- Hipertensão/Diabetes (alta prevalência)
- Pé Diabético (checklist estruturado)

---

## Vantagens da Arquitetura

✅ **Modular**: Adicionar especialidade = configurar template (sem código)  
✅ **Escalável**: Formulários ilimitados sem alterar frontend  
✅ **Inteligente**: Protocolos automáticos orientam condutas  
✅ **Auditável**: Registra dados estruturados para indicadores  
✅ **Flexível**: Adapta-se a protocolos municipais/estaduais  

---

## Compatibilidade e-SUS

Todos os dados de templates dinâmicos podem ser mapeados para FAI:
- Campos de sinais vitais → `sinaisVitais`
- Campos antropométricos → `antropometria`
- Campos de avaliação → `problemasCondicoes`
- Linhas de cuidado → `atendimento.linhasDeCuidado` (futuro e-SUS v6)

---

## Notas Técnicas

- **Performance**: Templates carregados sob demanda (cache frontend)
- **Validação**: Zod schemas gerados dinamicamente do backend
- **Segurança**: Multi-tenant validation em todas rotas
- **Migração**: Sistema atual continua funcionando (campos legados mantidos)
