import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUI } from './UIContext';

const CartContext = createContext();
const CART_STORAGE_KEY = 'pharmavision_global_pos_cart_v1';

export const CartProvider = ({ children }) => {
  const { showToast } = useUI();
  
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  }, [cart]);

  const addToCart = useCallback((med, qtyToAdd = 1) => {
    const medId = med.id || med.medicine_id;
    if (!medId) {
      showToast("Cannot add item without ID", "error");
      return;
    }

    const availableStock = Number(med.stock_available ?? med.quantity ?? 0);
    if (availableStock <= 0) {
      showToast(`${med.medicine_name || 'Item'} is Out of Stock`, "error");
      return;
    }

    const safeQtyToAdd = Number(qtyToAdd) > 0 ? Number(qtyToAdd) : 1;

    setCart(prev => {
      const existing = prev.find(item => item.medicine_id === medId);
      if (existing) {
        const targetQty = existing.quantity + safeQtyToAdd;
        if (targetQty > availableStock) {
          showToast(`Cannot exceed available stock (${availableStock})`, "warning");
          return prev.map(item =>
            item.medicine_id === medId
              ? { ...item, quantity: availableStock }
              : item
          );
        }
        showToast(`Added +${safeQtyToAdd} units to cart`, "success");
        return prev.map(item =>
          item.medicine_id === medId
            ? { ...item, quantity: targetQty }
            : item
        );
      } else {
        const initialQty = Math.min(safeQtyToAdd, availableStock);
        showToast(`Added ${initialQty} units to cart`, "success");
        const newItem = {
          medicine_id: medId,
          medicine_name: med.medicine_name || "Unknown Medicine",
          unit_price: Number(med.unit_price ?? 0),
          quantity: initialQty,
          batch_number: med.batch_number || "N/A",
          expiry_date: med.expiry_date || "N/A",
          stock_available: availableStock,
          manufacturer: med.manufacturer || "General",
          category: med.category || "General"
        };
        return [...prev, newItem];
      }
    });
  }, [showToast]);

  const removeFromCart = useCallback((medicine_id) => {
    setCart(prev => prev.filter(item => item.medicine_id !== medicine_id));
    showToast("Removed from cart", "info");
  }, [showToast]);

  const increaseQuantity = useCallback((medicine_id) => {
    setCart(prev => {
      const item = prev.find(i => i.medicine_id === medicine_id);
      if (!item) return prev;
      if (item.quantity >= item.stock_available) {
        showToast(`Cannot exceed available stock (${item.stock_available})`, "warning");
        return prev;
      }
      return prev.map(i => i.medicine_id === medicine_id ? { ...i, quantity: item.quantity + 1 } : i);
    });
  }, [showToast]);

  const decreaseQuantity = useCallback((medicine_id) => {
    setCart(prev => {
      const item = prev.find(i => i.medicine_id === medicine_id);
      if (!item) return prev;
      if (item.quantity <= 1) {
        showToast("Removed from cart", "info");
        return prev.filter(i => i.medicine_id !== medicine_id);
      }
      return prev.map(i => i.medicine_id === medicine_id ? { ...i, quantity: item.quantity - 1 } : i);
    });
  }, [showToast]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const calculateTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.unit_price ?? 0) * Number(item.quantity ?? 0)), 0);
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
    const grandTotal = subtotal;
    return {
      subtotal: Number(subtotal || 0),
      totalItems: Number(totalItems || 0),
      grandTotal: Number(grandTotal || 0)
    };
  }, [cart]);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      calculateTotals
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
