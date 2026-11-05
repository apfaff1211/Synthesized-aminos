// Synthesized Aminos — Stripe card payments (Netlify Function).
// Generated from the storefront's product list. Re-generate when prices or discount codes change.
// Needs two Netlify environment variables: STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.
const PRICES = {
 "bpc": 49,
 "cjc": 59,
 "pt141": 39,
 "sema@10mg": 45,
 "sema@20mg": 68,
 "tirz@10mg": 50,
 "tirz@20mg": 70,
 "tirz@30mg": 90,
 "tirz@40mg": 105,
 "tirz@60mg": 130,
 "reta@10mg": 55,
 "reta@20mg": 80,
 "reta@30mg": 100,
 "reta@40mg": 115,
 "reta@60mg": 145,
 "ipa": 49,
 "serm": 57,
 "tesa": 69,
 "cagri": 102,
 "tb4": 59,
 "kpv": 49,
 "mots": 45,
 "ss31": 51,
 "mt2": 39,
 "nad": 48,
 "cjcdac": 52,
 "cjcipa": 59,
 "tesaipa": 84,
 "wolv": 60,
 "dsip": 36,
 "elora": 155,
 "aod": 47,
 "amino": 74,
 "gluta": 70,
 "b12": 30,
 "vip": 79,
 "snap8": 42,
 "ll37": 45,
 "kiss": 39,
 "ghrp2": 34,
 "cartalax": 49,
 "aicar": 55,
 "pinealon": 48,
 "oxy": 30,
 "lcarn": 54,
 "selank": 39,
 "semax": 49,
 "epitalon": 36,
 "ghkcu": 40,
 "glow": 105,
 "klow": 117
};
const CODES = {"DJONES15":"15","AMINO15":"15","CP15":"15","TDUKE15":"15","AHUNTER15":"15","SHOUSTON15":"15","XAVIER15":"15","BLACKEY15":"15"};
const FREE_SHIPPING_OVER = 150;
const SHIPPING = 12;
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const pk = process.env.STRIPE_PUBLISHABLE_KEY || '';
    return json(pk && process.env.STRIPE_SECRET_KEY ? 200 : 503, { publishableKey: pk });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return json(503, { error: 'Card payments are not configured.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Invalid request' }); }
  const cart = body.cart || {};
  let subtotal = 0;
  for (const key of Object.keys(cart)) {
    const qty = Number(cart[key]);
    if (!(key in PRICES) || !Number.isInteger(qty) || qty < 1 || qty > 100) return json(400, { error: 'Your cart has an item that is no longer available. Please refresh the page.' });
    subtotal += PRICES[key] * qty;
  }
  if (subtotal <= 0) return json(400, { error: 'Your cart is empty.' });
  const code = String(body.discountCode || '').trim().toUpperCase();
  let discount = 0;
  if (code && CODES[code]) {
    const v = CODES[code];
    const amt = v.startsWith('$') ? parseFloat(v.slice(1)) : subtotal * parseFloat(v) / 100;
    discount = Math.min(Math.max(0, Math.round(amt)), subtotal);
  }
  const shipping = subtotal < FREE_SHIPPING_OVER ? SHIPPING : 0;
  const amount = Math.round((subtotal - discount + shipping) * 100);
  const orderNumber = String(body.orderNumber || '').slice(0, 40);
  const params = new URLSearchParams();
  params.append('amount', String(amount));
  params.append('currency', 'usd');
  params.append('payment_method_types[]', 'card');
  params.append('description', 'Synthesized Aminos order ' + orderNumber);
  params.append('metadata[order_number]', orderNumber);
  if (code) params.append('metadata[discount_code]', code);
  if (body.email) params.append('receipt_email', String(body.email).slice(0, 200));
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const pi = await res.json();
  if (!res.ok) return json(400, { error: (pi.error && pi.error.message) || 'Stripe could not start the payment.' });
  return json(200, { clientSecret: pi.client_secret, amount, id: pi.id });
};
