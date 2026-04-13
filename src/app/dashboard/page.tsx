import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { loadDashboardSnapshot } from "@/lib/dashboard-data";

const iconMap = {
  users: Users,
  userCheck: UserCheck,
  userX: UserX,
  calendar: Calendar,
} as const;

export default async function DashboardPage() {
  const snapshot = await loadDashboardSnapshot();

  const aiBars: { label: string; value: number; color: string }[] = [];
  if (snapshot.ai.technicalAvg != null) {
    aiBars.push({
      label: "Média técnica (IA)",
      value: snapshot.ai.technicalAvg,
      color: "bg-[#0066FF]",
    });
  }
  if (snapshot.ai.culturalAvg != null) {
    aiBars.push({
      label: "Média cultural (IA)",
      value: snapshot.ai.culturalAvg,
      color: "bg-[#FF3B3B]",
    });
  }
  if (snapshot.ai.approvalRate != null) {
    aiBars.push({
      label: "Taxa de aprovação (decididos)",
      value: snapshot.ai.approvalRate,
      color: "bg-[#22C55E]",
    });
  }

  const aiHeadlinePct =
    aiBars.length > 0 ? Math.round(aiBars.reduce((s, b) => s + b.value, 0) / aiBars.length) : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Visão geral do pipeline de recrutamento.</p>
      </div>

      {snapshot.loadError && (
        <p className="text-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-950">
          Não foi possível carregar todas as métricas. Verifique a conexão e as políticas do Supabase.
        </p>
      )}

      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {snapshot.metrics.map((metric) => {
          const Icon = iconMap[metric.icon];
          return (
            <Card
              key={metric.title}
              className="group relative overflow-hidden border border-border/60 bg-white rounded-2xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.color}`}>
                  <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{metric.value}</div>
                {metric.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{metric.subtitle}</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  {metric.change.type === "neutral" ? (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : metric.change.type === "positive" ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-[#FF3B3B] shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      metric.change.type === "positive"
                        ? "text-[#22C55E]"
                        : metric.change.type === "negative"
                          ? "text-[#FF3B3B]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {metric.change.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity + AI Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border/60 bg-white rounded-2xl shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Atividade recente</CardTitle>
              <span className="text-xs text-muted-foreground font-medium">Últimos 7 dias</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {snapshot.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum evento nos últimos 7 dias. Cadastre candidatos, vagas ou entrevistas para ver a linha do
                tempo aqui.
              </p>
            ) : (
              <div className="space-y-4">
                {snapshot.activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${item.dotClass} shrink-0`} />
                    <p className="text-sm font-medium flex-1 min-w-0">{item.text}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {item.timeLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-white rounded-2xl shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">Indicadores da IA</CardTitle>
              {aiHeadlinePct != null ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <TrendingUp className="h-4 w-4 text-[#22C55E]" />
                  <span className="text-xs font-semibold text-[#22C55E]">{aiHeadlinePct}%</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">média</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">Sem dados</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Médias e taxa calculadas sobre candidatos na base.
              {snapshot.ai.scoredCount === 0 && " Ainda não há notas de IA para exibir."}
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {aiBars.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Quando a IA atribuir notas técnicas e culturais aos candidatos, os gráficos aparecerão aqui.
              </p>
            ) : (
              <div className="space-y-5">
                {aiBars.map((bar) => (
                  <div key={bar.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{bar.label}</span>
                      <span className="text-sm font-bold tabular-nums">{bar.value}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#F5F5F5]">
                      <div
                        className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, bar.value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
