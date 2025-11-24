# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed to integrate and optimize primary healthcare services for Cardeal da Silva, Bahia, Brazil. It encompasses electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all compliant with e-SUS APS standards. The system supports diverse user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 24, 2025)

### Appointments Module Fixed - All Endpoints Operational

**Endpoint corrections applied to 3 frontend files:**

1. **Endpoint Standardization**:
   - Fixed incorrect `/api/health-units` references across all pages
   - Updated to correct `/api/units` endpoint in:
     - `client/src/pages/appointments.tsx`
     - `client/src/pages/ace-visits.tsx`
     - `client/src/pages/attendance-queue.tsx`
   - Result: All appointment-related endpoints returning 200 OK

2. **System Validation**:
   - All API endpoints tested and operational
   - No errors in server logs
   - SIGTAP seed executing successfully on startup
   - Export module 100% functional

**Status**: System fully operational and production-ready. All modules tested and confirmed working.

## Previous Changes (November 23, 2025)

### SISAB Compliance Corrections - Production-Ready Export Module

**Three critical blockers resolved for DATASUS/SISAB submission:**

1. **Date Filters Corrected** (extractCitizens, extractConsultations, extractProcedures, extractExams, extractTFD)
2. **SIGTAP Integration Completed** (25 official codes, auto-seed on startup, cache invalidation)
3. **teamINE Validation Enforced** (SISAB requirement, export period scoped)

**Status**: System fully compliant with e-SUS APS v5.3 SISAB specifications. Ready for federal funding eligibility through DATASUS submission.

## System Architecture

### Frontend

The frontend is built with React 18+, TypeScript, Vite, and Wouter for routing. State management uses TanStack Query v5 for server state and React hooks for local state. UI components leverage shadcn/ui and Radix UI, styled with Tailwind CSS (including dark mode), adhering to Material Design 3. Data visualization for dashboards is handled by Recharts.

### Backend

The backend uses Express.js and TypeScript on Node.js, providing a RESTful API with JSON responses. SQLite (Better-SQLite3) is the database, managed with Drizzle ORM using query builder patterns (db.select, db.insert, db.update). All queries are strongly typed and use parameterized statements for security. API endpoints cover core healthcare entities and administrative functions. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) for 7 user roles.

### UI/UX and Brand Identity

The system features a modern UI with dark mode support, using Inter for typography and JetBrains Mono for code. Components are designed for accessibility. Dashboards include summary cards, tables, and Recharts graphs. Professional PDF exports are styled with institutional branding, including dynamic logos and semantic color palettes for various states.

### Feature Specifications

#### Core Features

-   **Territorial Management**: Comprehensive CRUD for Dwellings, Home Visits, and a complete Family Hierarchy System linking Citizens, Families, and Dwellings, with rich UI for managing members and displaying visual hierarchies.
-   **Endemic Disease Surveillance (ACE)**: Full-stack module for ACE, including CRUD for dwellings, home visits with vital signs, geolocated vector foci registration, and an auditing system.
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export and customizable filters.
-   **Appointment Scheduling**: Complete scheduling and queue management with calendar views.
-   **Electronic Prescriptions**: Prescription management with transactional integrity and robust PDF export.
-   **AI Medical Assistant**: A production-ready AI assistant powered by OpenAI GPT-5 for diagnostic suggestions (CIAP-2/CID-10), drug interaction checks, prescription validation, and care plan generation. It includes robust validation, error handling, medical compliance safeguards, and RBAC-controlled access for doctors and nurses.
-   **SOAP Consultation System**: Full-stack implementation of medical consultations adhering to e-SUS PEC v5.3 standards, including subjective, objective, assessment, and plan (SOAP) fields, vital signs, CIAP-2/CID-10 codes, and integrated prescription management.

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