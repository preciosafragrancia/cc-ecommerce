import React, { useState } from "react";
import { Category } from "@/types/menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { deleteCategory, updateCategory } from "@/services/categoryService";

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  onEditCategory: (category: Category) => void;
  onDataChange: () => void;
}

export const CategoryList = ({
  categories,
  loading,
  onEditCategory,
  onDataChange,
}: CategoryListProps) => {
  const { toast } = useToast();
  const [isReordering, setIsReordering] = useState(false);

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 0;
    const orderB = b.order !== undefined ? b.order : 0;
    return orderA - orderB;
  });

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso",
      });
      onDataChange();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a categoria. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle reordering categories
  const handleReorderCategory = async (category: Category, direction: 'up' | 'down') => {
    try {
      setIsReordering(true);
      
      // Find the current index of the category
      const currentIndex = sortedCategories.findIndex(c => c.id === category.id);
      
      // Determine if we can move up or down
      if ((direction === 'up' && currentIndex === 0) || 
          (direction === 'down' && currentIndex === sortedCategories.length - 1)) {
        setIsReordering(false);
        return; // Can't move beyond boundaries
      }
      
      // Calculate new index
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Get the target category to swap with
      const targetCategory = sortedCategories[newIndex];
      
      // Store original orders
      const categoryOrder = category.order !== undefined ? category.order : currentIndex;
      const targetCategoryOrder = targetCategory.order !== undefined ? targetCategory.order : newIndex;
      
      // Swap orders
      const updatedCategory = {
        ...category,
        order: targetCategoryOrder
      };
      
      const updatedTargetCategory = {
        ...targetCategory,
        order: categoryOrder
      };
      
      // Update both categories with new orders
      await updateCategory(updatedCategory);
      await updateCategory(updatedTargetCategory);
      
      toast({
        title: "Sucesso",
        description: "Ordem das categorias atualizada",
      });
      
      await onDataChange(); // Refresh data
    } catch (error) {
      console.error("Erro ao reordenar categorias:", error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar as categorias. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsReordering(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Categorias Existentes</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedCategories.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.order !== undefined ? category.order : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleReorderCategory(category, 'up')}
                        disabled={isReordering || sortedCategories.indexOf(category) === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleReorderCategory(category, 'down')}
                        disabled={isReordering || sortedCategories.indexOf(category) === sortedCategories.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onEditCategory(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Nenhuma categoria encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
