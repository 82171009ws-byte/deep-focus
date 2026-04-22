import { LP_FAQ } from "../copy";

export function FaqSection() {
  return (
    <section className="border-t border-white/10 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
          よくある質問
        </h2>
        <dl className="mt-10 space-y-6">
          {LP_FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 md:p-6"
            >
              <dt className="font-medium text-white">{item.q}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-white/75">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
