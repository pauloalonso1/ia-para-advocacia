import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Sparkles } from 'lucide-react';
import AgentTemplates from './AgentTemplates';
import { AgentTemplate } from '@/data/agentTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


const categories = [
  'Imobiliário',
  'Família',
  'Trabalhista',
  'Criminal',
  'Empresarial',
  'Tributário',
  'Consumidor',
  'Outro'
];

interface CreateAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, category: string) => Promise<any>;
}

const CreateAgentModal = ({ open, onOpenChange, onSubmit }: CreateAgentModalProps) => {
  
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');

  const handleSelectTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setCategory(template.category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create the agent
      const result = await onSubmit(name, description, category);
      
      if (result && selectedTemplate) {
        const agentId = result.id;
        
        // Create agent rules with template data
        const { error: rulesError } = await supabase
          .from('agent_rules')
          .insert({
            agent_id: agentId,
            system_prompt: selectedTemplate.systemPrompt,
            welcome_message: selectedTemplate.welcomeMessage,
            agent_rules: selectedTemplate.agentRules,
            forbidden_actions: selectedTemplate.forbiddenActions
          });

        if (rulesError) {
          console.error('Error creating rules:', rulesError);
        }

        // Create script steps
        if (selectedTemplate.scriptSteps.length > 0) {
          const stepsToInsert = selectedTemplate.scriptSteps.map((step, index) => ({
            agent_id: agentId,
            step_order: index + 1,
            situation: step.situation,
            message_to_send: step.message
          }));

          const { error: stepsError } = await supabase
            .from('agent_script_steps')
            .insert(stepsToInsert);

          if (stepsError) {
            console.error('Error creating steps:', stepsError);
          }
        }

        // Create FAQs
        if (selectedTemplate.faqs.length > 0) {
          const faqsToInsert = selectedTemplate.faqs.map(faq => ({
            agent_id: agentId,
            question: faq.question,
            answer: faq.answer
          }));

          const { error: faqsError } = await supabase
            .from('agent_faqs')
            .insert(faqsToInsert);

          if (faqsError) {
            console.error('Error creating FAQs:', faqsError);
          }
        }

        toast({
          title: 'Agente criado com sucesso!',
          description: `O agente "${name}" foi criado com todas as configurações do template.`
        });
      }
      
      if (result) {
        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar o agente.',
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setSelectedTemplate(null);
    setActiveTab('template');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Novo Agente IA
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Crie um novo agente a partir de um template ou do zero.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'template' | 'custom')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="template" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Usar Template
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" />
              Criar do Zero
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4">
            <AgentTemplates
              onSelectTemplate={handleSelectTemplate}
              selectedTemplateId={selectedTemplate?.id}
            />
            
            {selectedTemplate && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedTemplate.icon}</span>
                  <div>
                    <h4 className="font-medium text-foreground">{selectedTemplate.name}</h4>
                    <p className="text-sm text-primary">Template selecionado</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Este agente será criado com: prompt de sistema, mensagem de boas-vindas, 
                  {selectedTemplate.scriptSteps.length} etapas de roteiro e {selectedTemplate.faqs.length} perguntas frequentes.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agente de Agendamento"
                required
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-foreground hover:bg-accent focus:bg-accent">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo deste agente..."
                className="bg-muted border-border min-h-[100px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90"
            disabled={isLoading || (!name && !selectedTemplate)}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {selectedTemplate ? 'Criar com Template' : 'Criar Agente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentModal;
