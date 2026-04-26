"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResponse } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/logout", { method: "POST" });
      await readApiResponse<{ loggedOut: true }>(response);
      router.push("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="btn-secondary rounded-full px-4 py-2 text-sm font-medium text-zinc-300"
    >
      {isSubmitting ? (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
          退出中
        </span>
      ) : "退出登录"}
    </button>
  );
}
