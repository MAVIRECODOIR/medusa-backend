import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000003 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_pre_order_deleted_at" ON "pre_order" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "pre_order" DROP COLUMN IF EXISTS "deleted_at";`);
  }
}
