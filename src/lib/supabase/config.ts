const hostedUrl = "https://oknvtxgxynmzdogrbujb.supabase.co";
const hostedPublishableKey = "sb_publishable_yqyQpEEmXtmDlhYEK9GWmA_sDr-7586";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || hostedUrl,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || hostedPublishableKey,
  };
}
