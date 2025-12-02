# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a streamlined municipal health management system designed for Cardeal da Silva, Bahia, Brazil. The system focuses on core healthcare functionalities: patient management, electronic prescriptions with RENAME catalog integration, pharmacy management with stock control, and inter-municipal patient transport (TFD - Tratamento Fora do Domicílio).

## Current Modules

### Active Modules
- **Patient Management**: Citizen registration with CPF/CNS, demographic data, and health unit association
- **Electronic Prescriptions**: Full prescription management with Portaria 344/98 controlled substance tracking, dosage calculations, and PDF export
- **Pharmacy Management**: 
  - RENAME catalog with 29+ essential medications
  - Stock control with low stock alerts and expiration tracking
  - Dispensation workflow linked to prescriptions
- **TFD (Inter-municipal Transport)**: Complete vehicle, driver, trip, and passenger management for patient transport

### Removed Modules (Refactored Out)
- Endemic Disease Control (ACE)
- Medical Attendance/Consultations (SOAP)
- Territory Management (Dwellings, Visits)
- Clinical Protocols
- e-SUS APS Export
- Appointment Scheduling
- Medical Referrals

## System Architecture

### Frontend
- React 18+ with TypeScript
- Vite build system
- Wouter for routing
- TanStack Query v5 for server state
- shadcn/ui + Radix UI components
- Tailwind CSS with dark mode support

### Backend
- Express.js with TypeScript
- SQLite database (Better-SQLite3)
- Drizzle ORM for database management
- Session-based authentication with bcrypt

### Security
- Role-Based Access Control (RBAC) for 7 user roles: admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao
- Multi-tenant isolation via `enforceUnitScope()` middleware
- Cross-unit access for admin and gestor roles only

## Key Files

### Backend
- `server/index.ts` - Application entry point
- `server/routes.ts` - API endpoints (auth, citizens, prescriptions, pharmacy, TFD)
- `server/storage.ts` - Data access layer with IStorage interface
- `server/auth.ts` - Authentication and multi-tenant security
- `server/services/pdf-generator.ts` - Prescription PDF generation

### Frontend
- `client/src/App.tsx` - Main routing and layout
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/pages/` - Page components

### Shared
- `shared/schema.ts` - Drizzle ORM schema with Zod validation

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user info
- `PATCH /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Citizens
- `GET/POST /api/citizens` - List/Create citizens
- `GET/PATCH/DELETE /api/citizens/:id` - CRUD operations

### Prescriptions
- `GET/POST /api/prescriptions` - List/Create prescriptions
- `GET/PATCH/DELETE /api/prescriptions/:id` - CRUD operations
- `GET /api/prescriptions/:id/pdf` - Generate PDF

### Pharmacy
- `POST /api/pharmacy/dispense` - Dispense medication
- `GET /api/pharmacy/dispensations` - List dispensations
- `GET/POST /api/pharmacy/stock` - Stock management
- `GET /api/pharmacy/stock/low` - Low stock alerts
- `GET /api/pharmacy/stock/expiring` - Expiring items
- `POST/GET /api/pharmacy/stock-movements` - Stock movements
- `GET /api/rename-catalog` - RENAME medication catalog

### TFD
- `GET/POST /api/tfd/requests` - Transport requests
- `GET/POST /api/tfd/vehicles` - Vehicle management
- `GET/POST /api/tfd/drivers` - Driver management
- `GET/POST /api/tfd/trips` - Trip management

## Development

### Running the Application
```bash
npm run dev
```
The application runs on port 5000 with Express backend and Vite frontend.

### Database
SQLite database with automatic seeding of:
- Default health unit (UBS Centro - Cardeal da Silva)
- Admin user (admin@munisaude.com / admin123)
- ACS user (acs@munisaude.com / acs123)

## Recent Changes (December 2025)

### Refactoring
- Removed ACE/Endemic disease control module
- Removed Medical attendance/consultation workflow
- Removed Territory management
- Removed Clinical protocols
- Removed e-SUS export functionality
- Removed Appointment scheduling
- Simplified schema from ~2100 to ~800 lines
- Streamlined routes and storage layer
