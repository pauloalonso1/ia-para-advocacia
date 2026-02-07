import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, memo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface StateData {
  state: string;
  count: number;
}

interface BrazilMapProps {
  data?: StateData[];
  total?: number;
}

const BRAZIL_TOPO_URL =
  'https://raw.githubusercontent.com/ruliana/1ccaaab05ea113b0dff3b22be3b4d637/raw/br-states.json';

const BrazilMap = memo(({ data: _data = [], total = 89 }: BrazilMapProps) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  return (
    <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Contatos por estado</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          Total: {total}
        </Badge>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 260 }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-52, -15], scale: 650 }}
          width={400}
          height={420}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={BRAZIL_TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name: string = geo.properties?.nome || geo.properties?.name || geo.id;
                const isHovered = hoveredState === name;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHoveredState(name)}
                    onMouseLeave={() => setHoveredState(null)}
                    style={{
                      default: {
                        fill: 'hsl(205, 88%, 53%)',
                        fillOpacity: 0.35,
                        stroke: 'hsl(var(--border))',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: 'hsl(205, 88%, 53%)',
                        fillOpacity: 0.8,
                        stroke: 'hsl(var(--primary))',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        fill: 'hsl(205, 88%, 53%)',
                        fillOpacity: 0.9,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {hoveredState && (
          <div className="absolute top-2 right-2 bg-popover border border-border rounded-md px-2 py-1 text-xs text-foreground shadow-sm pointer-events-none">
            {hoveredState}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
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
  );
});

BrazilMap.displayName = 'BrazilMap';

export default BrazilMap;
