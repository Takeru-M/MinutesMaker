import { redirect } from "next/navigation";

type Props = { params: Promise<{ orgId: string }> };

export default async function OrgHomePage({ params }: Props) {
  const { orgId } = await params;
  redirect(`/orgs/${orgId}/meeting-schedule`);
}
