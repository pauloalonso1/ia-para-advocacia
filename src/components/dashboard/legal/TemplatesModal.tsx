import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Pencil, Trash2, Save } from "lucide-react";
import { toaster } from "@/components/ui/basic-toast";

interface Template {
  id: string;
  title: string;
  content: string;
}

interface TemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, content: string) => void;
}

export default function TemplatesModal({ open, onOpenChange, templates, onSelect, onDelete, onUpdate }: TemplatesModalProps) {
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleSelect = (id: string) => {
    onSelect(id);
    onOpenChange(false);
    const tpl = templates.find(t => t.id === id);
    if (tpl) toaster.create({ title: `Modelo "${tpl.title}" selecionado`, type: "success" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                <p>Nenhuma instrução salva ainda</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-start gap-4 p-4 rounded-xl border hover:border-primary/40 transition-colors bg-card">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewTemplate(tpl)}>
                      <p className="font-semibold text-base truncate">{tpl.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tpl.content.slice(0, 120)}...</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <Button variant="default" size="sm" className="h-9 px-4 text-sm" onClick={() => handleSelect(tpl.id)}>Usar</Button>
                      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditingTemplate({ ...tpl })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
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
                            <AlertDialogAction onClick={() => onDelete(tpl.id)}>Excluir</AlertDialogAction>
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

      {/* Edit Modal */}
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
              <Input value={editingTemplate?.title || ""} onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, title: e.target.value } : null)} />
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea value={editingTemplate?.content || ""} onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!editingTemplate?.title.trim() || !editingTemplate?.content.trim()) return;
              onUpdate(editingTemplate.id, editingTemplate.title.trim(), editingTemplate.content.trim());
              setEditingTemplate(null);
            }}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
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
    </>
  );
}
