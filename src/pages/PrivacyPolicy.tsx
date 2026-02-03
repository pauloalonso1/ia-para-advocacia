import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma de automação de atendimento via WhatsApp com agentes de IA. Ao usar nossos serviços, você concorda com as práticas descritas nesta política.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Coletamos os seguintes tipos de informações:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Informações de Conta:</strong> Nome, e-mail e dados de autenticação quando você cria uma conta.</li>
              <li><strong>Dados de Integração:</strong> Informações necessárias para conectar com WhatsApp Business API (Evolution API) e Google Calendar.</li>
              <li><strong>Conversas:</strong> Histórico de mensagens entre seus clientes e os agentes de IA para fins de atendimento e melhoria do serviço.</li>
              <li><strong>Contatos:</strong> Informações de contatos de clientes que você gerencia na plataforma (nome, telefone, e-mail, empresa).</li>
              <li><strong>Dados de Uso:</strong> Informações sobre como você utiliza a plataforma para melhorar nossos serviços.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Fornecer e manter nossos serviços de automação de atendimento.</li>
              <li>Processar e responder mensagens através dos agentes de IA.</li>
              <li>Integrar com Google Calendar para agendamentos automáticos.</li>
              <li>Enviar notificações sobre novos leads, agendamentos e atualizações importantes.</li>
              <li>Melhorar e personalizar a experiência do usuário.</li>
              <li>Garantir a segurança e prevenir fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Integrações de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Nossa plataforma integra com os seguintes serviços:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Evolution API / WhatsApp:</strong> Para envio e recebimento de mensagens via WhatsApp.</li>
              <li><strong>Google Calendar:</strong> Para verificar disponibilidade e criar agendamentos (com seu consentimento explícito).</li>
              <li><strong>OpenAI:</strong> Para processamento de linguagem natural dos agentes de IA.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Cada integração está sujeita às políticas de privacidade dos respectivos serviços. Recomendamos que você revise as políticas de privacidade do Google, WhatsApp/Meta e OpenAI.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Google Calendar</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Quando você conecta seu Google Calendar, solicitamos acesso para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Visualizar eventos:</strong> Para verificar sua disponibilidade e evitar conflitos de agendamento.</li>
              <li><strong>Criar eventos:</strong> Para agendar compromissos automaticamente com seus clientes.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Você pode revogar este acesso a qualquer momento nas configurações da plataforma ou diretamente nas configurações de segurança da sua conta Google.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Armazenamento e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados de forma segura utilizando criptografia e práticas de segurança padrão da indústria. Tokens de acesso a serviços de terceiros (como Google Calendar) são armazenados de forma criptografada e são atualizados automaticamente conforme necessário.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas quando necessário para fornecer nossos serviços (como com provedores de infraestrutura) ou quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Você tem o direito de:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Acessar e exportar seus dados pessoais.</li>
              <li>Corrigir informações incorretas.</li>
              <li>Solicitar a exclusão de seus dados.</li>
              <li>Revogar consentimentos para integrações específicas.</li>
              <li>Cancelar sua conta a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. Quando você solicita a exclusão da conta, removemos seus dados pessoais dentro de 30 dias, exceto quando a retenção for necessária para cumprir obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas através do e-mail cadastrado ou por meio de um aviso em nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato conosco através das configurações da plataforma ou pelo e-mail de suporte.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
