# Roadmap de Implementação - Linhas de Cuidado e Formulários Dinâmicos

## Resumo Executivo

Este documento detalha o plano de implementação **incremental e prático** para transformar o MuniSaúde em um sistema com **formulários dinâmicos por especialidade**, **linhas de cuidado**, **protocolos automáticos** e **indicadores clínicos**.

---

## Estratégia: 3 Fases Incrementais

### ✅ **FASE 1: MVP - Funcionalidade Base** (2-3 semanas)
*Implementar o mínimo viável para provar o conceito*

**Objetivo:** Criar sistema de templates dinâmicos funcional com 2 especialidades-piloto

**Entregas:**
1. Schema completo (8 tabelas novas)
2. Seed com 2 especialidades (Pré-natal + Diabetes)
3. API CRUD para templates
4. Componente React de formulário dinâmico
5. Demonstração funcional end-to-end

**Complexidade:** Média  
**Valor de negócio:** Alto (prova conceito + uso imediato)

---

### 🚀 **FASE 2: Expansão - Protocolos e Alertas** (2-3 semanas)
*Adicionar inteligência ao sistema*

**Objetivo:** Motor de protocolos automáticos + alertas clínicos + mais especialidades

**Entregas:**
1. Motor de avaliação de protocolos (backend)
2. Sistema de alertas clínicos (frontend)
3. Encaminhamento inteligente com sugestões
4. 4 especialidades adicionais (Pediatria, Geriatria, Cardiologia, Ortopedia)
5. Fila por linha de cuidado

**Complexidade:** Alta  
**Valor de negócio:** Muito alto (diferencial competitivo)

---

### 📊 **FASE 3: Indicadores e Gestão** (2-3 semanas)
*Fechamento com gestão e relatórios*

**Objetivo:** Painel de indicadores + plano terapêutico compartilhado

**Entregas:**
1. Motor de cálculo de indicadores
2. Dashboard de indicadores por especialidade
3. Plano terapêutico compartilhado
4. Relatórios gerenciais
5. Integração completa e-SUS (campos dinâmicos → FAI)

**Complexidade:** Média  
**Valor de negócio:** Alto (gestão + compliance)

---

## FASE 1 - Detalhamento Técnico

### 1.1. Backend - Schema e Migrations

**Arquivo:** `shared/schema.ts`

**Novas tabelas:**
```typescript
specialties              // Especialidades médicas
careLines                // Linhas de cuidado
consultationTemplates    // Modelos de formulário
templateFields           // Campos dinâmicos
consultationFieldData    // Dados preenchidos
clinicalProtocols        // Protocolos clínicos (Fase 2)
therapeuticPlans         // Planos terapêuticos (Fase 3)
therapeuticPlanItems     // Itens do plano (Fase 3)
```

**Modificações em tabelas existentes:**
```typescript
// consultations - Adicionar
careLineId: text("care_line_id").references(() => careLines.id),
templateId: text("template_id").references(() => consultationTemplates.id),

// medicalReferrals - Adicionar
careLineId: text("care_line_id").references(() => careLines.id),
requiredExams: text("required_exams", { mode: "json" }).$type<string[]>(),

// professionals - Adicionar
cboCode: text("cbo_code"), // CRÍTICO para e-SUS
specialtyIds: text("specialty_ids", { mode: "json" }).$type<string[]>(),
```

**Comando:**
```bash
npm run db:push
```

---

### 1.2. Seed - Dados Iniciais

**Arquivo:** `server/seed-templates.ts`

**Conteúdo:**
```typescript
// 2 Especialidades
- Obstetrícia (PRE-NATAL)
- Endocrinologia (DIABETES)

// 2 Linhas de Cuidado
- Pré-natal de risco habitual
- Diabetes mellitus tipo 2

// 2 Templates
- "Consulta Pré-natal" com 12 campos
  * IG (semanas), DPP, altura uterina, BCF, edema, etc
- "Consulta Diabetes" com 10 campos
  * HbA1c, glicemia jejum, inspeção pé, etc

// Executar seed:
tsx server/seed-templates.ts
```

---

### 1.3. Backend - API Routes

**Arquivo:** `server/routes.ts`

**Novas rotas:**
```typescript
// Templates
GET    /api/consultation-templates         // Listar templates
GET    /api/consultation-templates/:id     // Detalhe template + campos
POST   /api/consultation-templates         // Criar template (admin)
PUT    /api/consultation-templates/:id     // Editar template
DELETE /api/consultation-templates/:id     // Deletar template

// Template Fields
GET    /api/template-fields/:templateId    // Campos de um template
POST   /api/template-fields                // Adicionar campo
PUT    /api/template-fields/:id            // Editar campo
DELETE /api/template-fields/:id            // Deletar campo

// Consultation Field Data
GET    /api/consultations/:id/field-data   // Dados dinâmicos de uma consulta
POST   /api/consultations/:id/field-data   // Salvar dados dinâmicos

// Specialties & Care Lines
GET    /api/specialties                    // Listar especialidades
GET    /api/care-lines                     // Listar linhas de cuidado
GET    /api/care-lines/:id/templates       // Templates de uma linha
```

