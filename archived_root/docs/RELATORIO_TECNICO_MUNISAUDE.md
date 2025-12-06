# MuniSaude Integrado - Relatorio Tecnico Completo

**Sistema de Gestao em Saude Municipal**  
**Secretaria Municipal de Saude - Cardeal da Silva, Bahia**  
**Data: 26 de Novembro de 2025**

---

## 1. Visao Geral do Sistema

O MuniSaude Integrado e um sistema completo de gestao de saude municipal desenvolvido para atender aos requisitos do e-SUS APS v5.3, integrando prontuario eletronico, agendamento, farmacia, vigilancia endemica, TFD e inteligencia artificial medica.

### Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS |
| Roteamento | Wouter |
| Estado | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| ORM | Drizzle ORM |
| Banco de Dados | PostgreSQL (Neon) |
| IA | OpenAI GPT-5 |
| Seguranca | AES-256-GCM + bcrypt + RBAC |
| PDF | jsPDF + jspdf-autotable |

---

## 2. Modulos Implementados

### 2.1 Autenticacao e Controle de Acesso (RBAC)

- 7 perfis de usuario: admin, gestor, medico, enfermeiro, farmaceutico, acs, recepcionista, ace
- Autenticacao por sessao com bcrypt
- Multi-tenant com isolamento por unidade de saude
- Middleware `enforceUnitScope()` para seguranca de dados

### 2.2 Cadastro de Cidadaos

- CRUD completo com validacao CPF/CNS/CEP
- Criptografia AES-256-GCM para dados sensiveis (CPF, RG, CNS, email, telefone)
- Historico medico longitudinal
- Gestao de alergias e problemas ativos

### 2.3 Agendamento Profissional

- Calendario com visualizacao diaria/semanal
- Gestao de slots por profissional/unidade
- Lista de espera automatizada
- Tipos: consulta, procedimento, urgencia, retorno, triagem

### 2.4 Fila de Atendimento

- Sistema de senhas com prioridades (normal, urgente, emergencia)
- Painel de chamada com sintese de voz
- Roteamento inteligente por linhas de cuidado
- Estatisticas em tempo real

### 2.5 Atendimento Medico (SOAP)

- Workflow em 4 abas: Paciente, Consulta, Historico, Prescricoes
- Registro SOAP completo (Subjetivo, Objetivo, Avaliacao, Plano)
- Sinais vitais com validacao de faixas normais
- Codigos CIAP-2 e CID-10 integrados
- Formularios dinamicos configuraveis

### 2.6 Prescricoes Eletronicas

**Catalogo RENAME (29 medicamentos):**
- Medicamentos essenciais da Atencao Basica
- Portaria 344/98 para controlados
- Deteccao de conflitos de alergia
- Calculo de doses pediatricas
- Validacao de interacoes medicamentosas

**Funcionalidades:**
- QR Code para validacao
- Assinatura digital
- Exportacao PDF profissional

### 2.7 Encaminhamentos Medicos

- 10 especialidades configuradas
- Regras de encaminhamento por especialidade
- Workflow de status: pending → approved → scheduled → completed
- Contra-referencia integrada
- Integracao com fila de especialidades

### 2.8 Solicitacao de Exames

**Catalogo SIGTAP (25+ codigos):**
- Hemograma, glicemia, lipidograma, funcao renal, funcao hepatica
- Sorologias, urina, hormonios tireoidianos
- Imagem (RX, USG, ECG)

**Workflow Completo:**
- requested → scheduled → collected → result_available → completed
- Anexo de resultados
- Notificacao ao paciente
- Historico por cidadao

### 2.9 Farmacia

**Gestao de Estoque:**
- Entrada, saida, ajuste de medicamentos
- Alertas de estoque baixo
- Controle de validade
- Rastreabilidade de lotes

**Dispensacao:**
- Busca de prescricoes ativas
- Validacao de estoque
- Registro de dispensacao

### 2.10 TFD (Tratamento Fora do Domicilio)

**Solicitacoes:**
- CRUD completo
- Workflow: pending → approved/rejected → scheduled → in_transit → completed
- Destinos configuraveis

