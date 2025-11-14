import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface StaticPageProps {
  title: string;
  pageKey: 'contact' | 'tracking' | 'returns' | 'faq';
  onClose: () => void;
}

const StaticPage: React.FC<StaticPageProps> = ({ title, pageKey, onClose }) => {
  const [contactForm, setContactForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    subject: '', 
    message: '' 
  });
  const [contactStatus, setContactStatus] = useState<null | { type: 'success' | 'error'; msg: string }>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [trackingNo, setTrackingNo] = useState('');
  const [trackingResult, setTrackingResult] = useState<null | { carrier?: string; status: string; lastUpdate?: string }>(null);

  const submitContact = async () => {
    setContactStatus(null);
    
    // Form validasyonu
    if (!contactForm.name.trim()) {
      setContactStatus({ type: 'error', msg: 'Ad Soyad alanı zorunludur.' });
      return;
    }
    if (!contactForm.email.trim()) {
      setContactStatus({ type: 'error', msg: 'E-posta alanı zorunludur.' });
      return;
    }
    if (!contactForm.phone.trim()) {
      setContactStatus({ type: 'error', msg: 'Telefon numarası alanı zorunludur.' });
      return;
    }
    if (!contactForm.message.trim()) {
      setContactStatus({ type: 'error', msg: 'Mesaj alanı zorunludur.' });
      return;
    }
    
    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      setContactStatus({ type: 'error', msg: 'Geçerli bir e-posta adresi giriniz.' });
      return;
    }
    
    // Telefon numarası formatı kontrolü (en az 10 haneli)
    const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(contactForm.phone.replace(/\s/g, ''))) {
      setContactStatus({ type: 'error', msg: 'Geçerli bir telefon numarası giriniz (en az 10 haneli).' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Önce Supabase'e kaydetmeyi dene
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: contactForm.name.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          subject: contactForm.subject.trim() || null,
          message: contactForm.message.trim(),
        });
      
      if (error) {
        // Eğer tablo yoksa veya başka bir hata varsa, localStorage'a kaydet
        if (error.code === 'PGRST116' || error.message.includes('relation "contact_messages" does not exist')) {
          const messageData = {
            id: Date.now(),
            name: contactForm.name.trim(),
            email: contactForm.email.trim(),
            phone: contactForm.phone.trim(),
            subject: contactForm.subject.trim() || null,
            message: contactForm.message.trim(),
            timestamp: new Date().toISOString(),
            source: 'localStorage_fallback'
          };
          
          // localStorage'a kaydet
          const existingMessages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
          existingMessages.push(messageData);
          localStorage.setItem('contact_messages', JSON.stringify(existingMessages));
          
          setContactStatus({ type: 'success', msg: 'Mesajınız kaydedildi. Supabase tablosu henüz oluşturulmamış, mesajınız geçici olarak kaydedildi.' });
        } else {
          throw error;
        }
      } else {
        setContactStatus({ type: 'success', msg: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.' });
      }
      
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (e: any) {
      console.error('İletişim mesajı hatası:', e);
      setContactStatus({ type: 'error', msg: `Mesaj gönderilemedi: ${e.message || 'Bilinmeyen hata'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const queryTracking = () => {
    if (!trackingNo.trim()) return;
    // Burada gerçek entegrasyon yerine sadece UI tasarımı ve örnek sonuç gösteriliyor
    setTrackingResult({ carrier: 'LUNORA Kargo', status: 'Dağıtıma çıktı', lastUpdate: new Date().toLocaleString('tr-TR') });
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Container */}
      <div className="absolute inset-0 p-0 md:p-4 flex">
        <div className="relative mx-auto bg-white w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <span className="sr-only">Kapat</span>
              ×
            </button>
          </div>
          {/* Content */}
          <div className="p-6 text-gray-800 text-sm md:text-base leading-6">
            {pageKey === 'contact' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bizimle İletişime Geçin</h3>
                  <p className="text-gray-600">Sorularınız için bize ulaşın, en kısa sürede size dönüş yapacağız.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad Soyad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Adınız Soyadınız"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-posta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="ornek@mail.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="0555 123 45 67"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konu (Opsiyonel)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="Mesajınızın konusu"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:border-transparent"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Mesajınızı detaylı bir şekilde yazın..."
                    required
                  />
                </div>
                
                {contactStatus && (
                  <div className={`p-4 rounded-lg ${
                    contactStatus.type === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {contactStatus.msg}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    onClick={submitContact}
                    disabled={isSubmitting}
                    className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                  </button>
                </div>
              </div>
            )}

            {pageKey === 'tracking' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kargo Takip Numarası</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-600"
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="Örn: LNR123456789"
                    />
                    <button onClick={queryTracking} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">Sorgula</button>
                  </div>
                </div>
                {trackingResult && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="text-sm text-gray-600">Kargo Firması</div>
                    <div className="font-semibold mb-2">{trackingResult.carrier}</div>
                    <div className="text-sm text-gray-600">Durum</div>
                    <div className="font-semibold mb-2">{trackingResult.status}</div>
                    <div className="text-sm text-gray-600">Son Güncelleme</div>
                    <div className="font-semibold">{trackingResult.lastUpdate}</div>
                  </div>
                )}
              </div>
            )}

            {pageKey === 'returns' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">İade & Değişim Politikası</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Teslimattan itibaren 14 gün içinde iade/değişim talep edebilirsiniz.</li>
                  <li>Ürün kullanılmamış, etiketi sökülmemiş, yeniden satılabilir durumda olmalıdır.</li>
                  <li>Hijyen ürünlerinde (iç giyim, kozmetik, küpe vb.) yasal sebeplerle iade kabul edilmeyebilir.</li>
                  <li>İade kargo ücreti, üretim veya gönderim kaynaklı kusurlarda satıcı tarafından karşılanır.</li>
                  <li>Uygunsuz kullanım/yanlış beden seçimi kaynaklı iadelerde kargo ücreti alıcıya aittir.</li>
                  <li>Değişim stok uygunluğuna bağlıdır; stok yoksa iade süreci başlatılır.</li>
                  <li>Para iadesi onaydan sonra 3-10 iş günü içinde ödeme yönteminize yansır.</li>
                </ul>
                <p className="text-gray-600">Amacımız hem kullanıcı memnuniyetini sağlamak hem de satıcıların sürdürülebilir şekilde hizmet verebilmesini desteklemektir.</p>
              </div>
            )}

            {pageKey === 'faq' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sıkça Sorulan Sorular</h3>
                <div>
                  <p className="font-semibold">Kargom ne zaman gelir?</p>
                  <p className="text-gray-700">Siparişler genellikle 1-3 iş günü içinde kargoya verilir. Kargo firması ve bölgeye göre 1-5 iş günü içinde teslim edilir.</p>
                </div>
                <div>
                  <p className="font-semibold">Hangi beden bana olur?</p>
                  <p className="text-gray-700">Ürün sayfalarında yer alan beden tablosunu kontrol edin. Kararsız kaldığınızda bize iletişim formundan yazabilirsiniz.</p>
                </div>
                <div>
                  <p className="font-semibold">İade/Değişim nasıl yaparım?</p>
                  <p className="text-gray-700">Hesabım → Siparişlerim bölümünden talep oluşturabilir veya İade & Değişim sayfasındaki yönergeleri izleyebilirsiniz.</p>
                </div>
                <div>
                  <p className="font-semibold">Ürünler orijinal mi?</p>
                  <p className="text-gray-700">Sitemizde yer alan tüm ürünler tedarikçilerimizden faturalı ve orijinal olarak temin edilir.</p>
                </div>
                <div>
                  <p className="font-semibold">Unisex ürünler nasıl listelenir?</p>
                  <p className="text-gray-700">Unisex olarak işaretlenmiş ürünler hem Kadın hem Erkek filtrelerinde görünür.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticPage;


