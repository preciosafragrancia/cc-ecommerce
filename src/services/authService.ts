// authService.ts

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// SIGN UP (com envio direto para n8n)
// ============================================
export async function signUp(
  email: string, 
  password: string, 
  name?: string, 
  phone?: string
): Promise<UserCredential> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  if (result.user) {
    // Salva usuário no Supabase com role "user"
    try {
      const { error: supabaseError } = await supabase
        .from('users')
        .upsert({
          firebase_id: result.user.uid,
          email: result.user.email || email,
          name: name || "",
          phone: phone || "",
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: "user",
        }, { onConflict: 'firebase_id' });

      if (supabaseError) {
        console.error("❌ Erro ao salvar usuário no Supabase:", supabaseError);
      } else {
        console.log("✅ Usuário criado no Supabase com role 'user'");
      }
    } catch (err) {
      console.error("⚠️ Falha ao salvar no Supabase:", err);
    }

    // Envia dados para webhook do n8n
    try {
      const userData = {
        id: result.user.uid,
        firebase_id: result.user.uid,
        email: result.user.email || "",
        name: name || "",
        phone: phone || "",
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: "user",
      };

      const response = await fetch(
        "https://n8n-n8n-start.yh11mi.easypanel.host/webhook/PF_signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("❌ Erro ao enviar para n8n:", text);
      }
    } catch (err) {
      console.error("⚠️ Falha no fetch para o n8n:", err);
    }
  }
  
  return result;
}

// ============================================
// SIGN IN
// ============================================
export async function signIn(email: string, password: string): Promise<UserCredential> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  if (result.user) {
    // Aqui você pode futuramente atualizar last_sign_in_at no n8n
    // await updateUserLastSignIn(result.user.uid);
  }
  
  return result;
}

// ============================================
// LOG OUT
// ============================================
export async function logOut(): Promise<void> {
  await signOut(auth);
}
