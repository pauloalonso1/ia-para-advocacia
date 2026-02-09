import { useState } from 'react';
import { Play, Pause, Download, FileText, Film, Volume2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaMessageProps {
  mediaUrl: string;
  mediaType: string;
  content: string;
  isAssistant: boolean;
}

const MediaMessage = ({ mediaUrl, mediaType, content, isAssistant }: MediaMessageProps) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const textColor = isAssistant ? 'text-primary-foreground' : 'text-foreground';
  const mutedColor = isAssistant ? 'text-primary-foreground/70' : 'text-muted-foreground';

  // Clean content: remove media prefixes like 🎤, 🖼️, 📄
  const cleanContent = content
    ?.replace(/^🎤\s*\[Transcrição\]:\s*/i, '')
    ?.replace(/^🖼️\s*\[Descrição da imagem\]:\s*/i, '')
    ?.replace(/^📄\s*\[Conteúdo do PDF\]:\s*/i, '')
    ?.replace(/^\[Áudio\]\s*/i, '')
    ?.replace(/^\[Imagem\]\s*/i, '')
    ?.replace(/^\[Vídeo\]\s*/i, '')
    ?.replace(/^\[Documento\]\s*/i, '')
    ?.trim();

  const toggleAudio = () => {
    if (!audioRef) return;
    if (audioPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    setAudioPlaying(!audioPlaying);
  };

  if (mediaType === 'image') {
    return (
      <>
        <div className="space-y-1">
          <img
            src={mediaUrl}
            alt="Imagem"
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-h-64 object-cover"
            onClick={() => setImageOpen(true)}
            loading="lazy"
          />
          {cleanContent && (
            <p className={cn("text-sm whitespace-pre-wrap break-words mt-1.5", textColor)}>
              {cleanContent}
            </p>
          )}
        </div>

        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
            <img
              src={mediaUrl}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3 min-w-[200px]">
          <button
            onClick={toggleAudio}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
              isAssistant ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary/20 hover:bg-primary/30"
            )}
          >
            {audioPlaying ? (
              <Pause className={cn("w-5 h-5", textColor)} />
            ) : (
              <Play className={cn("w-5 h-5", textColor)} />
            )}
          </button>
          <div className="flex-1">
            <div className={cn("flex items-center gap-1", mutedColor)}>
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-xs">Áudio</span>
            </div>
            <audio
              ref={(el) => setAudioRef(el)}
              src={mediaUrl}
              onEnded={() => setAudioPlaying(false)}
              onPause={() => setAudioPlaying(false)}
              onPlay={() => setAudioPlaying(true)}
              className="w-full h-8 mt-1"
              controls
              controlsList="nodownload"
              style={{ maxWidth: '220px' }}
            />
          </div>
        </div>
        {cleanContent && (
          <p className={cn("text-xs italic mt-1", mutedColor)}>
            🎤 {cleanContent}
          </p>
        )}
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="space-y-1">
        <video
          src={mediaUrl}
          controls
          className="max-w-full rounded-lg max-h-64"
          preload="metadata"
        />
        {cleanContent && (
          <p className={cn("text-sm whitespace-pre-wrap break-words mt-1.5", textColor)}>
            {cleanContent}
          </p>
        )}
      </div>
    );
  }

  if (mediaType === 'document') {
    const fileName = mediaUrl.split('/').pop() || 'Documento';
    return (
      <div className="space-y-1">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors min-w-[200px]",
            isAssistant ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            isAssistant ? "bg-primary-foreground/20" : "bg-primary/20"
          )}>
            <FileText className={cn("w-5 h-5", isAssistant ? "text-primary-foreground" : "text-primary")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", textColor)}>{fileName}</p>
            <p className={cn("text-xs", mutedColor)}>Documento</p>
          </div>
          <Download className={cn("w-4 h-4 shrink-0", mutedColor)} />
        </a>
        {cleanContent && (
          <p className={cn("text-sm whitespace-pre-wrap break-words mt-1.5", textColor)}>
            {cleanContent}
          </p>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <p className={cn("text-sm whitespace-pre-wrap break-words", textColor)}>
      {content}
    </p>
  );
};

export default MediaMessage;
