"use client";

import { useEffect } from "react";
import { setNativeReminder } from "@/lib/native";
import { syncTimezone } from "@/app/(app)/settings/actions";

/**
 * Background housekeeping on every app page: keep the account's time zone matched to this device, and (in the
 * desktop/Android apps) keep this device's daily reminder in sync with the account.
 */
export function AppBridge({ reminderHour, timezone }: { reminderHour: number | null; timezone: string }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== timezone) void syncTimezone(tz);
  }, [timezone]);
  useEffect(() => { void setNativeReminder(reminderHour); }, [reminderHour]);
  return null;
}
