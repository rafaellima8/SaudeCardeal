# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed for Cardeal da Silva, Bahia, Brazil. Its primary purpose is to integrate and optimize primary healthcare services, including electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all in compliance with e-SUS APS standards. The system supports various user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18+ and TypeScript, using Vite for development and Wouter for client-side routing. State management uses TanStack Query v5 for server state and React hooks for local component state. The UI is developed with shadcn/ui and Radix UI primitives, adhering to Material Design 3 principles and styled with Tailwind CSS, including dark mode support. Data visualization for dashboards is handled by Recharts.

### Backend Architecture

The backend uses Express.js and TypeScript on Node.js, implementing a RESTful API with JSON responses. PostgreSQL is the primary database (with SQLite for local use), managed with Drizzle ORM for type-safe queries and migrations. A repository pattern abstracts data access. API endpoints cover citizens, appointments, consultations, prescriptions, medications, exams, TFD, queues, health units, professionals, reports, territorial management, and endemic disease surveillance. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) supporting 7 distinct user roles.

### UI/UX Decisions

The system features a modern UI with dark mode support. Typography uses Inter for readability and JetBrains Mono for code. Components are designed for accessibility. Dashboards include summary cards, tables, and Recharts-powered graphs. PDF exports are professionally styled with institutional branding.

### Brand Identity System

-   **Logo Component**: React component with 4 sizes, 3 color schemes, and 2 variants (full and icon-only), applied in login, sidebar, and PDF headers.
-   **SVG Logo Utilities**: Helper functions for PDF generation (`getLogoSVG()`, `getLogoIconSVG()`) embedded via data URIs.
-   **Professional PDFs**: jsPDF + autoTable for prescriptions and reports, including institutional headers, patient data, medication tables, digital signatures, and aggregated indicators.
-   **Favicon**: SVG icon version of the logo.
-   **Functional Color Palette**: Semantic color system for success, warning, info, and destructive states, with light/dark mode compatibility.

### Feature Specifications

#### Fully Implemented & Operational

-   **Territorial Management CRUD**: Complete CRUD for Dwellings and Home Visits.
-   **Family Hierarchy System (✅ COMPLETO - Backend + Frontend)**: Territorial integration linking Citizens → Families → Dwellings with comprehensive member management:
    -   **Database Schema** (`shared/schema.ts`): `family_members` junction table with fields: family_id, citizen_id, relationship_type (responsavel_familiar/conjuge/filho/neto/pai_mae/avo/irmao/outro), is_head_of_family, joined_at, left_at, notes
    -   **API Endpoints** (`server/routes.ts`): 6 RESTful endpoints for family member CRUD:
        - `GET /api/families/:familyId/members` - List all members of a family
        - `GET /api/citizens/:citizenId/family` - Get citizen's current family membership
        - `POST /api/families/:familyId/members` - Add member to family
        - `PATCH /api/family-members/:id` - Update relationship type/notes
        - `DELETE /api/family-members/:id` - Remove member from family
        - `GET /api/families/:familyId/hierarchy` - Get complete hierarchy (Dwelling → Family → Members with citizen data)
    -   **Storage Layer** (`server/storage.ts`): 6 methods including `getFamilyHierarchy()` with SQL joins to fetch complete family tree, auto-updates family member count on add/remove
    -   **Type Safety**: Full Zod validation schemas (`insertFamilyMemberSchema`) and TypeScript types (`FamilyMember`, `InsertFamilyMember`) exported from shared schema
    -   **Frontend UI** (`client/src/pages/territorio.tsx`) - **"Famílias" Tab COMPLETA**:
        * **Family Selector**: Dropdown com lista de famílias e contagem de membros
        * **Visual Hierarchy Tree**: Cards mostrando Moradia → Família → Membros com dados completos
        * **Member Cards**: Exibição rica com badges de relacionamento (8 tipos), status ativo/inativo, dados do cidadão (nome, CPF, nascimento, sexo), observações
        * **CRUD Operations**: Formulários completos para adicionar, editar e remover membros com validação Zod
        * **Transfer System**: Dialog dedicado para transferência entre famílias com preservação de metadados (isHeadOfFamily, notas históricas com rastreamento de mudança)
        * **Filters**: Sistema de filtro por tipo de relacionamento (responsável familiar, cônjuge, filho, neto, pai/mãe, avô, irmão, outro)
        * **Statistics Dashboard**: 4 cards com métricas (Total de Membros, Responsável Familiar, Membros Ativos, Membros Inativos) com toggle show/hide
        * **TanStack Query Integration**: Custom queryFn para endpoint de hierarquia, invalidação de cache em todas mutations, estados loading/error
        * **UX Enhancements**: Estados vazios informativos, toasts de sucesso/erro, confirmação de remoção com AlertDialog, data-testid em elementos interativos
        * **Data Integrity**: Transferências usam padrão create-then-delete (reduz risco de órfãos), preservação de isHeadOfFamily e notas históricas com metadado de transferência
