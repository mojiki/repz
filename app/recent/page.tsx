import { redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui";
import { dateToStr, todayStr } from "@/lib/date";
import { getRecentSession } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RecentPage() {
  const recent = await getRecentSession(todayStr());
  if (recent) redirect(`/session/${dateToStr(recent.date)}`);

  return (
    <div className="space-y-4">
      <BackLink href="/" label="トップ" />
      <h1 className="text-lg font-bold">直近トレ</h1>
      <p className="text-sm text-muted">まだ過去の記録がありません。</p>
      <Link href="/record" className="btn btn-primary w-full">
        記録する
      </Link>
    </div>
  );
}
