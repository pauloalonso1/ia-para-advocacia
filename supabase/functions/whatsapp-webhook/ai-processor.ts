// Main AI processing: builds context, calls AI, handles tool responses

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIChatCompletions } from "./ai-client.ts";
import { getCalendarAvailability, createCalendarEvent } from "./calendar-handler.ts";
import { searchRAGContext } from "./rag-engine.ts";
import { updateContactEmail } from "./messaging.ts";
import type { AIResponse } from "./types.ts";

export async function processWithAI(
  apiKey: string | null,
  lovableApiKey: string | null,
  supabaseUrl: string,
  supabaseServiceKey: string,
  rules: any,
  currentStep: any,
  nextStep: any,
  clientMessage: string,
  history: any[],
  allSteps: any[],
  clientName: string,
  clientPhone: string,
  hasCalendarConnected: boolean,
  userId: string,
  agentId: string,
  caseId: string,
  isScriptCompleted: boolean = false
): Promise<AIResponse> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let handoffContext = "";
  try {
    const { data: handoffRow } = await supabase
      .from("case_handoffs")
      .select("artifact, reason, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (handoffRow?.artifact) {
      handoffContext = `\n\n🔁 CONTEXTO DE TRANSFERÊNCIA (handoff):\nMotivo: ${handoffRow.reason || ""}\nArtifact: ${JSON.stringify(handoffRow.artifact)}`;
    }
  } catch (e) {
    console.error("Handoff context load error:", e);
  }

  let caseFieldsContext = "";
  try {
    const { data: caseFieldsRow } = await supabase
      .from("case_fields")
      .select("fields, extracted_at")
      .eq("case_id", caseId)
      .maybeSingle();

    const fields = caseFieldsRow?.fields;
    if (fields && typeof fields === "object") {
      const safe = JSON.stringify(fields);
      caseFieldsContext = `\n\n🧾 CAMPOS ESTRUTURADOS DO CASO (fonte de verdade — não pergunte novamente se já estiver aqui):\nExtraído em: ${caseFieldsRow.extracted_at || ""}\nCampos: ${safe}`;
    }
  } catch (e) {
    console.error("Case fields load error:", e);
  }

  // === Calendar deterministic auto-booking (only when script is completed or no script) ===
  const hasActiveScript = !!currentStep || (allSteps.length > 0 && !isScriptCompleted);
  const isSchedulingAgent = allSteps.some((s: any) => /agend|calend|consult|reunião|horário/i.test(String(s.situation || "") + " " + String(s.message_to_send || "")));
  const allowCalendar = hasCalendarConnected && (!hasActiveScript || isSchedulingAgent);
  if (allowCalendar && !hasActiveScript) {
    const autoResult = await tryCalendarAutoBook(
      supabase, userId, clientPhone, clientName, clientMessage, history
    );
    if (autoResult) return autoResult;
  }

  // === Build context ===
  const collectedDataContext = buildCollectedDataContext(history);
  const scriptContext = buildScriptContext(allSteps, currentStep, nextStep, isScriptCompleted);
  const calendarContext = allowCalendar ? buildCalendarContext() : "";

  // RAG search
  let ragContext = "";
  try {
    ragContext = await searchRAGContext(supabase, apiKey, lovableApiKey, userId, agentId, clientMessage, clientPhone);
    if (ragContext) console.log(`🧠 RAG context injected (${ragContext.length} chars)`);
  } catch (e) {
    console.error("RAG context error:", e);
  }

  const knowledgeBaseContext = ragContext
    ? `\n\n📚 BASE DE CONHECIMENTO (informações relevantes encontradas):\n${ragContext}\n\nIMPORTANTE: Use as informações acima para fundamentar suas respostas quando relevantes. Cite os dados da base de conhecimento de forma natural na conversa.`
    : "";

  const systemPrompt = buildSystemPrompt(rules, scriptContext, collectedDataContext, caseFieldsContext, calendarContext, knowledgeBaseContext, handoffContext, clientName, clientPhone, allSteps, isScriptCompleted);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-25).map((h) => ({
      role: h.role === "client" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user" as const, content: clientMessage },
  ];

  // === Build tools ===
  const tools = buildTools(supabase, userId, allowCalendar, history, clientMessage);

  // Check ZapSign
  const { data: zapsignSettings } = await supabase
    .from("zapsign_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .maybeSingle();

  if (zapsignSettings) {
    tools.push(buildZapSignTool());
  }

  // === Fetch agent name for logging ===
  let agentName: string | undefined;
  try {
    const { data: agentData } = await supabase.from("agents").select("name").eq("id", agentId).maybeSingle();
    agentName = agentData?.name || undefined;
  } catch { /* ignore */ }

  // === First AI call ===
  const data = await callAIChatCompletions(apiKey, lovableApiKey, {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 500,
    tools,
    tool_choice: "auto",
  }, {
    userId,
    source: "whatsapp-webhook",
    agentId,
    agentName,
    contactPhone: clientPhone,
  });

  // === Handle tool calls ===
  return handleToolCalls(
    data, messages, tools, apiKey, lovableApiKey, supabase, userId,
    clientName, clientPhone, zapsignSettings, history, caseId
  );
}

// ========== Calendar auto-booking ==========

async function tryCalendarAutoBook(
  supabase: any, userId: string, clientPhone: string, clientName: string,
  clientMessage: string, history: any[]
): Promise<AIResponse | null> {
  const TZ = "America/Sao_Paulo";
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;

  const extractEmail = (text: string): string | null => {
    const m = text.match(emailRegex);
    return m?.[0]?.toLowerCase() ?? null;
  };

  const normalizeTime = (hour: number, minute: number) =>
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const parseSelection = (text: string): { date?: string; time?: string; weekday?: string } | null => {
    const lower = text.toLowerCase();
    const dateMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

    let time: string | undefined;
    const timeMatch = lower.match(/\b([01]?\d|2[0-3])\s*(?:(:|h)\s*([0-5]\d))\b|\b([01]?\d|2[0-3])\s*h\b/);
    if (timeMatch) {
      const hourStr = timeMatch[1] ?? timeMatch[4];
      const minuteStr = timeMatch[3] ?? "00";
      const hour = Number(hourStr);
      const minute = Number(minuteStr);
      if (!Number.isNaN(hour) && hour >= 0 && hour <= 23 && !Number.isNaN(minute) && minute >= 0 && minute <= 59) {
        time = normalizeTime(hour, minute);
      }
    }

    const weekdayCandidates = [
      { key: "domingo", words: ["domingo", "dom"] },
      { key: "segunda", words: ["segunda", "seg"] },
      { key: "terça", words: ["terça", "terca", "ter"] },
      { key: "quarta", words: ["quarta", "qua"] },
      { key: "quinta", words: ["quinta", "qui"] },
      { key: "sexta", words: ["sexta", "sex"] },
      { key: "sábado", words: ["sábado", "sabado", "sáb", "sab"] },
    ];

    let weekday: string | undefined;
    for (const c of weekdayCandidates) {
      if (c.words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower))) {
        weekday = c.key;
        break;
      }
    }

    const date = dateMatch?.[1];
    if (!date && !time && !weekday) return null;
    return { date: date ?? undefined, time, weekday };
  };

  const formatDateKeySP = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  const formatTimeSP = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

  const formatWeekdaySP = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(d).toLowerCase();

  // Check if slots were previously presented
  const hasPresentedSlots = history.some(
    (h) =>
      h.role !== "client" &&
      /hor[aá]rios\s*:/i.test(String(h.content || "")) &&
      (/\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || "")) ||
        /\d{2}\/\d{2}\/20\d{2}/.test(String(h.content || "")) ||
        /\d{1,2}:\d{2}/.test(String(h.content || "")))
  );

  const emailInMessage = extractEmail(clientMessage);
  const emailInHistory =
    (history.map((h) => extractEmail(String(h.content || ""))).find(Boolean) as string | undefined) ?? null;
  const email = emailInMessage ?? emailInHistory;

  const selectionFromMessage = emailRegex.test(clientMessage) ? null : parseSelection(clientMessage);

  const selectionFromHistory = (() => {
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.role !== "client") continue;
      const content = String(h.content || "");
      if (emailRegex.test(content)) continue;
      const sel = parseSelection(content);
      if (sel?.time) return sel;
    }
    return null;
  })();

  const selection = selectionFromMessage ?? selectionFromHistory;

  const shouldAutoBook =
    hasPresentedSlots &&
    !!email &&
    !!selection?.time &&
    (!!emailInMessage || !!selectionFromMessage);

  if (shouldAutoBook) {
    try {
      const slots = await getCalendarAvailability(supabase, userId, 14);
      const desiredTime = selection!.time!;
      const desiredDate = selection!.date;
      const desiredWeekday = selection!.weekday;

      const candidates = slots
        .map((s) => ({ raw: s, d: new Date(s.start) }))
        .filter(({ d }) => {
          const slotTime = formatTimeSP(d);
          if (slotTime !== desiredTime) return false;
          if (desiredDate) return formatDateKeySP(d) === desiredDate;
          if (desiredWeekday) return formatWeekdaySP(d).startsWith(desiredWeekday);
          return false;
        })
        .sort((a, b) => a.d.getTime() - b.d.getTime());

      const chosen = candidates[0];

      if (!chosen) {
        return {
          response_text: "Não encontrei esse horário livre no calendário. Pode escolher um dos horários que enviei (de preferência indicando o dia), por favor?",
          action: "STAY",
          next_intent: "SCHEDULE_CONSULT",
        };
      }

      const { data: scheduleSettings } = await supabase
        .from("schedule_settings")
        .select("appointment_duration_minutes")
        .eq("user_id", userId)
        .maybeSingle();

      const duration = scheduleSettings?.appointment_duration_minutes || 60;
      const dateKey = formatDateKeySP(chosen.d);
      const timeStr = formatTimeSP(chosen.d);
      const summary = `Consulta - ${clientName}`;

      console.log(`📅 Auto-booking: date=${dateKey}, time=${timeStr}, duration=${duration}, email=${email}`);

      const eventResult = await createCalendarEvent(supabase, userId, dateKey, timeStr, summary, duration, email);

      if (!eventResult.success) {
        return {
          response_text: `Desculpe, não consegui concluir o agendamento agora (${eventResult.error}). Quer tentar outro horário?`,
          action: "STAY",
          next_intent: "SCHEDULE_CONSULT",
        };
      }

      await updateContactEmail(supabase, userId, clientPhone, email);

      const firstName = clientName.split(" ")[0];

      return {
        response_text: `Perfeito, ${firstName}! Agendei sua consulta por videoconferência para *${dateKey}* às *${timeStr}*. Vou enviar o convite com o link do Google Meet no e-mail *${email}*.`,
        action: "STAY",
        new_status: "Qualificado",
        next_intent: "SCHEDULE_CONSULT",
      };
    } catch (e) {
      console.error("Auto-booking error:", e);
    }
  }

  // If user sends only email but no time selection
  if (hasPresentedSlots && !!emailInMessage && !selectionFromHistory?.time) {
    return {
      response_text: "Obrigado! Agora me diga qual horário você escolheu (ex: *quinta às 09:00*), para eu confirmar o agendamento e te enviar o convite.",
      action: "STAY",
      next_intent: "SCHEDULE_CONSULT",
    };
  }

  return null;
}

