import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import { Shippo } from "shippo"
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import type { CalculateShippingOptionPriceDTO } from "@medusajs/framework/types"

type InjectedDependencies = {
  logger: any
}

type Options = {
  apiKey: string
  originAddress?: {
    name: string
    company?: string
    street1: string
    street2?: string
    city: string
    state: string
    zip: string
    country: string
    phone?: string
    email?: string
  }
  defaultCarriers?: string[]
}

class ShippoFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "shippo"

  protected logger_: any
  protected shippoClient: any
  protected options_: Options

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.shippoClient = new Shippo({
      apiKeyHeader: options.apiKey,
    })
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    try {
      const carriers = await this.shippoClient.carrierAccounts.list({})
      const results = carriers.results || []
      if (results.length > 0) {
        return results.map((carrier: any) => ({
          id: `shippo_${carrier.carrier}`,
          name: carrier.carrier,
          carrier: carrier.carrier,
          account_id: carrier.objectId,
        }))
      }
    } catch (error: any) {
      this.logger_.warn(
        `Shippo getFulfillmentOptions: could not fetch carriers (${error.message}), using defaults`
      )
    }

    const carriers = this.options_.defaultCarriers ?? ["usps", "fedex", "ups", "dhl_express"]
    return carriers.map((c) => ({
      id: `shippo_${c}`,
      name: c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      carrier: c,
    }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<any> {
    return { ...data, ...optionData }
  }

  async canCalculate(): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const shippingAddress = context.shipping_address as Record<string, any> | undefined
    if (!shippingAddress?.address_1 || !shippingAddress?.country_code) {
      this.logger_.warn("Shippo calculatePrice: shipping address incomplete, returning 0")
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    const parcels = this.buildParcels_(context)
    if (parcels.length === 0) {
      this.logger_.warn("Shippo calculatePrice: no parcels to ship, returning 0")
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    const origin = this.options_.originAddress
    if (!origin) {
      this.logger_.warn("Shippo calculatePrice: no origin address configured, returning 0")
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    try {
      const shipment = await this.shippoClient.shipments.create({
        addressFrom: origin,
        addressTo: {
          name: `${shippingAddress.first_name ?? ""} ${shippingAddress.last_name ?? ""}`.trim() || "Customer",
          street1: shippingAddress.address_1,
          street2: shippingAddress.address_2,
          city: shippingAddress.city,
          state: shippingAddress.province,
          zip: shippingAddress.postal_code,
          country: shippingAddress.country_code.toUpperCase(),
          phone: shippingAddress.phone,
          email: context.email,
        },
        parcels,
        async: false,
      })

      const carrierFilter = (optionData.carrier as string || "").toLowerCase()
      const rates = (shipment.rates || [])
        .filter((r: any) => !carrierFilter || r.provider.toLowerCase() === carrierFilter)
        .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))

      if (rates.length > 0) {
        return {
          calculated_amount: parseFloat(rates[0].amount),
          is_calculated_price_tax_inclusive: false,
        }
      }

      this.logger_.warn(`Shippo calculatePrice: no rates for carrier "${carrierFilter}"`)
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    } catch (error: any) {
      this.logger_.error(`Shippo calculatePrice error: ${error.message}`)
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<CreateFulfillmentResult> {
    try {
      return {
        data: { ...(fulfillment.data as object || {}), shippo_data: data },
        labels: [],
      }
    } catch (error: any) {
      this.logger_.error(`Shippo createFulfillment error: ${error.message}`)
      throw error
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    return {}
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  private buildParcels_(context: any): any[] {
    if (!context.items?.length) {
      return [{ weight: 1, mass_unit: "lb", length: 10, width: 10, height: 10, distance_unit: "in" }]
    }
    return context.items
      .filter((item: any) => item.variant)
      .map((item: any) => ({
        weight: item.variant.weight || 1,
        length: item.variant.length || 10,
        height: item.variant.height || 10,
        width: item.variant.width || 10,
        mass_unit: "lb",
        distance_unit: "in",
        quantity: item.quantity,
      }))
  }
}

export default ShippoFulfillmentService
