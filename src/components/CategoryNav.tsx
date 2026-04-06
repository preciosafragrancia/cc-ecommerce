
import React, { useState, useEffect } from "react";
import { Category } from "@/types/menu";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "overflow-x-auto bg-white py-4 transition-all duration-300 z-10",
        isSticky && "sticky top-0 shadow-md"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "food-category whitespace-nowrap pb-2 text-gray-600 hover:text-brand transition-colors",
                activeCategory === category.id && "active"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryNav;
