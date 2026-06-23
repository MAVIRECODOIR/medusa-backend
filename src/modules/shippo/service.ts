import { Shippo } from "shippo";

type InjectedDependencies = {
  logger: any;
};

class ShippoService {
  protected logger_: any;
  protected shippoClient: any;
  protected apiKey_: string;

  constructor({ logger }: InjectedDependencies, options: any) {
    this.logger_ = logger;
    this.apiKey_ = options.apiKey;
    // Shippo SDK initialization
    this.shippoClient = new Shippo({
      apiKeyHeader: this.apiKey_,
    });
  }

  /**
   * Get live shipping rates for a shipment
   */
  async getRates(shipmentData: {
    addressFrom: any;
    addressTo: any;
    parcels: any[];
    async?: boolean;
  }): Promise<any[]> {
    try {
      const response = await this.shippoClient.shipments.create({
        addressFrom: shipmentData.addressFrom,
        addressTo: shipmentData.addressTo,
        parcels: shipmentData.parcels,
        async: shipmentData.async || false,
      });
      
      if (response.rates) {
        return response.rates.map((rate: any) => ({
          provider: rate.provider,
          servicelevel_name: rate.servicelevel?.name,
          servicelevel_token: rate.servicelevel?.token,
          amount: rate.amount,
          currency: rate.currency,
          estimated_days: rate.estimatedDays,
          duration_terms: rate.durationTerms,
          tracking_number: rate.trackingNumber,
          tracking_url_provider: rate.trackingUrlProvider,
          object_id: rate.objectId,
        }));
      }
      
      return [];
    } catch (error: any) {
      this.logger_.error(`Shippo getRates error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a shipping label
   */
  async createLabel(rateObject: string): Promise<any> {
    try {
      const transaction = await this.shippoClient.transactions.create({
        rate: rateObject,
        labelFileType: "PDF",
        async: false,
      });

      return {
        label_url: transaction.labelUrl || transaction.label_url,
        tracking_number: transaction.trackingNumber || transaction.tracking_number,
        tracking_url_provider: transaction.trackingUrlProvider || transaction.tracking_url_provider,
        tracking_status: transaction.trackingStatus || transaction.tracking_status,
        eta: transaction.eta,
        object_id: transaction.objectId,
      };
    } catch (error: any) {
      this.logger_.error(`Shippo createLabel error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track a shipment
   */
  async trackShipment(carrier: string, trackingNumber: string): Promise<any> {
    try {
      const track = await this.shippoClient.trackingStatus.get({
        carrier,
        trackingNumber,
      });
      
      return {
        tracking_status: track.trackingStatus,
        tracking_number: track.trackingNumber,
        eta: track.eta,
        tracking_url_provider: track.trackingUrlProvider,
        tracking_history: track.trackingHistory,
      };
    } catch (error: any) {
      this.logger_.error(`Shippo trackShipment error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create an address
   */
  async createAddress(addressData: any): Promise<any> {
    try {
      const address = await this.shippoClient.addresses.create(addressData);
      return address;
    } catch (error: any) {
      this.logger_.error(`Shippo createAddress error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate an address
   */
  async validateAddress(addressId: string): Promise<any> {
    try {
      const address = await this.shippoClient.addresses.validate({ addressId });
      return address;
    } catch (error: any) {
      this.logger_.error(`Shippo validateAddress error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a shipment with customs declaration for international shipping
   */
  async createInternationalShipment(shipmentData: {
    addressFrom: any;
    addressTo: any;
    parcels: any[];
    customsDeclaration: any;
    async?: boolean;
  }): Promise<any> {
    try {
      // First create customs declaration
      const customs = await this.shippoClient.customsDeclarations.create(
        shipmentData.customsDeclaration
      );

      // Then create shipment with customs declaration
      const shipment = await this.shippoClient.shipments.create({
        addressFrom: shipmentData.addressFrom,
        addressTo: shipmentData.addressTo,
        parcels: shipmentData.parcels,
        customsDeclaration: customs.objectId,
        async: shipmentData.async || false,
      });

      return shipment;
    } catch (error: any) {
      this.logger_.error(`Shippo createInternationalShipment error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get account address (sender address)
   */
  async getAccountAddress(): Promise<any> {
    try {
      const addresses = await this.shippoClient.addresses.list();
      return addresses.results?.[0] || null;
    } catch (error: any) {
      this.logger_.error(`Shippo getAccountAddress error: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all carriers enabled on the account
   */
  async listCarriers(): Promise<any[]> {
    try {
      const carriers = await this.shippoClient.carrierAccounts.list({});
      return carriers.results || [];
    } catch (error: any) {
      this.logger_.error(`Shippo listCarriers error: ${error.message}`);
      throw error;
    }
  }
}

export default ShippoService;
