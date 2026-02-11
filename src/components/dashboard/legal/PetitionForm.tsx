import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, BookOpen, Save } from "lucide-react";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import { toaster } from "@/components/ui/basic-toast";

const petitionTypes = [
  "Petição Inicial", "Contestação", "Réplica", "Recurso de Apelação",
  "Agravo de Instrumento", "Embargos de Declaração", "Mandado de Segurança",
  "Habeas Corpus", "Ação de Indenização", "Ação de Despejo",
  "Ação Trabalhista", "Ação de Divórcio", "Ação de Alimentos",
];

interface PetitionFormProps {
  isLoading: boolean;
  templates: Array<{ id: string; title: string; content: string }>;
  activeMembers: Array<{ id: string; name: string; oab_number: string | null; email: string; phone: string | null }>;
  onGenerate: (data: any) => void;
  onSaveTemplate: (name: string, content: string) => void;
  onOpenTemplatesModal: () => void;
}

export default function PetitionForm({ isLoading, templates, activeMembers, onGenerate, onSaveTemplate, onOpenTemplatesModal }: PetitionFormProps) {
  const [petType, setPetType] = useState("");
  const [petCourt, setPetCourt] = useState("");
  const [petPlaintiff, setPetPlaintiff] = useState("");
  const [petDefendant, setPetDefendant] = useState("");
  const [petFacts, setPetFacts] = useState("");
  const [petLegal, setPetLegal] = useState("");
  const [petRequests, setPetRequests] = useState("");
  const [petModelText, setPetModelText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");

  const handleSelectTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setPetModelText(tpl.content);
      setSelectedTemplateId(id);
      toaster.create({ title: `Modelo "${tpl.title}" selecionado`, type: "success" });
    }
  };

  const handleGenerate = () => {
    if (!petType || !petFacts) {
      toaster.create({ title: "Campos obrigatórios", description: "Selecione o tipo e preencha os fatos.", type: "warning" });
      return;
    }
    const selectedLawyer = activeMembers.find(m => m.id === selectedLawyerId);
    const lawyerInfo = selectedLawyer ? {
      name: selectedLawyer.name,
      oab: selectedLawyer.oab_number || undefined,
      email: selectedLawyer.email,
      phone: selectedLawyer.phone || undefined,
    } : undefined;

    onGenerate({
      type: petType, court: petCourt,
      parties: { plaintiff: petPlaintiff, defendant: petDefendant },
      facts: petFacts, referenceModel: petModelText || undefined,
      legalBasis: petLegal, requests: petRequests, lawyer: lawyerInfo,
    });
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim() || !petModelText.trim()) {
      toaster.create({ title: "Preencha o nome e o texto do modelo", type: "warning" });
      return;
    }
    onSaveTemplate(saveTemplateName.trim(), petModelText.trim());
    setSaveTemplateName("");
    setShowSaveModal(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gerar Petição</CardTitle>
        <CardDescription>Preencha os dados para gerar uma petição profissional</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de Petição *</Label>
          <Select value={petType} onValueChange={setPetType}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              {petitionTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Juízo/Tribunal</Label>
          <Input value={petCourt} onChange={(e) => setPetCourt(e.target.value)} placeholder="Ex: Vara Cível da Comarca de São Paulo" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label>Requerente</Label>
            <InfoTooltip content="Informe a qualificação completa: nome, nacionalidade, estado civil, profissão, CPF/CNPJ e endereço." />
          </div>
          <Textarea value={petPlaintiff} onChange={(e) => setPetPlaintiff(e.target.value)} placeholder="Qualificação completa do requerente" rows={3} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Label>Requerido</Label>
            <InfoTooltip content="Informe a qualificação completa: nome/razão social, nacionalidade, estado civil (se pessoa física), profissão, CPF/CNPJ e endereço." />
          </div>
          <Textarea value={petDefendant} onChange={(e) => setPetDefendant(e.target.value)} placeholder="Qualificação completa do requerido" rows={3} />
        </div>
        <div>
          <Label>Fatos *</Label>
          <Textarea value={petFacts} onChange={(e) => setPetFacts(e.target.value)} placeholder="Descreva os fatos do caso..." rows={4} />
        </div>
        <div>
          <Label>Fundamento Jurídico</Label>
          <Textarea value={petLegal} onChange={(e) => setPetLegal(e.target.value)} placeholder="Base legal (opcional)" rows={2} />
        </div>
        <div>
          <Label>Pedidos</Label>
          <Textarea value={petRequests} onChange={(e) => setPetRequests(e.target.value)} placeholder="O que se pede ao juízo (opcional)" rows={2} />
        </div>

        {/* Instructions section */}
        <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Instruções de Petição</Label>
            <InfoTooltip content="Escreva instruções específicas para a IA seguir ao gerar a petição (estilo, tom, estrutura, formato, etc)." />
          </div>

          {templates.length > 0 && (
            <Select
              value={selectedTemplateId || ""}
              onValueChange={(val) => {
                if (val === "__none__") { setSelectedTemplateId(null); setPetModelText(""); }
                else handleSelectTemplate(val);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar modelo salvo..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum modelo</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Textarea
            value={petModelText}
            onChange={(e) => { setPetModelText(e.target.value); setSelectedTemplateId(null); }}
            placeholder="Cole aqui instruções para a IA (opcional)"
            rows={4}
          />

          <div className="flex gap-2">
            {petModelText.trim() && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowSaveModal(true)}>
                <Save className="h-3.5 w-3.5 mr-1" /> Salvar como Modelo
              </Button>
            )}
            {templates.length > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onOpenTemplatesModal}>
                <BookOpen className="h-3.5 w-3.5 mr-1" /> Gerenciar Instruções
              </Button>
            )}
          </div>
        </div>

        {/* Lawyer selector */}
        {activeMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Label>Advogado Responsável</Label>
              <InfoTooltip content="Selecione um advogado da equipe para preencher automaticamente o nome, OAB, e-mail e telefone no encerramento da petição." />
            </div>
            <Select value={selectedLawyerId} onValueChange={setSelectedLawyerId}>
              <SelectTrigger><SelectValue placeholder="Selecionar advogado (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (preencher manualmente)</SelectItem>
                {activeMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}{m.oab_number ? ` — OAB ${m.oab_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><FileText className="h-4 w-4 mr-2" /> Gerar Petição</>}
        </Button>

        {/* Save Template inline dialog */}
        {showSaveModal && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <Label>Nome do Modelo *</Label>
            <Input value={saveTemplateName} onChange={(e) => setSaveTemplateName(e.target.value)} placeholder="Ex: Petição Inicial - Consumidor" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveTemplate}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
