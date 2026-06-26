import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import { Shippo } from "shippo"
import type {
  CreateFulfillmentResult,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"

type InjectedDependencies = {
  logger: any
}

type Options = {
  apiKey: string
  originAddress: {
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
      const carriers = await this.shippoClient.carrierAccounts.list({
        service_levels: true,
      })
      const results = carriers.results || []
      const options: FulfillmentOption[] = []

      for (const carrier of results.filter((c: any) => c.active)) {
        const serviceLevels = carrier.serviceLevels || carrier.service_levels || []
        for (const sl of serviceLevels) {
          options.push({
            id: `shippo_${carrier.carrier}_${sl.token}`,
            name: `${carrier.carrier_name || carrier.carrier} — ${sl.name}`,
            carrier: carrier.carrier,
            service_level: sl.token,
            account_id: carrier.objectId,
          })
        }
      }

      if (options.length > 0) return options
    } catch (error: any) {
      this.logger_.warn(
        `Shippo getFulfillmentOptions: could not fetch carriers (${error.message}), using defaults`
      )
    }

    const defaultCarriers = this.options_.defaultCarriers ?? ["usps", "fedex", "ups", "dhl_express"]
    return defaultCarriers.map((c) => ({
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
    return false
  }

  async calculatePrice(): Promise<any> {
    throw new Error("Shippo fulfillment does not support price calculation")
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
    const origin = this.options_.originAddress
    const shippingAddress = order?.shipping_address
    if (!origin || !shippingAddress?.address_1) {
      this.logger_.warn("Shippo createFulfillment: missing origin or shipping address, skipping label")
      return { data: { ...(fulfillment.data as object || {}) }, labels: [] }
    }

    try {
      const parcels = (items || []).length > 0
        ? items.map((item: any) => ({
            weight: item.weight || 1,
            length: item.length || 10,
            height: item.height || 10,
            width: item.width || 10,
            mass_unit: "lb",
            distance_unit: "in",
            quantity: item.quantity || 1,
          }))
        : [{ weight: 1, mass_unit: "lb", length: 10, width: 10, height: 10, distance_unit: "in" }]

      const shipment = await this.shippoClient.shipments.create({
        addressFrom: origin,
        addressTo: {
          name: `${shippingAddress.first_name ?? ""} ${shippingAddress.last_name ?? ""}`.trim() || "Customer",
          street1: shippingAddress.address_1,
          street2: shippingAddress.address_2,
          city: shippingAddress.city,
          state: shippingAddress.province,
          zip: shippingAddress.postal_code,
          country: (shippingAddress.country_code || "GB").toUpperCase(),
          phone: shippingAddress.phone,
          email: order?.email,
        },
        parcels,
        async: false,
      })

      const rates = (shipment.rates || []).sort(
        (a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount)
      )

      if (rates.length === 0) {
        this.logger_.warn("Shippo createFulfillment: no rates returned")
        return { data: { ...(fulfillment.data as object || {}), shippo_shipment_id: shipment.objectId }, labels: [] }
      }

      const selectedRate = rates[0]
      const transaction = await this.shippoClient.transactions.create({
        rate: selectedRate.objectId,
        labelFileType: "PDF",
        async: false,
      })

      const labelUrl = transaction.labelUrl || transaction.label_url
      const trackingNumber = transaction.trackingNumber || transaction.tracking_number

      this.logger_.info(
        `Shippo label purchased: ${selectedRate.provider} ${selectedRate.servicelevel?.name} (${selectedRate.amount} ${selectedRate.currency}), tracking: ${trackingNumber}`
      )

      return {
        data: {
          ...(fulfillment.data as object || {}),
          shippo_transaction_id: transaction.objectId,
          shippo_rate_id: selectedRate.objectId,
          shippo_shipment_id: shipment.objectId,
          shippo_provider: selectedRate.provider,
          shippo_service: selectedRate.servicelevel?.name,
          shippo_amount: selectedRate.amount,
          shippo_currency: selectedRate.currency,
        },
        labels: [
          {
            tracking_number: trackingNumber,
            tracking_url: selectedRate.trackingUrlProvider || "",
            label_url: labelUrl,
          },
        ],
      }
    } catch (error: any) {
      this.logger_.error(`Shippo createFulfillment error: ${error.message}`)
      throw error
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    const transactionId = (data as any).shippo_transaction_id
    if (transactionId) {
      try {
        await this.shippoClient.transactions.get(transactionId)
        this.logger_.info(`Shippo transaction ${transactionId} retrieved for cancellation reference`)
      } catch (error: any) {
        this.logger_.warn(`Shippo cancelFulfillment: could not retrieve transaction: ${error.message}`)
      }
    }
    return {}
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default ShippoFulfillmentService
