import { redirect } from "next/navigation";

type OrgSearchPageProps = {
  params: Promise<{
    orgId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrgSearchPage({ params, searchParams }: OrgSearchPageProps) {
  const { orgId } = await params;
  const search = await searchParams;
  const queryValue = search?.q;
  const keyword = Array.isArray(queryValue) ? queryValue[0] : queryValue;

  if (keyword?.trim()) {
    redirect(`/orgs/${orgId}/agenda?keyword=${encodeURIComponent(keyword.trim())}`);
  }

  redirect(`/orgs/${orgId}/agenda`);
}
