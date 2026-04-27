import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileSearch, ListChecks, Scale, Stethoscope, Wallet } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold text-brand-900">
          <span className="inline-block h-7 w-7 rounded-md bg-brand-700" aria-hidden />
          Gridiron LOD
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/sign-up"><Button>Create account</Button></Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-10 text-center">
        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
          For retired NFL players
        </span>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-brand-950 sm:text-5xl">
          File your Line of Duty disability claim — without an appointed rep.
        </h1>
        <p className="mt-5 prose-plain mx-auto max-w-2xl text-brand-700">
          Upload your medical records and our system pulls out the diagnoses, maps them
          to the LOD impairment categories, and tells you how close you are to the
          9-point threshold. We track every records request, every follow-up, every
          deadline — and snapshot every submission so you have an iron-clad ERISA
          record if you ever need to appeal.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up"><Button size="lg">Start your claim</Button></Link>
          <Link href="/sign-in"><Button size="lg" variant="outline">I already have an account</Button></Link>
        </div>
        <p className="mt-3 text-xs text-brand-500">
          Self-service. You stay in control. This is not legal advice.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        <Feature icon={FileSearch} title="AI medical-record analysis">
          Drag-drop your records. The system OCRs them, extracts diagnoses with page-level citations, and maps each to the active LOD rubric.
        </Feature>
        <Feature icon={ListChecks} title="Records request tracker">
          Two queues — NFL Club and third-party providers — with HIPAA releases, follow-up reminders, and a call log that becomes part of your ERISA record.
        </Feature>
        <Feature icon={ShieldCheck} title="ERISA-grade snapshots">
          Every submission to the Plan is hashed and frozen. If you ever appeal in federal court, the administrative record is right where you left it.
        </Feature>
        <Feature icon={Stethoscope} title="Neutral physician prep">
          Track exam dates, prep checklists, post-exam notes, and supplemental letters when an exam was inadequate.
        </Feature>
        <Feature icon={Scale} title="Appeal & hearing prep">
          180-day appeal clock, exhibit builder, brief generator with templated arguments, and IPB / MAB hearing prep with mock Q&amp;A.
        </Feature>
        <Feature icon={Wallet} title="Offsets & payment tracking">
          See your projected net monthly LOD payout net of SSDI / Workers' Comp offsets — every input is shown so you can audit the math.
        </Feature>
      </section>

      <footer className="border-t border-brand-100 bg-white py-6 text-center text-xs text-brand-500">
        Gridiron LOD is a self-service tool, not legal counsel. For appeals or federal litigation, consult an ERISA attorney.
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
      <Icon className="h-6 w-6 text-brand-700" />
      <h3 className="mt-3 font-semibold text-brand-900">{title}</h3>
      <p className="mt-1 text-sm text-brand-700">{children}</p>
    </div>
  );
}
