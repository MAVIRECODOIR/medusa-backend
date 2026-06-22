import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000005 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "audit_log" (
        "id" text not null,
        "action" text not null,
        "entity_type" text not null,
        "entity_id" text null,
        "user_id" text null,
        "user_role" text null,
        "details" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "audit_log_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_audit_log_entity" ON "audit_log" ("entity_type", "entity_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_audit_log_user" ON "audit_log" ("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_audit_log_created" ON "audit_log" ("created_at");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);
  }
}
