import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import AgentsView from '@/components/dashboard/AgentsView';
import { Bot, Users, MessageSquare, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const { user } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400">Visão geral do seu escritório</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Agentes Ativos</p>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">0%</span>
                  <span className="text-slate-500">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Leads Capturados</p>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">0%</span>
                  <span className="text-slate-500">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Mensagens Enviadas</p>
                    <p className="text-2xl font-bold text-white mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">0%</span>
                  <span className="text-slate-500">vs mês anterior</span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Taxa de Conversão</p>
                    <p className="text-2xl font-bold text-white mt-1">0%</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">0%</span>
                  <span className="text-slate-500">vs mês anterior</span>
                </div>
              </div>
            </div>

            {/* Welcome message */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Bem-vindo ao LegalAgent AI!</h2>
              <p className="text-slate-300">
                Comece criando seu primeiro agente de IA para automatizar atendimentos no WhatsApp.
                Vá para a aba "Agentes IA" para configurar seu primeiro assistente virtual.
              </p>
            </div>
          </div>
        );
      case 'agents':
        return <AgentsView />;
      case 'cases':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">Casos/Leads</h1>
            <p className="text-slate-400 mt-2">Em breve: gerencie seus leads e casos aqui.</p>
          </div>
        );
      case 'conversations':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">Conversas</h1>
            <p className="text-slate-400 mt-2">Em breve: visualize o histórico de conversas.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-slate-400 mt-2">Seu e-mail: {user?.email}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
