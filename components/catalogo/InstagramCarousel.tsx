/* eslint-disable @next/next/no-img-element */
import { InstagramIcon } from "@/components/ui/Icons";
import { perfilInstagram } from "@/lib/contacto";
import { publicImageUrl } from "@/lib/supabase/env";
import type { InstagramPost } from "@/lib/types";

/**
 * Fila de posteos de Instagram (los que cargó el admin). Cada uno linkea
 * al post real. Se desliza en el celular.
 */
export function InstagramCarousel({
  posts,
  instagram = "",
}: {
  posts: InstagramPost[];
  instagram?: string;
}) {
  const perfil = perfilInstagram(instagram);
  if (posts.length === 0) return null;

  return (
    <section className="ig-section">
      <div className="ig-head">
        <InstagramIcon size={18} />
        <span>Seguinos en Instagram</span>
        {perfil && (
          <a href={perfil.url} target="_blank" rel="noopener noreferrer" className="ig-user">
            {perfil.usuario}
          </a>
        )}
      </div>
      <div className="ig-track">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="ig-item"
          >
            <img src={publicImageUrl(post.imagen)} alt="Posteo de Instagram" loading="lazy" />
            <span className="ig-overlay">
              <InstagramIcon size={24} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
