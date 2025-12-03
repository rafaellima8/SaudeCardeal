# MuniSaúde Integrado - Sistema de Gestão em Saúde Municipal

## Overview

MuniSaúde Integrado is a municipal health management system designed for Cardeal da Silva, Bahia, Brazil. Its purpose is to streamline core healthcare functionalities: patient management, electronic prescriptions (with RENAME catalog integration), pharmacy management (including stock control for medications and diapers), inter-municipal patient transport (TFD - Tratamento Fora do Domicílio) compliant with SUS regulations, Social Assistance for diaper requests and deliveries, and SINAN for compulsory disease notification. The system aims to enhance efficiency, compliance, and data management for municipal health services.

## User Preferences

I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

The system follows a client-server architecture with a clear separation of concerns.

### Frontend
- **Technology Stack**: React 18+ with TypeScript, Vite (build system), Wouter (routing), TanStack Query v5 (server state management).
- **UI/UX**: Utilizes shadcn/ui and Radix UI components, styled with Tailwind CSS, including dark mode support.

### Backend
- **Technology Stack**: Express.js with TypeScript, SQLite database (Better-SQLite3), Drizzle ORM for database interactions.
- **Authentication**: Session-based authentication using bcrypt for password hashing.
- **Security**: Role-Based Access Control (RBAC) with 8 distinct user roles (admin, medico, enfermeiro, acs, farmaceutico, gestor, recepcao, assistencia_social). Multi-tenant isolation is enforced via `enforceUnitScope()` middleware, with cross-unit access limited to admin and gestor roles.
- **Core Features Implemented**:
    - **Patient Management**: Citizen registration, demographic data, health unit association.
    - **Electronic Prescriptions**: Prescription management, Portaria 344/98 compliance, dosage calculations, PDF export.
    - **Pharmacy Management**: RENAME catalog integration, medication stock control (low stock alerts, expiration tracking), diaper stock control (FIFO, lot tracking for 10 sizes), dispensation linked to prescriptions.
    - **TFD (Inter-municipal Transport)**: Vehicle, driver, trip, and passenger management. Includes SUS compliance (Portaria SAS/MS nº 55/1999), SIGTAP TFD catalog integration, BPA-I and APAC TXT export for SIA/SUS submission, 50km minimum distance enforcement, CID-10 diagnosis, IBGE municipality codes, and APAC authorization tracking. Features companion data collection and pernoite (overnight stay) tracking.
    - **Social Assistance**: Beneficiary management, diaper request/authorization workflow, delivery management (FIFO stock allocation), monthly list CSV upload for batch processing, demand forecasting, integration with Pharmacy diaper stock, and full audit logging.
    - **SINAN (Sistema de Informação de Agravos de Notificação)**: Official notification forms for 36 compulsory diseases, epidemiological week calculation, patient demographic data (SUS fields), clinical evolution and hospitalization tracking, classification criteria, investigation workflow, lab exam results integration, and export batch management for SUS submission. All endpoints use Zod validation.

### System Design Choices
- **Database**: SQLite for simplicity and embedded use, managed by Drizzle ORM for type-safe and efficient data access.
- **Modularity**: The system is organized into distinct modules (Patient, Prescriptions, Pharmacy, TFD, Social Assistance, SINAN), each with its own routes and services.
- **Validation**: Extensive use of Zod for data validation on both frontend and backend to ensure data integrity and compliance.
- **PDF Generation**: Dedicated services for generating compliant PDF documents for prescriptions, TFD reports (BPA-I, APAC), and Social Assistance documents (authorizations, donation terms, delivery receipts).

## External Dependencies

- **RENAME Catalog**: Integrated for electronic prescription medication data.
- **SUS (Sistema Único de Saúde) Regulations**: Compliance with various SUS regulations and ordinances, including Portaria 344/98 (prescriptions), Portaria SAS/MS nº 55/1999 (TFD), and SIGTAP (TFD procedure codes).
- **DATASUS BPA System**: For exporting BPA-I and APAC data in TXT format for submission, and for generating printable PDF forms to be manually entered into the system.
- **IBGE (Brazilian Institute of Geography and Statistics)**: Used for municipality codes in TFD.
- **CID-10 (International Classification of Diseases, 10th Revision)**: Used for diagnosis coding.