import { model } from "@medusajs/framework/utils";

const PreOrder = model.define("pre_order", {
  id: model.id({ prefix: "preord" }).primaryKey(),
  email: model.text(),
  product_id: model.text(),
  product_title: model.text().nullable(),
  variant_id: model.text().nullable(),
  variant_title: model.text().nullable(),
  quantity: model.number().default(1),
  deposit: model.number().default(0),
  total: model.number().default(0),
  currency_code: model.text().default("ZAR"),
  status: model.text().default("awaiting_deposit"),
  eta: model.dateTime().nullable(),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
});

export default PreOrder;
