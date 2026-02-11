import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, Plus, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Appointment {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  notes: string | null;
}

interface AppointmentManagerProps {
  caseId: string;
}

const AppointmentManager = ({ caseId }: AppointmentManagerProps) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Consulta');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [caseId]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('case_appointments')
      .select('*')
      .eq('case_id', caseId)
      .order('scheduled_at', { ascending: true });
    setAppointments((data as Appointment[]) || []);
  };

  const addAppointment = async () => {
    if (!user || !date || !time || !title.trim()) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      await supabase.from('case_appointments').insert({
        case_id: caseId,
        user_id: user.id,
        title: title.trim(),
        scheduled_at: scheduledAt,
        duration_minutes: duration,
      } as any);
      await fetchAppointments();
      setOpen(false);
      setTitle('Consulta');
      setDate('');
      setTime('');
    } finally {
      setSaving(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    await supabase.from('case_appointments').delete().eq('id', id);
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const now = new Date();
  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= now);
  const past = appointments.filter(a => new Date(a.scheduled_at) < now);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        Agendamentos
      </Label>

      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          {upcoming.map(apt => (
            <div key={apt.id} className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20 group">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{apt.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {' · '}{apt.duration_minutes}min
                </p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteAppointment(apt.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-1">
          {past.slice(-2).map(apt => (
            <div key={apt.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg opacity-60 group">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{apt.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteAppointment(apt.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start text-muted-foreground">
            <Plus className="w-3 h-3 mr-1.5" />
            Novo agendamento
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 space-y-3" align="start">
          <div className="space-y-1.5">
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Duração (min)</Label>
            <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="h-8 text-xs" min={15} max={240} step={15} />
          </div>
          <Button size="sm" className="w-full h-8 text-xs" onClick={addAppointment} disabled={saving || !date || !time || !title.trim()}>
            <Plus className="w-3 h-3 mr-1" />
            Agendar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AppointmentManager;
