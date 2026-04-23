import { LP_SCREENSHOTS } from "../copy";

export function ScreenshotsSection() {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
          {LP_SCREENSHOTS.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-white/70">
          主な画面のイメージです。表示は端末・設定によって異なります。
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {LP_SCREENSHOTS.captions.map((caption, i) => (
            <figure
              key={caption}
              className="overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/5"
            >
              <div className="flex aspect-[16/10] items-center justify-center px-4">
                <span className="text-center text-sm text-white/55">
                  スクリーンショット {i + 1}
                  <span className="mt-1 block text-xs text-white/40">
                    （{caption}）
                  </span>
                </span>
              </div>
              <figcaption className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/60">
                {caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
