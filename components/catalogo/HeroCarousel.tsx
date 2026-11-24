"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronIcon } from "@/components/ui/Icons";

export interface HeroSlide {
  id: string;
  src: string;
  srcMobile: string | null;
  titulo: string | null;
  subtitulo: string | null;
  boton: string | null;
  link: string;
}

const INTERVAL_MS = 6000;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slides.length) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [next, slides.length, index]);

  if (slides.length === 0) return null;

  return (
    <section className="hero" aria-roledescription="carrusel">
      {slides.map((s, i) => (
        <Link
          key={s.id}
          href={s.link}
          className={i === index ? "hero-slide active" : "hero-slide"}
          aria-hidden={i !== index}
          tabIndex={i === index ? 0 : -1}
        >
          <picture>
            {s.srcMobile && <source media="(max-width: 700px)" srcSet={s.srcMobile} />}
            <img src={s.src} alt={s.titulo ?? ""} loading={i === 0 ? "eager" : "lazy"} />
          </picture>
          {(s.titulo || s.subtitulo || s.boton) && (
            <div className="hero-txt">
              {s.titulo && <h2>{s.titulo}</h2>}
              {s.subtitulo && <p>{s.subtitulo}</p>}
              <span className="btn-pill">{s.boton || "Ver más"}</span>
            </div>
          )}
        </Link>
      ))}

      {slides.length > 1 && (
        <>
          <span className="hero-count">
            {index + 1} / {slides.length}
          </span>
          <button type="button" className="hero-arrow prev" aria-label="Anterior" onClick={prev}>
            <ChevronIcon size={26} dir="left" />
          </button>
          <button type="button" className="hero-arrow next" aria-label="Siguiente" onClick={next}>
            <ChevronIcon size={26} dir="right" />
          </button>
        </>
      )}
    </section>
  );
}
