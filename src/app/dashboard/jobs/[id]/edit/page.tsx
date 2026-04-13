import { JobForm } from "@/components/jobs/job-form";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    notFound();
  }

  return <JobForm initialData={job} />;
}
