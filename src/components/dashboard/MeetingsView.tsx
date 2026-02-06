import { useState, useEffect } from 'react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Clock,
  CalendarDays,
  Video,
  User,
  CalendarCheck,
  Mail,
  Link2,
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MeetingsView = () => {
  const {
    isConnected,
    loading,
    events,
    availableSlots,
    calendarEmail,
    calendarId,
    getOAuthUrl,
    handleOAuthCallback,
    listEvents,
    getAvailableSlots,
    disconnect,
    checkStatus,
  } = useGoogleCalendar();

  const [loadingEvents, setLoadingEvents] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  // Handle OAuth callback from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const calendarCallback = params.get('calendar_callback');

    if (code && calendarCallback === 'true') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      handleOAuthCallback(code).then(() => {
        checkStatus();
      });
    }
  }, []);

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

  const handleConnectGoogle = async () => {
    setConnectingOAuth(true);
    const url = await getOAuthUrl();
    if (url) {
      window.location.href = url;
    }
    setConnectingOAuth(false);
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
    return timeRange;
  };

  const formatEventDate = (event: any) => {
    const start = event.start?.dateTime || event.start?.date;
    if (!start) return '';
    const date = new Date(start);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const groupedEvents = events.reduce((acc: Record<string, any[]>, event) => {
    const dateKey = formatEventDate(event);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            Reuniões
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas reuniões e agendamentos do Google Calendar
          </p>
        </div>
        {isConnected && (
          <Button
            variant="outline"
            onClick={loadEventsAndSlots}
            disabled={loadingEvents}
            className="border-border"
          >
            {loadingEvents ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
        )}
      </div>

      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main - Upcoming Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{events.length}</p>
                    <p className="text-xs text-muted-foreground">Próximos eventos</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{availableSlots.length}</p>
                    <p className="text-xs text-muted-foreground">Horários livres</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {events.filter(e => isToday(new Date(e.start?.dateTime || e.start?.date || ''))).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Hoje</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Events List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Próximas Reuniões
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Suas reuniões dos próximos 7 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : Object.keys(groupedEvents).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
                      <div key={dateLabel}>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {dateLabel}
                        </h4>
                        <div className="space-y-2">
                          {dateEvents.map((event: any) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <div className="w-12 h-12 rounded-lg bg-primary/15 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] text-primary uppercase font-medium">
                                  {format(new Date(event.start?.dateTime || event.start?.date || ''), 'MMM', { locale: ptBR })}
                                </span>
                                <span className="text-sm font-bold text-primary">
                                  {format(new Date(event.start?.dateTime || event.start?.date || ''), 'dd')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {event.summary || 'Sem título'}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatEventTime(event)}
                                  </span>
                                  {event.attendees && event.attendees.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {event.attendees.length} participante(s)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {event.hangoutLink && (
                                <a href={event.hangoutLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/30">
                                    <Video className="w-3 h-3 mr-1" />
                                    Meet
                                  </Badge>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma reunião agendada</p>
                    <p className="text-sm mt-1">Suas próximas reuniões aparecerão aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Info */}
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Google Calendar</p>
                    <p className="text-xs text-green-500">Vinculado</p>
                  </div>
                </div>
                {calendarEmail && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    {calendarEmail}
                  </div>
                )}
                {calendarId && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 break-all">
                    <Link2 className="w-3 h-3 shrink-0" />
                    {calendarId}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect()}
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Desvincular
                </Button>
              </CardContent>
            </Card>

            {/* Available Slots */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Horários Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.slice(0, 12).map((slot, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 text-xs"
                      >
                        {format(new Date(slot.start), "dd/MM HH:mm", { locale: ptBR })}
                      </Badge>
                    ))}
                    {availableSlots.length > 12 && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                        +{availableSlots.length - 12} mais
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum horário disponível
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Disconnected - OAuth Connect */
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Conecte seu Google Calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Google para que o agente IA possa gerenciar seus agendamentos automaticamente.
                </p>
              </div>

              <Button
                onClick={handleConnectGoogle}
                disabled={connectingOAuth}
                className="w-full bg-primary text-primary-foreground h-12 text-base"
              >
                {connectingOAuth ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5 mr-2" />
                    Conectar com Google
                  </>
                )}
              </Button>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
                <div className="text-center p-3">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">Horários Livres</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Verifica disponibilidade</p>
                </div>
                <div className="text-center p-3">
                  <CalendarDays className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">Agendamento</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Cria eventos automáticos</p>
                </div>
                <div className="text-center p-3">
                  <Video className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">Google Meet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Links automáticos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MeetingsView;
