import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { CartItem, MenuItem, SelectedVariationGroup, PizzaBorder } from "@/types/menu";
import { toast } from "@/components/ui/use-toast";
import { getAllVariations } from "@/services/variationService";
import { getAllMenuItems } from "@/services/menuItemService";
import { trackAddToCart, trackRemoveFromCart, trackUpdateCartQuantity } from "@/utils/trackingEvents";

interface AppliedCoupon {
  id: string;
  nome: string;
  tipo: "percentual" | "fixo" | "frete_gratis";
  valor: number;
  usos?: number | null;
  limite_uso?: number | null;
  data_inicio?: string;
  data_fim?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: MenuItem & { selectedVariations?: SelectedVariationGroup[]; selectedBorder?: PizzaBorder; quantity?: number }) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  updateCartItemByIndex: (index: number, updatedItem: Partial<CartItem>) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  discountAmount: number;
  finalTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart_items_backup";

const saveCartToStorage = (items: CartItem[]) => {
  try {
    const minimal = items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      selectedVariations: item.selectedVariations,
      selectedBorder: item.selectedBorder ? { id: item.selectedBorder.id } : undefined,
      isHalfPizza: item.isHalfPizza,
      combination: item.combination,
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
  } catch (e) {
    console.error("Erro ao salvar carrinho no localStorage:", e);
  }
};

const loadCartFromStorage = (): any[] => {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const hasRestoredCart = useRef(false);

  // carregar variações
  useEffect(() => {
    const loadVariations = async () => {
      try {
        const allVariations = await getAllVariations();
        setVariations(allVariations);
      } catch (error) {
        console.error("Erro ao carregar variações:", error);
      }
    };
    loadVariations();
  }, []);

  // Restaurar carrinho do localStorage com preços atualizados
  useEffect(() => {
    if (hasRestoredCart.current) return;
    hasRestoredCart.current = true;

    const restoreCart = async () => {
      const savedItems = loadCartFromStorage();
      if (!savedItems.length) return;

      try {
        const allItems = await getAllMenuItems();
        const itemsMap = new Map(allItems.map(i => [i.id, i]));

        const restoredItems: CartItem[] = [];
        for (const saved of savedItems) {
          const fresh = itemsMap.get(saved.id);
          if (!fresh || fresh.available === false) continue;

          // Restaurar borda com preço atualizado
          let restoredBorder: PizzaBorder | undefined;
          if (saved.selectedBorder?.id && fresh.pizzaBorders) {
            restoredBorder = fresh.pizzaBorders.find((b: PizzaBorder) => b.id === saved.selectedBorder.id);
          }

          restoredItems.push({
            ...fresh,
            quantity: saved.quantity,
            selectedVariations: saved.selectedVariations,
            selectedBorder: restoredBorder,
            isHalfPizza: saved.isHalfPizza,
            combination: saved.combination,
          });
        }

        if (restoredItems.length > 0) {
          setCartItems(restoredItems);
        }
        if (restoredItems.length < savedItems.length) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([]));
        }
      } catch (error) {
        console.error("Erro ao restaurar carrinho:", error);
      }
    };

    restoreCart();
  }, []);

  // Salvar carrinho no localStorage quando mudar
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  const getVariationPrice = (variationId: string): number => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.additionalPrice || 0;
  };

  const getVariationName = (variationId: string): string => {
    const variation = variations.find(v => v.id === variationId);
    return variation?.name || "";
  };

  const calculateVariationsTotal = (item: CartItem): number => {
    let variationsTotal = 0;
    if (item.selectedVariations?.length) {
      item.selectedVariations.forEach(group => {
        group.variations?.forEach(variation => {
          const additionalPrice = variation.additionalPrice ?? getVariationPrice(variation.variationId);
          if (additionalPrice > 0) {
            // Se é pizza meio a meio e selecionou "whole" (pizza inteira), cobra 2x
            const multiplier = (item.isHalfPizza && variation.halfSelection === "whole") ? 2 : 1;
            variationsTotal += additionalPrice * (variation.quantity || 1) * multiplier;
          }
        });
      });
    }
    // Adicionar preço da borda selecionada
    if (item.selectedBorder?.additionalPrice) {
      variationsTotal += item.selectedBorder.additionalPrice;
    }
    return variationsTotal;
  };

  // recalcular totais
  useEffect(() => {
    const { total, count } = cartItems.reduce(
      (acc, item) => {
        let itemTotal = 0;

        if (item.isHalfPizza) {
          // Para pizza meio a meio, usamos o price final + variações (adicionais/borda)
          const basePrice = item.price || 0;
          const variationsTotal = calculateVariationsTotal(item);
          itemTotal = (basePrice + variationsTotal) * item.quantity;
        } else {
          const basePrice = item.priceFrom ? 0 : (item.price || 0);
          const variationsTotal = calculateVariationsTotal(item);
          itemTotal = (basePrice + variationsTotal) * item.quantity;
        }

        acc.total += itemTotal;
        acc.count += item.quantity;
        return acc;
      },
      { total: 0, count: 0 }
    );

    setCartTotal(total);
    setItemCount(count);

    // Calcular desconto e total final
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.tipo === "percentual") {
        discount = total * (appliedCoupon.valor / 100);
      } else if (appliedCoupon.tipo === "fixo") {
        discount = appliedCoupon.valor;
      }
      // frete_gratis: discount on items stays 0, frete is handled in Checkout
    }
    setDiscountAmount(discount);
    setFinalTotal(Math.max(0, total - discount));
  }, [cartItems, variations, appliedCoupon]);


  const enrichSelectedVariations = (selectedVariations?: SelectedVariationGroup[]): SelectedVariationGroup[] => {
    if (!selectedVariations?.length) return [];
    return selectedVariations.map(group => ({
      ...group,
      variations: group.variations.map(variation => ({
        ...variation,
        name: variation.name || getVariationName(variation.variationId),
        additionalPrice:
          variation.additionalPrice !== undefined
            ? variation.additionalPrice
            : getVariationPrice(variation.variationId),
      })),
    }));
  };

  const addItem = (menuItem: MenuItem & { selectedVariations?: SelectedVariationGroup[]; selectedBorder?: PizzaBorder; quantity?: number }) => {
    const { selectedVariations, selectedBorder, quantity: inputQuantity, ...item } = menuItem;
    const quantityToAdd = inputQuantity ?? 1;

    const enrichedVariations = enrichSelectedVariations(selectedVariations);
    const itemId = item.id;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        i =>
          i.id === itemId &&
          JSON.stringify(i.selectedVariations) === JSON.stringify(enrichedVariations) &&
          i.selectedBorder?.id === selectedBorder?.id
      );

      if (existingItem) {
        return prevItems.map(i =>
          i.id === itemId &&
          JSON.stringify(i.selectedVariations) === JSON.stringify(enrichedVariations) &&
          i.selectedBorder?.id === selectedBorder?.id
            ? { ...i, quantity: i.quantity + quantityToAdd }
            : i
        );
      } else {
        const newItem: CartItem = {
          ...item,
          quantity: quantityToAdd,
          selectedVariations: enrichedVariations,
          selectedBorder: selectedBorder,
        };
        return [...prevItems, newItem];
      }
    });

    toast({
      title: "Item adicionado",
      description: `${quantityToAdd}x ${item.name} foi adicionado ao carrinho`,
      duration: 2000,
    });
    
