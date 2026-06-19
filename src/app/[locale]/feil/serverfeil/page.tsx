
import ClientServerError from "./ClientServerError";

export const runtime = 'nodejs';

export default function ServerErrorPage() {
  return <ClientServerError />;
}
