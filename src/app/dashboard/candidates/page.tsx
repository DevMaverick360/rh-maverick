import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, UserPlus, Edit, Users, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CandidateDeleteButton } from "@/components/candidates/candidate-delete-button";

export default async function CandidatesPage() {
  const supabase = await createClient();

  const { data: candidates, error } = await supabase
    .from("candidates")
    .select("*, jobs(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching candidates", error);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E]/20 font-semibold text-xs">
            Aprovado
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/20 hover:bg-[#FF3B3B]/20 font-semibold text-xs">
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 font-semibold text-xs">
            Pendente
          </Badge>
        );
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-[#22C55E]";
    if (score >= 60) return "text-[#F59E0B]";
    return "text-[#FF3B3B]";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Candidatos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os candidatos processados pela IA.
          </p>
        </div>
        <Button className="h-10 rounded-lg font-semibold px-5" asChild>
          <Link href="/dashboard/candidates/new">
            <UserPlus className="mr-2 h-4 w-4" /> Novo Candidato
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar candidato..."
          className="pl-10 h-10 rounded-lg border-border bg-white"
        />
      </div>

      {candidates && candidates.length > 0 ? (
        <Card className="border border-border/60 bg-white rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F5F5] hover:bg-[#F5F5F5] border-b border-border/60">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5">
                  Nome
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5">
                  Vaga
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right">
                  Técnico
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right">
                  Cultural
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#4F4F4F] py-3.5 text-right w-[120px]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow
                  key={candidate.id}
                  className="hover:bg-[#F5F5F5]/60 transition-colors duration-150 border-b border-border/30"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B0B0B] text-white text-xs font-bold shrink-0">
                        {candidate.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/candidates/${candidate.id}`}
                            className="font-semibold text-sm hover:text-[#7C3AED] hover:underline"
                          >
                            {candidate.name}
                          </Link>
                          {'form_responses' in candidate &&
                            Array.isArray(candidate.form_responses) &&
                            candidate.form_responses.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 font-semibold border-[#7C3AED]/30 text-[#7C3AED] bg-[#7C3AED]/5"
                              >
                                Formulário
                              </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{candidate.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {candidate.jobs?.title || (
                      <span className="text-muted-foreground text-xs">Sem vaga</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                  <TableCell
                    className={`text-right font-bold text-sm ${getScoreColor(candidate.technical_score)}`}
                  >
                    {candidate.technical_score != null ? `${candidate.technical_score}%` : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold text-sm ${getScoreColor(candidate.cultural_score)}`}
                  >
                    {candidate.cultural_score != null ? `${candidate.cultural_score}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        asChild
                        title="Ver detalhe e análise IA"
                      >
                        <Link href={`/dashboard/candidates/${candidate.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        asChild
                        title="Editar"
                      >
                        <Link href={`/dashboard/candidates/${candidate.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <CandidateDeleteButton id={candidate.id} name={candidate.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl bg-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] mx-auto mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">Nenhum candidato cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Cadastre candidatos manualmente ou aguarde o processamento da IA.
          </p>
          <Button className="h-10 rounded-lg font-semibold px-5" asChild>
            <Link href="/dashboard/candidates/new">Cadastrar Primeiro Candidato</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
