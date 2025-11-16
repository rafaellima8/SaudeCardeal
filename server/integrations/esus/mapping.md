# Mapeamento e-SUS APS - PEC Integrado Municipal

Este documento descreve o mapeamento entre as tabelas do banco de dados do PEC Integrado Municipal e os schemas de exportação e-SUS APS.

## 📋 Visão Geral

O sistema e-SUS APS (Atenção Primária à Saúde) do Ministério da Saúde exige formatos específicos para exportação de dados. Este mapeamento garante que os dados do município de Cardeal da Silva sejam exportados corretamente.

## 🗂️ Tabelas e Mapeamentos

### 1. CIDADÃO (citizens → ESUSCitizenDTO)

**Tabela de origem:** `citizens`

| Campo DB (citizens) | Campo e-SUS (ESUSCitizenDTO) | Transformação | Obrigatório |
|---------------------|------------------------------|---------------|-------------|
| `cpf` | `cpf` | Remover pontuação (apenas dígitos) | ✅ Sim |
| `cns` | `cns` | Apenas dígitos (15 caracteres) | ⚠️ Altamente recomendado |
| `name` | `name` | Sem transformação | ✅ Sim |
| `birthDate` | `birthDate` | Formato: YYYY-MM-DD | ✅ Sim |
| `gender` | `sex` | M, F, Outro → O | ✅ Sim |
| `phone` | `phone` | Remover formatação | ❌ Não |
| `email` | `email` | Sem transformação | ❌ Não |
| `address` | `address.street` | Extrair rua do campo text | ❌ Não |
| `bloodType` | `bloodType` | Sem transformação | ❌ Não |
| `allergies` | `allergies` | Array de strings | ❌ Não |
| `familyGroup` | `familyGroup` | Sem transformação | ❌ Não |
| `unitId` → `health_units.cnes` | `healthUnitCNES` | JOIN para obter CNES | ⚠️ Recomendado |

**Observações:**
- O CPF deve ter exatamente 11 dígitos (sem pontos ou hífen)
- O CNS (Cartão Nacional de Saúde) deve ter 15 dígitos
- O endereço no DB é um campo `text` único, mas o e-SUS espera estrutura com rua, número, bairro, etc.
- Será necessário parser de endereço ou campos adicionais no DB

**Código IBGE do município:** Cardeal da Silva/BA = `2906501`

---

### 2. CONSULTA (consultations → ESUSConsultationDTO)

**Tabelas de origem:** `consultations`, `citizens`, `professionals`, `health_units`

| Campo DB | Campo e-SUS | Transformação | Obrigatório |
|----------|-------------|---------------|-------------|
| `citizens.cpf` | `citizenCPF` | Remover pontuação | ✅ Sim |
| `citizens.cns` | `citizenCNS` | Apenas dígitos | ⚠️ Recomendado |
| `professionals.cns` | `professionalCNS` | Apenas dígitos (15) | ✅ Sim |
| `consultationDate` | `consultationDate` | Extrair data (YYYY-MM-DD) | ✅ Sim |
| `consultationDate` | `consultationTime` | Extrair hora (HH:MM:SS) | ❌ Não |
| `consultationDate` | `shift` | Calcular: <12h=morning, 12-18h=afternoon, >18h=night | ❌ Não |
| `health_units.cnes` | `unitCNES` | JOIN via unitId | ✅ Sim |
| `type` | `type` | Mapear para tipos e-SUS | ✅ Sim |
| `chiefComplaint` | `chiefComplaint` | Sem transformação | ❌ Não |
| `cid10` | `cid10` | Array de códigos CID-10 | ⚠️ Recomendado |
| `diagnosis` | `diagnosis` | Sem transformação | ❌ Não |
| `treatment` | `conduct` | Mapear para condutas e-SUS | ❌ Não |

**Mapeamento de tipos de consulta:**

| Tipo DB | Tipo e-SUS |
|---------|------------|
| `consulta_medica` | `consulta_medica` |
| `consulta_enfermagem` | `consulta_enfermagem` |
| `consulta_odontologica` | `consulta_odontologica` |
| `procedimento` | `procedimento` |
| `visita_domiciliar` | `visita_domiciliar` |

**Observações:**
- O turno (shift) é calculado a partir da hora da consulta
- Procedimentos realizados durante a consulta devem ser extraídos do campo `treatment` ou de uma tabela adicional
- O código INE da equipe não está no DB atual (será necessário adicionar ao `health_units` ou `professionals`)

---

### 3. PROCEDIMENTO (consultations → ESUSProcedureDTO)

