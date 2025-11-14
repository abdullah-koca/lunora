import React, { useEffect, useState, useRef } from 'react';
import { X, User, Package, MapPin, Heart, Settings, LogOut, Mail, Calendar, Edit, Plus, Trash2, Home, Search, ShoppingCart, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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

interface AccountPageProps {
  onClose: () => void;
  onNavigate?: (panel: string) => void;
  activeBottomTab?: string;
  showSuccess?: (title: string, message?: string) => void;
  showError?: (title: string, message?: string) => void;
  showWarning?: (title: string, message?: string) => void;
}

export default function AccountPage({ onClose, onNavigate, activeBottomTab = 'account', showSuccess, showError, showWarning }: AccountPageProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    birthDate: '',
    gender: ''
  });

  // Adres yönetimi state'leri
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
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
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [latestStatusByOrderNumber, setLatestStatusByOrderNumber] = useState<Record<string, string>>({});
  
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const statusSteps = [
    { key: 'pending', codeAliases: ['pending', 'received', 'alindi'], label: 'Sipariş alındı' },
    { key: 'preparing', codeAliases: ['preparing', 'confirmed', 'processing', 'hazirlaniyor'], label: 'Hazırlanıyor' },
    { key: 'shipped', codeAliases: ['shipped', 'kargoda', 'in_transit'], label: 'Kargoda' },
    { key: 'delivered', codeAliases: ['delivered', 'teslim_edildi'], label: 'Teslim edildi' },
  ] as const;

  function normalizeStatusCode(raw?: string): string | undefined {
    if (!raw) return undefined;
    const r = String(raw).toLowerCase();
    const found = statusSteps.find(s => s.key === r || s.codeAliases.includes(r));
    return found?.key ?? r;
  }

  function getCurrentStepIndexByOrderNumber(orderNumber: string, fallbackStatus?: string): number {
    const latestCodeRaw = latestStatusByOrderNumber[String(orderNumber)] || fallbackStatus;
    const code = normalizeStatusCode(latestCodeRaw);
    const idx = statusSteps.findIndex(s => s.key === code);
    if (idx >= 0) return idx;
    // Mantıklı varsayılan: pending -> 0
    return 0;
  }

  async function loadProfile(userId?: string) {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const meta: any = user.user_metadata || {};
      setUserProfile(prev => ({
        ...prev,
        name: String(meta.name ?? ''),
        email: String(user.email ?? ''),
      }));
    } catch {
      // Sessizce geç
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        setAuthError('Lütfen e-postanızı doğrulayın. E-posta adresinize gönderilen doğrulama bağlantısına tıklayın.');
        setVerificationEmail(data.user.email);
        setShowEmailVerification(true);
        setShowLoginForm(false);
        return;
      }
      
      setIsLoggedIn(!!data.user);
      setUserEmail(data.user?.email ?? '');
      if (data.user) {
        const meta: any = data.user.user_metadata || {};
        setUserProfile(prev => ({
          ...prev,
          name: String(meta.name || ''),
          email: String(data.user?.email || ''),
          phone: String(meta.phone || ''),
        }));
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Giriş sırasında bir hata oluştu');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            name: registerForm.name,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (data.user && data.user.email) {
        setUserEmail(data.user.email);
        setVerificationEmail(data.user.email);
        
        // Her zaman e-posta doğrulaması sayfasına git
        setShowEmailVerification(true);
        setShowLoginForm(false);
        setIsLoggedIn(false);
      }
      
      // User metadata is already saved in Supabase Auth, no need for separate profiles table
      
    } catch (err: any) {
      setAuthError(err?.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setAuthLoading(false);
    }
  };

  // E-posta doğrulama e-postası yeniden gönder
  const resendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthError(null);
        showSuccess?.('Başarılı', 'Doğrulama e-postası yeniden gönderildi!');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'E-posta gönderilirken hata oluştu');
    }
  };

  // Adresleri yükle
  const loadAddresses = async () => {
    if (!isLoggedIn) return;
    
    try {
      setIsLoadingAddresses(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Adresler yüklenirken hata:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Adres kaydet
  const saveAddress = async () => {
    if (!isLoggedIn) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } catch (error) {
      console.error('Adres kaydedilirken hata:', error);
      showError?.('Hata', 'Adres kaydedilirken hata oluştu');
    }
  };

  // Adres sil
  const deleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    } catch (error) {
      console.error('Adres silinirken hata:', error);
      showError?.('Hata', 'Adres silinirken hata oluştu');
    }
  };

  // Varsayılan adres ayarla
  const setDefaultAddress = async (addressId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } catch (error) {
      console.error('Varsayılan adres ayarlanırken hata:', error);
    }
  };

  // Oturum durumunu yükle ve değişimleri dinle
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      
      // Check if user is logged in AND email is verified
      const isLoggedInAndVerified = data.session && data.session.user?.email_confirmed_at;
      setIsLoggedIn(!!isLoggedInAndVerified);
      setUserEmail(data.session?.user?.email ?? '');
      
      if (isLoggedInAndVerified) {
        await loadProfile(data.session?.user?.id);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Check if user is logged in AND email is verified
      const isLoggedInAndVerified = session && session.user?.email_confirmed_at;
      setIsLoggedIn(!!isLoggedInAndVerified);
      setUserEmail(session?.user?.email ?? '');
      
      if (isLoggedInAndVerified) {
        loadProfile(session?.user?.id);
      }
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Siparişleri yükle
  const loadOrders = async () => {
    if (!isLoggedIn) return;
    
    try {
      setIsLoadingOrders(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const ordersList = data || [];
      setOrders(ordersList);

      // Orders tablosundan direkt status bilgisini al
      const latestMap: Record<string, string> = {};
      for (const order of ordersList) {
        if (order.order_number && order.status) {
          latestMap[String(order.order_number)] = String(order.status);
        }
      }
      setLatestStatusByOrderNumber(latestMap);
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Adresleri yükle (giriş yapıldığında)
  useEffect(() => {
    if (isLoggedIn) {
      loadAddresses();
      loadOrders();
    }
  }, [isLoggedIn]);

  // Logout function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setShowLoginForm(true);
      setUserEmail('');
      setUserProfile({ name: '', email: '', birthDate: '', gender: '' });
      setAddresses([]);
      setOrders([]);
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  // Pull-to-refresh functionality
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (isLoggedIn) {
        await Promise.all([
          loadAddresses(),
          loadOrders(),
          loadProfile()
        ]);
      }
    } catch (error) {
      console.error('Sayfa yenilenirken hata:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    // Daha az hassas: sadece 50px'den fazla çekilirse aktif olsun
    if (distance > 50 && scrollContainerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      // Daha yüksek eşik: 80px'den fazla çekilirse yenile
      if (pullDistance > 80) {
        handleRefresh();
      }
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const menuItems = [
    { id: 'profile', name: 'Profil Bilgileri', icon: User },
    { id: 'orders', name: 'Siparişlerim', icon: Package },
    { id: 'addresses', name: 'Adreslerim', icon: MapPin },
    { id: 'settings', name: 'Ayarlar', icon: Settings }
  ];

  // E-posta doğrulama sayfası
  if (showEmailVerification) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col overscroll-none">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">E-posta Doğrulama</h1>
          <button onClick={onClose}>
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              E-postanızı Doğrulayın
            </h2>
            
            <p className="text-gray-600 mb-6">
              <strong>{verificationEmail}</strong> adresine doğrulama e-postası gönderildi. 
              Lütfen e-postanızı kontrol edin ve doğrulama bağlantısına tıklayın.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Önemli:</strong> E-posta gelmediyse spam klasörünüzü kontrol etmeyi unutmayın.
              </p>
            </div>
            
            {authError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {authError}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={resendVerificationEmail}
                className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                Doğrulama E-postasını Yeniden Gönder
              </button>
              
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setShowLoginForm(true);
                  setAuthError(null);
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col overscroll-none">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Hesabım</h1>
          <button onClick={onClose}>
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Login/Register Toggle */}
        <div className="p-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowLoginForm(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                showLoginForm ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setShowLoginForm(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !showLoginForm ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Kayıt Ol
            </button>
          </div>
        </div>

        {/* Forms */}
        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          <div className="mx-auto w-full max-w-md">
            {authError && (
              <div className="mb-4 text-sm text-red-600">{authError}</div>
            )}
            {showLoginForm ? (
              <form onSubmit={handleLogin} className="space-y-4 pb-20">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" />
                  <span className="ml-2 text-sm text-gray-600">Beni hatırla</span>
                </label>
                <button type="button" className="text-sm text-yellow-600 hover:text-yellow-700">
                  Şifremi unuttum
                </button>
              </div>
                <div className="sticky bottom-0 left-0 right-0 bg-white pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-60"
                  >
                    {authLoading ? 'Giriliyor...' : 'Giriş Yap'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 pb-20">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="Adınız Soyadınız"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre Tekrar</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
                  placeholder="••••••••"
                  required
                />
              </div>
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" required />
                <span className="ml-2 text-sm text-gray-600">
                  <a href="#" className="text-yellow-600 hover:text-yellow-700">Kullanım koşulları</a> ve 
                  <a href="#" className="text-yellow-600 hover:text-yellow-700"> gizlilik politikası</a>nı kabul ediyorum.
                </span>
              </label>
                <div className="sticky bottom-0 left-0 right-0 bg-white pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-60"
                  >
                    {authLoading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    Kayıt sonrası e-posta doğrulaması gerekebilir. Lütfen gelen kutunuzu kontrol edin.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overscroll-none" style={{ paddingBottom: '80px' }}>
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => {
                onNavigate?.('home');
                onClose();
              }}
              className="text-2xl font-serif font-bold tracking-widest text-black hover:text-gray-600 transition-colors cursor-pointer"
            >
              LUNORA
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => {
                  onNavigate?.('home');
                  onClose();
                }}
                className="text-sm font-medium transition-colors hover:text-yellow-600 text-gray-700"
              >
                Ana Sayfa
              </button>
              <button
                onClick={() => {
                  onNavigate?.('search');
                  onClose();
                }}
                className="text-sm font-medium transition-colors hover:text-yellow-600 text-gray-700"
              >
                Arama
              </button>
              <button
                onClick={() => {
                  onNavigate?.('cart');
                  onClose();
                }}
                className="text-sm font-medium transition-colors hover:text-yellow-600 text-gray-700"
              >
                Sepetim
              </button>
              <button
                onClick={() => {
                  onNavigate?.('favorites');
                  onClose();
                }}
                className="text-sm font-medium transition-colors hover:text-yellow-600 text-gray-700"
              >
                Favorilerim
              </button>
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  onNavigate?.('search');
                  onClose();
                }}
                className="hidden md:block p-1 text-gray-600 hover:text-yellow-600 transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  onNavigate?.('cart');
                  onClose();
                }}
                className="hidden md:block relative p-1 text-gray-600 hover:text-yellow-600 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
              <button onClick={onClose}>
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Account Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Hesabım</h1>
      </div>

      {/* User Info */}
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white p-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold">{userProfile.name || (userEmail ? userEmail.split('@')[0] : 'Kullanıcı')}</h2>
            <p className="text-yellow-100 text-sm">{userEmail || userProfile.email}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-3 text-xs font-medium transition-colors ${
                  activeTab === item.id 
                    ? 'text-yellow-600 border-b-2 border-yellow-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {isPulling && pullDistance > 50 && (
        <div 
          className="flex items-center justify-center py-2 bg-gray-50 border-b border-gray-200"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          <RefreshCw className={`h-5 w-5 text-yellow-600 ${pullDistance > 80 ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-sm text-gray-600">
            {pullDistance > 80 ? 'Bırakın ve yenileyin' : 'Yenilemek için çekin'}
          </span>
        </div>
      )}

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Refresh loading indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-4 bg-gray-50 border-b border-gray-200">
            <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Yenileniyor...</span>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Kişisel Bilgiler</h3>
                <button className="text-yellow-600 hover:text-yellow-700">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{userProfile.name || '—'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{userEmail || userProfile.email || '—'}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{userProfile.birthDate}</span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Siparişlerim</h3>
            
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Siparişler yükleniyor...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Henüz siparişiniz yok</p>
                <p className="text-gray-400 text-sm">Alışverişe başlayın ve ilk siparişinizi verin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">Sipariş #{order.order_number}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      {(() => {
                        const currentIdx = getCurrentStepIndexByOrderNumber(order.order_number, order.status);
                        const currentKey = statusSteps[currentIdx]?.key;
                        const badgeClass = currentKey === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          currentKey === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          currentKey === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          currentKey === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800';
                        const badgeText = currentKey === 'pending' ? 'Beklemede' :
                          currentKey === 'preparing' ? 'Hazırlanıyor' :
                          currentKey === 'shipped' ? 'Kargoya Verildi' :
                          currentKey === 'delivered' ? 'Teslim Edildi' : '—';
                        return (
                          <span className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>
                            {badgeText}
                          </span>
                        );
                      })()}
                    </div>

                    {/* 4 Adımlı Step Bar */}
                    <div className="mb-4">
                      {/* Step Bar - Daireler */}
                      <div className="flex items-center relative">
                        {statusSteps.map((step, idx) => {
                          const currentIdx = getCurrentStepIndexByOrderNumber(order.order_number, order.status);
                          const reached = idx <= currentIdx;
                          return (
                            <div key={step.key} className="flex-1 flex items-center justify-center relative z-10">
                              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border ${reached ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-500 border-gray-300'}`}>
                                {reached && idx === currentIdx ? idx + 1 : reached ? <Check className="w-4 h-4" /> : idx + 1}
                              </div>
                            </div>
                          );
                        })}
                        {/* Çubuklar - Adımlar arasında, absolute positioning ile */}
                        {statusSteps.map((step, idx) => {
                          if (idx >= statusSteps.length - 1) return null;
                          const currentIdx = getCurrentStepIndexByOrderNumber(order.order_number, order.status);
                          const isActive = idx < currentIdx;
                          // Her adım %25 yer kaplıyor, çubuklar adımlar arasında
                          // Çubuk merkezleri: 25%, 50%, 75% (idx+1) * 25%
                          const barCenter = ((idx + 1) * 100) / statusSteps.length; // 25%, 50%, 75%
                          const barWidth = 100 / statusSteps.length; // 25% genişlik
                          return (
                            <div
                              key={`bar-${idx}`}
                              className="absolute h-1 rounded"
                              style={{
                                left: `${barCenter}%`,
                                width: `${barWidth}%`,
                                transform: 'translateX(-50%)',
                                zIndex: 0,
                              }}
                            >
                              <div className={`h-full rounded ${isActive ? 'bg-yellow-600' : 'bg-gray-200'}`}></div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Label'lar - Adımların tam altında, grid ile eşit dağıtılmış */}
                      <div className="grid grid-cols-4 mt-2">
                        {statusSteps.map((step) => (
                          <div key={step.key} className="text-[11px] text-center text-gray-600">
                            {step.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Toplam Tutar:</span>
                        <span className="font-semibold">₺{order.total_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ödeme:</span>
                        <span>{order.payment_method === 'kapida_odeme' ? 'Kapıda Ödeme' : order.payment_method}</span>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Sipariş Detayları:</h5>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-3">
                            <img
                              src={item.image || 'https://via.placeholder.com/60x60?text=No+Image'}
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded border border-gray-200"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                              <p className="text-xs text-gray-600">Beden: {item.size} • Adet: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">₺{item.price * item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adreslerim</h3>
              <button
                onClick={() => setShowAddAddress(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Yeni Adres
              </button>
            </div>

            {isLoadingAddresses ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Adresler yükleniyor...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Henüz kayıtlı adresiniz yok</p>
                <button
                  onClick={() => setShowAddAddress(true)}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  İlk Adresinizi Ekleyin
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{address.title}</h4>
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
                            onClick={() => setDefaultAddress(address.id)}
                            className="text-xs text-yellow-600 hover:text-yellow-700"
                          >
                            Varsayılan Yap
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddress(address.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold mb-4">Bildirim Ayarları</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">E-posta bildirimleri</span>
                  <input type="checkbox" className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">SMS bildirimleri</span>
                  <input type="checkbox" className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Kampanya bildirimleri</span>
                  <input type="checkbox" className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-600" defaultChecked />
                </label>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Yeni Adres Ekle</h2>
                <button
                  onClick={() => setShowAddAddress(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

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

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-lg">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => onNavigate?.('home')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'home' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Ana Menü</span>
          </button>

          <button
            onClick={() => onNavigate?.('search')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'search' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Arama</span>
          </button>

          <button
            onClick={() => onNavigate?.('cart')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'cart' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs mt-1">Sepetim</span>
          </button>

          <button
            onClick={() => onNavigate?.('favorites')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'favorites' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs mt-1">Favori</span>
          </button>

          <button
            onClick={() => onNavigate?.('account')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'account' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Hesabım</span>
          </button>
        </div>
      </div>
    </div>
  );
}