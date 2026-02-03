import { AgentTemplate, agentTemplates } from '@/data/agentTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentTemplatesProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  selectedTemplateId?: string;
}

const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    text: 'text-emerald-400',
    icon: 'bg-emerald-500/20'
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30 hover:border-pink-500/50',
    text: 'text-pink-400',
    icon: 'bg-pink-500/20'
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30 hover:border-blue-500/50',
    text: 'text-blue-400',
    icon: 'bg-blue-500/20'
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30 hover:border-red-500/50',
    text: 'text-red-400',
    icon: 'bg-red-500/20'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30 hover:border-purple-500/50',
    text: 'text-purple-400',
    icon: 'bg-purple-500/20'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30 hover:border-orange-500/50',
    text: 'text-orange-400',
    icon: 'bg-orange-500/20'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30 hover:border-cyan-500/50',
    text: 'text-cyan-400',
    icon: 'bg-cyan-500/20'
  },
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30 hover:border-teal-500/50',
    text: 'text-teal-400',
    icon: 'bg-teal-500/20'
  }
};

const AgentTemplates = ({ onSelectTemplate, selectedTemplateId }: AgentTemplatesProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Templates Prontos</h3>
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
          Com prompts profissionais
        </Badge>
      </div>
      
      <p className="text-sm text-slate-400 mb-4">
        Selecione um template para criar um agente pré-configurado com prompts otimizados para cada área jurídica.
      </p>

      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agentTemplates.map((template) => {
            const colors = colorClasses[template.color] || colorClasses.emerald;
            const isSelected = selectedTemplateId === template.id;
            
            return (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "bg-slate-800/50 border-2",
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : colors.border
                )}
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                        colors.icon
                      )}>
                        {template.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          {template.name}
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </CardTitle>
                        <Badge className={cn(
                          "mt-1 text-xs",
                          colors.bg,
                          colors.text
                        )}>
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-400 text-xs line-clamp-2">
                    {template.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-600">
                      {template.scriptSteps.length} etapas
                    </Badge>
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-600">
                      {template.faqs.length} FAQs
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgentTemplates;
