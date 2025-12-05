# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a municipal health management system designed for Cardeal da Silva, Bahia, Brazil. Its purpose is to streamline core healthcare functionalities: patient management, electronic prescriptions (with RENAME catalog integration), pharmacy management (including stock control for medications and diapers), inter-municipal patient transport (TFD - Tratamento Fora do Domicílio) compliant with SUS regulations, Social Assistance for diaper requests and deliveries, and SINAN for compulsory disease notification. The system aims to enhance efficiency, compliance, and data management for municipal health services.

## User Preferences

I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

The system follows a client-server architecture with a clear separation of concerns.

### Frontend
- **Technology Stack**: React 18+ with TypeScript, Vite (build system), Wouter (routing), TanStack Query v5 (server state management).
- **UI/UX**: Utilizes shadcn/ui and Radix UI components, styled with Tailwind CSS, including dark mode support.

### Backend
- **Technology Stack**: Express.js with TypeScript, SQLite database (Better-SQLite3), Drizzle ORM for database interactions.
- **Authentication**: Session-based authentication using bcrypt for password hashing.
- **Security**: Role-Based Access Control (RBAC) with 8 distinct user roles (admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao, assistencia_social). Multi-tenant isolation is enforced via `enforceUnitScope()` middleware, with cross-unit access limited to admin and gestor roles.
- **Core Features Implemented**:
    - **Patient Management**: Citizen registration, demographic data, health unit association.
    - **Electronic Prescriptions**: Prescription management, Portaria 344/98 compliance, dosage calculations, PDF export.
    - **Pharmacy Management**: RENAME catalog integration, medication stock control (low stock alerts, expiration tracking), diaper stock control (FIFO, lot tracking for 10 sizes), dispensation linked to prescriptions.
    - **TFD (Inter-municipal Transport)**: Vehicle, driver, trip, and passenger management. Includes SUS compliance (Portaria SAS/MS nº 55/1999), SIGTAP TFD catalog integration, BPA-I and APAC TXT export for SIA/SUS submission, 50km minimum distance enforcement, CID-10 diagnosis, IBGE municipality codes, and APAC authorization tracking. Features companion data collection and pernoite (overnight stay) tracking.
    - **Social Assistance**: Beneficiary management, diaper request/authorization workflow, delivery management (FIFO stock allocation), monthly list CSV upload for batch processing, demand forecasting, integration with Pharmacy diaper stock, and full audit logging.
    - **SINAN (Sistema de Informação de Agravos de Notificação)**: Official notification forms for 36 compulsory diseases, epidemiological week calculation, patient demographic data (SUS fields), clinical evolution and hospitalization tracking, classification criteria, investigation workflow, lab exam results integration, and export batch management for SUS submission. All endpoints use Zod validation.

### Automation Modules (NEW - Dec 2025)
Isolated modular architecture in `/modules/` directory:
- **Form Automation** (`/api/forms/*`): Dynamic form templates for SINAN, BPA-I, APAC with JSON schema, field validation, and mapping to SUS systems.
- **Workflow Engine** (`/api/workflow/*`): State machine for approval flows (Unit → Vigilância → CPD chain), with auto-approval timers and role-based transitions.
- **Alert Scheduler** (`/api/alerts/*`): Event-driven notification rules for deadlines (prazos), pendências, stock alerts, epidemic thresholds, and edital monitoring.
- **Strategic Reports** (`/api/strategic-reports/*`): ETL engine for Previne Brasil indicators, MAC production, AIH checklist, vigilância epidemiológica, and financial KPIs.

### System Design Choices
- **Database**: SQLite for simplicity and embedded use, managed by Drizzle ORM for type-safe and efficient data access.
- **Modularity**: The system is organized into distinct modules (Patient, Prescriptions, Pharmacy, TFD, Social Assistance, SINAN), each with its own routes and services. New automation modules are isolated in `/modules/` directory with dedicated route namespaces.
- **Validation**: Extensive use of Zod for data validation on both frontend and backend to ensure data integrity and compliance.
- **PDF Generation**: Dedicated services for generating compliant PDF documents for prescriptions, TFD reports (BPA-I, APAC), and Social Assistance documents (authorizations, donation terms, delivery receipts).

## Database Schema (Key Tables)