// --- INÍCIO DO CÓDIGO DE RASTREAMENTO (ATUALIZADO) ---
    try {
      const itemParaCalculo: CartItem = { ...menuItem, quantity: quantityToAdd, selectedVariations: enrichedVariations };
      let finalPrice = 0;

      if (itemParaCalculo.isHalfPizza) {
        finalPrice = itemParaCalculo.price || 0;
      } else {
        const basePrice = itemParaCalculo.priceFrom ? 0 : (itemParaCalculo.price || 0);
        const variationsTotal = calculateVariationsTotal(itemParaCalculo);
        finalPrice = basePrice + variationsTotal;
      }

      // Montando o objeto de dados completo para a nova função
      const trackingData = {
        id: item.id,
        name: item.name,
        price: finalPrice,
        quantity: quantityToAdd,
        category: item.category,
        variations: enrichedVariations?.flatMap(group => 
          group.variations.map(v => ({ name: v.name, price: v.additionalPrice }))
        ),
        border: menuItem.selectedBorder
          ? { name: menuItem.selectedBorder.name, price: menuItem.selectedBorder.additionalPrice }
          : undefined,
        isHalfPizza: item.isHalfPizza,
        combination: item.combination,
      };

      trackAddToCart(trackingData);

    } catch (error) {
        console.error("Falha ao rastrear evento AddToCart:", error);
    }
    // --- FIM DO CÓDIGO DE RASTREAMENTO ---

  };

  const addToCart = (item: MenuItem) => addItem(item);

  const removeFromCart = (id: string) => {
    const removedItem = cartItems.find(item => item.id === id);
    if (removedItem) {
      trackRemoveFromCart({
        id: removedItem.id,
        name: removedItem.name,
        price: removedItem.price,
        quantity: removedItem.quantity,
        category: removedItem.category,
      });
    }
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const buildTrackingData = (item: CartItem, newQuantity: number) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: newQuantity,
    category: item.category,
    variations: item.selectedVariations?.flatMap(group =>
      group.variations.map(v => ({ name: v.name, price: v.additionalPrice }))
    ),
    border: item.selectedBorder
      ? { name: item.selectedBorder.name, price: item.selectedBorder.additionalPrice }
      : undefined,
    isHalfPizza: item.isHalfPizza,
    combination: item.combination,
  });

  const increaseQuantity = (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (item) {
      trackUpdateCartQuantity(buildTrackingData(item, item.quantity + 1));
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (item && item.quantity > 1) {
      trackUpdateCartQuantity(buildTrackingData(item, item.quantity - 1));
    }
    setCartItems(prevItems => {
      const item = prevItems.find(i => i.id === id);
      if (!item) return prevItems;
      if (item.quantity <= 1) {
        return prevItems.filter(i => i.id !== id);
      }
      return prevItems.map(i =>
        i.id === id ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const updateCartItemByIndex = (index: number, updatedFields: Partial<CartItem>) => {
    setCartItems(prevItems =>
      prevItems.map((item, i) => (i === index ? { ...item, ...updatedFields } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateCartItemByIndex,
        clearCart,
        cartTotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        appliedCoupon,
        setAppliedCoupon,
        discountAmount,
        finalTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
