"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      totp,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Sign-in failed. Check your email, password, and (if enrolled) your authenticator code.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-brand-950">Sign in</h1>
          <p className="text-sm text-brand-700">Welcome back. Use the email and password you set up.</p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="totp">Authenticator code (if enrolled)</Label>
          <Input id="totp" inputMode="numeric" autoComplete="one-time-code" value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="6-digit code" />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-sm text-brand-700">
          Don't have an account? <Link href="/sign-up" className="font-medium text-brand-700 underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}
