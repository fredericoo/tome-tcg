ALTER TABLE games ADD `cast_timeout_ms` integer DEFAULT 60000 NOT NULL;--> statement-breakpoint
ALTER TABLE games ADD `phase_delay_ms` integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE games ADD `starting_cards` integer DEFAULT 2 NOT NULL;