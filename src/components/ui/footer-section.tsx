'use client';
import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Scale, MessageSquare, Instagram, Linkedin } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

const footerLinks: FooterSection[] = [
  {
    label: 'Produto',
    links: [
      { title: 'Funcionalidades', href: '#features' },
      { title: 'Como funciona', href: '#how-it-works' },
      { title: 'Benefícios', href: '#benefits' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { title: 'Política de Privacidade', href: '/privacy' },
      { title: 'Termos de Serviço', href: '/terms' },
    ],
  },
  {
    label: 'Conta',
    links: [
      { title: 'Entrar', href: '/auth' },
      { title: 'Criar conta', href: '/auth' },
    ],
  },
  {
    label: 'Social',
    links: [
      { title: 'Instagram', href: '#', icon: Instagram },
      { title: 'LinkedIn', href: '#', icon: Linkedin },
    ],
  },
];

export function Footer() {
  return (
    <footer className="md:rounded-t-6xl relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t border-border bg-[radial-gradient(35%_128px_at_50%_0%,hsl(var(--primary)/8%),transparent)] px-6 py-12 lg:py-16">
      <div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="size-6 text-primary" />
            <span className="text-lg font-bold text-foreground">Advocacia IA</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            Plataforma de automação inteligente para escritórios de advocacia. Do primeiro contato à assinatura do contrato.
          </p>
          <p className="text-muted-foreground mt-8 text-xs md:mt-0">
            © {new Date().getFullYear()} Advocacia IA. Todos os direitos reservados.
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-xs font-semibold text-foreground">{section.label}</h3>
                <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      {link.href.startsWith('/') ? (
                        <Link
                          to={link.href}
                          className="hover:text-foreground inline-flex items-center transition-all duration-300"
                        >
                          {link.icon && <link.icon className="me-1 size-4" />}
                          {link.title}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="hover:text-foreground inline-flex items-center transition-all duration-300"
                        >
                          {link.icon && <link.icon className="me-1 size-4" />}
                          {link.title}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}

type ViewAnimationProps = {
  delay?: number;
  className?: ComponentProps<typeof motion.div>['className'];
  children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
