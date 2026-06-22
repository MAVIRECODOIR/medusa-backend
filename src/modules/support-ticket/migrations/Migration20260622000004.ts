import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000004 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "support_ticket" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_support_ticket_deleted_at" ON "support_ticket" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "support_ticket" DROP COLUMN IF EXISTS "deleted_at";`);
  }
}
