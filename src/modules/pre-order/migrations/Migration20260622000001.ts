import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pre_order" (
        "id" text not null,
        "email" text not null,
        "product_id" text not null,
        "product_title" text null,
        "variant_id" text null,
        "variant_title" text null,
        "quantity" integer not null default 1,
        "deposit" integer not null default 0,
        "total" integer not null default 0,
        "currency_code" text not null default 'ZAR',
        "status" text not null default 'awaiting_deposit',
        "eta" timestamptz null,
        "notes" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "pre_order_pkey" primary key ("id")
      );
    `);
    this.addSql(`ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz null;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_pre_order_deleted_at" ON "pre_order" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_pre_order_email" ON "pre_order" ("email");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_pre_order_product" ON "pre_order" ("product_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_pre_order_status" ON "pre_order" ("status");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pre_order" cascade;`);
  }
}
