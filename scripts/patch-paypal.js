const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname, '..',
  'node_modules', '@alphabite', 'medusa-paypal',
  '.medusa', 'server', 'src', 'providers', 'paypal', 'service.js'
);

if (!fs.existsSync(filePath)) {
  console.error('PayPal service.js not found at:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let modified = false;

// Patch deletePayment: warn instead of throwing when no order ID
const deletePaymentThrow =
  `const orderId = input.data["id"];
            if (!orderId) {
                throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Delete payment failed! PayPal order ID and capture ID is required to cancel payment");
            }`;

const deletePaymentSafe =
  `const orderId = input.data["id"];
            if (!orderId) {
                this.logger.warn("PayPal deletePayment: no PayPal order ID, skipping void");
                return {
                    data: {
                        status: utils_1.PaymentSessionStatus.CANCELED,
                        cancelled_at: new Date().toISOString(),
                    },
                };
            }`;

if (content.includes(deletePaymentThrow)) {
  content = content.replace(deletePaymentThrow, deletePaymentSafe);
  modified = true;
  console.log('Patched deletePayment method');
}

// Patch cancelPayment: warn instead of throwing when no order ID
const cancelPaymentThrow =
  `const orderId = input.data["id"];
            if (!orderId) {
                throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Cancel payment failed! PayPal order ID and capture ID is required to cancel payment");
            }`;

const cancelPaymentSafe =
  `const orderId = input.data["id"];
            if (!orderId) {
                this.logger.warn("PayPal cancelPayment: no PayPal order ID, skipping void");
                return {
                    data: {
                        status: utils_1.PaymentSessionStatus.CANCELED,
                        cancelled_at: new Date().toISOString(),
                    },
                };
            }`;

if (content.includes(cancelPaymentThrow)) {
  content = content.replace(cancelPaymentThrow, cancelPaymentSafe);
  modified = true;
  console.log('Patched cancelPayment method');
}

if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('PayPal plugin patched successfully!');
} else {
  console.log('PayPal plugin already patched (no changes needed)');
}
