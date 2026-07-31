import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_paystack_secret_key_2026';

export function verifyPaystackSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
    .digest('hex');
  return hash === signatureHeader;
}

export function generatePaystackSignature(payload) {
  return crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

export async function initializePaystackTransaction({ email, amount, reference }) {
  // In dev sandbox, return a valid mock authorization URL
  return {
    authorization_url: `https://checkout.paystack.com/sandbox_pay_${reference}`,
    access_code: `access_${reference}`,
    reference
  };
}
