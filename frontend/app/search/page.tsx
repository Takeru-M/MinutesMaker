import { redirect } from "next/navigation";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const queryValue = params?.q;
  const keyword = Array.isArray(queryValue) ? queryValue[0] : queryValue;

  if (keyword?.trim()) {
    redirect(`/agenda?keyword=${encodeURIComponent(keyword.trim())}`);
  }

  redirect("/agenda");
}
