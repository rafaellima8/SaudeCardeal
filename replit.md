# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a streamlined municipal health management system designed for Cardeal da Silva, Bahia, Brazil. The system focuses on core healthcare functionalities: patient management, electronic prescriptions with RENAME catalog integration, pharmacy management with stock control, and inter-municipal patient transport (TFD - Tratamento Fora do Domicílio).

## Current Modules

### Active Modules
- **Patient Management**: Citizen registration with CPF/CNS, demographic data, and health unit association
- **Electronic Prescriptions**: Full prescription management with Portaria 344/98 controlled substance tracking, dosage calculations, and PDF export
- **Pharmacy Management**: 
  - RENAME catalog with 29+ essential medications
  - Medication stock control with low stock alerts and expiration tracking
  - Diaper stock control with FIFO, lot tracking, and 10 sizes (RN, P, M, G, XG, XXG, geriatrica_P/M/G/XG)
  - Dispensation workflow linked to prescriptions
- **TFD (Inter-municipal Transport)**: Complete vehicle, driver, trip, and passenger management for patient transport
  - SUS compliance layer with Portaria SAS/MS nº 55/1999 adherence
  - SIGTAP TFD catalog integration (08.03.01.xxx transport procedure codes)
  - BPA-I and APAC TXT export for SIA/SUS submission
  - 50km minimum distance enforcement
  - CID-10 diagnosis, IBGE municipality codes, and race/ethnicity fields
  - APAC authorization tracking
- **Social Assistance (Assistência Social)**:
  - Beneficiary management (NIS, CPF, address, family composition)
  - Diaper request and authorization workflow
  - Delivery management with FIFO stock allocation
  - Monthly list CSV upload for batch processing
  - Demand forecasting
  - Integration with Pharmacy diaper stock
  - Full audit logging

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
- Role-Based Access Control (RBAC) for 8 user roles: admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao, assistencia_social
- Multi-tenant isolation via `enforceUnitScope()` middleware
- Cross-unit access for admin and gestor roles only

## Key Files

### Backend
- `server/index.ts` - Application entry point
- `server/routes.ts` - API endpoints (auth, citizens, prescriptions, pharmacy, TFD)
- `server/storage.ts` - Data access layer with IStorage interface
- `server/auth.ts` - Authentication and multi-tenant security
- `server/services/pdf-generator.ts` - Prescription PDF generation
- `server/services/sus-validators.ts` - SUS compliance validators (CPF, CNS, CID-10, IBGE)
- `server/services/sigtap-tfd.ts` - SIGTAP TFD catalog and value calculation
- `server/services/tfd-pdf-generator.ts` - BPA-I and APAC PDF generation
- `server/services/tfd-export-service.ts` - BPA/APAC TXT export for SIA/SUS

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

### Diaper Stock (Pharmacy Module)
- `GET/POST /api/pharmacy/diaper-stock` - Diaper stock management
- `GET /api/pharmacy/diaper-stock/:id` - Get specific stock item
- `PATCH/DELETE /api/pharmacy/diaper-stock/:id` - Update/Delete stock
- `GET /api/pharmacy/diaper-stock/low` - Low stock alerts
- `GET /api/pharmacy/diaper-stock/expiring` - Expiring items
- `GET /api/pharmacy/diaper-stock/fifo/:size` - FIFO allocation by size
- `GET /api/pharmacy/diaper-movements` - Stock movements history

### Social Assistance
- `GET/POST /api/social-assistance/beneficiaries` - Beneficiary management
- `GET/PATCH/DELETE /api/social-assistance/beneficiaries/:id` - CRUD operations
- `GET /api/social-assistance/beneficiaries/cpf/:cpf` - Find by CPF
- `GET/POST /api/social-assistance/requests` - Diaper requests
- `GET/PATCH/DELETE /api/social-assistance/requests/:id` - CRUD operations
- `GET/POST /api/social-assistance/authorizations` - Authorization management
- `GET/PATCH /api/social-assistance/authorizations/:id` - CRUD operations
- `GET/POST /api/social-assistance/deliveries` - Delivery management
- `GET /api/social-assistance/deliveries/:id` - Get delivery details
- `GET/POST /api/social-assistance/monthly-lists` - Monthly list upload
- `GET/PATCH /api/social-assistance/monthly-lists/:id` - CRUD operations
- `GET /api/social-assistance/stats` - Module statistics

### TFD
- `GET/POST /api/tfd/requests` - Transport requests
- `GET/POST /api/tfd/vehicles` - Vehicle management
- `GET/POST /api/tfd/drivers` - Driver management
- `GET/POST /api/tfd/trips` - Trip management

