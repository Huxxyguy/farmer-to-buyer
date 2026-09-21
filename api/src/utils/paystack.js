import './env.js';
import crypto from 'crypto';

export function verifyPaystackSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_paystack_secret_key_2026';
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
    .digest('hex');
  return hash === signatureHeader;
}

export function generatePaystackSignature(payload) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_paystack_secret_key_2026';
  return crypto
    .createHmac('sha512', secretKey)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

export async function initializePaystackTransaction({ email, amount, reference, callback_url }) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  // If a real Paystack secret key is provided (starts with sk_test_ or sk_live_)
  if (secretKey && (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')) && !secretKey.includes('mock') && !secretKey.includes('your_')) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in Kobo (Naira x 100)
        reference,
        callback_url: callback_url || 'http://localhost:3000/orders'
      })
    });

    const data = await response.json();

    if (data.status && data.data) {
      return {
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference
      };
    } else {
      console.error('Paystack API Initialization Rejected:', data);
      throw new Error(data.message || 'Paystack initialization failed');
    }
  }

  // Sandbox / Dev mock fallback (only used if no real key is configured)
  return {
    authorization_url: `https://checkout.paystack.com/sandbox_pay_${reference}`,
    access_code: `access_${reference}`,
    reference
  };
}
