# IOSS (Import One-Stop Shop) Setup Guide for EU VAT Compliance

## What is IOSS?
The Import One-Stop Shop (IOSS) is a EU electronic portal that allows sellers to register for VAT in one EU country and report VAT on distance sales of goods imported from outside the EU to customers in the EU.

## Benefits of IOSS
- Collect EU VAT at checkout for orders under €150
- No customs duties charged to customers on delivery
- Faster customs clearance
- Better customer experience (no surprise fees)
- Single VAT registration instead of registering in each EU country

## Prerequisites
- Business sells goods to EU customers from outside the EU
- Order value is under €150
- Goods are shipped directly to EU customers

## Registration Process

### Step 1: Choose Registration Country
Register in the EU country where:
- Your business is established (if you have an EU establishment)
- You make your first distance sale to a non-VAT registered customer (if no EU establishment)

Common registration countries:
- **Ireland** - English-speaking, online registration available
- **Germany** - Large market
- **Netherlands** - Business-friendly
- **France** - Large market

### Step 2: Gather Required Information
- Business registration details
- VAT number (if applicable)
- Contact information
- Estimated annual turnover
- Bank details for VAT payments

### Step 3: Register Online
1. Visit the tax authority website of your chosen country
2. Complete the IOSS registration form
3. Receive your IOSS number (format: IMXXXXXXXXXXX)

### Step 4: Configure in Veeqo
1. Log in to Veeqo
2. Navigate to Settings > Shipping > Customs
3. Add your IOSS number
4. Ensure IOSS is enabled for EU orders under €150

### Step 5: Configure in Medusa
Add IOSS number to store settings or metadata:
```typescript
// In medusa-config.ts or via admin settings
{
  metadata: {
    ios_number: "IMXXXXXXXXXXX",
    vat_collection_enabled: true
  }
}
```

## Integration with Order Flow

### Medusa → Veeqo
Ensure IOSS number is passed in order data:
```typescript
// In Veeqo order sync subscriber
const veeqoOrderInput = {
  // ... other order fields
  customs: {
    ios_number: store.metadata.ios_number,
    vat_number: store.metadata.vat_number
  }
}
```

### Veeqo → Carriers
Veeqo will automatically include IOSS number in commercial invoices for:
- DHL Express
- FedEx
- UPS
- Royal Mail International

## IOSS Number Format
- Starts with "IM" followed by 11 digits
- Example: IM123456789012

## Reporting Requirements

### Monthly IOSS Return
File monthly return with:
- Total value of distance sales
- VAT collected
- Number of transactions
- Breakdown by EU country

### Payment Deadline
- VAT due by the end of the following month
- Late payments may incur penalties

## Order Value Thresholds

| Order Value | VAT Treatment | IOSS Required |
|-------------|---------------|---------------|
| Under €150 | IOSS applies | Yes |
| €150 and over | Import VAT at destination | No (use OSS) |

## Testing
1. Create test order to EU country under €150
2. Verify IOSS number appears on commercial invoice
3. Check that VAT is collected at checkout
4. Confirm no duties charged at delivery

## Common Issues

### Issue: IOSS number not accepted
**Solution**: Verify format (IM + 11 digits) and that it's active

### Issue: Duties still charged
**Solution**: Ensure order value is under €150 and IOSS is enabled in Veeqo

### Issue: Carrier doesn't support IOSS
**Solution**: Use carriers that support electronic customs (DHL, FedEx, UPS, Royal Mail)

## Additional Resources
- [EU IOSS Portal](https://ec.europa.eu/taxation_customs/business/vat/ioss_en)
- [HMRC IOSS Guidance (UK)](https://www.gov.uk/guidance/register-for-the-import-one-stop-shop)
- [Veeqo Customs Documentation](https://developers.veeqo.com/docs/customs)

## Next Steps
1. Complete IOSS registration in chosen EU country
2. Add IOSS number to Veeqo settings
3. Configure Medusa to include IOSS in order data
4. Test with sample orders
5. Set up monthly reporting process
