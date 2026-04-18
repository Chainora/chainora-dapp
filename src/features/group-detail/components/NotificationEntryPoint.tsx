type NotificationEntryPointProps = {
  title: string;
  detail: string;
  tone: string;
};

export function NotificationEntryPoint({ title, detail, tone }: NotificationEntryPointProps) {
  return (
    <article className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{detail}</p>
    </article>
  );
}
