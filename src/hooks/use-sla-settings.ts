import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SlaSettings {
  businessStart: string; // "HH:MM"
  businessEnd: string;
  workingDays: number[]; // 0=Sun, 1=Mon ... 6=Sat
  businessHoursOnly: boolean;
}

const DEFAULT_SLA_SETTINGS: SlaSettings = {
  businessStart: "08:00",
  businessEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  businessHoursOnly: true,
};

export function useSlaSettings() {
  const [settings, setSettings] = useState<SlaSettings>(DEFAULT_SLA_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("sla_settings" as any)
      .select("*")
      .eq("id", "default")
      .single();

    if (data) {
      const d = data as any;
      setSettings({
        businessStart: d.business_start?.slice(0, 5) || "08:00",
        businessEnd: d.business_end?.slice(0, 5) || "18:00",
        workingDays: d.working_days || [1, 2, 3, 4, 5],
        businessHoursOnly: d.business_hours_only ?? true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (newSettings: SlaSettings) => {
    const { error } = await supabase
      .from("sla_settings" as any)
      .update({
        business_start: newSettings.businessStart,
        business_end: newSettings.businessEnd,
        working_days: newSettings.workingDays,
        business_hours_only: newSettings.businessHoursOnly,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");

    if (!error) {
      setSettings(newSettings);
    }
    return !error;
  }, []);

  return { settings, loading, saveSettings, refetch: fetchSettings };
}

/**
 * Calculate business hours between two dates, excluding nights and weekends.
 */
export function calcBusinessHoursMs(
  start: Date,
  end: Date,
  settings: SlaSettings
): number {
  if (!settings.businessHoursOnly) {
    return end.getTime() - start.getTime();
  }

  const [startH, startM] = settings.businessStart.split(":").map(Number);
  const [endH, endM] = settings.businessEnd.split(":").map(Number);
  const dayStartMinutes = startH * 60 + startM;
  const dayEndMinutes = endH * 60 + endM;
  const businessMinutesPerDay = dayEndMinutes - dayStartMinutes;

  if (businessMinutesPerDay <= 0) {
    return end.getTime() - start.getTime();
  }

  let totalMinutes = 0;
  const current = new Date(start);

  while (current < end) {
    const dayOfWeek = current.getDay();

    if (settings.workingDays.includes(dayOfWeek)) {
      const currentMinutes = current.getHours() * 60 + current.getMinutes();

      // Clamp to business hours
      const effectiveStart = Math.max(currentMinutes, dayStartMinutes);
      const dayEnd = new Date(current);
      dayEnd.setHours(endH, endM, 0, 0);

      const effectiveEndTime = end < dayEnd ? end : dayEnd;
      const effectiveEndMinutes = effectiveEndTime.getHours() * 60 + effectiveEndTime.getMinutes();

      if (effectiveStart < dayEndMinutes && effectiveEndMinutes > dayStartMinutes) {
        const workStart = Math.max(effectiveStart, dayStartMinutes);
        const workEnd = Math.min(effectiveEndMinutes, dayEndMinutes);
        if (workEnd > workStart) {
          totalMinutes += workEnd - workStart;
        }
      }
    }

    // Move to start of next day
    current.setDate(current.getDate() + 1);
    current.setHours(startH, startM, 0, 0);
  }

  return totalMinutes * 60 * 1000;
}

/**
 * Calculate when a deadline falls, adding only business hours.
 */
export function calcBusinessDeadline(
  start: Date,
  hoursToAdd: number,
  settings: SlaSettings
): Date {
  if (!settings.businessHoursOnly) {
    return new Date(start.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  const [startH, startM] = settings.businessStart.split(":").map(Number);
  const [endH, endM] = settings.businessEnd.split(":").map(Number);
  const dayStartMinutes = startH * 60 + startM;
  const dayEndMinutes = endH * 60 + endM;
  const businessMinutesPerDay = dayEndMinutes - dayStartMinutes;

  if (businessMinutesPerDay <= 0) {
    return new Date(start.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  let remainingMinutes = hoursToAdd * 60;
  const current = new Date(start);

  // If starting outside business hours, move to next business start
  const startMinOfDay = current.getHours() * 60 + current.getMinutes();
  if (startMinOfDay >= dayEndMinutes || startMinOfDay < dayStartMinutes || !settings.workingDays.includes(current.getDay())) {
    // Move forward to next working day business start
    if (startMinOfDay >= dayEndMinutes || !settings.workingDays.includes(current.getDay())) {
      current.setDate(current.getDate() + 1);
    }
    while (!settings.workingDays.includes(current.getDay())) {
      current.setDate(current.getDate() + 1);
    }
    current.setHours(startH, startM, 0, 0);
  }

  while (remainingMinutes > 0) {
    if (settings.workingDays.includes(current.getDay())) {
      const currentMin = current.getHours() * 60 + current.getMinutes();
      const availableToday = dayEndMinutes - Math.max(currentMin, dayStartMinutes);

      if (availableToday > 0) {
        if (remainingMinutes <= availableToday) {
          current.setMinutes(current.getMinutes() + remainingMinutes);
          remainingMinutes = 0;
          break;
        } else {
          remainingMinutes -= availableToday;
        }
      }
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(startH, startM, 0, 0);
    // Skip non-working days
    while (!settings.workingDays.includes(current.getDay())) {
      current.setDate(current.getDate() + 1);
    }
  }

  return current;
}
