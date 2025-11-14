import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Search, User, Menu, X, Heart, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import SearchPage from './components/SearchPage';
import AccountPage from './components/AccountPage';
import FavoritesPanel from './components/FavoritesPanel';
import CartSidebar from './components/CartSidebar';
import CategoriesPage from './components/CategoriesPage';
import CategoriesDetailPage from './components/CategoriesDetailPage';
import CheckoutPage from './components/CheckoutPage';
import StaticPage from './components/StaticPage';
import { ToastContainer, useToast } from './components/Toast';
import { fetchUserCart, saveUserCart } from './lib/cartService';
import { supabase } from './lib/supabaseClient';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  image?: string | null;
  images?: string[]; // Çoklu görseller
  category?: string | null;
  category_name?: string | null;
  rating?: number | null;
  isNew?: boolean | null;
  isSale?: boolean | null;
  description?: string | null;
  stock?: number | null;
  gender?: string | null;
  sizes?: string[]; // Array olarak bedenler
  color?: string | null; // hex renk kodu örn: #fff
  colors?: string[]; // Birden çok renk seçeneği
  product_code?: string | null; // Ürün kodu
  // İndirim alanları
  discount_percentage?: number | null;
  discount_price?: number | null;
  is_discounted?: boolean | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  // Kampanya alanları
  campaign_type?: string | null; // 'buy_x_get_y' (3 al 2 öde)
  campaign_active?: boolean | null;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
}

interface CartItem extends Product {
  quantity: number;
  size: string;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
}

