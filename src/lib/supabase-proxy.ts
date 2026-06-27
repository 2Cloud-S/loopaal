import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config, useSupabaseAuth } from "./config.ts";

export async function updateSupabaseSession(request: NextRequest) {
  if (!useSupabaseAuth()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      }
    }
  });

  await supabase.auth.getClaims();
  return response;
}