**Implementação:** `server/storage.ts` + validação Zod

---

### 1.4. Frontend - Componente Dinâmico

**Arquivo:** `client/src/components/DynamicConsultationForm.tsx`

**Funcionalidades:**
- Carrega template via API
- Renderiza campos dinamicamente (texto, número, data, select, etc)
- Validação Zod automática baseada em regras
- Integração com react-hook-form
- Salva dados no formato `consultationFieldData`

**Uso:**
```tsx
<DynamicConsultationForm
  templateId="prenatal-template-id"
  consultationId={consultation.id}
  onSubmit={(data) => saveDynamicFields(data)}
/>
```

---

### 1.5. Frontend - Integração Medical Attendance

**Arquivo:** `client/src/pages/medical-attendance.tsx`

**Modificações:**
- Nova aba "Dados Específicos" (depois de SOAP/Sinais Vitais)
- Detecta se consulta tem `templateId`
- Renderiza `<DynamicConsultationForm />` se aplicável
- Mantém compatibilidade com consultas sem template

**Fluxo:**
1. Médico seleciona paciente
2. Sistema detecta linha de cuidado do paciente (se houver)
3. Sugere template apropriado
4. Médico preenche SOAP + campos dinâmicos
5. Salva tudo junto

---

### 1.6. Testes de Aceitação (MVP)

**Cenário 1: Consulta Pré-natal**
1. Cadastrar gestante com linha de cuidado "Pré-natal"
2. Iniciar consulta → Sistema sugere template "Consulta Pré-natal"
3. Preencher SOAP + campos dinâmicos (IG, DPP, BCF, etc)
4. Salvar consulta
5. Verificar dados salvos em `consultationFieldData`

**Cenário 2: Consulta Diabetes**
1. Cadastrar paciente diabético com linha "Diabetes"
2. Iniciar consulta → Sistema sugere template "Consulta Diabetes"
3. Preencher HbA1c, glicemia, inspeção pé
4. Salvar e verificar

**Critério de sucesso:**
- ✅ Templates carregam corretamente
- ✅ Campos renderizam dinamicamente
- ✅ Validação funciona
- ✅ Dados salvam no banco
- ✅ Consulta sem template continua funcionando

---

## FASE 2 - Detalhamento Técnico

### 2.1. Motor de Protocolos

**Arquivo:** `server/services/protocol-engine.ts`

**Função principal:**
```typescript
export async function evaluateProtocols(
  consultationId: string,
  fieldData: Record<string, any>,
  careLineId: string
): Promise<Alert[]> {
  // 1. Buscar protocolos ativos da linha de cuidado
  const protocols = await getActiveProtocols(careLineId);
  
  // 2. Avaliar cada protocolo
  const alerts: Alert[] = [];
  for (const protocol of protocols) {
    if (evaluateCondition(fieldData, protocol.triggerCondition)) {
      alerts.push({
        level: protocol.alertLevel,
        message: protocol.alertMessage,
        action: protocol.action,
      });
    }
  }
  
  return alerts;
}

function evaluateCondition(
  data: Record<string, any>,
  conditions: Condition[]
): boolean {
  // Lógica de avaliação (gt, lt, eq, contains, etc)
}
```

**Exemplos de protocolos:**

**Pré-natal:**
```json
{
  "name": "VDRL pendente 1º trimestre",
  "triggerCondition": [
    { "field": "ig_semanas", "operator": "gt", "value": 12 },
    { "field": "vdrl_realizado", "operator": "eq", "value": false }
  ],
  "alertMessage": "VDRL não realizado no 1º trimestre - solicitar urgente",
  "alertLevel": "warning"
}
```

**Diabetes:**
```json
{
  "name": "HbA1c descompensada",
  "triggerCondition": [
    { "field": "hba1c", "operator": "gt", "value": 9 }
  ],
  "alertMessage": "HbA1c > 9% - Revisar esquema terapêutico",
  "alertLevel": "critical",
  "action": {
    "type": "auto_referral",
    "target": "endocrinologia"
  }
}
```

---

### 2.2. Sistema de Alertas Frontend

**Arquivo:** `client/src/components/ClinicalAlerts.tsx`

