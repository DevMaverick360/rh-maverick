import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Plus, Edit, Briefcase, FileSpreadsheet, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JobDeleteButton } from "@/components/jobs/job-delete-button";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*, candidates(count)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs", error);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vagas</h2>
          <p className="text-muted-foreground mt-1">Crie e configure critérios para a IA.</p>
        </div>
        <Button className="h-10 rounded-lg font-semibold px-5" asChild>
          <Link href="/dashboard/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> Nova Vaga
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job) => (
          <Card
            key={job.id}
            className="group relative overflow-hidden border border-border/60 bg-white rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col"
          >
            <CardHeader className="pb-3 flex-1">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B0B0B] mb-3">
                  <Briefcase className="h-4 w-4 text-white" />
                </div>
              </div>
              <CardTitle className="text-lg font-bold leading-tight tracking-tight">{job.title}</CardTitle>
              <CardDescription className="text-xs mt-1 space-y-1">
                <span>Criada em {new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
                {'application_code' in job && job.application_code ? (
                  <span className="block font-mono text-[11px] text-foreground/80">
                    job_code: {String(job.application_code)}
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight">{job.candidates[0]?.count || 0}</span>
                <span className="text-xs text-muted-foreground font-medium">candidatos</span>
              </div>
            </CardContent>
            <CardFooter className="bg-[#F5F5F5]/60 border-t border-border/40 flex flex-wrap items-center justify-end gap-2 px-5 py-3">
              <Button size="sm" variant="default" className="h-8 rounded-lg text-xs font-semibold bg-[#0B0B0B] hover:bg-[#1a1a1a]" asChild>
                <Link href={`/dashboard/jobs/${job.id}`}>
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Painel
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold" asChild>
                <Link href={`/dashboard/jobs/${job.id}/integracao`}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                  Google Forms
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold" asChild>
                <Link href={`/dashboard/jobs/${job.id}/edit`}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Link>
              </Button>
              <JobDeleteButton id={job.id} title={job.title} />
            </CardFooter>
          </Card>
        ))}
        {(!jobs || jobs.length === 0) && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border/60 rounded-2xl bg-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] mx-auto mb-4">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhuma vaga cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Comece adicionando os requisitos técnicos e culturais.
            </p>
            <Button className="h-10 rounded-lg font-semibold px-5" asChild>
              <Link href="/dashboard/jobs/new">Cadastrar Primeira Vaga</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
