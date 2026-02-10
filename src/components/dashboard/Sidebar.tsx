import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { 
  Bot, 
  MessageSquare, 
  Settings, 
  LogOut,
  LayoutDashboard,
  Contact,
  LayoutGrid,
  Users,
  TrendingUp,
  CalendarCheck,
  Brain,
  Sun,
  Moon,
  Wallet,
  Wifi,
  WifiOff,
  Loader2,
  FileText,
} from 'lucide-react';
import logoDashboard from '@/assets/logo-dashboard.svg';
import lexiaLogoFull from '@/assets/lexia-logo.svg';

import {
  AnimatedSidebar,
  AnimatedSidebarBody,
  AnimatedSidebarLink,
  useAnimatedSidebar,
} from '@/components/ui/animated-sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'checking' | 'idle';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  whatsappStatus?: ConnectionStatus;
  onWhatsappClick?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  { id: 'agents', label: 'Agentes IA', icon: Bot },
  { id: 'knowledge', label: 'Conhecimento', icon: Brain },
  { id: 'contacts', label: 'Contatos', icon: Contact },
  { id: 'crm', label: 'CRM Kanban', icon: LayoutGrid },
  { id: 'meetings', label: 'Reuniões', icon: CalendarCheck },
  { id: 'financial', label: 'Financeiro', icon: Wallet },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const SidebarContent = ({ activeTab, onTabChange, whatsappStatus, onWhatsappClick }: SidebarProps) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open } = useAnimatedSidebar();

  const statusConfig: Record<ConnectionStatus, { color: string; label: string; icon: React.ReactNode }> = {
    connected: { color: 'bg-green-500', label: 'WhatsApp conectado', icon: <Wifi className="h-3.5 w-3.5 text-green-500" /> },
    disconnected: { color: 'bg-destructive', label: 'WhatsApp desconectado', icon: <WifiOff className="h-3.5 w-3.5 text-destructive" /> },
    reconnecting: { color: 'bg-yellow-500', label: 'Reconectando...', icon: <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" /> },
    checking: { color: 'bg-yellow-500', label: 'Verificando...', icon: <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" /> },
    idle: { color: 'bg-muted-foreground', label: 'WhatsApp não configurado', icon: <WifiOff className="h-3.5 w-3.5 text-muted-foreground" /> },
  };

  const currentStatusConfig = statusConfig[whatsappStatus || 'idle'];

  const links = menuItems.map((item) => ({
    label: item.label,
    href: `#${item.id}`,
    icon: <item.icon className="h-5 w-5 flex-shrink-0" />,
    id: item.id,
  }));

  return (
    <AnimatedSidebarBody className="justify-between gap-6">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Logo */}
        <div className="flex items-center py-2 px-1 mb-6">
          {open ? (
            <img src={lexiaLogoFull} alt="Lexia" className="h-8" />
          ) : (
            <img src={logoDashboard} alt="Lexia" className="h-8 flex-shrink-0" />
          )}
        </div>

        {/* Nav Links */}
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <AnimatedSidebarLink
              key={link.id}
              link={link}
              active={activeTab === link.id}
              onClick={() => onTabChange(link.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-border pt-4">
        {/* WhatsApp Status */}
        {whatsappStatus && whatsappStatus !== 'idle' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onWhatsappClick}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-muted/50"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {(whatsappStatus === 'reconnecting' || whatsappStatus === 'checking') && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatusConfig.color}`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStatusConfig.color}`} />
                </span>
                {open && (
                  <span className="text-muted-foreground truncate">
                    {currentStatusConfig.label}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {currentStatusConfig.label}
            </TooltipContent>
          </Tooltip>
        )}
        <AnimatedSidebarLink
          link={{
            label: theme === 'dark' ? 'Modo Claro' : 'Modo Escuro',
            href: '#',
            icon: theme === 'dark' 
              ? <Sun className="h-5 w-5 flex-shrink-0" /> 
              : <Moon className="h-5 w-5 flex-shrink-0" />,
          }}
          onClick={toggleTheme}
        />
        <AnimatedSidebarLink
          link={{
            label: 'Sair',
            href: '#',
            icon: <LogOut className="h-5 w-5 flex-shrink-0" />,
          }}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        />
      </div>
    </AnimatedSidebarBody>
  );
};

const Sidebar = ({ activeTab, onTabChange, whatsappStatus, onWhatsappClick }: SidebarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <SidebarContent activeTab={activeTab} onTabChange={onTabChange} whatsappStatus={whatsappStatus} onWhatsappClick={onWhatsappClick} />
    </AnimatedSidebar>
  );
};

export default Sidebar;
