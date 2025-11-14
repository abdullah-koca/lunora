import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, CreditCard, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { requestPaytrToken } from '../lib/paytrService';

declare global {
  interface Window {
    iFrameResize?: (options: unknown, target: string | Element) => void;
  }
}

interface Address {
  id: string;
  user_id: string;
  title: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  district: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  size: string;
  quantity: number;
  product_code?: string | null;
  // İndirim alanları
  discount_percentage?: number | null;
  discount_price?: number | null;
  is_discounted?: boolean | null;
}

interface CheckoutPageProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  getBaseSubtotal: () => number;
  getTotalPrice: () => number;
  getShippingCost: () => number;
  getFinalTotal: () => number;
  getCampaignSavings?: () => number;
  showSuccess?: (title: string, message?: string) => void;
  showError?: (title: string, message?: string) => void;
  showWarning?: (title: string, message?: string) => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ isOpen, onClose, cart, getBaseSubtotal, getTotalPrice, getShippingCost, getFinalTotal, getCampaignSavings, showSuccess, showError, showWarning }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isPaytrInitializing, setIsPaytrInitializing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [merchantOid, setMerchantOid] = useState<string | null>(null);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'awaiting' | 'success' | 'failed'>('idle');
  const [paytrError, setPaytrError] = useState<string | null>(null);
  const [isCancellingPayment, setIsCancellingPayment] = useState(false);

  // Yeni adres formu
  const [newAddress, setNewAddress] = useState({
    title: '',
    full_name: '',
    phone: '',
    address_line: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false
  });

  // Kullanıcı oturumunu kontrol et
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { name?: string; full_name?: string } } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  // Adresleri yükle
  useEffect(() => {
    if (user) {
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (_error) {
      // Adresler yüklenirken hata - sessizce geç
    }
  };

  const saveAddress = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Eğer varsayılan adres seçilirse, diğer adresleri varsayılan olmaktan çıkar
      if (newAddress.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          ...newAddress
        })
        .select()
        .single();

      if (error) throw error;

      setAddresses(prev => [data, ...prev]);
      setSelectedAddress(data);
      setShowAddAddress(false);
      setNewAddress({
        title: '',
        full_name: '',
        phone: '',
        address_line: '',
        city: '',
        district: '',
        postal_code: '',
        is_default: false
      });
      
      // Adres kaydedildikten sonra sipariş gözden geçirme adımına geç
      setCurrentStep(2);
    } catch (error) {
      showError?.('Hata', 'Adres kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;

    try {
      // Önce tüm adresleri varsayılan olmaktan çıkar
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Seçilen adresi varsayılan yap
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      loadAddresses();
    } catch (_error) {
      // Varsayılan adres ayarlanırken hata - sessizce geç
    }
  };

  const createPendingOrder = async (pendingMerchantOid: string) => {
    if (!user || !selectedAddress) {
      throw new Error('Kullanıcı veya adres bilgisi bulunamadı.');
    }

    const orderData = {
      user_id: user.id,
      customer_email: user.email,
      name_surname: user.user_metadata?.name || user.user_metadata?.full_name || user.email,
      order_number: pendingMerchantOid,
      total_amount: getFinalTotal(),
      payment_method: 'paytr',
      payment_status: 'pending',
      shipping_address: {
        title: selectedAddress.title,
        full_name: selectedAddress.full_name,
        phone: selectedAddress.phone,
        address_line: selectedAddress.address_line,
        city: selectedAddress.city,
        district: selectedAddress.district,
        postal_code: selectedAddress.postal_code
      },
      order_items: cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        price: item.is_discounted && item.discount_price ? item.discount_price : item.price,
        size: item.size,
        quantity: item.quantity,
        image: item.image
      })),
      status: 'pending',
      notes: JSON.stringify({
        paymentProvider: 'paytr',
        merchantOid: pendingMerchantOid,
        status: 'pending'
      })
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    setOrderNumber(data.order_number);
    setOrderId(data.id);

    return data;
  };

  const updateStocksAfterPayment = useCallback(async () => {
    for (const item of cart) {
      try {
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('id, stock')
          .eq('id', item.id)
          .single();

        if (fetchError || !currentProduct) {
          continue;
        }

        const currentStock = Number(currentProduct.stock) || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);
      } catch (_error) {
        // Stok güncelleme hatası durumunda süreci kesmeyelim
      }
    }
  }, [cart]);

  const finalizeOrderAfterPayment = useCallback(
    async (result: 'success' | 'failed', options?: { message?: string }) => {
      if (!orderId || !merchantOid) {
        return;
      }

      if (result === 'success' && paymentStatus === 'success') {
        return;
      }

      try {
        if (result === 'success') {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              notes: JSON.stringify({
                paymentProvider: 'paytr',
                merchantOid,
                status: 'paid',
                message: options?.message
              })
            })
            .eq('id', orderId);

          if (updateError) throw updateError;

          await updateStocksAfterPayment();

          setPaymentStatus('success');
          setPaytrToken(null);
          showSuccess?.('Ödeme Başarılı', 'Siparişiniz başarıyla alındı.');
          setCurrentStep(4);
        } else {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'cancelled',
              notes: JSON.stringify({
                paymentProvider: 'paytr',
                merchantOid,
                status: 'failed',
                message: options?.message
              })
            })
            .eq('id', orderId);

          if (updateError) throw updateError;

          setPaymentStatus('failed');
          setPaytrToken(null);
          showError?.('Ödeme Başarısız', options?.message || 'Ödeme işlemi tamamlanamadı.');
          setCurrentStep(2);
        }
      } catch (error) {
        showError?.('Hata', 'Sipariş durumu güncellenirken bir sorun oluştu. Lütfen destek ile iletişime geçin.');
      }
    },
    [merchantOid, orderId, paymentStatus, showError, showSuccess, updateStocksAfterPayment]
  );

  const nextStep = () => {
    if (currentStep === 1 && !selectedAddress) {
      showWarning?.('Uyarı', 'Lütfen bir adres seçin');
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddress) {
      showWarning?.('Uyarı', 'Lütfen bir adres seçin');
      return;
    }

    if (!user) {
      showError?.('Hata', 'Kullanıcı oturumu bulunamadı.');
      return;
    }

    if (cart.length === 0) {
      showError?.('Hata', 'Sepetinizde ürün bulunmuyor.');
      return;
    }

    setIsPaytrInitializing(true);
    setPaytrError(null);

    const newMerchantOid = `LN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setMerchantOid(newMerchantOid);

    try {
      const basketPayload = cart.map(item => ({
        name: item.name,
        price: item.is_discounted && item.discount_price ? item.discount_price : item.price,
        quantity: item.quantity
      }));

      // ÖNCE PayTR token'ı al - token başarıyla alınmadan sipariş oluşturma
      const tokenResponse = await requestPaytrToken({
        merchantOid: newMerchantOid,
        totalAmount: getFinalTotal(),
        currency: 'TL',
        noInstallment: false,
        maxInstallment: 0,
        testMode: import.meta.env.VITE_PAYTR_TEST_MODE === '1',
        customer: {
          email: user.email || '',
          name: selectedAddress.full_name,
          address: `${selectedAddress.address_line}, ${selectedAddress.district}, ${selectedAddress.city} ${selectedAddress.postal_code || ''}`,
          phone: selectedAddress.phone
        },
        basket: basketPayload
      });

      // Token başarıyla alındıysa, şimdi siparişi oluştur (pending olarak)
      const orderPromise = createPendingOrder(newMerchantOid);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Sipariş oluşturma işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.')), 10000)
      );
      
      const createdOrder = await Promise.race([orderPromise, timeoutPromise]);

      // Sipariş başarıyla oluşturuldu, şimdi ödeme sayfasına geç
      setPaytrToken(tokenResponse.token);
      setPaymentStatus('awaiting');
      setCurrentStep(3);
    } catch (error) {
      let message = 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
      
      if (error instanceof Error) {
        if (error.message.includes('zaman aşımı') || error.message.includes('timeout')) {
          message = 'Bağlantı zaman aşımına uğradı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
        } else if (error.message.includes('PayTR API adresi')) {
          message = 'PayTR sunucusu bulunamadı. Lütfen daha sonra tekrar deneyin.';
        } else {
          message = error.message;
        }
      }

      // Token alınamadıysa veya sipariş oluşturulamadıysa, hiçbir sipariş kaydı oluşturulmamalı
      // Sadece state'i temizle
      setMerchantOid(null);
      setOrderId(null);
      setOrderNumber(null);
      setPaytrToken(null);
      setPaymentStatus('idle');
      setPaytrError(message);
      showError?.('Hata', message);
    } finally {
      setIsPaytrInitializing(false);
    }
  };

  const cancelPayment = async () => {
    if (currentStep !== 3) {
      prevStep();
      return;
    }

    if (!orderId || !merchantOid) {
      setPaytrToken(null);
      setMerchantOid(null);
      setPaymentStatus('idle');
      setCurrentStep(2);
      return;
    }

    try {
      setIsCancellingPayment(true);

      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
          notes: JSON.stringify({
            paymentProvider: 'paytr',
            merchantOid,
            status: 'cancelled_by_user'
          })
        })
        .eq('id', orderId);

      setPaytrToken(null);
      setMerchantOid(null);
      setOrderId(null);
      setOrderNumber(null);
      setPaymentStatus('idle');
      setCurrentStep(2);
      setPaytrError(null);
      showWarning?.('Bilgi', 'Ödeme işlemi iptal edildi.');
    } catch (error) {
      showError?.('Hata', 'Ödeme iptal edilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsCancellingPayment(false);
    }
  };

  const handleBackAction = () => {
    if (currentStep === 1) {
      return;
    }

    if (currentStep === 3) {
      void cancelPayment();
      return;
    }

    if (currentStep === 4) {
      onClose();
      return;
    }

    prevStep();
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: 'Adres' },
      { id: 2, label: 'Gözden Geçir' },
      { id: 3, label: 'Ödeme' },
      { id: 4, label: 'Başarı' }
    ];

    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step.id ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step.id}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id ? 'text-yellow-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-yellow-600' : 'bg-gray-300'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ödeme</h2>
        <p className="text-gray-600">PayTR güvencesiyle ödemenizi tamamlayın.</p>
        {orderNumber && (
          <p className="text-sm text-gray-500 mt-2">
            Sipariş Numaranız: <span className="font-semibold text-gray-900">{orderNumber}</span>
          </p>
        )}
      </div>

      {paytrError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {paytrError}
        </div>
      )}

      {paymentStatus === 'failed' && !paytrError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Ödeme işlemi tamamlanamadı. Dilerseniz ödemeyi yeniden başlatabilirsiniz.
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Ödeme başarıyla tamamlandı. Siparişiniz hazırlanıyor.
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">PayTR Güvenli Ödeme</p>
            <p className="text-sm text-gray-600">3D Secure uyumlu, kart bilgileriniz korunur.</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <p>Ödeme adımını tamamlamak için aşağıdaki güvenli iframe üzerinden kart bilginizi girin.</p>
        </div>

        {isPaytrInitializing && (
          <div className="py-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mb-4"></div>
            <p className="text-gray-600">Ödeme sayfası hazırlanıyor...</p>
            <p className="text-sm text-gray-500 mt-2">Lütfen bekleyin, bu işlem birkaç saniye sürebilir.</p>
          </div>
        )}

        {!isPaytrInitializing && paytrToken && paymentStatus !== 'success' && (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <iframe
              title="PayTR Ödeme"
              id="paytr-iframe"
              src={`https://www.paytr.com/odeme/guvenli/${paytrToken}?lang=tr`}
              allow="payment"
              frameBorder="0"
              scrolling="no"
              style={{ width: '100%', minHeight: '620px', backgroundColor: '#fff' }}
              onLoad={() => {
                console.log('[PayTR] Iframe yüklendi');
              }}
              onError={(e) => {
                console.error('[PayTR] Iframe yükleme hatası:', e);
                setPaytrError('Ödeme sayfası yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.');
              }}
            />
          </div>
        )}

        {!isPaytrInitializing && !paytrToken && (
          <div className="py-6 text-center text-gray-600">
            Ödeme bağlantısı oluşturulamadı. Lütfen geri dönüp tekrar deneyin.
          </div>
        )}
      </div>
    </div>
  );

  const renderSuccessStep = () => {
    const finalTotal = getFinalTotal();
    const baseSubtotal = getBaseSubtotal();
    const shippingCost = getShippingCost();
    const campaignSavings = getCampaignSavings ? getCampaignSavings() : 0;

    return (
      <div className="space-y-6">
        {/* Başarı Mesajı */}
        <div className="text-center py-6">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-green-500 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Ödeme Başarılı!</h2>
          <p className="text-lg text-gray-600 mb-1">
            Siparişiniz başarıyla alındı
          </p>
          {orderNumber && (
            <div className="mt-4 inline-block px-4 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Sipariş Numaranız</p>
              <p className="text-xl font-bold text-yellow-700 mt-1">{orderNumber}</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Sipariş detaylarınız e-posta adresinize gönderildi.
          </p>
        </div>

        {/* Sipariş Özeti */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-6 py-4 border-b border-yellow-200">
            <h3 className="text-lg font-bold text-gray-900">Sipariş Özeti</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Ürünler */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Sipariş Edilen Ürünler</h4>
              <div className="space-y-3">
                {cart.map((item, index) => {
                  const itemPrice = item.is_discounted && item.discount_price ? item.discount_price : item.price;
                  const itemTotal = itemPrice * item.quantity;
                  return (
                    <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Beden: <span className="font-medium">{item.size}</span> • 
                          Adet: <span className="font-medium">{item.quantity}</span>
                        </p>
                        {item.is_discounted && item.discount_price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-400 line-through">₺{item.price.toFixed(2).replace('.', ',')}</span>
                            <span className="text-sm font-semibold text-green-600">₺{item.discount_price.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">₺{itemTotal.toFixed(2).replace('.', ',')}</p>
                        {item.is_discounted && item.discount_price && (
                          <p className="text-xs text-green-600 mt-1">
                            {item.quantity * (item.price - item.discount_price)}₺ tasarruf
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fiyat Detayları */}
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ara Toplam</span>
                <span className="text-gray-900 font-medium">₺{baseSubtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {campaignSavings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Kampanya İndirimi</span>
                  <span className="text-green-600 font-medium">-₺{campaignSavings.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kargo</span>
                <span className="text-gray-900 font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Ücretsiz</span>
                  ) : (
                    `₺${shippingCost.toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                <span className="text-base font-bold text-gray-900">Toplam</span>
                <span className="text-xl font-bold text-yellow-600">₺{finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teslimat Adresi */}
        {selectedAddress && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">Teslimat Adresi</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-1 text-gray-700">
                <p className="font-semibold text-gray-900">{selectedAddress.full_name}</p>
                <p className="text-sm">{selectedAddress.address_line}</p>
                <p className="text-sm">
                  {selectedAddress.district}, {selectedAddress.city}
                  {selectedAddress.postal_code && ` ${selectedAddress.postal_code}`}
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Telefon:</span> {selectedAddress.phone}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bilgilendirme */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium mb-1">Sipariş Durumu</p>
              <p className="text-sm text-blue-700">
                Siparişiniz onaylandı ve hazırlık aşamasına alındı. Kargo bilgileri hazır olduğunda e-posta adresinize gönderilecektir.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!paytrToken) {
      return;
    }

    const ensureResize = () => {
      if (window.iFrameResize) {
        window.iFrameResize({}, '#paytr-iframe');
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-paytr-iframe-resizer]');
    if (existingScript) {
      ensureResize();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.paytr.com/js/iframeResizer.min.js';
    script.async = true;
    script.dataset.paytrIframeResizer = 'true';
    script.onload = ensureResize;

    document.body.appendChild(script);

    return () => {
      // Script tekrar kullanılacağından kaldırmıyoruz
    };
  }, [paytrToken]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as {
        type?: string;
        status?: string;
        merchantOid?: string;
        message?: string;
        reason?: string;
      };

      if (!data || data.type !== 'PAYTR_RESULT' || !merchantOid || data.merchantOid !== merchantOid) {
        return;
      }

      if (data.status === 'success') {
        void finalizeOrderAfterPayment('success', { message: data.message });
      } else if (data.status === 'failed' || data.status === 'error') {
        void finalizeOrderAfterPayment('failed', { message: data.message || data.reason });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [merchantOid, finalizeOrderAfterPayment]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setOrderNumber(null);
      setOrderId(null);
      setMerchantOid(null);
      setPaytrToken(null);
      setPaymentStatus('idle');
      setPaytrError(null);
      setIsPaytrInitializing(false);
      setIsCancellingPayment(false);
    }
  }, [isOpen]);

  const renderAddressStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Teslimat Adresi</h2>
        <button
          onClick={() => setShowAddAddress(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Yeni Adres Ekle
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Henüz kayıtlı adresiniz yok</p>
          <button
            onClick={() => setShowAddAddress(true)}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            İlk Adresinizi Ekleyin
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedAddress?.id === address.id
                  ? 'border-yellow-600 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAddress(address)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{address.title}</h3>
                    {address.is_default && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 font-medium">{address.full_name}</p>
                  <p className="text-gray-600">{address.phone}</p>
                  <p className="text-gray-600">
                    {address.address_line}, {address.district}, {address.city} {address.postal_code}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {!address.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDefaultAddress(address.id);
                      }}
                      className="text-xs text-yellow-600 hover:text-yellow-700"
                    >
                      Varsayılan Yap
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 2. Adım: Siparişi Gözden Geçir
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Siparişi Gözden Geçir</h2>
        <p className="text-gray-600">Siparişinizi kontrol edin ve devam edin</p>
      </div>

      {/* Seçilen Adres */}
      {selectedAddress && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Teslimat Adresi</h3>
          <p className="text-gray-700">{selectedAddress.full_name}</p>
          <p className="text-gray-600">{selectedAddress.phone}</p>
          <p className="text-gray-600">
            {selectedAddress.address_line}, {selectedAddress.district}, {selectedAddress.city} {selectedAddress.postal_code}
          </p>
        </div>
      )}

      {/* Ödeme Bilgileri */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Ödeme Bilgileri</h3>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">PayTR Online Ödeme</p>
            <p className="text-sm text-gray-600">Tüm kartlarla güvenli ve taksitli ödeme imkanı</p>
          </div>
        </div>
      </div>

      {/* Sipariş Özeti */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Sipariş Özeti</h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={`${item.id}-${item.size}`} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img
                  src={item.image || 'https://via.placeholder.com/60x60?text=No+Image'}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.product_code && (
                    <p className="text-xs text-gray-600">Ürün Kodu: {item.product_code}</p>
                  )}
                  <p className="text-xs text-gray-600">Beden: {item.size} • Adet: {item.quantity}</p>
                </div>
              </div>
              <div className="text-right">
                {item.is_discounted && item.discount_price ? (
                  <>
                    <p className="font-semibold text-red-600">₺{(item.discount_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                    <p className="text-sm text-gray-500 line-through">₺{(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                  </>
                ) : (
                  <p className="font-semibold text-gray-900">₺{(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span>Ara Toplam</span>
            <span>₺{getBaseSubtotal().toFixed(2).replace('.', ',')}</span>
          </div>
          {getCampaignSavings && getCampaignSavings() > 0 && (
            <div className="flex justify-between items-center text-green-600 font-semibold">
              <span>Kampanya Tasarrufu (3 Al 2 Öde)</span>
              <span>-₺{getCampaignSavings().toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span>Kargo</span>
            <span className={getShippingCost() === 0 ? 'text-green-600 font-semibold' : ''}>
              {getShippingCost() === 0 ? 'Bedava' : `₺${getShippingCost().toFixed(2).replace('.', ',')}`}
            </span>
          </div>
          {getTotalPrice() < 1500 && (
            <div className="text-xs text-gray-500 text-center">
              1500 TL ve üzeri alışverişlerde kargo bedava
            </div>
          )}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between items-center text-lg font-bold text-gray-900">
              <span>Toplam</span>
              <span>₺{getFinalTotal().toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sipariş Koşulları */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Sipariş Koşulları</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Siparişiniz 1-3 iş günü içinde hazırlanacaktır</li>
          <li>• Kargo ücreti alıcıya aittir</li>
          <li>• İade ve değişim 14 gün içinde yapılabilir</li>
          <li>• Ödeme PayTR güvencesiyle online olarak alınacaktır</li>
        </ul>
      </div>
    </div>
  );

  const renderAddAddressForm = () => (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col overscroll-none">
      <div className="w-full h-full overflow-y-auto fullscreen-scrollbar">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddAddress(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Yeni Adres Ekle</h2>
            </div>
          </div>

          <div className="max-w-md mx-auto pb-24 md:pb-8">
            <form onSubmit={(e) => { e.preventDefault(); saveAddress(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres Başlığı
              </label>
              <input
                type="text"
                value={newAddress.title}
                onChange={(e) => setNewAddress(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Ev, İş, vb."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                value={newAddress.full_name}
                onChange={(e) => setNewAddress(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={newAddress.phone}
                onChange={(e) => setNewAddress(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={newAddress.address_line}
                onChange={(e) => setNewAddress(prev => ({ ...prev, address_line: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İl
                </label>
                <input
                  type="text"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İlçe
                </label>
                <input
                  type="text"
                  value={newAddress.district}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posta Kodu
              </label>
              <input
                type="text"
                value={newAddress.postal_code}
                onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={newAddress.is_default}
                onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                Varsayılan adres olarak ayarla
              </label>
            </div>

            <div className="sticky bottom-0 bg-white pt-6 border-t border-gray-200 pb-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  // Kullanıcı giriş yapmamışsa
  if (!user) {
    return (
      <div className="fixed inset-0 bg-white z-[80] flex flex-col overscroll-none">
        <div className="w-full h-full overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-6 w-6" />
              </button>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ödeme</h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-6">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Giriş Yapın
              </h2>
              <p className="text-gray-600 mb-6">
                Sipariş vermek için önce giriş yapmanız gerekiyor.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Giriş Sayfasına Git
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[80] flex flex-col overscroll-none">
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ödeme</h1>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 fullscreen-scrollbar">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && renderAddressStep()}
            {currentStep === 2 && renderReviewStep()}
            {currentStep === 3 && renderPaymentStep()}
            {currentStep === 4 && renderSuccessStep()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10">
          <button
            onClick={handleBackAction}
            disabled={
              currentStep === 1 ||
              (currentStep === 3 && (isPaytrInitializing || isCancellingPayment))
            }
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {currentStep === 4 ? 'Ana Sayfa' : currentStep === 3 ? 'İptal' : 'Geri'}
            </span>
            <span className="sm:hidden">
              {currentStep === 4 ? 'Ana Sayfa' : currentStep === 3 ? 'İptal' : 'Geri'}
            </span>
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">Toplam Tutar</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">₺{getFinalTotal().toFixed(2).replace('.', ',')}</p>
          </div>

          {currentStep === 1 && (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 md:px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <span className="hidden sm:inline">İleri</span>
              <span className="sm:hidden">İleri</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {currentStep === 2 && (
            <button
              onClick={handleProceedToPayment}
              disabled={isPaytrInitializing}
              className="flex items-center gap-2 px-4 md:px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">
                {isPaytrInitializing ? 'Bağlantı Hazırlanıyor...' : 'Ödemeye Geç'}
              </span>
              <span className="sm:hidden">
                {isPaytrInitializing ? 'Hazırlanıyor...' : 'Öde'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 px-4 md:px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-default"
            >
              <span className="hidden sm:inline">Ödeme Bekleniyor</span>
              <span className="sm:hidden">Bekleyin</span>
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="hidden sm:inline">Tamam</span>
              <span className="sm:hidden">Tamam</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddAddress && renderAddAddressForm()}
    </div>
  );
};

export default CheckoutPage;
