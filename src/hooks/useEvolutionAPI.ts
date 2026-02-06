import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEvolutionAPI = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const extractQrCode = (data: any): string | null => {
    // Try multiple possible paths for QR code in the response
    const qr = data.qrcode?.base64 || 
               data.base64 || 
               data.qrcode?.code ||
               data.qr?.base64 ||
               data.code;
    
    if (!qr) return null;
    
    // If it's base64 image data, use it directly
    if (typeof qr === 'string') {
      if (qr.startsWith('data:image')) {
        return qr;
      } else if (qr.length > 100) {
        // It's likely base64 without prefix
        return `data:image/png;base64,${qr}`;
      }
    }
    return qr;
  };

  const createInstance = useCallback(async (instanceName: string) => {
    setLoading(true);
    setError(null);
    setQrCode(null);
    setConnectionStatus('connecting');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'create', instanceName }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // Check if already connected
      if (data.state === 'connected' || data.instance?.state === 'open') {
        setConnectionStatus('connected');
        toast({
          title: 'WhatsApp Conectado',
          description: 'Sua instância já está conectada!'
        });
        return data;
      }

      if (data.error && !data.qrcode && !data.base64 && !data.code) {
        throw new Error(data.hint || data.details || data.error);
      }

      // Extract QR code from response
      const qr = extractQrCode(data);
      if (qr) {
        setQrCode(qr);
        setConnectionStatus('connecting');
        toast({
          title: 'QR Code gerado',
          description: 'Escaneie o QR Code com seu WhatsApp'
        });
      } else {
        // No QR code but also no error - might be connecting
        setConnectionStatus('connecting');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar instância';
      setError(message);
      setConnectionStatus('disconnected');
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getQRCode = useCallback(async (instanceName: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'qrcode', instanceName }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // Check if it's an error response with specific code
      if (data.code === 'INSTANCE_NOT_FOUND') {
        throw new Error(data.details || 'Instância não encontrada. Clique em "Salvar e Conectar" para criar.');
      }

      if (data.error && !data.qrcode && !data.base64 && !data.code) {
        throw new Error(data.details || data.error);
      }

      const qr = extractQrCode(data);
      if (qr) {
        setQrCode(qr);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao obter QR Code';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkStatus = useCallback(async (instanceName: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'status', instanceName }
      });

      if (fnError) {
        // If 404, instance doesn't exist
        console.log('Status check error:', fnError);
        setConnectionStatus('disconnected');
        return 'disconnected';
      }

      // Check if instance was not found
      if (data.code === 'INSTANCE_NOT_FOUND') {
        setConnectionStatus('disconnected');
        return 'disconnected';
      }

      const state = data.state || data.instance?.state;
      
      if (state === 'open' || state === 'connected') {
        setConnectionStatus('connected');
        setQrCode(null);
        return 'connected';
      } else if (state === 'connecting' || state === 'qrcode') {
        setConnectionStatus('connecting');
        return 'connecting';
      } else {
        setConnectionStatus('disconnected');
        return 'disconnected';
      }
    } catch (err) {
      console.error('Status check error:', err);
      setConnectionStatus('disconnected');
      return 'disconnected';
    }
  }, []);

  const logoutInstance = useCallback(async (instanceName: string) => {
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'logout', instanceName }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      setQrCode(null);
      setConnectionStatus('disconnected');

      toast({
        title: 'WhatsApp desconectado',
        description: 'A sessão foi encerrada. A instância ainda existe na Evolution API.'
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desconectar';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteInstance = useCallback(async (instanceName: string) => {
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'delete', instanceName }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      setQrCode(null);
      setConnectionStatus('disconnected');

      toast({
        title: 'Instância removida',
        description: 'A conexão WhatsApp foi excluída permanentemente'
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover instância';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    qrCode,
    connectionStatus,
    error,
    createInstance,
    getQRCode,
    checkStatus,
    logoutInstance,
    deleteInstance,
    setQrCode,
    setConnectionStatus
  };
};
