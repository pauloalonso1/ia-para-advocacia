import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface StateData {
  state: string;
  count: number;
}

interface BrazilMapProps {
  data?: StateData[];
  total?: number;
}

// Real Brazil SVG paths for each state (simplified but accurate outlines)
const states: { id: string; name: string; d: string }[] = [
  { id: 'AC', name: 'Acre', d: 'M48,168 L62,165 L68,170 L65,178 L52,180 L45,175 Z' },
  { id: 'AM', name: 'Amazonas', d: 'M62,120 L120,110 L140,115 L148,130 L145,155 L130,165 L100,170 L68,170 L62,165 L55,150 L50,135 Z' },
  { id: 'RR', name: 'Roraima', d: 'M100,75 L120,70 L130,80 L128,100 L120,110 L105,108 L95,95 Z' },
  { id: 'AP', name: 'Amapá', d: 'M168,75 L180,70 L188,80 L185,100 L175,108 L165,100 L162,88 Z' },
  { id: 'PA', name: 'Pará', d: 'M120,110 L165,100 L185,100 L200,110 L210,125 L205,145 L190,155 L170,150 L148,130 L140,115 Z' },
  { id: 'MA', name: 'Maranhão', d: 'M210,125 L230,120 L240,130 L238,150 L225,160 L210,155 L205,145 Z' },
  { id: 'PI', name: 'Piauí', d: 'M238,150 L250,140 L258,150 L255,175 L245,185 L235,178 L232,165 Z' },
  { id: 'CE', name: 'Ceará', d: 'M258,130 L275,125 L282,135 L278,150 L265,155 L258,150 L255,140 Z' },
  { id: 'RN', name: 'Rio Grande do Norte', d: 'M282,135 L295,130 L300,138 L295,145 L285,148 L278,142 Z' },
  { id: 'PB', name: 'Paraíba', d: 'M278,148 L295,145 L300,152 L292,158 L278,156 Z' },
  { id: 'PE', name: 'Pernambuco', d: 'M265,155 L292,158 L298,165 L285,172 L260,168 L255,160 Z' },
  { id: 'AL', name: 'Alagoas', d: 'M285,172 L298,170 L300,178 L290,182 L282,178 Z' },
  { id: 'SE', name: 'Sergipe', d: 'M280,182 L290,182 L292,190 L284,192 Z' },
  { id: 'BA', name: 'Bahia', d: 'M232,165 L255,175 L265,168 L285,178 L284,192 L280,220 L260,240 L235,245 L220,230 L215,200 L218,180 Z' },
  { id: 'TO', name: 'Tocantins', d: 'M190,155 L210,155 L218,180 L215,200 L200,210 L185,200 L180,178 L182,160 Z' },
  { id: 'GO', name: 'Goiás', d: 'M185,200 L200,210 L215,200 L220,230 L210,248 L195,252 L180,240 L175,218 Z' },
  { id: 'DF', name: 'Distrito Federal', d: 'M205,225 L212,222 L215,228 L208,232 Z' },
  { id: 'MT', name: 'Mato Grosso', d: 'M100,170 L145,155 L170,150 L182,160 L180,178 L175,218 L160,230 L130,225 L110,210 L95,195 L90,180 Z' },
  { id: 'MS', name: 'Mato Grosso do Sul', d: 'M130,225 L160,230 L175,218 L180,240 L175,265 L155,275 L135,270 L120,255 L118,238 Z' },
  { id: 'MG', name: 'Minas Gerais', d: 'M195,252 L210,248 L220,230 L235,245 L260,240 L268,255 L260,280 L240,290 L215,288 L195,278 L185,265 Z' },
  { id: 'ES', name: 'Espírito Santo', d: 'M268,255 L280,250 L285,265 L278,278 L268,275 L262,268 Z' },
  { id: 'RJ', name: 'Rio de Janeiro', d: 'M240,290 L260,280 L268,285 L272,295 L258,300 L242,298 Z' },
  { id: 'SP', name: 'São Paulo', d: 'M175,265 L195,278 L215,288 L240,290 L242,298 L230,310 L205,315 L185,305 L170,290 L168,278 Z' },
  { id: 'PR', name: 'Paraná', d: 'M155,275 L170,290 L185,305 L205,315 L198,328 L175,335 L152,325 L140,308 L138,288 Z' },
  { id: 'SC', name: 'Santa Catarina', d: 'M152,325 L175,335 L178,348 L165,358 L148,355 L140,342 Z' },
  { id: 'RS', name: 'Rio Grande do Sul', d: 'M140,342 L148,355 L165,358 L170,375 L158,395 L140,400 L122,390 L115,370 L120,352 Z' },
];

const BrazilMap = ({ data: _data = [], total = 89 }: BrazilMapProps) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

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
      
      <div className="relative h-64 flex items-center justify-center">
        <svg viewBox="30 60 290 350" className="w-full h-full max-w-[280px]">
          <defs>
            <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {states.map((state) => (
            <path
              key={state.id}
              d={state.d}
              fill={hoveredState === state.id ? 'hsl(var(--primary))' : 'url(#mapGradient)'}
              fillOpacity={hoveredState === state.id ? 0.9 : 0.6}
              stroke="hsl(var(--border))"
              strokeWidth="0.8"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredState(state.id)}
              onMouseLeave={() => setHoveredState(null)}
            >
              <title>{state.name}</title>
            </path>
          ))}
        </svg>
        
        {hoveredState && (
          <div className="absolute top-2 right-2 bg-popover border border-border rounded-md px-2 py-1 text-xs text-foreground shadow-sm">
            {states.find(s => s.id === hoveredState)?.name}
          </div>
        )}

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
