# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a comprehensive municipal health management system designed to integrate and optimize primary healthcare services for Cardeal da Silva, Bahia, Brazil. It encompasses electronic health records (PEC), scheduling, pharmacy management, inter-municipal patient transport (TFD), and robust reporting, all compliant with e-SUS APS standards. The system supports diverse user profiles (administrators, doctors, nurses, community health agents, pharmacists, managers, receptionists) with tailored interfaces to enhance healthcare delivery, administrative efficiency, and public health oversight. The business vision is to modernize municipal health management, improve patient care coordination, and provide valuable data for public health initiatives.

## Recent Changes

### Módulo ACE Visitas - Frontend Full-Stack Completo (November 23, 2025)
-   **Frontend Completo**: Implementada página `ace-visits.tsx` com todos os padrões:
    - Form completo com shadcn + useForm + zodResolver
    - Seleção de imóvel, profissional e unidade (dropdowns dinâmicos)
    - Data/hora da visita com datetime-local input
    - Geolocalização: botão "Obter Localização Atual" via GPS (navigator.geolocation)
    - Sinais vitais completos: temperatura, PA sistólica/diastólica, FC, FR, glicemia, peso, altura
    - Observações com textarea expandido
    - Mutations via fetch (POST/PATCH/DELETE) com error handling
    - Loading states, toast notifications, confirmação de delete
    - Tabela de visitas com colunas: data, imóvel, profissional, tipo, sinais vitais resumidos
    - Todos elementos com data-testid para testes
-   **Backend CRUD Completo**:
    - GET `/api/ace/visits` (lista com filtros), GET `/api/ace/visits/:id` (detalhe)
    - POST `/api/ace/visits` (create), PATCH `/api/ace/visits/:id` (update), DELETE `/api/ace/visits/:id`
    - Controller com validação bidirecional Zod (camelCase E snake_case)
    - Service com métodos createVisit, listVisits, getVisitById, updateVisit, deleteVisit
    - Auditoria completa em aceAuditLogs
-   **Rotas e Navegação**:
    - Rota `/ace/visitas` adicionada em App.tsx
    - Link "ACE Visitas" no sidebar
-   **Zero LSP Errors**: Código TypeScript 100% válido
-   **Status**: Módulo ACE Visitas completo; aguardando revisão architect

### Módulo ACE Imóveis - Frontend Full-Stack Production-Ready (November 23, 2025)
-   **Frontend Completo**: Implementada página `ace-dwellings.tsx` com padrões do projeto:
    - Shadcn Form + useForm + zodResolver com validação completa
    - apiRequest para mutations (POST/PATCH/DELETE) ao invés de fetch manual
    - queryKey estruturado `['/api/ace/dwellings']` para cache invalidation correto
    - Dialog com form create/edit completo: endereço, geolocalização, saneamento, água, energia, animais
    - Loading states, error handling, toast notifications
    - Todos elementos interativos com data-testid para testes
    - UX melhorada: botão "Novo Imóvel" disabled durante loading de units
-   **Backend CRUD Completo com Validação Robusta**: 
    - GET `/api/ace/dwellings` (lista), GET `/api/ace/dwellings/:id` (detalhe)
    - POST `/api/ace/dwellings` (create com validação Zod camelCase)
    - PATCH `/api/ace/dwellings/:id` (update parcial preservando campos não enviados)
    - DELETE `/api/ace/dwellings/:id` (com auditoria)
-   **mapToDrizzleFields Bidirecional**: Função que aceita payloads camelCase (frontend) E snake_case (backend legacy) e mapeia corretamente para campos Drizzle, incluindo apenas campos fornecidos para evitar sobrescrever dados em PATCH
-   **Validação em Camadas**:
    - Frontend: zodResolver com insertAceDwellingSchema
    - Backend: camelCaseSchema Zod no controller retorna 400 para payloads malformados
    - Service: validação de required fields após mapeamento
-   **JSON Array Handling**: animalTypes persiste corretamente como JSON array via Drizzle mode: "json" (sem double stringify)
-   **Sidebar**: Adicionados links diretos "ACE Dashboard" e "ACE Imóveis" (solução simplificada ao invés de Collapsible complexo)
-   **Rota**: `/ace/imoveis` adicionada em App.tsx
-   **Zero LSP Errors**: Código TypeScript sem erros de tipagem
-   **Status**: Módulo ACE Imóveis completo e production-ready; próximos passos: Visitas (ace-visits.tsx) e Focos (ace-foci.tsx)

### Integração Territorial - Implementação Completa (November 22, 2025)
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

### Melhorias Futuras (Refinamentos Pendentes)
1. **transferFamilyMember**: Atualmente usa insert direto; poderia reutilizar addFamilyMember para garantir consistência total de metadados (joinedAt, notes padrão, auditoria)
2. **Hierarchy Query**: Funciona com `enabled` flag; poderia adicionar queryFn explícito com guard e botão "Limpar seleção" para resetar estado para undefined (atualmente Select não pode emitir undefined)
3. **Form Null Preservation**: Formulário usa `value ?? ""` em alguns inputs; poderia usar `field.value` diretamente com `?? null` no submit para preservar nulls de forma mais consistente

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

The backend uses Express.js and TypeScript on Node.js, providing a RESTful API with JSON responses. SQLite (Better-SQLite3) is the database, managed with Drizzle ORM using query builder patterns (db.select, db.insert, db.update). All queries are strongly typed and use parameterized statements for security. API endpoints cover core healthcare entities and administrative functions. Security includes password-based authentication with bcrypt, session management, and Role-Based Access Control (RBAC) for 7 user roles.

### UI/UX and Brand Identity

The system features a modern UI with dark mode support, using Inter for typography and JetBrains Mono for code. Components are designed for accessibility. Dashboards include summary cards, tables, and Recharts graphs. Professional PDF exports are styled with institutional branding, including dynamic logos and semantic color palettes for various states.

### Feature Specifications

#### Core Features

-   **Territorial Management**: Comprehensive CRUD for Dwellings, Home Visits, and a complete Family Hierarchy System linking Citizens, Families, and Dwellings, with rich UI for managing members and displaying visual hierarchies.
-   **Endemic Disease Surveillance (ACE)**: Backend completo com módulo ACE usando SQLite + Drizzle ORM. Includes CRUD para imóveis (dwellings), visitas domiciliares com sinais vitais, registro de focos vetoriais com geolocalização, e sistema de auditoria. Frontend pendente (forms, tabelas, mapas).
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