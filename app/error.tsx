"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="form-page">
      <h1>Algo salió mal</h1>
      <div className="status-box rechazado">
        <span className="status-label">Error del servidor</span>
        <p>
          Ocurrió un error inesperado al cargar la página. Probá de nuevo en
          unos segundos.
        </p>
        {error.digest && (
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--gray)" }}>
            Código: {error.digest}
          </p>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button type="button" className="btn btn-solid" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
