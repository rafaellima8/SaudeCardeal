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
-   **Medical Referrals**: Structured referral system for specialized care, including destination tracking (UPA, CAPS, specialties), priority management (normal/urgent/emergency), status workflow (pending → scheduled → in_progress → completed), and full integration with consultations. Multi-tenant secure with unitId validation.
-   **AI Medical Assistant**: A production-ready AI assistant powered by OpenAI GPT-5 for diagnostic suggestions (CIAP-2/CID-10), drug interaction checks, prescription validation, and care plan generation, with robust validation and RBAC-controlled access.
-   **SOAP Consultation System**: Full-stack implementation of medical consultations adhering to e-SUS PEC v5.3 standards, including subjective, objective, assessment, and plan (SOAP) fields, vital signs, CIAP-2/CID-10 codes, and integrated prescription management.
-   **Medical Attendance Module**: Complete 3-column workflow integrating patient selection (column 1), SOAP consultation form with vital signs and diagnostic codes (column 2), and electronic prescriptions CRUD (column 3). Fully integrated with proper consultation/professional context, cache synchronization, and transactional integrity.
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