### TFD SUS Compliance
- `GET /api/tfd/sigtap` - SIGTAP TFD procedure catalog
- `POST /api/tfd/calculate` - Calculate SIGTAP values for distance
- `POST /api/tfd/validate` - Validate TFD request for SUS compliance
- `POST /api/tfd/requests/:id/pdf/bpa-i` - Generate BPA-I PDF
- `POST /api/tfd/requests/:id/pdf/apac` - Generate APAC laudo PDF
- `POST /api/tfd/trips/:id/pdf/report` - Generate trip report PDF
- `POST /api/tfd/exports/bpa` - Export BPA-I TXT for SIA/SUS
- `POST /api/tfd/exports/apac` - Export APAC TXT for SIA/SUS
- `POST /api/tfd/exports/bpa/pdf` - Generate printable BPA-I PDF form
- `POST /api/tfd/exports/bpa-c/pdf` - Generate printable BPA-C (Consolidado) PDF form
- `POST /api/tfd/exports/apac/pdf` - Generate printable APAC PDF form
- `GET /api/tfd/summary` - TFD module statistics

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

### Diaper Stock and Social Assistance Modules (Latest)
- Added "assistencia_social" role to users table enum for new module access control
- Created 9 new database tables:
  - diaper_stock: Diaper inventory with 10 sizes (RN, P, M, G, XG, XXG, geriatrica_P/M/G/XG)
  - diaper_stock_movements: Audit trail for stock changes
  - sa_beneficiaries: Social assistance beneficiaries with NIS, CPF, family data
  - diaper_requests: Request workflow management
  - diaper_authorizations: Authorization with quantity tracking
  - diaper_deliveries: Delivery records with stock allocation
  - diaper_monthly_lists: CSV upload for batch processing
  - diaper_demand_forecast: Predictive demand analytics
  - sa_audit_log: Comprehensive audit logging
- Implemented complete storage layer with CRUD operations
- Added FIFO stock allocation algorithm by expiration date
- Created API endpoints for both Pharmacy diaper stock and Social Assistance modules
- Bidirectional integration between Pharmacy and Social Assistance for stock management

### TFD Companion and Pernoite Enhancements
- Added conditional companion data collection fields:
  - companionCpf, companionCns, companionName (existing)
  - companionPhone (new) for contact information
  - companionJustification for medical justification
- Companion fields only appear when "Sim" is selected in the form
- Added pernoite (overnight stay) tracking:
  - pernoite boolean field
  - pernoiteQuantity for number of nights
  - pernoiteNotes for additional information
- Updated request details dialog to display companion and pernoite info
- Form state resets when dialog opens/closes

### Printable PDF Export for DATASUS BPA
- Added PDF export endpoints for printable forms:
  - `/api/tfd/exports/bpa/pdf` for BPA-I forms
  - `/api/tfd/exports/apac/pdf` for APAC laudo forms
- Changed export workflow from TXT to PDF:
  - Forms are now generated as pre-filled PDFs
  - User prints forms and manually enters data in DATASUS BPA system
- Updated SUS Exports Tab with clearer instructions

### TFD SUS Compliance Layer
- Enhanced tfdRequests schema with SUS compliance fields:
  - CID-10 primary/secondary diagnosis (cidPrimary, cidSecondary)
  - IBGE municipality codes (originIbgeCode, destinationIbgeCode)
  - SIGTAP procedure codes (sigtapCode, sigtapCompanionCode, sigtapValue)
  - APAC authorization tracking (apacAuthorizationNumber, apacStatus)
  - Patient demographics (patientRace, patientEthnicity, professionalCbo)
  - Distance tracking (distanceKm with 50km minimum enforcement)
  - SUS export tracking (susExported, susExportType, susExportBatch)
- Added SIGTAP TFD catalog table (sigtapTfdCatalog)
- Implemented SUS validators service for CPF, CNS, CID-10, IBGE validation
- Created BPA-I and APAC PDF generators following SUS regulatory layouts
- Developed TXT export service for SIA/SUS BPA and APAC formats
- Added frontend SusExportsTab with SIGTAP calculator and export functionality
- All TFD SUS endpoints now require authentication (enforceUnitScope)
- 50km minimum distance validation enforced per Portaria SAS/MS nº 55/1999

### Previous Refactoring
- Removed ACE/Endemic disease control module
- Removed Medical attendance/consultation workflow
- Removed Territory management
- Removed Clinical protocols
- Removed e-SUS export functionality
- Removed Appointment scheduling
- Simplified schema from ~2100 to ~800 lines
- Streamlined routes and storage layer
