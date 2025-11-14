import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import microtime from 'microtime';
import pkg from 'nodejs-base64-converter';
// Path ve fs import'ları kaldırıldı - static serving yok

const { encode: base64Encode } = pkg;

// Önce .env.local'i oku (local development için), yoksa .env'i oku
try {
  dotenv.config({ path: '.env.local' });
} catch {
  // .env.local yoksa .env'i oku
}
dotenv.config(); // .env dosyasını da oku (eksik değerler için)

const merchantId = process.env.PAYTR_MERCHANT_ID;
const merchantKey = process.env.PAYTR_MERCHANT_KEY;
const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

if (!merchantId || !merchantKey || !merchantSalt) {
  console.error('[PayTR] PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY veya PAYTR_MERCHANT_SALT eksik. Sunucu başlatılamıyor.');
  process.exit(1);
}

const app = express();

const allowedOrigins = process.env.PAYTR_ALLOWED_ORIGINS
  ? process.env.PAYTR_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin(origin, callback) {
      // Eğer origin yoksa (Postman gibi araçlardan) veya allowedOrigins boşsa tüm originlere izin ver
      if (!origin || allowedOrigins.length === 0) {
        callback(null, origin || '*');
        return;
      }
      
      // Origin izin verilen listede mi kontrol et
      if (allowedOrigins.includes(origin)) {
        callback(null, origin);
        return;
      }

      // Local development için localhost:5173'e izin ver
      if (origin && (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173'))) {
        callback(null, origin);
        return;
      }

      callback(new Error('Origin not allowed by PayTR server'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend'in backend URL'ini alabilmesi için endpoint
app.get('/api/config', (req, res) => {
  const backendUrl = process.env.PAYTR_SERVER_PUBLIC_URL || 
                     process.env.RENDER_EXTERNAL_URL || 
                     `${req.protocol}://${req.get('host')}`;
  
  res.json({
    paytrApiUrl: backendUrl.replace(/\/$/, ''),
    testMode: process.env.PAYTR_TEST_MODE === '1' || process.env.VITE_PAYTR_TEST_MODE === '1'
  });
});

const successUrl =
  process.env.PAYTR_OK_URL ||
  `${process.env.PAYTR_PUBLIC_BASE_URL || 'http://localhost:5173'}/paytr-ok.html`;
const failUrl =
  process.env.PAYTR_FAIL_URL ||
  `${process.env.PAYTR_PUBLIC_BASE_URL || 'http://localhost:5173'}/paytr-fail.html`;

const callbackBaseUrl = process.env.PAYTR_SERVER_PUBLIC_URL;
const callbackUrl =
  process.env.PAYTR_CALLBACK_URL ||
  (callbackBaseUrl ? `${callbackBaseUrl.replace(/\/$/, '')}/api/paytr/callback` : undefined);

const timeoutLimit = process.env.PAYTR_TIMEOUT_LIMIT || '30';
const debugOn = process.env.PAYTR_DEBUG_ON || '0';
const defaultTestMode = process.env.PAYTR_TEST_MODE || '0';
const defaultLang = process.env.PAYTR_LANG || 'tr';

const parseBoolean = value => (value ? value === true || value === 'true' || value === '1' : false);

const toPaytrAmount = amount => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    throw new Error('Geçersiz ödeme tutarı');
  }
  return Math.round(numericAmount * 100);
};

let supabaseAdmin = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase client'ı async olarak initialize et
(async () => {
  if (supabaseUrl && supabaseServiceRoleKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false
        }
      });
      console.log('[PayTR] Supabase admin client başlatıldı');
    } catch (error) {
      console.error('[PayTR] Supabase client başlatılamadı:', error);
    }
  }
})();