**Tabelas de origem:** `consultations` (derivado), futuro: tabela `procedures`

⚠️ **IMPORTANTE:** Atualmente não existe tabela específica de procedimentos. Os procedimentos são derivados das consultas.

| Campo DB | Campo e-SUS | Transformação | Obrigatório |
|----------|-------------|---------------|-------------|
| `citizens.cpf` | `citizenCPF` | Via citizenId → JOIN | ❌ Não |
| `citizens.cns` | `citizenCNS` | Via citizenId → JOIN | ❌ Não |
| `professionals.cns` | `professionalCNS` | Via professionalId → JOIN | ✅ Sim |
| `type` | `procedureCode` | **MAPEAR** para código SIGTAP | ✅ Sim |
| N/A | `procedureName` | Lookup tabela SIGTAP | ❌ Não |
| N/A | `quantity` | Default: 1 | ✅ Sim |
| `health_units.cnes` | `unitCNES` | Via unitId → JOIN | ✅ Sim |
| `consultationDate` | `executionDate` | YYYY-MM-DD | ✅ Sim |
| `consultationDate` | `shift` | Calcular turno | ❌ Não |

**⚠️ AÇÃO NECESSÁRIA:**
- Criar mapeamento `consultation.type → código SIGTAP`
- Ou criar tabela `procedures` com código SIGTAP
- Exemplos de códigos SIGTAP:
  - `0301010072` - Consulta médica em atenção básica
  - `0301010080` - Consulta de enfermagem
  - `0301010013` - Visita domiciliar

**Tabela SIGTAP de referência:**
- [SIGTAP - Sistema de Gerenciamento da Tabela de Procedimentos](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp)

---

### 4. EXAME (exams → ESUSExamDTO)

**Tabelas de origem:** `exams`, `citizens`, `professionals`, `health_units`

| Campo DB | Campo e-SUS | Transformação | Obrigatório |
|----------|-------------|---------------|-------------|
| `citizens.cpf` | `citizenCPF` | Via citizenId → JOIN | ✅ Sim |
| `citizens.cns` | `citizenCNS` | Via citizenId → JOIN | ⚠️ Recomendado |
| `professionals.cns` | `professionalCNS` | Via professionalId → JOIN | ✅ Sim |
| `type` | `examCode` | **MAPEAR** para código SIGTAP | ✅ Sim |
| `type` | `examType` | Sem transformação | ✅ Sim |
| `requestDate` | `requestDate` | YYYY-MM-DD | ✅ Sim |
| `completionDate` | `completionDate` | YYYY-MM-DD | ❌ Não |
| `status` | `status` | Mapear status | ✅ Sim |
| `result` | `result` | Sem transformação | ❌ Não |
| `health_units.cnes` (via consultation) | `unitCNES` | Via consultationId ou professionalId | ✅ Sim |

**Mapeamento de status:**

| Status DB | Status e-SUS |
|-----------|--------------|
| `pending` | `requested` |
| `in_progress` | `collected` |
| `completed` | `completed` |
| `cancelled` | `cancelled` |

**⚠️ AÇÃO NECESSÁRIA:**
- Criar mapeamento `exam.type → código SIGTAP de exame`
- Adicionar campo `unitId` na tabela `exams` (atualmente não tem)

---

### 5. TFD (tfd_requests → ESUSTFDDTO)

**Tabelas de origem:** `tfd_requests`, `citizens`, `professionals`, `health_units`

| Campo DB | Campo e-SUS | Transformação | Obrigatório |
|----------|-------------|---------------|-------------|
| `citizens.cpf` | `citizenCPF` | Via citizenId → JOIN | ✅ Sim |
| `citizens.cns` | `citizenCNS` | Via citizenId → JOIN | ⚠️ Recomendado |
| `professionals.cns` | `professionalCNS` | Via professionalId → JOIN | ✅ Sim |
| `destination` | `destination` | Sem transformação | ✅ Sim |
| N/A | `destinationCity` | Extrair ou adicionar campo | ❌ Não |
| N/A | `destinationCityCode` | Código IBGE (lookup) | ❌ Não |
| `procedure` | `procedure` | Sem transformação | ✅ Sim |
| `procedure` | `procedureCode` | **MAPEAR** para código SIGTAP | ⚠️ Recomendado |
| `justification` | `justification` | Sem transformação | ✅ Sim |
| `requestDate` | `requestDate` | YYYY-MM-DD | ✅ Sim |
| `travelDate` | `travelDate` | YYYY-MM-DD | ❌ Não |
| `returnDate` | `returnDate` | YYYY-MM-DD | ❌ Não |
| `status` | `status` | Sem transformação (já compatível) | ✅ Sim |
| `transportType` | `transportType` | Mapear valores | ❌ Não |
| `companion` | `hasCompanion` | Boolean | ✅ Sim |
| `health_units.cnes` | `originUnitCNES` | Via unitId → JOIN | ✅ Sim |

