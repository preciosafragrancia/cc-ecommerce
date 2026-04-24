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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Plus, Trash2, Gift } from "lucide-react";
import { getAllMenuItems } from "@/services/menuItemService";
import { getAllCategories } from "@/services/categoryService";
import type { MenuItem, Category } from "@/types/menu";
import { toast } from "@/hooks/use-toast";

type ProdutoRef = {
  // "produto" = exige produto específico; "categoria" = qualquer item da categoria
  tipo?: "produto" | "categoria";
  product_id: string;
  product_name: string;
  category_id?: string;
  category_name?: string;
  quantidade: number;
};

type TipoCupom = "percentual" | "fixo" | "frete_gratis" | "compre_e_ganhe";

type Cupom = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoCupom;
  valor: number;
  data_inicio: string;
  data_fim: string;
  limite_uso: number | null;
  usos_por_usuario: number | null;
  valor_minimo_pedido: number | null;
  ativo: boolean;
  criado_em: string;
  produtos_requeridos?: ProdutoRef[] | null;
  produto_brinde?: ProdutoRef | null;
};

const initialForm: Partial<Cupom> = {
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
  produtos_requeridos: [],
  produto_brinde: null,
};

export default function AdminCupons() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);
  const [form, setForm] = useState<Partial<Cupom>>(initialForm);

  async function carregarCupons() {
    const { data, error } = await supabase
      .from("cupons" as any)
      .select("*")
      .order("criado_em", { ascending: false });
    if (!error && data) setCupons(data as unknown as Cupom[]);
  }

  async function carregarProdutos() {
    try {
      const items = await getAllMenuItems();
      setMenuItems(items.filter((i) => i.available !== false));
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
    }
  }

  async function carregarCategorias() {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
    }
  }

  async function salvarCupom() {
    // Validações específicas de "compre e ganhe"
    if (form.tipo === "compre_e_ganhe") {
      if (!form.produtos_requeridos || form.produtos_requeridos.length < 1) {
        toast({
          title: "Configuração incompleta",
          description: "Adicione pelo menos 1 item exigido.",
          variant: "destructive",
        });
        return;
      }
      const itemInvalido = form.produtos_requeridos.find((p) =>
        p.tipo === "categoria" ? !p.category_id : !p.product_id
      );
      if (itemInvalido) {
        toast({
          title: "Configuração incompleta",
          description: "Selecione o produto ou a categoria em todas as linhas exigidas.",
          variant: "destructive",
        });
        return;
      }
      if (!form.produto_brinde?.product_id) {
        toast({
          title: "Configuração incompleta",
          description: "Selecione o produto brinde.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    const payload = {
      ...form,
      // Para compre_e_ganhe, valor pode ser 0 (não é usado para desconto monetário)
      valor: form.tipo === "frete_gratis" || form.tipo === "compre_e_ganhe" ? 0 : (form.valor || 0),
    };

    if (editando) {
      const { error } = await supabase
        .from("cupons" as any)
        .update(payload as any)
        .eq("id", editando.id);
      setLoading(false);
      if (!error) {
        setOpen(false);
        setEditando(null);
        carregarCupons();
      } else {
        toast({ title: "Erro ao atualizar cupom", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("cupons" as any).insert([payload as any]);
      setLoading(false);
      if (!error) {
        setOpen(false);
        carregarCupons();
      } else {
        toast({ title: "Erro ao salvar cupom", description: error.message, variant: "destructive" });
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
    carregarProdutos();
    carregarCategorias();
  }, []);

  function abrirEdicao(c: Cupom) {
    setEditando(c);
    setForm({
      ...c,
      produtos_requeridos: c.produtos_requeridos ?? [],
      produto_brinde: c.produto_brinde ?? null,
    });
    setOpen(true);
  }

  function abrirCriacao() {
    setEditando(null);
    setForm(initialForm);
    setOpen(true);
  }

  // === Handlers de produtos exigidos ===
  function adicionarProdutoRequerido() {
    setForm((prev) => ({
      ...prev,
      produtos_requeridos: [
        ...(prev.produtos_requeridos || []),
        { tipo: "produto", product_id: "", product_name: "", quantidade: 1 },
      ],
    }));
  }

  function alterarTipoRequerido(index: number, tipo: "produto" | "categoria") {
    setForm((prev) => {
      const arr = [...(prev.produtos_requeridos || [])];
      // Resetar campos ao trocar de tipo para evitar inconsistência
      arr[index] = {
        ...arr[index],
        tipo,
        product_id: "",
        product_name: "",
        category_id: undefined,
        category_name: undefined,
      };
      return { ...prev, produtos_requeridos: arr };
    });
  }

  function atualizarProdutoRequerido(index: number, productId: string) {
    const produto = menuItems.find((p) => p.id === productId);
    setForm((prev) => {
      const arr = [...(prev.produtos_requeridos || [])];
      arr[index] = {
        ...arr[index],
        tipo: "produto",
        product_id: productId,
        product_name: produto?.name || "",
      };
      return { ...prev, produtos_requeridos: arr };
    });
  }

  function atualizarCategoriaRequerida(index: number, categoryId: string) {
    const categoria = categories.find((c) => c.id === categoryId);
    setForm((prev) => {
      const arr = [...(prev.produtos_requeridos || [])];
      arr[index] = {
        ...arr[index],
        tipo: "categoria",
        category_id: categoryId,
        category_name: categoria?.name || "",
      };
      return { ...prev, produtos_requeridos: arr };
    });
  }

  function atualizarQuantidadeRequerida(index: number, qtd: number) {
    setForm((prev) => {
      const arr = [...(prev.produtos_requeridos || [])];
      arr[index] = { ...arr[index], quantidade: Math.max(1, qtd) };
      return { ...prev, produtos_requeridos: arr };
    });
  }

  function removerProdutoRequerido(index: number) {
    setForm((prev) => ({
      ...prev,
      produtos_requeridos: (prev.produtos_requeridos || []).filter((_, i) => i !== index),
    }));
  }

  // === Handlers do brinde ===
  function selecionarBrinde(productId: string) {
    const produto = menuItems.find((p) => p.id === productId);
    setForm((prev) => ({
      ...prev,
      produto_brinde: {
        product_id: productId,
        product_name: produto?.name || "",
        quantidade: prev.produto_brinde?.quantidade || 1,
      },
    }));
  }

  function atualizarQuantidadeBrinde(qtd: number) {
    setForm((prev) => ({
      ...prev,
      produto_brinde: prev.produto_brinde
        ? { ...prev.produto_brinde, quantidade: Math.max(1, qtd) }
        : null,
    }));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
        <Button onClick={abrirCriacao}>Novo Cupom</Button>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                    tipo: e.target.value as TipoCupom,
                    valor:
                      e.target.value === "frete_gratis" || e.target.value === "compre_e_ganhe"
                        ? 0
                        : form.valor || 0,
                  })
                }
              >
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Valor Fixo (R$)</option>
                <option value="frete_gratis">Frete Grátis</option>
                <option value="compre_e_ganhe">Compre e Ganhe (Brinde)</option>
              </select>
            </div>

            {form.tipo !== "frete_gratis" && form.tipo !== "compre_e_ganhe" && (
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

            {/* Configuração específica de Compre e Ganhe */}
            {form.tipo === "compre_e_ganhe" && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="font-semibold">Produtos exigidos</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={adicionarProdutoRequerido}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    O cliente precisa ter todos esses itens no carrinho. Cada linha pode exigir um produto específico ou qualquer item de uma categoria.
                  </p>

                  {(form.produtos_requeridos || []).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum item adicionado.
                    </p>
                  )}

                  <div className="space-y-2">
                    {(form.produtos_requeridos || []).map((p, idx) => {
                      const tipoAtual = p.tipo === "categoria" ? "categoria" : "produto";
                      return (
                        <div key={idx} className="flex gap-2 items-start">
                          <div className="w-28 shrink-0">
                            <Select
                              value={tipoAtual}
                              onValueChange={(value) =>
                                alterarTipoRequerido(idx, value as "produto" | "categoria")
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="produto">Produto</SelectItem>
                                <SelectItem value="categoria">Categoria</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            {tipoAtual === "produto" ? (
                              <Select
                                value={p.product_id || undefined}
                                onValueChange={(value) => atualizarProdutoRequerido(idx, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o produto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {menuItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={p.category_id || undefined}
                                onValueChange={(value) => atualizarCategoriaRequerida(idx, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Input
                            type="number"
                            min={1}
                            className="w-20"
                            value={p.quantidade}
                            onChange={(e) =>
                              atualizarQuantidadeRequerida(idx, Number(e.target.value))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removerProdutoRequerido(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="font-semibold flex items-center gap-1">
                    <Gift className="h-4 w-4" /> Produto Brinde
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Será adicionado ao carrinho com valor R$ 0,00 quando o cupom for aplicado.
                  </p>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={form.produto_brinde?.product_id || undefined}
                        onValueChange={selecionarBrinde}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o brinde" />
                        </SelectTrigger>
                        <SelectContent>
                          {menuItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={form.produto_brinde?.quantidade || 1}
                      onChange={(e) => atualizarQuantidadeBrinde(Number(e.target.value))}
                    />
                  </div>
                </div>
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
                {c.tipo === "percentual"
                  ? `${c.valor}%`
                  : c.tipo === "frete_gratis"
                  ? "🚚 Frete Grátis"
                  : c.tipo === "compre_e_ganhe"
                  ? "🎁 Compre e Ganhe"
                  : `R$${c.valor}`}
              </p>

              {c.tipo === "compre_e_ganhe" && (
                <div className="text-xs space-y-1 bg-muted/40 rounded p-2">
                  <p className="font-semibold">Exigidos:</p>
                  <ul className="list-disc list-inside">
                    {(c.produtos_requeridos || []).map((p, i) => (
                      <li key={i}>
                        {p.quantidade}x {p.product_name}
                      </li>
                    ))}
                  </ul>
                  {c.produto_brinde && (
                    <p className="font-semibold flex items-center gap-1 pt-1">
                      <Gift className="h-3 w-3" /> Brinde:{" "}
                      {c.produto_brinde.quantidade}x {c.produto_brinde.product_name}
                    </p>
                  )}
                </div>
              )}

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
