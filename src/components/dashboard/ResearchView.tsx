import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Copy, FileText, ExternalLink, Loader2, Scale, User, Hash } from "lucide-react";
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
  const [searchType, setSearchType] = useState("nome");

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

  // V2 API returns different structures depending on the endpoint
  // - envolvido/processos: { envolvido_encontrado, items: [...] }
  // - processos/numero_cnj: single process object (not an array)
  const extractItems = (data: any): any[] => {
    if (!data) return [];
    // If it's a direct CNJ lookup, wrap in array
    if (data.numero_cnj && !data.items) return [data];
    // envolvido/processos response
    if (data.items) return data.items;
    // Fallback for any array response
    if (Array.isArray(data)) return data;
    return [];
  };

  const items = extractItems(results);
  const envolvido = results?.envolvido_encontrado;

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          Pesquisa Jurisprudencial
        </h2>
        <p className="text-muted-foreground">Busque processos via API do Escavador (V2)</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Tabs value={searchType} onValueChange={setSearchType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="nome" className="text-xs gap-1"><User className="h-3.5 w-3.5" /> Nome/CPF/CNPJ</TabsTrigger>
              <TabsTrigger value="cnj" className="text-xs gap-1"><Hash className="h-3.5 w-3.5" /> Nº CNJ</TabsTrigger>
              <TabsTrigger value="oab" className="text-xs gap-1"><Scale className="h-3.5 w-3.5" /> OAB</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder={
                  searchType === "cnj" ? "0000000-00.0000.0.00.0000" :
                  searchType === "oab" ? "Número da OAB (ex: 12345)" :
                  "Nome, CPF ou CNPJ..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-11"
              />
            </div>
            {searchType === "nome" && (
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
            )}
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
          {envolvido && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{envolvido.nome}</span>
                  <Badge variant="outline" className="text-xs">{envolvido.tipo_pessoa === "JURIDICA" ? "PJ" : "PF"}</Badge>
                  <span className="text-muted-foreground">• {envolvido.quantidade_processos} processo(s)</span>
                </div>
              </CardContent>
            </Card>
          )}

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
              const numero = item.numero_cnj || "";
              const tituloAtivo = item.titulo_polo_ativo || "";
              const tituloPassivo = item.titulo_polo_passivo || "";
              const titulo = tituloAtivo && tituloPassivo
                ? `${tituloAtivo} x ${tituloPassivo}`
                : tituloAtivo || tituloPassivo || numero || `Resultado ${idx + 1}`;
              
              const fonte = item.fontes?.[0];
              const capa = fonte?.capa;
              const tribunalSigla = fonte?.sigla || "";
              const classe = capa?.classe || "";
              const assunto = capa?.assunto || "";
              const area = capa?.area || "";
              const dataInicio = item.data_inicio || "";
              const dataUltimaMov = item.data_ultima_movimentacao || "";
              const qtdMovs = item.quantidade_movimentacoes || 0;

              return (
                <Card key={idx} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {tribunalSigla && <Badge variant="secondary" className="text-xs">{tribunalSigla}</Badge>}
                          {area && <Badge variant="outline" className="text-xs">{area}</Badge>}
                          {numero && <span className="text-xs text-muted-foreground font-mono">{numero}</span>}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{titulo}</h3>
                        {classe && <p className="text-xs text-muted-foreground mt-0.5">{classe}</p>}
                        {assunto && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assunto}</p>}
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          {dataInicio && <span>Início: {dataInicio}</span>}
                          {dataUltimaMov && <span>Última mov.: {dataUltimaMov}</span>}
                          {qtdMovs > 0 && <span>{qtdMovs} movimentações</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {numero && (
                        <Button variant="outline" size="sm" onClick={() => handleViewDetail(numero)}>
                          <FileText className="h-3.5 w-3.5 mr-1" /> Detalhes
                        </Button>
                      )}
                      {numero && (
                        <Button variant="ghost" size="sm" onClick={() => copyText(numero)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar CNJ
                        </Button>
                      )}
                      {fonte?.url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={fonte.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Tribunal
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
            <p className="text-xs mt-2">Busque por nome, CPF/CNPJ, número CNJ ou OAB</p>
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
                {/* Header info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {processoDetail.numero_cnj && (
                    <div><span className="text-muted-foreground">Número:</span> <span className="font-mono">{processoDetail.numero_cnj}</span></div>
                  )}
                  {processoDetail.ano_inicio && (
                    <div><span className="text-muted-foreground">Ano início:</span> {processoDetail.ano_inicio}</div>
                  )}
                  {processoDetail.data_inicio && (
                    <div><span className="text-muted-foreground">Data início:</span> {processoDetail.data_inicio}</div>
                  )}
                  {processoDetail.estado_origem?.nome && (
                    <div><span className="text-muted-foreground">Estado:</span> {processoDetail.estado_origem.nome} ({processoDetail.estado_origem.sigla})</div>
                  )}
                  {processoDetail.unidade_origem?.nome && (
                    <div className="col-span-2"><span className="text-muted-foreground">Unidade:</span> {processoDetail.unidade_origem.nome}</div>
                  )}
                  {processoDetail.data_ultima_movimentacao && (
                    <div><span className="text-muted-foreground">Última mov.:</span> {processoDetail.data_ultima_movimentacao}</div>
                  )}
                  {processoDetail.quantidade_movimentacoes && (
                    <div><span className="text-muted-foreground">Movimentações:</span> {processoDetail.quantidade_movimentacoes}</div>
                  )}
                </div>

                {/* Fontes / Capas */}
                {processoDetail.fontes?.map((fonte: any, fi: number) => (
                  <div key={fi} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{fonte.sigla} - {fonte.grau_formatado}</Badge>
                      {fonte.capa?.area && <Badge variant="outline">{fonte.capa.area}</Badge>}
                      {fonte.capa?.situacao && <Badge variant={fonte.capa.situacao === "Baixado" ? "secondary" : "default"}>{fonte.capa.situacao}</Badge>}
                    </div>
                    {fonte.capa?.classe && <p className="text-sm"><span className="text-muted-foreground">Classe:</span> {fonte.capa.classe}</p>}
                    {fonte.capa?.assunto && <p className="text-sm"><span className="text-muted-foreground">Assunto:</span> {fonte.capa.assunto}</p>}
                    {fonte.capa?.orgao_julgador && <p className="text-sm"><span className="text-muted-foreground">Órgão:</span> {fonte.capa.orgao_julgador}</p>}
                    {fonte.capa?.valor_causa && <p className="text-sm"><span className="text-muted-foreground">Valor:</span> {fonte.capa.valor_causa.valor_formatado}</p>}
                    
                    {/* Envolvidos */}
                    {fonte.envolvidos?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1.5">Envolvidos</h4>
                        <div className="space-y-1">
                          {fonte.envolvidos.map((env: any, i: number) => (
                            <div key={i} className="text-sm flex gap-2 items-start">
                              <Badge variant="outline" className="text-xs shrink-0">{env.tipo_normalizado || env.tipo || "Parte"}</Badge>
                              <div>
                                <span>{env.nome}</span>
                                {env.oabs?.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (OAB: {env.oabs.map((o: any) => `${o.numero}/${o.uf}`).join(", ")})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

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