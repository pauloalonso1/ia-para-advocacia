import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvolutionAPI } from '@/hooks/useEvolutionAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SettingsView = () => {
  const { user } = useAuth();
  const {
    loading,
    qrCode,
    connectionStatus,
    error,
    createInstance,
    checkStatus,
    deleteInstance
  } = useEvolutionAPI();

  const [instanceName, setInstanceName] = useState('');
  const [savedInstance, setSavedInstance] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Load saved instance from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('evolution_instance');
    if (saved) {
      setSavedInstance(saved);
      setInstanceName(saved);
    }
  }, []);

  // Poll connection status when connecting
  useEffect(() => {
    if (connectionStatus === 'connecting' && savedInstance) {
      const interval = setInterval(async () => {
        const status = await checkStatus(savedInstance);
        if (status === 'connected') {
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus, savedInstance, checkStatus]);

  const handleSaveAndConnect = async () => {
    if (!instanceName.trim()) return;

    const result = await createInstance(instanceName);
    if (result) {
      localStorage.setItem('evolution_instance', instanceName);
      setSavedInstance(instanceName);
    }
  };

  const handleCheckStatus = async () => {
    if (!savedInstance) return;
    setCheckingStatus(true);
    await checkStatus(savedInstance);
    setCheckingStatus(false);
  };

  const handleDisconnect = async () => {
    if (!savedInstance) return;
    await deleteInstance(savedInstance);
    localStorage.removeItem('evolution_instance');
    setSavedInstance(null);
    setInstanceName('');
  };

  const handleRefreshQR = async () => {
    if (!savedInstance) return;
    await createInstance(savedInstance);
  };

  return (
    <div className="p-6 space-y-6">
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

          {/* WhatsApp Integration Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    Integração WhatsApp
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Conecte seu WhatsApp Business via Evolution API
                  </CardDescription>
                </div>
                {savedInstance && (
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instance" className="text-slate-300">
                  Nome da Instância
                </Label>
                <Input
                  id="instance"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="minha-instancia"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  disabled={connectionStatus === 'connected'}
                />
                <p className="text-xs text-slate-500">
                  Um identificador único para sua conexão WhatsApp
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!savedInstance || connectionStatus === 'disconnected' ? (
                  <Button
                    onClick={handleSaveAndConnect}
                    disabled={loading || !instanceName.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar e Conectar
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleCheckStatus}
                      variant="outline"
                      disabled={checkingStatus}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {checkingStatus ? (
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
                        disabled={loading}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Novo QR Code
                      </Button>
                    )}
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      disabled={loading}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Desconectar
                    </Button>
                  </>
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
                        Sua instância "{savedInstance}" está ativa
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
                        Configure a integração WhatsApp ao lado
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-xl max-w-sm mx-auto">
                      <h4 className="font-medium text-slate-300 mb-2">Como conectar:</h4>
                      <ol className="text-sm text-slate-400 text-left space-y-1">
                        <li>1. Digite um nome para a instância</li>
                        <li>2. Clique em "Salvar e Conectar"</li>
                        <li>3. Escaneie o QR Code com seu WhatsApp</li>
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
