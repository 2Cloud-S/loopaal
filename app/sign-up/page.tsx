import { AuthForm } from "../auth-form.tsx";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <a className="wordmark" href="/">loopaal</a>
      <AuthForm mode="sign-up" />
    </main>
  );
}
