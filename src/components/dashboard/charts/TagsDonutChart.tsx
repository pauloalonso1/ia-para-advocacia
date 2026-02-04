import { Tags } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TagData {
  name: string;
  value: number;
  color: string;
}

interface TagsDonutChartProps {
  data?: TagData[];
}

const defaultData: TagData[] = [
  { name: 'Rescisão Indireta', value: 14, color: '#818cf8' },
  { name: 'Reconhecimento de vínculo', value: 13, color: '#38bdf8' },
  { name: 'Aguardando documentação', value: 4, color: '#fb923c' },
  { name: 'Novo Lead', value: 3, color: '#4ade80' },
];

const TagsDonutChart = ({ data = defaultData }: TagsDonutChartProps) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Tags className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Etiquetas</h3>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">TOTAL</span>
            <span className="text-xl font-bold text-foreground">{total}</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground text-xs truncate max-w-[140px]">
                  {item.name}
                </span>
              </div>
              <span className="text-foreground text-xs">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagsDonutChart;
