import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  Upload, 
  Globe, 
  Bot, 
  Loader2,
  BookOpen,
  Sparkles
} from 'lucide-react';

const KnowledgeBaseView = () => {
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const agentFilter = selectedScope === 'all' ? undefined : selectedScope === 'global' ? 'global' : selectedScope;
  const { documents, loading, ingesting, ingestDocument, deleteDocument, searchKnowledge } = useKnowledgeBase(agentFilter);
  const { agents } = useAgents();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAgent, setTargetAgent] = useState<string>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    
    const agentId = targetAgent === 'global' ? null : targetAgent;
    await ingestDocument(title, content, agentId);
    
    setTitle('');
    setContent('');
    setIsAddOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setContent(text);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const agentId = selectedScope === 'all' ? null : selectedScope === 'global' ? null : selectedScope;
    const results = await searchKnowledge(searchQuery, agentId);
    setSearchResults(results);
    setSearching(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Base de Conhecimento</h2>
            <p className="text-sm text-muted-foreground">
              Memória RAG vetorizada para seus agentes de IA
            </p>
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Conhecimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Escopo</label>
                <Select value={targetAgent} onValueChange={setTargetAgent}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Global (todos os agentes)
                      </div>
                    </SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          {agent.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Política de privacidade, Tabela de preços..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Conteúdo</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Cole o texto do documento aqui..."
                  className="mt-1 min-h-[200px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload arquivo (.txt, .md)</span>
                  </div>
                </label>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || ingesting}
                className="w-full gap-2"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando e vetorizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Indexar Documento
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 items-end">
        <div className="w-48">
          <label className="text-sm font-medium text-foreground mb-1 block">Filtrar por</label>
          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="global">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Global
                </div>
              </SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busca semântica na base de conhecimento..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} variant="outline" className="gap-2">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Resultados da Busca Semântica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result, idx) => (
                <div key={idx} className="p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Similaridade: {(result.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{result.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">Nenhum documento ainda</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Adicione documentos à base de conhecimento para que seus agentes possam consultar informações relevantes durante o atendimento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">{doc.title}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDocument(doc.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {doc.content.slice(0, 150)}...
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {doc.source_type === 'manual' ? 'Manual' : 'Upload'}
                  </Badge>
                  {doc.agent_id ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Bot className="w-2.5 h-2.5" />
                      Agente
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      Global
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseView;
