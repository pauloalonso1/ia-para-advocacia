import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEvolutionAPI = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

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

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      // Extract QR code from response
      const qr = data.qrcode?.base64 || data.base64 || data.qrcode?.code;
      if (qr) {
        // If it's base64 image data, use it directly
        if (qr.startsWith('data:image')) {
          setQrCode(qr);
        } else if (qr.length > 100) {
          // It's likely base64 without prefix
          setQrCode(`data:image/png;base64,${qr}`);
        } else {
          // It's a QR code string, we'll need to display it differently
          setQrCode(qr);
        }
        setConnectionStatus('connecting');
      }

      toast({
        title: 'Instância criada',
        description: 'Escaneie o QR Code com seu WhatsApp'
      });

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

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      const qr = data.qrcode?.base64 || data.base64 || data.qrcode?.code;
      if (qr) {
        if (qr.startsWith('data:image')) {
          setQrCode(qr);
        } else if (qr.length > 100) {
          setQrCode(`data:image/png;base64,${qr}`);
        } else {
          setQrCode(qr);
        }
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
        description: 'A conexão WhatsApp foi desconectada'
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
    deleteInstance,
    setQrCode,
    setConnectionStatus
  };
};
