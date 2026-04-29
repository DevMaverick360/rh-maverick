import { CandidateForm } from "@/components/candidates/candidate-form";
import { canEditRhEvaluation, getPanelRole } from "@/lib/auth/panel-role";
import { createClient } from "@/lib/supabase/server";

export default async function NewCandidatePage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("title", { ascending: true });

  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name, slug, color")
    .order("name", { ascending: true });

  const panelRole = await getPanelRole();

  return (
    <CandidateForm
      jobs={jobs || []}
      allTags={allTags || []}
      rhEvaluationEditable={canEditRhEvaluation(panelRole)}
    />
  );
}
