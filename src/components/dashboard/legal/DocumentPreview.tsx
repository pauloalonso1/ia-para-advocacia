import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Download, FileDown, FileText, Loader2 } from "lucide-react";
import { toaster } from "@/components/ui/basic-toast";

interface DocumentPreviewProps {
  result: string | null;
  isLoading: boolean;
}

export default function DocumentPreview({ result, isLoading }: DocumentPreviewProps) {
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
              top: convertMillimetersToTwip(30), bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30), right: convertMillimetersToTwip(20),
            },
          },
        },
        children: paragraphs,
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documento-juridico-${new Date().toISOString().slice(0, 10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toaster.create({ title: "Download concluído!", description: "Documento Word gerado.", type: "success" });
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
    html2pdf().set({
      margin: [25, 20, 20, 25],
      filename: `documento-juridico-${new Date().toISOString().slice(0, 10)}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { format: "a4", orientation: "portrait" },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['h1', 'h2', 'h3', 'strong', 'tr'] },
    } as any).from(container).save();
    toaster.create({ title: "Download concluído!", description: "PDF gerado.", type: "success" });
  };

  return (
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
  );
}
