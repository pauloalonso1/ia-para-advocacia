import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  Scale,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agentes IA', icon: Bot },
  { id: 'cases', label: 'Casos/Leads', icon: Users },
  { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const { signOut } = useAuth();

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">LegalAgent</h1>
            <p className="text-xs text-slate-400">Automação Jurídica</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-700/50",
              activeTab === item.id && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
            )}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
