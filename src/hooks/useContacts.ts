import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ContactInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  source?: string;
  tags?: string[];
}

export const useContacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data as Contact[]) || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os contatos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Create contact
  const createContact = useCallback(async (input: ContactInput) => {
    if (!user) return null;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          phone: input.phone.replace(/\D/g, ''),
          email: input.email?.trim() || null,
          company: input.company?.trim() || null,
          notes: input.notes?.trim() || null,
          source: input.source || 'manual',
          tags: input.tags || null
        })
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => [data as Contact, ...prev]);
      toast({
        title: 'Contato criado',
        description: `${input.name} foi adicionado com sucesso`
      });

      return data as Contact;
    } catch (err) {
      console.error('Error creating contact:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o contato',
        variant: 'destructive'
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  // Update contact
  const updateContact = useCallback(async (id: string, input: Partial<ContactInput>) => {
    if (!user) return null;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.phone !== undefined) updateData.phone = input.phone.replace(/\D/g, '');
      if (input.email !== undefined) updateData.email = input.email?.trim() || null;
      if (input.company !== undefined) updateData.company = input.company?.trim() || null;
      if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;
      if (input.source !== undefined) updateData.source = input.source;
      if (input.tags !== undefined) updateData.tags = input.tags;

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => prev.map(c => c.id === id ? data as Contact : c));
      toast({
        title: 'Contato atualizado',
        description: 'As alterações foram salvas'
      });

      return data as Contact;
    } catch (err) {
      console.error('Error updating contact:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o contato',
        variant: 'destructive'
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  // Delete contact
  const deleteContact = useCallback(async (id: string) => {
    if (!user) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setContacts(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Contato removido',
        description: 'O contato foi excluído com sucesso'
      });

      return true;
    } catch (err) {
      console.error('Error deleting contact:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o contato',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  // Search contacts
  const searchContacts = useCallback((query: string) => {
    if (!query.trim()) return contacts;

    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.phone.includes(query.replace(/\D/g, '')) ||
      contact.email?.toLowerCase().includes(lowerQuery) ||
      contact.company?.toLowerCase().includes(lowerQuery)
    );
  }, [contacts]);

  return {
    contacts,
    loading,
    saving,
    createContact,
    updateContact,
    deleteContact,
    searchContacts,
    refetch: fetchContacts
  };
};
