"use client";

import { useEffect } from "react";
import { setNativeReminder } from "@/lib/native";

/** In the desktop/Android apps: keep this device's daily reminder in sync with the account (set on any device). */
export function AppBridge({ reminderHour }: { reminderHour: number | null }) {
  useEffect(() => { void setNativeReminder(reminderHour); }, [reminderHour]);
  return null;
}
