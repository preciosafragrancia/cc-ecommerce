//@/pages/admin-coupons.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

type Cupom = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "percentual" | "fixo" | "frete_gratis";
  valor: number;
  data_inicio: string;
  data_fim: string;
  limite_uso: number | null;
  usos_por_usuario: number | null;
  valor_minimo_pedido: number | null;
  ativo: boolean;
  criado_em: string;
};

export default function AdminCupons() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);
  const [form, setForm] = useState<Partial<Cupom>>({
    nome: "",
    descricao: "",
    tipo: "percentual",
    valor: 0,
    data_inicio: "",
    data_fim: "",
    limite_uso: null,
    usos_por_usuario: null,
    valor_minimo_pedido: null,
    ativo: true,
  });

  async function carregarCupons() {
    const { data, error } = await supabase
      .from("cupons" as any)
      .select("*")
      .order("criado_em", { ascending: false });
    if (!error && data) setCupons(data as unknown as Cupom[]);
  }

  async function salvarCupom() {
    setLoading(true);

    if (editando) {
      // Atualizar cupom
      const { error } = await supabase
        .from("cupons" as any)
        .update(form as any)
        .eq("id", editando.id);
      setLoading(false);
      if (!error) {
        setOpen(false);
        setEditando(null);
        carregarCupons();
      } else {
        alert("Erro ao atualizar cupom: " + error.message);
      }
    } else {
      // Criar novo cupom
      const { error } = await supabase.from("cupons" as any).insert([form as any]);
      setLoading(false);
      if (!error) {
        setOpen(false);
        carregarCupons();
      } else {
        alert("Erro ao salvar cupom: " + error.message);
      }
    }
  }

  async function toggleAtivo(cupom: Cupom) {
    await supabase
      .from("cupons" as any)
      .update({ ativo: !cupom.ativo } as any)
      .eq("id", cupom.id);
    carregarCupons();
  }

  async function deletarCupom(id: string) {
    if (confirm("Tem certeza que deseja excluir este cupom?")) {
      await supabase.from("cupons" as any).delete().eq("id", id);
      carregarCupons();
    }
  }

  useEffect(() => {
    carregarCupons();
  }, []);

  function abrirEdicao(c: Cupom) {
    setEditando(c);
    setForm(c);
    setOpen(true);
  }

  function abrirCriacao() {
    setEditando(null);
    setForm({
      nome: "",
      descricao: "",
      tipo: "percentual",
      valor: 0,
      data_inicio: "",
      data_fim: "",
      limite_uso: null,
      usos_por_usuario: null,
      valor_minimo_pedido: null,
      ativo: true,
    });
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
        <Button onClick={abrirCriacao}>Novo Cupom</Button>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Cupom" : "Criar Cupom"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código do Cupom</Label>
              <Input
                value={form.nome || ""}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao || ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                className="w-full border rounded p-2"
                value={form.tipo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo: e.target.value as "percentual" | "fixo" | "frete_gratis",
                    valor: e.target.value === "frete_gratis" ? 0 : (form.valor || 0),
                  })
                }
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor Fixo (R$)</option>
                <option value="frete_gratis">Frete Grátis</option>
              </select>
            </div>
            {form.tipo !== "frete_gratis" && (
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                value={form.valor || 0}
                onChange={(e) =>
                  setForm({ ...form, valor: Number(e.target.value) })
                }
              />
            </div>
            )}
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={form.data_inicio || ""}
                onChange={(e) =>
                  setForm({ ...form, data_inicio: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={form.data_fim || ""}
                onChange={(e) =>
                  setForm({ ...form, data_fim: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Limite Total de Uso</Label>
              <Input
                type="number"
                value={form.limite_uso || ""}
                onChange={(e) =>
                  setForm({ ...form, limite_uso: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Usos por Usuário</Label>
              <Input
                type="number"
                value={form.usos_por_usuario || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    usos_por_usuario: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Valor Mínimo do Pedido</Label>
              <Input
                type="number"
                value={form.valor_minimo_pedido || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    valor_minimo_pedido: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.ativo || false}
                onCheckedChange={(checked) =>
                  setForm({ ...form, ativo: checked })
                }
              />
              <Label>Ativo</Label>
            </div>
            <Button onClick={salvarCupom} disabled={loading}>
              {loading
                ? "Salvando..."
                : editando
                ? "Salvar Alterações"
                : "Criar Cupom"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Listagem de Cupons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cupons.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="font-bold">{c.nome}</h2>
                <Switch
                  checked={c.ativo}
                  onCheckedChange={() => toggleAtivo(c)}
                />
              </div>
              <p className="text-sm text-gray-600">{c.descricao}</p>
              <p className="text-sm">
                {c.tipo === "percentual" ? `${c.valor}%` : c.tipo === "frete_gratis" ? "🚚 Frete Grátis" : `R$${c.valor}`}
              </p>
              <p className="text-xs text-gray-500">
                Validade: {format(new Date(c.data_inicio), "dd/MM/yyyy")} -{" "}
                {format(new Date(c.data_fim), "dd/MM/yyyy")}
              </p>
              <div className="flex justify-between mt-2">
                <Button size="sm" onClick={() => abrirEdicao(c)}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deletarCupom(c.id)}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
