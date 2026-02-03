import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import AgentsView from '@/components/dashboard/AgentsView';
import ContactsView from '@/components/dashboard/ContactsView';
import ConversationsView from '@/components/dashboard/ConversationsView';
import SettingsView from '@/components/dashboard/SettingsView';
import CRMKanbanView from '@/components/dashboard/CRMKanbanView';
import { Bot, MessageSquare, TrendingUp, ArrowUpRight, ArrowDownRight, Contact } from 'lucide-react';
import { cn } from '@/lib/utils';


const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('agents');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral do seu escritório</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Agentes Ativos</p>
                    <p className="text-2xl font-bold text-foreground mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">0%</span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Contatos</p>
                    <p className="text-2xl font-bold text-foreground mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Contact className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">0%</span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Mensagens Enviadas</p>
                    <p className="text-2xl font-bold text-foreground mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">0%</span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Taxa de Conversão</p>
                    <p className="text-2xl font-bold text-foreground mt-1">0%</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">0%</span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
            </div>

            {/* Welcome message */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Bem-vindo ao LegalAgent AI!</h2>
              <p className="text-muted-foreground">
                Comece criando seu primeiro agente de IA para automatizar atendimentos no WhatsApp.
                Vá para a aba "Agentes IA" para configurar seu primeiro assistente virtual.
              </p>
            </div>
          </div>
        );
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
