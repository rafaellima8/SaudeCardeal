# PEC Integrado Municipal - Sistema de Gestão de Saúde Pública

## Overview

PEC Integrado Municipal is a comprehensive healthcare management system designed for the municipality of Cardeal da Silva, Bahia, Brazil. The system provides integrated management of primary healthcare services, including electronic health records (EHR), appointment scheduling, pharmacy inventory, inter-municipal patient transport (TFD), and comprehensive reporting capabilities. It is built to comply with e-SUS APS (Brazilian national primary healthcare system) standards.

The application serves multiple user roles including administrators, physicians, nurses, community health agents, pharmacists, managers, and reception staff, providing role-specific interfaces for efficient healthcare delivery and administrative oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 19, 2025** - Database Migration to SQLite & Session Management Update:
- **Issue**: Neon PostgreSQL database was disabled due to inactivity (scale-to-zero) and could not be reactivated
- **Solution**: Migrated to SQLite with minimal schema for authentication demo
- **Schema Reduced**: Temporarily using only `users` and `health_units` tables to enable login testing
- **Database File**: `saude.db` (SQLite, 28KB)
- **Session Storage**: Changed from connect-pg-simple (PostgreSQL) to MemoryStore for stability
- **Seed Data**: Two test users created successfully
  - Admin: admin@saude.gov.br / Admin@2025
  - ACS: acs@saude.gov.br / Acs@2025
- **Login Status**: ✅ **100% FUNCTIONAL** - Authentication, session persistence, and frontend dashboard tested and confirmed working
- **Testing Completed**: 
  - ✅ POST /api/auth/login returns 200 with user data
  - ✅ Session cookie created and persists across requests
  - ✅ GET /api/auth/me returns authenticated user successfully
  - ✅ Frontend dashboard renders with charts and statistics
  - ✅ Role-based sidebar navigation working correctly
- **Temporarily Disabled**: e-SUS export module, full schema tables (will be restored when migrating back to PostgreSQL or completing SQLite schema)
- **Next Steps**: Either restore full schema for SQLite or provision new PostgreSQL instance

**November 17, 2025** - Implemented Complete Authentication System:
- **Password Authentication**: Bcrypt hashing (10 rounds) for secure password storage
- **Session Management**: PostgreSQL session store via connect-pg-simple with secure cookies (httpOnly, sameSite, secure in production)
- **Auth API Endpoints**:
  - POST `/api/auth/login` - Email/password authentication
  - POST `/api/auth/logout` - Session destruction
  - GET `/api/auth/me` - Current user retrieval
