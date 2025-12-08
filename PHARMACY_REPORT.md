# Pharmacy Technical Report - ArgoSaude v2.1

**Data**: 2025-12-08  
**Status**: Análise em PLAN MODE  
**Autor**: ArgoSaude Agent - Modo Especialista Sênior

---

## 1. Estado Atual

### 1.1 Módulos de Farmácia

| Página | Arquivo | Linhas | Funcionalidade |
|--------|---------|--------|----------------|
| Farmácia (Principal) | pharmacy.tsx | 15 | Wrapper para PharmacyInventory |
| Estoque de Fraldas | pharmacy-diaper-stock.tsx | 712 | CRUD completo de fraldas |
| Dispensação | pharmacy-dispensation.tsx | - | Dispensação de medicamentos |
| Estoque Medicamentos | pharmacy-stock.tsx | - | Estoque de medicamentos |

### 1.2 Endpoints de Fraldas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/pharmacy/diaper-stock` | GET/POST | Lista/Cria estoque |
| `/api/pharmacy/diaper-stock/:id` | GET/PATCH/DELETE | Operações por ID |
| `/api/pharmacy/diaper-stock/low` | GET | Estoque baixo |
| `/api/pharmacy/diaper-stock/expiring` | GET | Próximos a vencer |
| `/api/pharmacy/diaper-stock/fifo/:size` | GET | FIFO por tamanho |
| `/api/pharmacy/diaper-movements` | GET | Movimentos |

### 1.3 Tamanhos de Fraldas Suportados

| Código | Descrição |
|--------|-----------|
| RN | Recém Nascido |
| P | Pequeno |
| M | Médio |
| G | Grande |
| XG | Extra Grande |
| XXG | Extra Extra Grande |
| geriatrica_P | Geriátrica P |
| geriatrica_M | Geriátrica M |
| geriatrica_G | Geriátrica G |
| geriatrica_XG | Geriátrica XG |

---

## 2. Gaps Identificados

### 2.1 Visibilidade de Autorizações Pendentes

**Status Atual**: NÃO IMPLEMENTADO

A Farmácia **não consegue ver** autorizações pendentes de retirada emitidas pela Assistência Social.

**Impacto**: Fluxo quebrado - farmacêutico precisa acessar módulo de Assistência Social

### 2.2 Processamento de Entregas pela Farmácia

**Status Atual**: NÃO IMPLEMENTADO

- Entregas são processadas exclusivamente pela Assistência Social
- Farmácia deveria poder processar entregas diretamente

### 2.3 Dashboard de Fraldas

**Status Atual**: BÁSICO

Presente:
- Lista de estoque
- Alertas de estoque baixo
- Alertas de vencimento

Faltando:
- Gráfico de saídas por período
- Previsão de demanda
- Top beneficiários

---

## 3. Plano de Correção

### 3.1 Tarefas SAFE

| # | Tarefa | Risco | Estimativa |
|---|--------|-------|------------|
| S1 | Criar endpoint `/api/pharmacy/diapers/pending-authorizations` | BAIXO | 1h |
| S2 | Criar view de autorizações pendentes na Farmácia | BAIXO | 3h |
| S3 | Criar endpoint `/api/pharmacy/diapers/process-delivery` | BAIXO | 2h |
| S4 | Adicionar gráfico de saídas | BAIXO | 1h |

### 3.2 Tarefas DESTRUTIVAS

Nenhuma tarefa destrutiva identificada.

---

## 4. Integração Proposta

### 4.1 Novo Fluxo

```
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ Assistência Social │───▶│ Autorização Emitida │───▶│ Farmácia Visualiza│
│ Cria Autorização   │    │ (status: ativa)     │    │ Pendentes        │
└────────────────────┘    └─────────────────────┘    └────────┬─────────┘
                                                               │
                                                               ▼
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ Assistência Social │◀───│ Entrega Registrada  │◀───│ Farmácia Processa│
│ Vê Status Real-time│    │ (baixa estoque)     │    │ Entrega          │
└────────────────────┘    └─────────────────────┘    └──────────────────┘
```

### 4.2 Novos Endpoints Necessários

```typescript
// Farmácia vê autorizações pendentes
GET /api/pharmacy/diapers/pending-authorizations
Response: DiaperAuthorization[] (status = 'ativa' | 'parcialmente_utilizada')

// Farmácia processa entrega
POST /api/pharmacy/diapers/process-delivery
Body: {
  authorizationId: string,
  quantity: number,
  receiverName: string,
  receiverDocument: string
}
```

---

## 5. Componente Proposto

```
client/src/pages/pharmacy-pending-authorizations.tsx
├── Lista de autorizações pendentes
├── Informações do beneficiário
├── Botão "Processar Entrega"
└── Modal de confirmação de entrega
```

---

## 6. Recomendações

1. **Prioridade 1**: Criar view de autorizações pendentes
2. **Prioridade 2**: Implementar processamento de entrega na Farmácia
3. **Prioridade 3**: Adicionar gráficos de movimentação
4. **Prioridade 4**: Previsão de demanda

---

*Relatório gerado em PLAN MODE - Todas as tarefas são SAFE*
