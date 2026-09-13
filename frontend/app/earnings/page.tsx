"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { StatusMessage } from "@/components/StatusMessage";
import api from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/lib/auth/authStore";
import type { Earnings, Withdrawal } from "@/lib/types/api";

const withdrawalSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Enter a valid amount." }).min(0, "Amount must be zero or more."),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

async function fetchEarnings(): Promise<Earnings> {
  const { data } = await api.get<Earnings>("/me/earnings");
  return data;
}

async function createWithdrawal(payload: { amountMinor: number; payoutReference: string }) {
  const { data } = await api.post<Withdrawal>("/me/withdrawals", payload, {
    headers: { "Idempotency-Key": payload.payoutReference },
  });
  return data;
}

export default function EarningsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["earnings"],
    queryFn: fetchEarnings,
    enabled: Boolean(token && user?.role === "instructor"),
    retry: false,
  });

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { amount: 0 },
  });

  useEffect(() => {
    if (!token) {
      form.reset({ amount: 0 });
    }
  }, [token, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!data) return;

    const amountMajor = Number(values.amount);
    if (!Number.isFinite(amountMajor) || amountMajor < 0) {
      form.setError("amount", { type: "manual", message: "Enter a valid amount." });
      return;
    }

    const amountMinor = Math.round(amountMajor * 100);

    if (amountMinor < data.minimumWithdrawalMinor) {
      form.setError("amount", {
        type: "manual",
        message: `Minimum withdrawal is ${formatMoney(data.minimumWithdrawalMinor, data.currency)}.`,
      });
      return;
    }

    if (amountMinor > data.availableMinor) {
      form.setError("amount", {
        type: "manual",
        message: `You can withdraw at most ${formatMoney(data.availableMinor, data.currency)}.`,
      });
      return;
    }

    const payoutReference = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await createWithdrawal({ amountMinor, payoutReference });
      form.reset({ amount: 0 });
      await queryClient.invalidateQueries({ queryKey: ["earnings"] });
      await refetch();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to submit withdrawal.";
      form.setError("amount", { type: "manual", message });
    }
  });

  if (!token || !user) {
    return (
      <div className="space-y-4">
        <StatusMessage state="error" message="You are signed out. Sign in to view earnings and request a withdrawal." />
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (user.role !== "instructor") {
    return (
      <div className="space-y-4">
        <StatusMessage state="error" message="This page is for instructors only. Your account is not permitted to access payouts." />
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <StatusMessage state="loading" />;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <StatusMessage state="error" message={error instanceof Error ? error.message : "Unable to load earnings."} />
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <StatusMessage state="empty" message="No earnings information is available." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Instructor account</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{user.name}</h2>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Sign out
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(data.availableMinor, data.currency)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(data.pendingMinor, data.currency)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Minimum</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(data.minimumWithdrawalMinor, data.currency)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Request withdrawal</h3>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700">
              Amount (NGN)
            </label>
            <input
              id="amount"
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="1000"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {form.formState.isSubmitting ? "Submitting…" : "Request withdrawal"}
          </button>
        </form>
      </div>
    </div>
  );
}
