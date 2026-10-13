import { SignIn } from "@clerk/nextjs";

import { appearance } from "@/app/(authentication)/_components/clerk-appearance";

export default function Page() {
  return <SignIn appearance={appearance} path="/sign-in" routing="path" signUpUrl="/sign-up" />;
}