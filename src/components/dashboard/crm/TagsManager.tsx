import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface TagsManagerProps {
  clientPhone: string;
  userId: string;
}

const TagsManager = ({ clientPhone, userId }: TagsManagerProps) => {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, tags')
        .eq('phone', clientPhone)
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setContactId(data.id);
        setTags(data.tags || []);
      }
    };
    fetchTags();
  }, [clientPhone, userId]);

  const updateTags = async (newTags: string[]) => {
    if (!contactId) return;
    setTags(newTags);
    await supabase
      .from('contacts')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', contactId);
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    updateTags([...tags, trimmed]);
    setNewTag('');
    setOpen(false);
  };

  const removeTag = (tag: string) => {
    updateTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Tag className="w-3 h-3" />
        Etiquetas
      </Label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${getTagColor(tag)} cursor-pointer group`}
            >
              {tag}
              <X
                className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start text-muted-foreground">
            <Plus className="w-3 h-3 mr-1.5" />
            Adicionar etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              placeholder="Nova etiqueta..."
              className="h-8 text-xs"
              onKeyDown={e => e.key === 'Enter' && addTag()}
              autoFocus
              maxLength={30}
            />
            <Button size="sm" className="h-8 px-3" onClick={addTag} disabled={!newTag.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TagsManager;
