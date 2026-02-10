import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ScrollText, Search, Star, Trash2, Eye, Copy, Download, Loader2, History } from "lucide-react";
import { useDocumentHistory, type DocHistoryItem } from "@/hooks/useDocumentHistory";
import { toaster } from "@/components/ui/basic-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  petition: { label: "Petição", icon: FileText, color: "bg-blue-500/10 text-blue-500" },
  contract: { label: "Contrato", icon: ScrollText, color: "bg-emerald-500/10 text-emerald-500" },
  petition_analysis: { label: "Análise Petição", icon: Search, color: "bg-amber-500/10 text-amber-500" },
  contract_analysis: { label: "Análise Contrato", icon: Search, color: "bg-purple-500/10 text-purple-500" },
};

export default function DocumentHistoryView() {
  const { documents, isLoading, fetchDocuments, toggleFavorite, deleteDocument } = useDocumentHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocHistoryItem | null>(null);

  const handleFilterChange = (type: string) => {
    setTypeFilter(type);
    fetchDocuments({
      type: type === "all" ? undefined : type,
      search: searchQuery || undefined,
      favoritesOnly,
    });
  };

  const handleSearch = () => {
    fetchDocuments({
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchQuery || undefined,
      favoritesOnly,
    });
  };

  const handleFavToggle = (val: boolean) => {
    setFavoritesOnly(val);
    fetchDocuments({
      type: typeFilter === "all" ? undefined : typeFilter,
      search: searchQuery || undefined,
      favoritesOnly: val,
    });
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toaster.create({ title: "Copiado!", type: "success" });
  };

  const downloadDocx = async (doc: DocHistoryItem) => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, convertMillimetersToTwip } = await import("docx");
    const paragraphs = doc.output_data.split("\n").map((line) => {
      const isH = line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ");
      const isBold = line.startsWith("**") && line.endsWith("**");
      const clean = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      if (!clean.trim()) return new Paragraph({ spacing: { after: 120 } });
      return new Paragraph({
        alignment: isH ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        spacing: { after: 200, line: 360 },
        children: [new TextRun({ text: isH ? clean.toUpperCase() : clean, bold: isBold || isH, font: "Times New Roman", size: 24 })],
      });
    });
    const d = new Document({
      sections: [{ properties: { page: { margin: { top: convertMillimetersToTwip(30), bottom: convertMillimetersToTwip(20), left: convertMillimetersToTwip(30), right: convertMillimetersToTwip(20) } } }, children: paragraphs }],
    });
    const blob = await Packer.toBlob(d);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || "documento"}-${format(new Date(doc.created_at), "yyyy-MM-dd")}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = {
    total: documents.length,
    petitions: documents.filter((d) => d.document_type.includes("petition")).length,
    contracts: documents.filter((d) => d.document_type.includes("contract")).length,
    favorites: documents.filter((d) => d.is_favorite).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Histórico de Documentos</h2>
        <p className="text-muted-foreground">Documentos gerados e análises anteriores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: History },
          { label: "Petições", value: stats.petitions, icon: FileText },
          { label: "Contratos", value: stats.contracts, icon: ScrollText },
          { label: "Favoritos", value: stats.favorites, icon: Star },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={typeFilter} onValueChange={handleFilterChange} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="petition">Petições</TabsTrigger>
            <TabsTrigger value="contract">Contratos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={favoritesOnly} onCheckedChange={handleFavToggle} id="fav-filter" />
          <Label htmlFor="fav-filter" className="text-sm">Favoritos</Label>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-4 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></CardContent></Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum documento no histórico</p>
            <p className="text-sm">Documentos gerados aparecerão aqui automaticamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const meta = typeLabels[doc.document_type] || typeLabels.petition;
            const Icon = meta.icon;
            return (
              <Card key={doc.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="pt-4 pb-3 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {doc.title || meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{meta.label}</Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDoc(doc)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite(doc.id, doc.is_favorite)}>
                      <Star className={`h-3.5 w-3.5 ${doc.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadDocx(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDocument(doc.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title || "Documento"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {previewDoc && (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                <ReactMarkdown>{previewDoc.output_data}</ReactMarkdown>
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => previewDoc && copyContent(previewDoc.output_data)}>
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
            <Button variant="outline" size="sm" onClick={() => previewDoc && downloadDocx(previewDoc)}>
              <Download className="h-4 w-4 mr-1" /> Word
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
