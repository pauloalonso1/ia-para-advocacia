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
import { Loader2, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    loading,
    updateRules,
    addStep,
    updateStep,
    deleteStep,
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

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar: {agent.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="bg-slate-700/50 w-full grid grid-cols-3">
            <TabsTrigger value="rules" className="data-[state=active]:bg-emerald-500">
              Regras
            </TabsTrigger>
            <TabsTrigger value="script" className="data-[state=active]:bg-emerald-500">
              Roteiro
            </TabsTrigger>
            <TabsTrigger value="faqs" className="data-[state=active]:bg-emerald-500">
              FAQs
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt do Sistema</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Você é um assistente jurídico especializado em..."
                    className="bg-slate-700/50 border-slate-600 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regras do Agente</Label>
                  <Textarea
                    value={agentRules}
                    onChange={(e) => setAgentRules(e.target.value)}
                    placeholder="1. Seja objetivo&#10;2. Mantenha tom profissional&#10;3. ..."
                    className="bg-slate-700/50 border-slate-600 min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ações Proibidas</Label>
                  <Textarea
                    value={forbiddenActions}
                    onChange={(e) => setForbiddenActions(e.target.value)}
                    placeholder="Não fornecer aconselhamento jurídico específico..."
                    className="bg-slate-700/50 border-slate-600 min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem de Boas-vindas</Label>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Olá! Sou o assistente virtual do escritório..."
                    className="bg-slate-700/50 border-slate-600 min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleSaveRules}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  disabled={savingRules}
                >
                  {savingRules ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Regras
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Script Tab */}
          <TabsContent value="script" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Existing steps */}
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-400 pt-1">
                      <GripVertical className="w-4 h-4" />
                      <span className="font-mono text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={step.situation || ''}
                        onChange={(e) => updateStep(step.id, { situation: e.target.value })}
                        placeholder="Situação (ex: Início, Coleta de E-mail)"
                        className="bg-slate-700/50 border-slate-600 text-sm"
                      />
                      <Textarea
                        value={step.message_to_send}
                        onChange={(e) => updateStep(step.id, { message_to_send: e.target.value })}
                        placeholder="Mensagem a enviar..."
                        className="bg-slate-700/50 border-slate-600 min-h-[80px] text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteStep(step.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {/* Add new step */}
                <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">Adicionar Nova Etapa</h4>
                  <Input
                    value={newStepSituation}
                    onChange={(e) => setNewStepSituation(e.target.value)}
                    placeholder="Situação (ex: Confirmação)"
                    className="bg-slate-700/50 border-slate-600"
                  />
                  <Textarea
                    value={newStepMessage}
                    onChange={(e) => setNewStepMessage(e.target.value)}
                    placeholder="Mensagem a enviar nesta etapa..."
                    className="bg-slate-700/50 border-slate-600 min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddStep}
                    className="w-full bg-slate-700 hover:bg-slate-600"
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
          <TabsContent value="faqs" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Existing FAQs */}
                {faqs.map((faq) => (
                  <div key={faq.id} className="p-4 bg-slate-700/30 rounded-lg space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs text-slate-400">Pergunta</Label>
                          <Input
                            value={faq.question}
                            onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                            className="bg-slate-700/50 border-slate-600 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400">Resposta</Label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                            className="bg-slate-700/50 border-slate-600 mt-1 min-h-[60px]"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteFaq(faq.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add new FAQ */}
                <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">Adicionar Nova FAQ</h4>
                  <Input
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    placeholder="Qual é a pergunta frequente?"
                    className="bg-slate-700/50 border-slate-600"
                  />
                  <Textarea
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Qual a resposta para essa pergunta?"
                    className="bg-slate-700/50 border-slate-600 min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddFaq}
                    className="w-full bg-slate-700 hover:bg-slate-600"
                    disabled={addingFaq || !newFaqQuestion.trim() || !newFaqAnswer.trim()}
                  >
                    {addingFaq ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Adicionar FAQ
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentModal;