### Core Tables (31 existing)
- healthUnits, users, professionals, citizens
- medications, prescriptions, dispensations, medicationStock, stockMovements, renameCatalog, citizenAllergies
- tfdVehicles, tfdDrivers, tfdTrips, tfdRequests, tfdTripPassengers, sigtapTfdCatalog
- diaperStock, diaperStockMovements
- saBeneficiaries, diaperRequests, diaperAuthorizations, diaperDeliveries, diaperMonthlyLists, diaperDemandForecast, saAuditLog
- sinanNotifications, sinanLabExams, sinanExportBatches
- notifications, documentSignatures

### Automation Tables (13 new)
- formTemplates, formSubmissions
- workflowDefinitions, workflowInstances, workflowActions
- alertRules, alertInstances, alertDeliveries
- editais
- reportDefinitions, reportExecutions
- systemAuditLog

## API Endpoints

### Automation Module APIs
- `GET /api/forms/templates` - List form templates (SINAN, BPA, APAC)
- `GET /api/forms/templates/:slug` - Get template definition
- `POST /api/forms/validate` - Validate form payload
- `GET /api/workflow/definitions` - List workflow definitions
- `GET /api/workflow/available-actions` - Get available actions for status/role
- `POST /api/workflow/validate-transition` - Validate workflow transition
- `GET /api/alerts/rules` - List alert rules
- `GET /api/alerts/active` - Get active alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/alerts/:id/resolve` - Resolve alert
- `GET /api/strategic-reports/definitions` - List report definitions
- `POST /api/strategic-reports/execute/:slug` - Execute report

## External Dependencies

- **RENAME Catalog**: Integrated for electronic prescription medication data.
- **SUS (Sistema Único de Saúde) Regulations**: Compliance with various SUS regulations and ordinances, including Portaria 344/98 (prescriptions), Portaria SAS/MS nº 55/1999 (TFD), and SIGTAP (TFD procedure codes).
- **DATASUS BPA System**: For exporting BPA-I and APAC data in TXT format for submission, and for generating printable PDF forms to be manually entered into the system.
- **IBGE (Brazilian Institute of Geography and Statistics)**: Used for municipality codes in TFD.
- **CID-10 (International Classification of Diseases, 10th Revision)**: Used for diagnosis coding.

## Recent Changes (Dec 2025)

- Added 13 new database tables for automation modules in `shared/schema.ts`
- Created `/modules/forms/` with form-engine.ts and routes.ts for dynamic form templates
- Created `/modules/workflow/` with workflow-engine.ts and routes.ts for approval flows
- Created `/modules/alerts/` with alert-scheduler.ts and routes.ts for intelligent notifications
- Created `/modules/reports/` with strategic-reports.ts and routes.ts for KPI dashboards
- Integrated all module routes into server/routes.ts with namespace isolation

### SINAN Templates Expansion (Dec 2025)
- **68+ Official SINAN Forms**: Comprehensive coverage of compulsory disease notification forms
- **New Diseases Added**: Mpox, SRAG (Síndrome Respiratória Aguda Grave), HIV/AIDS em Criança, Esquistossomose, Botulismo, Difteria, Febre Tifoide, Febre do Nilo Ocidental, Febre Maculosa, Hantavirose
- **13 Disease Categories**: arboviroses, respiratorias, ist, hepatites, meningites, zoonoses, endemicas, cronicas, intoxicacoes, violencias, trabalho, virais (emergentes), alimentares
- **Template Structure**: Each form includes CAMPOS_NOTIFICACAO_BASE, CAMPOS_PACIENTE_BASE, CAMPOS_RESIDENCIA_BASE + disease-specific clinical fields
- **Field Metadata**: Complete field definitions with coordinates (x,y), validation rules, masks, CID-10 mapping
- **Helper Functions**: getAgravoByCode, getAgravosByCat, getAllAgravos, getAgravosImediatos, buildSinanTemplate

### Frontend Automation Pages (Dec 2025)
- **Forms Page** (`/formularios`): Lists 68+ form templates (SINAN forms + BPA-I + APAC), with field preview and validation
- **Workflow Page** (`/workflows`): Shows 4 built-in workflows (SINAN, TFD, Prescription, Diaper), status management
- **Alerts Page** (`/alertas`): Displays 10 alert rules across 4 categories with severity filtering and acknowledge/resolve actions
- **Strategic Reports Page** (`/relatorios-estrategicos`): Catalog of 8 reports across 4 categories with export formats

### Backend Module Architecture (Dec 2025)
- Modules use class inheritance pattern: `Extended*Engine extends *Engine` to preserve prototype methods
- Built-in data arrays: `SINAN_TEMPLATES`, `WORKFLOW_DEFINITIONS`, `DEFAULT_ALERTS`, `STRATEGIC_REPORTS`
- Helper methods added: `getTemplateBySlug`, `getWorkflowBySlug`, `getAlertBySlug`, `getReportsByCategory`, `getAllCategories`

### Sidebar Reorganization (Dec 2025)
- Collapsible "Farmácia" group using shadcn Collapsible component with sub-navigation:
  - Prescrições, Dispensação, Estoque de Medicamentos, Fraldas
- Permission-based conditional rendering (farmaciaItems.length > 0 guard)
- Active state highlighting for parent and child items

### Reports API (Dec 2025)
- `getReports()` returns complete ReportData structure with period metadata
- Summary metrics: totalPatients, newPatients, totalConsultations, totalPrescriptions, totalExams, tfdRequests, sinanNotifications
- Breakdowns: consultationsByType, topDiagnoses, medicationUsage, ageDistribution
- Empty array handling when no data exists

### Permission System (Dec 2025)
- Added missing permission keys: sinan, formularios, workflows, alertas, relatorios_estrategicos
- `filterMenuByRole` normalizes titles to lowercase without accents for matching
- Console warnings eliminated for missing permission keys

### Test Infrastructure (Dec 2025)
- **Vitest Configuration**: `vitest.config.ts` with jsdom environment for frontend tests
- **Unit Tests** (64 passing): 
  - `tests/unit/form-engine.test.ts`: SINAN templates, BPA/APAC structure, field validation
  - `tests/unit/workflow-engine.test.ts`: Workflow definitions, steps, transitions, role-based actions
  - `tests/unit/alert-scheduler.test.ts`: Alert rules, categories, severities, notification channels
  - `tests/unit/strategic-reports.test.ts`: Report definitions, KPIs, export formats, categories
- **API Integration Tests**: `tests/api/automation.test.ts` with endpoint coverage for all automation modules

### Multi-Tenant Security Hardening (Dec 2025)
- **enforceUnitScope middleware**: Added to all automation module routes (alerts, workflow, reports)
- **Data isolation**: Automation endpoints with mock data now return empty arrays until storage-backed persistence is implemented
- **CSV Validation**: New endpoint `/api/social-assistance/csv/validate` with format and content validation (CPF, NIS, sizes)
- **validateCsvFormat function**: Validates required columns (nome/tamanho/quantidade) before parsing
- **Security decision**: Mock data endpoints disabled to prevent cross-tenant data leakage until real persistence is ready

### Automation Storage Integration (Dec 2025)
- **Storage-backed persistence**: All automation endpoints now use storage methods with unit-scoped filtering
- **Schema alignment**: Routes use correct database field names (status, actionBy, acknowledgedAt, resolvedAt)
- **Multi-tenant isolation**: enforceUnitScope middleware applied to all instance-bearing endpoints
- **Idempotent seeds**: Automation seeds check for existing records before insertion

### Re-enabled Endpoints (Dec 2025)
All automation endpoints now use real persistence with unit-scoped queries:
- **Alerts**: POST /api/alerts/:id/acknowledge, /resolve, /dismiss → storage.updateAlertInstance
- **Alerts Data**: GET /api/alerts/active, /all → storage.getAlertInstances with unitId filter
- **Workflows**: POST /api/workflow/instances → storage.createWorkflowInstance
- **Workflows Data**: GET /api/workflow/instances → storage.getWorkflowInstances with unitId filter
- **Reports**: POST /api/strategic-reports/execute/:slug → storage.createReportExecution + data generation
- **Reports Data**: GET /api/strategic-reports/executions → storage.getReportExecutions with unitId filter

### Known Limitations (Dec 2025)
- **Tables with seeds**: formTemplates (35), workflowDefinitions (4), alertRules (6), reportDefinitions (8) - seeded via server/seed-automation.ts
- **Pending implementation**: Real-time alert generation from stock levels, SINAN deadlines, and TFD pendencies