**Frota:**
- Cadastro de veiculos
- Cadastro de motoristas
- Viagens com passageiros
- Rastreamento de status

### 2.11 Vigilancia Endemica (ACE)

**Ciclos de Trabalho:**
- CRUD de ciclos por unidade
- Programacao de visitas

**FAD (Ficha de Avaliacao de Depositos):**
- Registro de avaliacoes
- Tipos de depositos (A1, A2, B, C, D, E)
- Contagem de depositos positivos

**Focos Vetoriais:**
- Registro geolocalizado
- Status: active → treated → eliminated
- Tratamentos aplicados

**Estatisticas LIRAa:**
- Dashboard com indicadores
- IIP, IB por ciclo/unidade

### 2.12 Gestao Territorial

**Imoveis:**
- Cadastro de domicilios
- Tipo: casa, apartamento, comercio, terreno, etc.
- Situacao: ocupado, desocupado, abandonado

**Familias:**
- Cadastro de familias por domicilio
- Membros com parentesco
- Transferencia entre familias

**Visitas Domiciliares:**
- Registro de visitas ACS
- Questionarios estruturados
- Historico por domicilio

### 2.13 Protocolos Clinicos e Alertas

**18 Protocolos Padrao:**
- Hipertensao (3 niveis de gravidade)
- Diabetes (hipoglicemia, hiperglicemia, meta glicemica)
- Gestacao (pre-eclampsia, diabetes gestacional)
- Tuberculose (sintomatico respiratorio, contato)
- Pediatria (febre em lactente, desidratacao)
- Sinais vitais (bradicardia, taquicardia, hipoxia, hipotermia, febre)
- Obesidade morbida

**Funcionalidades:**
- Disparo automatico durante consulta
- Niveis: info, warning, critical
- Acknowledge/dismiss/resolve
- Estatisticas por unidade/cidadao

### 2.14 Assistente Medico com IA

**Endpoints:**
- `/api/ai/diagnose` - Sugestoes de diagnostico (CIAP-2/CID-10)
- `/api/ai/check-interactions` - Verificacao de interacoes medicamentosas
- `/api/ai/validate-prescription` - Validacao de prescricoes
- `/api/ai/generate-plan` - Geracao de planos de cuidado

**Seguranca:**
- Rate limiting por usuario/IP
- Audit log de todas as interacoes
- Disclaimers obrigatorios
- Restrito a perfis clinicos (medico, enfermeiro)

### 2.15 Exportacao e-SUS

- Mapeamento para Ficha de Atendimento Individual (FAI)
- Validacao de campos obrigatorios
- Download de arquivos exportados
- Historico de exportacoes

### 2.16 Relatorios e Indicadores

- Dashboard com metricas consolidadas
- Graficos com Recharts
- Exportacao PDF profissional
- Filtros por periodo/unidade

---

## 3. Arquitetura de Seguranca

### 3.1 Multi-Tenant

```typescript
// Middleware de escopo por unidade
enforceUnitScope(): Express middleware
getEffectiveUnitId(): Retorna unitId ou null (admin/gestor)
validateEntityAccess(): Valida acesso a entidade especifica
```

**Roles com acesso cross-unit:** admin, gestor

### 3.2 Criptografia

```typescript
// Servico de criptografia
encryptField(text: string): string  // AES-256-GCM
decryptField(encrypted: string): string
```

**Campos criptografados:** CPF, RG, CNS, email, telefone

### 3.3 Validacao de Documentos

```typescript
validateCPF(cpf: string): boolean
validateCNS(cns: string): boolean
validateCEP(cep: string): boolean
```

---

## 4. Estrutura de Paginas (Frontend)

