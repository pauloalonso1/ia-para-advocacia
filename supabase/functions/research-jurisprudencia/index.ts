import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's API settings
    const { data: settings, error: settingsError } = await supabase
      .from("research_api_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings || !settings.is_enabled) {
      return new Response(JSON.stringify({ error: "API de pesquisa não configurada. Configure em Configurações > Pesquisa." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data } = await req.json();

    if (settings.provider === "escavador") {
      return await handleEscavador(settings.api_key, action, data);
    } else if (settings.provider === "jusbrasil") {
      return await handleJusBrasil(settings.api_key, action, data);
    }

    return new Response(JSON.stringify({ error: "Provedor não suportado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("research error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleEscavador(apiKey: string, action: string, data: any): Promise<Response> {
  const baseUrlV2 = "https://api.escavador.com/api/v2";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
  };

  let url: string;
  let method = "GET";

  switch (action) {
    // Search processes by person name or CPF/CNPJ (V2 endpoint)
    case "search_processo":
    case "search": {
      const query = (data.query || "").trim();
      if (!query) {
        return new Response(JSON.stringify({ error: "Termo de busca é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Detect if query is a CNJ number (format: NNNNNNN-NN.NNNN.N.NN.NNNN)
      const cnjRegex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
      if (cnjRegex.test(query)) {
        // Direct CNJ lookup
        url = `${baseUrlV2}/processos/numero_cnj/${encodeURIComponent(query)}`;
      } else {
        // Search by person name or CPF/CNPJ
        const params = new URLSearchParams();
        
        // Detect if it's a CPF (11 digits) or CNPJ (14 digits)
        const digitsOnly = query.replace(/\D/g, "");
        if (digitsOnly.length === 11 || digitsOnly.length === 14) {
          params.set("cpf_cnpj", digitsOnly);
        } else {
          params.set("nome", query);
        }

        if (data.tribunal) {
          params.set("tribunais[]", data.tribunal);
        }

        url = `${baseUrlV2}/envolvido/processos?${params.toString()}`;
      }
      break;
    }

    // Search person's processes (same as above but explicit)
    case "search_pessoa": {
      const query = (data.query || "").trim();
      if (!query) {
        return new Response(JSON.stringify({ error: "Nome ou CPF/CNPJ é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params = new URLSearchParams();
      const digitsOnly = query.replace(/\D/g, "");
      if (digitsOnly.length === 11 || digitsOnly.length === 14) {
        params.set("cpf_cnpj", digitsOnly);
      } else {
        params.set("nome", query);
      }

      url = `${baseUrlV2}/envolvido/processos?${params.toString()}`;
      break;
    }

    // Get process details by CNJ number (V2)
    case "get_processo": {
      if (!data.numero_cnj) {
        return new Response(JSON.stringify({ error: "Número CNJ é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      url = `${baseUrlV2}/processos/numero_cnj/${encodeURIComponent(data.numero_cnj)}`;
      break;
    }

    // Get process movements (V2)
    case "get_movimentacoes": {
      if (!data.numero_cnj) {
        return new Response(JSON.stringify({ error: "Número CNJ é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams();
      if (data.limit) params.set("limit", String(data.limit));
      const queryStr = params.toString();
      url = `${baseUrlV2}/processos/numero_cnj/${encodeURIComponent(data.numero_cnj)}/movimentacoes${queryStr ? `?${queryStr}` : ""}`;
      break;
    }

    // Get processes by OAB (V2)
    case "search_oab": {
      if (!data.numero || !data.uf) {
        return new Response(JSON.stringify({ error: "Número da OAB e UF são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({
        oab_numero: String(data.numero),
        oab_estado: data.uf,
      });
      url = `${baseUrlV2}/advogado/processos?${params.toString()}`;
      break;
    }

    default:
      return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  console.log(`Escavador V2 request: ${method} ${url}`);
  const res = await fetch(url, { method, headers });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Escavador API error ${res.status}:`, errText.slice(0, 500));

    if (res.status === 401) {
      return new Response(JSON.stringify({ error: "API key inválida. Verifique sua chave nas configurações." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente na API do Escavador. Recarregue seus créditos." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 404) {
      return new Response(JSON.stringify({ error: "Nenhum resultado encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Erro na API do Escavador (${res.status})` }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await res.json();
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleJusBrasil(apiKey: string, action: string, data: any): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "A integração com JusBrasil está em desenvolvimento. Por enquanto, use o Escavador.",
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}