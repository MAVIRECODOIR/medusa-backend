import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260618205612 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "interest_registration" ("id" text not null, "email" text not null, "product_id" text not null, "variant_id" text null, "notified_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "interest_registration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_interest_registration_deleted_at" ON "interest_registration" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "interest_registration" cascade;`);
  }

}
