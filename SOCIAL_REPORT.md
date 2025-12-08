# Social Assistance Technical Report - ArgoSaude v2.1

**Data**: 2025-12-08  
**Status**: Análise em PLAN MODE  
**Autor**: ArgoSaude Agent - Modo Especialista Sênior

---

## 1. Estado Atual

### 1.1 Funcionalidades Implementadas

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Cadastro de Beneficiários | OK | Nome, CPF, NIS, telefone, endereço, tipo |
| Solicitações de Fraldas | OK | Número único, beneficiário, tamanho, quantidade |
| Autorizações | OK | Aprovação, período de validade, quantidade |
| Entregas | OK | Rastreamento completo, recebedor |
| Listas Mensais (CSV) | OK | Upload e processamento batch |
| Estatísticas/KPIs | OK | Dashboard com métricas |

### 1.2 Endpoints API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/social-assistance/beneficiaries` | GET/POST | CRUD beneficiários |
| `/api/social-assistance/beneficiaries/:id` | GET/PATCH/DELETE | Operações por ID |
| `/api/social-assistance/requests` | GET/POST | Solicitações |
| `/api/social-assistance/authorizations` | GET/POST | Autorizações |
| `/api/social-assistance/deliveries` | GET/POST | Entregas |
| `/api/social-assistance/monthly-lists` | GET/POST | Listas mensais |
| `/api/social-assistance/stats` | GET | Estatísticas |
| `/api/social-assistance/forecast` | GET | Previsão de demanda |

### 1.3 Fluxo Atual

```
Beneficiário → Solicitação → Autorização → Entrega
     │              │             │            │
     ▼              ▼             ▼            ▼
  Cadastro      Pendente      Aprovada     Baixa Estoque
```

---

## 2. Gaps Identificados

### 2.1 Dashboard Incompleto

**Status Atual**: Básico com 5 cards de KPI

**Faltando**:
- Gráfico de tendência mensal
- Lista de autorizações próximas de expirar
- Beneficiários sem retirada há X meses
- Comparativo mensal de entregas

### 2.2 Validações de Período

**Status Atual**: PARCIAL

- Permite criar múltiplas autorizações para o mesmo beneficiário
- **Gap**: Não verifica sobreposição de períodos

### 2.3 Logs de Auditoria

**Status Atual**: PARCIAL

- Movimento de estoque registra `userId`
- **Gap**: Não há log específico de quem autorizou vs quem entregou

### 2.4 Campos Obrigatórios por Norma Municipal

**Status Atual**: Não verificado

Campos que podem ser exigidos:
- Laudo médico (para fraldas geriátricas)
- Atestado de residência
- Comprovante de renda

---

## 3. Plano de Correção

### 3.1 Tarefas SAFE

| # | Tarefa | Risco | Estimativa |
|---|--------|-------|------------|
| S1 | Adicionar validação de sobreposição de período | BAIXO | 1h |
| S2 | Criar gráfico de tendência mensal | BAIXO | 2h |
| S3 | Adicionar lista de autorizações próximas de expirar | BAIXO | 1h |
| S4 | Melhorar logs de auditoria | BAIXO | 2h |

### 3.2 Tarefas DESTRUTIVAS

| # | Tarefa | Risco | Requer Aprovação |
|---|--------|-------|------------------|
| D1 | Adicionar campos de documentos (laudo, atestado) | MÉDIO | SIM |

---

## 4. Integração com Farmácia

### 4.1 Estado Atual

- Entregas são processadas pela **Assistência Social**
- Baixa de estoque automática via `getDiaperStockByFIFO`
- Farmácia vê estoque mas **NÃO vê autorizações pendentes**

### 4.2 Gap Principal

A Farmácia precisa de uma view para:
1. Ver autorizações pendentes de retirada
2. Processar entregas sem acessar módulo Assistência Social

**Solução**: Criar endpoint `/api/pharmacy/diapers/pending-authorizations`

---

## 5. Estrutura de Dados

### 5.1 Tabelas Envolvidas

```sql
sa_beneficiaries       -- Beneficiários
sa_diaper_requests     -- Solicitações
sa_diaper_authorizations -- Autorizações
sa_diaper_deliveries   -- Entregas
sa_monthly_lists       -- Listas mensais
diaper_stock           -- Estoque de fraldas
diaper_stock_movements -- Movimentos de estoque
```

### 5.2 Status de Autorização

| Status | Descrição |
|--------|-----------|
| `ativa` | Pode ser utilizada |
| `parcialmente_utilizada` | Tem saldo restante |
| `utilizada` | Saldo zerado |
| `expirada` | Período de validade encerrado |
| `cancelada` | Cancelada manualmente |

---

## 6. Recomendações

1. **Prioridade 1**: Criar view de autorizações pendentes na Farmácia
2. **Prioridade 2**: Validar sobreposição de períodos
3. **Prioridade 3**: Melhorar dashboard com gráficos
4. **Prioridade 4**: Adicionar campos de documentação

---

*Relatório gerado em PLAN MODE - Aguardando aprovação para tarefas destrutivas*
