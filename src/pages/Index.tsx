import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Calendar, MessageSquare, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Advocacia IA</h1>
          <Link to="/auth">
            <Button variant="default" size="sm">
              Entrar
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Automatize o atendimento do seu escritório de advocacia com IA
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            O <strong>Advocacia IA</strong> é uma plataforma que utiliza inteligência artificial para
            automatizar atendimentos via WhatsApp, agendamentos no Google Calendar e gestão de leads
            — tudo integrado para advogados e escritórios de advocacia.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-base px-8">
              Começar agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-primary" />}
              title="Agentes de IA"
              description="Crie agentes inteligentes que atendem seus clientes automaticamente pelo WhatsApp."
            />
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 text-primary" />}
              title="WhatsApp Integrado"
              description="Receba e responda mensagens de clientes diretamente na plataforma."
            />
            <FeatureCard
              icon={<Calendar className="w-8 h-8 text-primary" />}
              title="Agendamento Automático"
              description="Integre com o Google Calendar para agendar consultas automaticamente."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-primary" />}
              title="CRM Jurídico"
              description="Gerencie leads, acompanhe casos e organize seu funil de clientes."
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} Advocacia IA. Todos os direitos reservados.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Termos de Serviço
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-6 space-y-3">
    {icon}
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;
