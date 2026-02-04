import { useState, useEffect } from 'react';
import { useFollowupSettings } from '@/hooks/useFollowupSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  RefreshCw,
  Clock,
  MessageSquare,
  Save,
  Trash2,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FollowupSettings = () => {
  const { settings, loading, saving, saveSettings, deleteSettings } = useFollowupSettings();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [inactivityHours, setInactivityHours] = useState(24);
  const [maxFollowups, setMaxFollowups] = useState(3);
  const [message1, setMessage1] = useState('Olá! 👋 Notei que você não respondeu minha última mensagem. Posso te ajudar em algo?');
  const [message2, setMessage2] = useState('Oi! Ainda estou por aqui caso precise de ajuda. 😊');
  const [message3, setMessage3] = useState('Olá! Essa será minha última tentativa de contato. Caso precise, é só me chamar!');
  const [respectBusinessHours, setRespectBusinessHours] = useState(true);

  // Load settings
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.is_enabled);
      setInactivityHours(settings.inactivity_hours);
      setMaxFollowups(settings.max_followups);
      setMessage1(settings.followup_message_1 || '');
      setMessage2(settings.followup_message_2 || '');
      setMessage3(settings.followup_message_3 || '');
      setRespectBusinessHours(settings.respect_business_hours);
    }
  }, [settings]);

  const handleSave = async () => {
    await saveSettings({
      is_enabled: isEnabled,
      inactivity_hours: inactivityHours,
      max_followups: maxFollowups,
      followup_message_1: message1,
      followup_message_2: message2,
      followup_message_3: message3,
      respect_business_hours: respectBusinessHours
    });
  };

  const handleDelete = async () => {
    await deleteSettings();
    // Reset to defaults
    setIsEnabled(false);
    setInactivityHours(24);
    setMaxFollowups(3);
    setMessage1('Olá! 👋 Notei que você não respondeu minha última mensagem. Posso te ajudar em algo?');
    setMessage2('Oi! Ainda estou por aqui caso precise de ajuda. 😊');
    setMessage3('Olá! Essa será minha última tentativa de contato. Caso precise, é só me chamar!');
    setRespectBusinessHours(true);
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              Follow-up Automático
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Envie mensagens automáticas para leads que não respondem
            </CardDescription>
          </div>
          <Badge
            className={cn(
              isEnabled
                ? "bg-green-500/20 text-green-500 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {isEnabled ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isEnabled ? "bg-green-500/20" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-5 h-5",
                isEnabled ? "text-green-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <Label className="text-foreground font-medium">Ativar Follow-up Automático</Label>
              <p className="text-sm text-muted-foreground">
                Envia mensagens automáticas para leads inativos
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {/* Inactivity Time */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground">Tempo de Inatividade</Label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Enviar follow-up após
              </span>
              <Badge variant="outline" className="text-primary border-primary/30">
                {inactivityHours} {inactivityHours === 1 ? 'hora' : 'horas'}
              </Badge>
            </div>
            <Slider
              value={[inactivityHours]}
              onValueChange={(value) => setInactivityHours(value[0])}
              min={1}
              max={72}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hora</span>
              <span>24 horas</span>
              <span>72 horas</span>
            </div>
          </div>
        </div>

        {/* Max Follow-ups */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <Label className="text-foreground">Número Máximo de Follow-ups</Label>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <Button
                key={num}
                type="button"
                variant={maxFollowups === num ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  maxFollowups === num 
                    ? "bg-primary text-primary-foreground" 
                    : "border-border text-muted-foreground"
                )}
                onClick={() => setMaxFollowups(num)}
              >
                {num} {num === 1 ? 'mensagem' : 'mensagens'}
              </Button>
            ))}
          </div>
        </div>

        {/* Follow-up Messages */}
        <div className="space-y-4">
          <Label className="text-foreground">Mensagens de Follow-up</Label>
          
          {/* Message 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                1º Follow-up
              </Badge>
              <span className="text-xs text-muted-foreground">
                Após {inactivityHours}h de inatividade
              </span>
            </div>
            <Textarea
              value={message1}
              onChange={(e) => setMessage1(e.target.value)}
              placeholder="Digite a primeira mensagem de follow-up..."
              className="bg-muted border-border text-foreground min-h-[80px]"
            />
          </div>

          {/* Message 2 */}
          {maxFollowups >= 2 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-xs">
                  2º Follow-up
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Após mais {inactivityHours}h
                </span>
              </div>
              <Textarea
                value={message2}
                onChange={(e) => setMessage2(e.target.value)}
                placeholder="Digite a segunda mensagem de follow-up..."
                className="bg-muted border-border text-foreground min-h-[80px]"
              />
            </div>
          )}

          {/* Message 3 */}
          {maxFollowups >= 3 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-xs">
                  3º Follow-up (Último)
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Após mais {inactivityHours}h
                </span>
              </div>
              <Textarea
                value={message3}
                onChange={(e) => setMessage3(e.target.value)}
                placeholder="Digite a terceira mensagem de follow-up..."
                className="bg-muted border-border text-foreground min-h-[80px]"
              />
            </div>
          )}
        </div>

        {/* Respect Business Hours */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label className="text-foreground font-medium">Respeitar Horário Comercial</Label>
              <p className="text-sm text-muted-foreground">
                Enviar apenas durante o expediente configurado
              </p>
            </div>
          </div>
          <Switch
            checked={respectBusinessHours}
            onCheckedChange={setRespectBusinessHours}
          />
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-500/90">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-500/80">
                <li>O sistema verifica leads inativos a cada hora</li>
                <li>Se a última mensagem foi do agente/usuário e não houve resposta do lead</li>
                <li>Após o tempo de inatividade, a mensagem de follow-up é enviada</li>
                <li>O lead não receberá mais follow-ups após responder ou atingir o limite</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
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

export default FollowupSettings;
