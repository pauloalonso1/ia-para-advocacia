import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Agent, useAgentDetails } from '@/hooks/useAgents';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Save, 
  Bot,
  FileText,
  Zap,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EditAgentModalProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditAgentModal = ({ agent, open, onOpenChange }: EditAgentModalProps) => {
  const {
    rules,
    steps,
    faqs,
    updateRules,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    addFaq,
    updateFaq,
    deleteFaq
  } = useAgentDetails(agent?.id || null);

  // Rules state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [agentRules, setAgentRules] = useState('');
  const [forbiddenActions, setForbiddenActions] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [savingRules, setSavingRules] = useState(false);

  // New step state
  const [newStepSituation, setNewStepSituation] = useState('');
  const [newStepMessage, setNewStepMessage] = useState('');
  const [addingStep, setAddingStep] = useState(false);

  // New FAQ state
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [addingFaq, setAddingFaq] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('rules');

  useEffect(() => {
    if (rules) {
      setSystemPrompt(rules.system_prompt || '');
      setAgentRules(rules.agent_rules || '');
      setForbiddenActions(rules.forbidden_actions || '');
      setWelcomeMessage(rules.welcome_message || '');
    } else {
      setSystemPrompt('');
      setAgentRules('');
      setForbiddenActions('');
      setWelcomeMessage('');
    }
  }, [rules]);

  const handleSaveRules = async () => {
    setSavingRules(true);
    await updateRules({
      system_prompt: systemPrompt,
      agent_rules: agentRules,
      forbidden_actions: forbiddenActions,
      welcome_message: welcomeMessage
    });
    setSavingRules(false);
  };

  const handleAddStep = async () => {
    if (!newStepMessage.trim()) return;
    setAddingStep(true);
    await addStep(newStepSituation, newStepMessage);
    setNewStepSituation('');
    setNewStepMessage('');
    setAddingStep(false);
  };

  const handleAddFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setAddingFaq(true);
    await addFaq(newFaqQuestion, newFaqAnswer);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setAddingFaq(false);
  };

  const moveStep = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      await reorderSteps(index, index - 1);
    } else if (direction === 'down' && index < steps.length - 1) {
      await reorderSteps(index, index + 1);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card/50">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">{agent.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Configure as regras, roteiro e FAQs do agente
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(90vh-100px)]">
          <div className="px-6 py-3 border-b border-border bg-card/30">
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger 
                value="rules" 
                className={cn(
                  "gap-2 rounded-lg px-4 py-2.5 transition-all",
                  "data-[state=active]:bg-primary",
                  "data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                )}
              >
                <FileText className="w-4 h-4" />
                Regras
              </TabsTrigger>
              <TabsTrigger 
                value="script" 
                className={cn(
                  "gap-2 rounded-lg px-4 py-2.5 transition-all",
                  "data-[state=active]:bg-primary",
                  "data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                )}
              >
                <Zap className="w-4 h-4" />
                Roteiro
                {steps.length > 0 && (
                  <Badge className="ml-1 bg-muted text-muted-foreground text-xs">{steps.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="faqs" 
                className={cn(
                  "gap-2 rounded-lg px-4 py-2.5 transition-all",
                  "data-[state=active]:bg-primary",
                  "data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                FAQs
                {faqs.length > 0 && (
                  <Badge className="ml-1 bg-muted text-muted-foreground text-xs">{faqs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden">
            {/* Rules Tab */}
            <TabsContent value="rules" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-6 max-w-3xl">
                  {/* System Prompt */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <Label className="text-base font-medium">Prompt do Sistema</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Define a personalidade e comportamento base do agente
                    </p>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Você é um assistente jurídico especializado em direito imobiliário. Seu objetivo é qualificar leads e agendar consultas..."
                      className="bg-muted border-border min-h-[140px] focus:border-primary/50"
                    />
                  </div>

                  {/* Agent Rules */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <Label className="text-base font-medium">Regras de Comportamento</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lista de regras que o agente deve seguir durante as conversas
                    </p>
                    <Textarea
                      value={agentRules}
                      onChange={(e) => setAgentRules(e.target.value)}
                      placeholder="1. Seja sempre cordial e profissional&#10;2. Colete nome, telefone e e-mail do cliente&#10;3. Identifique o tipo de caso jurídico&#10;4. Agende uma consulta quando apropriado"
                      className="bg-muted border-border min-h-[140px] focus:border-primary/50"
                    />
                  </div>

                  {/* Forbidden Actions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <Label className="text-base font-medium">Ações Proibidas</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O que o agente NÃO deve fazer em hipótese alguma
                    </p>
                    <Textarea
                      value={forbiddenActions}
                      onChange={(e) => setForbiddenActions(e.target.value)}
                      placeholder="- Nunca forneça aconselhamento jurídico específico&#10;- Não prometa resultados de casos&#10;- Não discuta valores de honorários sem autorização"
                      className="bg-muted border-border min-h-[120px] focus:border-primary/50"
                    />
                  </div>

                  {/* Welcome Message */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <Label className="text-base font-medium">Mensagem de Boas-vindas</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Primeira mensagem enviada ao cliente quando inicia uma conversa
                    </p>
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Olá! 👋 Sou a assistente virtual do escritório. Como posso ajudá-lo hoje?"
                      className="bg-muted border-border min-h-[100px] focus:border-primary/50"
                    />
                  </div>
                </div>
              </ScrollArea>

              {/* Save Button */}
              <div className="px-6 py-4 border-t border-border bg-card/30">
                <Button
                  onClick={handleSaveRules}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                  disabled={savingRules}
                >
                  {savingRules ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Regras
                </Button>
              </div>
            </TabsContent>

            {/* Script Tab */}
            <TabsContent value="script" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4 max-w-3xl">
                  {/* Instructions */}
                  <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground">Como funciona o roteiro?</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          O roteiro define a sequência de etapas que o agente deve seguir. 
                          Cada etapa tem uma situação (contexto) e uma mensagem padrão a enviar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Existing steps */}
                  {steps.length > 0 ? (
                    <div className="space-y-3">
                      {steps.map((step, index) => (
                        <div 
                          key={step.id} 
                          className="group flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors"
                        >
                          {/* Order controls */}
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              onClick={() => moveStep(index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">{index + 1}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              onClick={() => moveStep(index, 'down')}
                              disabled={index === steps.length - 1}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Step content */}
                          <div className="flex-1 space-y-3">
                            <Input
                              value={step.situation || ''}
                              onChange={(e) => updateStep(step.id, { situation: e.target.value })}
                              placeholder="Situação (ex: Saudação Inicial, Coleta de Nome...)"
                              className="bg-muted border-border text-sm font-medium"
                            />
                            <Textarea
                              value={step.message_to_send}
                              onChange={(e) => updateStep(step.id, { message_to_send: e.target.value })}
                              placeholder="Mensagem a enviar nesta etapa..."
                              className="bg-muted border-border min-h-[80px] text-sm"
                            />
                          </div>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStep(step.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma etapa cadastrada ainda</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Adicione etapas para criar o roteiro do agente</p>
                    </div>
                  )}

                  {/* Add new step */}
                  <div className="p-4 border-2 border-dashed border-border rounded-xl space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-foreground">Adicionar Nova Etapa</h4>
                    </div>
                    <Input
                      value={newStepSituation}
                      onChange={(e) => setNewStepSituation(e.target.value)}
                      placeholder="Situação (ex: Confirmação de Dados)"
                      className="bg-muted border-border"
                    />
                    <Textarea
                      value={newStepMessage}
                      onChange={(e) => setNewStepMessage(e.target.value)}
                      placeholder="Mensagem a enviar nesta etapa..."
                      className="bg-muted border-border min-h-[80px]"
                    />
                    <Button
                      onClick={handleAddStep}
                      className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                      disabled={addingStep || !newStepMessage.trim()}
                    >
                      {addingStep ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Adicionar Etapa
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* FAQs Tab */}
            <TabsContent value="faqs" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4 max-w-3xl">
                  {/* Instructions */}
                  <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground">Base de Conhecimento (FAQs)</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Adicione perguntas frequentes e suas respostas. O agente usará essa base para responder os clientes de forma mais precisa.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Existing FAQs */}
                  {faqs.length > 0 ? (
                    <div className="space-y-3">
                      {faqs.map((faq, index) => (
                        <div 
                          key={faq.id} 
                          className="group p-4 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-1">
                              <span className="text-purple-400 font-semibold text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Pergunta</Label>
                                <Input
                                  value={faq.question}
                                  onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                                  className="bg-muted border-border mt-1.5 font-medium"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resposta</Label>
                                <Textarea
                                  value={faq.answer}
                                  onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                                  className="bg-muted border-border mt-1.5 min-h-[80px]"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFaq(faq.id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma FAQ cadastrada ainda</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Adicione perguntas frequentes para melhorar as respostas do agente</p>
                    </div>
                  )}

                  {/* Add new FAQ */}
                  <div className="p-4 border-2 border-dashed border-border rounded-xl space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <h4 className="font-medium text-foreground">Adicionar Nova FAQ</h4>
                    </div>
                    <Input
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="Qual é a pergunta frequente?"
                      className="bg-muted border-border"
                    />
                    <Textarea
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                      placeholder="Qual a resposta para essa pergunta?"
                      className="bg-muted border-border min-h-[80px]"
                    />
                    <Button
                      onClick={handleAddFaq}
                      className="w-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                      disabled={addingFaq || !newFaqQuestion.trim() || !newFaqAnswer.trim()}
                    >
                      {addingFaq ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Adicionar FAQ
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentModal;
