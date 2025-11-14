import { X, ArrowLeft } from 'lucide-react';

interface CategoriesDetailPageProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (panel: string) => void;
}

export default function CategoriesDetailPage({ isOpen, onClose, onNavigate }: CategoriesDetailPageProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button 
              onClick={() => {
                onClose();
                onNavigate('home');
              }}
              className="text-2xl font-serif font-bold tracking-widest text-black hover:text-gray-600 transition-colors cursor-pointer"
            >
              LUNORA
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ana Kategoriler */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Kategorilerimiz</h1>
          <div className="grid gap-8 md:grid-cols-3">
            <article className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Kadın Giyim</h2>
              <p className="text-gray-700 text-sm leading-6">
                LUNORA'nın kadın giyim koleksiyonunda konfor ve şıklığı bir arada sunan elbiseler, ceketler, jean ve
                sweatshirt modelleri yer alır. Günlük stillerden özel gün kombinlerine kadar geniş seçeneklerle gardırobunuzu
                yenileyin.
              </p>
            </article>
            <article className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Erkek Giyim</h2>
              <p className="text-gray-700 text-sm leading-6">
                Modern kesimler ve kaliteli kumaşlarla hazırlanan erkek giyim ürünlerimiz; jean, gömlek, tişört ve sweatshirt
                seçenekleriyle stilinizi tamamlar. Günün her anında rahat ve şık kombinler oluşturun.
              </p>
            </article>
            <article className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Sweatshirt</h2>
              <p className="text-gray-700 text-sm leading-6">
                Yumuşak dokulu, rahat kalıplı sweatshirt koleksiyonumuz; spor ve günlük kombinlerin vazgeçilmezi. Kapüşonlu,
                fermuarlı ve basic modelleri farklı renk seçenekleriyle keşfedin.
              </p>
            </article>
          </div>
        </div>

        {/* Detaylı Kategori Listesi */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Tüm Kategoriler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Elbise</h4>
              <p className="text-xs text-gray-600">Günlük ve özel gün elbiseleri</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Ceket</h4>
              <p className="text-xs text-gray-600">Blazer, mont ve ceket modelleri</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Jean</h4>
              <p className="text-xs text-gray-600">Skinny, straight ve bootcut jean</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Sweatshirt</h4>
              <p className="text-xs text-gray-600">Kapüşonlu ve basic sweatshirt</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Erkek Tişört</h4>
              <p className="text-xs text-gray-600">Polo, basic ve oversize tişört</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Erkek Gömlek</h4>
              <p className="text-xs text-gray-600">Formal ve casual gömlek modelleri</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Erkek Jean</h4>
              <p className="text-xs text-gray-600">Slim, regular ve loose fit jean</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Erkek Sweatshirt</h4>
              <p className="text-xs text-gray-600">Hoodie ve crew neck sweatshirt</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Pantolon</h4>
              <p className="text-xs text-gray-600">Chino, cargo ve skinny pantolon</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Erkek Pantolon</h4>
              <p className="text-xs text-gray-600">Chino, cargo ve jogger pantolon</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Kadın Tişört</h4>
              <p className="text-xs text-gray-600">Basic, crop ve oversize tişört</p>
            </div>
            <div className="text-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-gray-900 mb-2">Aksesuar</h4>
              <p className="text-xs text-gray-600">Çanta, kemer ve diğer aksesuarlar</p>
            </div>
          </div>
        </div>

        {/* SEO İçerik */}
        <div className="bg-gray-50 p-8 rounded-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">LUNORA Moda Dünyası</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Neden LUNORA?</h4>
              <ul className="space-y-1">
                <li>• 1500 TL üzeri alışverişlerde ücretsiz kargo</li>
                <li>• 30 gün içinde kolay iade imkanı</li>
                <li>• Kapıda ödeme seçeneği</li>
                <li>• Hızlı ve güvenli teslimat</li>
                <li>• Kaliteli ve trend ürünler</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Popüler Kategoriler</h4>
              <ul className="space-y-1">
                <li>• Kadın sweatshirt modelleri</li>
                <li>• Erkek jean koleksiyonu</li>
                <li>• Kadın elbise çeşitleri</li>
                <li>• Erkek gömlek modelleri</li>
                <li>• Unisex sweatshirt seçenekleri</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              onClose();
              onNavigate('home');
            }}
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfaya Dön
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