**Funcionalidade:**
- Exibe alertas em tempo real durante consulta
- Cores por nível (info/warning/critical)
- Ações sugeridas (encaminhar, solicitar exame, etc)

**Localização:**
- Sidebar direita da tela de atendimento
- Badge de notificação no histórico do paciente

---

### 2.3. Fila por Especialidade

**Arquivo:** `client/src/pages/specialty-queue.tsx`

**Funcionalidades:**
- Filtros: especialidade, linha de cuidado, prioridade, risco
- Tabela: paciente, motivo, prioridade, tempo espera, risco
- Ordenação inteligente (urgentes → alto risco → tempo espera)
- Botão "Chamar próximo" (prioriza automaticamente)

**Backend:**
```typescript
// GET /api/specialty-queue
// Params: specialtyId, careLineId, unitId
// Retorna fila ordenada por prioridade + risco + tempo
```

---

## FASE 3 - Detalhamento Técnico

### 3.1. Motor de Indicadores

**Arquivo:** `server/services/indicators.ts`

**Indicadores-exemplo:**

**Diabetes:**
- % pacientes com HbA1c < 7% (controlados)
- % pacientes com HbA1c nos últimos 6 meses
- % pacientes com avaliação pé diabético em dia

**Pré-natal:**
- % gestantes com 6+ consultas
- % gestantes com exames 1º trimestre completos
- % gestantes com pré-natal iniciado antes 12 semanas

**Implementação:**
```typescript
export async function calculateIndicator(
  careLineId: string,
  indicatorCode: string,
  unitId: string,
  period: DateRange
): Promise<IndicatorResult> {
  // Query complexa aggregando dados de consultationFieldData
  // Retorna { numerator, denominator, percentage, details }
}
```

---

### 3.2. Dashboard de Indicadores

**Arquivo:** `client/src/pages/indicators-dashboard.tsx`

**Layout:**
- Filtros: especialidade, linha de cuidado, período, unidade
- Cards com KPIs principais
- Gráficos Recharts (barras, linhas, pizza)
- Tabela detalhada (drill-down)
- Export PDF/Excel

---

### 3.3. Plano Terapêutico

**Arquivo:** `client/src/pages/therapeutic-plan.tsx`

**Funcionalidades:**
- Visualização unificada de todos profissionais envolvidos
- Tarefas com responsáveis e prazos
- Timeline de evolução
- Notificações de pendências

**Uso:**
- Paciente com diabetes + hipertensão + depressão
- Plano compartilhado entre: clínico, cardiologista, psiquiatra, nutricionista, NASF

---

## Cronograma Sugerido

| Fase | Duração | Recursos | Entregas |
|------|---------|----------|----------|
| **Fase 1** | 2-3 semanas | 1 dev fullstack | MVP funcional (2 especialidades) |
| **Fase 2** | 2-3 semanas | 1 dev fullstack | Protocolos + 6 especialidades totais |
| **Fase 3** | 2-3 semanas | 1 dev fullstack | Indicadores + gestão completa |
| **Total** | 6-9 semanas | - | Sistema completo e escalável |

---

## Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Performance com muitos campos dinâmicos | Médio | Baixa | Cache frontend + lazy loading |
| Complexidade de protocolos | Alto | Média | Começar com regras simples, evoluir gradualmente |
| Resistência de usuários | Médio | Média | Piloto com especialidade de alto valor (pré-natal) |
| Incompatibilidade e-SUS | Alto | Baixa | Mapeamento FAI desde fase 1 |

---

## Próximos Passos Imediatos

### Opção A: Implementar FASE 1 Completa
*Recomendado se você quer um sistema funcional rápido*

1. Criar schema (1 dia)
2. Seed templates pré-natal + diabetes (1 dia)
3. API backend (2 dias)
4. Componente React dinâmico (2 dias)
5. Integração medical-attendance (1 dia)
6. Testes (1 dia)

**Total:** ~8 dias úteis

### Opção B: Proof of Concept Rápido
*Recomendado para validar conceito primeiro*

1. Criar apenas tabelas `consultationTemplates` + `templateFields`
2. Seed de 1 template simples (Pré-natal com 5 campos)
3. API básica (GET templates, GET fields)
4. Frontend read-only (exibir campos dinâmicos)

**Total:** ~2 dias úteis

---

## Decisão Estratégica

**Pergunta para o gestor:**

Qual abordagem prefere?

**A) MVP Completo (Fase 1)** → 2-3 semanas, sistema funcional end-to-end  
**B) Proof of Concept** → 2 dias, validar conceito antes de investir  
**C) Especialidade Única Piloto** → 1 semana, focar só em pré-natal  

**Recomendação:** Opção C (Piloto Pré-natal) é o melhor custo-benefício, com alto impacto clínico e validação real do conceito.
