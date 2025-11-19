# PEC Integrado Municipal - Sistema de Gestão de Saúde Pública

## Overview

PEC Integrado Municipal is a comprehensive healthcare management system designed for the municipality of Cardeal da Silva, Bahia, Brazil. Its primary purpose is to integrate and streamline primary healthcare services, including electronic health records (EHR), appointment scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all in compliance with e-SUS APS standards. The system supports various user roles such as administrators, physicians, nurses, community health agents, pharmacists, managers, and reception staff, providing tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18+ and TypeScript, utilizing Vite for development and optimized builds, and Wouter for client-side routing. State management relies on TanStack Query v5 for server state and data caching, complemented by React hooks for local component state. The UI is developed using shadcn/ui with Radix UI primitives, adhering to Material Design 3 principles and styled with Tailwind CSS, including dark mode support. The design system incorporates the Inter font for UI and JetBrains Mono for code, with responsive grids, sidebar navigation, and max-width containers. Data visualization for dashboards and analytics is handled by Recharts.

### Backend Architecture

The backend is developed with Express.js and TypeScript on Node.js, implementing a RESTful API with JSON responses. Middleware is used for logging, JSON parsing, and error handling. PostgreSQL is the primary database (with SQLite for temporary local use), managed with Drizzle ORM for type-safe queries and migrations, following a schema-first design with Zod validation. A repository pattern with an interface-based storage abstraction layer (`server/storage.ts`) is employed for data access. API endpoints are resource-based, covering citizens, appointments, consultations, prescriptions, medications, exams, TFD, queues, health units, professionals, reports, territorial management (dwellings, families, home visits), and endemic disease surveillance. Security features include password-based authentication with bcrypt and session management via `express-session`, alongside Role-Based Access Control (RBAC) supporting 7 distinct user roles with dynamic menu filtering and a permission matrix.

### Development & Deployment

The development workflow includes Hot Module Replacement via Vite, TypeScript compilation, and ESM. The build process packages the frontend with Vite to `dist/public` and the backend with esbuild to `dist/index.js`. The application is optimized for Replit hosting on port 5000. Session management currently uses `MemoryStore`, with a future migration to a PostgreSQL session store planned.

### UI/UX Decisions

The system incorporates a modern UI with a clean aesthetic, supporting dark mode. Typography uses Inter for readability and JetBrains Mono for code elements. Components are designed for accessibility, including ARIA labels, keyboard navigation, and screen reader compatibility. Dashboards feature summary cards, tables, and Recharts-powered graphs for data visualization. PDF exports are professionally styled with institutional branding and data representation consistent with the UI.

### Feature Specifications

The system currently includes fully functional modules for:

#### ✅ Fully Implemented & Operational

-   **Territorial Management CRUD**: Complete create/read/update/delete operations for:
    -   **Dwellings** (Imóveis): Edit/delete buttons, dynamic forms, mutation handlers, AlertDialog confirmations
    -   **Home Visits** (Visitas Domiciliares): Full CRUD with backend PATCH/DELETE routes, form reuse, confirmation dialogs
    -   **Families** (Famílias): Backend CRUD complete (`updateFamily`, `deleteFamily` in storage + routes), frontend UI pending
    
-   **Endemic Disease Surveillance (ACE) CRUD**: Complete CRUD for work cycles:
    -   **Cycles** (Ciclos): Edit/delete buttons, mutations, dynamic dialog (create/edit modes), AlertDialog confirmations
    -   **FAD/Foci/Treatments**: Backend routes ready (PATCH/DELETE), can replicate same pattern from cycles
    -   Dashboards: IIP/IB indicators, heatmaps, charts with Recharts
    
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export (jsPDF + autotable), customizable filters (period, health unit), detailed breakdowns of consultations, diagnoses, medications, and age distribution

#### 📋 Architected & Documented (Pending Implementation)

-   **SOAP Consultation Schema** (e-SUS PEC v5.3 compliant):
    -   **S** (Subjective): Patient complaints, history, anamnesis  
    -   **O** (Objective): Physical exam, vital signs (BP, HR, temp, SpO2, weight, height, BMI, abdominal circumference)
    -   **A** (Assessment): Diagnoses with CIAP-2 and CID-10 codes (JSON arrays)
    -   **P** (Plan): Treatment plan, prescriptions, referrals, guidance
    -   Appointment linkage, consultation type enum (scheduled, spontaneous demand, urgency, home visit)
    -   **Status**: Schema designed, SQLite migration deferred due to ALTER TABLE constraints (requires table recreation strategy)

#### 🔨 Next Development Priorities

1. **SOAP Frontend Form**: Implement consultation recording UI with SOAP fields, CIAP-2/CID-10 selectors, vital signs inputs
2. **Electronic Prescriptions**: Schema + frontend for medication prescriptions linked to consultations (fractional dosing support)
3. **Appointment Scheduling**: Queue management, states (scheduled → waiting → in-progress → completed), initial listening/triage
4. **Territorial Integration**: Citizen → Family → Domicile → Dwelling linkages with cascading views
5. **Patient Summary Sheet**: Longitudinal health record with consultation history, medications, exams, vaccinations

## External Dependencies

### Third-Party Services

-   **Database**: SQLite (local, temporary, `saude.db`) and PostgreSQL (primary).
-   **e-SUS APS Integration**: An export module (`server/integrations/esus/`) is in place for compliance with the Brazilian national healthcare system, utilizing Zod schemas for data conformity and mapping documentation.

### Key NPM Packages

-   **UI & Interaction**: `@radix-ui/*`, `recharts`, `cmdk`, `date-fns`/`dayjs`, `lucide-react`.
-   **Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
-   **Styling**: `tailwindcss`, `tailwind-merge`, `class-variance-authority`, `clsx`.
-   **Build & Development Tools**: `vite`, `tsx`, `esbuild`, `vitest`, `drizzle-kit`.
-   **PDF Export**: `jsPDF` and `jspdf-autotable`.

### Browser APIs & Fonts

-   **Google Fonts**: Inter (UI font), JetBrains Mono (monospace font).