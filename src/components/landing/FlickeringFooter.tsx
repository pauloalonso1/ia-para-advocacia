import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const footerLinks = [
  {
    title: "Produto",
    links: [
      { title: "Funcionalidades", href: "#features" },
      { title: "Como funciona", href: "#how-it-works" },
      { title: "Benefícios", href: "#benefits" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Política de Privacidade", href: "/privacy" },
      { title: "Termos de Serviço", href: "/terms" },
    ],
  },
  {
    title: "Conta",
    links: [
      { title: "Entrar", href: "/auth" },
      { title: "Criar conta", href: "/auth" },
    ],
  },
];

const BLUR_FADE_DELAY = 0.15;

export default function FlickeringFooter() {
  return (
    <footer className="relative border-t border-border overflow-hidden">
      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left side – branding */}
          <div className="flex-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: BLUR_FADE_DELAY * 2 }}
            >
              <span className="text-xl font-bold tracking-tight text-foreground">
                Advocacia IA
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: BLUR_FADE_DELAY * 3 }}
              className="text-sm text-muted-foreground max-w-xs leading-relaxed"
            >
              Plataforma de automação inteligente para escritórios de advocacia.
              Do primeiro contato à assinatura do contrato.
            </motion.p>
          </div>

          {/* Right side – link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerLinks.map((column, columnIndex) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: BLUR_FADE_DELAY * (4 + columnIndex) }}
                className="space-y-3"
              >
                <h4 className="text-sm font-semibold text-foreground">
                  {column.title}
                </h4>
                <ul className="space-y-2">
                  {column.links.map((link) => (
                    <li key={link.title}>
                      {link.href.startsWith("/") ? (
                        <Link
                          to={link.href}
                          className="group flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.title}
                          <ChevronRight className="ml-1 size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="group flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.title}
                          <ChevronRight className="ml-1 size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: BLUR_FADE_DELAY * 8 }}
          className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground"
        >
          <span>© {new Date().getFullYear()} Advocacia IA. Todos os direitos reservados.</span>
        </motion.div>
      </div>

      {/* Flickering Grid background */}
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="absolute inset-0 size-full"
          squareSize={4}
          gridGap={6}
          color="hsl(205, 88%, 53%)"
          maxOpacity={0.08}
          flickerChance={0.1}
        />
        {/* Gradient overlay to keep text readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80" />
      </div>
    </footer>
  );
}