| Rota | Componente | Descricao |
|------|------------|-----------|
| `/` | Dashboard | Painel principal com metricas |
| `/recepcao` | Reception | Recepcao e check-in |
| `/pacientes` | Patients | Listagem de cidadaos |
| `/pacientes/:id` | PatientDetail | Detalhes do paciente |
| `/agendamentos` | Appointments | Gestao de agendamentos |
| `/fila-atendimento` | AttendanceQueue | Fila e painel de chamada |
| `/atendimento-medico/:id` | MedicalAttendance | Atendimento SOAP completo |
| `/atendimentos` | Consultations | Historico de consultas |
| `/prescricoes` | Prescriptions | Gestao de prescricoes |
| `/farmacia` | Pharmacy | Dashboard farmacia |
| `/farmacia/dispensacao` | PharmacyDispensation | Dispensacao |
| `/farmacia/estoque` | PharmacyStock | Estoque |
| `/tfd` | TFD | Tratamento Fora Domicilio |
| `/relatorios` | Reports | Relatorios consolidados |
| `/indicadores` | Indicators | Indicadores de saude |
| `/territorio` | TerritoryPage | Gestao territorial |
| `/ace` | AceDashboard | Painel ACE |
| `/ace/imoveis` | AceDwellings | Imoveis |
| `/ace/visitas` | AceVisits | Visitas domiciliares |
| `/ace/focos` | AceFoci | Focos vetoriais |
| `/endemias` | EndemicDashboard | Vigilancia endemica |
| `/admin/esus-exports` | EsusExports | Exportacoes e-SUS |
| `/admin/protocolos-clinicos` | ClinicalProtocols | Protocolos clinicos |
| `/admin/formularios-dinamicos` | DynamicFormsAdmin | Formularios dinamicos |
| `/admin/agenda-config` | ScheduleConfig | Configuracao de agenda |

---

## 5. Endpoints API (Resumo)

### Autenticacao
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Cidadaos
- `GET/POST /api/citizens`
- `GET/PATCH/DELETE /api/citizens/:id`
- `GET /api/citizens/:id/medical-history`
- `GET/POST /api/citizens/:citizenId/allergies`

### Consultas
- `GET/POST /api/consultations`
- `GET/PATCH/DELETE /api/consultations/:id`
- `POST /api/consultations/:id/finalize`
- `GET /api/consultations/:id/print-prescription`

### Prescricoes
- `GET /api/prescriptions`
- `PATCH/DELETE /api/prescriptions/:id`
- `POST /api/prescriptions/validate`
- `GET /api/prescriptions/:id/qrcode`

### Encaminhamentos
- `GET/POST /api/medical-referrals`
- `GET/PATCH/DELETE /api/medical-referrals/:id`
- `POST /api/medical-referrals/:id/add-to-queue`

### Exames
- `GET/POST /api/exams`
- `GET/PATCH/DELETE /api/exams/:id`
- `PATCH /api/exams/:id/schedule`
- `PATCH /api/exams/:id/collect`
- `PATCH /api/exams/:id/result`
- `PATCH /api/exams/:id/complete`

### Farmacia
- `GET/POST /api/pharmacy/stock`
- `GET /api/pharmacy/stock/low`
- `GET /api/pharmacy/stock/expiring`
- `POST /api/pharmacy/dispense`
- `GET/POST /api/pharmacy/stock-movements`

### TFD
- `GET/POST /api/tfd`
- `GET/PATCH/DELETE /api/tfd/:id`
- `POST /api/tfd/:id/approve`
- `POST /api/tfd/:id/schedule`
- `POST /api/tfd/:id/complete`
- `GET/POST /api/tfd-vehicles`
- `GET/POST /api/tfd-drivers`
- `GET /api/tfd-trips`

### Endemias
- `GET/POST /api/endemic/cycles`
- `GET/POST /api/endemic/fad-evaluations`
- `GET/POST /api/endemic/foci`
- `GET/POST /api/endemic/treatments`
- `GET /api/endemic/stats`

### Protocolos e Alertas
- `GET/POST /api/protocols`
- `GET/PATCH/DELETE /api/protocols/:id`
- `POST /api/alerts/evaluate/:consultationId`
- `GET /api/alerts/consultation/:consultationId`
- `PATCH /api/alerts/:id/acknowledge`
- `PATCH /api/alerts/:id/resolve`

