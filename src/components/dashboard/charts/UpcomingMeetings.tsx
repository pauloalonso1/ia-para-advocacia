import { Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Meeting {
  id: string;
  title: string;
  date: Date;
  time: string;
  attendee: string;
}

interface UpcomingMeetingsProps {
  meetings?: Meeting[];
}

const UpcomingMeetings = ({ meetings = [] }: UpcomingMeetingsProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Próximas Reuniões</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80"
          onClick={() => navigate('/dashboard?tab=meetings')}
        >
          Ver todas
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
      
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] text-primary uppercase font-medium">
                {meeting.date.toLocaleDateString('pt-BR', { month: 'short' })}
              </span>
              <span className="text-sm font-bold text-primary">
                {meeting.date.getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {meeting.time}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {meeting.attendee}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {meetings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma reunião agendada
          </p>
        )}
      </div>
    </div>
  );
};

export default UpcomingMeetings;
