# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a municipal health management system for Cardeal da Silva, Bahia, Brazil. It aims to enhance efficiency, compliance, and data management for municipal health services by streamlining patient management, electronic prescriptions (with RENAME catalog integration), pharmacy management (medication and diaper stock control), inter-municipal patient transport (TFD) compliant with SUS regulations, Social Assistance for diaper requests, and SINAN for compulsory disease notification. The project's vision is to provide a comprehensive, integrated solution for municipal public health, improving healthcare delivery and data-driven decision-making.

## User Preferences

I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

The system employs a client-server architecture with a clear separation of concerns, utilizing modern web technologies and a modular design.

### Frontend
- **Technology**: React 18+ with TypeScript, Vite, Wouter (routing), TanStack Query v5.
- **UI/UX**: shadcn/ui and Radix UI components, styled with Tailwind CSS, including dark mode.

### Backend
- **Technology**: Express.js with TypeScript, SQLite (Better-SQLite3), Drizzle ORM.
- **Authentication**: Session-based with bcrypt for password hashing.
- **Security**: Role-Based Access Control (RBAC) with 8 roles. Multi-tenant isolation enforced via `enforceUnitScope()` middleware.
- **Core Features**:
    - **Patient Management**: Registration, demographics, health unit association.
    - **Electronic Prescriptions**: Management, Portaria 344/98 compliance, PDF export.
    - **Pharmacy Management**: RENAME catalog, medication stock (alerts, expiration), diaper stock (FIFO, lot tracking), dispensation.
    - **TFD (Inter-municipal Transport)**: Vehicle/driver/trip/passenger management, SUS compliance (Portaria SAS/MS nº 55/1999), SIGTAP integration, BPA-I/APAC TXT export, 50km minimum distance, CID-10, IBGE municipality codes.
    - **Social Assistance**: Beneficiary management, diaper request/authorization/delivery workflow, monthly list CSV upload, demand forecasting, audit logging.
    - **SINAN (Sistema de Informação de Agravos de Notificação)**: Official notification forms for 68+ compulsory diseases, epidemiological week calculation, patient demographics, clinical evolution, investigation workflow, lab exam results, export batch management.
- **Automation Modules (Isolated in `/modules/`)**:
    - **Form Automation**: Dynamic form templates (SINAN, BPA-I, APAC) with JSON schema, validation.
    - **Workflow Engine**: State machine for approval flows (e.g., Unit → Vigilância → CPD).
    - **Alert Scheduler**: Event-driven notification rules for deadlines, stock, epidemic thresholds.
    - **Strategic Reports**: ETL engine for Previne Brasil indicators, MAC production, KPIs.

### System Design Choices
- **Database**: SQLite with Drizzle ORM for type-safe data access.
- **Modularity**: Organized into distinct modules (Patient, Prescriptions, Pharmacy, TFD, Social Assistance, SINAN) with dedicated routes and services. New automation modules are isolated.
- **Validation**: Extensive use of Zod for data integrity on frontend and backend.
- **PDF Generation**: Services for compliant PDF documents (prescriptions, TFD reports, Social Assistance documents).
- **Date Input Standardization**: Manual date entry fields use DD/MM/YYYY input mask with Zod preprocessing for validation. Dates are stored as Unix timestamps (seconds since epoch) in SQLite.
- **SINAN CID-10 Auto-population**: When an agravo is selected in the SINAN notification form, the corresponding CID-10 code is automatically populated using the AGRAVO_CID_MAP mapping (45+ disease codes).
- **Multi-tenant Unit Injection**: Routes automatically inject the user's unitId from session before Zod validation to ensure proper multi-tenant isolation.

## External Dependencies

- **RENAME Catalog**: Integrated for electronic prescription medication data.
- **SUS (Sistema Único de Saúde) Regulations**: Compliance with Portaria 344/98 (prescriptions), Portaria SAS/MS nº 55/1999 (TFD), SIGTAP (TFD procedure codes).
- **DATASUS BPA System**: For exporting BPA-I and APAC data in TXT format for submission.
- **IBGE (Brazilian Institute of Geography and Statistics)**: Used for municipality codes in TFD.
- **CID-10 (International Classification of Diseases, 10th Revision)**: Used for diagnosis coding.

## SINAN Template System Architecture

### Template Type System (`shared/sinan/template-types.ts`)
- **SinanFormGroupId**: Literal union type for form group identifiers
- **SinanField**: Type-safe field definitions with validated group assignment
- **SinanFormTemplate**: Complete template interface with versioning support
- **SINAN_FORM_GROUPS**: Standardized form sections (dados_gerais, notificacao, residencia, etc.)

### Template Registry (`shared/sinan/templates/index.ts`)
- **Composite Key Strategy**: Templates keyed by `${agravoCode}__${versaoFicha}` to prevent collisions
- **CID-10 Array Lookup**: `getTemplatesByCid()` returns all matching templates when CID-10 is shared
- **Disambiguation Support**: `requiresSelection` flag indicates when user must choose from multiple templates

### Template Validation (`shared/sinan/template-validator.ts`)
- **Mandatory Group Validation**: Ensures all templates include required SINAN sections
- **Field Consistency Check**: Validates requiredFields array matches field definitions
- **sinanCode Mapping Verification**: Warns when fields lack official SINAN codification

### Registry Coverage (`shared/sinan/registry.ts`)
- **Coverage Tracking**: Links SINAN_AGRAVOS_COMPLETOS (82 agravos) with implemented templates
- **Category Statistics**: Reports template coverage by disease category
- **Build-time Assertions**: `assertFullCoverage()` logs missing template warnings

### Current Template Coverage
- **100% Coverage Achieved**: All 81 official SINAN agravos have dedicated templates (108 unique agravoCode templates, 142 total templates including variants)
- **Categories Covered**: Arboviroses, Respiratórias, IST/HIV/AIDS, Hepatites, Meningites, Zoonoses, Endêmicas, Crônicas, Imunopreveníveis, Intoxicações, Violências, Saúde do Trabalhador, Virais Emergentes, Alimentares, Vigilância, Farmacovigilância
- **Template Architecture**: Multi-template support with composite keys, CID-10 range lookups, version disambiguation