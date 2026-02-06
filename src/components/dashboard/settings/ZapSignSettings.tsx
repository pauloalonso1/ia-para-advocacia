import { useState, useEffect } from 'react';
import { useZapSignSettings } from '@/hooks/useZapSignSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileSignature,
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

const ZapSignSettings = () => {
  const { settings, loading, saving, saveSettings, deleteSettings } = useZapSignSettings();

  const [apiToken, setApiToken] = useState('');
  const [sandboxMode, setSandboxMode] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiToken(settings.api_token || '');
      setSandboxMode(settings.sandbox_mode);
      setIsEnabled(settings.is_enabled);
    }
  }, [settings]);

  const handleSave = () => {
    if (!apiToken.trim()) return;
    saveSettings({
      api_token: apiToken.trim(),
      sandbox_mode: sandboxMode,
      is_enabled: isEnabled,
    });
  };

  const handleDelete = () => {
    deleteSettings();
    setApiToken('');
    setSandboxMode(false);
    setIsEnabled(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              ZapSign
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Integração para envio de documentos com assinatura digital
            </CardDescription>
          </div>
          {settings && (
            <Badge
              className={cn(
                settings.is_enabled
                  ? "bg-green-500/20 text-green-500 border-green-500/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {settings.is_enabled ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ativa
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Inativa
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zapsign-token" className="text-foreground flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Token *
          </Label>
          <div className="relative">
            <Input
              id="zapsign-token"
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Seu token de API da ZapSign"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Encontre seu token em{' '}
            <a
              href="https://app.zapsign.com.br/conta/integracoes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              ZapSign → Integrações
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Modo Sandbox</Label>
              <p className="text-xs text-muted-foreground">Usar ambiente de testes da ZapSign</p>
            </div>
            <Switch
              checked={sandboxMode}
              onCheckedChange={setSandboxMode}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Integração Ativa</Label>
              <p className="text-xs text-muted-foreground">Habilitar envio de documentos via ZapSign</p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !apiToken.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
          {settings && (
            <Button
              onClick={handleDelete}
              variant="outline"
              disabled={saving}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ZapSignSettings;
