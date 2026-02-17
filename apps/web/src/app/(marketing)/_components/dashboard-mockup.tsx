export function DashboardMockup() {
  return (
    <section className="relative px-6 pb-24">
      {/* Horizontal glow line */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[1px] w-[80%] max-w-5xl -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Product Demo
          </p>
          <p className="mt-1 text-sm font-medium">See AutoClaw in action</p>
        </div>

        <div className="p-3 sm:p-5">
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black">
            <div className="relative w-full pt-[56.25%]">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://player.vimeo.com/video/1165647906?transparent=0"
                title="What is AutoClaw?"
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
