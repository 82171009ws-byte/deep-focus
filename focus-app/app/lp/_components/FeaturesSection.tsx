import { LP_FEATURES } from "../copy";

export function FeaturesSection() {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
          サービス紹介
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/70">
          作業に入りやすい環境づくりをサポートする主な機能です。
        </p>
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LP_FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20"
            >
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {f.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
