import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import AgentsView from '@/components/dashboard/AgentsView';
import ContactsView from '@/components/dashboard/ContactsView';
import ConversationsView from '@/components/dashboard/ConversationsView';
import SettingsView from '@/components/dashboard/SettingsView';
import CRMKanbanView from '@/components/dashboard/CRMKanbanView';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('agents');

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
