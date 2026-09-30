"use client";

import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Carousel — shadcn/ui carousel on Embla 8. APG carousel pattern: region with aria-roledescription="carousel",
 * slides are groups "slide n of m", visible Previous/Next buttons, ←/→ when focus is inside, and a polite live
 * region that announces the current slide. Never auto-advances (WCAG 2.2.2) — if you add autoplay, add a pause control.
 * prefers-reduced-motion: slides jump instead of animating.
 */
export type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

export interface CarouselProps {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
  /** Accessible name of the carousel region, e.g. "Featured products". Required for more than one carousel per page. */
  label?: string;
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (i: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selected: number;
  count: number;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function Carousel({ orientation = "horizontal", opts, setApi, plugins, label, className, children, ...props }: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y", ...(prefersReducedMotion() ? { duration: 1 } : {}) },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const onSelect = React.useCallback((a: CarouselApi) => {
    if (!a) return;
    setCanScrollPrev(a.canScrollPrev());
    setCanScrollNext(a.canScrollNext());
    setSelected(a.selectedScrollSnap());
    setCount(a.scrollSnapList().length);
  }, []);
  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);
  const scrollTo = React.useCallback((i: number) => api?.scrollTo(i), [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      if (event.key === prev) { event.preventDefault(); scrollPrev(); }
      else if (event.key === next) { event.preventDefault(); scrollNext(); }
    },
    [orientation, scrollPrev, scrollNext]
  );

  React.useEffect(() => { if (api && setApi) setApi(api); }, [api, setApi]);
  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); api.off("reInit", onSelect); };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, scrollTo, canScrollPrev, canScrollNext, selected, count, label }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-slot="carousel"
        {...props}
      >
        {children}
        <p className="sr-only" aria-live="polite" aria-atomic="true">{count > 0 ? `Slide ${selected + 1} of ${count}` : ""}</p>
      </div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)} {...props} />
    </div>
  );
}

export function CarouselItem({ className, index, ...props }: React.ComponentProps<"div"> & { index?: number }) {
  const { orientation, count } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={index !== undefined && count ? `${index + 1} of ${count}` : undefined}
      data-slot="carousel-item"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)}
      {...props}
    />
  );
}

export function CarouselPrevious({ className, variant = "outline", size = "icon", ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "-left-12 top-1/2 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      aria-label="Previous slide"
      {...props}
    >
      <ArrowLeft aria-hidden />
    </Button>
  );
}

export function CarouselNext({ className, variant = "outline", size = "icon", ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();
  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn("absolute size-8 rounded-full", orientation === "horizontal" ? "-right-12 top-1/2 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="Next slide"
      {...props}
    >
      <ArrowRight aria-hidden />
    </Button>
  );
}

/** Agere addition: dot pagination. Each dot is a button "Go to slide n"; the current one has aria-current. */
export function CarouselDots({ className }: { className?: string }) {
  const { count, selected, scrollTo } = useCarousel();
  if (count < 2) return null;
  return (
    <div className={cn("mt-4 flex justify-center gap-1.5", className)} data-slot="carousel-dots">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          aria-current={i === selected ? "true" : undefined}
          onClick={() => scrollTo(i)}
          className="grid size-6 place-items-center rounded-full outline-none focus-ring"
        >
          <span aria-hidden className={cn("block h-1.5 rounded-full bg-muted-foreground/30 transition-all", i === selected ? "w-5 bg-primary" : "w-1.5")} />
        </button>
      ))}
    </div>
  );
}