- **Route Protection**: Global middleware protecting all /api/* routes with exact allowlist for auth endpoints
- **Frontend Login**: Dedicated login page with form validation and credential display
- **Seed Users**: 
  - admin@saude.gov.br / Admin@2025 (full access)
  - acs@saude.gov.br / Acs@2025 (Território + ACE only)
- **Role-Based Dashboards**: Different statistics displayed based on user role
- **Session Security**: Automatic redirect to login for unauthenticated users
- **Users Table**: Added passwordHash field via migration

**November 17, 2025** - Implemented Role-Based Access Control (RBAC):
- Created permissions system with role-based menu filtering
- New hook `useCurrentUser()` for user context and permissions (now using real API)
- Sidebar dynamically filters menu items based on user role
- ACS (Agente Comunitário de Saúde) profile with restricted access to:
  - ✅ Território (Territory Management)
  - ✅ ACE (Community Health Agent Dashboard)
- Development role switcher component for testing different profiles
- Role labels in Portuguese for all 7 user types
- User avatar with dynamic initials in sidebar footer

**November 17, 2025** - Implemented ACE Dashboard and Stats Module:
- Created ACE Dashboard page (`/ace`) with Recharts visualizations
- Implemented GET `/api/ace/stats` endpoint for aggregated statistics
- Dashboard displays: total visits, focos vetoriais, dwellings count, recent activity
- Charts: Dwellings by status (bar chart), Visits by type (pie chart)
- Added ACE navigation link in sidebar with Activity icon
- Configured TypeScript paths with `@modules/*` alias for ACE module imports
- All ACE unit tests passing (11/11)
- Stats service correctly queries main schema tables (dwellings, home_visits)

**November 17, 2025** - Implemented Territorial Management Module (e-SUS Território):
- Created hierarchical data structure: Dwelling → Family → Citizen → Home Visits
- New database tables: dwellings, families, home_visits
- New enums: dwelling_type, sanitation, water_supply, visit_type, visit_motive
- Complete REST APIs for territorial CRUD operations
- UI with tabs for Dwellings, Families, and Home Visits management
- Added geolocation support (latitude/longitude fields)
- Integrated with existing health units and professionals
- Added navigation link in sidebar

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)

**State Management Strategy**
- TanStack Query v5 for server state management, data fetching, and caching
- React hooks for local component state
- No global state management library - server state handled by TanStack Query, UI state kept local

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Material Design 3 principles adapted for healthcare contexts
- Tailwind CSS for utility-first styling with custom design tokens
- Dark mode support with theme toggle functionality
- Custom CSS variables for consistent theming across light/dark modes

**Design System**
- Typography: Inter font family for general UI, JetBrains Mono for medical codes/IDs
- Spacing: Tailwind's default spacing scale (multiples of 0.25rem)
- Layout patterns: Responsive grid systems, sidebar navigation (256px fixed width), max-width containers
- Healthcare-specific patterns: Timeline views for clinical history, status badges for appointments, stat cards for metrics

**Data Visualization**
- Recharts library for dashboard charts and analytics
- Custom chart components following healthcare data presentation best practices

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- RESTful API design with JSON responses
- Middleware for request logging, JSON parsing, and error handling
- Custom request/response logging for API endpoints

**Database Layer**
- PostgreSQL as the relational database
- Drizzle ORM for type-safe database queries and migrations
- Neon serverless PostgreSQL connector (@neondatabase/serverless)
- Schema-first design with Zod validation

**Data Access Pattern**
- Storage abstraction layer (`server/storage.ts`) implementing repository pattern
- Interface-based contracts (IStorage) for testability and maintainability
- Centralized database connection management (`server/db.ts`)

**API Structure**
- Resource-based endpoints following REST conventions:
  - `/api/citizens` - Patient/citizen management
  - `/api/appointments` - Appointment scheduling
  - `/api/consultations` - Medical consultations/records
  - `/api/prescriptions` - Medication prescriptions
  - `/api/medications` - Medication catalog
  - `/api/exams` - Medical exams and results
  - `/api/tfd` - Inter-municipal transport requests
  - `/api/queue` - Real-time attendance queue
  - `/api/units` - Health unit management
  - `/api/professionals` - Healthcare professional registry
  - `/api/reports` - Analytics and reporting
  - `/api/stats/dashboard` - Dashboard statistics
  - `/api/ace/stats` - ACE module statistics
  - `/api/dwellings` - Territorial dwelling management (e-SUS Território)
  - `/api/families` - Family registry and management
  - `/api/home-visits` - Home visit tracking and data collection

**Security & Access Control**
- **Authentication System**:
  - Password-based authentication with bcrypt hashing (10 rounds)
  - Session-based authentication via express-session
  - MemoryStore session persistence (temporary, for SQLite compatibility)
  - Secure cookie configuration (httpOnly, sameSite, secure in production)
  - Global API route protection with exact allowlist for auth endpoints
  - Auth middleware: `requireAuth` for route protection, `requireRole` for role-based access
- **Authorization (RBAC)**:
  - Role-based access control with 7 user roles
  - Permission matrix defined in `client/src/lib/permissions.ts`
  - Dynamic menu filtering based on user role
  - User roles:
    - `admin` - Full system access
    - `medico` - Medical staff access
    - `enfermeiro` - Nursing staff access
    - `acs` - Community health agent (restricted to Território and ACE only)
    - `farmaceutico` - Pharmacy management
    - `gestor` - Manager/supervisor access
    - `recepcao` - Reception/front desk access
  - User context hook: `useCurrentUser()` for permission checks
  - Development role switcher for testing different permission levels
- **API Protection**:
  - All `/api/*` routes require authentication (except `/api/auth/login|logout|me`)
  - Exact path allowlist prevents bypass vulnerabilities
  - 401 Unauthorized responses for unauthenticated requests

**Database Schema Design**
- Enum types for status fields (appointment_status, attendance_status, priority, tfd_status, prescription_status)
- Territorial enums (dwelling_type, sanitation, water_supply, visit_type, visit_motive)
- User roles enum (admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao)
- UUID primary keys for all entities
- Timestamp tracking (createdAt) on all major tables
- Foreign key relationships maintaining referential integrity
- Hierarchical territorial structure: dwellings → families → citizens → home visits
- Separate tables for health units, professionals, citizens, appointments, consultations, prescriptions, medications, exams, TFD requests, attendance queues, dwellings, families, and home visits
- **Users table**: Includes passwordHash field for secure authentication, name, email (unique), cpf, role, unitId, and active status

### Development & Deployment

**Development Workflow**
- Hot module replacement via Vite development server
- TypeScript compilation with strict mode enabled
- ESM module system throughout the stack
- Environment-based configuration (development vs production)

**Build Process**
- Frontend: Vite builds React application to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Platform: Node.js with ES modules
- Single production entry point serving both static assets and API

**Hosting Platform**
- Replit-optimized with custom plugins (@replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner)
- Port 5000 for both development and production
- Server-side rendering setup with Vite middleware in development
- Static file serving in production

**Session Management**
- MemoryStore session storage (temporary, for SQLite compatibility)
- Session data kept in server memory during development
- Future: Migrate to PostgreSQL session store (connect-pg-simple) when restoring full database

## External Dependencies

### Third-Party Services

**Database**
- SQLite local database (temporary migration from Neon PostgreSQL)
- Database file: `saude.db` (28KB)
- Minimal schema: users and health_units tables only
- Future: Migrate back to PostgreSQL or complete SQLite schema implementation

**e-SUS APS Integration** (In Development)
- Export module for Brazilian national healthcare system compliance
- Located in `server/integrations/esus/`
- Validators using Zod schemas for data conformity
- Mapping documentation for database-to-e-SUS field transformation
- Targets: Citizen data (ESUSCitizenDTO), consultations (ESUSConsultationDTO), prescriptions, exams

### Key NPM Packages

**UI & Interaction**
- @radix-ui/* - Accessible UI component primitives (22+ components)
- recharts - Chart and data visualization library
- cmdk - Command palette component
- date-fns / dayjs - Date manipulation utilities
- lucide-react - Icon library

**Forms & Validation**
- react-hook-form - Form state management
- @hookform/resolvers - Validation resolver integration
- zod - Schema validation (used for both runtime validation and TypeScript inference)
- drizzle-zod - Automatic Zod schema generation from Drizzle tables

**Styling**
- tailwindcss - Utility-first CSS framework
- tailwind-merge - Intelligent Tailwind class merging
- class-variance-authority - Type-safe variant styling
- clsx - Conditional class name utility

**Build & Development Tools**
- vite - Frontend build tool and dev server
- tsx - TypeScript execution for development
- esbuild - JavaScript bundler for production backend
- vitest - Testing framework
- drizzle-kit - Database migration toolkit

### Browser APIs & Fonts

**Google Fonts**
- Inter (weights: 300, 400, 500, 600, 700) - Primary UI font
- JetBrains Mono (weights: 400, 500, 600) - Monospace for medical codes

**Accessibility Considerations**
- ARIA labels and roles throughout UI components
- Keyboard navigation support via Radix UI
- Screen reader compatibility
- Focus management in dialogs and modals