// ========== Context builders ==========

function buildCollectedDataContext(history: any[]): string {
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const collectedData: Record<string, string> = {};

  // Track conversation flow to extract data from client responses after assistant questions
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const content = String(h.content || "");

    if (h.role === "client") {
      // Extract email
      const emailMatch = content.match(emailRegex);
      if (emailMatch) collectedData["email"] = emailMatch[0].toLowerCase();

      // Check what the previous assistant message asked to categorize the response
      const prevAssistant = i > 0 ? String(history[i - 1]?.content || "") : "";

      // Name detection: response after "nome completo" question
      if (/nome completo/i.test(prevAssistant) && content.length > 3 && content.length < 100 && !emailRegex.test(content)) {
        collectedData["nome"] = content.trim();
      }

      // Legal area detection: response after "necessidade jurídica" or "área" question
      if (/necessidade jur[ií]dica|qual .* [áa]rea|tipo de caso|questão.*(trabalhista|familiar|imobili)/i.test(prevAssistant) && content.length > 2) {
        collectedData["área jurídica"] = content.trim();
      }

      // Urgency detection: response after urgency question
      if (/urg[êe]ncia|prazo|audi[êe]ncia marcada|situação de risco/i.test(prevAssistant) && content.length > 1) {
        collectedData["urgência"] = content.trim();
      }

      // Source detection: response after "como conheceu" question
      if (/como (você )?ficou sabendo|como conheceu|indicação.*redes.*google/i.test(prevAssistant) && content.length > 1) {
        collectedData["origem"] = content.trim();
      }
    }

    if (h.role === "assistant") {
      const confirmedEmail = content.match(/e-?mail[^(]*\(([^)]+@[^)]+)\)/i);
      if (confirmedEmail) collectedData["email"] = confirmedEmail[1].toLowerCase();
    }
  }

  return Object.keys(collectedData).length > 0
    ? `\n\n✅ DADOS JÁ COLETADOS (NUNCA peça novamente!):\n${Object.entries(collectedData).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
    : "";
}

function buildScriptContext(allSteps: any[], currentStep: any, nextStep: any, isScriptCompleted: boolean): string {
  const scriptContext = allSteps.map((s, i) =>
    `Etapa ${i + 1}: "${s.situation || "Sem descrição"}"`
  ).join("\n");

  const currentStepInfo = isScriptCompleted
    ? `\n\n✅ ROTEIRO CONCLUÍDO:\n- Todas as etapas já foram finalizadas.\n- NÃO repita nenhuma pergunta do roteiro.\n- Converse de forma natural e livre com o cliente.\n- Se o cliente fizer uma nova pergunta, responda diretamente.\n- Se o cliente se despedir, despeça-se de forma profissional.`
    : currentStep
      ? `\n\n📍 ETAPA ATUAL (${currentStep.step_order}/${allSteps.length}):\n- Situação: "${currentStep.situation || "Sem descrição"}"\n- Mensagem que você enviou: "${currentStep.message_to_send}"\n- Objetivo: Coletar a informação desta etapa antes de avançar`
      : "\n\nVocê está no início do atendimento.";

  const nextStepInfo = isScriptCompleted
    ? ""
    : nextStep
      ? `\n\n➡️ PRÓXIMA ETAPA (${nextStep.step_order}/${allSteps.length}):\n- Situação: "${nextStep.situation || "Sem descrição"}"\n- Mensagem a enviar: "${nextStep.message_to_send}"`
      : "\n\n⚠️ Esta é a ÚLTIMA etapa do roteiro.";

  return `📝 ROTEIRO COMPLETO:\n${scriptContext}${currentStepInfo}${nextStepInfo}`;
}

function buildConversationMemory(history: any[]): string {
  const recentHistory = history.slice(-30);
  return recentHistory.length > 0
    ? `\n\n💬 HISTÓRICO RECENTE (${recentHistory.length} últimas mensagens):\n${recentHistory.map((h) => `${h.role === "client" ? "👤 Cliente" : "🤖 Você"}: ${h.content}`).join("\n")}`
    : "";
}

function buildCalendarContext(): string {
  const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowSP = new Date(Date.now() - SP_OFFSET_MS);
  const currentDateStr = nowSP.toISOString().split("T")[0];
  const currentYear = nowSP.getUTCFullYear();
  const currentMonth = nowSP.getUTCMonth() + 1;
  const currentDay = nowSP.getUTCDate();
  const currentHourSP = nowSP.getUTCHours();
  const currentMinuteSP = nowSP.getUTCMinutes();
  const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const currentDayOfWeek = diasSemana[nowSP.getUTCDay()];

  return `\n\n📅 AGENDAMENTO DISPONÍVEL:
