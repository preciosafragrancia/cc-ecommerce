import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, RefreshCw, MessageCircle, Bell, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applyingCron, setApplyingCron] = useState(false);
  const [savingChat, setSavingChat] = useState(false);
  const [savingWebhookStatus, setSavingWebhookStatus] = useState(false);
  const [savingWebhookAuth, setSavingWebhookAuth] = useState(false);
  const [cronSchedule, setCronSchedule] = useState("0 9 * * *");
  const [webhookChat, setWebhookChat] = useState("");
  const [webhookStatus, setWebhookStatus] = useState("");
  const [webhookAuth, setWebhookAuth] = useState("");
  const [mensagemAtendimento, setMensagemAtendimento] = useState("");

  const currentProjectUrl = (supabase as any).supabaseUrl;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("chave, valor")
        .in("chave", ["cron_ga4_schedule", "webhook_chatassistant", "mensagem_atendimento", "webhook_status_pedido", "webhook_autenticacao"]);

      if (error) throw error;

      if (data) {
        data.forEach((row) => {
          if (row.chave === "cron_ga4_schedule" && row.valor) setCronSchedule(row.valor);
          if (row.chave === "webhook_chatassistant" && row.valor) setWebhookChat(row.valor);
          if (row.chave === "webhook_status_pedido" && row.valor) setWebhookStatus(row.valor);
          if (row.chave === "webhook_autenticacao" && row.valor) setWebhookAuth(row.valor);
          if (row.chave === "mensagem_atendimento" && row.valor) setMensagemAtendimento(row.valor);
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCron = async () => {
    setApplyingCron(true);
    try {
      const { error: dbError } = await supabase
        .from("configuracoes")
        .upsert(
          { chave: "cron_ga4_schedule", valor: cronSchedule, updated_at: new Date().toISOString() },
          { onConflict: "chave" }
        );
      if (dbError) throw dbError;

      const { data, error: funcError } = await supabase.functions.invoke("update-cron", {
        body: { schedule: cronSchedule },
      });
      if (funcError) throw funcError;

      toast({ title: "Sucesso!", description: `Agendamento atualizado para: ${cronSchedule}` });
    } catch (error: any) {
      console.error("Erro na operação:", error);
      toast({ title: "Erro ao atualizar", description: error.message || "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setApplyingCron(false);
    }
  };

  const handleSaveChatConfig = async () => {
    setSavingChat(true);
    try {
      for (const { chave, valor } of [
        { chave: "webhook_chatassistant", valor: webhookChat },
        { chave: "webhook_status_pedido", valor: webhookStatus },
        { chave: "mensagem_atendimento", valor: mensagemAtendimento },
      ]) {
        const { error } = await supabase
          .from("configuracoes")
          .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: "chave" });
        if (error) throw error;
      }
      toast({ title: "Sucesso!", description: "Configurações do chat salvas." });
    } catch (error: any) {
      console.error("Erro ao salvar chat:", error);
      toast({ title: "Erro ao salvar", description: error.message || "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setSavingChat(false);
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
          <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg border text-xs text-muted-foreground mb-4">
          <p><strong>Projeto Conectado:</strong> {currentProjectUrl}</p>
        </div>

        {/* Cron GA4 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Agendamento Cron (GA4)</CardTitle>
                <CardDescription>Define a frequência com que os dados do Analytics são coletados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cron_schedule">Expressão Cron (Minuto Hora Dia Mês Semana)</Label>
                <Input id="cron_schedule" value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} placeholder="0 9 * * *" className="font-mono text-lg" />
                <p className="text-sm text-muted-foreground">
                  Exemplo: <code className="bg-muted px-1">0 9 * * *</code> executa diariamente às 09h UTC (06h BRT).
                </p>
              </div>
              <Button className="w-full" disabled={applyingCron} onClick={handleUpdateCron}>
                <RefreshCw className={`h-4 w-4 mr-2 ${applyingCron ? "animate-spin" : ""}`} />
                {applyingCron ? "Atualizando Agendamento..." : "Salvar e Aplicar Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Alerta de Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Webhook Alerta de Status</CardTitle>
                <CardDescription>URL do webhook acionado quando o status de um pedido é alterado.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_status">URL do Webhook</Label>
                <Input
                  id="webhook_status"
                  value={webhookStatus}
                  onChange={(e) => setWebhookStatus(e.target.value)}
                  placeholder="https://seu-webhook.com/status_pedido"
                />
                <p className="text-sm text-muted-foreground">
                  Essa URL será chamada automaticamente ao alterar o status de um pedido no painel.
                </p>
              </div>
              <Button className="w-full" disabled={savingWebhookStatus} onClick={async () => {
                setSavingWebhookStatus(true);
                try {
                  const { error } = await supabase
                    .from("configuracoes")
                    .upsert({ chave: "webhook_status_pedido", valor: webhookStatus, updated_at: new Date().toISOString() }, { onConflict: "chave" });
                  if (error) throw error;
                  toast({ title: "Sucesso!", description: "Webhook de status salvo." });
                } catch (error: any) {
                  toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
                } finally {
                  setSavingWebhookStatus(false);
                }
              }}>
                <RefreshCw className={`h-4 w-4 mr-2 ${savingWebhookStatus ? "animate-spin" : ""}`} />
                {savingWebhookStatus ? "Salvando..." : "Salvar Webhook de Status"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Autenticação */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Webhook Autenticação</CardTitle>
                <CardDescription>URL do webhook acionado para enviar o código de verificação por WhatsApp no signup.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_auth">URL do Webhook</Label>
                <Input
                  id="webhook_auth"
                  value={webhookAuth}
                  onChange={(e) => setWebhookAuth(e.target.value)}
                  placeholder="https://seu-webhook.com/autenticacao"
                />
                <p className="text-sm text-muted-foreground">
                  Essa URL receberá o telefone do cliente para envio do código de autenticação via WhatsApp.
                </p>
              </div>
              <Button className="w-full" disabled={savingWebhookAuth} onClick={async () => {
                setSavingWebhookAuth(true);
                try {
                  const { error } = await supabase
                    .from("configuracoes")
                    .upsert({ chave: "webhook_autenticacao", valor: webhookAuth, updated_at: new Date().toISOString() }, { onConflict: "chave" });
                  if (error) throw error;
                  toast({ title: "Sucesso!", description: "Webhook de autenticação salvo." });
                } catch (error: any) {
                  toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
                } finally {
                  setSavingWebhookAuth(false);
                }
              }}>
                <RefreshCw className={`h-4 w-4 mr-2 ${savingWebhookAuth ? "animate-spin" : ""}`} />
                {savingWebhookAuth ? "Salvando..." : "Salvar Webhook de Autenticação"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Assistant Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Assistente Virtual (Chat)</CardTitle>
                <CardDescription>Configure o webhook e a mensagem inicial do chat de atendimento.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_chat">Webhook Chatassistant</Label>
                <Input
                  id="webhook_chat"
                  value={webhookChat}
                  onChange={(e) => setWebhookChat(e.target.value)}
                  placeholder="https://seu-webhook.com/chatassistant"
                />
                <p className="text-sm text-muted-foreground">
                  URL do webhook que será acionado pelo botão "Fale Conosco".
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mensagem_atendimento">Mensagem de Atendimento</Label>
                <Textarea
                  id="mensagem_atendimento"
                  value={mensagemAtendimento}
                  onChange={(e) => setMensagemAtendimento(e.target.value)}
                  placeholder="Olá 👋! Sou o atendente virtual! Posso te ajudar com informações ou acompanhar seu pedido 😊"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Mensagem inicial exibida quando o usuário abre o chat.
                </p>
              </div>
              <Button className="w-full" disabled={savingChat} onClick={handleSaveChatConfig}>
                <RefreshCw className={`h-4 w-4 mr-2 ${savingChat ? "animate-spin" : ""}`} />
                {savingChat ? "Salvando..." : "Salvar Configurações do Chat"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;
