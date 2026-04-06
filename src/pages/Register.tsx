import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react"; // 👈 importei os ícones
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres"
  }),
  email: z.string().email({
    message: "Email inválido"
  }),
  phone: z.string().optional(),
  password: z.string().min(6, {
    message: "Senha deve ter pelo menos 6 caracteres"
  }),
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"]
});

type FormValues = z.infer<typeof formSchema>;

const Register = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 👈 estado senha
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false); // 👈 estado confirmar senha
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      passwordConfirm: ""
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setError("");
      setLoading(true);
      await signUp(values.email, values.password, values.name, values.phone);
      toast({
        title: "Conta criada com sucesso",
        description: "Você foi registrado e conectado automaticamente",
      });
      navigate("/");
    } catch (error: any) {
      setError("Falha ao criar conta. Verifique seus dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Criar Conta</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ou{" "}
            <Link to="/login" className="font-medium text-brand hover:text-brand-600">
              faça login com sua conta existente
            </Link>
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                      <Input 
                        placeholder="Seu nome completo" 
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                      <Input 
                        placeholder="seu@email.com" 
                        className="pl-10" 
                        type="email"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                      <Input 
                        placeholder="(00) 00000-0000" 
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                      <Input 
                        placeholder="••••••••" 
                        className="pl-10 pr-10" 
                        type={showPassword ? "text" : "password"}
                        {...field} 
                      />
                      <button
                        type="button"
                        className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute top-3 left-3 text-gray-400 h-5 w-5" />
                      <Input 
                        placeholder="••••••••" 
                        className="pl-10 pr-10" 
                        type={showPasswordConfirm ? "text" : "password"}
                        {...field} 
                      />
                      <button
                        type="button"
                        className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      >
                        {showPasswordConfirm ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-600"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default Register;
