import React from 'react';
import { X, Trash } from 'lucide-react';

type FavoriteItem = {
  id: number;
  name: string;
  price: number;
  image?: string | null;
};

interface FavoritesPanelProps {
  isOpen: boolean;
  favorites: FavoriteItem[];
  onClose: () => void;
  onRemove: (id: number) => void;
  onClear?: () => void;
}

export default function FavoritesPanel({ isOpen, favorites, onClose, onRemove, onClear }: FavoritesPanelProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Favorilerim</h2>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={onClear}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
              >
                Tümünü Temizle
              </button>
            )}
            <button onClick={onClose} aria-label="Kapat">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 mobile-scrollbar panel-scrollbar">
          {favorites.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Favori ürününüz yok</p>
          ) : (
            <div className="space-y-4">
              {favorites.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 border-b pb-4">
                  <img
                    src={item.image || undefined}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
                    {item.product_code && (
                      <p className="text-xs text-gray-600">Ürün Kodu: {item.product_code}</p>
                    )}
                    <p className="font-semibold">₺{item.price}</p>
                  </div>
                  <button
                    onClick={() => onRemove(Number(item.id))}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Favoriden kaldır"
                    aria-label="Favoriden kaldır"
                  >
                    <Trash className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