-   **Endemic Disease Surveillance (ACE) CRUD**: Complete CRUD for work cycles, including dashboards with IIP/IB indicators.
-   **Reports & Indicators**: Aggregated health indicators with professional PDF export and customizable filters.
-   **Appointment Scheduling System**: Complete scheduling and queue management with weekly calendar, day/week views, and attendance queue.
-   **Electronic Prescriptions**: Complete prescription management with transactional integrity, integrated into consultations, and robust PDF export with filtering capabilities.

-   **AI Medical Assistant (Production-Ready ✅)**: OpenAI GPT-5 powered diagnostic and prescription safety system with complete validation, error handling, and medical compliance safeguards:
    -   **Integration**: Replit AI Integrations for OpenAI (no API key required, charges to Replit credits)
    -   **Model**: `gpt-5` (latest OpenAI model released August 2025 with best medical knowledge)
    -   **Services** (`server/services/medical-ai.ts`):
        - **Diagnosis Suggestion**: Suggests up to 3 differential diagnoses with CIAP-2 and CID-10 codes based on SOAP data and vital signs, with confidence levels (high/medium/low)
        - **Drug Interaction Check**: Analyzes medication combinations for critical/major/moderate/minor interactions with mechanistic explanations
        - **Prescription Validation**: Validates dosages, checks contraindications, suggests adjustments based on age/weight/comorbidities with severity classification
        - **Care Plan Generation**: Auto-generates SOAP "Plan" section based on Subjective/Objective/Assessment data (max 200 words)
    -   **API Endpoints** (`server/routes-ai.ts`):
        - `POST /api/ai/diagnose` - Diagnosis suggestions (requires subjective, optional objective/vitalSigns)
        - `POST /api/ai/check-interactions` - Drug interaction analysis (requires medications array with min 2 items)
        - `POST /api/ai/validate-prescription` - Prescription safety validation (requires medication/dosage/frequency)
        - `POST /api/ai/generate-plan` - Auto-generate care plan (requires subjective/objective/assessment)
    -   **Input/Output Validation** (`shared/ai-schemas.ts`):
        - **Zod Schemas**: Strict validation for all request payloads (vital signs types, medication objects, required fields)
        - **Response Validation**: AI outputs are validated against schemas before being returned to clients
        - **Type Safety**: Full TypeScript types exported for frontend integration
    -   **Error Handling & Reliability**:
        - **Structured Error Logging**: Correlation IDs, timestamps, operation context for debugging
        - **Safe JSON Parsing**: Try/catch guards prevent exceptions from malformed AI responses
        - **Graceful Degradation**: Returns success/error objects with actionable messages when AI fails
        - **Status 503**: AI failures return "Service Unavailable" with clear client feedback
    -   **Medical Compliance & Safety**:
        - **Explicit Disclaimers**: All prompts and responses include warnings that AI is advisory only
        - **Professional Decision Authority**: Clearly states final decision is ALWAYS with licensed professional
        - **Conservative Approach**: AI instructed to be cautious, prioritize primary care diagnoses, avoid suggesting severe conditions without evidence
        - **Evidence-Based**: Prompts require AI to follow Brazilian e-SUS APS protocols and recognized clinical guidelines
    -   **Security & Access Control**:
        - **RBAC Enforcement**: Only doctors and nurses can access AI endpoints (via `requireRole(["doctor", "nurse"])` middleware)
        - **Authentication**: All endpoints protected by session authentication
        - **Audit Trail**: Structured logging captures all AI interactions with user context
        - **Rate Limiting**: 10 requests/minute per user (in-memory, single-instance deployment required)
        - **Input Limits**: Max 2000 chars for text fields, max 15 medications, max 20 comorbidities
        - **Durable Audit Logs**: All 4 endpoints save logs to `ai_audit_logs` table (userId, operation, latency, error tracking)
    -   **Limitations**:
        - **Single-Instance Required**: Rate limiter uses in-memory state, requires single-instance deployment or Redis upgrade
    -   **Frontend Integration (✅ COMPLETA)**:
        - **Hooks** (`client/src/hooks/use-ai-assistant.ts`): 4 custom hooks com TanStack Query para todos os endpoints
        - **UI Component** (`client/src/components/AIAssistantButton.tsx`): Botão reutilizável com ícone Sparkles e estados loading
        - **SOAP Forms** (`client/src/pages/consultations.tsx`):
          * **Aba Assessment**: Botão "Sugerir Diagnósticos com IA" - exibe até 3 hipóteses diagnósticas com CIAP-2/CID-10, badges de confiança (Alta/Média/Baixa), raciocínio clínico, e botão "Aplicar" para adicionar códigos aos seletores
          * **Aba Plan**: Botão "Gerar Plano com IA" - gera plano terapêutico baseado em S.O.A. e insere no textarea do Plano
          * **Prescrições Individuais**: Botão "Validar com IA" em cada card de prescrição - valida dosagem, detecta contraindicações, exibe alertas com badges de severidade (ERRO/CONTRAINDICAÇÃO/ATENÇÃO/INFO)
          * **Prescrições Múltiplas**: Botão "Verificar Interações com IA" (aparece quando >= 2 prescrições) - detecta interações medicamentosas com severidade (CRÍTICA/MAIOR/MODERADA/MENOR) e recomendações
        - **Validação Robusta**: Campos obrigatórios com mínimo 10 caracteres antes de chamar IA
        - **Disclaimers Destacados**: Avisos em amarelo em TODAS as respostas de IA alertando que a decisão final é do profissional
        - **UX/UI**: Loading states, toasts de sucesso/erro, cards coloridos por tipo de alerta, badges de severidade/confiança

