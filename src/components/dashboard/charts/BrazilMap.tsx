import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StateData {
  state: string;
  count: number;
}

interface BrazilMapProps {
  data?: StateData[];
  total?: number;
}

// Simplified Brazil map as styled regions
const BrazilMap = ({ data: _data = [], total = 89 }: BrazilMapProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Total de contatos por estado</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          Total: {total}
        </Badge>
      </div>
      
      {/* Stylized map representation */}
      <div className="relative h-64 flex items-center justify-center">
        <svg viewBox="0 0 200 220" className="w-full h-full max-w-[280px]">
          {/* Simplified Brazil shape */}
          <defs>
            <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {/* North region */}
          <path 
            d="M40,20 L160,20 L170,60 L140,80 L100,70 L60,80 L30,60 Z" 
            fill="url(#mapGradient)" 
            stroke="hsl(var(--border))" 
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
          
          {/* Northeast region */}
          <path 
            d="M140,80 L180,70 L190,120 L170,150 L140,140 L130,100 Z" 
            fill="hsl(var(--primary))" 
            fillOpacity="0.5"
            stroke="hsl(var(--border))" 
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
          
          {/* Central-West region */}
          <path 
            d="M60,80 L130,100 L120,150 L80,160 L40,130 L40,90 Z" 
            fill="hsl(var(--primary))" 
            fillOpacity="0.4"
            stroke="hsl(var(--border))" 
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
          
          {/* Southeast region */}
          <path 
            d="M120,150 L140,140 L160,160 L150,190 L110,200 L90,180 L80,160 Z" 
            fill="hsl(var(--primary))" 
            fillOpacity="0.7"
            stroke="hsl(var(--border))" 
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
          
          {/* South region */}
          <path 
            d="M80,160 L90,180 L110,200 L100,220 L60,210 L50,180 L60,160 Z" 
            fill="hsl(var(--primary))" 
            fillOpacity="0.6"
            stroke="hsl(var(--border))" 
            strokeWidth="1"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        </svg>
        
        {/* Legend */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/30" />
            <span>Menor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/70" />
            <span>Maior</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrazilMap;
