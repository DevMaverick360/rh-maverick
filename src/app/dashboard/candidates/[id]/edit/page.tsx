import { CandidateForm } from "@/components/candidates/candidate-form";
import { canEditRhEvaluation, getPanelRole } from "@/lib/auth/panel-role";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCandidatePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select(
      "id, name, email, phone, job_id, cv_url, form_responses, rh_notes, rh_technical_score, rh_cultural_score, candidate_tags(tag_id)"
    )
    .eq("id", id)
    .single();

  if (error || !candidate) {
    notFound();
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .order("title", { ascending: true });

  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name, slug, color")
    .order("name", { ascending: true });

  type Row = typeof candidate & { candidate_tags?: { tag_id: string }[] | null };
  const r = candidate as Row;
  const selectedTagIds = r.candidate_tags?.map((x) => x.tag_id) ?? [];
  const panelRole = await getPanelRole();

  return (
    <CandidateForm
      jobs={jobs || []}
      allTags={allTags || []}
      rhEvaluationEditable={canEditRhEvaluation(panelRole)}
      initialData={{
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        job_id: r.job_id,
        cv_url: r.cv_url,
        form_responses: r.form_responses,
        rh_notes: r.rh_notes,
        rh_technical_score: r.rh_technical_score,
        rh_cultural_score: r.rh_cultural_score,
        selected_tag_ids: selectedTagIds,
      }}
    />
  );
}
