# Módulo de Exportação e-SUS AB / SISAB

## Visão Geral

Este módulo converte atendimentos médicos do MuniSaúde para o formato **Ficha de Atendimento Individual (FAI)** do e-SUS AB, necessário para envio ao SISAB (Sistema de Informação em Saúde para a Atenção Básica) do DATASUS.

## Status Atual

✅ **Implementado:**
- Serviço de mapeamento `mapConsultationToFAI()`
- Rota de API `GET /api/consultations/:id/export-fai`
- Validação rigorosa de campos obrigatórios
- Estrutura completa da FAI conforme e-SUS AB v5.3

⚠️ **Campos Críticos Faltantes (impedem envio ao SISAB):**

### 1. CBO do Profissional (BLOQUEANTE)
**Problema:** Campo `cbo` (Classificação Brasileira de Ocupações) está vazio  
**Impacto:** SISAB **rejeita** a exportação sem este campo  
**Solução necessária:**
```typescript
// Em shared/schema.ts - tabela professionals
cboCode: text("cbo_code").notNull(), // Ex: "225125" (Médico clínico)
```

### 2. Dados Antropométricos e Sinais Vitais
**Problema:** Campos `peso`, `altura`, `pressão arterial`, etc estão null  
**Fontes alternativas:**
- Integrar com tabela `fad_evaluations` (avaliações domiciliares ACE)
- Adicionar campos específicos na tabela `consultations`
- Usar última medição disponível do cidadão

### 3. Códigos SIGTAP para Exames
**Problema:** Exames não têm `sigtapCode` nem `priority`  
**Solução:**
```typescript
// Em shared/schema.ts - tabela exams
sigtapCode: text("sigtap_code"), // Ex: "0202010112" 
priority: text("priority", { enum: ["routine", "urgent", "emergency"] }).default("routine"),
```

## Formato de Exportação FAI

### Exemplo de Resposta da API

```json
{
  "success": true,
  "data": {
    "identificacaoEstabelecimento": {
      "codigoIbgeMunicipio": "2906501",
      "cnesUnidade": "2345678",
      "ine": "0001234567",
      "dataAtendimento": "2024-11-25",
      "turno": "manha"
    },
    "profissional": {
      "cns": "123456789012345",
      "cbo": "225125",
      "nome": "Dr. João Silva"
    },
    "cidadao": {
      "cns": "987654321098765",
      "nome": "Maria Santos",
      "dataNascimento": "1985-03-15",
      "sexo": "F",
      "municipioResidencia": "2906501"
    },
    "atendimento": {
      "tipoAtendimento": "consulta_agendada",
      "modalidade": "presencial",
      "racionalidade": null,
      "vigilanciaSaude": {
        "pesquisaVetores": false,
        "acaoEducativa": false
      }
    },
    "antropometria": {
      "peso": 70,
      "altura": 165,
      "perimetroCefalico": null
    },
    "sinaisVitais": {
      "pressaoArterialSistolica": 120,
      "pressaoArterialDiastolica": 80,
      "frequenciaCardiaca": 72,
      "frequenciaRespiratoria": 16,
      "temperatura": 36.5,
      "saturacaoO2": 98,
      "glicemia": 90
    },
    "problemasCondicoes": {
      "hipertensao": false,
      "diabetes": false,
      "obesidade": false,
      "gestante": false,
      "prenatal": false,
      "puericultura": false,
      "tuberculose": false,
      "hanseniase": false,
      "saúdeMental": false,
      "alcoolDrogas": false
    },
    "diagnosticos": [
      {
        "codigo": "K29",
        "tipo": "ciap2",
        "principal": true
      },
      {
        "codigo": "K30",
        "tipo": "cid10",
        "principal": false
      }
    ],
    "procedimentos": [],
    "examesSolicitados": [
      {
        "codigoSigtap": "0202010112",
        "descricao": "Hemograma completo",
        "prioridade": "rotina"
      }
    ],
    "medicamentos": [
      {
        "medicamento": "Omeprazol 20mg",
        "dosagem": "20mg",
        "frequencia": "1x ao dia",
        "duracao": "30 dias"
      }
    ],
    "encaminhamentos": [
      {
        "destino": "Gastroenterologia",
        "especialidade": "Gastroenterologia",
        "prioridade": "normal",
        "motivo": "Investigação de dispepsia"
      }
    ],
    "desfecho": {
      "retornoConsulta": true,
      "encaminhamento": true,
      "altaEpisodio": false
    },
    "metadados": {
      "versaoSistema": "MuniSaúde v1.0.0",
      "dataExportacao": "2024-11-25T21:32:00Z",
      "statusEnvio": "pendente"
    }
  },
  "validation": {
    "valid": false,
    "errors": [
      "CBO (Classificação Brasileira de Ocupações) do profissional é obrigatório - adicionar campo ao schema"
    ],
    "warnings": [
      "1 exame(s) sem código SIGTAP - adicionar campo ao schema de exams"
    ]
  }
}
```

