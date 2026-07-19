import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function createClient() {
  const store = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient(url, publishableKey, { cookies: { getAll: () => store.getAll(), setAll: (values) => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} } } });
}
