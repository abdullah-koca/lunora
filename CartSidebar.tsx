import React from 'react';
import { X, Minus, Plus } from 'lucide-react';

type CartItem = {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  size: string;
  quantity: number;
  // İndirim alanları
  discount_percentage?: number | null;
  discount_price?: number | null;
  is_discounted?: boolean | null;
};

interface CartSidebarProps {
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: number, size: string, quantity: number) => void;
  getBaseSubtotal: () => number;
  getTotalPrice: () => number;
  getShippingCost: () => number;
  getFinalTotal: () => number;
  getCampaignSavings?: () => number;
  onCheckout: () => void;
}

export default function CartSidebar({ isOpen, cart, onClose, onUpdateQuantity, getBaseSubtotal, getTotalPrice, getShippingCost, getFinalTotal, getCampaignSavings, onCheckout }: CartSidebarProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70]">
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Alışveriş Sepeti</h2>
          <button onClick={onClose} aria-label="Kapat">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sepetiniz boş</p>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.size}-${index}`} className="flex items-center space-x-4 border-b pb-4">
                  <img
                    src={item.image || undefined}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    {item.product_code && (
                      <p className="text-gray-500 text-xs">Ürün Kodu: {item.product_code}</p>
                    )}
                    <p className="text-gray-500 text-sm">Beden: {item.size}</p>
                    <div className="flex items-center gap-2">
                      {item.is_discounted && item.discount_price ? (
                        <>
                          <span className="font-semibold text-red-600">₺{item.discount_price.toFixed(2).replace('.', ',')}</span>
                          <span className="text-sm text-gray-500 line-through">₺{item.price.toFixed(2).replace('.', ',')}</span>
                          {item.discount_percentage && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                              %{item.discount_percentage}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-semibold">₺{item.price.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.size, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Adet azalt"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.size, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Adet artır"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Ara Toplam:</span>
                <span>₺{getBaseSubtotal().toFixed(2).replace('.', ',')}</span>
              </div>
              {getCampaignSavings && getCampaignSavings() > 0 && (
                <div className="flex justify-between items-center text-green-600 font-semibold">
                  <span>Kampanya Tasarrufu (3 Al 2 Öde):</span>
                  <span>-₺{getCampaignSavings().toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Kargo:</span>
                <span className={getShippingCost() === 0 ? 'text-green-600 font-semibold' : ''}>
                  {getShippingCost() === 0 ? 'Bedava' : `₺${getShippingCost().toFixed(2).replace('.', ',')}`}
                </span>
              </div>
              {getTotalPrice() < 1500 && (
                <div className="text-xs text-gray-500 text-center">
                  1500 TL ve üzeri alışverişlerde kargo bedava
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Toplam:</span>
                  <span>₺{getFinalTotal().toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onCheckout}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
            >
              Ödemeye Git
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


