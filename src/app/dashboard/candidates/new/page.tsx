import { CandidateForm } from "@/components/candidates/candidate-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewCandidatePage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("title", { ascending: true });

  return <CandidateForm jobs={jobs || []} />;
}
