import React, { useEffect, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
}

interface CategoriesPageProps {
  onClose: () => void;
  onCategorySelect: (categoryId: string, categoryName: string) => void;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ onClose, onCategorySelect }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description, image_url')
          .order('name', { ascending: true });
        
        if (error) {
          console.error('Supabase categories hatası:', error);
          throw error;
        }
        
        console.log('Categories data:', data);
        setCategories(data || []);
        
        // Image loading state'lerini başlat
        if (data) {
          const initialLoadingStates: Record<string, boolean> = {};
          data.forEach(category => {
            if (category.image_url) {
              initialLoadingStates[category.id] = true;
            }
          });
          setImageLoadingStates(initialLoadingStates);
        }
      } catch (err: any) {
        console.error('Kategoriler yüklenirken hata:', err);
        // Hata durumunda varsayılan kategorileri göster
        setCategories([
          { id: 'kadın', name: 'Kadın', description: 'Kadın giyim ürünleri', image_url: undefined },
          { id: 'erkek', name: 'Erkek', description: 'Erkek giyim ürünleri', image_url: undefined },
          { id: 'ayakkabı', name: 'Ayakkabı', description: 'Ayakkabı ürünleri', image_url: undefined },
          { id: 'çanta', name: 'Çanta', description: 'Çanta ürünleri', image_url: undefined }
        ]);
        setError(null); // Hatayı temizle, varsayılan kategorileri göster
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    onCategorySelect(categoryId, categoryName);
    onClose();
  };

  const handleImageLoad = (categoryId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [categoryId]: false }));
  };

  const handleImageError = (categoryId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [categoryId]: false }));
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Container */}
      <div className="absolute inset-0 p-2 sm:p-4 flex">
        <div className="relative mx-auto bg-white w-full max-w-7xl h-full max-h-[90vh] rounded-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Kategoriler</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 lg:p-6">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Kategoriler yükleniyor...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id, category.name)}
                    className="group bg-white border border-gray-200 rounded-lg hover:border-yellow-600 hover:shadow-md transition-all duration-200 text-left overflow-hidden"
                  >
                    {/* Kategori Görseli */}
                    {category.image_url ? (
                      <div className="relative h-32 sm:h-40 md:h-48 w-full overflow-hidden bg-gray-100">
                        {/* Loading indicator */}
                        {imageLoadingStates[category.id] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                          </div>
                        )}
                        
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out ${
                            imageLoadingStates[category.id] ? 'opacity-0' : 'opacity-100'
                          }`}
                          onError={() => handleImageError(category.id)}
                          onLoad={() => handleImageLoad(category.id)}
                          style={{ transition: 'opacity 0.3s ease-in-out' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent group-hover:from-black/20 transition-all duration-300" />
                      </div>
                    ) : (
                      <div className="h-32 sm:h-40 md:h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-gray-400 text-2xl sm:text-3xl md:text-4xl font-bold">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    
                    {/* Kategori Bilgileri */}
                    <div className="p-2 sm:p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors text-sm sm:text-base">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-yellow-600 transition-colors ml-2" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !error && categories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">Henüz kategori bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
