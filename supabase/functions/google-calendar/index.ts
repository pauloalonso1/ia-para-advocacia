import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalendarRequest {
  action: "auth-url" | "callback" | "list-events" | "create-event" | "available-slots" | "status";
  code?: string;
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

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
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

    // Get the redirect URI from the request origin or use a default
    const origin = req.headers.get("origin") || "https://pure-project-muse.lovable.app";
    const REDIRECT_URI = `${origin}/settings?tab=calendar`;

    switch (action) {
      case "auth-url": {
        // Generate OAuth URL for user to authorize
        const scopes = [
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events",
        ];

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", scopes.join(" "));
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", user.id);

        return new Response(
          JSON.stringify({ authUrl: authUrl.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "callback": {
        // Exchange authorization code for tokens
        const { code } = body;
        if (!code) {
          return new Response(
            JSON.stringify({ error: "Authorization code is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
          }),
        });

        const tokenData = await tokenResponse.json();
        console.log("Token response:", JSON.stringify(tokenData));

        if (!tokenResponse.ok || tokenData.error) {
          return new Response(
            JSON.stringify({ error: "Failed to exchange code", details: tokenData }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Store tokens in database
        const { error: upsertError } = await supabase
          .from("google_calendar_tokens")
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          return new Response(
            JSON.stringify({ error: "Failed to save tokens", details: upsertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Google Calendar connected successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        // Check if user has connected their calendar
        const { data: tokenData } = await supabase
          .from("google_calendar_tokens")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        return new Response(
          JSON.stringify({ 
            connected: !!tokenData,
            expiresAt: tokenData?.expires_at 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-events": {
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
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
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
          start: {
            dateTime: event.startDateTime,
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: event.endDateTime,
            timeZone: "America/Sao_Paulo",
          },
          // Add Google Meet conference link
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: "hangoutsMeet"
              }
            }
          },
          // Send notifications to attendees
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
          // Guest settings
          calendarEvent.guestsCanModify = false;
          calendarEvent.guestsCanInviteOthers = false;
          calendarEvent.guestsCanSeeOtherGuests = true;
        }

        // conferenceDataVersion=1 enables creating Google Meet links
        const createResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
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
        const accessToken = await getValidAccessToken(supabase, user.id);
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "Calendar not connected", code: "NOT_CONNECTED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { startDate, endDate } = body;
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Get existing events
        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const eventsData = await eventsResponse.json();
        const busySlots = (eventsData.items || []).map((event: any) => ({
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
        }));

        // Generate available slots (9h-18h, 1 hour slots)
        const availableSlots: { start: string; end: string }[] = [];
        const currentDate = new Date(start);
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate <= end) {
          // Skip weekends
          if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            for (let hour = 9; hour < 18; hour++) {
              const slotStart = new Date(currentDate);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart);
              slotEnd.setHours(hour + 1, 0, 0, 0);

              // Check if slot is in the future and not busy
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
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return new Response(
          JSON.stringify({ slots: availableSlots.slice(0, 20) }), // Limit to 20 slots
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

// Helper function to get valid access token (refresh if needed)
async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenData) return null;

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token is still valid (with 5 minute buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  // Refresh the token
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

  // Update tokens in database
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