#### Architected & Documented (Pending Implementation)

-   **SOAP Consultation Schema**: e-SUS PEC v5.3 compliant schema for Subjective, Objective, Assessment, and Plan, including vital signs, CIAP-2, and CID-10 codes.

#### Partially Implemented (Awaiting Database Migration)

-   **SOAP Consultation UI (Frontend Complete)**: Full consultation form with 4 SOAP tabs and vital signs inputs. Backend API routes are updated, but SOAP fields are not yet persisted due to SQLite limitations.

#### Next Development Priorities

1.  **Database Migration**: Migrate to PostgreSQL or recreate SQLite table for SOAP field persistence.
2.  **Territorial Integration**: Link Citizen → Family → Domicile → Dwelling.
3.  **Patient Summary Sheet**: Longitudinal health record.
4.  **Medication Stock Management**: Pharmacy inventory control.
5.  **Reception Workflow Enhancements**: Add initial triage and risk classification.

## External Dependencies

### Third-Party Services

-   **Database**: SQLite (local) and PostgreSQL (primary).
-   **e-SUS APS Integration**: Export module (`server/integrations/esus/`) for compliance with Brazilian national healthcare standards.

### Key NPM Packages

-   **UI & Interaction**: `@radix-ui/*`, `recharts`, `cmdk`, `date-fns`/`dayjs`, `lucide-react`.
-   **Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
-   **Styling**: `tailwindcss`, `tailwind-merge`, `class-variance-authority`, `clsx`.
-   **Build & Development Tools**: `vite`, `tsx`, `esbuild`, `vitest`, `drizzle-kit`.
-   **PDF Export**: `jsPDF` and `jspdf-autotable`.

### Browser APIs & Fonts

-   **Google Fonts**: Inter (UI font), JetBrains Mono (monospace font).