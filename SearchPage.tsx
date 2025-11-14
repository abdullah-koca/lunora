import { useState, useEffect } from 'react';
import { Search, X, Filter, Heart, Home, User, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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
}

interface CartItem extends Product {
  quantity: number;
  size: string;
}

interface SearchPageProps {
  products: Product[];
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
  isFavorite: (productId: number) => boolean;
  onNavigate?: (panel: string) => void;
  activeBottomTab?: string;
  cart?: CartItem[];
  addToCart?: (product: Product, size: string) => void;
}

export default function SearchPage({ 
  products, 
  onClose, 
  onProductSelect, 
  onToggleFavorite, 
  isFavorite,
  onNavigate,
  activeBottomTab = 'search',
  cart = []
}: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loadingPopularSearches, setLoadingPopularSearches] = useState(true);
  const [searchCategories, setSearchCategories] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [productImageIndices, setProductImageIndices] = useState<Record<number, number>>({});
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Sepet toplam ürün sayısını hesapla
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Popüler aramaları Supabase'den çek
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        setLoadingPopularSearches(true);
        
        // Kategorileri çek
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('name')
          .order('name', { ascending: true });
        
        if (categoriesError) {
          console.error('Kategoriler yüklenirken hata:', categoriesError);
        }

        // Ürün isimlerini çek (benzersiz olanları)
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('name, gender')
          .order('name', { ascending: true });
        
        if (productsError) {
          console.error('Ürünler yüklenirken hata:', productsError);
        }

        // Popüler aramaları oluştur
        const searches: string[] = [];
        const categories: string[] = [];
        
        // Cinsiyet kategorileri
        searches.push('Kadın', 'Erkek');
        
        // Supabase'den gelen kategoriler
        if (categoriesData) {
          categoriesData.forEach(category => {
            if (category.name && !searches.includes(category.name)) {
              searches.push(category.name);
              categories.push(category.name);
            }
          });
        }
        
        setSearchCategories(categories);
        
        // Ürün isimlerinden benzersiz kelimeleri çıkar
        if (productsData) {
          const productWords = new Set<string>();
          
          productsData.forEach(product => {
            if (product.name) {
              // Ürün ismini kelimelere böl ve her kelimeyi ekle
              const words = product.name.split(/[\s\-_]+/).filter((word: string) => 
                word.length > 2 && // 2 karakterden uzun
                !word.match(/^\d+$/) && // Sadece sayı değil
                !['ve', 'ile', 'için', 'olan', 'olan', 'gibi'].includes(word.toLowerCase()) // Yaygın kelimeleri filtrele
              );
              
              words.forEach((word: string) => {
                const cleanWord = word.trim().toLowerCase();
                if (cleanWord.length > 2) {
                  productWords.add(cleanWord);
                }
              });
            }
          });
          
          // En popüler ürün kelimelerini ekle (maksimum 10 tane)
          const sortedWords = Array.from(productWords).slice(0, 10);
          searches.push(...sortedWords);
        }
        
        // Eğer Supabase'den veri gelmezse varsayılan değerleri kullan
        if (searches.length <= 2) {
          searches.push('Elbise', 'Pantolon', 'Gömlek', 'Ayakkabı', 'Çanta', 'Ceket', 'Kazak', 'Etek', 'T-shirt');
        }
        
        setPopularSearches(searches);
      } catch (error) {
        console.error('Popüler aramalar yüklenirken hata:', error);
        // Hata durumunda varsayılan değerleri kullan
        setPopularSearches(['Kadın', 'Erkek', 'Elbise', 'Pantolon', 'Gömlek', 'Ayakkabı', 'Çanta', 'Ceket', 'Kazak', 'Etek']);
      } finally {
        setLoadingPopularSearches(false);
      }
    };

    fetchPopularSearches();
  }, []);

  // Popüler arama butonuna tıklandığında filtreleme yap
  const handlePopularSearchClick = (searchTerm: string) => {
    // Cinsiyet filtrelemesi - büyük/küçük harf duyarsız
    if (searchTerm.toLowerCase() === 'kadın' || searchTerm.toLowerCase() === 'erkek') {
      setSearchTerm(''); // Arama kutusunu temizle
      setSelectedCategory('all'); // Kategori filtresini sıfırla
      setSelectedGender(searchTerm.toLowerCase()); // Cinsiyet filtresini ayarla
    } 
    // Kategori filtrelemesi - büyük/küçük harf duyarsız
    else if (searchCategories.some(cat => cat.toLowerCase() === searchTerm.toLowerCase())) {
      setSearchTerm(''); // Arama kutusunu temizle
      setSelectedCategory(searchTerm.toLowerCase()); // Kategori filtresini ayarla
      setSelectedGender(''); // Cinsiyet filtresini sıfırla
    } 
    // Normal arama
    else {
      setSearchTerm(searchTerm);
      setSelectedCategory('all'); // Kategori filtresini sıfırla
      setSelectedGender(''); // Cinsiyet filtresini sıfırla
    }
  };

  // Tüm filtreleri temizle
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedGender('');
    setPriceRange('all');
    setRemoteProducts(null);
    setRemoteError(null);
  };

  // Aktif filtreleri göster
  const getActiveFilters = () => {
    const filters = [];
    if (selectedGender) filters.push(`Cinsiyet: ${selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)}`);
    if (selectedCategory !== 'all') filters.push(`Kategori: ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`);
    if (priceRange !== 'all') {
      const range = priceRanges.find(r => r.id === priceRange);
      if (range) filters.push(`Fiyat: ${range.name}`);
    }
    if (debouncedTerm) filters.push(`Arama: "${debouncedTerm}"`);
    return filters;
  };

  // Ürün görselini değiştir
  const changeProductImage = (productId: number, direction: 'prev' | 'next') => {
    setProductImageIndices(prev => {
      const currentIndex = prev[productId] || 0;
      const product = products.find(p => p.id === productId);
      if (!product?.images || product.images.length <= 1) return prev;
      
      let newIndex;
      if (direction === 'prev') {
        newIndex = currentIndex === 0 ? product.images.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex === product.images.length - 1 ? 0 : currentIndex + 1;
      }
      
      return {
        ...prev,
        [productId]: newIndex
      };
    });
  };

  const genderOptions = [
    { id: '', name: 'Tüm Cinsiyetler' },
    { id: 'kadın', name: 'Kadın' },
    { id: 'erkek', name: 'Erkek' }
  ];

  const priceRanges = [
    { id: 'all', name: 'Tüm Fiyatlar' },
    { id: '0-200', name: '0₺ - 200₺' },
    { id: '200-500', name: '200₺ - 500₺' },
    { id: '500-1000', name: '500₺ - 1000₺' },
    { id: '1000+', name: '1000₺+' }
  ];

  const sourceProducts = (debouncedTerm || selectedGender || selectedCategory !== 'all' || priceRange !== 'all') && remoteProducts ? remoteProducts : products;
  const filteredProducts = sourceProducts.filter(product => {
    // Arama terimi kontrolü - büyük/küçük harf duyarsız
    const searchTermLower = debouncedTerm.toLowerCase();
    const productNameLower = (product.name || '').toLowerCase();
    const productDescLower = (product.description || '').toLowerCase();
    const productCodeLower = (product.product_code || '').toLowerCase();
    
    // Eğer arama terimi boşsa, tüm ürünleri göster
    if (debouncedTerm === '') {
      return true;
    }
    
    // Ürün kodu araması: sadece ürün kodu ile eşleşirse
    const matchesProductCode = productCodeLower && productCodeLower.includes(searchTermLower);
    
    // Normal arama: ürün adı ve açıklamada
    const matchesNormalSearch = productNameLower.includes(searchTermLower) || 
      productDescLower.includes(searchTermLower);
    
    const matchesSearch = matchesNormalSearch || matchesProductCode;
    
    // Kategori filtreleme - büyük/küçük harf duyarsız karşılaştırma
    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      const productCategory = (product.category_name || product.category || '').toLowerCase();
      const productName = (product.name || '').toLowerCase();
      const selectedCategoryLower = selectedCategory.toLowerCase();
      
      // Tam kategori eşleşmesi veya ürün adında kategori geçiyorsa
      matchesCategory = productCategory === selectedCategoryLower || productName.includes(selectedCategoryLower);
    }
    
    // Cinsiyet filtreleme - büyük/küçük harf duyarsız
    const productGenderLower = (product.gender || '').toLowerCase();
    const selectedGenderLower = selectedGender.toLowerCase();
    const matchesGender = selectedGender === '' || 
      productGenderLower === selectedGenderLower || 
      productGenderLower === 'unisex';
    
    // Fiyat filtreleme
    let matchesPrice = true;
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(p => p.replace('+', ''));
      if (max) {
        matchesPrice = product.price >= parseInt(min) && product.price <= parseInt(max);
      } else {
        matchesPrice = product.price >= parseInt(min);
      }
    }
    
    return matchesSearch && matchesCategory && matchesGender && matchesPrice;
  });

  // Debounce: arama terimini 300ms geciktir
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Supabase'den dinamik arama (kategori/cinsiyet/anahtar kelime/fiyat değişince)
  useEffect(() => {
    const isDefault = debouncedTerm === '' && selectedCategory === 'all' && selectedGender === '' && priceRange === 'all';
    if (isDefault) {
      setRemoteProducts(null);
      setRemoteError(null);
      setRemoteLoading(false);
      return;
    }
    let ignore = false;
    const fetchRemote = async () => {
      try {
        setRemoteLoading(true);
        setRemoteError(null);
        let query = supabase.from('products').select('*').order('id', { ascending: true });

        if (selectedGender) {
          // gender eşleşmesi veya unisex - büyük/küçük harf duyarsız
          const genderLower = selectedGender.toLowerCase();
          query = query.or(`gender.ilike.${genderLower},gender.ilike.unisex`);
        }

        // Not: 'category' kolonu yok; kategori filtrelemesini metin aramasına katıyoruz

        const tokens: string[] = [];
        if (debouncedTerm) tokens.push(debouncedTerm.toLowerCase());
        if (selectedCategory !== 'all') tokens.push(selectedCategory.toLowerCase());
        if (tokens.length > 0) {
          // name, description ve product_code alanlarında arama - büyük/küçük harf duyarsız
          const likeParts = tokens.map(t => `%${t}%`);
          // Supabase or() ifadesi: alan.ilike.değer formatında olmalı, çoklu değeri ayrı koşullar olarak yazıyoruz
          const ors: string[] = [];
          likeParts.forEach(lp => {
            ors.push(`name.ilike.${lp}`);
            ors.push(`description.ilike.${lp}`);
            ors.push(`product_code.ilike.${lp}`);
          });
          query = query.or(ors.join(','));
        }

        if (priceRange !== 'all') {
          const [minStr, maxStr] = priceRange.split('-');
          const min = parseInt(minStr.replace('+', '')) || 0;
          const max = maxStr ? parseInt(maxStr) : null;
          if (max) {
            query = query.gte('price', min).lte('price', max);
          } else {
            query = query.gte('price', min);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map((row: any, idx: number) => {
          const imageKey = ['image', 'image_url', 'photo', 'thumbnail', 'cover', 'img', 'picture'].find(k => k in row && row[k]);
          const imageVal = imageKey ? String(row[imageKey]) : null;
          const rawId = row.id;
          const asNum = Number(rawId);
          const safeId = Number.isFinite(asNum) ? asNum : (Date.now() % 1_000_000) + idx;
          return {
            id: safeId,
            name: String(row.name ?? ''),
            price: Number(row.price ?? 0),
            originalPrice: row.originalPrice ?? null,
            image: imageVal,
            images: Array.isArray(row.images) ? row.images : (imageVal ? [imageVal] : []),
            category: row.category ?? null,
            category_name: row.category_name ?? null,
            rating: row.rating ?? null,
            isNew: row.isNew ?? null,
            isSale: row.isSale ?? null,
            description: row.description ?? null,
            stock: row.stock ?? null,
            gender: row.gender ? String(row.gender).toLowerCase() : null,
            sizes: Array.isArray(row.size) ? row.size : typeof row.size === 'string' ? String(row.size).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            color: row.color ?? null,
            colors: Array.isArray(row.colors) ? row.colors : typeof row.colors === 'string' ? String(row.colors).split(',').map((c: string) => c.trim()).filter(Boolean) : [],
            product_code: row.product_code ?? null, // Ürün kodu
          } as Product;
        });

        if (!ignore) setRemoteProducts(mapped);
      } catch (e: any) {
        if (!ignore) setRemoteError('Arama sonuçları alınamadı');
      } finally {
        if (!ignore) setRemoteLoading(false);
      }
    };
    fetchRemote();
    return () => { ignore = true; };
  }, [debouncedTerm, selectedCategory, selectedGender, priceRange]);


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-50 flex flex-col" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün, kategori, marka veya ürün kodu ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Arama kutusuna yazıldığında diğer filtreleri sıfırla
                if (e.target.value !== '') {
                  setSelectedGender('');
                  setSelectedCategory('all');
                }
              }}
              className="w-full pl-12 pr-4 py-4 border-0 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-500 shadow-sm"
              autoFocus
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl transition-all duration-200 ${
              showFilters 
                ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25' 
                : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200/50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border-0 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all duration-200 text-gray-900 shadow-sm"
                >
                  <option value="all">Tüm Kategoriler</option>
                  {searchCategories.map(category => (
                    <option key={category} value={category.toLowerCase()}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Cinsiyet</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full p-3 border-0 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all duration-200 text-gray-900 shadow-sm"
                >
                  {genderOptions.map(gender => (
                    <option key={gender.id} value={gender.id}>{gender.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Fiyat Aralığı</label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full p-3 border-0 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all duration-200 text-gray-900 shadow-sm"
                >
                  {priceRanges.map(range => (
                    <option key={range.id} value={range.id}>{range.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm === '' && selectedGender === '' && selectedCategory === 'all' ? (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Popüler Aramalar</h3>
              <p className="text-gray-600 mb-8">En çok aranan ürünler ve kategoriler</p>
              {loadingPopularSearches ? (
                <div className="flex flex-wrap gap-3">
                  {[...Array(8)].map((_, index) => (
                    <div
                      key={index}
                      className="px-6 py-3 bg-gray-200 rounded-2xl animate-pulse"
                    >
                      <div className="w-20 h-5 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {popularSearches.map(search => (
                    <button
                      key={search}
                      onClick={() => handlePopularSearchClick(search)}
                      className="px-6 py-3 bg-white text-gray-700 rounded-2xl text-sm font-medium hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-yellow-300"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              {/* Aktif Filtreler */}
              {getActiveFilters().length > 0 && (
                <div className="mb-8">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {getActiveFilters().map((filter, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-yellow-500/25"
                      >
                        {filter}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-yellow-600 hover:text-yellow-700 font-semibold hover:underline transition-colors"
                  >
                    Tüm Filtreleri Temizle
                  </button>
                </div>
              )}

              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-800">
                  {filteredProducts.length} sonuç bulundu
                </p>
              </div>

              {remoteLoading ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full mb-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  </div>
                  <p className="text-lg font-semibold text-gray-700">Sonuçlar yükleniyor...</p>
                  <p className="text-gray-500 mt-2">Lütfen bekleyin</p>
                </div>
              ) : remoteError ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <Search className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-lg font-semibold text-red-600 mb-2">{remoteError}</p>
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-2xl hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-200 font-semibold"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">Aradığınız ürün bulunamadı</p>
                  <p className="text-gray-500">Farklı anahtar kelimeler veya filtreler deneyin</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    id={`product-card-${product.id}`}
                    className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 cursor-pointer bg-white rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100"
                    onClick={() => onProductSelect(product)}
                  >
                    {/* Görsel alanı */}
                    <div className="relative group/image">
                      <img
                        src={
                          (product.images && product.images.length > 0
                            ? product.images[productImageIndices[product.id] || 0]
                            : product.image) || 'https://via.placeholder.com/600x750?text=No+Image'
                        }
                        alt={product.name}
                        className="w-full h-64 md:h-80 object-cover bg-gray-100 transition-transform duration-500 group-hover:scale-110 rounded-t-3xl"
                      />
                      
                      {/* Görsel navigasyon butonları - sadece birden çok görsel varsa göster */}
                      {product.images && product.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              changeProductImage(product.id, 'prev');
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow opacity-0 group-hover/image:opacity-100 transition-opacity"
                            aria-label="Önceki görsel"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              changeProductImage(product.id, 'next');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow opacity-0 group-hover/image:opacity-100 transition-opacity"
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
                      {product.gender ? (
                        <span className="absolute top-4 left-4 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-white/95 text-gray-900 shadow-lg backdrop-blur-sm">
                          {product.gender}
                        </span>
                      ) : null}
                      <button
                        className={`absolute top-4 right-4 rounded-2xl p-2.5 shadow-lg transition-all duration-200 ${
                          isFavorite(product.id) 
                            ? 'bg-gradient-to-r from-red-400 to-red-500 text-white' 
                            : 'bg-white/95 backdrop-blur-sm text-gray-600 hover:bg-red-50'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(product);
                        }}
                        aria-label="Favoriye ekle/kaldır"
                      >
                        <Heart className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                      </button>

                      {/* Alt gradient */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    {/* İçerik */}
                    <div className="p-4 md:p-6">
                      <h3 className="font-bold text-gray-900 mb-2 text-base md:text-lg text-center leading-tight" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.5em',
                        lineHeight: '1.25em'
                      }}>{product.name}</h3>

                      {/* Ürün Kodu - Ortalanmış */}
                      {product.product_code && (
                        <div className="text-center mb-2">
                          <span className="text-sm text-gray-600 font-medium">Ürün Kodu: {product.product_code}</span>
                        </div>
                      )}

                      {/* Fiyat - Ortalanmış */}
                      <div className="text-center mb-4">
                        <span className="text-xl md:text-2xl font-bold text-gray-900">₺{product.price.toFixed(2).replace('.', ',')}</span>
                        {product.originalPrice && (
                          <span className="text-sm md:text-base text-gray-500 line-through ml-2">₺{product.originalPrice.toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>

                      {/* Sepete Ekle Butonu - Ortalanmış */}
                      <div className="text-center">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            // Her zaman ürün detay modalını aç
                            onProductSelect(product);
                          }}
                          disabled={(product.stock ?? 0) <= 0}
                          className="w-full inline-flex items-center justify-center px-6 py-3 rounded-2xl text-sm md:text-base font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 hover:shadow-lg hover:shadow-gray-900/25"
                        >
                          {(product.stock ?? 0) <= 0 ? 'Stok Yok' : 'Sepete Ekle'}
                        </button>
                      </div>

                      {/* Renk seçenekleri - sadece renk varsa göster */}
                      {product.colors && product.colors.length > 0 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          {product.colors.slice(0, 4).map((color, index) => (
                            <span
                              key={`${product.id}-color-${index}-${color}`}
                              className="inline-block h-4 w-4 md:h-5 md:w-5 rounded-full border-2 border-gray-200 shadow-sm hover:border-gray-400 hover:scale-110 transition-all cursor-pointer"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                          {product.colors.length > 4 && (
                            <span className="text-xs text-gray-500 ml-1 font-medium">
                              +{product.colors.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
            onClick={() => onNavigate?.('favorites')}
            className={`flex flex-col items-center py-2 px-3 transition-colors ${
              activeBottomTab === 'favorites' ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs mt-1">Favorilerim</span>
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