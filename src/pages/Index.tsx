import React, { useState, useEffect, useRef, useCallback } from "react";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import { MenuItem, Category, POPULAR_CATEGORY_ID } from "@/types/menu";
import RestaurantHeader from "@/components/RestaurantHeader";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, LogIn, LogOut, ClipboardList, Search, X, MessageCircle } from "lucide-react";
import ChatAssistant from "@/components/ChatAssistant";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackViewItemList } from "@/utils/trackingEvents";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

const Index = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { itemCount, isCartOpen, setIsCartOpen } = useCart();
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useLayoutSettings();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const itemRefs = useRef<Record<string, { triggerClick: () => void } | null>>({});
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    const loadMenuItems = async () => {
      const items = await getAllMenuItems();
      const availableItems = items.filter(item => item.available !== false);
      setMenuItems(availableItems);
    };

    const loadCategories = async () => {
      const categories = await getAllCategories();
      // Filtra categorias ocultas (visible === false)
      const visible = categories.filter(c => c.visible !== false);
      setCategories([{ id: "all", name: "Todos", order: -1 }, ...visible]);
    };

    loadMenuItems();
    loadCategories();
  }, []);

  // Deep link handler — runs after items are rendered and refs populated
  const handleDeepLink = useCallback(() => {
    if (deepLinkHandled.current) return;

    const itemId = searchParams.get("item");
    if (!itemId || menuItems.length === 0) return;

    // Wait a tick for refs to be populated after render
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-product-id="${itemId}"]`);
      const handle = itemRefs.current[itemId];

      if (el && handle) {
        deepLinkHandled.current = true;

        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Fire custom tracking event
        const matchedItem = menuItems.find(i => i.id === itemId);
        if (matchedItem) {
          try {
            (window as any).fbq?.("trackCustom", "view_item_from_ads", {
              content_ids: [matchedItem.id],
              content_name: matchedItem.name,
              content_category: matchedItem.category,
              currency: "BRL",
              value: matchedItem.price,
            });
            (window as any).dataLayer = (window as any).dataLayer || [];
            (window as any).dataLayer.push({
              event: "view_item_from_ads",
              ecommerce: {
                currency: "BRL",
                value: matchedItem.price,
                items: [{
                  item_id: matchedItem.id,
                  item_name: matchedItem.name,
                  item_category: matchedItem.category,
                  price: matchedItem.price,
                }],
              },
            });
          } catch (e) {
            console.error("view_item_from_ads tracking error:", e);
          }
        }

        // Trigger click after scroll settles
        setTimeout(() => {
          handle.triggerClick();
          // Clean up the URL param
          searchParams.delete("item");
          setSearchParams(searchParams, { replace: true });
        }, 600);
      }
    });
  }, [menuItems, searchParams, setSearchParams]);

  useEffect(() => {
    handleDeepLink();
  }, [handleDeepLink]);

  // Filtrar itens por busca e categoria
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory: boolean;
    if (activeCategory === "all") {
      matchesCategory = true;
    } else if (activeCategory === POPULAR_CATEGORY_ID) {
      matchesCategory = item.popular === true;
    } else {
      matchesCategory = item.category === activeCategory;
    }

    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));

  // Agrupar e ordenar itens por categoria para exibição
  const groupedItems = categories.reduce((acc, category) => {
    if (category.id === "all") return acc;

    let categoryItems: MenuItem[];

    if (category.id === POPULAR_CATEGORY_ID || category.isPopularCategory) {
      // Categoria fixa: mostra todos os itens marcados como populares
      categoryItems = filteredItems.filter(item => item.popular === true);
    } else {
      categoryItems = filteredItems.filter(item => item.category === category.id);
    }

    categoryItems = categoryItems.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );

    if (categoryItems.length > 0) {
      acc.push({
        category,
        items: categoryItems,
      });
    }
    return acc;
  }, [] as Array<{ category: Category; items: MenuItem[] }>);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div style={{ backgroundColor: settings.cor_background, color: settings.cor_fonte, minHeight: '100vh' }}>
      <RestaurantHeader />
      
      {/* Header com botão de login/logout e meus pedidos */}
      <div className="border-b" style={{ backgroundColor: settings.cor_barra_botoes }}>
        <div className="container mx-auto px-4 py-4 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 border-0"
            style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
          >
            <MessageCircle className="h-4 w-4" />
            Fale Conosco
          </Button>
          {currentUser && (
            <Button 
              variant="outline" 
              onClick={() => navigate("/meus-pedidos")}
              className="flex items-center gap-2 border-0"
              style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
            >
              <ClipboardList className="h-4 w-4" />
              Meus Pedidos
            </Button>
          )}
          {currentUser ? (
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2 border-0"
              style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          ) : (
            <Button 
              variant="default" 
              onClick={handleLogin}
              className="flex items-center gap-2 border-0"
              style={{ backgroundColor: settings.cor_botoes, color: settings.cor_fonte_botoes }}
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          )}
        </div>
      </div>

      <CategoryNav 
        categories={categories} 
        activeCategory={activeCategory}
        onSelectCategory={(categoryId) => {
          setActiveCategory(categoryId);
          // Fire view_item_list only on explicit category click
          const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
          const categoryItems = categoryId === "all"
            ? menuItems
            : menuItems.filter(item => item.category === categoryId);
          if (categoryItems.length > 0) {
            trackViewItemList({
              listName: categoryName,
              items: categoryItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                category: item.category,
              })),
            });
          }
        }}
      />
{/* Campo de busca com destaque aprimorado */}
<div className="container mx-auto px-4 pt-8 pb-4">
  <div className="relative max-w-xl mx-auto group">
    {/* Background decorativo para criar profundidade */}
    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl blur opacity-25 group-focus-within:opacity-50 transition duration-300"></div>
    
    <div className="relative flex items-center">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary/60" />
      <Input
        type="text"
        placeholder="colônia, amadeirado, masculino...etc"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-12 pr-12 h-14 text-xs border-2 border-muted bg-card shadow-lg rounded-xl focus-visible:ring-primary focus-visible:border-primary transition-all"
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm("")}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary p-1"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
    {/* Feedback visual de itens encontrados (opcional) */}
    {searchTerm && (
      <p className="text-center text-sm text-muted-foreground mt-2 animate-in fade-in slide-in-from-top-1">
        Encontramos {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
      </p>
    )}
  </div>
</div>


      
      <div className="container mx-auto px-4 py-8">
        {activeCategory === "all" ? (
          groupedItems.map(({ category, items }) => (
            <MenuSection 
              key={category.id}
              title={category.name}
                            
              items={items}
              itemRefs={itemRefs}
            />
          ))
        ) : (
          <MenuSection 
            title={categories.find(cat => cat.id === activeCategory)?.name || "Menu"}
            
            items={filteredItems}
            itemRefs={itemRefs}
          />
        )}
      </div>
      <ChatAssistant isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Index;
