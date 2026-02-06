import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CalendarRequest {
  action: "save-calendar-id" | "list-events" | "create-event" | "available-slots" | "status" | "disconnect";
  email?: string;
  calendarId?: string;
  startDate?: string;
  endDate?: string;
  event?: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    attendeeEmail?: string;
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CalendarRequest = await req.json();
    const { action } = body;

    switch (action) {
      case "save-calendar-id": {
        const { email, calendarId } = body;
        if (!email?.trim() || !calendarId?.trim()) {
          return new Response(
            JSON.stringify({ error: "Email e Calendar ID são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Save calendar_id to the tokens table (reusing existing table structure)
        const { error: upsertError } = await supabase
          .from("google_calendar_tokens")
          .upsert({
            user_id: user.id,
            calendar_id: calendarId.trim(),
            access_token: email.trim(), // Store email in access_token field for reference
            refresh_token: "calendar-id-mode", // Marker for this mode
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          return new Response(
            JSON.stringify({ error: "Erro ao salvar configuração", details: upsertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Agenda vinculada com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        const { data: tokenData } = await supabase
          .from("google_calendar_tokens")
          .select("calendar_id, access_token")
          .eq("user_id", user.id)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            connected: !!tokenData?.calendar_id,
            calendarId: tokenData?.calendar_id || null,
            email: tokenData?.refresh_token === "calendar-id-mode" ? tokenData?.access_token : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        const { error } = await supabase
          .from("google_calendar_tokens")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao desconectar" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-events": {
        const calendarId = await getCalendarId(supabase, user.id);
        if (!calendarId) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { startDate, endDate } = body;
        const timeMin = startDate || new Date().toISOString();
        const timeMax = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const eventsData = await eventsResponse.json();
        if (!eventsResponse.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch events", details: eventsData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ events: eventsData.items || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create-event": {
        const calendarId = await getCalendarId(supabase, user.id);
        if (!calendarId) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { event } = body;
        if (!event) {
          return new Response(
            JSON.stringify({ error: "Event data is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const calendarEvent: any = {
          summary: event.summary,
          description: event.description || "",
          start: { dateTime: event.startDateTime, timeZone: "America/Sao_Paulo" },
          end: { dateTime: event.endDateTime, timeZone: "America/Sao_Paulo" },
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" }
            }
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 60 },
              { method: "popup", minutes: 10 }
            ]
          }
        };

        if (event.attendeeEmail) {
          calendarEvent.attendees = [{ email: event.attendeeEmail }];
          calendarEvent.guestsCanModify = false;
          calendarEvent.guestsCanInviteOthers = false;
          calendarEvent.guestsCanSeeOtherGuests = true;
        }

        const createResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(calendarEvent),
          }
        );

        const createdEvent = await createResponse.json();
        if (!createResponse.ok) {
          return new Response(
            JSON.stringify({ error: "Failed to create event", details: createdEvent }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, event: createdEvent }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "available-slots": {
        const calendarId = await getCalendarId(supabase, user.id);
        if (!calendarId) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user's schedule settings
        const { data: scheduleSettings } = await supabase
          .from("schedule_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        const workStartHour = scheduleSettings?.work_start_hour ?? 9;
        const workEndHour = scheduleSettings?.work_end_hour ?? 18;
        const lunchStartHour = scheduleSettings?.lunch_start_hour ?? null;
        const lunchEndHour = scheduleSettings?.lunch_end_hour ?? null;
        const appointmentDuration = scheduleSettings?.appointment_duration_minutes ?? 60;
        const workDays: number[] = scheduleSettings?.work_days ?? [1, 2, 3, 4, 5];

        const { startDate, endDate } = body;
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const eventsData = await eventsResponse.json();
        const busySlots = (eventsData.items || []).map((event: any) => ({
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
        }));

        const SP_OFFSET_HOURS = 3;
        const availableSlots: { start: string; end: string }[] = [];
        const currentDate = new Date(start);
        currentDate.setUTCHours(0, 0, 0, 0);
        const slotDurationMs = appointmentDuration * 60 * 1000;

        while (currentDate <= end) {
          const spDate = new Date(currentDate.getTime() - SP_OFFSET_HOURS * 3600000);
          const dayOfWeek = spDate.getUTCDay();

          if (workDays.includes(dayOfWeek)) {
            let currentHour = workStartHour;
            let currentMinute = 0;

            while (currentHour < workEndHour) {
              const isLunchTime = lunchStartHour !== null && lunchEndHour !== null &&
                currentHour >= lunchStartHour && currentHour < lunchEndHour;

              if (!isLunchTime) {
                const slotStart = new Date(currentDate);
                slotStart.setUTCHours(currentHour + SP_OFFSET_HOURS, currentMinute, 0, 0);
                const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

                if (slotStart > new Date()) {
                  const isBusy = busySlots.some((busy: any) => {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);
                    return slotStart < busyEnd && slotEnd > busyStart;
                  });

                  if (!isBusy) {
                    availableSlots.push({
                      start: slotStart.toISOString(),
                      end: slotEnd.toISOString(),
                    });
                  }
                }
              }

              currentMinute += appointmentDuration;
              if (currentMinute >= 60) {
                currentHour += Math.floor(currentMinute / 60);
                currentMinute = currentMinute % 60;
              }
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return new Response(
          JSON.stringify({ slots: availableSlots.slice(0, 20) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Google Calendar error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getCalendarId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.calendar_id || null;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenData) return null;

  // If using calendar-id-mode (no OAuth), we can't make API calls with user tokens
  // Return null to indicate no direct API access
  if (tokenData.refresh_token === "calendar-id-mode") {
    // For calendar-id mode, we'll use a service approach
    // For now, return null - the calendar ID is stored for agent reference
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  console.log("Refreshing access token...");
  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenData.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshResponse.json();
  if (!refreshResponse.ok || refreshData.error) {
    console.error("Failed to refresh token:", refreshData);
    return null;
  }

  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", userId);

  return refreshData.access_token;
}
