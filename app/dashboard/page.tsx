import { LoopaalConsole } from "../loopaal-console.tsx";
import { OnboardingGuide } from "../onboarding-guide.tsx";
import { requirePageUser } from "../../src/lib/auth.ts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageUser();
  return (
    <>
      <LoopaalConsole />
      <OnboardingGuide surface="dashboard" />
    </>
  );
}
