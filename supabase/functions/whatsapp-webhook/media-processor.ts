// Media processing: download from Evolution API and transcribe/describe with AI

import { callAIChatCompletions } from "./ai-client.ts";
import { withRetry } from "./retry.ts";

const FETCH_TIMEOUT_MS = 30_000;

// Download media from Evolution API (base64)
export async function downloadMediaFromEvolution(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageData: any
): Promise<string | null> {
  try {
    return await withRetry(async () => {
      const url = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
      console.log(`📥 Downloading media from Evolution API...`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: {
            key: messageData.key,
            message: messageData.message,
          },
          convertToMp4: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Evolution media download error:", response.status, errorText);
        throw new Error(`Evolution media download failed: ${response.status}`);
      }

      const data = await response.json();
      const base64 = data?.base64 || data?.data?.base64 || null;

      if (!base64) {
        console.error("No base64 data in Evolution response");
        return null;
      }

      console.log(`📥 Media downloaded: ${base64.length} chars base64`);
      return base64;
    }, "downloadMedia", { maxRetries: 2 });
  } catch (error) {
    console.error("Error downloading media:", error);
    return null;
  }
}

// Process media (audio/image/document) with OpenAI
export async function processMediaWithAI(
  apiKey: string | null,
  lovableApiKey: string | null,
  base64Data: string,
  mimeType: string,
  mediaType: "audio" | "image" | "document",
  caption?: string,
  fileName?: string
): Promise<string> {
  // For audio, use OpenAI Whisper API
  if (mediaType === "audio") {
    try {
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob([bytes], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, `audio.${extension}`);
      formData.append("model", "whisper-1");
      formData.append("language", "pt");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Whisper error:", response.status, errorText);
        return "[Áudio recebido - erro ao processar]";
      }

      const data = await response.json();
      const transcription = data.text || "[áudio inaudível]";
      return `🎤 [Transcrição de áudio]: ${transcription}`;
    } catch (error) {
      console.error("Audio processing error:", error);
      return "[Áudio recebido - erro técnico]";
    }
  }

  // For images and documents, use GPT-4o vision
  const systemPrompts: Record<string, string> = {
    image: `Você é um analisador de imagens para um sistema de atendimento jurídico via WhatsApp.
Descreva o conteúdo da imagem de forma objetiva e completa.
Se for um documento/texto fotografado, transcreva o texto visível.
Se for uma captura de tela, descreva o conteúdo.
Se for uma foto comum, descreva o que aparece.
Retorne APENAS a descrição/transcrição, sem comentários.`,
    document: `Você é um extrator de texto de documentos para um sistema jurídico.
Extraia TODO o texto do documento recebido, preservando a estrutura (títulos, parágrafos, listas).
Se for um PDF ou documento Word, transcreva todo o conteúdo visível.
Retorne APENAS o texto extraído, sem comentários.${fileName ? `\nNome do arquivo: ${fileName}` : ""}`,
  };

  const userContent: any[] = [
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`,
      },
    },
  ];

  if (caption) {
    userContent.push({
      type: "text",
      text: `Legenda enviada pelo cliente: "${caption}"`,
    });
  } else {
    userContent.push({
      type: "text",
      text: mediaType === "image"
        ? "Descreva esta imagem."
        : "Extraia o texto deste documento.",
    });
  }

  try {
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompts[mediaType] },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return `[${mediaType === "image" ? "Imagem" : "Documento"} recebido - conteúdo vazio]`;
    }

    const prefix = mediaType === "image"
      ? "📷 [Descrição de imagem]: "
      : `📄 [Texto extraído de ${fileName || "documento"}]: `;

    return prefix + result;
  } catch (error) {
    console.error(`Error processing ${mediaType}:`, error);
    return `[${mediaType === "image" ? "Imagem" : "Documento"} recebido - erro técnico]`;
  }
}
