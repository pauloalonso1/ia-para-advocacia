import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NextStep {
  icon: LucideIcon;
  label: string;
  description: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  nextSteps?: NextStep[];
  className?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  nextSteps,
  className,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn("flex flex-col items-center justify-center py-16 px-6", className)}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-5"
      >
        <Icon className="w-10 h-10 text-primary/60" />
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 mb-8"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
          {actionLabel}
        </Button>
      )}

      {nextSteps && nextSteps.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">
            Próximos passos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nextSteps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                className="flex flex-col items-center text-center p-4 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <step.icon className="w-5 h-5 text-primary mb-2" />
                <span className="text-xs font-medium text-foreground">{step.label}</span>
                <span className="text-[10px] text-muted-foreground mt-1">{step.description}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;
