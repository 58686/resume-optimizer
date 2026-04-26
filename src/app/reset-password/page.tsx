import { ResetPasswordForm } from "@/components/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen px-6 py-16 text-white">
      <section className="mx-auto max-w-3xl">
        <ResetPasswordForm token={params.token?.trim() || null} />
      </section>
    </main>
  );
}
