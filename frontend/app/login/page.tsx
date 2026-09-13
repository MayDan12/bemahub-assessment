"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/authStore";
import type { LoginResponse } from "@/lib/types/api";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

async function loginUser(payload: LoginFormValues) {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "instructor@example.test", password: "assessment123" },
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      signIn(data.token, data.user);
      setServerError(null);
      router.push("/earnings");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message ? error.message : "Unable to sign in right now.";
      setServerError(message);
    },
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
      <p className="mt-2 text-sm text-slate-600">Use the seeded instructor or learner account.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-0 transition focus:border-slate-500"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-0 transition focus:border-slate-500"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
