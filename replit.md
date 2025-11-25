# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed to integrate and optimize primary healthcare services for Cardeal da Silva, Bahia, Brazil. It encompasses electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all compliant with e-SUS APS standards. The system supports diverse user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18+, TypeScript, Vite, and Wouter for routing. State management uses TanStack Query v5 for server state and React hooks for local state. UI components leverage shadcn/ui and Radix UI, styled with Tailwind CSS (including dark mode), adhering to Material Design 3. Data visualization for dashboards is handled by Recharts. The system features a modern UI with dark mode support, using Inter for typography and JetBrains Mono for code. Components are designed for accessibility. Dashboards include summary cards, tables, and Recharts graphs. Professional PDF exports are styled with institutional branding, including dynamic logos and semantic color palettes for various states.

### Backend

The backend uses Express.js and TypeScript on Node.js, providing a RESTful API with JSON responses. SQLite (Better-SQLite3) is the database, managed with Drizzle ORM using query builder patterns. All queries are strongly typed and use parameterized statements for security. API endpoints cover core healthcare entities and administrative functions. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) for 7 user roles. Multi-tenancy security is implemented at route, storage, and schema layers to ensure data isolation per health unit.

### Feature Specifications

#### Core Features

-   **Territorial Management**: Comprehensive CRUD for Dwellings, Home Visits, and a complete Family Hierarchy System.
-   **Endemic Disease Surveillance (ACE)**: Full-stack module for ACE, including CRUD for dwellings, home visits with vital signs, geolocated vector foci registration, and an auditing system.
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export and customizable filters.
-   **Appointment Scheduling**: Complete scheduling and queue management with calendar views.
-   **Electronic Prescriptions**: Prescription management with transactional integrity and robust PDF export, fully integrated into the medical attendance workflow.
-   **Medical Referrals**: Production-ready referral system for specialized care with comprehensive security. Features include:
    -   **Multi-tenant Security**: All endpoints validate `req.session.user.unitId` to ensure data isolation per health unit. Consultation ownership verified before creating/accessing referrals.
    -   **Destination & Priority Tracking**: Supports multiple destinations (UPA, CAPS, Hospital Regional, specialties) with priority levels (normal/urgent/emergency).
    -   **Status Workflow**: Enforced state machine (pending → scheduled → in_progress → completed; cancellation allowed at any stage). Final states (completed/cancelled) are immutable.
    -   **Backend Validation**: Server-controlled `referralDate` and `status` fields. Client sends only allowed fields (destination, specialty, reason, priority, observations). All metadata (citizenId, professionalId, unitId) derived from consultation.
    -   **Frontend Integration**: Complete UI in medical-attendance.tsx with ReferralForm component, TanStack Query mutations/queries, and real-time cache synchronization.
    -   **Known Limitations**: Storage layer lacks internal multi-tenant guards (applies to all entities, not specific to referrals). Future enhancement: Add unitId validation inside storage methods system-wide.
-   **AI Medical Assistant**: A production-ready AI assistant powered by OpenAI GPT-5 for diagnostic suggestions (CIAP-2/CID-10), drug interaction checks, prescription validation, and care plan generation, with robust validation and RBAC-controlled access.
-   **SOAP Consultation System**: Full-stack implementation of medical consultations adhering to e-SUS PEC v5.3 standards, including subjective, objective, assessment, and plan (SOAP) fields, vital signs, CIAP-2/CID-10 codes, and integrated prescription management.
-   **Medical Attendance Module**: Complete 4-tab workflow integrating patient selection, SOAP consultation form with vital signs and diagnostic codes, electronic prescriptions, medical referrals, exam requests, and comprehensive clinical history visualization. Fully integrated with proper consultation/professional context, cache synchronization, and transactional integrity.
    -   **Complete API Endpoints**: Full CRUD for consultations, prescriptions, referrals, exams, and attendance queue management:
        -   `GET /api/attendance-queue` - List filtered attendance queue (by unit/professional/status) with multi-tenant security
        -   `GET /api/attendance/next` - Fetch next patient in queue (priority-ordered)
        -   `POST /api/attendance/start` - Start consultation from queue entry
        -   `PUT /api/consultations/:id` - Update consultation (partial updates allowed)
        -   `POST /api/consultations/:id/finalize` - Finalize consultation (requires diagnosis validation)
        -   `GET /api/citizens/:id/medical-history` - Complete patient medical history with consultations, active problems, prescriptions, referrals, and exams
        -   `POST /api/consultations-with-prescriptions` - Transactional creation of consultation + prescriptions
        -   `GET /api/exams` - List exams by consultation with multi-tenant filtering
        -   `POST /api/exams` - Create exam request with SIGTAP mapping
        -   `PATCH /api/exams/:id` - Update exam request
        -   `DELETE /api/exams/:id` - Delete exam request
    -   **Security Pattern**: All endpoints enforce multi-tenant validation via `req.session.user.unitId`, ensuring data isolation at controller level.
    -   **Cache Synchronization**: All mutations (prescriptions, referrals, exams) invalidate medical history cache (`['/api/citizens', citizenId, 'medical-history']`) for real-time UI updates.
    -   **Data Fetching Pattern**: All queries use unified `apiRequest()` helper for consistent authentication handling and error management.
-   **Exams & Procedures Management**: Complete CRUD system for laboratory exam and procedure requests integrated into medical consultations. Features include:
    -   **SIGTAP Integration**: Exam types mapped to SIGTAP codes (Brazilian Unified Health System procedures table) with category="exam" or "procedure" filtering.
    -   **Exam Request Workflow**: Dialog-based creation/editing with react-hook-form validation, exam type selection (combobox), priority levels (routine/urgent/emergency), and justification fields.
    -   **Real-time Updates**: TanStack Query mutations with optimistic UI updates and automatic cache invalidation.
    -   **Multi-tenant Security**: All exam endpoints validate `req.session.user.unitId` and filter by consultation ownership.
-   **Medical History Visualization**: Comprehensive patient longitudinal record displaying complete clinical timeline with chronological consultations, active health problems, current prescriptions, pending referrals, and exam requests. Implemented as standalone `MedicalHistory.tsx` component with card-based layout and collapsible sections.
-   **Searchable Selection (Combobox)**: System-wide implementation of searchable/autocomplete functionality for all selection fields using a reusable Combobox component.

#### Next Development Priorities

1.  Patient Summary Sheet: Longitudinal health record.
2.  Medication Stock Management: Pharmacy inventory control.
3.  Reception Workflow Enhancements: Initial triage and risk classification.

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