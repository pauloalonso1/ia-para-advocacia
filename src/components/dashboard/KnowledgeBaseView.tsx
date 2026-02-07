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
import { Switch } from '@/components/ui/switch';
import { 
  Brain, Plus, Trash2, FileText, Search, Globe, Bot, 
  Loader2, BookOpen, Sparkles, FileUp, File
} from 'lucide-react';

const KnowledgeBaseView = () => {
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const agentFilter = selectedScope === 'all' ? undefined : selectedScope === 'global' ? 'global' : selectedScope;
  const { documents, loading, ingesting, ingestDocument, ingestFile, deleteDocument, searchKnowledge, supportedFileTypes } = useKnowledgeBase(agentFilter);
  const { agents } = useAgents();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAgent, setTargetAgent] = useState<string>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [useReranking, setUseReranking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');

  const handleSubmit = async () => {
    if (uploadMode === 'file' && selectedFile) {
      const agentId = targetAgent === 'global' ? null : targetAgent;
      await ingestFile(selectedFile, agentId);
      setSelectedFile(null);
      setIsAddOpen(false);
      return;
    }

    if (!title.trim() || !content.trim()) return;
    const agentId = targetAgent === 'global' ? null : targetAgent;
    await ingestDocument(title, content, agentId);
    setTitle('');
    setContent('');
    setIsAddOpen(false);
  };

  const handleTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a binary file (PDF, DOCX)
    if (file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword') {
      setSelectedFile(file);
      setUploadMode('file');
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      return;
    }

    // Text files: read directly
    const text = await file.text();
    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    setContent(text);
    setUploadMode('text');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const agentId = selectedScope === 'all' ? null : selectedScope === 'global' ? null : selectedScope;
    const results = await searchKnowledge(searchQuery, agentId, useReranking);
    setSearchResults(results);
    setSearching(false);
  };

  const getFileTypeBadge = (doc: any) => {
    const metadata = doc.metadata as Record<string, any> | null;
    if (metadata?.mimeType) {
      const type = supportedFileTypes[metadata.mimeType];
      if (type) return type;
    }
    if (doc.source_type === 'upload') return 'Upload';
    return 'Manual';
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
              Memória RAG vetorizada com suporte a PDF, DOCX e reranking
            </p>
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setSelectedFile(null);
            setUploadMode('text');
            setTitle('');
            setContent('');
          }
        }}>
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

              {/* File upload area */}
              <div>
                <label className="text-sm font-medium text-foreground">Upload de arquivo</label>
                <label className="cursor-pointer mt-1 block">
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.pdf,.docx,.doc"
                    onChange={handleTextFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <FileUp className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo'}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, TXT, MD, CSV (máx. 20MB)
                      </p>
                    </div>
                    {selectedFile && (
                      <Badge variant="secondary" className="ml-auto">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    )}
                  </div>
                </label>
              </div>

              {/* Show title/content fields for text mode or title for file mode */}
              {uploadMode === 'file' && selectedFile ? (
                <div>
                  <label className="text-sm font-medium text-foreground">Título</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome do documento"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O texto será extraído automaticamente do arquivo via IA.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  ingesting || 
                  (uploadMode === 'file' ? !selectedFile : (!title.trim() || !content.trim()))
                }
                className="w-full gap-2"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadMode === 'file' ? 'Extraindo e vetorizando...' : 'Processando e vetorizando...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {uploadMode === 'file' ? 'Processar Arquivo' : 'Indexar Documento'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 items-end flex-wrap">
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

        <div className="flex items-center gap-2">
          <Switch checked={useReranking} onCheckedChange={setUseReranking} />
          <label className="text-xs text-muted-foreground">Reranking IA</label>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Resultados da Busca Semântica
              {useReranking && <Badge variant="secondary" className="text-[10px]">Reranked</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result: any, idx: number) => (
                <div key={idx} className="p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {useReranking ? `#${idx + 1}` : `Similaridade: ${(result.similarity * 100).toFixed(1)}%`}
                    </Badge>
                    {!useReranking && result.similarity && (
                      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${result.similarity * 100}%` }} 
                        />
                      </div>
                    )}
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
              Adicione documentos (texto, PDF ou DOCX) à base de conhecimento para que seus agentes consultem informações relevantes.
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
                    {doc.source_type === 'upload' && (doc.metadata as any)?.mimeType?.includes('pdf') ? (
                      <File className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : doc.source_type === 'upload' && (doc.metadata as any)?.mimeType?.includes('word') ? (
                      <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
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
                    {getFileTypeBadge(doc)}
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
