# PEC Integrado Municipal - Sistema de Gestão de Saúde Pública

## Overview

PEC Integrado Municipal is a comprehensive healthcare management system for the municipality of Cardeal da Silva, Bahia, Brazil. It integrates primary healthcare services, including electronic health records (EHR), appointment scheduling, pharmacy inventory, inter-municipal patient transport (TFD), and reporting, adhering to e-SUS APS standards. The system supports multiple user roles (administrators, physicians, nurses, community health agents, pharmacists, managers, reception staff) with role-specific interfaces to enhance healthcare delivery and administrative oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**: React 18+ with TypeScript, Vite for fast development and optimized builds, Wouter for client-side routing.
**State Management Strategy**: TanStack Query v5 for server state management, data fetching, and caching; React hooks for local component state. No global state management library.
**UI Component System**: shadcn/ui with Radix UI primitives, Material Design 3 principles, Tailwind CSS for utility-first styling, dark mode support.
**Design System**: Inter font for UI, JetBrains Mono for codes; Tailwind's spacing scale; responsive grid systems, sidebar navigation, max-width containers. Healthcare-specific patterns like timelines and status badges.
**Data Visualization**: Recharts library for dashboards and analytics.

### Backend Architecture

**Server Framework**: Express.js with TypeScript on Node.js, RESTful API design with JSON responses, middleware for logging, JSON parsing, and error handling.
**Database Layer**: PostgreSQL (primary) or SQLite (temporary) with Drizzle ORM for type-safe queries and migrations. Schema-first design with Zod validation.
**Data Access Pattern**: Storage abstraction layer (`server/storage.ts`) using a repository pattern with interface-based contracts.
**API Structure**: Resource-based RESTful endpoints for managing citizens, appointments, consultations, prescriptions, medications, exams, TFD, queues, health units, professionals, reports, and territorial management (dwellings, families, home visits).
**Security & Access Control**:
-   **Authentication**: Password-based authentication with bcrypt hashing, session-based authentication via express-session with secure cookies, global API route protection.
-   **Authorization (RBAC)**: Role-based access control with 7 user roles (admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao), dynamic menu filtering based on role, permission matrix, user context hook (`useCurrentUser()`).

### Development & Deployment

**Development Workflow**: Hot module replacement via Vite, TypeScript compilation, ESM module system, environment-based configuration.
**Build Process**: Frontend built with Vite to `dist/public`, backend bundled with esbuild to `dist/index.js`.
**Hosting Platform**: Replit-optimized with custom plugins, Node.js platform, port 5000.
**Session Management**: MemoryStore for temporary session storage (will migrate to PostgreSQL session store).

## External Dependencies

### Third-Party Services

**Database**:
-   SQLite (local, temporary, `saude.db`, 28KB, minimal schema with `users` and `health_units` tables).
-   PostgreSQL (intended primary database).

**e-SUS APS Integration**:
-   Export module (`server/integrations/esus/`) for Brazilian national healthcare system compliance.
-   Uses Zod schemas for data conformity and mapping documentation for database-to-e-SUS field transformation (e.g., Citizen data, consultations).

### Key NPM Packages

**UI & Interaction**: `@radix-ui/*`, `recharts`, `cmdk`, `date-fns`/`dayjs`, `lucide-react`.
**Forms & Validation**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
**Styling**: `tailwindcss`, `tailwind-merge`, `class-variance-authority`, `clsx`.
**Build & Development Tools**: `vite`, `tsx`, `esbuild`, `vitest`, `drizzle-kit`.

### Browser APIs & Fonts

**Google Fonts**: Inter (UI font), JetBrains Mono (monospace for codes).
**Accessibility Considerations**: ARIA labels, keyboard navigation, screen reader compatibility, focus management.