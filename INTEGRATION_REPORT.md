# Integration Report - ArgoSaude v2.1

**Data**: 2025-12-08  
**Status**: Análise em PLAN MODE  
**Autor**: ArgoSaude Agent - Modo Especialista Sênior

---

## 1. Integrações Analisadas

### 1.1 SINAN ↔ Pacientes

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| Busca de pacientes | OK | Query `/api/citizens` |
| Autopreenchimento form básico | OK | `handleCitizenSelect` em sinan.tsx |
| Autopreenchimento form dinâmico | NÃO | SinanDynamicForm não tem seletor |
| Criar paciente se não existir | NÃO | Não há botão "Criar Paciente" |

### 1.2 Assistência Social ↔ Farmácia

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| Baixa automática de estoque | OK | Via `getDiaperStockByFIFO` |
| Visualização de estoque | OK | Query `/api/pharmacy/diaper-stock` |
| Farmácia vê autorizações | NÃO | Endpoint não existe |
| Farmácia processa entrega | NÃO | Endpoint não existe |
| Status em tempo real | PARCIAL | Invalidação de cache funciona |

### 1.3 Assistência Social ↔ Pacientes

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| Beneficiário como Paciente | NÃO | Tabelas separadas, sem link |
| CPF duplicado | NÃO VALIDADO | Pode haver beneficiário e paciente com mesmo CPF |

---

## 2. Gaps Críticos

### 2.1 Fluxo Quebrado: Farmácia ↔ Autorizações

```
ATUAL (Problema):
┌────────────────────┐         ┌──────────────────┐
│ Assistência Social │────X────│ Farmácia         │
│ Cria Autorização   │         │ (não visualiza)  │
└────────────────────┘         └──────────────────┘

PROPOSTO (Solução):
┌────────────────────┐         ┌──────────────────┐
│ Assistência Social │────────▶│ Farmácia         │
│ Cria Autorização   │         │ Visualiza/Entrega│
└────────────────────┘         └──────────────────┘
```

### 2.2 Autopreenchimento SINAN

```
ATUAL (Problema):
┌─────────────┐      ┌─────────────┐
│ sinan.tsx   │  OK  │ Pacientes   │
│ (form       │─────▶│ (citizens)  │
│  básico)    │      └─────────────┘
└─────────────┘

┌─────────────┐      ┌─────────────┐
│ SinanDynamic│  X   │ Pacientes   │
│ Form.tsx    │──────│ (citizens)  │
└─────────────┘      └─────────────┘

PROPOSTO (Solução):
Adicionar PatientSelector no SinanDynamicForm
```

---

## 3. Plano de Integração

### 3.1 Fase 1: Farmácia ↔ Assistência Social (SAFE)

| # | Tarefa | Arquivo | Estimativa |
|---|--------|---------|------------|
| 1 | Criar endpoint `/api/pharmacy/diapers/pending-authorizations` | server/routes.ts | 1h |
| 2 | Criar endpoint `/api/pharmacy/diapers/process-delivery` | server/routes.ts | 2h |
| 3 | Criar página `pharmacy-pending-authorizations.tsx` | client/src/pages | 3h |
| 4 | Adicionar link na sidebar de Farmácia | App.tsx | 15min |

### 3.2 Fase 2: SINAN ↔ Pacientes (SAFE)

| # | Tarefa | Arquivo | Estimativa |
|---|--------|---------|------------|
| 1 | Criar componente PatientSelector | client/src/components | 1h |
| 2 | Integrar no SinanDynamicForm | SinanDynamicForm.tsx | 1h |
| 3 | Mapear campos SINAN ↔ Patient | shared/sinan | 30min |
| 4 | Adicionar botão "Criar Paciente" | PatientSelector | 2h |

### 3.3 Fase 3: Beneficiário ↔ Paciente (DESTRUTIVO)

| # | Tarefa | Risco | Requer Aprovação |
|---|--------|-------|------------------|
| 1 | Adicionar `citizenId` em `sa_beneficiaries` | MÉDIO | SIM |
| 2 | Criar migration | ALTO | SIM |
| 3 | Sincronizar dados existentes | ALTO | SIM |

---

## 4. Mapeamento de Campos

### 4.1 SINAN ↔ Citizen (Paciente)

| Campo SINAN | Campo Citizen | sinanCode |
|-------------|---------------|-----------|
| paciente_nome | name | NM_PACIENT |
| paciente_sexo | gender | CS_SEXO |
| paciente_idade | birthDate (calculado) | NU_IDADE_N |
| paciente_cpf | cpf | NU_CPF |
| paciente_cns | cns | NU_CNS |
| paciente_mae | motherName | NM_MAE_PAC |
| paciente_telefone | phone | NU_TELEFON |
| res_logradouro | address | NM_LOGRADO |
| res_bairro | neighborhood | NM_BAIRRO |
| res_municipio | city | ID_MN_RESI |
| res_uf | state | SG_UF |

### 4.2 Beneficiário ↔ Citizen

| Campo Beneficiário | Campo Citizen |
|--------------------|---------------|
| name | name |
| cpf | cpf |
| phone | phone |
| address | address |
| neighborhood | neighborhood |
| city | city |
| state | state |

---

## 5. Endpoints Novos Propostos

### 5.1 Farmácia - Autorizações Pendentes

```typescript
// GET /api/pharmacy/diapers/pending-authorizations
app.get("/api/pharmacy/diapers/pending-authorizations", enforceUnitScope(), async (req, res) => {
  const effectiveUnitId = getEffectiveUnitId(req);
  const authorizations = await storage.getDiaperAuthorizations({
    unitId: effectiveUnitId,
    status: ['ativa', 'parcialmente_utilizada'],
  });
  
  // Incluir dados do beneficiário
  const result = await Promise.all(authorizations.map(async (auth) => {
    const beneficiary = await storage.getSaBeneficiaryById(auth.beneficiaryId);
    return { ...auth, beneficiary };
  }));
  
  res.json(result);
});
```

### 5.2 Farmácia - Processar Entrega

```typescript
// POST /api/pharmacy/diapers/process-delivery
app.post("/api/pharmacy/diapers/process-delivery", enforceUnitScope(), async (req, res) => {
  // Reutiliza lógica de /api/social-assistance/deliveries
  // Com validação de role 'farmaceutico'
});
```

---

## 6. Cronograma Sugerido

| Fase | Duração | Prioridade |
|------|---------|------------|
| Fase 1: Farmácia ↔ Assistência Social | 6h | ALTA |
| Fase 2: SINAN ↔ Pacientes | 4.5h | ALTA |
| Fase 3: Beneficiário ↔ Paciente | 4h | MÉDIA |
| **Total** | **14.5h** | - |

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Duplicação de entregas | Validação de status antes de processar |
| Inconsistência de estoque | Transação atômica com rollback |
| Dados duplicados CPF | Validação cruzada ao criar beneficiário |

---

*Relatório gerado em PLAN MODE - Fases 1 e 2 são SAFE, Fase 3 requer aprovação*
