# Veeqo Carrier Routing Rules Setup

## Overview
This document outlines the shipping rules that need to be configured in Veeqo to automate carrier selection based on region and shipping method.

## Required Carrier Accounts
Before setting up rules, ensure you have carrier accounts set up in Veeqo:
- **Royal Mail International Connect** (for Standard international)
- **Evri International** (alternative for Standard international)
- **DHL Express** (for Express international)
- **FedEx International** (alternative for Express international)
- **UPS International** (alternative for Express international)

## Shipping Rules Configuration

### Rule 1: UK Standard
- **Condition**: Order shipping address country = GB AND shipping method contains "Standard"
- **Action**: Assign to Royal Mail Tracked 24/48

### Rule 2: UK Express
- **Condition**: Order shipping address country = GB AND shipping method contains "Express"
- **Action**: Assign to DHL Express UK or Royal Mail Special Delivery

### Rule 3: Europe Standard
- **Condition**: Order shipping address country in [DE, DK, SE, FR, ES, IT, NL, BE, AT, CH, PL, CZ] AND shipping method = "International Standard Delivery"
- **Action**: Assign to Royal Mail International Connect or Evri International

### Rule 4: Europe Express
- **Condition**: Order shipping address country in [DE, DK, SE, FR, ES, IT, NL, BE, AT, CH, PL, CZ] AND shipping method = "International Express Delivery"
- **Action**: Assign to DHL Express Europe with DDP (Delivered Duty Paid)

### Rule 5: North America Standard
- **Condition**: Order shipping address country in [US, CA] AND shipping method = "International Standard Delivery"
- **Action**: Assign to Royal Mail International Connect or Evri International

### Rule 6: North America Express
- **Condition**: Order shipping address country in [US, CA] AND shipping method = "International Express Delivery"
- **Action**: Assign to FedEx International Priority or DHL Express Americas with DDP

### Rule 7: Rest of World Standard
- **Condition**: Order shipping address country in [AU, NZ, JP, CN, IN, BR, ZA, MX, AR, RU] AND shipping method = "International Standard Delivery"
- **Action**: Assign to Royal Mail International Connect or Evri International

### Rule 8: Rest of World Express
- **Condition**: Order shipping address country in [AU, NZ, JP, CN, IN, BR, ZA, MX, AR, RU] AND shipping method = "International Express Delivery"
- **Action**: Assign to DHL Express Worldwide or FedEx International Priority with DDP

## Customs Configuration

### Paperless Trade (Digital Customs)
Enable paperless trade for DHL, FedEx, and UPS in Veeqo:
1. Go to Settings > Shipping > Carriers
2. Select DHL Express
3. Enable "Paperless Trade" or "Electronic Trade Documents"
4. Repeat for FedEx and UPS

### IOSS Configuration (EU)
1. Register for IOSS in your EU country of registration
2. Add your IOSS number to Veeqo settings:
   - Settings > Shipping > Customs
   - Add IOSS number for EU orders under €150
3. Ensure IOSS number is passed in commercial invoices

### DDP Configuration
For Express tiers, configure carriers to ship DDP:
- DHL: Enable DDP in carrier settings
- FedEx: Set "Duties and Taxes" to "Shipper pays"
- UPS: Configure DDP in international shipping options

## Setup Instructions

### Manual Setup in Veeqo Dashboard
1. Log in to Veeqo
2. Navigate to Settings > Shipping > Shipping Rules
3. Create each rule following the conditions above
4. Set rule priority (higher priority rules are evaluated first)
5. Test with sample orders

### API Setup Script (if available)
If Veeqo provides an API for shipping rules, a script can be created to automate this setup.

## Verification
After setup, verify by:
1. Creating test orders for each region/shipping method combination
2. Checking that the correct carrier is assigned
3. Confirming customs data (HS codes, origin country) is included
4. Testing with a live order to ensure smooth processing

## Notes
- Rules are evaluated in priority order (highest first)
- Ensure carrier accounts have sufficient balance
- Monitor carrier performance and adjust rules as needed
- Review shipping costs periodically to ensure margins are maintained
