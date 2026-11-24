import { marcarArrepentimiento } from "@/lib/actions/configuracion";
import { formatDateTime } from "@/lib/format";
import { getArrepentimientos } from "@/lib/queries";

export default async function ArrepentimientosPage() {
  const lista = await getArrepentimientos();
  return (
    <>
      <h1>Arrepentimientos</h1>
      <p className="hint">
        Solicitudes del Botón de arrepentimiento. El cliente recibe el código al instante; contactalo para coordinar
        la devolución y marcala como atendida.
      </p>
      {lista.length === 0 ? (
        <div className="empty-note">No hay solicitudes.</div>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Cliente</th>
                <th>Pedido</th>
                <th>Comentario</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className={a.atendido ? "row-muted" : undefined}>
                  <td>{formatDateTime(a.created_at)}</td>
                  <td>{a.codigo}</td>
                  <td>
                    {a.nombre}
                    <br />
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                    {a.telefono && <> · {a.telefono}</>}
                    {a.dni && <> · DNI {a.dni}</>}
                  </td>
                  <td>{a.numero_pedido ?? "—"}</td>
                  <td>{a.motivo ?? "—"}</td>
                  <td>
                    <form action={marcarArrepentimiento}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="atendido" value={a.atendido ? "false" : "true"} />
                      <button type="submit" className="btn btn-sm">
                        {a.atendido ? "Reabrir" : "Marcar atendido"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
