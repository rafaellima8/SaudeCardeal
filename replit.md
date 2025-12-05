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
- **Date Input Standardization**: Manual date entry fields use DD/MM/YYYY input mask with Zod preprocessing for validation.

## External Dependencies

- **RENAME Catalog**: Integrated for electronic prescription medication data.
- **SUS (Sistema Único de Saúde) Regulations**: Compliance with Portaria 344/98 (prescriptions), Portaria SAS/MS nº 55/1999 (TFD), SIGTAP (TFD procedure codes).
- **DATASUS BPA System**: For exporting BPA-I and APAC data in TXT format for submission.
- **IBGE (Brazilian Institute of Geography and Statistics)**: Used for municipality codes in TFD.
- **CID-10 (International Classification of Diseases, 10th Revision)**: Used for diagnosis coding.