import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const InfoTooltip = ({ content, className, side = 'top' }: InfoTooltipProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={cn("w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors inline-block", className)} />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[240px] text-xs leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InfoTooltip;
