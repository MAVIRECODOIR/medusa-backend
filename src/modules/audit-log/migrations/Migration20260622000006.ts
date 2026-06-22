import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000006 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_audit_log_deleted_at" ON "audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "deleted_at";`);
  }
}
