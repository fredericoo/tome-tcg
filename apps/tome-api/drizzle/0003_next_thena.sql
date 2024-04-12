ALTER TABLE decks ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE decks ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE TRIGGER [UPDATE_DT]
    AFTER UPDATE ON decks FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at OR OLD.updated_at IS NULL
BEGIN
    UPDATE decks SET updated_at=CURRENT_TIMESTAMP WHERE id=NEW.id;
END;