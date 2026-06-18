import { Module } from "@medusajs/framework/utils"
import StockInterestService from "./service"

export default Module("stock_interest", {
  service: StockInterestService,
})