app.post('/api/paytr/get-token', async (req, res) => {
  try {
    const {
      merchantOid,
      totalAmount,
      currency = 'TL',
      noInstallment = false,
      maxInstallment = 0,
      testMode,
      customer,
      basket
    } = req.body || {};

    if (!totalAmount) {
      return res.status(400).json({ message: 'totalAmount değeri zorunludur.' });
    }

    if (!customer || !customer.email || !customer.name || !customer.address || !customer.phone) {
      return res.status(400).json({ message: 'Müşteri bilgileri eksik.' });
    }

    if (!Array.isArray(basket) || basket.length === 0) {
      return res.status(400).json({ message: 'Sepet bilgisi bulunmuyor.' });
    }

    const generatedOid =
      merchantOid ||
      `LN${microtime.now().toString()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const sanitizedBasket = basket.map(item => {
      const itemPrice = Number(item.price);
      const itemQuantity = Number(item.quantity);

      if (!item.name || Number.isNaN(itemPrice) || Number.isNaN(itemQuantity)) {
        throw new Error('Sepet verileri geçersiz.');
      }

      return [String(item.name), itemPrice.toFixed(2), itemQuantity];
    });

    const userBasket = base64Encode(JSON.stringify(sanitizedBasket));
    const paymentAmount = toPaytrAmount(totalAmount);
    const noInstallmentFlag = parseBoolean(noInstallment) ? '1' : '0';
    const maxInstallmentValue = Number(maxInstallment) || 0;
    const testModeFlag = typeof testMode === 'boolean' || typeof testMode === 'string'
      ? parseBoolean(testMode) ? '1' : '0'
      : defaultTestMode;

    const forwardedFor = req.headers['x-forwarded-for'];
    const requestIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim();
    const userIp =
      customer.ip ||
      requestIp ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      '127.0.0.1';

    const hashStr = `${merchantId}${userIp}${generatedOid}${customer.email}${paymentAmount}${userBasket}${noInstallmentFlag}${maxInstallmentValue}${currency}${testModeFlag}`;
    const paytrToken = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    // Debug: Hash oluşturma bilgilerini logla (sadece debug modunda)
    if (debugOn === '1') {
      console.log('[PayTR Debug] Hash String:', hashStr);
      console.log('[PayTR Debug] Merchant ID:', merchantId);
      console.log('[PayTR Debug] User IP:', userIp);
      console.log('[PayTR Debug] Payment Amount:', paymentAmount);
      console.log('[PayTR Debug] Test Mode:', testModeFlag);
    }

    const formData = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: generatedOid,
      email: customer.email,
      payment_amount: paymentAmount.toString(),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: debugOn,
      no_installment: noInstallmentFlag,
      max_installment: maxInstallmentValue.toString(),
      user_name: customer.name,
      user_address: customer.address,
      user_phone: customer.phone,
      merchant_ok_url: successUrl,
      merchant_fail_url: failUrl,
      timeout_limit: timeoutLimit,
      currency,
      test_mode: testModeFlag
    });

    if (callbackUrl) {
      formData.append('callback_url', callbackUrl);
    }

    const response = await axios.post('https://www.paytr.com/odeme/api/get-token', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 20000 // 20 saniye timeout (PayTR API yavaş olabilir)
    });

    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    if (!data || data.status !== 'success') {
      return res.status(400).json({
        status: data?.status || 'error',
        message: data?.reason || 'PayTR token alınamadı.',
        details: data
      });
    }

    return res.json({
      token: data.token,
      merchantOid: generatedOid,
      iframeUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`
    });
  } catch (error) {
    const errorResponse = error?.response?.data;
    const errorStatus = error?.response?.status;
    console.error('[PayTR] Token alma hata:', {
      status: errorStatus,
      data: errorResponse,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      message: 'PayTR token alınamadı.',
      details: errorResponse || error.message
    });
  }
});

app.post('/api/paytr/callback', async (req, res) => {
  const payload = req.body;

  if (!payload || !payload.merchant_oid) {
    res.status(400).send('Missing merchant_oid');
    return;
  }

  try {
    const hashStr = `${payload.merchant_oid}${merchantSalt}${payload.status}${payload.total_amount}`;
    const expectedHash = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

    if (expectedHash !== payload.hash) {
      console.error('[PayTR] Hash doğrulaması başarısız:', payload);
      res.status(400).send('BAD HASH');
      return;
    }

    if (supabaseAdmin) {
      const updateData =
        payload.status === 'success'
          ? {
              payment_status: 'paid',
              status: 'confirmed'
            }
          : {
              payment_status: 'failed',
              status: 'cancelled'
            };

      await supabaseAdmin
        .from('orders')
        .update({
          ...updateData,
          notes: JSON.stringify({
            paymentProvider: 'paytr',
            merchantOid: payload.merchant_oid,
            status: payload.status,
            message: payload.failed_reason || payload.failed_reason_msg || null
          })
        })
        .eq('order_number', payload.merchant_oid);
    }

    res.send('OK');
  } catch (error) {
    console.error('[PayTR] Callback hata:', error);
    res.status(500).send('ERROR');
  }
});

// Backend sadece API serve ediyor, frontend ayrı host'ta

const port = Number(process.env.PORT || process.env.PAYTR_SERVER_PORT || 3001);

app.listen(port, () => {
  console.log(`[PayTR] Sunucu ${port} portunda çalışıyor.`);
  console.log(`[PayTR] Başarılı yönlendirme URL'si: ${successUrl}`);
  console.log(`[PayTR] Başarısız yönlendirme URL'si: ${failUrl}`);
  if (callbackUrl) {
    console.log(`[PayTR] Bildirim URL'si: ${callbackUrl}`);
  }
});


