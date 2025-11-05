# Design Guidelines - PEC Integrado Municipal
## Sistema de Gestão de Saúde Pública

### Design Approach
**Framework:** Material Design 3 with healthcare-specific adaptations
**Rationale:** Healthcare systems demand clarity, consistency, and established patterns for critical medical data. Material Design provides robust component libraries, accessibility standards, and proven interaction models essential for clinical environments.

**Reference Systems:** Google Health, Epic MyChart, athenahealth - analyze their dashboard layouts, data density management, and clinical workflow patterns.

---

## Core Design Elements

### A. Typography
**Primary Font:** Inter (Google Fonts CDN)
- Headings: 600 weight, sizes 24px (h1), 20px (h2), 18px (h3)
- Body text: 400 weight, 15px (high legibility for medical data)
- Data labels: 500 weight, 14px (patient info, vitals)
- Small text: 400 weight, 13px (timestamps, secondary info)
- Monospace for IDs/codes: JetBrains Mono, 14px (CPF, CNS, CID-10)

### B. Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, h-8, py-12, space-y-16)
**Container Strategy:**
- Dashboard: Full-width with max-w-7xl inner container
- Forms/Records: max-w-4xl centered for optimal reading
- Sidebar navigation: Fixed 256px width (64 Tailwind units)
- Content area: Fluid with responsive padding (px-6 lg:px-12)

**Grid Patterns:**
- Patient cards: grid-cols-1 md:grid-cols-2 xl:grid-cols-3
- Dashboard metrics: grid-cols-2 md:grid-cols-4
- Clinical data tables: Full-width with horizontal scroll on mobile
- Form layouts: 2-column (lg:grid-cols-2) for efficient data entry

### C. Component Library

**Navigation:**
- Persistent sidebar with icon + label for main sections (Prontuários, Agendamentos, Farmácia, TFD, Relatórios)
- Top bar with user profile, notifications, quick search, and unit selector
- Breadcrumbs for deep navigation contexts
- Tabs for sub-sections within modules

**Data Display:**
- Cards with subtle elevation (shadow-sm) for patient summaries, appointment blocks
- Tables with alternating row backgrounds, fixed headers, sortable columns
- Timeline view for clinical history (vertical with connecting lines)
- Badge components for status (Agendado, Confirmado, Atendido, Cancelado)
- Stat cards for dashboard metrics (large number + trend indicator + icon)

**Forms:**
- Grouped fieldsets with clear section headers
- Inline validation with helper text
- Required field indicators (*)
- Multi-step forms with progress indicator for complex workflows (TFD, new patient)
- Autocomplete for medications, CID-10 codes, professional names
- Date/time pickers with calendar overlay

**Clinical Components:**
- Vital signs grid (compact 3-4 column layout: PA, FC, Temp, Peso)
- Prescription builder with medication search + dosage + duration
- Diagnosis selector with CID-10 search and favorites
- Document upload zone with preview for exam results/images

**Overlays:**
- Modal dialogs for confirmations, quick forms (max-w-2xl)
- Slide-over panels from right for detailed records (w-96 or w-1/3)
- Toast notifications (top-right) for success/error feedback
- Loading states with skeleton screens for data-heavy views

**Buttons:**
- Primary: Solid background for main actions (Salvar, Confirmar)
- Secondary: Outlined for secondary actions (Cancelar, Voltar)
- Tertiary: Text-only for low-priority actions
- Icon buttons for quick actions in tables (edit, delete, view)
- Floating action button for new record entry (bottom-right on mobile)

### D. Animations
**Minimal, purposeful motion:**
- Fade transitions for modal/overlay entry (200ms)
- Slide transitions for sidebar/panels (250ms ease-out)
- Subtle scale on card hover (scale-[1.01])
- NO complex scroll animations or decorative motion
- Loading spinners for async operations

---

## Application-Specific Patterns

### Dashboard Layout
- Top metrics row (4 stat cards: Atendimentos Hoje, Fila de Espera, Estoque Crítico, Cobertura)
- Charts section (2-column: Atendimentos por Semana line chart + Atendimentos por Tipo pie/donut)
- Recent activity table below charts
- Right sidebar with quick actions and alerts

### Prontuário (EHR) View
- Left: Patient summary card (photo, name, age, CNS, alerts)
- Center: Tab-based content (Histórico, Consultas, Exames, Prescrições)
- Timeline view for historical data with collapsible entries
- Floating action for new consultation

### Agendamento Interface
- Calendar view (week/month toggle) with color-coded appointments by type
- Side panel for appointment details and quick booking
- Filter by professional, unit, specialty

### Farmácia Module
- Search bar with medication autocomplete
- Inventory table with stock levels, expiration dates, alert icons
- Dispensation form linked to patient prescriptions
- Stock movement history

### Messaging Center
- Inbox-style layout with threaded conversations
- Template selector for common messages (lembrete consulta, vacinação)
- Send status indicators (enviado, lido, falha)

---

## Accessibility & Compliance
- WCAG 2.1 AA contrast ratios throughout
- Keyboard navigation for all interactive elements
- ARIA labels for icons and complex components
- Focus indicators (ring-2 ring-offset-2)
- Form labels always visible (no placeholder-only patterns)
- Audit log indicator on sensitive data views

---

## Icons
**Library:** Heroicons (via CDN)
- Use outline style for navigation/general UI
- Use solid style for active states and emphasis
- Consistent sizing: 20px (w-5 h-5) for inline, 24px (w-6 h-6) for standalone