import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Custom fetch that forces the apikey header and strips any bad Authorization
const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  
  // Remove the bad Bearer token
  headers.delete("Authorization");
  
  // Ensure apikey is present
  headers.set("apikey", supabaseKey);
  
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch,
  },
});