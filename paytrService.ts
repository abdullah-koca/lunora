export interface PaytrCustomerPayload {
  email: string;
  name: string;
  address: string;
  phone: string;
  ip?: string;
}

export interface PaytrBasketItem {
  name: string;
  price: number;
  quantity: number;
}

export interface PaytrTokenRequest {
  merchantOid: string;
  totalAmount: number;
  currency?: 'TL' | 'USD' | 'EUR';
  noInstallment?: boolean;
  maxInstallment?: number;
  testMode?: boolean;
  customer: PaytrCustomerPayload;
  basket: PaytrBasketItem[];
}

export interface PaytrTokenResponse {
  token: string;
  merchantOid: string;
  iframeUrl: string;
}

// Backend URL'ini runtime'da al (build zamanında gerek yok)
let cachedApiUrl: string | null = null;

const getApiBaseUrl = async (): Promise<string> => {
  // Önce build zamanında tanımlı URL'i kontrol et
  if (import.meta.env.VITE_PAYTR_API_URL) {
    return import.meta.env.VITE_PAYTR_API_URL;
  }

  // Cache'lenmiş URL varsa onu kullan
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  // Runtime'da /api/config endpoint'inden al
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      cachedApiUrl = config.paytrApiUrl;
      return cachedApiUrl;
    }
  } catch (error) {
    console.warn('[PayTR] Config endpoint\'inden URL alınamadı:', error);
  }

  // Fallback: mevcut origin'i kullan
  const fallbackUrl = window.location.origin;
  cachedApiUrl = fallbackUrl;
  return fallbackUrl;
};

export const requestPaytrToken = async (payload: PaytrTokenRequest): Promise<PaytrTokenResponse> => {
  const API_BASE_URL = await getApiBaseUrl();
  
  if (!API_BASE_URL) {
    throw new Error('PayTR API adresi alınamadı.');
  }

  // Timeout ile fetch - 20 saniye (PayTR API yavaş olabilir)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/paytr/get-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'PayTR token isteği sırasında beklenmeyen bir hata oluştu.';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.reason || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('PayTR bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.');
    }
    throw error;
  }
};


