import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Copy, FileText, ExternalLink, Loader2, Scale } from "lucide-react";
import { useResearch } from "@/hooks/useResearch";
import { toaster } from "@/components/ui/basic-toast";

const tribunais = [
  { value: "", label: "Todos os Tribunais" },
  { value: "STF", label: "STF" },
  { value: "STJ", label: "STJ" },
  { value: "TST", label: "TST" },
  { value: "TJSP", label: "TJSP" },
  { value: "TJRJ", label: "TJRJ" },
  { value: "TJMG", label: "TJMG" },
  { value: "TJRS", label: "TJRS" },
  { value: "TJPR", label: "TJPR" },
  { value: "TJSC", label: "TJSC" },
  { value: "TJBA", label: "TJBA" },
  { value: "TRF1", label: "TRF-1" },
  { value: "TRF2", label: "TRF-2" },
  { value: "TRF3", label: "TRF-3" },
  { value: "TRF4", label: "TRF-4" },
  { value: "TRF5", label: "TRF-5" },
];

export default function ResearchView() {
  const { isLoading, results, searchProcessos, getProcesso, processoDetail, isLoadingDetail, setProcessoDetail } = useResearch();
  const [query, setQuery] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) {
      toaster.create({ title: "Campo obrigatório", description: "Digite um termo para pesquisar.", type: "warning" });
      return;
    }
    searchProcessos({ query: query.trim(), tribunal: tribunal || undefined });
  };

  const handleViewDetail = async (numeroCnj: string) => {
    const data = await getProcesso(numeroCnj);
    if (data) setDetailOpen(true);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toaster.create({ title: "Copiado!", type: "success" });
  };

  const items = results?.items || results?.processos || results?.data?.items || [];

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          Pesquisa Jurisprudencial
        </h2>
        <p className="text-muted-foreground">Busque processos e jurisprudência via API</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por termo, número do processo, nome..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-11"
              />
            </div>
            <Select value={tribunal} onValueChange={setTribunal}>
              <SelectTrigger className="w-full sm:w-48 h-11">
                <SelectValue placeholder="Tribunal" />
              </SelectTrigger>
              <SelectContent>
                {tribunais.map((t) => (
                  <SelectItem key={t.value} value={t.value || "all"}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isLoading} className="h-11">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Pesquisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && results && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {items.length > 0 ? `${items.length} resultado(s) encontrado(s)` : "Nenhum resultado encontrado"}
          </p>

          {items.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum resultado encontrado</p>
                <p className="text-sm">Tente refinar sua busca com termos diferentes</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {items.map((item: any, idx: number) => {
              const titulo = item.titulo || item.title || item.numero_cnj || item.numero || `Resultado ${idx + 1}`;
              const descricao = item.descricao || item.description || item.ementa || item.resumo || "";
              const tribunalBadge = item.tribunal || item.fonte || item.source || "";
              const numero = item.numero_cnj || item.numero || "";
              const data = item.data || item.data_inicio || item.created_at || "";

              return (
                <Card key={idx} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {tribunalBadge && <Badge variant="secondary" className="text-xs">{tribunalBadge}</Badge>}
                          {numero && <span className="text-xs text-muted-foreground font-mono">{numero}</span>}
                          {data && <span className="text-xs text-muted-foreground">{data}</span>}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{titulo}</h3>
                        {descricao && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {numero && (
                        <Button variant="outline" size="sm" onClick={() => handleViewDetail(numero)}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Detalhes
                        </Button>
                      )}
                      {descricao && (
                        <Button variant="ghost" size="sm" onClick={() => copyText(descricao)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                        </Button>
                      )}
                      {item.url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty Initial State */}
      {!isLoading && !results && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pesquise processos e jurisprudência</p>
            <p className="text-sm mt-1">Configure sua API key em Configurações &gt; Pesquisa</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Processo</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : processoDetail ? (
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {processoDetail.numero_cnj && (
                    <div><span className="text-muted-foreground">Número:</span> <span className="font-mono">{processoDetail.numero_cnj}</span></div>
                  )}
                  {processoDetail.tribunal && (
                    <div><span className="text-muted-foreground">Tribunal:</span> {processoDetail.tribunal}</div>
                  )}
                  {processoDetail.classe && (
                    <div><span className="text-muted-foreground">Classe:</span> {processoDetail.classe}</div>
                  )}
                  {processoDetail.assunto && (
                    <div><span className="text-muted-foreground">Assunto:</span> {processoDetail.assunto}</div>
                  )}
                  {processoDetail.data_inicio && (
                    <div><span className="text-muted-foreground">Data início:</span> {processoDetail.data_inicio}</div>
                  )}
                  {processoDetail.status && (
                    <div><span className="text-muted-foreground">Status:</span> {processoDetail.status}</div>
                  )}
                </div>

                {processoDetail.envolvidos && processoDetail.envolvidos.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Envolvidos</h4>
                    <div className="space-y-1">
                      {processoDetail.envolvidos.map((env: any, i: number) => (
                        <div key={i} className="text-sm flex gap-2">
                          <Badge variant="outline" className="text-xs shrink-0">{env.tipo || env.tipo_parte || "Parte"}</Badge>
                          <span>{env.nome || env.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {processoDetail.movimentacoes && processoDetail.movimentacoes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Movimentações</h4>
                    <div className="space-y-2">
                      {processoDetail.movimentacoes.slice(0, 20).map((mov: any, i: number) => (
                        <div key={i} className="text-sm border-l-2 border-border pl-3 py-1">
                          <span className="text-xs text-muted-foreground">{mov.data || ""}</span>
                          <p>{mov.descricao || mov.titulo || mov.conteudo || ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => copyText(JSON.stringify(processoDetail, null, 2))}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar JSON
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum detalhe disponível</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