## Campos Obrigatórios (SISAB)

### Identificação
- ✅ `codigoIbgeMunicipio` - Código IBGE 7 dígitos
- ✅ `cnesUnidade` - CNES da unidade de saúde
- ✅ `dataAtendimento` - Data YYYY-MM-DD
- ✅ `turno` - manha/tarde/noite

### Profissional
- ✅ `cns` - Cartão Nacional de Saúde
- ❌ `cbo` - **FALTANTE** - Código CBO (ex: 225125)

### Cidadão
- ✅ `cns` - Cartão Nacional de Saúde
- ✅ `dataNascimento` - YYYY-MM-DD
- ✅ `sexo` - M/F

### Atendimento
- ✅ `tipoAtendimento` - consulta_agendada/consulta_dia/etc
- ✅ `modalidade` - presencial/domiciliar/teleatendimento

### Clínico
- ✅ `diagnosticos` - Mínimo 1 (CIAP-2 ou CID-10)
- ✅ `diagnosticoPrincipal` - Um deve ser marcado como principal

## Roadmap de Melhorias

### Curto Prazo (Crítico)
1. **Adicionar campo CBO ao schema `professionals`**
   ```sql
   ALTER TABLE professionals ADD COLUMN cbo_code TEXT NOT NULL DEFAULT '';
   ```

2. **Adicionar campos ao schema `exams`**
   ```sql
   ALTER TABLE exams ADD COLUMN sigtap_code TEXT;
   ALTER TABLE exams ADD COLUMN priority TEXT DEFAULT 'routine';
   ```

3. **Integrar sinais vitais**
   - Buscar dados da tabela `fad_evaluations`
   - Ou adicionar campos específicos em `consultations`

### Médio Prazo
4. **Fila de Exportação**
   - Tabela `esus_export_queue` para controlar envios
   - Status: pendente → processando → enviado → erro
   - Retry automático em caso de falha

5. **Envio em Lote**
   - Agrupar múltiplos atendimentos
   - Compactação ZIP conforme especificação SISAB
   - Assinatura digital (certificado A1/A3)

6. **Reprocessamento**
   - Interface para reenviar fichas com erro
   - Logs de auditoria de envios
   - Relatórios de conformidade

### Longo Prazo
7. **Outras Fichas e-SUS**
   - Ficha de Cadastro Individual
   - Ficha de Cadastro Domiciliar
   - Ficha de Atividade Coletiva
   - Ficha de Visita Domiciliar

8. **Integração Direta DATASUS**
   - API REST do SISAB
   - Autenticação via certificado digital
   - Sincronização bidirecional

## Uso da API

### Exportar Atendimento

```bash
GET /api/consultations/{consultationId}/export-fai
```

**Resposta:**
```json
{
  "success": true,
  "data": { /* FAI completa */ },
  "validation": {
    "valid": false,
    "errors": ["CBO do profissional é obrigatório"],
    "warnings": ["Sinais vitais não fornecidos"]
  }
}
```

### Validar Antes de Enviar

A validação ocorre automaticamente na rota. Verifique:
- `validation.valid === true` - Pronto para envio
- `validation.errors` - Bloqueiam envio
- `validation.warnings` - Não bloqueiam mas indicam incompletude

## Referências

- [Manual e-SUS APS v5.3](http://189.28.128.100/dab/docs/portaldab/documentos/esus/Manual_e-SUS_APS_v5.3.pdf)
- [Especificação SISAB](http://sisaps.saude.gov.br/esus/)
- [Tabela CBO - Ministério do Trabalho](http://www.mtecbo.gov.br/)
- [Tabela SIGTAP](http://sigtap.datasus.gov.br/)
- [Códigos IBGE de Municípios](https://www.ibge.gov.br/explica/codigos-dos-municipios.php)

## Suporte

Para dúvidas sobre a implementação, consultar:
- Documentação DATASUS
- Manual técnico e-SUS AB
- Equipe de TI da Secretaria Municipal de Saúde
