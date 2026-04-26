import { VerifyEmailPanel } from "@/components/verify-email-panel";
import { getCurrentUser } from "@/lib/auth";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const token = params.token?.trim() || null;

  return (
    <main className="min-h-screen px-6 py-16 text-white">
      <section className="mx-auto max-w-3xl">
        <VerifyEmailPanel
          token={token}
          userEmail={user?.email ?? null}
          isLoggedIn={Boolean(user)}
          isVerified={Boolean(user?.emailVerifiedAt)}
        />
      </section>
    </main>
  );
}