- HOJE É: ${currentDayOfWeek}, ${String(currentDay).padStart(2, "0")}/${String(currentMonth).padStart(2, "0")}/${currentYear} (${currentDateStr}), ${String(currentHourSP).padStart(2, "0")}:${String(currentMinuteSP).padStart(2, "0")} horário de Brasília
- ATENÇÃO: Use SEMPRE esta data como referência.
- Você TEM ACESSO ao calendário do escritório para agendar consultas.

FLUXO DE AGENDAMENTO (siga em ordem):
1. Se o cliente quer agendar mas você NÃO MOSTROU os horários ainda: use check_calendar_availability IMEDIATAMENTE
2. Se você JÁ MOSTROU os horários e o cliente ESCOLHEU um:
   - Se já tem email nos DADOS COLETADOS acima, use create_calendar_event DIRETO com o email!
   - Se NÃO tem email, peça o email UMA ÚNICA VEZ
3. NUNCA chame check_calendar_availability se já mostrou os horários e o cliente escolheu um!

⚠️ REGRA CRÍTICA:
- NUNCA responda com "um momento" sem chamar uma ferramenta ao mesmo tempo!
- Se você chamar uma ferramenta de calendário, NÃO chame send_response ao mesmo tempo.

IMPORTANTE:
- Ao criar eventos, use sempre o ano ${currentYear} nas datas
- Use APENAS datas FUTURAS (a partir de ${currentDateStr}). NUNCA agende em datas passadas!
- CONFIRA que a data do evento corresponde ao dia da semana correto antes de responder`;
}

function buildSystemPrompt(
  rules: any, scriptContext: string, collectedDataContext: string,
  conversationMemory: string, calendarContext: string, knowledgeBaseContext: string, handoffContext: string,
  clientName: string, clientPhone: string, allSteps: any[], isScriptCompleted: boolean
): string {
  return `Você é um assistente virtual de atendimento jurídico/profissional de ALTO NÍVEL. Você representa um escritório de advocacia e deve se comportar com a excelência, precisão e profissionalismo esperados de um advogado sênior.

