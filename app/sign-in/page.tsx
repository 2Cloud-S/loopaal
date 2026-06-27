import { AuthForm } from "../auth-form.tsx";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <a className="wordmark" href="/">loopaal</a>
      <AuthForm mode="sign-in" />
    </main>
  );
}
