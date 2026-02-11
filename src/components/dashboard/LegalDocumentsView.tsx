import { useState } from "react";
import { AILoader } from "@/components/ui/ai-loader";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ScrollText, Loader2, Copy, Download, Search, FileDown, Upload, BookOpen, Plus, Trash2, Eye, Save, Pencil } from "lucide-react";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLegalDocuments } from "@/hooks/useLegalDocuments";
import { usePetitionTemplates } from "@/hooks/usePetitionTemplates";
import { toaster } from "@/components/ui/basic-toast";

const petitionTypes = [
  "Petição Inicial",
  "Contestação",
  "Réplica",
  "Recurso de Apelação",
  "Agravo de Instrumento",
  "Embargos de Declaração",
  "Mandado de Segurança",
  "Habeas Corpus",
  "Ação de Indenização",
  "Ação de Despejo",
  "Ação Trabalhista",
  "Ação de Divórcio",
  "Ação de Alimentos",
];

const contractTypes = [
  "Prestação de Serviços",
  "Honorários Advocatícios",
  "Compra e Venda",
  "Locação",
  "Parceria",
  "Confidencialidade (NDA)",
  "Trabalho",
  "Contrato Social",
];

export default function LegalDocumentsView() {
  const { isLoading, result, setResult, generatePetition, analyzePetition, generateContract, analyzeContract } = useLegalDocuments();
  const { templates, saveTemplate, deleteTemplate, updateTemplate } = usePetitionTemplates();

  // Petition form
  const [petType, setPetType] = useState("");
  const [petCourt, setPetCourt] = useState("");
  const [petPlaintiff, setPetPlaintiff] = useState("");
  const [petDefendant, setPetDefendant] = useState("");
  const [petFacts, setPetFacts] = useState("");
  const [petLegal, setPetLegal] = useState("");
  const [petRequests, setPetRequests] = useState("");
  const [petModelText, setPetModelText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Template modals
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ title: string; content: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; title: string; content: string } | null>(null);

  // Contract form
  const [conType, setConType] = useState("");
  const [conParties, setConParties] = useState("");
  const [conClauses, setConClauses] = useState("");
  const [conValue, setConValue] = useState("");
  const [conDuration, setConDuration] = useState("");

  // Analysis
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzeMode, setAnalyzeMode] = useState<"petition" | "contract">("petition");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toaster.create({ title: "Arquivo muito grande", description: "O limite é de 10MB.", type: "warning" });
      return;
    }

    setUploadingFile(true);
    setUploadedFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "txt" || ext === "md") {
        const text = await file.text();
        setAnalyzeText(text);
      } else if (ext === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }
        setAnalyzeText(fullText.trim());
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer });
        setAnalyzeText(result.value);
      } else {
        toaster.create({ title: "Formato não suportado", description: "Use PDF, DOCX ou TXT.", type: "warning" });
        setUploadedFileName(null);
        return;
      }

      toaster.create({ title: "Documento carregado!", description: `${file.name} foi processado com sucesso.`, type: "success" });
    } catch (err) {
      console.error("File parse error:", err);
      toaster.create({ title: "Erro ao ler arquivo", description: "Não foi possível extrair o texto do documento.", type: "error" });
      setUploadedFileName(null);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleGeneratePetition = () => {
    if (!petType || !petFacts) {
      toaster.create({ title: "Campos obrigatórios", description: "Selecione o tipo e preencha os fatos.", type: "warning" });
      return;
    }
    generatePetition({
      type: petType,
      court: petCourt,
      parties: {
        plaintiff: petPlaintiff,
        defendant: petDefendant,
      },
      facts: petFacts,
      referenceModel: petModelText || undefined,
      legalBasis: petLegal,
      requests: petRequests,
    });
  };

  const handleSelectTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setPetModelText(tpl.content);
      setSelectedTemplateId(id);
      setShowTemplatesModal(false);
      toaster.create({ title: `Modelo "${tpl.title}" selecionado`, type: "success" });
    }
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim() || !petModelText.trim()) {
      toaster.create({ title: "Preencha o nome e o texto do modelo", type: "warning" });
      return;
    }
    saveTemplate(saveTemplateName.trim(), petModelText.trim());
    setSaveTemplateName("");
    setShowSaveTemplateModal(false);
  };

  const handleGenerateContract = () => {
    if (!conType) {
      toaster.create({ title: "Campo obrigatório", description: "Selecione o tipo de contrato.", type: "warning" });
      return;
    }
    generateContract({ type: conType, partiesInfo: conParties, clauses: conClauses, value: conValue, duration: conDuration });
  };

  const handleAnalyze = () => {
    if (!analyzeText.trim()) {
      toaster.create({ title: "Campo obrigatório", description: "Cole o documento para análise.", type: "warning" });
      return;
    }
    if (analyzeMode === "petition") analyzePetition(analyzeText);
    else analyzeContract(analyzeText);
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toaster.create({ title: "Copiado!", description: "Documento copiado para a área de transferência.", type: "success" });
    }
  };

  const downloadAsDocx = async () => {
    if (!result) return;
    const { Document, Packer, Paragraph, TextRun, AlignmentType, convertMillimetersToTwip } = await import("docx");
    const paragraphs = result.split("\n").map((line) => {
      const isH1 = line.startsWith("# ");
      const isH2 = line.startsWith("## ");
      const isH3 = line.startsWith("### ");
      const isHeading = isH1 || isH2 || isH3;
      const isBold = line.startsWith("**") && line.endsWith("**");
      const cleanLine = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      if (!cleanLine.trim()) return new Paragraph({ spacing: { after: 120 } });
      return new Paragraph({
        alignment: isHeading ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 },
        children: [
          new TextRun({
            text: isHeading ? cleanLine.toUpperCase() : cleanLine,
            bold: isBold || isHeading,
            font: "Times New Roman",
            size: isH1 ? 28 : isH2 ? 26 : isH3 ? 24 : 24,
          }),
        ],
      });
    });
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(30),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
            },
          },
        },
        children: paragraphs,
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `documento-juridico-${date}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toaster.create({ title: "Download concluído!", description: "Documento Word gerado com sucesso.", type: "success" });
  };

  const downloadAsPdf = async () => {
    if (!result) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.style.fontFamily = "'Times New Roman', serif";
    container.style.fontSize = "12pt";
    container.style.lineHeight = "1.8";
    container.style.padding = "0";
    container.style.color = "#000";
    container.innerHTML = result
      .replace(/^### (.*$)/gm, '<h3 style="font-size:13pt;font-weight:bold;margin:16px 0 8px;page-break-after:avoid;">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="font-size:14pt;font-weight:bold;text-align:center;margin:20px 0 10px;page-break-after:avoid;">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="font-size:16pt;font-weight:bold;text-align:center;margin:24px 0 12px;page-break-after:avoid;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, '</p><p style="margin:0 0 10px;text-align:justify;page-break-inside:avoid;">')
      .replace(/\n/g, "<br>");
    container.innerHTML = '<p style="margin:0 0 10px;text-align:justify;">' + container.innerHTML + '</p>';
    const date = new Date().toISOString().slice(0, 10);
    html2pdf().set({
      margin: [25, 20, 20, 25],
      filename: `documento-juridico-${date}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { format: "a4", orientation: "portrait" },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['h1', 'h2', 'h3', 'strong', 'tr'] },
    } as any).from(container).save();
    toaster.create({ title: "Download concluído!", description: "PDF gerado com sucesso.", type: "success" });
  };

  return (
    <>
      {isLoading && <AILoader />}
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Documentos Jurídicos
        </h2>
        <p className="text-muted-foreground">Gere e analise petições e contratos com IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <Tabs defaultValue="petition" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="petition" className="gap-1.5">
                <FileText className="h-4 w-4" /> Petição
              </TabsTrigger>
              <TabsTrigger value="contract" className="gap-1.5">
                <ScrollText className="h-4 w-4" /> Contrato
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-1.5">
                <Search className="h-4 w-4" /> Analisar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="petition">
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
                      <InfoTooltip content="Informe a qualificação completa: nome, nacionalidade, estado civil, profissão, CPF/CNPJ e endereço. Ex: João da Silva, brasileiro, solteiro, empresário, CPF 000.000.000-00, residente na Rua X, nº 10, Bairro Y, CEP 00000-000, Cidade/UF." />
                    </div>
                    <Textarea value={petPlaintiff} onChange={(e) => setPetPlaintiff(e.target.value)} placeholder="Qualificação completa do requerente" rows={3} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Label>Requerido</Label>
                      <InfoTooltip content="Informe a qualificação completa: nome/razão social, nacionalidade, estado civil (se pessoa física), profissão, CPF/CNPJ e endereço. Para pessoa jurídica, inclua razão social, CNPJ e sede." />
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

                  {/* Petition Model / Template */}
                  <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Instruções de Petição</Label>
                      <InfoTooltip content="Escreva instruções específicas para a IA seguir ao gerar a petição (estilo, tom, estrutura, formato, etc). Estas instruções NÃO aparecerão no documento final." />
                    </div>

                    {/* Template selector */}
                    {templates.length > 0 && (
                      <div>
                        <Select
                          value={selectedTemplateId || ""}
                          onValueChange={(val) => {
                            if (val === "__none__") {
                              setSelectedTemplateId(null);
                              setPetModelText("");
                            } else {
                              handleSelectTemplate(val);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar modelo salvo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum modelo</SelectItem>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Textarea
                      value={petModelText}
                      onChange={(e) => { setPetModelText(e.target.value); setSelectedTemplateId(null); }}
                      placeholder="Cole aqui instruções para a IA (ex: estilo, estrutura, tom, formato desejado) ou um modelo de petição como referência (opcional)"
                      rows={4}
                    />

                    <div className="flex gap-2">
                      {petModelText.trim() && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowSaveTemplateModal(true)}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Salvar como Modelo
                        </Button>
                      )}
                      {templates.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTemplatesModal(true)}>
                          <BookOpen className="h-3.5 w-3.5 mr-1" /> Gerenciar Instruções
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleGeneratePetition} disabled={isLoading} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><FileText className="h-4 w-4 mr-2" /> Gerar Petição</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contract">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gerar Contrato</CardTitle>
                  <CardDescription>Preencha os dados para gerar um contrato profissional</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tipo de Contrato *</Label>
                    <Select value={conType} onValueChange={setConType}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {contractTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Partes Envolvidas</Label>
                    <Textarea value={conParties} onChange={(e) => setConParties(e.target.value)} placeholder="Descreva as partes..." rows={2} />
                  </div>
                  <div>
                    <Label>Cláusulas Específicas</Label>
                    <Textarea value={conClauses} onChange={(e) => setConClauses(e.target.value)} placeholder="Cláusulas que deseja incluir (opcional)" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor</Label>
                      <Input value={conValue} onChange={(e) => setConValue(e.target.value)} placeholder="Ex: R$ 5.000,00" />
                    </div>
                    <div>
                      <Label>Duração</Label>
                      <Input value={conDuration} onChange={(e) => setConDuration(e.target.value)} placeholder="Ex: 12 meses" />
                    </div>
                  </div>
                  <Button onClick={handleGenerateContract} disabled={isLoading} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><ScrollText className="h-4 w-4 mr-2" /> Gerar Contrato</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analyze">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analisar Documento</CardTitle>
                  <CardDescription>Cole um documento para análise detalhada pela IA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tipo de Documento</Label>
                    <Select value={analyzeMode} onValueChange={(v) => setAnalyzeMode(v as "petition" | "contract")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petition">Petição</SelectItem>
                        <SelectItem value="contract">Contrato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Upload de Documento</Label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                      {uploadingFile ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="text-sm">Processando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-6 w-6" />
                          <span className="text-sm font-medium">{uploadedFileName || "Clique para enviar"}</span>
                          <span className="text-xs">PDF, DOCX ou TXT (máx. 10MB)</span>
                        </div>
                      )}
                    </label>
                  </div>
                  <div>
                    <Label>Documento *</Label>
                    <Textarea value={analyzeText} onChange={(e) => setAnalyzeText(e.target.value)} placeholder="Cole o texto do documento aqui ou faça upload acima..." rows={8} />
                  </div>
                  <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</> : <><Search className="h-4 w-4 mr-2" /> Analisar Documento</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Result */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Resultado</CardTitle>
              {result && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyResult}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileDown className="h-4 w-4 mr-1" /> Baixar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={downloadAsDocx}>
                        <Download className="h-4 w-4 mr-2" /> Word (.docx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadAsPdf}>
                        <Download className="h-4 w-4 mr-2" /> PDF (.pdf)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Processando com IA...</p>
                <p className="text-sm">Isso pode levar alguns segundos</p>
              </div>
            ) : result ? (
              <div className="prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[70vh] p-4">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>O resultado aparecerá aqui</p>
                <p className="text-sm">Preencha o formulário e clique em gerar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Template Modal */}
      <Dialog open={showSaveTemplateModal} onOpenChange={setShowSaveTemplateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como Modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do Modelo *</Label>
              <Input value={saveTemplateName} onChange={(e) => setSaveTemplateName(e.target.value)} placeholder="Ex: Petição Inicial - Consumidor" />
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 max-h-32 overflow-auto">
              {petModelText.slice(0, 300)}{petModelText.length > 300 ? "..." : ""}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Library Modal */}
      <Dialog open={showTemplatesModal} onOpenChange={setShowTemplatesModal}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-6 w-6 text-primary" /> Instruções de Petição
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-base">Nenhuma instrução salva ainda</p>
                <p className="text-sm mt-1">Salve instruções para reutilizar em futuras petições</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-start gap-4 p-4 rounded-xl border hover:border-primary/40 transition-colors bg-card">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewTemplate({ title: tpl.title, content: tpl.content })}>
                      <p className="font-semibold text-base truncate">{tpl.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tpl.content.slice(0, 120)}...</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Button variant="default" size="sm" className="h-9 px-4 text-sm" onClick={() => handleSelectTemplate(tpl.id)}>
                        Usar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        title="Editar"
                        onClick={() => setEditingTemplate({ id: tpl.id, title: tpl.title, content: tpl.content })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir instrução?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate(tpl.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Editar Instrução
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={editingTemplate?.title || ""}
                onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Nome da instrução"
              />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea
                value={editingTemplate?.content || ""}
                onChange={(e) => setEditingTemplate((prev) => prev ? { ...prev, content: e.target.value } : null)}
                rows={8}
                placeholder="Instruções para a IA..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!editingTemplate || !editingTemplate.title.trim() || !editingTemplate.content.trim()) return;
                await updateTemplate(editingTemplate.id, editingTemplate.title.trim(), editingTemplate.content.trim());
                setEditingTemplate(null);
              }}
            >
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="whitespace-pre-wrap text-sm p-4">{previewTemplate?.content}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