${rules?.system_prompt || "Seja profissional, educado e objetivo nas respostas."}

🏆 PADRÃO DE EXCELÊNCIA:
- Seja CONCISO e DIRETO. Evite mensagens longas e repetitivas.
- Transmita confiança e competência em cada resposta.
- Use linguagem profissional mas acessível.
- Demonstre empatia genuína pela situação do cliente.
- NUNCA use emojis em excesso (máximo 1-2 por mensagem).

📋 REGRAS DO ATENDIMENTO:
${rules?.agent_rules || "- Seja cordial e profissional\n- Responda de forma clara e objetiva\n- Mantenha o foco no roteiro"}

🚫 PROIBIÇÕES ABSOLUTAS:
${rules?.forbidden_actions || "- Não forneça informações falsas\n- Não faça promessas que não pode cumprir\n- Não seja invasivo"}
- PROIBIÇÃO MÁXIMA: NUNCA peça uma informação que já está em DADOS COLETADOS ou no HISTÓRICO!
- Se o dado já foi coletado (nome, email, área jurídica, urgência, origem), avance para o próximo tema pendente.
- NUNCA repita a mesma pergunta, mesmo reformulada com palavras diferentes.
- NUNCA diga "como posso ajudá-lo?" se o cliente já explicou o que quer.
- Antes de CADA resposta, releia os DADOS COLETADOS e verifique se a pergunta que você ia fazer já foi respondida.
- NUNCA INVENTE horários disponíveis! SEMPRE use a ferramenta check_calendar_availability.
- Se o cliente disser "já te mandei/já falei/já informei", PROCURE a informação no histórico

${scriptContext}
${collectedDataContext}
${conversationMemory}
${calendarContext}
${knowledgeBaseContext}
${handoffContext}

👤 INFORMAÇÕES DO CLIENTE:
- Nome completo: ${clientName}
- Primeiro nome: ${clientName.split(" ")[0]}
- Telefone: ${clientPhone}

📛 REGRA DE NOME:
- SEMPRE chame o cliente APENAS pelo PRIMEIRO NOME ("${clientName.split(" ")[0]}"), NUNCA pelo nome completo ou composto.
- Exemplo: Se o nome é "Paulo Roberto Alonso", chame de "Paulo", NUNCA "Paulo Roberto" ou "Paulo Alonso".

📹 MODALIDADE DE CONSULTA:
- As consultas são realizadas EXCLUSIVAMENTE por videoconferência via Google Meet.
- NÃO existe opção de consulta presencial. NUNCA ofereça ou pergunte sobre modalidade presencial.
- Se o cliente mencionar "presencial", informe educadamente que as consultas são realizadas por videoconferência (Google Meet) e que ele receberá o link por e-mail.

🎯 INSTRUÇÕES DE DECISÃO:
1. Se o cliente respondeu adequadamente à pergunta da etapa atual → action "PROCEED"
   - Sua response_text SERÁ enviada ao cliente. Inclua um breve reconhecimento da resposta E a pergunta da PRÓXIMA etapa, personalizada.
   - NÃO tenha medo de usar PROCEED — o sistema enviará SUA mensagem, não o template fixo.
2. Se o cliente fez uma pergunta, comentário ou disse algo FORA DO CONTEXTO do roteiro → action "STAY"
   - Responda a pergunta/comentário de forma natural e completa.
   - NÃO force o roteiro imediatamente. Deixe o cliente se expressar.
   - Somente após responder, se fizer sentido, conduza suavemente de volta ao tema pendente.
   - Ex: "Ótima pergunta! [resposta]. Voltando ao nosso atendimento, [próxima pergunta do roteiro]"
3. Se o cliente deu resposta vaga ou incompleta à pergunta do roteiro → action "STAY"
   - Reformule a pergunta de forma mais clara, sem repetir exatamente a mesma frase.
4. Se for a última etapa e o cliente concordou → new_status "Qualificado"
5. Se o cliente demonstrar desinteresse → new_status "Não Qualificado"
6. SEMPRE use o nome do cliente de forma natural
7. Se o cliente pedir para agendar → USE as ferramentas de calendário
8. Mantenha respostas com no MÁXIMO 3-4 linhas (exceto quando listando horários)

📌 INTENÇÃO (next_intent) — sempre preencha:
- "DIRECT_CONTRACT": o cliente quer iniciar o processo e faz sentido enviar contrato agora (ZapSign)
- "SCHEDULE_CONSULT": é necessário agendar consulta (ou o cliente pediu agendamento)
- "CONTINUE": continuar conversa/triagem/roteiro sem contrato nem agendamento neste momento

🧠 FLEXIBILIDADE NO ROTEIRO:
- O roteiro é um GUIA, não uma prisão. Você deve seguir a ORDEM das etapas, mas com inteligência.
- Se o cliente mudar de assunto, ACOMPANHE a conversa naturalmente. Responda o que ele perguntou.
- Quando sentir que o momento é adequado, retome o roteiro de forma orgânica, sem parecer robótico.
- NUNCA ignore o que o cliente disse para forçar a próxima pergunta do roteiro.
- Se o cliente já forneceu a informação de uma etapa futura espontaneamente, reconheça e pule essa etapa quando chegar nela.

