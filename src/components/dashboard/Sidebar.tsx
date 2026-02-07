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
  Moon
} from 'lucide-react';
import logoDashboard from '@/assets/logo-dashboard.svg';
import lexiaLogoFull from '@/assets/lexia-logo.svg';
import { motion } from 'framer-motion';
import {
  AnimatedSidebar,
  AnimatedSidebarBody,
  AnimatedSidebarLink,
  useAnimatedSidebar,
} from '@/components/ui/animated-sidebar';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  { id: 'agents', label: 'Agentes IA', icon: Bot },
  { id: 'knowledge', label: 'Conhecimento', icon: Brain },
  { id: 'contacts', label: 'Contatos', icon: Contact },
  { id: 'crm', label: 'CRM Kanban', icon: LayoutGrid },
  { id: 'meetings', label: 'Reuniões', icon: CalendarCheck },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const SidebarContent = ({ activeTab, onTabChange }: SidebarProps) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { open } = useAnimatedSidebar();

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

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [open, setOpen] = useState(false);

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <SidebarContent activeTab={activeTab} onTabChange={onTabChange} />
    </AnimatedSidebar>
  );
};

export default Sidebar;
