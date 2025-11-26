# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed to integrate and optimize primary healthcare services for Cardeal da Silva, Bahia, Brazil. It encompasses electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all compliant with e-SUS APS standards. The system supports diverse user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React 18+, TypeScript, Vite, and Wouter for routing. UI components leverage shadcn/ui and Radix UI, styled with Tailwind CSS, adhering to Material Design 3, and includes dark mode support. Typography uses Inter and JetBrains Mono. Components are designed for accessibility. Dashboards feature summary cards, tables, and Recharts graphs. Professional PDF exports are styled with institutional branding, dynamic logos, and semantic color palettes.

### Technical Implementations

The backend uses Express.js and TypeScript on Node.js, providing a RESTful API with JSON responses. SQLite (Better-SQLite3) is the database, managed with Drizzle ORM. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) for 7 user roles. State management uses TanStack Query v5 for server state and React hooks for local state.

### Multi-Tenant Security Architecture

**Core Infrastructure (server/auth.ts):**
- `CROSS_UNIT_ROLES`: Array defining roles with cross-unit access (admin, gestor)
- `enforceUnitScope()`: Express middleware enforcing tenant isolation on protected routes
- `getEffectiveUnitId()`: Helper returning appropriate unitId (null for cross-unit roles, session unitId for others)
- `validateEntityAccess()`: Entity-level validation checking if entity's unitId matches session scope

**Security Pattern Applied:**
1. GET endpoints: `enforceUnitScope()` + `getEffectiveUnitId()` for query filtering
2. GET detail: `enforceUnitScope()` + `validateEntityAccess()` for entity validation  
3. POST mutations: `enforceUnitScope()` + unitId injection from session
4. PATCH/DELETE: `enforceUnitScope()` + `validateEntityAccess()` before modification

**Protected API Endpoints:**
- Citizens (CRUD): Full multi-tenant isolation
- Appointments (CRUD): Full multi-tenant isolation
- Consultations (CRUD): Full multi-tenant isolation + protocol alerts
- Prescriptions (CRUD): Full multi-tenant isolation
- Medical Referrals (CRUD): Full multi-tenant isolation with status workflow
- Exams (CRUD): Full multi-tenant isolation
- TFD Requests (CRUD): Full multi-tenant isolation via originUnitId
- Pharmacy (dispense, stock-movements, dispensations): Full multi-tenant isolation
- Endemic Control (cycles, FAD evaluations, foci, treatments, stats): Full multi-tenant isolation via cycle.unitId hierarchy
- Dashboard/Reports: Query-level tenant scoping

### Feature Specifications

-   **Territorial Management**: CRUD for Dwellings, Home Visits, and Family Hierarchy.
-   **Endemic Disease Surveillance (ACE)**: Full-stack module for ACE, including geolocated vector foci registration and auditing.
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export and customizable filters.
-   **Appointment Scheduling**: Complete scheduling and queue management with calendar views.
-   **Electronic Prescriptions**: Prescription management with transactional integrity, digital signatures, robust PDF export, RENAME catalog integration (29+ medications), Portaria 344/98 controlled substance tracking, allergy conflict detection, and pediatric dosing support.
-   **Medical Referrals**: Production-ready referral system with multi-tenant security, destination/priority tracking, and status workflow.
-   **AI Medical Assistant**: AI assistant powered by OpenAI GPT-5 for diagnostic suggestions (CIAP-2/CID-10), drug interaction checks, prescription validation, and care plan generation.
-   **SOAP Consultation System**: Medical consultations adhering to e-SUS PEC v5.3 standards, including vital signs, CIAP-2/CID-10 codes, and integrated prescription management.
-   **Medical Attendance Module**: A 4-tab workflow integrating patient selection, SOAP consultation, electronic prescriptions, medical referrals, exam requests, and clinical history visualization, with multi-tenant security and cache synchronization.
-   **Exams & Procedures Management**: CRUD system for laboratory exam and procedure requests integrated into medical consultations, with SIGTAP integration, clinical validation, and multi-tenant security. Complete workflow states (requested→scheduled→collected→result_available→completed), justification requirements, result attachments, and patient notifications.
-   **Medical History Visualization**: Comprehensive patient longitudinal record displaying clinical timeline, active problems, prescriptions, referrals, and exam requests.
-   **Medical Document Generation (PDF)**: Backend-based PDF generation for official medical documents like prescriptions and medical certificates, with institutional branding and multi-tenant security.
-   **e-SUS AB/SISAB Export Module**: Data export system for DATASUS compliance, mapping consultations to Ficha de Atendimento Individual (FAI) format with validation.
-   **Care-Line Queue System**: Specialty-specific intelligent queue management for referrals and triagem, with multi-tenant security.
-   **Clinical Protocol Alerts**: Automated clinical decision support with real-time alert triggering, transactional consistency, and integration into consultation workflows.
-   **Pharmacy Management**: Dispensation system with patient search, prescription listing, and validation. Stock management for entry/exit/adjustment movements and low stock alerts.
-   **Admin Configuration**: Interfaces for managing clinical protocols and dynamic consultation forms.
-   **Medical Certificates**: Template-based certificate generation with digital signatures and PDF export.
-   **Queue Panel**: Real-time queue management with ticket calling system and speech synthesis for patient announcements.
-   **Encryption Service**: AES-256-GCM encryption for sensitive citizen data (CPF, RG, CNS, email, phone).

### Backend Services (server/services/)

-   **encryptionService.ts**: AES-256-GCM encryption with environment-specific keys for LGPD compliance.
-   **documentValidationService.ts**: CPF/CNS/CEP validation using Brazilian standard algorithms.
-   **examValidationService.ts**: Clinical exam validation with SIGTAP integration and specialty-specific rules.
-   **clinicalJourneyService.ts**: Full clinical pathway orchestration with digital signatures and protocol alerts.
-   **protocol-alert-drizzle.service.ts**: Consolidated protocol alert service with Drizzle ORM integration (canonical service).
-   **protocolAlertService.ts**: In-memory alert evaluation engine with condition matching.
-   **digitalSignatureService.ts**: Digital signature generation and validation for medical documents.
-   **notificationService.ts**: Push notifications for pharmacy, queue, and clinical alerts.
-   **prescriptionValidationService.ts**: RENAME catalog search, allergy conflict detection, drug interaction validation, pediatric dose calculations, and Portaria 344/98 controlled substance verification.
-   **medical-ai.ts**: OpenAI GPT-5 integration for diagnostic suggestions, drug interactions, and care plans.
-   **ai-audit.ts**: Audit logging for all AI interactions with compliance tracking.

## External Dependencies

### Third-Party Services

-   **Database**: SQLite (local) and PostgreSQL (primary).
-   **AI**: OpenAI GPT-5 (via Replit AI Integrations).
-   **e-SUS APS Integration**: Export module for compliance with Brazilian national healthcare standards.

### Key NPM Packages

-   **UI & Interaction**: `@radix-ui/*`, `recharts`, `cmdk`, `date-fns`/`dayjs`, `lucide-react`.
-   **Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
-   **Styling**: `tailwindcss`, `tailwind-merge`, `class-variance-authority`, `clsx`.
-   **Build & Development**: `vite`, `tsx`, `esbuild`, `vitest`, `drizzle-kit`.
-   **PDF Export**: `jsPDF` and `jspdf-autotable`.

### Browser APIs & Fonts

-   **Google Fonts**: Inter (UI font), JetBrains Mono (monospace font).