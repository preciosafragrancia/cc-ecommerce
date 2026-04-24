import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('imagens-cardapio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Erro no upload",
          description: `Não foi possível fazer o upload da imagem: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('imagens-cardapio')
        .getPublicUrl(data.path);

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado durante o upload",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
};
