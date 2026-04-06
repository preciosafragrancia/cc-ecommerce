
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Database, Flame, Clock, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CredenciaisSupabase {
  project_id: string;
  project_url: string;
  sb_publishable_key: string;
}

interface CronConfig {
  cron_schedule: string;
}

interface CredenciaisFirebase {
  firebase_json: string;
}

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingCron, setApplyingCron] = useState(false);

  const [supabaseCredentials, setSupabaseCredentials] = useState<CredenciaisSupabase>({
    project_id: "",
    project_url: "",
    sb_publishable_key: "",
  });

  const [firebaseCredentials, setFirebaseCredentials] = useState<CredenciaisFirebase>({
    firebase_json: "",
  });

  const [cronConfig, setCronConfig] = useState<CronConfig>({
    cron_schedule: "0 9 * * *",
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const getDefaultsFromSourceFiles = () => {
    // Valores extraídos de src/integrations/supabase/client.ts
    const supabaseUrl = "https://aealgiyzbenbhhftwkxb.supabase.co";
    const supabaseKey = "sb_publishable_segSu4lwfe4romisMtKB2g_TqiO70r8";
    const projectId = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

    // Valores extraídos de src/lib/firebase.ts
    const firebaseJson = JSON.stringify({
      apiKey: "AIzaSyB0BSql846hMmBa_WYiwpTdc5MDWEmDHP8",
      authDomain: "fb-aut6.firebaseapp.com",
      projectId: "fb-aut6",
      storageBucket: "fb-aut6.firebasestorage.app",
      messagingSenderId: "908504345671",
      appId: "1:908504345671:web:d4d624f3c6a5c4612a5562",
    }, null, 2);

    return { projectId, supabaseUrl, supabaseKey, firebaseJson };
  };

  const seedDefaults = async () => {
    const defaults = getDefaultsFromSourceFiles();
    const entries = [
      { chave: "supabase_project_id", valor: defaults.projectId },
      { chave: "supabase_project_url", valor: defaults.supabaseUrl },
      { chave: "supabase_publishable_key", valor: defaults.supabaseKey },
      { chave: "firebase_credentials", valor: defaults.firebaseJson },
    ];

    for (const entry of entries) {
      await supabase
        .from("configuracoes")
        .upsert(
          { chave: entry.chave, valor: entry.valor, updated_at: new Date().toISOString() },
          { onConflict: "chave" }
        );
    }
  };

  const loadCredentials = async () => {
    try {
      let { data, error } = await supabase
        .from("configuracoes")
        .select("chave, valor");

      if (error) throw error;

      // Se a tabela estiver vazia, popula com os valores dos arquivos fonte
      const relevantKeys = ["supabase_project_id", "supabase_project_url", "supabase_publishable_key", "firebase_credentials"];
      const hasDefaults = data?.some((row: any) => relevantKeys.includes(row.chave));

      if (!hasDefaults) {
        await seedDefaults();
        const result = await supabase.from("configuracoes").select("chave, valor");
        data = result.data;
      }

      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => {
          map[row.chave] = row.valor || "";
        });

        setSupabaseCredentials({
          project_id: map["supabase_project_id"] || "",
          project_url: map["supabase_project_url"] || "",
          sb_publishable_key: map["supabase_publishable_key"] || "",
        });

        setFirebaseCredentials({
          firebase_json: map["firebase_credentials"] || "",
        });

        setCronConfig({
          cron_schedule: map["cron_ga4_schedule"] || "0 9 * * *",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (chave: string, valor: string) => {
    const { error } = await supabase
      .from("configuracoes")
      .upsert(
        { chave, valor, updated_at: new Date().toISOString() },
        { onConflict: "chave" }
      );
    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveConfig("supabase_project_id", supabaseCredentials.project_id),
        saveConfig("supabase_project_url", supabaseCredentials.project_url),
        saveConfig("supabase_publishable_key", supabaseCredentials.sb_publishable_key),
        saveConfig("firebase_credentials", firebaseCredentials.firebase_json),
        saveConfig("cron_ga4_schedule", cronConfig.cron_schedule),
      ]);

      toast({
        title: "Configurações salvas",
        description: "Todas as credenciais foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Supabase */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Credenciais Supabase</CardTitle>
                <CardDescription>Configurações de conexão com o Supabase</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project ID</Label>
              <Input
                id="project_id"
                value={supabaseCredentials.project_id}
                onChange={(e) => setSupabaseCredentials((prev) => ({ ...prev, project_id: e.target.value }))}
                placeholder="Ex: aealgiyzbenbhhftwkxb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_url">Project URL</Label>
              <Input
                id="project_url"
                value={supabaseCredentials.project_url}
                onChange={(e) => setSupabaseCredentials((prev) => ({ ...prev, project_url: e.target.value }))}
                placeholder="Ex: https://xxxxx.supabase.co"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sb_key">SB Publishable Key</Label>
              <Input
                id="sb_key"
                value={supabaseCredentials.sb_publishable_key}
                onChange={(e) => setSupabaseCredentials((prev) => ({ ...prev, sb_publishable_key: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Firebase */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6 text-orange-500" />
              <div>
                <CardTitle>Credenciais Firebase</CardTitle>
                <CardDescription>JSON de configuração do Firebase</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="firebase_json">Credenciais Firebase (JSON)</Label>
              <Textarea
                id="firebase_json"
                rows={10}
                value={firebaseCredentials.firebase_json}
                onChange={(e) => setFirebaseCredentials({ firebase_json: e.target.value })}
                placeholder={`{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cron GA4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle>Agendamento Cron (GA4 Snapshot)</CardTitle>
                <CardDescription>Expressão cron para coleta automática de dados do GA4. Padrão: 0 9 * * * (diariamente às 09:00 UTC / 06:00 BRT)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cron_schedule">Expressão Cron</Label>
                <Input
                  id="cron_schedule"
                  value={cronConfig.cron_schedule}
                  onChange={(e) => setCronConfig({ cron_schedule: e.target.value })}
                  placeholder="0 9 * * *"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: minuto hora dia mês dia_semana. Exemplo: "0 9 * * *" = todos os dias às 09:00 UTC (06:00 BRT).
                </p>
              </div>
              <Button
                variant="outline"
                disabled={applyingCron}
                onClick={async () => {
                  setApplyingCron(true);
                  try {
                    // Save to configuracoes first
                    await saveConfig("cron_ga4_schedule", cronConfig.cron_schedule);
                    
                    // Apply via edge function
                    const { data, error } = await supabase.functions.invoke("update-cron", {
                      body: { schedule: cronConfig.cron_schedule },
                    });
                    if (error) throw error;
                    toast({
                      title: "Cron atualizado",
                      description: `Agendamento aplicado: ${cronConfig.cron_schedule}`,
                    });
                  } catch (error: any) {
                    console.error("Erro ao aplicar cron:", error);
                    toast({
                      title: "Erro ao aplicar cron",
                      description: error.message || "Não foi possível atualizar o agendamento.",
                      variant: "destructive",
                    });
                  } finally {
                    setApplyingCron(false);
                  }
                }}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${applyingCron ? "animate-spin" : ""}`} />
                {applyingCron ? "Aplicando..." : "Aplicar Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
