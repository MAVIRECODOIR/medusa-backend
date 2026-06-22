import { Module } from "@medusajs/framework/utils";
import PreOrderService from "./service";

export default Module("pre_order", {
  service: PreOrderService,
});
