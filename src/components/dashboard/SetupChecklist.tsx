import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgents } from '@/hooks/useAgents';
import { useEvolutionSettings } from '@/hooks/useEvolutionSettings';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Bot,
  MessageSquare,
  CalendarCheck,
  Brain,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';

interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  action: string;
}

interface SetupChecklistProps {
  onNavigate: (tab: string) => void;
}

const SetupChecklist = ({ onNavigate }: SetupChecklistProps) => {
  const [dismissed, setDismissed] = useState(false);
  const { agents } = useAgents();
  const { settings: evolutionSettings } = useEvolutionSettings();
  const { isConnected: calendarConnected } = useGoogleCalendar();
  const { documents } = useKnowledgeBase();

  const steps: SetupStep[] = [
    {
      id: 'whatsapp',
      label: 'Conectar WhatsApp',
      description: 'Configure a Evolution API para receber e enviar mensagens',
      icon: MessageSquare,
      completed: !!evolutionSettings?.is_connected,
      action: 'settings',
    },
    {
      id: 'agent',
      label: 'Criar um agente de IA',
      description: 'Configure seu primeiro agente para atender leads automaticamente',
      icon: Bot,
      completed: agents.length > 0,
      action: 'agents',
    },
    {
      id: 'knowledge',
      label: 'Adicionar conhecimento',
      description: 'Envie documentos para a base RAG dos seus agentes',
      icon: Brain,
      completed: documents.length > 0,
      action: 'knowledge',
    },
    {
      id: 'calendar',
      label: 'Vincular Google Calendar',
      description: 'Permita agendamentos automáticos de reuniões',
      icon: CalendarCheck,
      completed: calendarConnected,
      action: 'meetings',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  // Auto-dismiss when all complete
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete]);

  // Check localStorage for dismissed state
  useEffect(() => {
    const wasDismissed = localStorage.getItem('setup-checklist-dismissed');
    if (wasDismissed === 'true') setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('setup-checklist-dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {allComplete ? '🎉 Tudo configurado!' : 'Configure sua plataforma'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {allComplete
                      ? 'Sua plataforma está pronta para operar.'
                      : `${completedCount} de ${steps.length} etapas concluídas`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Progress value={progress} className="h-1.5 mb-4" />

            <div className="space-y-2">
              {steps.map((step, i) => (
                <motion.button
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => !step.completed && onNavigate(step.action)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                    step.completed
                      ? 'bg-primary/5 cursor-default'
                      : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${step.completed ? 'text-primary line-through' : 'text-foreground'}`}>
                      {step.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
                  </div>
                  {!step.completed && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default SetupChecklist;
