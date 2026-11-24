import { formatDate } from "@/lib/format";
import { getNewsletter } from "@/lib/queries";

export default async function NewsletterPage() {
  const lista = await getNewsletter();
  return (
    <>
      <h1>Newsletter</h1>
      <p className="hint">{lista.length} suscriptos. Para copiar todos los emails, seleccioná el cuadro de abajo.</p>
      {lista.length > 0 && (
        <textarea className="emails-box" readOnly rows={6} value={lista.map((s) => s.email).join(", ")} />
      )}
      {lista.length === 0 ? (
        <div className="empty-note">Todavía no hay suscriptos.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.email}>
                <td>{s.email}</td>
                <td>{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
