import { SignUp } from "@clerk/nextjs";

import { appearance } from "@/app/(authentication)/_components/clerk-appearance";

export default function Page() {
  return <SignUp appearance={appearance} path="/sign-up" routing="path" signInUrl="/sign-in" />;
}