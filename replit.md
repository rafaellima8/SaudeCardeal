# ArgoSaude - Sistema de Gestao em Saude Municipal

## Overview

ArgoSaude (v2.0.1) is a municipal health management SaaS system developed by **Argo Tech Brasil** for Cardeal da Silva, Bahia, Brazil. It aims to enhance efficiency, compliance, and data management for municipal health services by streamlining patient management, electronic prescriptions (with RENAME catalog integration), pharmacy management (medication and diaper stock control), inter-municipal patient transport (TFD) compliant with SUS regulations, Social Assistance for diaper requests, and SINAN for compulsory disease notification.

## User Preferences

I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture

The system employs a client-server architecture with a clear separation of concerns, utilizing modern web technologies and a modular design.

### Frontend
- **Technology**: React 18+ with TypeScript, Vite, Wouter (routing), TanStack Query v5.
- **UI/UX**: shadcn/ui and Radix UI components, styled with Tailwind CSS, including dark mode.
- **Branding**: ArgoSaude by Argo Tech Brasil (logo in sidebar footer)

### Backend
- **Technology**: Express.js with TypeScript, SQLite (Better-SQLite3), Drizzle ORM.
- **Authentication**: Session-based with bcrypt for password hashing.
- **Security**: Role-Based Access Control (RBAC) with 8 roles. Multi-tenant isolation enforced via `enforceUnitScope()` middleware.

### Active Modules (18 total)
1. **Dashboard** - KPIs, charts, system overview
2. **Pacientes** - Patient registration, demographics, health unit association
3. **Farmacia - Prescricoes** - Electronic prescriptions, Portaria 344/98 compliance
4. **Farmacia - Dispensacao** - Medication dispensing workflow
5. **Farmacia - Estoque** - RENAME catalog, medication stock (alerts, expiration)
6. **Farmacia - Fraldas** - Diaper stock (FIFO, lot tracking)
7. **TFD** - Inter-municipal transport, SUS compliance, BPA-I/APAC export
8. **Assistencia Social** - Beneficiary management, diaper requests, CSV upload
9. **SINAN** - 108 unique templates for 81 agravos, dynamic forms, PDF export
10. **Relatorios** - Standard reports and exports
11. **Formularios** - Dynamic form templates (automation)
12. **Workflows** - Approval state machines (automation)
13. **Alertas** - Event-driven notifications (automation)
14. **Relatorios Estrategicos** - ETL engine, Previne Brasil indicators (automation)
15. **Unidades** - Health unit management
16. **Profissionais** - Healthcare professional management
17. **Perfil** - User profile management
18. **Configuracoes** - System settings

### User Roles (8 roles)
| Role | Access |
|------|--------|
| admin | All modules |
| medico | Dashboard, Patients, Prescriptions, Reports |
| enfermeiro | Dashboard, Patients, Prescriptions, Reports |
| acs | Dashboard, Patients |
| farmaceutico | Dashboard, Pharmacy (all), Reports |
| gestor | Dashboard, Reports, Automation, TFD |
| recepcao | Dashboard, Patients |
| assistencia_social | Dashboard, Social Assistance, Reports |

## External Dependencies

- **RENAME Catalog**: Integrated for electronic prescription medication data
- **SUS Regulations**: Portaria 344/98 (prescriptions), Portaria SAS/MS nº 55/1999 (TFD), SIGTAP
- **DATASUS BPA System**: BPA-I and APAC TXT export format
- **IBGE**: Municipality codes for TFD
- **CID-10**: Diagnosis coding (45+ disease codes mapped)

## SINAN Template System

### Template Coverage
- **100% Coverage**: All 81 official SINAN agravos have dedicated templates
- **109 unique templates** covering 108 unique agravoCodes
- **25 Categories**: alimentares, arboviroses, bacterianas, congenitas, cronicas, endemicas, farmacovigilancia, hepatites, imunoprevenivel, infantil, infecciosas, intoxicacoes, ist, materna, meningites, nutricional, parasitarias, respiratorias, rickettsias, trabalho, vigilancia, violencia, violencias, virais, zoonoses
- **50 templates** with immediate notification deadline
- **59 templates** with weekly notification deadline
- **105 templates** with investigation form

### Template Files
- `shared/sinan/templates/` - 20 category-specific template files
- `shared/sinan/template-types.ts` - Type definitions + Zod validation
- `shared/sinan/registry.ts` - Coverage tracking
- `shared/sinan/agravos.ts` - 95 official agravo definitions

## Database Schema

- **77 tables** in SQLite with Drizzle ORM
- **Date storage**: Unix timestamps (seconds since epoch)
- **ID generation**: UUID v4 via generateId()

## Recent Changes (2025-12-08)

### Database Synchronization
- Synchronized schema.ts with SQLite database
- Added missing columns: `action_url`, `due_at`, `error_message`
- Removed 5 orphan tables with 0 records: `editais`, `ace_audit_logs`, `ace_dwellings`, `ace_foci`, `ace_visits`
- Deploy configuration: autoscale mode with `node dist/index.js`
- 89/89 E2E tests passing (100% approval)
- 0 LSP errors - clean codebase

### Cleanup Summary (2025-12-06)
- **Removed packages**: @neondatabase/serverless, connect-pg-simple, passport, passport-local, openid-client, @types/connect-pg-simple, @types/passport, @types/passport-local
- **Estimated savings**: ~535KB

## Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Administrador | admin@saude.gov.br | Admin@2025 |
| ACS | acs@saude.gov.br | Acs@2025 |
| Assistencia Social | assistente@saude.gov.br | Assistente@2025 |
| Farmaceutico | farmaceutico@saude.gov.br | Farmaceutico@2025 |

## File Structure

```
/
├── client/src/           # React frontend
│   ├── assets/           # Logo and images
│   ├── components/       # UI components
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── services/         # Business logic
│   └── routes.ts         # API endpoints
├── shared/               # Shared types
│   ├── schema.ts         # Drizzle schema (77 tables)
│   └── sinan/            # SINAN templates
├── modules/              # Automation modules
│   ├── alerts/           # Alert scheduler
│   ├── forms/            # Form engine
│   ├── reports/          # Strategic reports
│   └── workflow/         # Workflow engine
└── docs/                 # Technical documentation
```
