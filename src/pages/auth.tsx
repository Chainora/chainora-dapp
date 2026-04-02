export function AuthPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">QR Login</h1>
      <p className="mt-2 text-slate-600">
        Placeholder for QR generation and NFC-backed JavaCard authentication.
      </p>
      <div className="mt-6 grid h-64 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        QR Placeholder
      </div>
    </section>
  );
}