⚠️ REGRA PRIORITÁRIA SOBRE REPETIÇÃO:
- Se a etapa atual pede uma informação que JÁ ESTÁ nos DADOS COLETADOS acima, NÃO faça a pergunta!
- Em vez disso, responda com action "PROCEED" para pular para a próxima etapa.
- CONSULTE SEMPRE o HISTÓRICO antes de formular sua resposta. Se algo já foi discutido, NÃO repita.
- Resuma o que já sabe e avance para a próxima informação pendente.`;
}

// ========== Tools builder ==========

function buildTools(
  supabase: any, userId: string, hasCalendarConnected: boolean,
  history: any[], clientMessage: string
): any[] {
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "send_response",
        description: "Envia a resposta para o cliente e decide se avança no roteiro",
        parameters: {
          type: "object",
          properties: {
            response_text: { type: "string", description: "A mensagem a ser enviada para o cliente" },
            action: { type: "string", enum: ["PROCEED", "STAY"], description: "PROCEED para avançar, STAY para permanecer" },
            new_status: { type: "string", enum: ["Triagem / Viabilidade", "Especialista", "Qualificado", "Agendamento", "Consulta Marcada", "Aguardando Assinatura", "Não Qualificado", "Convertido", ""], description: "Novo status do lead se houver mudança" },
            next_intent: { type: "string", enum: ["DIRECT_CONTRACT", "SCHEDULE_CONSULT", "CONTINUE"], description: "Intenção determinística para bifurcação do workflow" },
          },
          required: ["response_text", "action", "next_intent"],
          additionalProperties: false,
        },
      },
    },
  ];

  if (hasCalendarConnected) {
    const recentMessages = history.slice(-10);
    const alreadyShowedSlots = recentMessages.some(
      (h) =>
        h.role === "assistant" &&
        /hor[aá]rios?\s*(?:disponíveis|que temos|:)/i.test(String(h.content || "")) &&
        (/\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || "")) ||
          /\d{2}\/\d{2}\/20\d{2}/.test(String(h.content || "")) ||
          /\d{1,2}:\d{2}/.test(String(h.content || "")))
    );

    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;
    const hasEmailInMessage = emailRegex.test(clientMessage);
    const hasEmailInHistory = history.some((h) => emailRegex.test(h.content));
    const hasEmail = hasEmailInMessage || hasEmailInHistory;
    const looksLikeTimeSelection = /\d{1,2}[:\s]?\d{0,2}|manhã|tarde|amanhã|segunda|terça|quarta|quinta|sexta/i.test(clientMessage);

    console.log(`📅 Context check: showedSlots=${alreadyShowedSlots}, hasEmail=${hasEmail}, timeSelection=${looksLikeTimeSelection}`);

    if (!alreadyShowedSlots) {
      tools.push({
        type: "function",
        function: {
          name: "check_calendar_availability",
          description: "Verifica os horários disponíveis para agendamento. USE SOMENTE quando o cliente pedir para agendar e você AINDA NÃO MOSTROU os horários.",
          parameters: {
            type: "object",
            properties: {
              days_ahead: { type: "number", description: "Quantos dias à frente verificar (padrão: 7)" },
            },
            required: [],
            additionalProperties: false,
          },
        },
      });
    }

    tools.push({
      type: "function",
      function: {
        name: "create_calendar_event",
        description: `CRIA O AGENDAMENTO no calendário. Use quando o cliente ESCOLHEU um horário e você TEM o email.${hasEmail ? " EMAIL DISPONÍVEL: Sim." : " EMAIL: Ainda não temos."}${looksLikeTimeSelection ? " SELEÇÃO DE HORÁRIO detectada." : ""}`,
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data YYYY-MM-DD" },
            time: { type: "string", description: "Horário HH:MM" },
            summary: { type: "string", description: "Título da reunião" },
            duration_minutes: { type: "number", description: "Duração em minutos" },
            client_email: { type: "string", description: "Email do cliente" },
          },
          required: ["date", "time", "summary"],
          additionalProperties: false,
        },
      },
    });
  }

  return tools;
}

function buildZapSignTool(): any {
  return {
    type: "function",
    function: {
      name: "send_zapsign_document",
      description: "Envia um documento para assinatura digital via ZapSign.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string", description: "ID/token do template. Use 'default' se não souber." },
          signer_name: { type: "string", description: "Nome do signatário" },
        },
        required: ["signer_name"],
        additionalProperties: false,
      },
    },
  };
}

// ========== Tool call handler ==========

async function handleToolCalls(
  data: any, messages: any[], tools: any[],
  apiKey: string | null, lovableApiKey: string | null,
  supabase: any, userId: string,
  clientName: string, clientPhone: string,
  zapsignSettings: any, history: any[], caseId: string
): Promise<AIResponse> {
  const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
  console.log(`🔧 Tool calls received: ${toolCalls.length}`);

  // Prioritize calendar/action tools over send_response
  const prioritizedToolCalls = [...toolCalls].sort((a: any, b: any) => {
    const priority = (name: string) => {
      if (name === "check_calendar_availability") return 0;
      if (name === "create_calendar_event") return 1;
      if (name === "send_zapsign_document") return 2;
      if (name === "send_response") return 10;
      return 5;
    };
    return priority(a.function?.name || "") - priority(b.function?.name || "");
  });

  const hasCalendarTool = prioritizedToolCalls.some((tc: any) =>
    tc.function?.name === "check_calendar_availability" || tc.function?.name === "create_calendar_event"
  );

  for (const toolCall of prioritizedToolCalls) {
    const funcName = toolCall.function?.name;
    const funcArgs = toolCall.function?.arguments;
    if (!funcName || !funcArgs) continue;

    if (funcName === "send_response" && hasCalendarTool) {
      console.log(`⏭️ Skipping send_response because calendar tool is present`);
      continue;
    }

    console.log(`🔧 Processing tool: ${funcName}`);

    if (funcName === "check_calendar_availability") {
      const result = await handleCheckAvailability(funcArgs, toolCall, messages, tools, apiKey, lovableApiKey, supabase, userId);
      if (result) return result;
    }

    if (funcName === "create_calendar_event") {
      const result = await handleCreateEvent(funcArgs, toolCall, messages, tools, apiKey, lovableApiKey, supabase, userId, clientName, clientPhone);
      if (result) return result;
    }

    if (funcName === "send_zapsign_document" && zapsignSettings) {
      const result = await handleZapSign(funcArgs, toolCall, messages, tools, apiKey, lovableApiKey, supabase, userId, caseId, clientName, clientPhone, zapsignSettings);
      if (result) return result;
    }

    if (funcName === "send_response") {
      try {
        const parsed = JSON.parse(funcArgs);
        console.log("🤖 Tool call response:", JSON.stringify(parsed));
        return {
          response_text: parsed.response_text || "Desculpe, pode repetir?",
          action: parsed.action === "PROCEED" ? "PROCEED" : "STAY",
          new_status: parsed.new_status || undefined,
          next_intent: parsed.next_intent || "CONTINUE",
        };
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }
  }

  // Fallback: parse content as JSON or plain text
  return parseFallbackResponse(data);
}

async function handleCheckAvailability(
  funcArgs: string, toolCall: any, messages: any[], tools: any[],
  apiKey: string | null, lovableApiKey: string | null,
  supabase: any, userId: string
): Promise<AIResponse | null> {
  try {
    const args = JSON.parse(funcArgs);
    const daysAhead = args.days_ahead || 7;
    const slots = await getCalendarAvailability(supabase, userId, daysAhead);
    console.log(`📅 Found ${slots.length} available slots`);

    const spNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const currentYear = spNow.getUTCFullYear();
    const currentDateStr = spNow.toISOString().split("T")[0];
    const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const currentDayOfWeek = diasSemana[spNow.getUTCDay()];

    const slotsByDate = new Map<string, { start: string; end: string }[]>();
    slots.slice(0, 20).forEach((s) => {
      const spDate = new Date(new Date(s.start).getTime() - 3 * 60 * 60 * 1000);
      const dateKey = spDate.toISOString().split("T")[0];
      if (!slotsByDate.has(dateKey)) slotsByDate.set(dateKey, []);
      slotsByDate.get(dateKey)!.push(s);
    });

    const diasSemanaSlots = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    let slotsText = "";
    slotsByDate.forEach((daySlots, _dateKey) => {
      const spDate = new Date(new Date(daySlots[0].start).getTime() - 3 * 60 * 60 * 1000);
      const dayName = diasSemanaSlots[spDate.getUTCDay()];
      const day = String(spDate.getUTCDate()).padStart(2, "0");
      const month = String(spDate.getUTCMonth() + 1).padStart(2, "0");
      const year = spDate.getUTCFullYear();
      const dateStr = `${dayName}, ${day}/${month}/${year}`;
      const dateKeyFormatted = `${year}-${month}-${day}`;

      const times = daySlots.map((s) => {
        const d = new Date(new Date(s.start).getTime() - 3 * 60 * 60 * 1000);
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      }).join(", ");

      slotsText += `📆 ${dateStr} (${dateKeyFormatted}):\n   Horários: ${times}\n\n`;
    });

    const followUpMessages = [
      ...messages,
      { role: "assistant" as const, content: "", tool_calls: [toolCall] },
      {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: `HOJE É ${currentDateStr} (${currentDayOfWeek}). Horários disponíveis (ano: ${currentYear}):\n\n${slotsText}\nApresente TODOS ao cliente. Use create_calendar_event com a data YYYY-MM-DD e horário escolhido. NUNCA invente datas.`,
      },
    ];

    const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      messages: followUpMessages,
      temperature: 0.7,
      max_tokens: 500,
      tools: [tools[0]],
      tool_choice: { type: "function", function: { name: "send_response" } },
    });

    const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
    if (finalToolCall?.function?.arguments) {
      const parsed = JSON.parse(finalToolCall.function.arguments);
      return {
        response_text: parsed.response_text || "Temos vários horários disponíveis! Qual prefere?",
        action: "STAY",
        new_status: undefined,
        next_intent: parsed.next_intent || "SCHEDULE_CONSULT",
      };
    }
  } catch (e) {
    console.error("Calendar availability error:", e);
  }
  return null;
}

async function handleCreateEvent(
  funcArgs: string, toolCall: any, messages: any[], tools: any[],
  apiKey: string | null, lovableApiKey: string | null,
  supabase: any, userId: string, clientName: string, clientPhone: string
): Promise<AIResponse | null> {
  try {
    const args = JSON.parse(funcArgs);

    const emailRegex = /^[\w.+-]+@[\w-]+\.[\w.-]+$/i;
    const clientEmail = args.client_email ? String(args.client_email).trim() : "";

    if (!clientEmail || !emailRegex.test(clientEmail)) {
      return {
        response_text: "Perfeito — para eu confirmar o agendamento e te enviar o convite, pode me informar seu e-mail, por favor?",
        action: "STAY",
        new_status: "Agendamento",
        next_intent: "SCHEDULE_CONSULT",
      };
    }

    const dateStr = String(args.date || "").trim();
    const timeStr = String(args.time || "").trim();
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(dateStr) || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
      return {
        response_text: "Pode confirmar o dia e o horário no formato *AAAA-MM-DD* e *HH:MM* (ex: *2026-02-12 09:00*)?",
        action: "STAY",
        new_status: "Agendamento",
        next_intent: "SCHEDULE_CONSULT",
      };
    }

    const { data: scheduleSettings } = await supabase
      .from("schedule_settings")
      .select("appointment_duration_minutes")
      .eq("user_id", userId)
      .maybeSingle();

    const defaultDuration = scheduleSettings?.appointment_duration_minutes || 60;
    const duration = args.duration_minutes || defaultDuration;

    // Ensure not in the past (São Paulo timezone)
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const [hh, mm] = timeStr.split(":").map(Number);
      const candidate = new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0));
      if (candidate.getTime() < Date.now() - 60_000) {
        return {
          response_text: "Esse horário parece estar no passado. Pode escolher um horário futuro, por favor?",
          action: "STAY",
          new_status: "Agendamento",
          next_intent: "SCHEDULE_CONSULT",
        };
      }
    } catch {
      // ignore
    }

    const clientEmailOrNull = clientEmail || null;

    console.log(`📅 Creating event: date=${dateStr}, time=${timeStr}, duration=${duration}min, email=${clientEmailOrNull || "none"}`);

    const eventResult = await createCalendarEvent(supabase, userId, dateStr, timeStr, args.summary, duration, clientEmailOrNull);

    if (eventResult.success) {
      console.log(`✅ Event created successfully`);

      try {
        await supabase.from("workflow_events").insert({
          user_id: userId,
          case_id: args.case_id || null,
          event_type: "calendar_event_created",
          from_status: null,
          to_status: "Consulta Marcada",
          from_agent_id: null,
          to_agent_id: null,
          metadata: { date: dateStr, time: timeStr, email: clientEmailOrNull },
        });
      } catch {}

      if (clientEmailOrNull) {
        await updateContactEmail(supabase, userId, clientPhone, clientEmailOrNull);
      }

      const followUpMessages = [
        ...messages,
        { role: "assistant" as const, content: "", tool_calls: [toolCall] },
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: `Agendamento criado!\nData: ${dateStr}\nHorário: ${timeStr}\nTítulo: ${args.summary}\n\nConfirme ao cliente.`,
        },
      ];

      const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
        model: "gpt-4o-mini",
        messages: followUpMessages,
        temperature: 0.7,
        max_tokens: 500,
        tools: [tools[0]],
        tool_choice: { type: "function", function: { name: "send_response" } },
      });

      const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
      if (finalToolCall?.function?.arguments) {
        const parsed = JSON.parse(finalToolCall.function.arguments);
        return {
          response_text: parsed.response_text || `Perfeito! Sua consulta foi agendada para ${args.date} às ${args.time}. Até lá!`,
          action: "STAY",
          new_status: "Consulta Marcada",
          next_intent: parsed.next_intent || "SCHEDULE_CONSULT",
        };
      }

      return {
        response_text: `Perfeito, ${clientName}! Sua consulta foi agendada para ${args.date} às ${args.time}. Até lá! 📅`,
        action: "STAY",
        new_status: "Consulta Marcada",
        next_intent: "SCHEDULE_CONSULT",
      };
    } else {
      console.error(`❌ Event creation failed: ${eventResult.error}`);
      return {
        response_text: `Desculpe, houve um problema ao agendar. Erro: ${eventResult.error}. Podemos tentar novamente?`,
        action: "STAY",
        new_status: undefined,
        next_intent: "SCHEDULE_CONSULT",
      };
    }
  } catch (e) {
    console.error("Calendar event creation error:", e);
    return {
      response_text: "Desculpe, houve um erro técnico ao agendar. Pode tentar novamente?",
      action: "STAY",
      new_status: undefined,
      next_intent: "SCHEDULE_CONSULT",
    };
  }
}

async function handleZapSign(
  funcArgs: string, toolCall: any, messages: any[], tools: any[],
  apiKey: string | null, lovableApiKey: string | null,
  supabase: any, userId: string, caseId: string,
  clientName: string, clientPhone: string, zapsignSettings: any
): Promise<AIResponse | null> {
  try {
    const args = JSON.parse(funcArgs);
    const signerName = args.signer_name || clientName;
    let templateId = args.template_id;

    // Guardrail: request full name if too short
    if (!/\b\p{L}+\b.*\b\p{L}+\b/u.test(String(signerName || "").trim())) {
      return {
        response_text: "Perfeito — para eu enviar o contrato, preciso do seu *nome completo* (como está no documento). Pode me informar, por favor?",
        action: "STAY",
        new_status: "Qualificado",
        next_intent: "DIRECT_CONTRACT",
      };
    }

    const ZAPSIGN_API_URL = zapsignSettings.sandbox_mode
      ? "https://sandbox.api.zapsign.com.br/api/v1"
      : "https://api.zapsign.com.br/api/v1";

    if (!templateId || templateId === "default") {
      const templatesResp = await fetch(`${ZAPSIGN_API_URL}/templates/`, {
        headers: { Authorization: `Bearer ${zapsignSettings.api_token}` },
      });
      if (templatesResp.ok) {
        const templatesData = await templatesResp.json();
        const templates = templatesData?.results || templatesData || [];
        if (Array.isArray(templates) && templates.length > 0) {
          templateId = templates[0].token;
        }
      }
    }

    if (!templateId) {
      return {
        response_text: `${signerName}, gostaria de enviar o contrato, mas não temos um modelo configurado. Vou verificar internamente!`,
        action: "STAY",
        new_status: undefined,
        next_intent: "DIRECT_CONTRACT",
      };
    }

    const payload = {
      template_id: templateId,
      signer_name: signerName,
      signers: [{
        name: signerName,
        phone_country: "55",
        phone_number: clientPhone.replace(/\D/g, ""),
        auth_mode: "assinaturaTela",
        send_automatic_whatsapp: true,
      }],
      data: [{ de: "{{nome}}", para: signerName }],
    };

    const docResp = await fetch(`${ZAPSIGN_API_URL}/models/create-doc/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zapsignSettings.api_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!docResp.ok) {
      const errText = await docResp.text();
      console.error("❌ ZapSign error:", docResp.status, errText);
      return {
        response_text: `${signerName}, tive um problema ao gerar o contrato. Vou tentar novamente em instantes!`,
        action: "STAY",
        new_status: undefined,
        next_intent: "DIRECT_CONTRACT",
      };
    }

    const docData = await docResp.json();
    console.log(`✅ ZapSign document created: ${docData.token || docData.open_id}`);

    // Persist tracking row so zapsign-webhook can map doc_token -> case_id
    try {
      const docToken = docData.token || docData.doc_token || docData.open_id;
      if (docToken) {
        await supabase.from("signed_documents").insert({
          user_id: userId,
          case_id: caseId || null,
          client_phone: clientPhone,
          client_name: signerName,
          doc_token: docToken,
          template_name: templateId || "default",
          status: "pending",
          zapsign_data: docData,
        });

        try {
          await supabase.from("workflow_events").insert({
            user_id: userId,
            case_id: caseId || null,
            event_type: "contract_sent",
            from_status: null,
            to_status: "Aguardando Assinatura",
            from_agent_id: null,
            to_agent_id: null,
            metadata: { doc_token: docToken, template_id: templateId || "default" },
          });
        } catch {}
      }
    } catch (e) {
      console.error("❌ Failed to persist signed_documents tracking row:", e);
    }

    const followUpMessages = [
      ...messages,
      { role: "assistant" as const, content: "", tool_calls: [toolCall] },
      {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: `Documento enviado com sucesso via ZapSign para o WhatsApp do cliente ${signerName}.`,
      },
    ];

    const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      messages: followUpMessages,
      temperature: 0.7,
      max_tokens: 300,
      tools: [tools[0]],
      tool_choice: { type: "function", function: { name: "send_response" } },
    });

    const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
    if (finalToolCall?.function?.arguments) {
      const parsed = JSON.parse(finalToolCall.function.arguments);
      return {
        response_text: parsed.response_text || `${signerName}, enviei o contrato no seu WhatsApp! 📄✍️`,
        action: "STAY",
        new_status: parsed.new_status || "Aguardando Assinatura",
        next_intent: parsed.next_intent || "DIRECT_CONTRACT",
      };
    }

    return {
      response_text: `${signerName}, acabei de enviar o contrato para assinatura digital no seu WhatsApp! É só clicar e assinar. 📄✍️`,
      action: "STAY",
      new_status: "Aguardando Assinatura",
      next_intent: "DIRECT_CONTRACT",
    };
  } catch (e) {
    console.error("ZapSign tool error:", e);
    return {
      response_text: "Desculpe, houve um erro ao enviar o documento. Vou tentar novamente em breve!",
      action: "STAY",
      new_status: undefined,
      next_intent: "DIRECT_CONTRACT",
    };
  }
}

