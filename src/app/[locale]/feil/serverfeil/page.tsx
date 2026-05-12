
import ClientServerError from "./ClientServerError";

export const runtime = 'edge';

export default function ServerErrorPage() {
  return <ClientServerError />;
}
