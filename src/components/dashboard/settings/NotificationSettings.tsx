import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, XCircle, Trash2, Save, Bell, BellRing, Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const NotificationSettings = () => {
  const { toast } = useToast();
  const {
    settings: notificationSettings,
    saving: savingNotifications,
    saveSettings: saveNotificationSettings,
    deleteSettings: deleteNotificationSettings,
  } = useNotificationSettings();

  const [notificationPhone, setNotificationPhone] = useState('');
  const [notifyNewLead, setNotifyNewLead] = useState(true);
  const [notifyQualifiedLead, setNotifyQualifiedLead] = useState(true);
  const [notifyMeetingScheduled, setNotifyMeetingScheduled] = useState(true);
  const [notifyContractSent, setNotifyContractSent] = useState(true);
  const [notifyContractSigned, setNotifyContractSigned] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [testingNotification, setTestingNotification] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setNotificationPhone(notificationSettings.notification_phone || '');
      setNotifyNewLead(notificationSettings.notify_new_lead);
      setNotifyQualifiedLead(notificationSettings.notify_qualified_lead);
      setNotifyMeetingScheduled(notificationSettings.notify_meeting_scheduled);
      setNotifyContractSent(notificationSettings.notify_contract_sent);
      setNotifyContractSigned(notificationSettings.notify_contract_signed);
      setNotificationsEnabled(notificationSettings.is_enabled);
    }
  }, [notificationSettings]);

  const handleSaveNotifications = async () => {
    if (!notificationPhone.trim()) return;
    await saveNotificationSettings({
      notification_phone: notificationPhone.replace(/\D/g, ''),
      is_enabled: notificationsEnabled,
      notify_new_lead: notifyNewLead,
      notify_qualified_lead: notifyQualifiedLead,
      notify_meeting_scheduled: notifyMeetingScheduled,
      notify_contract_sent: notifyContractSent,
      notify_contract_signed: notifyContractSigned,
    });
  };

  const handleDisableNotifications = async () => {
    await deleteNotificationSettings();
    setNotificationPhone('');
    setNotifyNewLead(true);
    setNotifyQualifiedLead(true);
    setNotifyMeetingScheduled(true);
    setNotifyContractSent(true);
    setNotifyContractSigned(true);
    setNotificationsEnabled(true);
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-notification');
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Erro no teste', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Teste enviado!', description: data?.message || 'Verifique seu WhatsApp.' });
      }
    } catch (error: any) {
      console.error('Test notification error:', error);
      toast({ title: 'Erro ao testar', description: error.message || 'Não foi possível enviar o teste.', variant: 'destructive' });
    } finally {
      setTestingNotification(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BellRing className="w-5 h-5 text-primary" />
              Notificações via WhatsApp
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Receba alertas no seu celular pessoal
            </CardDescription>
          </div>
          {notificationSettings && (
            <Badge className={cn(
              notificationSettings.is_enabled
                ? "bg-green-500/20 text-green-500 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}>
              {notificationSettings.is_enabled ? (
                <><Bell className="w-3 h-3 mr-1" /> Ativas</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Pausadas</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notification-phone" className="text-foreground">Número para Notificações</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="notification-phone" value={notificationPhone}
              onChange={(e) => setNotificationPhone(e.target.value)} placeholder="5511999999999"
              className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Número com código do país (ex: 5511999999999)</p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} className="data-[state=checked]:bg-primary" />
            <Label className="text-foreground font-medium">Ativar Notificações</Label>
          </div>

          {notificationsEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-border ml-2">
              {[
                { label: 'Novo Lead', checked: notifyNewLead, onChange: setNotifyNewLead },
                { label: 'Lead Qualificado', checked: notifyQualifiedLead, onChange: setNotifyQualifiedLead },
                { label: 'Reunião Agendada', checked: notifyMeetingScheduled, onChange: setNotifyMeetingScheduled },
                { label: 'Contrato Enviado', checked: notifyContractSent, onChange: setNotifyContractSent },
                { label: 'Contrato Assinado', checked: notifyContractSigned, onChange: setNotifyContractSigned },
              ].map(({ label, checked, onChange }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label className="text-muted-foreground text-sm">{label}</Label>
                  <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSaveNotifications} disabled={savingNotifications || !notificationPhone.trim()} className="bg-primary hover:bg-primary/90">
            {savingNotifications ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Notificações
          </Button>
          {notificationSettings && (
            <>
              <Button onClick={handleDisableNotifications} variant="outline" disabled={savingNotifications}
                className="border-destructive/30 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" /> Desativar
              </Button>
              <Button onClick={handleTestNotification} variant="outline"
                disabled={testingNotification || !notificationSettings.is_enabled}
                className="border-primary/30 text-primary hover:bg-primary/10">
                {testingNotification ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
                Testar Notificação
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