// Banner Section Component
function BannerSection() {
  interface SiteLayoutImage {
    title?: string | null;
    alt?: string | null;
    url: string;
    path: string;
    order_index?: number | null;
  }

  const [bannerImages, setBannerImages] = useState<SiteLayoutImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Görselleri Supabase'den çek
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_layout_images')
          .select('title, alt, url, path, order_index, created_at')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!isMounted) return;
        setBannerImages((data as any[]) as SiteLayoutImage[]);
        setCurrentIndex(0);
      } catch (e) {
        // Header banner görselleri alınamadı, yerel fallback kullanılacak
        if (!isMounted) return;
        // Yerel fallback: birden fazla görsel kullan (public/banner altındaki dosyalar)
        const localFallback: SiteLayoutImage[] = [
          {
            title: 'Sezon Fırsatları',
            alt: 'Sezon Fırsatları',
            url: '/banner/Black White Simple Fashion Sale Banner Landscape.svg',
            path: '/banner/Black White Simple Fashion Sale Banner Landscape.svg',
            order_index: 0,
          },
          {
            title: 'Minimal Koleksiyon',
            alt: 'Minimal Koleksiyon',
            url: '/banner-minimal.jpg',
            path: '/banner-minimal.jpg',
            order_index: 1,
          },
          {
            title: 'Yeni Sezon',
            alt: 'Yeni Sezon',
            url: '/banner-beige.png',
            path: '/banner-beige.png',
            order_index: 2,
          },
          {
            title: 'Zarif Stil',
            alt: 'Zarif Stil',
            url: '/banner-white.png',
            path: '/banner-white.png',
            order_index: 3,
          },
        ];
        setBannerImages(localFallback);
        setCurrentIndex(0);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 20 saniyelik slayt (sürekli döngü, hover duraklatma yok)
  useEffect(() => {
    if (!bannerImages || bannerImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [bannerImages]);

  return (
    <section className="relative -mt-0">
      {/* Mobile Banner */}
      <div className="max-[768px]:block md:hidden relative overflow-hidden">
        <img
          src={bannerImages[currentIndex]?.url || '/banner/Black White Simple Fashion Sale Banner Landscape.svg'}
          alt={bannerImages[currentIndex]?.alt || bannerImages[currentIndex]?.title || 'Banner'}
          className="w-full h-auto object-contain"
        />
        
      </div>

      {/* Tablet Banner */}
      <div className="hidden min-[768px]:block lg:hidden relative h-[50vh] overflow-hidden">
        <img
          src={bannerImages[currentIndex]?.url || '/banner/Black White Simple Fashion Sale Banner Landscape.svg'}
          alt={bannerImages[currentIndex]?.alt || bannerImages[currentIndex]?.title || 'Banner'}
          className="w-full h-full object-contain bg-gray-100"
        />
        
      </div>

      {/* Desktop Banner */}
      <div className="hidden lg:block relative h-[70vh] overflow-hidden">
        <img
          src={bannerImages[currentIndex]?.url || '/banner/Black White Simple Fashion Sale Banner Landscape.svg'}
          alt={bannerImages[currentIndex]?.alt || bannerImages[currentIndex]?.title || 'Banner'}
          className="w-full h-full object-contain bg-gray-100"
        />
        
      </div>
    </section>
  );
}

function App() {
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast();
  
  // Test toast'u - geliştirme sırasında kullanılabilir
  // useEffect(() => {
  //   showSuccess('Toast Sistemi Aktif!', 'Artık güzel bildirimler gösteriliyor');
  // }, []);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [productImageIndices, setProductImageIndices] = useState<{ [key: number]: number }>({});
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState('home');
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [promoText, setPromoText] = useState<string>("");
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1920;
  });
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showCategoriesPage, setShowCategoriesPage] = useState(false);
  const [showCategoriesDetailPage, setShowCategoriesDetailPage] = useState(false);
  const [showCheckoutPage, setShowCheckoutPage] = useState(false);
  const [activeStaticPage, setActiveStaticPage] = useState<null | { key: string; title: string }>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const scrollToProductsSection = () => {
    // Kısa gecikme: state güncellemesi sonrası DOM hazır olsun
    window.setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };


  const openPanel = (panel: 'home' | 'search' | 'account' | 'cart' | 'favorites' | 'menu') => {
    // Close all panels first
    setIsMenuOpen(false);
    setIsCartOpen(false);
    setIsSearchOpen(false);
    setIsFavoritesOpen(false);
    setIsAccountOpen(false);
    setShowSearchPage(false);
    setShowAccountPage(false);
    setShowCategoriesDetailPage(false);
    setShowCheckoutPage(false);
    setSelectedProduct(null);

    // Open the requested panel
    if (panel === 'search') {
      setShowSearchPage(true);
      setIsSearchOpen(true);
      setActiveBottomTab('search');
    } else if (panel === 'account') {
      setShowAccountPage(true);
      setIsAccountOpen(true);
      setActiveBottomTab('account');
    } else if (panel === 'cart') {
      setIsCartOpen(true);
      setActiveBottomTab('cart');
    } else if (panel === 'favorites') {
      setIsFavoritesOpen(true);
      setActiveBottomTab('favorites');
    } else if (panel === 'menu') {
      setIsMenuOpen(true);
      setActiveBottomTab('home');
    } else if (panel === 'home') {
      setActiveBottomTab('home');
    }

    // History yönetimi: panel açıldığında geri tuşu ile kapatılabilsin
    if (panel !== 'home') {
      try {
        window.history.pushState({ panel }, '', window.location.href);
      } catch {}
    }
  };

  // Geri (back) tuşu ile tüm panelleri kapat
  useEffect(() => {
    const handlePopState = () => {
      setIsMenuOpen(false);
      setIsCartOpen(false);
      setIsSearchOpen(false);
      setIsFavoritesOpen(false);
      setIsAccountOpen(false);
      setShowSearchPage(false);
      setShowAccountPage(false);
      setShowCheckoutPage(false);
      setSelectedProduct(null);
      setActiveBottomTab('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Modal açıkken body scroll'u kilitle
  useEffect(() => {
    const shouldLock = !!selectedProduct || isCartOpen || isFavoritesOpen || isAccountOpen || isSearchOpen || isMenuOpen;
    const previous = document.body.style.overflow;
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previous || '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProduct, isCartOpen, isFavoritesOpen, isAccountOpen, isSearchOpen, isMenuOpen]);

  // Ürün değiştiğinde görsel indexini sıfırla
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedProduct]);

  // Ürünleri Supabase'den çek
  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        // Önce ürünleri çek
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });
        
        if (productsError) throw productsError;
        if (!isMounted) return;

        // Sonra product_images tablosundan tüm görselleri çek
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .order('product_id', { ascending: true });

        if (imagesError) {
          console.warn('Product images çekilemedi:', imagesError);
        }

        // Görselleri product_id'ye göre grupla - UUID string olarak
        const imagesByProduct: { [key: string]: string[] } = {};
        if (imagesData) {
          imagesData.forEach((img: any) => {
            const productId = String(img.product_id);
            if (!imagesByProduct[productId]) {
              imagesByProduct[productId] = [];
            }
            if (img.image_url) {
              imagesByProduct[productId].push(img.image_url);
            }
          });
        }

        const mapped: Product[] = (productsData || []).map((row: any) => {
          const imageKey = ['image', 'image_url', 'photo', 'thumbnail', 'cover', 'img', 'picture'].find(k => k in row && row[k]);
          const imageVal = imageKey ? String(row[imageKey]) : null;

          // Çoklu görselleri kapsamlı biçimde topla
          const collected = new Set<string>();

          // Yardımcı: dizeyi ayır ve ekle
          const addFromString = (val: string) => {
            if (!val) return;
            const parts = val
              .split(/[,;|\n]/)
              .map((s) => s.trim())
              .filter(Boolean);
            parts.forEach((p) => collected.add(p));
          };
          const addFromAny = (val: any) => {
            if (!val) return;
            if (Array.isArray(val)) {
              val.forEach((x) => {
                if (typeof x === 'string') addFromString(x);
              });
            } else if (typeof val === 'string') {
              addFromString(val);
            }
          };

          // Bilinen alanlar
          addFromAny(row.images);
          addFromAny(row.gallery);
          addFromAny(row.photos);
          addFromAny(row.pictures);

          // image1, image2 ... photo1, photo2 ... gibi alanları tara
          Object.entries(row).forEach(([key, val]) => {
            const k = key.toLowerCase();
            const looksImageKey = (
              k.includes('image') ||
              k.includes('photo') ||
              k.includes('picture') ||
              k.includes('thumbnail') ||
              k.includes('thumb')
            );
            if (!looksImageKey) return;
            if (typeof val === 'string' || Array.isArray(val)) addFromAny(val);
          });

          // product_images tablosundan gelen görselleri ekle - sadece bu ürüne ait olanları
          const productId = String(row.id);
          if (imagesByProduct[productId]) {
            imagesByProduct[productId].forEach(imgUrl => {
              if (imgUrl) collected.add(imgUrl);
            });
          }

          const images = Array.from(collected);
          if (imageVal) {
            // Ana görseli başa al
            const withoutMain = images.filter((u) => u !== imageVal);
            images.splice(0, images.length, imageVal, ...withoutMain);
          }
          
          // Supabase'den gelen size verisini olduğu gibi kullan
          let sizes: string[] = [];
          
          if (row.size) {
            // Size kolonunda ne varsa onu kullan
            if (typeof row.size === 'string') {
              // Virgülle ayrılmış string'i array'e çevir
              sizes = row.size.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(row.size)) {
              // Zaten array ise direkt kullan
              sizes = row.size.filter(Boolean);
            }
          }

          // Renkleri işle
          let colors: string[] = [];
          if (row.colors) {
            if (typeof row.colors === 'string') {
              // Virgülle ayrılmış string'i array'e çevir
              colors = row.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
            } else if (Array.isArray(row.colors)) {
              // Zaten array ise direkt kullan
              colors = row.colors.filter(Boolean);
            }
          }
          // Eğer colors yoksa ama color varsa, onu ekle
          if (colors.length === 0 && row.color) {
            colors = [row.color];
          }

          // Gender normalizasyonu: kız -> kadın, hepsi lowercase
          let normalizedGender: string | null = null;
          if (row.gender) {
            const g = String(row.gender).trim().toLowerCase();
            normalizedGender = g === 'kız' ? 'kadın' : g;
          }

          // ID'yi güvenli şekilde işle
          const rawId = row.id;
          const safeId = (rawId && !isNaN(Number(rawId))) ? Number(rawId) : Math.floor(Math.random() * 1000000);
          
          if (isNaN(safeId)) {
            console.warn('NaN ID tespit edildi:', row.id, '->', safeId);
          }
          
          return {
            id: safeId,
            name: String(row.name ?? ''),
            price: Number(row.price ?? 0),
            originalPrice: row.originalPrice ?? null,
            image: imageVal,
            images,
            category: row.category ?? null,
            category_name: row.category_name ?? null,
            rating: row.rating ?? null,
            isNew: row.isNew ?? null,
            isSale: row.isSale ?? null,
            description: row.description ?? null,
            stock: row.stock ?? null,
            gender: normalizedGender,
            sizes: sizes, // Supabase'den gelen tüm bedenler
            color: row.color ?? null,
            colors: colors, // Birden çok renk seçeneği
            product_code: row.product_code ?? null, // Ürün kodu
            // İndirim alanları
            discount_percentage: row.discount_percentage ?? null,
            discount_price: row.discount_price ?? null,
            is_discounted: row.is_discounted ?? null,
            discount_start_date: row.discount_start_date ?? null,
            discount_end_date: row.discount_end_date ?? null,
            // Kampanya alanları
            campaign_type: row.campaign_type ?? null,
            campaign_active: row.campaign_active ?? null,
            campaign_start_date: row.campaign_start_date ?? null,
            campaign_end_date: row.campaign_end_date ?? null,
          } as Product;
        });
        setProducts(mapped);
      } catch (err: any) {
        if (!isMounted) return;
        // Daha fazla teşhis için ayrıntılı log
        // Supabase hata nesnesi genelde { message, details, hint, code } içerir
        // 500 durumlarında Network tabındaki yanıt gövdesi de incelenmelidir
        // eslint-disable-next-line no-console
        console.error('Supabase products sorgusu hatası:', err);
        const details = [err?.message, err?.details, err?.hint].filter(Boolean).join(' • ');
        setProductsError(details || 'Ürünler yüklenirken hata oluştu');
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    };
    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Site settings: promo (üst şerit) metnini yükle ve canlı dinle (value kolonu)
  useEffect(() => {
    let isMounted = true;
    const fetchPromo = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!isMounted) return;
        const text = (data?.value && typeof data.value === 'string') ? data.value.trim() : "";
        setPromoText(text);
      } catch (e) {
        setPromoText("");
      }
    };
    fetchPromo();

    // Realtime: tablo değişince yeniden çek
    const channel = supabase
      .channel('site_settings_promo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchPromo();
      })
      .subscribe();

    return () => {
      isMounted = false;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // Window resize: ekran genişliğine göre şerit tekrar sayısı için
  useEffect(() => {
    // Başlangıçta genişliği doğru al
    setWindowWidth(window.innerWidth);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Promo text tekrar sayısını hesapla (ekran genişliğine göre, baştan dolu olsun)
  const promoRepeatCount = useMemo(() => {
    if (!promoText) return 0;
    // Ortalama karakter genişliği: ~8px (text-xs) / ~10px (text-sm), mx-6 = 24px margin
    const avgCharWidth = windowWidth < 640 ? 6 : 8;
    const textWidth = promoText.length * avgCharWidth + 48; // mx-6 (24px * 2)
    // Ekran genişliğinin en az 4-5 katı kadar tekrar (baştan dolu görünsün, kesintisiz akış)
    const minRepeats = Math.ceil((windowWidth * 5) / textWidth) + 3; // 5x ekran genişliği + buffer
    return Math.max(10, minRepeats); // Minimum 10 tekrar (baştan dolu olsun)
  }, [promoText, windowWidth]);

  // Kategorileri Supabase'den çek
  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description, image_url')
          .order('name', { ascending: true });
        
        if (error) {
          console.error('Supabase categories hatası:', error);
          throw error;
        }
        
        if (!isMounted) return;
        setCategories(data || []);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Kategoriler yüklenirken hata:', err);
        // Hata durumunda varsayılan kategorileri göster
        setCategories([
          { id: 'kadın', name: 'Kadın', description: 'Kadın giyim ürünleri', image_url: undefined },
          { id: 'erkek', name: 'Erkek', description: 'Erkek giyim ürünleri', image_url: undefined }
        ]);
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Kategori filtresi: Supabase kategorilerine göre filtrele
  const filteredProducts = useMemo(() => {
    let filtered: Product[] = [];
    
    if (selectedCategory === 'all') {
      filtered = products;
    } else {
      // Önce gender alanına göre kontrol et (kadın/erkek)
      const genderKeys = ['kadın', 'erkek'];
      if (genderKeys.includes(selectedCategory)) {
        filtered = products.filter(product => {
          const g = (product.gender || '').toLowerCase();
          return g === selectedCategory || g === 'unisex';
        });
      } else {
        // Kategori adına göre filtrele - büyük/küçük harf duyarsız karşılaştırma
        filtered = products.filter(product => {
          const productCategory = (product.category_name || product.category || '').toLowerCase();
          const productName = (product.name || '').toLowerCase();
          const selectedCategoryLower = selectedCategory.toLowerCase();
          
          // Tam kategori eşleşmesi (büyük/küçük harf duyarsız)
          if (productCategory === selectedCategoryLower) {
            return true;
          }
          
          // Ürün adında kategori geçiyorsa (örneğin "ceket" -> "kolaj ceketi")
          if (productName.includes(selectedCategoryLower)) {
            return true;
          }
          
          return false;
        });
      }
    }
    
    // Stok durumuna göre sırala: stokta olanlar önce, stokta olmayanlar sonda
    const sortedByStock = filtered.sort((a, b) => {
      const aStock = a.stock ?? 0;
      const bStock = b.stock ?? 0;
      
      // Stokta olanlar önce (1), stokta olmayanlar sonda (0)
      if (aStock > 0 && bStock <= 0) return -1;
      if (aStock <= 0 && bStock > 0) return 1;
      
      // Aynı stok durumundaysa orijinal sırayı koru
      return 0;
    });
    
    return sortedByStock;
  }, [products, selectedCategory]);

  // Kategorileri Z-A sırala (ana sayfa grid için)
  const sortedCategories = useMemo(() => {
    const copy = [...categories];
    copy.sort((a, b) => {
      const an = (a.name || '').toLocaleLowerCase('tr');
      const bn = (b.name || '').toLocaleLowerCase('tr');
      return bn.localeCompare(an, 'tr');
    });
    return copy;
  }, [categories]);

  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [] as Product[];
    const byCategory = products.filter(p => 
      p.id !== selectedProduct.id && (p.category_name || p.category || '').toLowerCase() === (selectedProduct.category_name || selectedProduct.category || '').toLowerCase()
    );
    const base = byCategory.length > 0
      ? byCategory
      : products.filter(p => p.id !== selectedProduct.id && (p.gender || '').toLowerCase() === (selectedProduct.gender || '').toLowerCase());
    return base.slice(0, 8);
  }, [products, selectedProduct]);

  const addToCart = (product: Product, size: string, quantity: number = 1) => {
    const existingItem = cart.find(item => item.id === product.id && item.size === size);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id && item.size === size
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: quantity, size }]);
    }
    setSelectedProduct(null);
    setSelectedSize(''); // Beden seçimini sıfırla
    setSelectedQuantity(1); // Miktarı sıfırla
  };

  const updateQuantity = (id: number, size: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => !(item.id === id && item.size === size)));
    } else {
      setCart(cart.map(item => 
        item.id === id && item.size === size
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  // Kullanıcı sepet senkronizasyonu (yerel boşsa uzak sepeti yükle)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      try {
        if (cart.length > 0) return; // yerel doluysa birleştirme yapma (çift sayımı önle)
        const remote = await fetchUserCart(userId);
        if (!isMounted) return;
        if (remote.length === 0) return;
        const normalized = (remote as any[]).map((i) => ({
          id: Number(i.id),
          name: String(i.name),
          price: Number(i.price),
          image: i.image ?? null,
          size: String(i.size),
          quantity: Number(i.quantity || 0),
        })) as CartItem[];
        setCart(normalized);
      } catch (e) {
        // Uzak sepet alınamadı
      }
    })();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce ile uzak kaydetme
  useEffect(() => {
    let timer: number | undefined;
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        const userId = data.session?.user?.id;
        if (!userId) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(async () => {
          if (!isMounted) return;
          try {
            await saveUserCart(userId, cart.map(i => ({
              id: i.id,
              name: i.name,
              price: i.price,
              image: i.image ?? null,
              size: i.size,
              quantity: i.quantity,
            })));
          } catch (_e) {
            // Sepet kaydedilemedi - sessizce geç (cartService içinde zaten loglanıyor)
          }
        }, 500);
      } catch (_e) {
        // Session alınamadı - sessizce geç
      }
    })();
    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [cart]);

  // Kampanya aktif mi kontrol et (tarih kontrolü ile)
  const isCampaignActive = (product: Product): boolean => {
    if (!product.campaign_active || product.campaign_type !== 'buy_x_get_y') {
      return false;
    }
    const now = new Date();
    if (product.campaign_start_date) {
      const startDate = new Date(product.campaign_start_date);
      if (now < startDate) return false;
    }
    if (product.campaign_end_date) {
      const endDate = new Date(product.campaign_end_date);
      if (now > endDate) return false;
    }
    return true;
  };

  // Ara Toplam (kampanya UYGULANMADAN) – ürünlerin adet x birim fiyat toplamı
  const getBaseSubtotal = () => {
    return cart.reduce((total, item) => {
      const itemPrice = (item.is_discounted && item.discount_price) ? item.discount_price : item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getTotalPrice = () => {
    // Ürün ID'lerine göre grupla (farklı bedenler aynı ürün sayılır)
    const productsGrouped = new Map<number, { items: CartItem[], totalQuantity: number }>();
    
    cart.forEach(item => {
      if (!productsGrouped.has(item.id)) {
        productsGrouped.set(item.id, { items: [], totalQuantity: 0 });
      }
      const group = productsGrouped.get(item.id)!;
      group.items.push(item);
      group.totalQuantity += item.quantity;
    });

    let total = 0;

    productsGrouped.forEach((group) => {
      const firstItem = group.items[0];
      const itemPrice = (firstItem.is_discounted && firstItem.discount_price) 
        ? firstItem.discount_price 
        : firstItem.price;

      // Kampanya kontrolü: 3 al 2 öde (aynı ürünün farklı bedenleri birlikte sayılır)
      if (isCampaignActive(firstItem) && firstItem.campaign_type === 'buy_x_get_y') {
        // Toplam miktar (farklı bedenler dahil)
        const totalQuantity = group.totalQuantity;
        // 3 al 2 öde: Her 3 üründen 1'i ücretsiz
        const freeItems = Math.floor(totalQuantity / 3);
        const paidItems = totalQuantity - freeItems;
        total += (itemPrice * paidItems);
      } else {
        // Normal fiyat hesaplama (tüm bedenler ayrı ayrı)
        group.items.forEach(item => {
          const price = (item.is_discounted && item.discount_price) ? item.discount_price : item.price;
          total += (price * item.quantity);
        });
      }
    });

    return total;
  };

  // Kampanya tasarruf hesaplama (gösterim için - farklı bedenler birlikte sayılır)
  const getCampaignSavings = (): number => {
    // Ürün ID'lerine göre grupla (farklı bedenler aynı ürün sayılır)
    const productsGrouped = new Map<number, { items: CartItem[], totalQuantity: number }>();
    
    cart.forEach(item => {
      if (!productsGrouped.has(item.id)) {
        productsGrouped.set(item.id, { items: [], totalQuantity: 0 });
      }
      const group = productsGrouped.get(item.id)!;
      group.items.push(item);
      group.totalQuantity += item.quantity;
    });

    let totalSavings = 0;

    productsGrouped.forEach((group) => {
      const firstItem = group.items[0];
      
      // Kampanya kontrolü: 3 al 2 öde (aynı ürünün farklı bedenleri birlikte sayılır)
      if (isCampaignActive(firstItem) && firstItem.campaign_type === 'buy_x_get_y') {
        const itemPrice = (firstItem.is_discounted && firstItem.discount_price) 
          ? firstItem.discount_price 
          : firstItem.price;
        // Toplam miktar (farklı bedenler dahil)
        const totalQuantity = group.totalQuantity;
        const freeItems = Math.floor(totalQuantity / 3);
        totalSavings += (itemPrice * freeItems);
      }
    });

    return totalSavings;
  };

  const getShippingCost = () => {
    const subtotal = getTotalPrice();
    return subtotal >= 1500 ? 0 : 50;
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getShippingCost();
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const toggleFavorite = (product: Product) => {
    const targetId = Number(product.id);
    setFavorites(prev => {
      const exists = prev.some(fav => Number(fav.id) === targetId);
      return exists ? prev.filter(fav => Number(fav.id) !== targetId) : [...prev, product];
    });
  };

  const isFavorite = (productId: number) => {
    return favorites.some(fav => fav.id === productId);
  };

  const removeFavorite = (productId: number) => {
    const targetId = Number(productId);
    setFavorites(prev => {
      const next = prev.filter(f => Number(f.id) !== targetId);
      // Favori kaldırılamadı
      return next;
    });
  };

  const scrollToProductCard = (productId: number) => {
    const el = document.getElementById(`product-card-${productId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash-highlight');
    window.setTimeout(() => {
      el.classList.remove('flash-highlight');
    }, 1600);
  };

  // Görsel önyükleme fonksiyonu
  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.has(src)) {
        resolve();
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, src]));
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  // Tüm ürün görsellerini önyükle
  useEffect(() => {
    const preloadAllImages = async () => {
      const imagePromises: Promise<void>[] = [];
      
      products.forEach(product => {
        if (product.image) {
          imagePromises.push(preloadImage(product.image));
        }
        if (product.images && product.images.length > 0) {
          product.images.forEach(img => {
            imagePromises.push(preloadImage(img));
          });
        }
      });
      
      try {
        await Promise.all(imagePromises);
      } catch (error) {
        // Görsel önyükleme hatası - sessizce geç
      }
    };
    
    if (products.length > 0) {
      preloadAllImages();
    }
  }, [products, preloadedImages]);

  const changeProductImage = (productId: number, direction: 'next' | 'prev') => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.images || product.images.length <= 1) return;

    const currentIndex = productImageIndices[productId] || 0;
    const totalImages = product.images.length;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % totalImages;
    } else {
      newIndex = (currentIndex - 1 + totalImages) % totalImages;
    }

    // Görseli önyükle
    const nextImageSrc = product.images[newIndex];
    if (nextImageSrc && !preloadedImages.has(nextImageSrc)) {
      preloadImage(nextImageSrc);
    }

    // Anında state güncelle - hiç gecikme yok
    setProductImageIndices(prev => {
      const newState = { ...prev };
      newState[productId] = newIndex;
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Top Promo Bar - site_settings içeriği yoksa gizli */}
      {promoText && (
        <div className="bg-red-600 text-white text-xs sm:text-sm py-2">
          <div className="overflow-hidden relative">
            <div className="flex whitespace-nowrap" style={{ animation: 'marquee-left 20s linear infinite' }}>
              {/* İlk kopya - baştan görünür */}
              <div className="flex-shrink-0">
                {Array.from({ length: promoRepeatCount }, (_, i) => (
                  <span key={`promo-1-${i}`} className="mx-6 inline-block">{promoText}</span>
                ))}
              </div>
              {/* İkinci kopya - kesintisiz döngü için */}
              <div className="flex-shrink-0">
                {Array.from({ length: promoRepeatCount }, (_, i) => (
                  <span key={`promo-2-${i}`} className="mx-6 inline-block">{promoText}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => {
                setSelectedCategory('all');
                setActiveBottomTab('home');
                setIsMenuOpen(false);
                setIsCartOpen(false);
                setIsSearchOpen(false);
                setIsFavoritesOpen(false);
                setIsAccountOpen(false);
                setShowSearchPage(false);
                setShowAccountPage(false);
                setShowCheckoutPage(false);
                setSelectedProduct(null);
              }}
              className="text-2xl font-serif font-bold tracking-widest text-black hover:text-gray-600 transition-colors cursor-pointer"
            >
              LUNORA
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => { setSelectedCategory('all'); scrollToProductsSection(); }}
                className={`text-sm font-semibold transition-colors hover:text-yellow-600 ${
                  selectedCategory === 'all' ? 'text-yellow-600' : 'text-gray-700'
                }`}
              >
                Tüm Ürünler
              </button>
              <button
                onClick={() => { setSelectedCategory('kadın'); scrollToProductsSection(); }}
                className={`text-sm font-semibold transition-colors hover:text-yellow-600 ${
                  selectedCategory === 'kadın' ? 'text-yellow-600' : 'text-gray-700'
                }`}
              >
                Kadın
              </button>
              <button
                onClick={() => { setSelectedCategory('erkek'); scrollToProductsSection(); }}
                className={`text-sm font-semibold transition-colors hover:text-yellow-600 ${
                  selectedCategory === 'erkek' ? 'text-yellow-600' : 'text-gray-700'
                }`}
              >
                Erkek
              </button>
              <button
                onClick={() => {
                  setShowCategoriesDetailPage(true);
                  setIsMenuOpen(false);
                }}
                className="text-sm font-semibold transition-colors hover:text-yellow-600 text-gray-700"
              >
                Kategoriler
              </button>
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-4">
              <Search 
                className="hidden md:block h-5 w-5 text-gray-600 cursor-pointer hover:text-yellow-600 transition-colors" 
                onClick={() => openPanel('search')}
              />
              <User 
                className="hidden md:block h-5 w-5 text-gray-600 cursor-pointer hover:text-yellow-600 transition-colors" 
                onClick={() => openPanel('account')}
              />
              <button
                onClick={() => openPanel('cart')}
                className="hidden md:block relative p-1 text-gray-600 hover:text-yellow-600 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  if (isMenuOpen) {
                    setIsMenuOpen(false);
                  } else {
                    openPanel('menu');
                  }
                }}
                className="md:hidden"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setIsMenuOpen(false);
                    scrollToProductsSection();
                  }}
                  className={`text-left text-sm font-semibold transition-colors hover:text-yellow-600 ${
                    selectedCategory === 'all' ? 'text-yellow-600' : 'text-gray-700'
                  }`}
                >
                  Tüm Ürünler
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('kadın');
                    setIsMenuOpen(false);
                    scrollToProductsSection();
                  }}
                  className={`text-left text-sm font-semibold transition-colors hover:text-yellow-600 ${
                    selectedCategory === 'kadın' ? 'text-yellow-600' : 'text-gray-700'
                  }`}
                >
                  Kadın
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('erkek');
                    setIsMenuOpen(false);
                    scrollToProductsSection();
                  }}
                  className={`text-left text-sm font-semibold transition-colors hover:text-yellow-600 ${
                    selectedCategory === 'erkek' ? 'text-yellow-600' : 'text-gray-700'
                  }`}
                >
                  Erkek
                </button>
                <button
                  onClick={() => {
                    setShowCategoriesDetailPage(true);
                    setIsMenuOpen(false);
                  }}
                  className="text-left text-sm font-semibold transition-colors hover:text-yellow-600 text-gray-700"
                >
                  Kategoriler
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Banner Section */}
      <BannerSection />

      {/* Categories Section */}
      <section id="categories-section" className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 hidden md:block">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Kategoriler
            </h2>
            <p className="text-gray-600">Favori kategorinizi keşfedin</p>
          </div>
          
          {categoriesLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {sortedCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.name || '');
                    scrollToProductsSection();
                  }}
                  className="group relative bg-white rounded-lg transition-all duration-300 overflow-hidden hover:shadow-md"
                >
                  <div className="aspect-[2/3] relative">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-bold text-gray-400">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Stronger readability gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition-colors" />
                    {/* Category Name Overlay - epic style */}
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      <h3 className="text-white text-lg md:text-2xl lg:text-3xl font-extrabold font-serif uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section id="products-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {selectedCategory === 'all' ? 'Tüm Ürünler' : 
             selectedCategory === 'kadın' ? 'Kadın' :
             selectedCategory === 'erkek' ? 'Erkek' : 'Ürünler'}
          </h2>
          <p className="text-gray-600">En trend parçalarla stilini tamamla</p>
        </div>

        {productsLoading && (
          <p className="text-center text-gray-500">Ürünler yükleniyor...</p>
        )}
        {productsError && (
          <p className="text-center text-red-600">{productsError}</p>
        )}
        {!productsLoading && !productsError && filteredProducts.length === 0 && (
          <p className="text-center text-gray-500">Gösterilecek ürün bulunamadı.</p>
        )}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              id={`product-card-${product.id}`}
              className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              {/* Görsel alanı - 2:3 oranı (3281x4919 piksel için optimize) */}
              <div className="relative group/image">
                <img
                  src={
                    (product.images && product.images.length > 0
                      ? product.images[productImageIndices[product.id] || 0]
                      : product.image) || 'https://via.placeholder.com/400x600?text=No+Image'
                  }
                  alt={product.name}
                  className="w-full aspect-[2/3] object-cover bg-gray-100 transition-transform duration-300 group-hover:scale-105"
                  loading="eager"
                  decoding="async"
                />
                
                {/* Görsel navigasyon butonları - sadece birden çok görsel varsa göster */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Anında değişim - hiç gecikme yok
                        changeProductImage(product.id, 'prev');
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        changeProductImage(product.id, 'prev');
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-150 cursor-pointer active:scale-95 z-10"
                      aria-label="Önceki görsel"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Anında değişim - hiç gecikme yok
                        changeProductImage(product.id, 'next');
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        changeProductImage(product.id, 'next');
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-lg opacity-0 group-hover/image:opacity-100 transition-all duration-150 cursor-pointer active:scale-95 z-10"
                      aria-label="Sonraki görsel"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    
                    {/* Görsel göstergeleri */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                      {product.images.map((_, idx) => (
                        <span
                          key={`${product.id}-indicator-${idx}`}
                          className={`h-1 rounded-full transition-all ${
                            idx === (productImageIndices[product.id] || 0)
                              ? 'w-4 bg-white'
                              : 'w-2 bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Üst rozetler */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
                  {product.gender ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-900 shadow">
                      {product.gender}
                    </span>
                  ) : null}
                  {/* Kampanya rozeti - 3 al 2 öde */}
                  {isCampaignActive(product) && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-lg">
                      3 AL 2 ÖDE
                    </span>
                  )}
                </div>
                <button
                  className={`absolute top-2.5 right-2.5 rounded-full p-1.5 md:p-2 shadow transition-colors ${
                    isFavorite(product.id) ? 'bg-orange-500' : 'bg-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product);
                  }}
                  aria-label="Favoriye ekle/kaldır"
                >
                  <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'text-white fill-current' : 'text-gray-600'}`} />
                </button>

                {/* Alt gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* İçerik */}
              <div className="p-3 md:p-4">
                <h3 className="font-bold text-gray-900 mb-2 md:mb-3 text-sm md:text-base text-center" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '2.5em', // 2 satır için minimum yükseklik
                  lineHeight: '1.25em'
                }}>{product.name}</h3>

                {/* Ürün Kodu - Ortalanmış */}
                {product.product_code && (
                  <div className="text-center mb-2">
                    <span className="text-xs md:text-sm text-gray-600 font-medium">Ürün Kodu: {product.product_code}</span>
                  </div>
                )}

                {/* Fiyat - Ortalanmış */}
                <div className="text-center mb-3">
                  {product.is_discounted && product.discount_price ? (
                    <>
                      <span className="text-lg md:text-xl font-bold text-red-600">₺{product.discount_price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-sm md:text-base text-gray-500 line-through ml-2">₺{product.price.toFixed(2).replace('.', ',')}</span>
                      {product.discount_percentage && (
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          %{product.discount_percentage} İndirim
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-lg md:text-xl font-bold text-gray-900">₺{product.price.toFixed(2).replace('.', ',')}</span>
                  )}
                </div>

                {/* Sepete Ekle Butonu - Ortalanmış */}
                <div className="text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                    disabled={(product.stock ?? 0) <= 0}
                    className="inline-flex items-center justify-center px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-black hover:bg-gray-800"
                  >
                    {(product.stock ?? 0) <= 0 ? 'Stok Yok' : 'Sepete Ekle'}
                  </button>
                </div>

                {/* Renk seçenekleri - sadece renk varsa göster */}
                {product.colors && product.colors.length > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {product.colors.slice(0, 4).map((color, index) => (
                      <span
                        key={`${product.id}-color-${index}-${color}`}
                        className="inline-block h-3 w-3 md:h-4 md:w-4 rounded-full border border-gray-300 shadow-sm hover:border-gray-400 transition-all cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    {product.colors.length > 4 && (
                      <span className="text-[10px] text-gray-500 ml-1">
                        +{product.colors.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          {/* Container */}
          <div className="absolute inset-0 p-0 md:p-4 flex flex-col">
            {/* Mobile Header */}
            <div className="md:hidden bg-white shadow-md sticky top-0 z-[110]">
              <div className="flex justify-between items-center h-16 px-4">
                {/* Logo */}
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setSelectedCategory('all');
                    setActiveBottomTab('home');
                  }}
                  className="text-xl font-serif font-bold tracking-widest text-black hover:text-gray-600 transition-colors"
                >
                  LUNORA
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              <div className="relative mx-auto bg-white w-full h-full md:h-auto md:max-h-[95vh] md:rounded-2xl md:overflow-y-auto md:max-w-6xl flex flex-col lg:flex-row overflow-y-auto mobile-scrollbar z-[105]">
                {/* Görsel (mobil üstte, desktop sol yarı) - 2:3 oranı optimize */}
                <div className="w-full lg:w-1/2 relative bg-gray-50">
                  {/* Ana görsel alanı */}
                  <div className="relative h-[60vh] lg:h-[70vh] flex items-center justify-center p-4">
                    <img
                      src={(selectedProduct.images && selectedProduct.images.length > 0
                        ? selectedProduct.images[selectedImageIndex]
                        : selectedProduct.image) || 'https://via.placeholder.com/600x900?text=No+Image'}
                      alt={selectedProduct.name}
                      className="max-w-full max-h-full object-contain bg-white rounded-lg shadow-sm"
                      style={{ aspectRatio: '2/3' }}
                      loading="eager"
                      decoding="async"
                    />

                    {/* Sol/Sağ navigasyon */}
                    {selectedProduct.images && selectedProduct.images.length > 1 ? (
                      <>
                        <button
                          type="button"
                          aria-label="Önceki görsel"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const total = selectedProduct.images?.length || 0;
                            const newIndex = (selectedImageIndex - 1 + total) % total;
                            
                            // Görseli önyükle
                            const nextImageSrc = selectedProduct.images?.[newIndex];
                            if (nextImageSrc && !preloadedImages.has(nextImageSrc)) {
                              preloadImage(nextImageSrc);
                            }
                            
                            // Anında değişim
                            setSelectedImageIndex(newIndex);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            const total = selectedProduct.images?.length || 0;
                            const newIndex = (selectedImageIndex - 1 + total) % total;
                            
                            const nextImageSrc = selectedProduct.images?.[newIndex];
                            if (nextImageSrc && !preloadedImages.has(nextImageSrc)) {
                              preloadImage(nextImageSrc);
                            }
                            
                            setSelectedImageIndex(newIndex);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                          className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-150 z-10 cursor-pointer active:scale-95"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          aria-label="Sonraki görsel"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const total = selectedProduct.images?.length || 0;
                            const newIndex = (selectedImageIndex + 1) % total;
                            
                            // Görseli önyükle
                            const nextImageSrc = selectedProduct.images?.[newIndex];
                            if (nextImageSrc && !preloadedImages.has(nextImageSrc)) {
                              preloadImage(nextImageSrc);
                            }
                            
                            // Anında değişim
                            setSelectedImageIndex(newIndex);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            const total = selectedProduct.images?.length || 0;
                            const newIndex = (selectedImageIndex + 1) % total;
                            
                            const nextImageSrc = selectedProduct.images?.[newIndex];
                            if (nextImageSrc && !preloadedImages.has(nextImageSrc)) {
                              preloadImage(nextImageSrc);
                            }
                            
                            setSelectedImageIndex(newIndex);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                          className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-150 z-10 cursor-pointer active:scale-95"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    ) : null}
                  </div>

                  {/* Küçük resimler - fotoğrafın altında */}
                  {selectedProduct.images && selectedProduct.images.length > 1 ? (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="flex items-center justify-center gap-2 overflow-x-auto">
                        {(selectedProduct.images || []).map((img, idx) => (
                          <button
                            key={`${selectedProduct.id}-thumbnail-${idx}-${img}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              // Görseli önyükle
                              if (!preloadedImages.has(img)) {
                                preloadImage(img);
                              }
                              // Anında değişim
                              setSelectedImageIndex(idx);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              if (!preloadedImages.has(img)) {
                                preloadImage(img);
                              }
                              setSelectedImageIndex(idx);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                            className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-100 cursor-pointer flex-shrink-0 ${
                              idx === selectedImageIndex 
                                ? 'border-yellow-600 shadow-lg' 
                                : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`${selectedProduct.name} - Görsel ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                
                {/* İçerik (mobilde kalan alan, desktop sağ yarı) */}
                <div className="w-full lg:w-1/2 flex-1 p-6 lg:p-8">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 pr-4 md:pr-6">{selectedProduct.name}</h3>
                    <button onClick={() => setSelectedProduct(null)} className="hidden md:block p-2 -mr-2">
                      <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    {selectedProduct.is_discounted && selectedProduct.discount_price ? (
                      <>
                        <span className="text-xl md:text-2xl font-bold text-red-600">₺{selectedProduct.discount_price}</span>
                        <span className="text-base md:text-lg text-gray-500 line-through">₺{selectedProduct.price}</span>
                        {selectedProduct.discount_percentage && (
                          <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                            %{selectedProduct.discount_percentage} İndirim
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xl md:text-2xl font-bold text-gray-900">₺{selectedProduct.price}</span>
                    )}
                    <span
                      className={`ml-auto text-xs px-2.5 py-1 rounded-full ${
                        (selectedProduct.stock ?? 0) > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {(selectedProduct.stock ?? 0) > 0 ? 'Stokta' : 'Tükendi'}
                    </span>
                  </div>
                  {selectedProduct.description ? (
                    <p className="text-sm md:text-base text-gray-600 leading-6 mb-4 md:mb-6">
                      {selectedProduct.description}
                    </p>
                  ) : null}

                  {/* Renk seçimi */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="mb-4 md:mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Renk
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.colors.map((color, index) => (
                          <button
                            key={`color-${index}-${color}`}
                            type="button"
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Beden seçimi */}
                  <div className="mb-4 md:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beden <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                        selectedProduct.sizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            disabled={(selectedProduct.stock ?? 0) <= 0}
                            className={`border px-3 py-1.5 md:py-2 rounded transition-colors disabled:opacity-60 text-sm ${
                              selectedSize === size
                                ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                                : 'border-gray-300 hover:border-yellow-600 hover:text-yellow-600'
                            }`}
                          >
                            {size}
                          </button>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">Bu ürün için beden bilgisi bulunmuyor.</p>
                      )}
                    </div>
                    {!selectedSize && (
                      <p className="text-red-500 text-xs mt-1">Lütfen bir beden seçin</p>
                    )}
                    {/* Stok adeti gösterimi */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Stok Durumu:</span>
                        <span className={`text-sm font-semibold ${
                          (selectedProduct.stock ?? 0) > 10 
                            ? 'text-green-600' 
                            : (selectedProduct.stock ?? 0) > 0 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                        }`}>
                          {(selectedProduct.stock ?? 0) > 0 
                            ? `${selectedProduct.stock} adet mevcut` 
                            : 'Stokta yok'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Miktar seçimi */}
                  <div className="mb-4 md:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Miktar
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                        disabled={selectedQuantity <= 1}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="text-gray-600 font-medium">-</span>
                      </button>
                      <span className="w-12 text-center font-medium text-gray-900">
                        {selectedQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedQuantity(Math.min(10, selectedQuantity + 1))}
                        disabled={selectedQuantity >= 10}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="text-gray-600 font-medium">+</span>
                      </button>
                      <span className="text-xs text-gray-500 ml-2">
                        (Maksimum 10 adet)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-2">
                    <button
                      onClick={() => {
                        if (!selectedSize) {
                          showWarning('Beden Seçimi Gerekli', 'Lütfen bir beden seçin');
                          return;
                        }
                        addToCart(selectedProduct, selectedSize, selectedQuantity);
                      }}
                      disabled={(selectedProduct.stock ?? 0) <= 0}
                      className="flex-1 bg-black text-white px-4 py-2.5 md:py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60"
                    >
                      Sepete Ekle
                    </button>
                  </div>

                  {/* Benzer Ürünler - sadece mobilde altta göster */}
                  {similarProducts.length > 0 && (
                    <div className="mt-4 md:mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Benzer Ürünler</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {similarProducts.slice(0, 4).map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedCategory(item.category || 'all');
                              setSelectedProduct(null);
                              setTimeout(() => scrollToProductCard(item.id), 0);
                            }}
                            className="text-left bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow transition-shadow"
                          >
                            <img
                              src={item.image || 'https://via.placeholder.com/300x450?text=No+Image'}
                              alt={item.name}
                              className="w-full h-40 object-contain bg-gray-100 p-2"
                              style={{ aspectRatio: '2/3' }}
                            />
                            <div className="p-2">
                              <div className="text-xs text-gray-700 line-clamp-2 mb-1">{item.name}</div>
                              <div className="text-sm font-semibold text-gray-900">₺{item.price}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Page */}
      {(showSearchPage || isSearchOpen) && (
        <SearchPage
          products={products}
          onClose={() => {
            setShowSearchPage(false);
            setIsSearchOpen(false);
            // Ana sayfaya dön ve icon rengini güncelle
            setIsMenuOpen(false);
            setIsCartOpen(false);
            setIsFavoritesOpen(false);
            setIsAccountOpen(false);
            setShowAccountPage(false);
            setShowCheckoutPage(false);
            setSelectedProduct(null);
            setActiveBottomTab('home');
          }}
          onProductSelect={setSelectedProduct}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          onNavigate={(panel) => {
            setShowSearchPage(false);
            setIsSearchOpen(false);
            if (panel === 'home') {
              // Ana sayfaya geçerken tüm panelleri kapat
              setIsMenuOpen(false);
              setIsCartOpen(false);
              setIsFavoritesOpen(false);
              setIsAccountOpen(false);
              setShowAccountPage(false);
              setShowCheckoutPage(false);
              setSelectedProduct(null);
              setActiveBottomTab('home');
            } else {
              openPanel(panel as any);
            }
          }}
          activeBottomTab={activeBottomTab}
          cart={cart}
        />
      )}

      {/* Account Page */}
      {(showAccountPage || isAccountOpen) && (
        <AccountPage
          onClose={() => {
            setShowAccountPage(false);
            setIsAccountOpen(false);
            // Ana sayfaya dön ve icon rengini güncelle
            setIsMenuOpen(false);
            setIsCartOpen(false);
            setIsSearchOpen(false);
            setShowSearchPage(false);
            setIsFavoritesOpen(false);
            setShowCheckoutPage(false);
            setSelectedProduct(null);
            setActiveBottomTab('home');
          }}
          onNavigate={(panel) => {
            setShowAccountPage(false);
            setIsAccountOpen(false);
            if (panel === 'home') {
              // Ana sayfaya geçerken tüm panelleri kapat
              setIsMenuOpen(false);
              setIsCartOpen(false);
              setIsSearchOpen(false);
              setShowSearchPage(false);
              setIsFavoritesOpen(false);
              setShowCheckoutPage(false);
              setSelectedProduct(null);
              setActiveBottomTab('home');
            } else {
              openPanel(panel as any);
            }
          }}
          activeBottomTab={activeBottomTab}
          showSuccess={showSuccess}
          showError={showError}
          showWarning={showWarning}
        />
      )}

      {/* Categories Page */}
      {showCategoriesPage && (
        <CategoriesPage
          onClose={() => setShowCategoriesPage(false)}
          onCategorySelect={(categoryId, categoryName) => {
            console.log('Kategori seçildi:', categoryName, 'ID:', categoryId);
            setSelectedCategory(categoryName);
          }}
        />
      )}

      {/* Categories Detail Page */}
      {showCategoriesDetailPage && (
        <CategoriesDetailPage
          isOpen={showCategoriesDetailPage}
          onClose={() => setShowCategoriesDetailPage(false)}
          onNavigate={(panel) => {
            setShowCategoriesDetailPage(false);
            if (panel === 'home') {
              setIsMenuOpen(false);
              setIsCartOpen(false);
              setIsSearchOpen(false);
              setShowSearchPage(false);
              setIsFavoritesOpen(false);
              setIsAccountOpen(false);
              setShowAccountPage(false);
              setShowCheckoutPage(false);
              setSelectedProduct(null);
              setActiveBottomTab('home');
            } else {
              openPanel(panel as any);
            }
          }}
        />
      )}

      <FavoritesPanel
        isOpen={isFavoritesOpen}
        favorites={favorites}
        onClose={() => {
          setIsFavoritesOpen(false);
          setActiveBottomTab('home');
        }}
        onRemove={(id) => removeFavorite(id)}
        onClear={() => setFavorites([])}
      />


      <CartSidebar
        isOpen={isCartOpen}
        cart={cart}
        onClose={() => {
          setIsCartOpen(false);
          setActiveBottomTab('home');
        }}
        onUpdateQuantity={updateQuantity}
        getBaseSubtotal={getBaseSubtotal}
        getTotalPrice={getTotalPrice}
        getShippingCost={getShippingCost}
        getFinalTotal={getFinalTotal}
        getCampaignSavings={getCampaignSavings}
        onCheckout={() => {
          setIsCartOpen(false);
          setShowCheckoutPage(true);
        }}
      />

      {/* Checkout Page */}
      {showCheckoutPage && (
        <CheckoutPage
          isOpen={showCheckoutPage}
          onClose={() => {
            setShowCheckoutPage(false);
            // Sipariş tamamlandığında sepeti temizle
            setCart([]);
          }}
          cart={cart}
          getBaseSubtotal={getBaseSubtotal}
          getTotalPrice={getTotalPrice}
          getShippingCost={getShippingCost}
          getFinalTotal={getFinalTotal}
          getCampaignSavings={getCampaignSavings}
          showSuccess={showSuccess}
          showError={showError}
          showWarning={showWarning}
        />
      )}

      {/* Static Pages */}
      {activeStaticPage && (
        <StaticPage
          title={activeStaticPage.title}
          pageKey={activeStaticPage.key as any}
          onClose={() => setActiveStaticPage(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setActiveBottomTab('home');
                }}
                className="text-2xl font-serif font-bold tracking-widest mb-4 text-white hover:text-gray-300 transition-colors cursor-pointer"
              >
                LUNORA
              </button>
              <p className="text-gray-300">
                Stilinizi yansıtan en trend parçaları keşfedin.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Kategoriler</h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <button
                    onClick={() => { setSelectedCategory('kadın'); scrollToProductsSection(); }}
                    className="hover:text-yellow-600 transition-colors"
                  >
                    Kadın
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setSelectedCategory('erkek'); scrollToProductsSection(); }}
                    className="hover:text-yellow-600 transition-colors"
                  >
                    Erkek
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Müşteri Hizmetleri</h3>
              <ul className="space-y-2 text-gray-300">
                <li><button onClick={() => setActiveStaticPage({ key: 'contact', title: 'İletişim' })} className="hover:text-yellow-600 transition-colors">İletişim</button></li>
                <li><button onClick={() => setActiveStaticPage({ key: 'tracking', title: 'Kargo Takip' })} className="hover:text-yellow-600 transition-colors">Kargo Takip</button></li>
                <li><button onClick={() => setActiveStaticPage({ key: 'returns', title: 'İade & Değişim' })} className="hover:text-yellow-600 transition-colors">İade & Değişim</button></li>
                <li><button onClick={() => setActiveStaticPage({ key: 'faq', title: 'SSS' })} className="hover:text-yellow-600 transition-colors">SSS</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">İletişim</h3>
              <div className="space-y-3 text-gray-300">
                <div>
                  <p className="font-medium text-white mb-1">Adres:</p>
                  <p className="text-sm">Kahramanmaraş Onikişubat, Sarıgüzel Mahallesi İkizce Küme Evleri No 14</p>
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Telefon:</p>
                  <a href="tel:+905395104628" className="text-sm hover:text-yellow-600 transition-colors">
                    +90 539 510 46 28
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2025 LUNORA. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-lg">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => {
              openPanel('home');
            }}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'home' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Ana Menü</span>
          </button>

          <button
            onClick={() => {
              openPanel('search');
            }}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'search' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Arama</span>
          </button>

          <button
            onClick={() => {
              openPanel('cart');
            }}
            className={`flex flex-col items-center py-2 px-3 relative transition-colors ${
              activeBottomTab === 'cart' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {getTotalItems()}
              </span>
            )}
            <span className="text-xs mt-1">Sepetim</span>
          </button>

          <button
            onClick={() => {
              openPanel('favorites');
            }}
            className={`flex flex-col items-center py-2 px-3 relative transition-colors ${
              activeBottomTab === 'favorites' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Heart className="h-5 w-5" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {favorites.length}
              </span>
            )}
            <span className="text-xs mt-1">Favori</span>
          </button>

          <button
            onClick={() => {
              openPanel('account');
            }}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'account' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Hesabım</span>
          </button>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;