function parseFallbackResponse(data: any): AIResponse {
  const content = data.choices?.[0]?.message?.content?.trim();
  console.log("🤖 Raw AI response:", content);

  if (content) {
    try {
      let jsonContent = content;
      if (content.includes("```")) {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonContent = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonContent);
      return {
        response_text: parsed.response_text || "Desculpe, pode repetir?",
        action: parsed.action === "PROCEED" ? "PROCEED" : "STAY",
        new_status: parsed.new_status || undefined,
        next_intent: parsed.next_intent || "CONTINUE",
      };
    } catch (_e) {
      console.log("ℹ️ AI returned plain text, using directly as response");

      const textLower = content.toLowerCase();
      let shouldProceed =
        textLower.includes('"action":"proceed"') ||
        textLower.includes('"action": "proceed"') ||
        textLower.includes("action: proceed") ||
        textLower.includes("«proceed»");

      let finalizationForced = false;
      if (!shouldProceed) {
        const finalizationKeywords = [
          "encaminhar", "encaminhando", "especialista responsável",
          "próximo especialista", "vou transferir", "transferindo",
          "concluímos", "finalizar", "roteiro completo", "roteiro concluído",
          "próxima etapa", "confirmar o que entendi", "deixe-me confirmar",
          "resumo do seu caso", "resumo do atendimento",
        ];
        if (finalizationKeywords.some((kw) => textLower.includes(kw))) {
          shouldProceed = true;
          finalizationForced = true;
          console.log("🔍 Detected finalization intent — forcing PROCEED");
        }
      }

      let detectedStatus: string | undefined;
      if (textLower.includes("qualificado")) detectedStatus = "Qualificado";
      if (textLower.includes("não qualificado")) detectedStatus = "Não Qualificado";

      let detectedIntent: "DIRECT_CONTRACT" | "SCHEDULE_CONSULT" | "CONTINUE" = "CONTINUE";
      if (textLower.includes("contrato") || textLower.includes("assinatura")) detectedIntent = "DIRECT_CONTRACT";
      if (textLower.includes("agend") || textLower.includes("horário") || textLower.includes("horario") || textLower.includes("consulta")) detectedIntent = "SCHEDULE_CONSULT";
      if (detectedStatus === "Aguardando Assinatura") detectedIntent = "DIRECT_CONTRACT";
      if (detectedStatus === "Agendamento" || detectedStatus === "Consulta Marcada") detectedIntent = "SCHEDULE_CONSULT";

      return {
        response_text: content,
        action: shouldProceed ? "PROCEED" : "STAY",
        new_status: detectedStatus,
        next_intent: detectedIntent,
        finalization_forced: finalizationForced || undefined,
      };
    }
  }

  console.log("⚠️ Using fallback response - no content from AI");
  return {
    response_text: "Obrigado pela informação! Para dar continuidade, pode me contar mais sobre sua situação?",
    action: "STAY",
    next_intent: "CONTINUE",
  };
}
