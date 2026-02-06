import { useState, useEffect } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  CalendarDays,
  Mail,
  Link2,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GoogleCalendarSettings = () => {
  const {
    isConnected,
    loading,
    saving,
    events,
    availableSlots,
    calendarEmail,
    calendarId,
    saveCalendarId,
    listEvents,
    getAvailableSlots,
    disconnect,
  } = useGoogleCalendar();

  const [loadingEvents, setLoadingEvents] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [calendarIdInput, setCalendarIdInput] = useState('');

  // Load events when connected
  useEffect(() => {
    if (isConnected && events.length === 0) {
      loadEventsAndSlots();
    }
  }, [isConnected]);

  const loadEventsAndSlots = async () => {
    setLoadingEvents(true);
    await Promise.all([listEvents(), getAvailableSlots()]);
    setLoadingEvents(false);
  };

  const handleSaveCalendar = async () => {
    if (!emailInput.trim() || !calendarIdInput.trim()) return;
    await saveCalendarId(emailInput.trim(), calendarIdInput.trim());
  };

  const formatEventTime = (event: any) => {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!start) return '';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    if (event.start?.date) {
      return format(startDate, "dd 'de' MMMM", { locale: ptBR });
    }
    const timeRange = endDate
      ? `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
      : format(startDate, 'HH:mm');
    return `${format(startDate, "dd/MM")} ${timeRange}`;
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
              <Calendar className="w-5 h-5 text-blue-500" />
              Google Calendar
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Vincule seu calendário para agendamento automático
            </CardDescription>
          </div>
          <Badge
            className={cn(
              isConnected
                ? "bg-green-500/20 text-green-500 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Vinculado
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Desvinculado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Calendário vinculado</p>
                  {calendarEmail && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {calendarEmail}
                    </p>
                  )}
                  {calendarId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> {calendarId}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadEventsAndSlots} disabled={loadingEvents} className="border-border">
                  {loadingEvents ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => disconnect()} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  Desvincular
                </Button>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Próximos eventos
              </h4>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : events.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {events.slice(0, 10).map((event) => (
                      <div key={event.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{event.summary || 'Sem título'}</p>
                          <p className="text-xs text-muted-foreground">{formatEventTime(event)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum evento nos próximos 7 dias</p>
                </div>
              )}
            </div>

            {/* Available Slots */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários disponíveis
              </h4>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.slice(0, 8).map((slot, idx) => (
                    <Badge key={idx} variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {format(new Date(slot.start), "dd/MM HH:mm", { locale: ptBR })}
                    </Badge>
                  ))}
                  {availableSlots.length > 8 && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      +{availableSlots.length - 8} mais
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum horário disponível</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-calendar-email" className="text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </Label>
                <Input
                  id="settings-calendar-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-calendar-id" className="text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> ID da Agenda
                </Label>
                <Input
                  id="settings-calendar-id"
                  value={calendarIdInput}
                  onChange={(e) => setCalendarIdInput(e.target.value)}
                  placeholder="exemplo@group.calendar.google.com"
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Google Calendar → Configurações da agenda → ID da agenda
                </p>
              </div>
              <Button
                onClick={handleSaveCalendar}
                disabled={saving || !emailInput.trim() || !calendarIdInput.trim()}
                className="w-full bg-primary text-primary-foreground"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4 mr-2" />
                    Vincular Agenda
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center p-4">
                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Horários Livres</p>
                <p className="text-xs text-muted-foreground">Verifica automaticamente sua disponibilidade</p>
              </div>
              <div className="text-center p-4">
                <CalendarDays className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Agendamento</p>
                <p className="text-xs text-muted-foreground">Cria eventos direto no seu calendário</p>
              </div>
              <div className="text-center p-4">
                <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Confirmação</p>
                <p className="text-xs text-muted-foreground">Envia convites para os participantes</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarSettings;
