import SignupForm from "./_components/SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = (sp.next ?? "").trim();

  return (
    <main className="mx-auto max-w-md px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-extrabold">会員登録</h1>
      <p className="mt-2 text-sm text-slate-600">氏名・メール・電話を登録します</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <SignupForm nextPath={next} />
      </div>
    </main>
  );
}
