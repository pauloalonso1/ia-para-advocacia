import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou usar nossa plataforma de automação de atendimento via WhatsApp com agentes de IA, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não poderá acessar ou usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nossa plataforma oferece:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Criação e gerenciamento de agentes de IA para atendimento automatizado.</li>
              <li>Integração com WhatsApp Business API para comunicação com clientes.</li>
              <li>Integração com Google Calendar para agendamento automático.</li>
              <li>Gerenciamento de contatos e CRM básico.</li>
              <li>Painel de métricas e conversas.</li>
              <li>Sistema de notificações para eventos importantes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Para usar nossos serviços, você deve:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Ter pelo menos 18 anos de idade.</li>
              <li>Fornecer informações precisas e completas durante o cadastro.</li>
              <li>Manter a segurança de sua senha e credenciais de acesso.</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Você é responsável por todas as atividades que ocorrem em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Ao usar nossa plataforma, você concorda em NÃO:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Enviar spam, mensagens não solicitadas ou conteúdo malicioso.</li>
              <li>Violar leis aplicáveis, incluindo regulamentações de privacidade e proteção de dados.</li>
              <li>Usar os serviços para fins ilegais, fraudulentos ou prejudiciais.</li>
              <li>Tentar acessar sistemas ou dados não autorizados.</li>
              <li>Interferir no funcionamento adequado da plataforma.</li>
              <li>Revender ou redistribuir nossos serviços sem autorização.</li>
              <li>Violar as políticas de uso do WhatsApp ou outros serviços integrados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Integrações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nossa plataforma permite integrações com serviços de terceiros:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>WhatsApp/Evolution API:</strong> Você é responsável por cumprir os Termos de Serviço do WhatsApp Business.</li>
              <li><strong>Google Calendar:</strong> A integração está sujeita aos Termos de Serviço do Google.</li>
              <li><strong>OpenAI:</strong> O uso de IA está sujeito às políticas de uso da OpenAI.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Não nos responsabilizamos por alterações, interrupções ou descontinuação de serviços de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Agentes de IA</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sobre o uso de agentes de IA:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Você é responsável pelo conteúdo e configuração dos seus agentes.</li>
              <li>Os agentes devem seguir as diretrizes éticas e legais aplicáveis.</li>
              <li>Respostas geradas por IA podem conter imprecisões; supervisão humana é recomendada.</li>
              <li>Você deve informar seus clientes que estão interagindo com um sistema automatizado quando aplicável.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma, incluindo seu código, design, logos e conteúdo, são de nossa propriedade ou licenciados para nós. Você mantém a propriedade do conteúdo que você cria (como configurações de agentes e dados de clientes). Ao usar nossos serviços, você nos concede uma licença limitada para processar seus dados conforme necessário para fornecer os serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Privacidade e Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              O uso de dados pessoais é regido pela nossa <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>. Você é responsável por obter o consentimento adequado de seus clientes para coletar e processar seus dados através de nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Disponibilidade do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos esforçamos para manter nossos serviços disponíveis 24/7, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas ou de emergência. Não nos responsabilizamos por interrupções causadas por terceiros ou força maior.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Na extensão máxima permitida por lei, não seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou incapacidade de usar nossos serviços. Nossa responsabilidade total não excederá o valor pago por você pelos serviços nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Indenização</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você concorda em nos indenizar e isentar de responsabilidade contra quaisquer reivindicações, danos ou despesas decorrentes de: (a) seu uso dos serviços; (b) violação destes termos; (c) violação de direitos de terceiros; ou (d) conteúdo que você enviar através da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos suspender ou encerrar seu acesso aos serviços a qualquer momento, com ou sem motivo, com ou sem aviso prévio. Você pode encerrar sua conta a qualquer momento através das configurações da plataforma. Após o encerramento, suas obrigações sob estes termos continuarão conforme aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas através de e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais competentes do Brasil, com renúncia a qualquer outro foro por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos de Serviço, entre em contato conosco através das configurações da plataforma ou pelo e-mail de suporte.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
