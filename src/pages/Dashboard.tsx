import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import AgentsView from '@/components/dashboard/AgentsView';
import ContactsView from '@/components/dashboard/ContactsView';
import ConversationsView from '@/components/dashboard/ConversationsView';
import SettingsView from '@/components/dashboard/SettingsView';
import CRMKanbanView from '@/components/dashboard/CRMKanbanView';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TeamMembersView from '@/components/dashboard/TeamMembersView';
import PerformanceView from '@/components/dashboard/PerformanceView';
import MeetingsView from '@/components/dashboard/MeetingsView';
import KnowledgeBaseView from '@/components/dashboard/KnowledgeBaseView';
import { cn } from '@/lib/utils';

interface DashboardProps {
  initialTab?: string;
}

const Dashboard = ({ initialTab = 'dashboard' }: DashboardProps) => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab(initialTab);
    }
  }, [initialTab, tabFromUrl]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'agents':
        return <AgentsView />;
      case 'contacts':
        return <ContactsView />;
      case 'crm':
        return (
          <CRMKanbanView 
            onOpenConversation={() => {
              setActiveTab('conversations');
            }} 
          />
        );
      case 'conversations':
        return <ConversationsView />;
      case 'meetings':
        return <MeetingsView />;
      case 'knowledge':
        return <KnowledgeBaseView />;
      case 'team':
        return <TeamMembersView />;
      case 'performance':
        return <PerformanceView />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  const isFullHeightView = activeTab === 'conversations';

  return (
    <div className="min-h-screen h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className={cn("flex-1 overflow-auto", isFullHeightView && "overflow-hidden")}>
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
