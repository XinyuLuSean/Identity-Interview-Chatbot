import { ResearchDashboard } from "@/components/research/research-dashboard";
import { getResearchDataset } from "@/lib/session-service";

export default async function ResearchDashboardPage() {
  const dataset = await getResearchDataset();
  return <ResearchDashboard dataset={dataset} />;
}
