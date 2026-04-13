import { createClient } from "@/lib/supabase/server";

export type MetricChange = {
  label: string;
  type: "positive" | "negative" | "neutral";
};

export type DashboardMetric = {
  title: string;
  value: string;
  /** Contexto extra (ex.: novas entradas no mês) */
  subtitle?: string;
  change: MetricChange;
  icon: "users" | "userCheck" | "userX" | "calendar";
  color: string;
  iconColor: string;
};

export type ActivityRow = {
  id: string;
  text: string;
  timeLabel: string;
  dotClass: string;
  sortTime: number;
};

export type AiPerformance = {
  technicalAvg: number | null;
  culturalAvg: number | null;
  approvalRate: number | null;
  scoredCount: number;
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  activity: ActivityRow[];
  ai: AiPerformance;
  loadError: boolean;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}

function iso(d: Date): string {
  return d.toISOString();
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function percentChange(current: number, previous: number): MetricChange {
  if (previous === 0 && current === 0) {
    return { label: "sem base no mês anterior", type: "neutral" };
  }
  if (previous === 0) {
    return { label: "novo neste mês", type: "positive" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { label: "0% vs mês anterior", type: "neutral" };
  }
  if (pct > 0) {
    return { label: `+${pct}% vs mês anterior`, type: "positive" };
  }
  return { label: `${pct}% vs mês anterior`, type: "negative" };
}

function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = await createClient();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = addMonths(thisMonthStart, -1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const t0 = iso(thisMonthStart);
  const t1 = iso(lastMonthStart);

  const [
    totalRes,
    approvedRes,
    rejectedRes,
    interviewsRes,
    thisMonthCandidates,
    lastMonthCandidates,
    thisMonthApproved,
    lastMonthApproved,
    thisMonthRejected,
    lastMonthRejected,
    thisMonthInterviews,
    lastMonthInterviews,
    recentCandidates,
    recentJobs,
    recentInterviews,
    allScores,
  ] = await Promise.all([
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .in("status", ["scheduled", "confirmed"]),
    supabase.from("candidates").select("*", { count: "exact", head: true }).gte("created_at", t0),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .gte("created_at", t1)
      .lt("created_at", t0),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("created_at", t0),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("created_at", t1)
      .lt("created_at", t0),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", t0),
    supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", t1)
      .lt("created_at", t0),
    supabase.from("interviews").select("*", { count: "exact", head: true }).gte("created_at", t0),
    supabase
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .gte("created_at", t1)
      .lt("created_at", t0),
    supabase
      .from("candidates")
      .select("id, name, status, created_at")
      .gte("created_at", iso(sevenDaysAgo))
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("jobs")
      .select("id, title, created_at")
      .gte("created_at", iso(sevenDaysAgo))
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("interviews")
      .select("id, scheduled_at, created_at, candidates(name)")
      .gte("created_at", iso(sevenDaysAgo))
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("candidates").select("technical_score, cultural_score, status"),
  ]);

  const loadError = !!(
    totalRes.error ||
    approvedRes.error ||
    rejectedRes.error ||
    interviewsRes.error
  );

  if (loadError) {
    console.error("Dashboard snapshot errors", {
      total: totalRes.error,
      approved: approvedRes.error,
      rejected: rejectedRes.error,
      interviews: interviewsRes.error,
    });
  }

  const total = totalRes.count ?? 0;
  const approved = approvedRes.count ?? 0;
  const rejected = rejectedRes.count ?? 0;
  const interviews = interviewsRes.count ?? 0;

  const cm = thisMonthCandidates.count ?? 0;
  const lm = lastMonthCandidates.count ?? 0;
  const ca = thisMonthApproved.count ?? 0;
  const la = lastMonthApproved.count ?? 0;
  const cr = thisMonthRejected.count ?? 0;
  const lr = lastMonthRejected.count ?? 0;
  const ci = thisMonthInterviews.count ?? 0;
  const li = lastMonthInterviews.count ?? 0;

  const metrics: DashboardMetric[] = [
    {
      title: "Total de Candidatos",
      value: formatInt(total),
      change: percentChange(cm, lm),
      icon: "users",
      color: "bg-[#0B0B0B]",
      iconColor: "text-white",
    },
    {
      title: "Aprovados",
      value: formatInt(approved),
      change: percentChange(ca, la),
      icon: "userCheck",
      color: "bg-[#22C55E]/10",
      iconColor: "text-[#22C55E]",
    },
    {
      title: "Rejeitados",
      value: formatInt(rejected),
      change: percentChange(cr, lr),
      icon: "userX",
      color: "bg-[#FF3B3B]/10",
      iconColor: "text-[#FF3B3B]",
    },
    {
      title: "Entrevistas ativas",
      value: formatInt(interviews),
      subtitle:
        ci === 0
          ? "Nenhuma nova entrevista registrada este mês"
          : `${formatInt(ci)} nova(s) registrada(s) este mês`,
      change: percentChange(ci, li),
      icon: "calendar",
      color: "bg-[#0066FF]/10",
      iconColor: "text-[#0066FF]",
    },
  ];

  const activity: ActivityRow[] = [];

  for (const c of recentCandidates.data ?? []) {
    const st =
      c.status === "approved"
        ? "aprovado"
        : c.status === "rejected"
          ? "rejeitado"
          : "pendente";
    activity.push({
      id: `c-${c.id}`,
      text: `Candidato — ${c.name} (${st})`,
      timeLabel: formatRelativeTime(c.created_at),
      dotClass:
        c.status === "approved"
          ? "bg-[#22C55E]"
          : c.status === "rejected"
            ? "bg-[#FF3B3B]"
            : "bg-[#F59E0B]",
      sortTime: new Date(c.created_at).getTime(),
    });
  }

  for (const j of recentJobs.data ?? []) {
    activity.push({
      id: `j-${j.id}`,
      text: `Vaga cadastrada — ${j.title}`,
      timeLabel: formatRelativeTime(j.created_at),
      dotClass: "bg-[#0066FF]",
      sortTime: new Date(j.created_at).getTime(),
    });
  }

  for (const inv of recentInterviews.data ?? []) {
    const name =
      inv.candidates && typeof inv.candidates === "object" && "name" in inv.candidates
        ? String((inv.candidates as { name: string }).name)
        : "Candidato";
    const when = new Date(inv.scheduled_at).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    activity.push({
      id: `i-${inv.id}`,
      text: `Entrevista — ${name} · ${when}`,
      timeLabel: formatRelativeTime(inv.created_at),
      dotClass: "bg-[#7C3AED]",
      sortTime: new Date(inv.created_at).getTime(),
    });
  }

  activity.sort((a, b) => b.sortTime - a.sortTime);
  const activityTop = activity.slice(0, 8);

  let techSum = 0;
  let techN = 0;
  let cultSum = 0;
  let cultN = 0;
  let appr = 0;
  let rej = 0;
  for (const row of allScores.data ?? []) {
    if (row.technical_score != null) {
      techSum += row.technical_score;
      techN += 1;
    }
    if (row.cultural_score != null) {
      cultSum += row.cultural_score;
      cultN += 1;
    }
    if (row.status === "approved") appr += 1;
    if (row.status === "rejected") rej += 1;
  }

  const decided = appr + rej;
  const ai: AiPerformance = {
    technicalAvg: techN ? Math.round(techSum / techN) : null,
    culturalAvg: cultN ? Math.round(cultSum / cultN) : null,
    approvalRate: decided ? Math.round((appr / decided) * 100) : null,
    scoredCount: techN,
  };

  return { metrics, activity: activityTop, ai, loadError };
}
