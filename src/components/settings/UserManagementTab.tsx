import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Copy, Check, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  created_at: string;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  ti: "Técnico TI",
  marketing: "Marketing",
  colaborador: "Colaborador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "destructive",
  ti: "default",
  marketing: "secondary",
  colaborador: "outline",
};

export function UserManagementTab() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("colaborador");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    // Fetch users with roles - use admin endpoint to get emails
    const { data: profiles } = await supabase.from("profiles").select("id, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles && roles) {
      const roleMap = new Map<string, string>();
      roles.forEach((r) => roleMap.set(r.user_id, r.role));

      // Try to get emails from invites (accepted ones have the user email)
      const { data: inviteData } = await supabase.from("user_invites").select("email, accepted_at");
      const acceptedEmails = new Set((inviteData || []).filter((i: any) => i.accepted_at).map((i: any) => i.email));

      const userList: UserWithRole[] = profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: "",
        role: roleMap.get(p.id) || "colaborador",
      }));
      setUsers(userList);
    }

    // Fetch invites
    const { data: inviteData } = await supabase
      .from("user_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (inviteData) {
      setInvites(inviteData as Invite[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Informe o e-mail.");
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: inserted, error } = await supabase.from("user_invites").insert({
      email: inviteEmail.toLowerCase().trim(),
      role: inviteRole as any,
      invited_by: user?.id ?? null,
    }).select();
    setSaving(false);
    console.log("Invite insert result:", { inserted, error });
    if (error || !inserted?.length) {
      if (error?.code === "23505") {
        toast.error("Este e-mail já possui um convite.");
      } else {
        toast.error(error?.message || "Erro ao criar convite. Verifique suas permissões.");
      }
      return;
    }
    toast.success("Convite criado com sucesso!");
    setInviteEmail("");
    setInviteRole("colaborador");
    setDialogOpen(false);
    fetchData();
  };

  const copyInviteLink = (email: string, id: string) => {
    const url = `${window.location.origin}/signup?email=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingInvites = invites.filter((i) => !i.accepted_at);
  const acceptedInvites = invites.filter((i) => i.accepted_at);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Apenas administradores podem gerenciar usuários.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários ({users.length})
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="ti">Técnico TI</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={saving} className="w-full">
                  {saving ? "Criando..." : "Criar Convite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nível</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[u.role] as any}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Convites Pendentes ({pendingInvites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[inv.role] as any}>
                      {ROLE_LABELS[inv.role] || inv.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copyInviteLink(inv.email, inv.id)}
                    >
                      {copiedId === inv.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copiar Link
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingInvites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum convite pendente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
