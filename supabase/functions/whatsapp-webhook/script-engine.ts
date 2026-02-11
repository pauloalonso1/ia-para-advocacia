// Script step auto-advance logic based on collected data analysis

// Extract which data keys have already been collected from conversation history
export function getCollectedDataKeys(history: any[]): Set<string> {
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const keys = new Set<string>();

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const content = String(h.content || "");

    if (h.role === "client") {
      if (emailRegex.test(content)) keys.add("email");

      const prevAssistant = i > 0 ? String(history[i - 1]?.content || "") : "";

      if (/nome completo/i.test(prevAssistant) && content.length > 3 && content.length < 100 && !emailRegex.test(content)) {
        keys.add("nome");
      }
      if (/necessidade jur[ií]dica|qual .* [áa]rea|tipo de caso|questão.*(trabalhista|familiar|imobili)/i.test(prevAssistant) && content.length > 2) {
        keys.add("área jurídica");
      }
      if (/urg[êe]ncia|prazo|audi[êe]ncia marcada|situação de risco/i.test(prevAssistant) && content.length > 1) {
        keys.add("urgência");
      }
      if (/como (você )?ficou sabendo|como conheceu|indicação.*redes.*google/i.test(prevAssistant) && content.length > 1) {
        keys.add("origem");
      }
    }
  }

  // Also check if client name was set on the case (pushName)
  if (history.some(h => h.role === "client" && /^[A-ZÀ-Ú][a-zà-ú]+ [A-ZÀ-Ú]/m.test(String(h.content || "").trim()))) {
    keys.add("nome");
  }

  return keys;
}

// Auto-advance past script steps whose data has already been collected
export async function autoAdvanceSteps(
  supabase: any,
  caseId: string,
  currentStep: any,
  currentStepIndex: number,
  steps: any[],
  history: any[]
): Promise<{ newStep: any; newIndex: number; advancedCount: number }> {
  if (!currentStep || steps.length === 0) {
    return { newStep: currentStep, newIndex: currentStepIndex, advancedCount: 0 };
  }

  const collectedKeys = getCollectedDataKeys(history);
  let advancedCount = 0;
  let idx = currentStepIndex;
  let step = currentStep;

  while (idx >= 0 && idx < steps.length - 1) {
    const stepSituation = (steps[idx]?.situation || "").toLowerCase();
    const stepMessage = (steps[idx]?.message_to_send || "").toLowerCase();
    const stepText = stepSituation + " " + stepMessage;

    let isDataCollected = false;
    if (/nome completo|saudação|primeiro contato/i.test(stepText) && collectedKeys.has("nome")) {
      isDataCollected = true;
    } else if (/[áa]rea|necessidade jur[ií]dica|tipo de caso/i.test(stepText) && collectedKeys.has("área jurídica")) {
      isDataCollected = true;
    } else if (/urg[êe]ncia|prazo|audi[êe]ncia/i.test(stepText) && collectedKeys.has("urgência")) {
      isDataCollected = true;
    } else if (/e-?mail|contato/i.test(stepText) && collectedKeys.has("email")) {
      isDataCollected = true;
    } else if (/como (você )?ficou sabendo|como conheceu|indicação/i.test(stepText) && collectedKeys.has("origem")) {
      isDataCollected = true;
    }

    if (!isDataCollected) break;

    advancedCount++;
    idx++;
    step = steps[idx];
  }

  if (advancedCount > 0) {
    console.log(`⏩ Auto-advanced ${advancedCount} steps (data already collected) → now at step ${idx + 1}/${steps.length}`);
    await supabase.from("cases").update({ current_step_id: step.id }).eq("id", caseId);
  }

  return { newStep: step, newIndex: idx, advancedCount };
}
