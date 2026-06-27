import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { config, useSupabaseAuth } from "./config.ts";

const demoWorkspace = "demo_workspace";

type CookiePair = { name: string; value: string };

function cookiePairsFromHeader(header: string | null): CookiePair[] {
  if (!header) return [];
  return header
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=");
      return index >= 0
        ? { name: part.slice(0, index), value: decodeURIComponent(part.slice(index + 1)) }
        : { name: part, value: "" };
    });
}

function safeWorkspace(value: string | undefined | null) {
  return (value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

export function isAuthEnabled() {
  return useSupabaseAuth();
}

export function demoWorkspaceFromRequest(request: Request) {
  return safeWorkspace(request.headers.get("x-loopaal-workspace")) || demoWorkspace;
}

export function workspaceIdForUser(user: Pick<User, "id">) {
  return `user_${safeWorkspace(user.id)}`;
}

export async function userFromRequest(request: Request) {
  if (!isAuthEnabled()) return undefined;
  const supabase = createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookiePairsFromHeader(request.headers.get("cookie"));
      },
      setAll() {
        // Route handlers in this app only need to read the current session.
      }
    }
  });
  const { data, error } = await supabase.auth.getUser();
  if (error) return undefined;
  return data.user || undefined;
}

export async function workspaceFromRequest(request: Request) {
  if (!isAuthEnabled()) return demoWorkspaceFromRequest(request);
  const user = await userFromRequest(request);
  if (!user) throw Object.assign(new Error("Authentication required"), { status: 401 });
  return workspaceIdForUser(user);
}

export async function currentPageUser() {
  if (!isAuthEnabled()) return undefined;
  const cookieStore = await cookies();
  const supabase = createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(cookie => ({ name: cookie.name, value: cookie.value }));
      },
      setAll() {
        // Server Components cannot set cookies; client auth pages establish sessions.
      }
    }
  });
  const { data, error } = await supabase.auth.getUser();
  if (error) return undefined;
  return data.user || undefined;
}

export async function requirePageUser() {
  const user = await currentPageUser();
  if (isAuthEnabled() && !user) redirect("/sign-in");
  return user;
}
