import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Upload } from "lucide-react";
import { toaster } from "@/components/ui/basic-toast";

interface AnalysisFormProps {
  isLoading: boolean;
  onAnalyzePetition: (text: string) => void;
  onAnalyzeContract: (text: string) => void;
}

export default function AnalysisForm({ isLoading, onAnalyzePetition, onAnalyzeContract }: AnalysisFormProps) {
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzeMode, setAnalyzeMode] = useState<"petition" | "contract">("petition");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toaster.create({ title: "Arquivo muito grande", description: "O limite é de 10MB.", type: "warning" });
      return;
    }

    setUploadingFile(true);
    setUploadedFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "txt" || ext === "md") {
        setAnalyzeText(await file.text());
      } else if (ext === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
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
      toaster.create({ title: "Documento carregado!", description: `${file.name} foi processado.`, type: "success" });
    } catch (err) {
      console.error("File parse error:", err);
      toaster.create({ title: "Erro ao ler arquivo", description: "Não foi possível extrair o texto.", type: "error" });
      setUploadedFileName(null);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleAnalyze = () => {
    if (!analyzeText.trim() && !uploadedFileName) {
      toaster.create({ title: "Campo obrigatório", description: "Cole o documento ou faça upload de um arquivo.", type: "warning" });
      return;
    }
    if (analyzeMode === "petition") onAnalyzePetition(analyzeText);
    else onAnalyzeContract(analyzeText);
  };

  return (
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
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
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
          <Label>Documento {!uploadedFileName && '*'}</Label>
          <Textarea value={analyzeText} onChange={(e) => setAnalyzeText(e.target.value)} placeholder="Cole o texto do documento aqui ou faça upload acima..." rows={8} />
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</> : <><Search className="h-4 w-4 mr-2" /> Analisar Documento</>}
        </Button>
      </CardContent>
    </Card>
  );
}
