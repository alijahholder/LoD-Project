"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/sign-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Could not create account.");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    window.location.href = "/onboarding";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-brand-950">Create your account</h1>
          <p className="text-sm text-brand-700">We'll set up multi-factor authentication on the next screen.</p>
        </div>

        <Callout tone="info" title="Your information is sensitive.">
          Medical and identity data you enter is encrypted at rest. You can enroll an authenticator app (TOTP) to add a second factor right after sign-up.
        </Callout>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password (min 12 characters)</Label>
          <Input id="password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating account…" : "Create account"}</Button>
        <p className="text-center text-sm text-brand-700">
          Already have an account? <Link href="/sign-in" className="font-medium text-brand-700 underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
