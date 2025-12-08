# SINAN Technical Report - ArgoSaude v2.1

**Data**: 2025-12-08  
**Status**: Análise em PLAN MODE  
**Autor**: ArgoSaude Agent - Modo Especialista Sênior

---

## 1. Estado Atual

### 1.1 Estatísticas

| Métrica | Valor |
|---------|-------|
| Templates implementados | 109 |
| Agravos únicos (agravoCode) | 108 |
| Categorias | 25 |
| Prazo imediato | 50 |
| Prazo semanal | 59 |
| Com ficha investigação | 105 |
| Total linhas de código | 15.992 |

### 1.2 Arquivos de Template

| Arquivo | Linhas | Templates |
|---------|--------|-----------|
| arboviroses.ts | 1.181 | 10 |
| outros.ts | 1.743 | 22+ |
| virais.ts | 1.259 | 9 |
| zoonoses.ts | 1.258 | 10 |
| trabalho.ts | 1.143 | 10 |
| endemicas.ts | 953 | 9 |
| respiratorias.ts | 956 | 7 |
| imunoprevenivel.ts | 809 | 8 |
| ist.ts | 809 | 10 |
| alimentares.ts | 784 | 6 |
| parasitarias.ts | 672 | 8 |
| hepatites.ts | 661 | 5 |
| dengue.ts | 660 | 1 |
| violencia.ts | 574 | 1 |
| meningite.ts | 548 | 5 |
| sifilis.ts | 496 | 2 |
| tuberculose.ts | 458 | 1 |
| hanseniase.ts | 360 | 1 |
| index.ts | 343 | - |
| intoxicacao.ts | 325 | 1 |

---

## 2. Gaps Identificados

### 2.1 Campos Oficiais Ausentes (Prioridade ALTA)

Comparando com as fichas oficiais do SINAN, alguns templates precisam de campos adicionais:

| Template | Campos Faltantes |
|----------|------------------|
| Dengue | Classificação de risco, sinais de alarme detalhados |
| Tuberculose | Baciloscopia de escarro, cultura, TB-DR |
| Hanseníase | Grau de incapacidade inicial/final, PQT |
| Malária | Gota espessa, espécie do parasito |
| Leishmaniose | IDRM, forma clínica completa |
| COVID-19 | Variante, doses de vacina completas |

### 2.2 Autopreenchimento com Paciente

**Status Atual**: PARCIALMENTE IMPLEMENTADO

- A função `handleCitizenSelect` em `sinan.tsx` já faz autopreenchimento
- Campos preenchidos: Nome, CPF, CNS, Data de nascimento, Sexo, Nome da mãe, Telefone, Endereço
- **Gap**: NÃO funciona no SinanDynamicForm (formulário dinâmico)

**Solução Necessária**: Integrar seletor de paciente no SinanDynamicForm

### 2.3 Duplicação de Dados

| Local | Problema |
|-------|----------|
| `sinan.tsx` linhas 55-100 | `AGRAVO_CID_MAP` duplica dados de `shared/sinan/agravos.ts` |
| `SinanDynamicForm.tsx` | Não usa os campos `SINAN_COMMON_FIELDS` corretamente |

### 2.4 Step-based Form (Navegação por Etapas)

**Status Atual**: IMPLEMENTADO

- `SinanDynamicForm.tsx` tem navegação por etapas (`currentStep`, `groups`)
- Próximo/Anterior funcionando
- Salvamento de rascunho: IMPLEMENTADO
- Envio final: IMPLEMENTADO

### 2.5 Exportação DBF/TXT

**Status Atual**: NÃO IMPLEMENTADO

- Campos têm `sinanCode` mapeado
- Falta criar o gerador de arquivos DBF/TXT compatível com SINANNet

---

## 3. Plano de Correção

### 3.1 Tarefas SAFE (Podem ser executadas automaticamente)

| # | Tarefa | Risco | Estimativa |
|---|--------|-------|------------|
| S1 | Remover duplicação AGRAVO_CID_MAP em sinan.tsx | BAIXO | 30min |
| S2 | Adicionar seletor de paciente no SinanDynamicForm | BAIXO | 2h |
| S3 | Adicionar campos faltantes nos templates existentes | BAIXO | 4h |
| S4 | Criar lazy-loading para templates grandes | BAIXO | 1h |
| S5 | Implementar exportador DBF/TXT | MÉDIO | 4h |

### 3.2 Tarefas DESTRUTIVAS (Requerem aprovação)

| # | Tarefa | Risco | Requer Aprovação |
|---|--------|-------|------------------|
| D1 | Modificar schema.ts para campos adicionais SINAN | ALTO | SIM |
| D2 | Migration para novas colunas | ALTO | SIM |

---

## 4. Estrutura de Template Atual

```typescript
SinanFormTemplate {
  id: string;              // "sinan_dengue"
  nome: string;            // "Dengue"
  agravoCode: string;      // "A90"
  cid10: string;           // "A90"
  categoria: string;       // "arboviroses"
  versaoFicha: string;     // "DENGUE_v5.0"
  prazoNotificacao: "imediata" | "semanal";
  fichaInvestigacao: boolean;
  groups: SinanFormGroup[];
  fields: SinanField[];
  requiredFields: string[];
  validationRules?: SinanValidationRule[];
}
```

---

## 5. Campos Comuns (SINAN_COMMON_FIELDS)

Total: 40+ campos base presentes em todos os templates:

| Grupo | Campos |
|-------|--------|
| dados_gerais | tipo_notificacao, agravo_doenca |
| notificacao | dt_notificacao, uf_notificacao, municipio_notificacao, unidade_saude |
| paciente | paciente_nome, paciente_idade, paciente_idade_tipo, paciente_sexo |
| residencia | res_uf, res_municipio, res_bairro, res_logradouro |
| conclusao | classificacao_final, criterio_confirmacao, evolucao |
| investigador | dt_encerramento, nome_investigador |

---

## 6. Recomendações

1. **Prioridade 1**: Integrar seletor de paciente no SinanDynamicForm
2. **Prioridade 2**: Remover duplicações AGRAVO_CID_MAP
3. **Prioridade 3**: Implementar exportação DBF/TXT
4. **Prioridade 4**: Adicionar campos oficiais faltantes

---

*Relatório gerado em PLAN MODE - Aguardando aprovação para tarefas destrutivas*
