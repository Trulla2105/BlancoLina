/* eslint-disable @next/next/no-img-element */
import {
  InstagramEmbedForm,
  InstagramUploader,
} from "@/components/admin/InstagramManager";
import { eliminarPost } from "@/lib/actions/instagram";
import { getInstagramEmbed, getInstagramPosts } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/env";

export default async function AdminInstagramPage() {
  const [posts, embed] = await Promise.all([
    getInstagramPosts(),
    getInstagramEmbed(),
  ]);

  return (
    <>
      <h1>Instagram en la home</h1>

      <div className="variant-editor">
        <h2>Widget automático (recomendado)</h2>
        <p className="upload-hint" style={{ marginBottom: 14, lineHeight: 1.6 }}>
          Con un widget tu feed se actualiza solo: subís un post y aparece
          automáticamente, sin cargar nada acá. Serví con cualquier proveedor
          que funcione con HTTPS:
          <br />
          <strong>Behold.so</strong> o <strong>SnapWidget.com</strong> (gratis y
          con HTTPS). Evitá el plan gratis de LightWidget: bloquea HTTPS.
          <br />
          1. Creá una cuenta y conectá tu Instagram{" "}
          tu cuenta de Instagram (quizás te pida que la cuenta sea
          “profesional” — se cambia gratis en Instagram → Configuración → Tipo
          de cuenta).
          <br />
          2. Armá el widget (grilla, 4 u 8 fotos) y copiá el código que te da.
          <br />
          3. Pegá ese código acá abajo y guardá.
        </p>
        <InstagramEmbedForm valor={embed} />
        {embed && (
          <p className="upload-hint" style={{ marginTop: 10 }}>
            ✓ Widget activo. Para sacarlo, borrá el contenido y guardá.
          </p>
        )}
      </div>

      <div className="variant-editor" style={{ marginTop: 20 }}>
        <h2>Carga manual (alternativa)</h2>
        <p className="upload-hint" style={{ marginBottom: 14 }}>
          Solo se usa si no hay widget cargado arriba. Subís la foto de cada
          post y su link.
        </p>

        {posts.length > 0 && (
          <div className="image-thumbs" style={{ marginBottom: 20 }}>
            {posts.map((post) => (
              <div key={post.id} className="image-thumb">
                <div className="thumb-box" style={{ aspectRatio: "1" }}>
                  <img src={publicImageUrl(post.imagen)} alt="" />
                </div>
                <div className="thumb-actions" style={{ justifyContent: "center" }}>
                  <form action={eliminarPost.bind(null, post.id, post.imagen)}>
                    <button type="submit" className="icon-btn" title="Eliminar">
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <InstagramUploader />
      </div>
    </>
  );
}
