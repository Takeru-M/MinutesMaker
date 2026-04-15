import { AgendaDetailView } from "@/features/agenda";

type OrgAgendaDetailPageProps = {
  params: Promise<{
    orgId: string;
    id: string;
  }>;
};

export default async function OrgAgendaDetailPage({ params }: OrgAgendaDetailPageProps) {
  const { id } = await params;

  return <AgendaDetailView agendaId={id} />;
}
