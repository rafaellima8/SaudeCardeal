# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed to integrate and optimize primary healthcare services for Cardeal da Silva, Bahia, Brazil. It encompasses electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all compliant with e-SUS APS standards. The system supports diverse user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## Recent Changes (November 22, 2025)

### Integração Territorial - Implementação Completa
-   **Schema**: Adicionado campo opcional `familyId` em `citizens` para vinculação direta à família principal; adicionados campos `batchId`, `jsonPath`, `xmlPath` em `esusExports`
-   **Storage Layer**: Implementados 4 métodos de hierarquia territorial:
    - `getTerritorialHierarchy(dwellingId)`: Busca hierarquia completa Domicílio → Famílias → Cidadãos
    - `getDwellingWithFamilies(dwellingId)`: Busca domicílio com todas as famílias e membros
    - `getFamilyWithMembers(familyId)`: Busca família com todos os membros e informações do domicílio
    - `transferFamilyMember(memberId, newFamilyId)`: Transfere membro entre famílias com transação atômica, validação completa, e atualização de contadores
-   **API Routes**: 4 novos endpoints RESTful:
    - GET `/api/dwellings/:id/hierarchy` - Hierarquia territorial completa
    - GET `/api/families/:id/with-members` - Família com membros
    - GET `/api/dwellings/:id/with-families` - Domicílio com famílias  
    - POST `/api/family-members/:id/transfer` - Transferência de membros
-   **UI**: Nova aba "Hierarquia Territorial" em Território com:
    - Seletor de domicílios para escolher hierarquia
    - Visualização completa Domicílio → Famílias → Cidadãos
    - Estados de loading, erro e vazios
    - Todos os elementos dinâmicos com data-testid para testes
-   **Drizzle Schemas**: Regenerados `insertEsusExportSchema`, `InsertEsusExport` e `EsusExport` types; sincronizados com banco via `npm run db:push --force`
-   **Refinamentos**: Corrigidos valores null em formulários usando `??` (nullish coalescing), queryKey com array segments para invalidação correta, transação atômica em transferFamilyMember

### Correções Anteriores
-   **Schema Enhancement**: Added `batchId`, `jsonPath`, and `xmlPath` fields to `esusExports` table for future e-SUS export functionality.
-   **Code Quality**: Resolved all 12 TypeScript LSP errors in `server/routes.ts`, including CNS validation null-safety guard and proper handling of disabled e-SUS export endpoint.
-   **Database Migration**: Successfully synchronized schema changes to SQLite database via `npm run db:push`.
-   **e-SUS Export Status**: Temporarily disabled generateExport endpoint (returns 503 status) pending full e-SUS PEC schema implementation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18+, TypeScript, Vite, and Wouter for routing. State management uses TanStack Query v5 for server state and React hooks for local state. UI components leverage shadcn/ui and Radix UI, styled with Tailwind CSS (including dark mode), adhering to Material Design 3. Data visualization for dashboards is handled by Recharts.

### Backend

The backend uses Express.js and TypeScript on Node.js, providing a RESTful API with JSON responses. PostgreSQL is the primary database (with SQLite for local use), managed with Drizzle ORM. A repository pattern abstracts data access. API endpoints cover core healthcare entities and administrative functions. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) for 7 user roles.

### UI/UX and Brand Identity

The system features a modern UI with dark mode support, using Inter for typography and JetBrains Mono for code. Components are designed for accessibility. Dashboards include summary cards, tables, and Recharts graphs. Professional PDF exports are styled with institutional branding, including dynamic logos and semantic color palettes for various states.

### Feature Specifications

#### Core Features

-   **Territorial Management**: Comprehensive CRUD for Dwellings, Home Visits, and a complete Family Hierarchy System linking Citizens, Families, and Dwellings, with rich UI for managing members and displaying visual hierarchies.
-   **Endemic Disease Surveillance (ACE)**: CRUD for work cycles and dashboards with IIP/IB indicators.
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export and customizable filters.
-   **Appointment Scheduling**: Complete scheduling and queue management with calendar views.
-   **Electronic Prescriptions**: Prescription management with transactional integrity and robust PDF export.
-   **AI Medical Assistant**: A production-ready AI assistant powered by OpenAI GPT-5 for diagnostic suggestions (CIAP-2/CID-10), drug interaction checks, prescription validation, and care plan generation. It includes robust validation, error handling, medical compliance safeguards, and RBAC-controlled access for doctors and nurses.
-   **SOAP Consultation System**: Full-stack implementation of medical consultations adhering to e-SUS PEC v5.3 standards, including subjective, objective, assessment, and plan (SOAP) fields, vital signs, CIAP-2/CID-10 codes, and integrated prescription management.

#### Next Development Priorities

1.  Territorial Integration: Link Citizen → Family → Domicile → Dwelling.
2.  Patient Summary Sheet: Longitudinal health record.
3.  Medication Stock Management: Pharmacy inventory control.
4.  Reception Workflow Enhancements: Initial triage and risk classification.

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