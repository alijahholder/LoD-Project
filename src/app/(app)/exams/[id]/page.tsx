import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import ExamWorkspace from "./ExamWorkspace";

const DEFAULT_PREP = [
  { id: "id-and-records", label: "Bring photo ID and your most recent imaging reports", done: false },
  { id: "history", label: "Prepare a 1-paragraph injury history (mechanism, treatments, surgeries, dates)", done: false },
  { id: "list-of-symptoms", label: "Write down current pain locations, ROM limits, instability, daily impact", done: false },
  { id: "no-improv", label: "Do NOT minimize symptoms. Describe a typical bad day.", done: false },
  { id: "no-volunteer", label: "Answer questions truthfully but don't volunteer information outside the exam scope", done: false },
  { id: "after", label: "Immediately after, write down what was tested, what was missed, and the doctor's comments", done: false },
];

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const exam = await prisma.neutralPhysicianExam.findUnique({
    where: { id },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!exam || exam.claim.profile.user.id !== userId) notFound();

  const prep = exam.prepChecklistJson ? JSON.parse(exam.prepChecklistJson) : DEFAULT_PREP;

  return (
    <PageShell>
      <PageHeader
        title={`Exam — ${exam.physicianName ?? "Untitled"}`}
        subtitle={exam.specialty ?? "Specialty TBD"}
      />
      <Card>
        <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
        <CardBody>
          <ExamWorkspace
            id={exam.id}
            initial={{
              physicianName: exam.physicianName ?? "",
              specialty: exam.specialty ?? "",
              scheduledFor: exam.scheduledFor?.toISOString().slice(0, 16) ?? "",
              location: exam.location ?? "",
              postNotes: exam.postNotes ?? "",
              inadequate: exam.inadequate,
              supplementalLetterMd: exam.supplementalLetterMd ?? "",
              prep,
            }}
          />
        </CardBody>
      </Card>
    </PageShell>
  );
}
