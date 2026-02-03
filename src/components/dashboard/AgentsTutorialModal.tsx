import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  MessageSquare, 
  Settings2, 
  FileText, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentsTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tutorialSteps = [
  {
    icon: Bot,
    title: 'Crie seu Agente',
    description: 'Comece escolhendo um template pronto para sua área de atuação ou crie do zero. O agente será seu assistente virtual para atender clientes no WhatsApp.',
    tip: 'Dica: Use templates prontos para começar mais rápido!'
  },
  {
    icon: Settings2,
    title: 'Configure as Regras',
    description: 'Defina o prompt do sistema, mensagem de boas-vindas e regras de comportamento. Essas configurações determinam como seu agente vai interagir com os clientes.',
    tip: 'Dica: Seja específico nas instruções para melhores respostas.'
  },
  {
    icon: FileText,
    title: 'Adicione FAQs',
    description: 'Cadastre perguntas e respostas frequentes para que o agente responda automaticamente. Quanto mais FAQs, mais completo será o atendimento.',
    tip: 'Dica: Inclua variações de perguntas similares.'
  },
  {
    icon: MessageSquare,
    title: 'Defina o Roteiro',
    description: 'Crie um script de vendas com etapas sequenciais. O agente seguirá esse roteiro durante as conversas, guiando o cliente pelo funil.',
    tip: 'Dica: Teste o roteiro com casos reais antes de ativar.'
  },
  {
    icon: CheckCircle2,
    title: 'Ative e Monitore',
    description: 'Ative o agente e defina-o como padrão para novas conversas. Acompanhe as interações na aba "Conversas" e ajuste conforme necessário.',
    tip: 'Dica: Revise conversas regularmente para melhorar o agente.'
  }
];

const AgentsTutorialModal = ({ open, onOpenChange }: AgentsTutorialModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCurrentStep(0);
  };

  const step = tutorialSteps[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Tutorial de Agentes
            </span>
          </div>
          <DialogTitle className="text-xl text-foreground">
            Como criar um Agente IA
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Siga estes passos para configurar seu agente de atendimento automático
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicators */}
        <div className="flex gap-2 my-4">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                index === currentStep 
                  ? "bg-primary" 
                  : index < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
              <StepIcon className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Passo {currentStep + 1} de {tutorialSteps.length}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Tip box */}
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              {step.tip}
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              Pular tutorial
            </Button>
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90"
            >
              {currentStep === tutorialSteps.length - 1 ? (
                <>
                  Começar
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentsTutorialModal;
