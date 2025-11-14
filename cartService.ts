import { supabase } from './supabaseClient';

export type CartItemRow = {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  size: string;
  quantity: number;
};

export async function fetchUserCart(userId: string): Promise<CartItemRow[]> {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      // PGRST116: Row not found
      console.warn('[CartService] Sepet yüklenirken hata:', error);
      return [];
    }
    return (data?.items as CartItemRow[]) || [];
  } catch (err) {
    console.warn('[CartService] Sepet yüklenirken beklenmeyen hata:', err);
    return [];
  }
}

export async function saveUserCart(userId: string, items: CartItemRow[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('carts')
      .upsert({ user_id: userId, items }, { onConflict: 'user_id' });
    if (error) {
      console.warn('[CartService] Sepet kaydedilirken hata:', error);
      // Hata olsa bile session'ı bozmayalım - sessizce geç
    }
  } catch (err) {
    console.warn('[CartService] Sepet kaydedilirken beklenmeyen hata:', err);
    // Hata olsa bile session'ı bozmayalım - sessizce geç
  }
}


