import { Metadata } from "next";
import ClientAdminSessions from "./ClientAdminSessions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Admin Sessions | Klarpakke`,
  };
}

export default function AdminSessionsPage() {
  return <ClientAdminSessions />;
}
