export function MembershipNoticeCard({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm">{detail}</p>
    </article>
  );
}
