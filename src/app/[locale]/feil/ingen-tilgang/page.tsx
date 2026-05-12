
import ClientForbidden from "./ClientForbidden";

export const runtime = 'edge';

export default function ForbiddenPage() {
  return <ClientForbidden />;
}
