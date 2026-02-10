import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toaster } from "@/components/ui/basic-toast";

export default function ResearchApiSettings() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<"escavador" | "jusbrasil">("escavador");
  const [apiKey, setApiKey] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("research_api_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProvider(data.provider as "escavador" | "jusbrasil");
        setApiKey(data.api_key);
        setIsEnabled(data.is_enabled ?? true);
        setExistingId(data.id);
      }
    } catch (e) {
      console.error("Error loading research settings:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !apiKey.trim()) {
      toaster.create({ title: "Campo obrigatório", description: "Insira a API key.", type: "warning" });
      return;
    }
    setIsSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from("research_api_settings")
          .update({ provider, api_key: apiKey.trim(), is_enabled: isEnabled })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("research_api_settings")
          .insert({ user_id: user.id, provider, api_key: apiKey.trim(), is_enabled: isEnabled })
          .select()
          .single();
        if (error) throw error;
        setExistingId(data.id);
      }
      toaster.create({ title: "Salvo!", description: "Configurações de pesquisa atualizadas.", type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message || "Erro ao salvar.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("research_api_settings").delete().eq("id", existingId);
      if (error) throw error;
      setApiKey("");
      setExistingId(null);
      setProvider("escavador");
      setIsEnabled(true);
      toaster.create({ title: "Removido", description: "Configuração de API removida.", type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Erro", description: e.message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Pesquisa Jurisprudencial</h2>
        <p className="text-muted-foreground text-sm">Configure sua API para buscar processos e jurisprudência</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Provedor de Dados</CardTitle>
              <CardDescription>Selecione o serviço e insira sua chave de API</CardDescription>
            </div>
            {existingId && (
              <Badge variant={isEnabled ? "default" : "secondary"}>
                {isEnabled ? "Ativo" : "Inativo"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "escavador" | "jusbrasil")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="escavador">Escavador</SelectItem>
                <SelectItem value="jusbrasil">JusBrasil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>API Key *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua API key aqui"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {provider === "escavador" ? (
                <>
                  Obtenha sua API key em{" "}
                  <a href="https://api.escavador.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                    api.escavador.com <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              ) : (
                <>
                  Obtenha sua API key em{" "}
                  <a href="https://www.jusbrasil.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                    jusbrasil.com.br <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </p>
          </div>

          {existingId && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Ativar pesquisa</Label>
                <p className="text-xs text-muted-foreground">Habilita a funcionalidade de pesquisa jurisprudencial</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()} className="flex-1">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            {existingId && (
              <Button variant="outline" onClick={handleDelete} disabled={isSaving} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