### IA Medica
- `POST /api/ai/diagnose`
- `POST /api/ai/check-interactions`
- `POST /api/ai/validate-prescription`
- `POST /api/ai/generate-plan`

### Fila
- `GET /api/queue/:unitId`
- `POST /api/queue`
- `PATCH /api/queue/:id/status`
- `GET /api/queue/stats`

---

## 6. Seeds e Dados Iniciais

### Executados na Inicializacao

1. **seedMinimal** - Usuario admin e unidade padrao
2. **seedSIGTAPMappings** - 25 codigos SIGTAP
3. **seedSpecialtiesAndRules** - 10 especialidades + regras
4. **seedRENAMECatalog** - 29 medicamentos RENAME
5. **seedProtocols** - 18 protocolos clinicos

---

## 7. Servicos Backend

| Servico | Funcao |
|---------|--------|
| `encryptionService.ts` | Criptografia AES-256-GCM |
| `documentValidationService.ts` | Validacao CPF/CNS/CEP |
| `examValidationService.ts` | Validacao clinica de exames |
| `clinicalJourneyService.ts` | Orquestracao de jornada clinica |
| `protocol-alert-drizzle.service.ts` | Alertas de protocolos clinicos |
| `digitalSignatureService.ts` | Assinaturas digitais |
| `notificationService.ts` | Notificacoes push |
| `prescriptionValidationService.ts` | Validacao de prescricoes RENAME |
| `medical-ai.ts` | Integracao OpenAI GPT-5 |
| `ai-audit.ts` | Auditoria de uso de IA |
| `esusExportService.ts` | Exportacao e-SUS AB |
| `ciap2Cid10Service.ts` | Busca CIAP-2/CID-10 |

---

## 8. Componentes UI Principais

| Componente | Funcao |
|------------|--------|
| `ai-assistant-panel.tsx` | Painel de IA medica |
| `clinical-alerts-panel.tsx` | Painel de alertas clinicos |
| `queue-panel.tsx` | Painel de fila com chamada |
| `medical-history-dialog.tsx` | Dialog de historico medico |
| `prescription-form.tsx` | Formulario de prescricao |
| `referral-form.tsx` | Formulario de encaminhamento |
| `exam-request-form.tsx` | Formulario de exames |
| `vital-signs-form.tsx` | Formulario de sinais vitais |

---

## 9. Status de Conformidade

| Requisito | Status |
|-----------|--------|
| e-SUS APS v5.3 | Conforme |
| LGPD (Criptografia) | Conforme |
| Portaria 344/98 | Conforme |
| Multi-tenant Security | Conforme |
| RBAC (7 perfis) | Conforme |
| Auditoria de Acessos | Conforme |
| Assinatura Digital | Conforme |

---

## 10. Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | admin@saude.gov.br | Admin@2025 |
| Agente Comunitario | acs@saude.gov.br | Acs@2025 |

---

## 11. Comandos de Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Sincronizar schema do banco
npm run db:push

# Executar seeds
npm run seed
```

---

## 12. Estrutura de Diretorios

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui
│   │   │   └── ...              # Componentes do sistema
│   │   ├── pages/               # Paginas da aplicacao
│   │   ├── hooks/               # React hooks customizados
│   │   └── lib/                 # Utilitarios
│   └── index.html
├── server/
│   ├── services/                # Servicos de negocio
│   ├── seeds/                   # Seeds do banco
│   ├── routes.ts                # Rotas principais
│   ├── routes-ai.ts             # Rotas de IA
│   ├── routes-alerts.ts         # Rotas de alertas
│   ├── storage.ts               # Camada de persistencia
│   ├── auth.ts                  # Autenticacao e RBAC
│   └── db.ts                    # Configuracao Drizzle
├── shared/
│   └── schema.ts                # Schema do banco (Drizzle)
└── replit.md                    # Documentacao do projeto
```

---

**Desenvolvido para a Secretaria Municipal de Saude de Cardeal da Silva - Bahia**

*Sistema em conformidade com os padroes do Ministerio da Saude para a Estrategia e-SUS Atencao Primaria a Saude*
