import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/hooks/use-inventory";
import { FieldManagerDialog } from "@/components/assets/FieldManagerDialog";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { InlineCellEditor } from "@/components/assets/InlineCellEditor";
import {
  Laptop,
  Key,
  Phone,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  "Disponível": "bg-emerald-500/15 text-emerald-600",
  "Em uso": "bg-blue-500/15 text-blue-600",
  "Manutenção": "bg-amber-500/15 text-amber-600",
  "Baixado": "bg-muted text-muted-foreground",
  "Reservado": "bg-muted text-muted-foreground",
};

const statusOptions = ["Disponível", "Em uso", "Manutenção", "Reservado", "Baixado"];

function StatusBadgeColored({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColors[status] || "bg-secondary text-secondary-foreground")}>
      {status}
    </span>
  );
}

function CategoryTab({ category, label }: { category: string; label: string }) {
  const {
    items, fields, loading,
    addItem, updateItem, deleteItem,
    addField, updateField, deleteField,
    getFieldValue, setFieldValue,
  } = useInventory(category);

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePw = (id: string) => {
    setVisiblePasswords(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleNewAsset = async (data: Record<string, string>, fieldVals: Record<string, string>) => {
    // Insert into inventory
    const { data: inserted, error } = await supabase.from("inventory").insert({
      category,
      status: data.status || "Disponível",
      collaborator: data.collaborator || "",
      cost_center: data.cost_center || "",
      sector: data.sector || "",
      model: data.model || "",
      asset_type: data.asset_type || "",
      service_tag: data.service_tag || "",
      notes: data.notes || "",
      asset_code: "TEMP",
    }).select().single();

    if (error || !inserted) return;

    // Save custom field values
    const entries = Object.entries(fieldVals).filter(([, v]) => v.trim() !== "");
    if (entries.length > 0) {
      await supabase.from("custom_field_values").insert(
        entries.map(([fieldId, value]) => ({ asset_id: (inserted as any).id, field_id: fieldId, value }))
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Password-specific layout
  if (category === "passwords") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Cofre de Senhas</CardTitle>
          <div className="flex items-center gap-2">
            <FieldManagerDialog categoryLabel={label} fields={fields} onAdd={addField} onUpdate={updateField} onDelete={deleteField} />
            <NewAssetDialog category={category} fields={fields} onSave={handleNewAsset} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome / Conta</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Senha</TableHead>
                  {fields.map(f => <TableHead key={f.id}>{f.name}</TableHead>)}
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                    <TableCell>
                      <InlineCellEditor value={item.model} onSave={v => updateItem(item.id, { model: v })} />
                    </TableCell>
                    <TableCell>
                      <InlineCellEditor value={item.collaborator} onSave={v => updateItem(item.id, { collaborator: v })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">
                          {visiblePasswords.has(item.id) ? item.service_tag : "••••••••"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => togglePw(item.id)}>
                          {visiblePasswords.has(item.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                    {fields.map(f => (
                      <TableCell key={f.id}>
                        <InlineCellEditor
                          value={getFieldValue(item.id, f.id)}
                          onSave={v => setFieldValue(item.id, f.id, v)}
                          type={f.field_type === "seleção" ? "select" : f.field_type === "número" ? "number" : f.field_type === "data" ? "date" : "text"}
                          options={f.options || undefined}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{item.notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5 + fields.length} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generic layout for hardware, telecom, licenses
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{label}</CardTitle>
        <div className="flex items-center gap-2">
          <FieldManagerDialog categoryLabel={label} fields={fields} onAdd={addField} onUpdate={updateField} onDelete={deleteField} />
          <NewAssetDialog category={category} fields={fields} onSave={handleNewAsset} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Modelo</TableHead>
                {category === "hardware" && <TableHead>Tipo</TableHead>}
                {category === "hardware" && <TableHead>Service Tag</TableHead>}
                <TableHead>Centro de Custo</TableHead>
                {category !== "passwords" && <TableHead>Setor</TableHead>}
                {fields.map(f => <TableHead key={f.id} className="whitespace-nowrap">{f.name}</TableHead>)}
                <TableHead>Notas</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.asset_code}</TableCell>
                  <TableCell>
                    <InlineCellEditor
                      value={item.status}
                      onSave={v => updateItem(item.id, { status: v })}
                      type="select"
                      options={statusOptions}
                      displayRender={v => <StatusBadgeColored status={v} />}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineCellEditor value={item.collaborator} onSave={v => updateItem(item.id, { collaborator: v })} />
                  </TableCell>
                  <TableCell>
                    <InlineCellEditor value={item.model} onSave={v => updateItem(item.id, { model: v })} />
                  </TableCell>
                  {category === "hardware" && (
                    <TableCell>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{item.asset_type || "—"}</span>
                    </TableCell>
                  )}
                  {category === "hardware" && (
                    <TableCell className="font-mono text-xs">
                      <InlineCellEditor value={item.service_tag} onSave={v => updateItem(item.id, { service_tag: v })} />
                    </TableCell>
                  )}
                  <TableCell>
                    <InlineCellEditor value={item.cost_center} onSave={v => updateItem(item.id, { cost_center: v })} />
                  </TableCell>
                  {category !== "passwords" && (
                    <TableCell>
                      <InlineCellEditor value={item.sector} onSave={v => updateItem(item.id, { sector: v })} />
                    </TableCell>
                  )}
                  {fields.map(f => (
                    <TableCell key={f.id}>
                      <InlineCellEditor
                        value={getFieldValue(item.id, f.id)}
                        onSave={v => setFieldValue(item.id, f.id, v)}
                        type={f.field_type === "seleção" ? "select" : f.field_type === "número" ? "number" : f.field_type === "data" ? "date" : "text"}
                        options={f.options || undefined}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{item.notes || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10 + fields.length} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado. Clique em "Novo Ativo" para adicionar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GestaoAtivos() {
  return (
    <AppLayout>
      <PageHeader
        title="Gestão de Ativos"
        description="Inventário de hardware, senhas, telecom e licenças"
      />

      <Tabs defaultValue="hardware" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="hardware" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Laptop className="h-4 w-4" />
            <span>Hardware</span>
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Key className="h-4 w-4" />
            <span>Senhas</span>
          </TabsTrigger>
          <TabsTrigger value="telecom" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Phone className="h-4 w-4" />
            <span>Telecom</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            <span>Licenças</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hardware">
          <CategoryTab category="hardware" label="Hardware (Notebooks / Tablets / Periféricos)" />
        </TabsContent>
        <TabsContent value="passwords">
          <CategoryTab category="passwords" label="Cofre de Senhas" />
        </TabsContent>
        <TabsContent value="telecom">
          <CategoryTab category="telecom" label="Gestão de Telecom (Linhas Telefônicas)" />
        </TabsContent>
        <TabsContent value="licenses">
          <CategoryTab category="licenses" label="Licenças Microsoft" />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
