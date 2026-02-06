import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle2, XCircle, Crown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import * as PricingCard from '@/components/ui/pricing-card';

type PlanData = {
  name: string;
  icon: React.ReactNode;
  badge: string;
  price: string;
  originalPrice?: string;
  period: string;
  ctaLabel: string;
  highlighted?: boolean;
  features: string[];
  proLabel?: string;
  proFeatures?: string[];
};

const plans: PlanData[] = [
  {
    name: 'Essencial',
    icon: <Users aria-hidden />,
    badge: 'Para advogados solo',
    price: 'R$197',
    originalPrice: 'R$247',
    period: '/ mês',
    ctaLabel: 'Começar agora',
    features: [
      '1 usuário',
      '1 agente de IA',
      'WhatsApp integrado',
      'CRM Jurídico (Kanban)',
      'Até 500 atendimentos/mês',
    ],
    proLabel: 'Funcionalidades Pro',
    proFeatures: [
      'Agendamento automático',
      'Contratos e assinatura digital',
      'Base de conhecimento (RAG)',
    ],
  },
  {
    name: 'Profissional',
    icon: <Crown aria-hidden />,
    badge: 'Mais popular',
    price: 'R$397',
    originalPrice: 'R$497',
    period: '/ mês',
    ctaLabel: 'Escolher Profissional',
    highlighted: true,
    features: [
      'Até 5 usuários',
      '3 agentes de IA',
      'WhatsApp integrado',
      'CRM Jurídico (Kanban)',
      'Atendimentos ilimitados',
      'Agendamento automático',
      'Contratos e assinatura digital',
    ],
    proLabel: 'Funcionalidades Escritório',
    proFeatures: [
      'Base de conhecimento (RAG)',
      'Relatórios avançados',
    ],
  },
  {
    name: 'Escritório',
    icon: <Building2 aria-hidden />,
    badge: 'Para equipes',
    price: 'R$697',
    originalPrice: 'R$897',
    period: '/ mês',
    ctaLabel: 'Falar com consultor',
    features: [
      'Usuários ilimitados',
      'Agentes ilimitados',
      'WhatsApp integrado',
      'CRM Jurídico (Kanban)',
      'Atendimentos ilimitados',
      'Agendamento automático',
      'Contratos e assinatura digital',
      'Base de conhecimento (RAG)',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
];

const PlanCard = ({ plan }: { plan: PlanData }) => (
  <PricingCard.Card
    className={cn(
      plan.highlighted && 'border-primary/50 bg-primary/5 dark:bg-primary/5'
    )}
  >
    <PricingCard.Header>
      <PricingCard.Plan>
        <PricingCard.PlanName>
          {plan.icon}
          <span className="text-muted-foreground">{plan.name}</span>
        </PricingCard.PlanName>
        <PricingCard.Badge
          className={cn(
            plan.highlighted && 'border-primary/40 bg-primary/10 text-primary'
          )}
        >
          {plan.badge}
        </PricingCard.Badge>
      </PricingCard.Plan>

      <PricingCard.Price>
        <PricingCard.MainPrice>{plan.price}</PricingCard.MainPrice>
        <PricingCard.Period>{plan.period}</PricingCard.Period>
        {plan.originalPrice && (
          <PricingCard.OriginalPrice>
            {plan.originalPrice}
          </PricingCard.OriginalPrice>
        )}
      </PricingCard.Price>

      {plan.highlighted ? (
        <Link to="/auth" className="block w-full">
          <RainbowButton className="w-full text-sm font-semibold h-10">
            {plan.ctaLabel}
          </RainbowButton>
        </Link>
      ) : (
        <Button asChild className="w-full font-semibold">
          <Link to="/auth">{plan.ctaLabel}</Link>
        </Button>
      )}
    </PricingCard.Header>

    <PricingCard.Body>
      <PricingCard.List>
        {plan.features.map((item, i) => (
          <PricingCard.ListItem key={i}>
            <span className="mt-0.5">
              <CheckCircle2 className="size-4 text-green-500" aria-hidden />
            </span>
            <span>{item}</span>
          </PricingCard.ListItem>
        ))}
      </PricingCard.List>

      {plan.proLabel && plan.proFeatures && plan.proFeatures.length > 0 && (
        <>
          <PricingCard.Separator>{plan.proLabel}</PricingCard.Separator>
          <PricingCard.List>
            {plan.proFeatures.map((item, i) => (
              <PricingCard.ListItem key={i} className="opacity-75">
                <span className="mt-0.5">
                  <XCircle className="size-4 text-destructive" aria-hidden />
                </span>
                <span>{item}</span>
              </PricingCard.ListItem>
            ))}
          </PricingCard.List>
        </>
      )}
    </PricingCard.Body>
  </PricingCard.Card>
);

export const PricingSection = () => (
  <section id="pricing" className="py-24 md:py-32">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center mb-16">
        <span className="text-primary text-sm font-semibold uppercase tracking-wider">
          Planos
        </span>
        <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
          Escolha o plano ideal para seu escritório
        </h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Todos os planos incluem suporte e atualizações. Cancele quando quiser.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:items-stretch">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>
    </div>
  </section>
);
