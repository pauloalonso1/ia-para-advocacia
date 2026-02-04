import { useState, useEffect } from 'react';
import { useScheduleSettings } from '@/hooks/useScheduleSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Loader2,
  Save,
  RotateCcw,
  Coffee,
  CalendarClock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}:00`,
}));

const DURATIONS = [
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h 30min' },
  { value: '120', label: '2 horas' },
];

const WEEKDAYS = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

const ScheduleSettings = () => {
  const { effectiveSettings, loading, saving, saveSettings, resetToDefaults } = useScheduleSettings();

  // Local state for form
  const [workStartHour, setWorkStartHour] = useState(9);
  const [workEndHour, setWorkEndHour] = useState(18);
  const [lunchEnabled, setLunchEnabled] = useState(false);
  const [lunchStartHour, setLunchStartHour] = useState(12);
  const [lunchEndHour, setLunchEndHour] = useState(14);
  const [appointmentDuration, setAppointmentDuration] = useState(60);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Sync local state with loaded settings
  useEffect(() => {
    if (effectiveSettings) {
      setWorkStartHour(effectiveSettings.work_start_hour);
      setWorkEndHour(effectiveSettings.work_end_hour);
      setLunchEnabled(effectiveSettings.lunch_start_hour !== null);
      setLunchStartHour(effectiveSettings.lunch_start_hour ?? 12);
      setLunchEndHour(effectiveSettings.lunch_end_hour ?? 14);
      setAppointmentDuration(effectiveSettings.appointment_duration_minutes);
      setWorkDays(effectiveSettings.work_days);
    }
  }, [effectiveSettings]);

  const handleSave = async () => {
    await saveSettings({
      work_start_hour: workStartHour,
      work_end_hour: workEndHour,
      lunch_start_hour: lunchEnabled ? lunchStartHour : null,
      lunch_end_hour: lunchEnabled ? lunchEndHour : null,
      appointment_duration_minutes: appointmentDuration,
      work_days: workDays,
    });
  };

  const handleReset = async () => {
    await resetToDefaults();
  };

  const toggleWorkDay = (day: number) => {
    if (workDays.includes(day)) {
      setWorkDays(workDays.filter(d => d !== day));
    } else {
      setWorkDays([...workDays, day].sort());
    }
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
              <CalendarClock className="w-5 h-5 text-orange-500" />
              Horário Comercial
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Configure seus horários de atendimento para agendamentos automáticos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Work Days */}
        <div className="space-y-3">
          <Label className="text-foreground text-sm font-medium">
            Dias de Atendimento
          </Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWorkDay(day.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  workDays.includes(day.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title={day.fullLabel}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione os dias em que você aceita agendamentos
          </p>
        </div>

        {/* Work Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Início do Expediente
            </Label>
            <Select
              value={workStartHour.toString()}
              onValueChange={(v) => setWorkStartHour(parseInt(v))}
            >
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.filter(h => parseInt(h.value) < workEndHour).map(hour => (
                  <SelectItem key={hour.value} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fim do Expediente
            </Label>
            <Select
              value={workEndHour.toString()}
              onValueChange={(v) => setWorkEndHour(parseInt(v))}
            >
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.filter(h => parseInt(h.value) > workStartHour).map(hour => (
                  <SelectItem key={hour.value} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lunch Break */}
        <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-500" />
              <Label className="text-foreground font-medium">
                Intervalo de Almoço
              </Label>
            </div>
            <Switch
              checked={lunchEnabled}
              onCheckedChange={setLunchEnabled}
            />
          </div>
          
          {lunchEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Início</Label>
                <Select
                  value={lunchStartHour.toString()}
                  onValueChange={(v) => setLunchStartHour(parseInt(v))}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.filter(h => {
                      const hour = parseInt(h.value);
                      return hour >= workStartHour && hour < lunchEndHour && hour < workEndHour;
                    }).map(hour => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm">Fim</Label>
                <Select
                  value={lunchEndHour.toString()}
                  onValueChange={(v) => setLunchEndHour(parseInt(v))}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.filter(h => {
                      const hour = parseInt(h.value);
                      return hour > lunchStartHour && hour <= workEndHour;
                    }).map(hour => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {lunchEnabled 
              ? "Horários de almoço serão bloqueados automaticamente"
              : "Ative para bloquear horários de almoço"}
          </p>
        </div>

        {/* Appointment Duration */}
        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Duração da Consulta
          </Label>
          <Select
            value={appointmentDuration.toString()}
            onValueChange={(v) => setAppointmentDuration(parseInt(v))}
          >
            <SelectTrigger className="bg-muted border-border text-foreground w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map(duration => (
                <SelectItem key={duration.value} value={duration.value}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tempo padrão de cada agendamento
          </p>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {workDays.length} dias/semana
          </Badge>
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {workStartHour.toString().padStart(2, '0')}:00 - {workEndHour.toString().padStart(2, '0')}:00
          </Badge>
          {lunchEnabled && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30">
              Almoço: {lunchStartHour.toString().padStart(2, '0')}:00 - {lunchEndHour.toString().padStart(2, '0')}:00
            </Badge>
          )}
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {appointmentDuration} min/consulta
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground flex-1 sm:flex-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleSettings;
