import Image from "next/image";
import { LP_SCREENSHOTS } from "../copy";

export function ScreenshotsSection() {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-xl font-semibold text-white md:text-2xl">
          {LP_SCREENSHOTS.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
          主な画面のイメージです。表示は端末・設定によって異なります。
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-12 md:flex-row md:items-end md:justify-center md:gap-10">
          {LP_SCREENSHOTS.mockups.map((item, i) => {
            const isDesktop = i === 0;
            return (
              <figure
                key={item.src}
                className={
                  isDesktop
                    ? "m-0 w-full max-w-3xl -translate-y-1 p-0"
                    : "m-0 w-full max-w-[min(100%,16rem)] -translate-y-1 p-0 md:max-w-[12rem]"
                }
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes={
                    isDesktop
                      ? "(max-width: 768px) 100vw, 42vw"
                      : "(max-width: 768px) 16rem, 12rem"
                  }
                  className="h-auto w-full rounded-xl shadow-2xl hover:scale-105 transition duration-300"
                />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
