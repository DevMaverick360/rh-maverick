import { CandidateForm } from "@/components/candidates/candidate-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCandidatePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("id, name, email, phone, job_id, cv_url, form_responses")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    notFound();
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("title", { ascending: true });

  return <CandidateForm jobs={jobs || []} initialData={candidate} />;
}
