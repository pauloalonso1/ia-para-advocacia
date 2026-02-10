import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings, MessageSquare, User, Bell, Clock, Zap, FileSignature, Users, GitBranch, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import ProfileSettings from './settings/ProfileSettings';
import WhatsAppSettings from './settings/WhatsAppSettings';
import ScheduleSettings from './settings/ScheduleSettings';
import NotificationSettings from './settings/NotificationSettings';
import FollowupSettings from './settings/FollowupSettings';
import ZapSignSettings from './settings/ZapSignSettings';
import FunnelAgentsSettings from './settings/FunnelAgentsSettings';
import ResearchApiSettings from './settings/ResearchApiSettings';
import TeamMembersView from './TeamMembersView';

type SettingsSection = 'profile' | 'whatsapp' | 'schedule' | 'notifications' | 'followup' | 'zapsign' | 'funnel' | 'team' | 'research';

interface SettingsViewProps {
  initialSection?: SettingsSection;
}

const menuItems: { id: SettingsSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile', label: 'Perfil', icon: User, description: 'Informações da conta' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Evolution API' },
  { id: 'team', label: 'Gestão de Usuários', icon: Users, description: 'Equipe do escritório' },
  { id: 'schedule', label: 'Horários', icon: Clock, description: 'Expediente e agenda' },
  { id: 'notifications', label: 'Notificações', icon: Bell, description: 'Alertas WhatsApp' },
  { id: 'followup', label: 'Follow-up', icon: Zap, description: 'Automação' },
  { id: 'funnel', label: 'Funil', icon: GitBranch, description: 'Multi-agente' },
  { id: 'zapsign', label: 'ZapSign', icon: FileSignature, description: 'Assinatura digital' },
  { id: 'research', label: 'Pesquisa', icon: Search, description: 'API Jurisprudencial' },
];

const SettingsView = ({ initialSection = 'profile' }: SettingsViewProps) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSettings />;
      case 'whatsapp': return <WhatsAppSettings />;
      case 'schedule': return <ScheduleSettings />;
      case 'notifications': return <NotificationSettings />;
      case 'followup': return <FollowupSettings />;
      case 'funnel': return <FunnelAgentsSettings />;
      case 'zapsign': return <ZapSignSettings />;
      case 'research': return <ResearchApiSettings />;
      case 'team': return <TeamMembersView />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar Menu */}
      <div className="w-64 border-r border-border bg-card/50 flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações
          </h1>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                  <div className="min-w-0">
                    <div className={cn("font-medium text-sm", isActive && "text-primary")}>{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <ScrollArea className="h-full">
          <div className="p-6 max-w-4xl">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SettingsView;
