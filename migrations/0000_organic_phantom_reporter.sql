CREATE TABLE `ai_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`user_role` text NOT NULL,
	`operation` text NOT NULL,
	`input_data` text,
	`success` integer NOT NULL,
	`error_code` text,
	`error_message` text,
	`completion_tokens` integer,
	`latency_ms` integer,
	`citizen_id` text,
	`consultation_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`appointment_date` integer NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`ticket` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`arrived_at` integer DEFAULT (unixepoch()) NOT NULL,
	`called_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `citizens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf` text NOT NULL,
	`cns` text,
	`rg` text,
	`birth_date` integer NOT NULL,
	`gender` text NOT NULL,
	`mother_name` text,
	`father_name` text,
	`phone` text,
	`email` text,
	`address` text NOT NULL,
	`neighborhood` text,
	`city` text DEFAULT 'Cardeal da Silva' NOT NULL,
	`state` text DEFAULT 'BA' NOT NULL,
	`zip_code` text,
	`unit_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `citizens_cpf_unique` ON `citizens` (`cpf`);--> statement-breakpoint
CREATE UNIQUE INDEX `citizens_cns_unique` ON `citizens` (`cns`);--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`appointment_id` text,
	`consultation_date` integer NOT NULL,
	`type` text NOT NULL,
	`subjective` text,
	`objective` text,
	`assessment` text,
	`plan` text,
	`vital_signs` text,
	`ciap2_codes` text,
	`cid10_codes` text,
	`chief_complaint` text,
	`history_of_present_illness` text,
	`physical_exam` text,
	`diagnosis` text,
	`treatment_plan` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `dwellings` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`microarea` text NOT NULL,
	`address` text NOT NULL,
	`number` text,
	`complement` text,
	`neighborhood` text NOT NULL,
	`zip_code` text,
	`latitude` real,
	`longitude` real,
	`dwelling_type` text DEFAULT 'casa' NOT NULL,
	`sanitation` text,
	`water_supply` text,
	`has_electricity` integer DEFAULT true,
	`has_animals` integer DEFAULT false,
	`families_count` integer DEFAULT 1,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `endemic_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`name` text NOT NULL,
	`cycle_type` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`target_microareas` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`total_dwellings` integer DEFAULT 0,
	`visited_dwellings` integer DEFAULT 0,
	`foci_found` integer DEFAULT 0,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `esus_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`cnes` text NOT NULL,
	`ine` text,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`records_count` integer NOT NULL,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`consultation_id` text,
	`exam_type` text NOT NULL,
	`request_date` integer NOT NULL,
	`result_date` integer,
	`status` text DEFAULT 'requested' NOT NULL,
	`result` text,
	`observations` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fad_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`dwelling_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`visit_date` integer NOT NULL,
	`dwelling_inspected` integer DEFAULT true NOT NULL,
	`dwelling_closed` integer DEFAULT false,
	`dwelling_refused` integer DEFAULT false,
	`residents_count` integer,
	`containers_inspected` integer DEFAULT 0,
	`containers_with_larvae` integer DEFAULT 0,
	`containers_eliminated` integer DEFAULT 0,
	`larvicide_applied` integer DEFAULT false,
	`larvicide_type` text,
	`observations` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `endemic_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dwelling_id`) REFERENCES `dwellings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`dwelling_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`family_code` text NOT NULL,
	`head_of_family_id` text,
	`monthly_income` real,
	`benefits_received` text,
	`members_count` integer DEFAULT 1,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dwelling_id`) REFERENCES `dwellings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`head_of_family_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`relationship_type` text DEFAULT 'outro' NOT NULL,
	`is_head_of_family` integer DEFAULT false NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	`left_at` integer,
	`notes` text,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `focal_treatments` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text,
	`dwelling_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`treatment_date` integer NOT NULL,
	`treatment_type` text NOT NULL,
	`product_used` text NOT NULL,
	`dosage` text,
	`target_area` real,
	`containers_count` integer DEFAULT 0,
	`reinspection_date` integer,
	`reinspected` integer DEFAULT false,
	`effectiveness` text DEFAULT 'pending',
	`observations` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `endemic_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dwelling_id`) REFERENCES `dwellings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `foci` (
	`id` text PRIMARY KEY NOT NULL,
	`fad_id` text NOT NULL,
	`dwelling_id` text NOT NULL,
	`deposit_type` text NOT NULL,
	`deposit_description` text NOT NULL,
	`larvae_found` integer DEFAULT true NOT NULL,
	`pupae_found` integer DEFAULT false,
	`action_taken` text NOT NULL,
	`larvicide_applied` text,
	`quantity` integer DEFAULT 1,
	`latitude` real,
	`longitude` real,
	`photo_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`fad_id`) REFERENCES `fad_evaluations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dwelling_id`) REFERENCES `dwellings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `health_units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cnes` text NOT NULL,
	`address` text NOT NULL,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_units_cnes_unique` ON `health_units` (`cnes`);--> statement-breakpoint
CREATE TABLE `home_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`dwelling_id` text NOT NULL,
	`family_id` text,
	`professional_id` text NOT NULL,
	`visit_date` integer NOT NULL,
	`visit_type` text NOT NULL,
	`visit_motive` text,
	`findings` text,
	`actions` text,
	`referrals` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dwelling_id`) REFERENCES `dwellings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medication_stock` (
	`id` text PRIMARY KEY NOT NULL,
	`medication_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`batch_number` text NOT NULL,
	`quantity` integer NOT NULL,
	`min_stock` integer DEFAULT 10 NOT NULL,
	`expiration_date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`generic_name` text,
	`manufacturer` text,
	`presentation` text NOT NULL,
	`concentration` text,
	`unit_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_id` text,
	`citizen_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`medication` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`duration` text NOT NULL,
	`quantity` integer NOT NULL,
	`instructions` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cpf` text NOT NULL,
	`cns` text,
	`specialty` text NOT NULL,
	`council_type` text NOT NULL,
	`council_number` text NOT NULL,
	`council_state` text NOT NULL,
	`phone` text,
	`email` text,
	`unit_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `professionals_cpf_unique` ON `professionals` (`cpf`);--> statement-breakpoint
CREATE TABLE `tfd_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`request_date` integer NOT NULL,
	`travel_date` integer,
	`return_date` integer,
	`destination` text NOT NULL,
	`reason` text NOT NULL,
	`procedure` text,
	`accompanied_by` text,
	`companion` integer DEFAULT false,
	`transport_type` text,
	`justification` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`observations` text,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`citizen_id`) REFERENCES `citizens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`cpf` text,
	`role` text DEFAULT 'recepcao' NOT NULL,
	`unit_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `health_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);