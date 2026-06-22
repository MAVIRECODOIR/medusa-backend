import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "support_ticket" (
        "id" text not null,
        "customer_name" text not null,
        "customer_email" text not null,
        "subject" text not null,
        "message" text not null,
        "priority" text not null default 'medium',
        "status" text not null default 'open',
        "assignee" text null,
        "order_id" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "support_ticket_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_support_ticket_deleted_at" ON "support_ticket" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_support_ticket_email" ON "support_ticket" ("customer_email");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_support_ticket_status" ON "support_ticket" ("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_support_ticket_priority" ON "support_ticket" ("priority");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "support_ticket" cascade;`);
  }
}
