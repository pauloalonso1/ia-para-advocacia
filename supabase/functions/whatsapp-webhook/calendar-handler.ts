// Google Calendar integration: availability check, event creation, token refresh

export async function getCalendarAvailability(
  supabase: any,
  userId: string,
  daysAhead: number
): Promise<{ start: string; end: string }[]> {
  try {
    const { data: scheduleSettings } = await supabase
      .from("schedule_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const workStartHour = scheduleSettings?.work_start_hour ?? 9;
    const workEndHour = scheduleSettings?.work_end_hour ?? 18;
    const lunchStartHour = scheduleSettings?.lunch_start_hour ?? null;
    const lunchEndHour = scheduleSettings?.lunch_end_hour ?? null;
    const appointmentDuration = scheduleSettings?.appointment_duration_minutes ?? 60;
    const workDays: number[] = scheduleSettings?.work_days ?? [1, 2, 3, 4, 5];

    console.log(`📅 Schedule: ${workStartHour}h-${workEndHour}h, lunch: ${lunchStartHour}-${lunchEndHour}, duration: ${appointmentDuration}min, days: ${workDays.join(",")}`);

    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenData) {
      console.error("No calendar token found");
      return [];
    }

    const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenData);
    if (!accessToken) return [];

    // São Paulo offset
    const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowSP = new Date(Date.now() - SP_OFFSET_MS);

    const timeMin = new Date(
      Date.UTC(nowSP.getUTCFullYear(), nowSP.getUTCMonth(), nowSP.getUTCDate(), workStartHour, 0, 0)
    );
    // Adjust: if current day's work hours already started, start from now
    const actualNowUtc = new Date(Date.now());
    if (timeMin < actualNowUtc) {
      timeMin.setTime(actualNowUtc.getTime());
    }

    const timeMax = new Date(timeMin.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const calendarId = tokenData.calendar_id || "primary";
    const busyUrl = `https://www.googleapis.com/calendar/v3/freeBusy`;

    const busyResponse = await fetch(busyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
    });

    if (!busyResponse.ok) {
      const err = await busyResponse.text();
      console.error("Calendar freeBusy error:", err);
      return [];
    }

    const busyData = await busyResponse.json();
    const busySlots = busyData.calendars?.[calendarId]?.busy || [];

    // Generate available slots
    const availableSlots: { start: string; end: string }[] = [];
    const durationMs = appointmentDuration * 60 * 1000;

    for (let day = 0; day < daysAhead; day++) {
      const daySP = new Date(nowSP.getTime() + day * 24 * 60 * 60 * 1000);
      const dayOfWeek = daySP.getUTCDay();
      if (!workDays.includes(dayOfWeek)) continue;

      const dayStart = new Date(
        Date.UTC(daySP.getUTCFullYear(), daySP.getUTCMonth(), daySP.getUTCDate(), workStartHour, 0, 0)
      );
      const dayEnd = new Date(
        Date.UTC(daySP.getUTCFullYear(), daySP.getUTCMonth(), daySP.getUTCDate(), workEndHour, 0, 0)
      );

      let slotStart = new Date(dayStart.getTime());
      // Skip past slots if this is today
      if (day === 0 && slotStart.getTime() < actualNowUtc.getTime()) {
        // Round up to next slot
        const diff = actualNowUtc.getTime() - slotStart.getTime();
        const slotsToSkip = Math.ceil(diff / durationMs);
        slotStart = new Date(slotStart.getTime() + slotsToSkip * durationMs);
      }

      while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        // Skip lunch break
        if (lunchStartHour !== null && lunchEndHour !== null) {
          const slotHour = slotStart.getUTCHours();
          const slotEndHour = slotEnd.getUTCHours() + slotEnd.getUTCMinutes() / 60;
          if (slotHour >= lunchStartHour && slotHour < lunchEndHour) {
            slotStart = new Date(
              Date.UTC(daySP.getUTCFullYear(), daySP.getUTCMonth(), daySP.getUTCDate(), lunchEndHour, 0, 0)
            );
            continue;
          }
        }

        // Check if slot conflicts with busy times
        const isBusy = busySlots.some((busy: { start: string; end: string }) => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
        });

        if (!isBusy) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }

        slotStart = new Date(slotStart.getTime() + durationMs);
      }
    }

    return availableSlots;
  } catch (error) {
    console.error("Error getting calendar availability:", error);
    return [];
  }
}

export async function createCalendarEvent(
  supabase: any,
  userId: string,
  date: string,
  time: string,
  summary: string,
  durationMinutes: number,
  attendeeEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenData) return { success: false, error: "Calendar not connected" };

    const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenData);
    if (!accessToken) return { success: false, error: "Failed to get access token" };

    let [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      console.log(`⚠️ Year ${year} is in the past, correcting to ${currentYear}`);
      year = currentYear;
    }

    const startDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute || 0).padStart(2, "0")}:00`;

    const endHour = hour + Math.floor(durationMinutes / 60);
    const endMinute = (minute || 0) + (durationMinutes % 60);
    const finalEndHour = endHour + Math.floor(endMinute / 60);
    const finalEndMinute = endMinute % 60;
    const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(finalEndHour).padStart(2, "0")}:${String(finalEndMinute).padStart(2, "0")}:00`;

    console.log(`📅 Creating event: ${startDateStr} to ${endDateStr} (São Paulo timezone)${attendeeEmail ? `, attendee: ${attendeeEmail}` : ""}`);

    const calendarEvent: any = {
      summary,
      start: { dateTime: startDateStr, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateStr, timeZone: "America/Sao_Paulo" },
    };

    if (attendeeEmail) {
      calendarEvent.attendees = [{ email: attendeeEmail }];
      calendarEvent.sendUpdates = "all";
      console.log(`📧 Will send calendar invite to: ${attendeeEmail}`);
    }

    const createResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Calendar event creation failed:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to create event" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function refreshTokenIfNeeded(
  supabase: any,
  userId: string,
  tokenData: any
): Promise<string | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth credentials not configured");
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
