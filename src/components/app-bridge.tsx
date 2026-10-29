"use client";

import { useEffect } from "react";
import { setNativeReminder } from "@/lib/native";
import { markTouchDevice, syncTimezone } from "@/app/(app)/settings/actions";
import { applyTabletLayout } from "@/components/layout-select";

/**
 * Background housekeeping on every app page: keep the account's time zone and tablet layout matched to this device, and (in the
 * desktop/Android apps) keep this device's daily reminder in sync with the account.
 */
export function AppBridge({ reminderHour, timezone, touchSeen, tabletLayout }: { reminderHour: number | null; timezone: string; touchSeen: boolean; tabletLayout: string }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== timezone) void syncTimezone(tz);
  }, [timezone]);
  // The account's tablet layout follows the student to every device; a first visit from a phone or tablet is noted on the account.
  useEffect(() => { applyTabletLayout(tabletLayout); }, [tabletLayout]);
  useEffect(() => { if (!touchSeen && matchMedia("(pointer: coarse)").matches) void markTouchDevice(); }, [touchSeen]);
  useEffect(() => { void setNativeReminder(reminderHour); }, [reminderHour]);
  return null;
}
