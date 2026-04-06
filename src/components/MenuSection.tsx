
import React from "react";
import { MenuItem } from "@/types/menu";
import MenuItemCard from "./MenuItemCard";

interface MenuSectionProps {
  title: string;
  items: MenuItem[];
  itemRefs?: React.MutableRefObject<Record<string, { triggerClick: () => void } | null>>;
}

const MenuSection: React.FC<MenuSectionProps> = ({ title, items, itemRefs }) => {

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800" id={title.toLowerCase().replace(/\s+/g, '-')}>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            ref={(handle) => {
              if (itemRefs) {
                itemRefs.current[item.id] = handle;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MenuSection;