**Mapeamento de transporte:**

| Tipo DB | Tipo e-SUS |
|---------|------------|
| `ambulancia` | `ambulance` |
| `veiculo` | `vehicle` |
| `aereo` | `air` |

---

## 🔄 JOINs Necessários

### Para ESUSCitizenDTO:
```sql
SELECT 
  c.*,
  hu.cnes AS healthUnitCNES
FROM citizens c
LEFT JOIN health_units hu ON c.unitId = hu.id
```

### Para ESUSConsultationDTO:
```sql
SELECT 
  co.*,
  ci.cpf AS citizenCPF,
  ci.cns AS citizenCNS,
  p.cns AS professionalCNS,
  hu.cnes AS unitCNES
FROM consultations co
INNER JOIN citizens ci ON co.citizenId = ci.id
INNER JOIN professionals p ON co.professionalId = p.id
INNER JOIN health_units hu ON co.unitId = hu.id
```

### Para ESUSProcedureDTO:
```sql
-- Derivado de consultations (temporário)
SELECT 
  ci.cpf AS citizenCPF,
  ci.cns AS citizenCNS,
  p.cns AS professionalCNS,
  co.type AS procedureType,
  hu.cnes AS unitCNES,
  co.consultationDate AS executionDate
FROM consultations co
INNER JOIN citizens ci ON co.citizenId = ci.id
INNER JOIN professionals p ON co.professionalId = p.id
INNER JOIN health_units hu ON co.unitId = hu.id
```

---

## ⚠️ Gaps e Ações Necessárias

### 1. Campos Faltantes no DB

| Campo e-SUS | Tabela | Ação |
|-------------|--------|------|
| `teamINE` (código INE da equipe) | `health_units` ou `professionals` | Adicionar campo |
| Endereço estruturado | `citizens` | Criar parser ou adicionar campos separados |
| Código IBGE do município | Configuração | Hardcoded: `2906501` (Cardeal da Silva/BA) |
| `unitId` em `exams` | `exams` | Adicionar referência |

### 2. Tabelas de Apoio Necessárias

- **Tabela SIGTAP local** (códigos de procedimentos)
- **Tabela de municípios IBGE** (para códigos de cidades)
- **Tabela de equipes** (INE, tipo de equipe)

### 3. Validações Críticas

- ✅ CNS de profissionais (15 dígitos) - **obrigatório para e-SUS**
- ✅ CNES de unidades (7 dígitos) - **obrigatório**
- ✅ CPF de cidadãos (11 dígitos) - **obrigatório**
- ⚠️ CNS de cidadãos - **altamente recomendado**

---

## 📦 Formato de Exportação

O e-SUS APS aceita dois formatos:

1. **JSON** (recomendado para testes)
2. **XML** (formato oficial para envio ao SISAB)

Estrutura do lote de exportação:
```json
{
  "batchId": "uuid",
  "exportDate": "2024-01-15T10:30:00",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "municipalityCode": "2906501",
  "healthUnitCNES": "1234567",
  "systemName": "PEC Integrado Municipal",
  "citizens": [...],
  "consultations": [...],
  "procedures": [...],
  "exams": [...],
  "tfdRequests": [...],
  "recordCount": {
    "citizens": 100,
    "consultations": 250,
    "procedures": 180,
    "exams": 45,
    "tfdRequests": 5
  }
}
```

---

## 🎯 Próximos Passos

1. ✅ Schemas Zod criados (`schemas.ts`)
2. ✅ Mapeamento documentado (este arquivo)
3. ⏳ Implementar funções de transformação (mappers)
4. ⏳ Criar exportadores (JSON e XML)
5. ⏳ Validar com dados reais
6. ⏳ Integrar com SISAB (envio)

---

## 📚 Referências

- [e-SUS APS - Manual PEC](http://189.28.128.100/dab/docs/portaldab/documentos/esus/Manual_PEC_5_2.pdf)
- [SIGTAP - Tabela de Procedimentos](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp)
- [Código IBGE - Cardeal da Silva/BA](https://cidades.ibge.gov.br/brasil/ba/cardeal-da-silva/panorama): `2906501`
- [DATASUS - e-SUS APS](https://aps.saude.gov.br/ape/esus)
