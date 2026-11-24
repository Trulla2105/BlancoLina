/* eslint-disable @next/next/no-img-element */
import { BannerMobileButton } from "@/components/admin/BannerMobileButton";
import { BannerUploader } from "@/components/admin/BannerUploader";
import {
  alternarBannerActivo,
  eliminarBanner,
  moverBanner,
  quitarBannerMobile,
} from "@/lib/actions/banners";
import { getHeroBanners } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase/env";

export default async function AdminBannersPage() {
  const banners = await getHeroBanners();

  return (
    <>
      <h1>Banners de la home</h1>
      <p className="upload-hint" style={{ marginBottom: 24 }}>
        Cada banner puede tener una foto para computadora (horizontal) y, si
        querés, otra para celular (vertical, a pantalla completa). Rotan solas
        en la portada, en el orden de la lista.
      </p>

      {banners.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          {banners.map((banner, index) => (
            <div key={banner.id} className="banner-row">
              <div className="banner-row-previews">
                <div className="brp">
                  <span className="brp-label">🖥️ Computadora</span>
                  <div className="brp-frame brp-desktop">
                    <img src={publicImageUrl(banner.url)} alt="" />
                  </div>
                </div>
                <div className="brp">
                  <span className="brp-label">📱 Celular</span>
                  {banner.url_mobile ? (
                    <div className="brp-frame brp-phone">
                      <img src={publicImageUrl(banner.url_mobile)} alt="" />
                    </div>
                  ) : (
                    <div className="brp-frame brp-phone brp-empty">
                      usa la de
                      <br />
                      computadora
                    </div>
                  )}
                </div>
              </div>

              <div className="banner-row-info">
                <div className="banner-row-meta">
                  <span className={`badge ${banner.activo ? "activo" : "inactivo"}`}>
                    {banner.activo ? "Activo" : "Oculto"}
                  </span>
                  {banner.titulo && <span>“{banner.titulo}”</span>}
                  {banner.subtitulo && <span>{banner.subtitulo}</span>}
                  <span className="upload-hint" style={{ marginTop: 0 }}>
                    → {banner.link ?? "/productos"}
                  </span>
                </div>

                <div className="actions" style={{ flexWrap: "wrap" }}>
                  <form action={moverBanner.bind(null, banner.id, "up")}>
                    <button
                      type="submit"
                      className="icon-btn"
                      disabled={index === 0}
                      title="Subir en el orden"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moverBanner.bind(null, banner.id, "down")}>
                    <button
                      type="submit"
                      className="icon-btn"
                      disabled={index === banners.length - 1}
                      title="Bajar en el orden"
                    >
                      ↓
                    </button>
                  </form>
                  <BannerMobileButton
                    bannerId={banner.id}
                    hasMobile={Boolean(banner.url_mobile)}
                  />
                  {banner.url_mobile && (
                    <form action={quitarBannerMobile.bind(null, banner.id)}>
                      <button type="submit" className="btn btn-sm">
                        Quitar foto cel.
                      </button>
                    </form>
                  )}
                  <form
                    action={alternarBannerActivo.bind(null, banner.id, !banner.activo)}
                  >
                    <button type="submit" className="btn btn-sm">
                      {banner.activo ? "Ocultar" : "Mostrar"}
                    </button>
                  </form>
                  <form
                    action={eliminarBanner.bind(
                      null,
                      banner.id,
                      banner.url,
                      banner.url_mobile
                    )}
                  >
                    <button type="submit" className="btn btn-sm">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="variant-editor">
        <h2>Subir banner nuevo</h2>
        <BannerUploader />
      </div>
    </>
  );
}
