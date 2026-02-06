import React from 'react';
import { motion } from 'framer-motion';
import { GridPattern } from '@/components/ui/grid-pattern';

type Testimonial = {
  name: string;
  role: string;
  company: string;
  quote: string;
  image: string;
};

const testimonials: Testimonial[] = [
  {
    name: 'Dra. Camila Ferreira',
    role: 'Sócia-fundadora',
    company: 'Ferreira & Machado Advogados',
    quote: 'O agente de IA reduziu em 70% o tempo que gastávamos com triagem de clientes. Hoje focamos no que importa: a advocacia estratégica.',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Dr. Rafael Oliveira',
    role: 'Advogado titular',
    company: 'Oliveira Advocacia',
    quote: 'O agendamento automático integrado ao Google Calendar transformou minha rotina. Nunca mais perdi uma consulta por desencontro de horários.',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Dra. Juliana Santos',
    role: 'Gestora jurídica',
    company: 'Santos & Barros Associados',
    quote: 'O CRM Kanban nos deu visibilidade total do funil. Aumentamos a conversão de leads em 40% no primeiro trimestre de uso.',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    name: 'Dr. Marcos Almeida',
    role: 'Sócio-diretor',
    company: 'Almeida, Costa & Advogados',
    quote: 'A assinatura digital via ZapSign agilizou demais o fechamento de contratos. Nossos clientes adoram a praticidade e segurança do processo.',
    image: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    name: 'Dra. Beatriz Mendes',
    role: 'Advogada especialista',
    company: 'Mendes Advocacia Criminal',
    quote: 'A base de conhecimento com IA responde perguntas frequentes com precisão impressionante. Liberou minha equipe para casos mais complexos.',
    image: 'https://randomuser.me/api/portraits/women/65.jpg',
  },
  {
    name: 'Dr. Lucas Ribeiro',
    role: 'Coordenador jurídico',
    company: 'Ribeiro & Associados',
    quote: 'Atendemos 24 horas sem precisar de plantão. O agente qualifica leads durante a madrugada e já agenda a consulta para o dia seguinte.',
    image: 'https://randomuser.me/api/portraits/men/52.jpg',
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative w-full py-24 md:py-32 px-4">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-2 text-center">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider">
            Depoimentos
          </span>
          <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl text-foreground">
            Quem usa, recomenda
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Veja como escritórios de advocacia estão transformando seus resultados com a plataforma.
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ name, role, company, quote, image }, index) => (
            <motion.div
              initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
              whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index + 0.1, duration: 0.8 }}
              key={index}
              className="border-foreground/25 relative grid grid-cols-[auto_1fr] gap-x-3 overflow-hidden border border-dashed p-4"
            >
              <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                <div className="from-foreground/5 to-foreground/2 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                  <GridPattern
                    width={25}
                    height={25}
                    x={-12}
                    y={4}
                    strokeDasharray="3"
                    className="stroke-foreground/20 absolute inset-0 h-full w-full mix-blend-overlay"
                  />
                </div>
              </div>
              <img
                alt={name}
                src={image}
                loading="lazy"
                className="size-9 rounded-full"
              />
              <div>
                <div className="-mt-0.5 -space-y-0.5">
                  <p className="text-sm md:text-base text-foreground">{name}</p>
                  <span className="text-muted-foreground block text-[11px] font-light tracking-tight">
                    {role} · {company}
                  </span>
                </div>
                <blockquote className="mt-3">
                  <p className="text-foreground text-sm font-light tracking-wide">
                    "{quote}"
                  </p>
                </blockquote>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
