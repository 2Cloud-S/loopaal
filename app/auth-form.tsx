"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createLoopaalSupabaseBrowserClient } from "../src/lib/supabase-browser.ts";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createLoopaalSupabaseBrowserClient();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    if (!supabase) {
      setMessage("Supabase env vars are missing, so Loopaal is running in local demo auth mode.");
      setBusy(false);
      return;
    }
    const response = mode === "sign-up"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    if (mode === "sign-up" && !response.data.session) {
      setMessage("Account created. Check your email to confirm the account, then sign in.");
      form.reset();
      return;
    }
    router.push("/setup");
    router.refresh();
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <p className="kicker">{mode === "sign-up" ? "create workspace" : "welcome back"}</p>
      <h1>{mode === "sign-up" ? "Create your Loopaal account" : "Sign in to Loopaal"}</h1>
      <p>Use this account to own your campaigns, memory, approvals, and connected business channels.</p>
      <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@company.com" /></label>
      <label>Password<input name="password" type="password" required minLength={6} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder="At least 6 characters" /></label>
      <button className="btn primary" disabled={busy}>{busy ? "Working..." : mode === "sign-up" ? "Create account" : "Sign in"}</button>
      {message ? <p className="form-status">{message}</p> : null}
      <p className="auth-switch">
        {mode === "sign-up" ? "Already have an account?" : "New to Loopaal?"}{" "}
        <a href={mode === "sign-up" ? "/sign-in" : "/sign-up"}>{mode === "sign-up" ? "Sign in" : "Create one"}</a>
      </p>
    </form>
  );
}
