import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { useEvolutionSettings } from '@/hooks/useEvolutionSettings';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  Trash2,
  Save,
  User,
  Mail,
  Bell,
  BellRing,
  Phone,
  Link,
  Key,
  Globe,
  Cog,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SettingsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    loading: evolutionLoading,
    qrCode,
    connectionStatus,
    error: evolutionError,
    createInstance,
    checkStatus,
    deleteInstance,
    setConnectionStatus
  } = useEvolutionAPI();

  const {
    settings: evolutionSettings,
    loading: settingsLoading,
    saving: savingSettings,
    saveSettings,
    updateConnectionStatus,
    deleteSettings
  } = useEvolutionSettings();

  const {
    settings: notificationSettings,
    saving: savingNotifications,
    saveSettings: saveNotificationSettings,
    deleteSettings: deleteNotificationSettings
  } = useNotificationSettings();

  // Evolution API form state
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [integrationType, setIntegrationType] = useState('WHATSAPP-BAILEYS');
  const [qrcodeEnabled, setQrcodeEnabled] = useState(true);
  const [rejectCall, setRejectCall] = useState(false);
  const [msgCall, setMsgCall] = useState('');
  const [groupsIgnore, setGroupsIgnore] = useState(true);
  const [alwaysOnline, setAlwaysOnline] = useState(false);
  const [readMessages, setReadMessages] = useState(false);
  const [readStatus, setReadStatus] = useState(false);
  const [syncFullHistory, setSyncFullHistory] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Notification form state
  const [notificationPhone, setNotificationPhone] = useState('');
  const [notifyNewLead, setNotifyNewLead] = useState(true);
  const [notifyQualifiedLead, setNotifyQualifiedLead] = useState(true);
  const [notifyMeetingScheduled, setNotifyMeetingScheduled] = useState(true);
  const [notifyContractSent, setNotifyContractSent] = useState(true);
  const [notifyContractSigned, setNotifyContractSigned] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Webhook URL
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  // Load Evolution API settings
  useEffect(() => {
    if (evolutionSettings) {
      setApiUrl(evolutionSettings.api_url || '');
      setApiKey(evolutionSettings.api_key || '');
      setInstanceName(evolutionSettings.instance_name || '');
      setIntegrationType(evolutionSettings.integration_type || 'WHATSAPP-BAILEYS');
      setQrcodeEnabled(evolutionSettings.qrcode_enabled);
      setRejectCall(evolutionSettings.reject_call);
      setMsgCall(evolutionSettings.msg_call || '');
      setGroupsIgnore(evolutionSettings.groups_ignore);
      setAlwaysOnline(evolutionSettings.always_online);
      setReadMessages(evolutionSettings.read_messages);
      setReadStatus(evolutionSettings.read_status);
      setSyncFullHistory(evolutionSettings.sync_full_history);
      
      if (evolutionSettings.is_connected) {
        setConnectionStatus('connected');
      }
    }
  }, [evolutionSettings, setConnectionStatus]);

  // Load notification settings
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

  // Poll connection status when connecting
  useEffect(() => {
    if (connectionStatus === 'connecting' && instanceName) {
      const interval = setInterval(async () => {
        const status = await checkStatus(instanceName);
        if (status === 'connected') {
          clearInterval(interval);
          await updateConnectionStatus(true);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus, instanceName, checkStatus, updateConnectionStatus]);

  const handleSaveAndConnect = async () => {
    if (!apiUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha a URL da API, API Key e Nome da Instância',
        variant: 'destructive'
      });
      return;
    }

    // First save settings to database
    const saved = await saveSettings({
      api_url: apiUrl.trim(),
      api_key: apiKey.trim(),
      instance_name: instanceName.trim(),
      webhook_url: webhookUrl,
      integration_type: integrationType,
      qrcode_enabled: qrcodeEnabled,
      reject_call: rejectCall,
      msg_call: msgCall,
      groups_ignore: groupsIgnore,
      always_online: alwaysOnline,
      read_messages: readMessages,
      read_status: readStatus,
      sync_full_history: syncFullHistory,
    });

    if (saved) {
      // Then create instance via Evolution API
      await createInstance(instanceName);
    }
  };

  const handleSaveSettings = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha a URL da API e API Key',
        variant: 'destructive'
      });
      return;
    }

    await saveSettings({
      api_url: apiUrl.trim(),
      api_key: apiKey.trim(),
      instance_name: instanceName.trim() || undefined,
      webhook_url: webhookUrl,
      integration_type: integrationType,
      qrcode_enabled: qrcodeEnabled,
      reject_call: rejectCall,
      msg_call: msgCall,
      groups_ignore: groupsIgnore,
      always_online: alwaysOnline,
      read_messages: readMessages,
      read_status: readStatus,
      sync_full_history: syncFullHistory,
    });
  };

  const handleCheckStatus = async () => {
    if (!instanceName) return;
    const status = await checkStatus(instanceName);
    if (status === 'connected') {
      await updateConnectionStatus(true);
    } else if (status === 'disconnected') {
      await updateConnectionStatus(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceName) return;
    await deleteInstance(instanceName);
    await updateConnectionStatus(false);
  };

  const handleDeleteSettings = async () => {
    if (instanceName) {
      await deleteInstance(instanceName);
    }
    await deleteSettings();
    setApiUrl('');
    setApiKey('');
    setInstanceName('');
    setConnectionStatus('disconnected');
  };

  const handleRefreshQR = async () => {
    if (!instanceName) return;
    await createInstance(instanceName);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast({
      title: 'Copiado!',
      description: 'URL do Webhook copiada para a área de transferência'
    });
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

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

  if (settingsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Configurações
        </h1>
        <p className="text-slate-400 mt-1">
          Configure sua conta e integrações
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Settings Form */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Perfil
              </CardTitle>
              <CardDescription className="text-slate-400">
                Informações da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-white">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evolution API Configuration Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    Evolution API
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Configure sua conexão com a Evolution API
                  </CardDescription>
                </div>
                {evolutionSettings && (
                  <Badge
                    className={cn(
                      "ml-auto",
                      connectionStatus === 'connected'
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : connectionStatus === 'connecting'
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}
                  >
                    {connectionStatus === 'connected' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {connectionStatus === 'connecting' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {connectionStatus === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
                    {connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando' : 'Desconectado'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connection" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                  <TabsTrigger value="connection" className="data-[state=active]:bg-emerald-500">
                    <Link className="w-4 h-4 mr-2" />
                    Conexão
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="data-[state=active]:bg-emerald-500">
                    <Cog className="w-4 h-4 mr-2" />
                    Avançado
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="connection" className="space-y-4 mt-4">
                  {/* API URL */}
                  <div className="space-y-2">
                    <Label htmlFor="api-url" className="text-slate-300 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      URL da API *
                    </Label>
                    <Input
                      id="api-url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.seuservidor.com"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <p className="text-xs text-slate-500">
                      URL do seu servidor Evolution API
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key" className="text-slate-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Key *
                    </Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Sua chave de autenticação"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-white"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Chave de autenticação da Evolution API
                    </p>
                  </div>

                  {/* Instance Name */}
                  <div className="space-y-2">
                    <Label htmlFor="instance" className="text-slate-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Nome da Instância *
                    </Label>
                    <Input
                      id="instance"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="minha-instancia"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      disabled={connectionStatus === 'connected'}
                    />
                    <p className="text-xs text-slate-500">
                      Identificador único (apenas letras minúsculas, números e hífens)
                    </p>
                  </div>

                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      URL do Webhook
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="bg-slate-700/50 border-slate-600 text-slate-300 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={handleCopyWebhook}
                      >
                        {copiedWebhook ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Configure este webhook na sua instância Evolution API
                    </p>
                  </div>

                  {evolutionError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{evolutionError}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  {/* Integration Type */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Tipo de Integração</Label>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-white">{integrationType}</span>
                    </div>
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">QR Code Habilitado</Label>
                        <p className="text-xs text-slate-500">Gerar QR Code ao conectar</p>
                      </div>
                      <Switch
                        checked={qrcodeEnabled}
                        onCheckedChange={setQrcodeEnabled}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Rejeitar Chamadas</Label>
                        <p className="text-xs text-slate-500">Rejeitar chamadas automaticamente</p>
                      </div>
                      <Switch
                        checked={rejectCall}
                        onCheckedChange={setRejectCall}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    {rejectCall && (
                      <div className="space-y-2 pl-4 border-l-2 border-slate-600">
                        <Label className="text-slate-400 text-sm">Mensagem ao rejeitar</Label>
                        <Input
                          value={msgCall}
                          onChange={(e) => setMsgCall(e.target.value)}
                          placeholder="Não posso atender no momento..."
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Ignorar Grupos</Label>
                        <p className="text-xs text-slate-500">Não processar mensagens de grupos</p>
                      </div>
                      <Switch
                        checked={groupsIgnore}
                        onCheckedChange={setGroupsIgnore}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Sempre Online</Label>
                        <p className="text-xs text-slate-500">Manter status online</p>
                      </div>
                      <Switch
                        checked={alwaysOnline}
                        onCheckedChange={setAlwaysOnline}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Marcar Mensagens como Lidas</Label>
                        <p className="text-xs text-slate-500">Marcar automaticamente ao receber</p>
                      </div>
                      <Switch
                        checked={readMessages}
                        onCheckedChange={setReadMessages}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Ler Status</Label>
                        <p className="text-xs text-slate-500">Visualizar status automaticamente</p>
                      </div>
                      <Switch
                        checked={readStatus}
                        onCheckedChange={setReadStatus}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Sincronizar Histórico Completo</Label>
                        <p className="text-xs text-slate-500">Sincronizar todas as conversas anteriores</p>
                      </div>
                      <Switch
                        checked={syncFullHistory}
                        onCheckedChange={setSyncFullHistory}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700 mt-4">
                {!evolutionSettings || connectionStatus === 'disconnected' ? (
                  <>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings || !apiUrl.trim() || !apiKey.trim()}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Configurações
                    </Button>
                    <Button
                      onClick={handleSaveAndConnect}
                      disabled={evolutionLoading || savingSettings || !apiUrl.trim() || !apiKey.trim() || !instanceName.trim()}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      {evolutionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4 mr-2" />
                      )}
                      Salvar e Conectar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                    <Button
                      onClick={handleCheckStatus}
                      variant="outline"
                      disabled={evolutionLoading}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {evolutionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Verificar Status
                    </Button>
                    {connectionStatus === 'connecting' && (
                      <Button
                        onClick={handleRefreshQR}
                        variant="outline"
                        disabled={evolutionLoading}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Novo QR Code
                      </Button>
                    )}
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      disabled={evolutionLoading}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <WifiOff className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  </>
                )}
                {evolutionSettings && (
                  <Button
                    onClick={handleDeleteSettings}
                    variant="outline"
                    disabled={savingSettings}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-amber-400" />
                    Notificações WhatsApp
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Receba alertas sobre seus leads no seu celular pessoal
                  </CardDescription>
                </div>
                {notificationSettings && (
                  <Badge className={cn(
                    notificationSettings.is_enabled 
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  )}>
                    {notificationSettings.is_enabled ? (
                      <>
                        <Bell className="w-3 h-3 mr-1" />
                        Ativas
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Pausadas
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notification-phone" className="text-slate-300">
                  Número para Notificações
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="notification-phone"
                    value={notificationPhone}
                    onChange={(e) => setNotificationPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Número com código do país (ex: 5511999999999)
                </p>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <Label className="text-slate-300 font-medium">Ativar Notificações</Label>
                  </div>
                </div>

                {notificationsEnabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-600 ml-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Novo Lead</Label>
                      <Switch
                        checked={notifyNewLead}
                        onCheckedChange={setNotifyNewLead}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Lead Qualificado</Label>
                      <Switch
                        checked={notifyQualifiedLead}
                        onCheckedChange={setNotifyQualifiedLead}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Reunião Agendada</Label>
                      <Switch
                        checked={notifyMeetingScheduled}
                        onCheckedChange={setNotifyMeetingScheduled}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Contrato Enviado</Label>
                      <Switch
                        checked={notifyContractSent}
                        onCheckedChange={setNotifyContractSent}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Contrato Assinado</Label>
                      <Switch
                        checked={notifyContractSigned}
                        onCheckedChange={setNotifyContractSigned}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifications || !notificationPhone.trim()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {savingNotifications ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Notificações
                </Button>
                {notificationSettings && (
                  <Button
                    onClick={handleDisableNotifications}
                    variant="outline"
                    disabled={savingNotifications}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Desativar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - QR Code */}
        <div>
          <Card className="bg-slate-800/50 border-slate-700 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                Conexão WhatsApp
              </CardTitle>
              <CardDescription className="text-slate-400">
                Escaneie o QR Code com seu WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                {connectionStatus === 'connected' ? (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Wifi className="w-12 h-12 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">WhatsApp Conectado!</h3>
                      <p className="text-slate-400 mt-1">
                        Sua instância "{instanceName}" está ativa
                      </p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Online e pronto para receber mensagens
                    </Badge>
                  </div>
                ) : qrCode ? (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-4 rounded-xl inline-block">
                      {qrCode.startsWith('data:image') ? (
                        <img 
                          src={qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64"
                        />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded">
                          <p className="text-slate-600 text-xs text-center p-4 break-all">
                            {qrCode}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Escaneie o QR Code</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aguardando conexão...
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                      <WifiOff className="w-12 h-12 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-300">Nenhuma conexão ativa</h3>
                      <p className="text-slate-500 mt-1">
                        Configure a Evolution API ao lado para conectar
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-xl max-w-sm mx-auto">
                      <h4 className="font-medium text-slate-300 mb-2">Como conectar:</h4>
                      <ol className="text-sm text-slate-400 text-left space-y-1">
                        <li>1. Preencha a URL da API e API Key</li>
                        <li>2. Digite um nome para a instância</li>
                        <li>3. Clique em "Salvar e Conectar"</li>
                        <li>4. Escaneie o QR Code com seu WhatsApp</li>
                        <li>5. Configure o Webhook na Evolution API</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
