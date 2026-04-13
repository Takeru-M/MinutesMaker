import { redirect } from "next/navigation";

type AdminLoginPageProps = {
  searchParams?: {
    notice?: string | string[];
    redirect?: string | string[];
  };
};

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = new URLSearchParams();

  const notice = Array.isArray(searchParams?.notice) ? searchParams?.notice[0] : searchParams?.notice;
  if (notice) {
    params.set("notice", notice);
  }

  const redirectTarget = Array.isArray(searchParams?.redirect) ? searchParams?.redirect[0] : searchParams?.redirect;
  if (redirectTarget) {
    params.set("redirect", redirectTarget);
  }

  redirect(`/login?${params.toString()}`);
}
