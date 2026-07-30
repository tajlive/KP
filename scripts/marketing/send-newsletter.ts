/**
 * Klarpakke Newsletter Sender
 *
 * Sender forhåndsgenerert nyhetsbrev til en Resend-mottakerliste.
 *
 * Bruk:
 *   npx tsx scripts/marketing/send-newsletter.ts --file=content/marketing/queue/YYYY-MM-DD-newsletter.html --audience=audience_id [--subject="..."] [--dry-run]
 */
import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import path from "node:path";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL ?? "hei@klarpakke.no";
const FROM_NAME = process.env.NEWSLETTER_FROM_NAME ?? "Klarpakke";

if (!RESEND_API_KEY) {
  console.error("Mangler RESEND_API_KEY");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith("--file="));
  const audienceArg = args.find((a) => a.startsWith("--audience="));
  const subjectArg = args.find((a) => a.startsWith("--subject="));
  const dryRun = args.includes("--dry-run");

  if (!fileArg) {
    console.error("Bruk: --file=content/marketing/queue/YYYY-MM-DD-newsletter.html [--audience=audience_id] [--subject=...] [--dry-run]");
    process.exit(1);
  }

  return {
    file: path.resolve(process.cwd(), fileArg.split("=")[1]),
    audienceId: audienceArg?.split("=")[1],
    subject: subjectArg?.split("=")[1] ?? "Ukentlig oppdatering fra Klarpakke",
    dryRun,
  };
}

async function main() {
  const { file, audienceId, subject, dryRun } = parseArgs();

  const html = await readFile(file, "utf-8");

  // Hvis ingen audience er oppgitt, send kun til testbruker
  if (!audienceId) {
    const testEmail = process.env.NEWSLETTER_TEST_EMAIL ?? "tomarnejensen@gmail.com";
    console.log(`✉️ Ingen --audience oppgitt — sender kun test til ${testEmail}`);

    if (dryRun) {
      console.log("\n🧪 DRY RUN — sender ikke e-post");
      console.log(`Emne: ${subject}`);
      console.log(`Fra: ${FROM_NAME} <${FROM_EMAIL}>`);
      console.log(`HTML-lengde: ${html.length} tegn`);
      return;
    }

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [testEmail],
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend-feil:", error);
      process.exit(1);
    }

    console.log(`✅ Test-e-post sendt: ${data?.id}`);
    return;
  }

  // Hent mottakere fra audience
  const contacts: { email: string; first_name?: string }[] = [];
  let cursor: string | undefined;
  do {
    const { data, error } = await resend.contacts.list({
      audienceId,
      cursor,
    });

    if (error) {
      console.error("❌ Kunne ikke hente kontakter:", error);
      process.exit(1);
    }

    if (data?.data) {
      for (const contact of data.data) {
        if (contact.email) {
          contacts.push({ email: contact.email, first_name: contact.first_name ?? undefined });
        }
      }
    }
    cursor = data?.next_cursor ?? undefined;
  } while (cursor);

  if (contacts.length === 0) {
    console.warn("Ingen kontakter i audience. Ingenting å sende.");
    process.exit(0);
  }

  console.log(`✉️ Sender til ${contacts.length} mottakere i audience ${audienceId}`);

  if (dryRun) {
    console.log("\n🧪 DRY RUN — sender ikke e-post");
    console.log(`Første 5 mottakere: ${contacts.slice(0, 5).map((c) => c.email).join(", ")}`);
    return;
  }

  // Send via batch for å unngå rate limits
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const { data, error } = await resend.batch.send(
      batch.map((contact) => ({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [contact.email],
        subject,
        html,
      }))
    );

    if (error) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} feilet:`, error);
      failed += batch.length;
    } else {
      sent += batch.length;
      console.log(`✅ Batch ${i / BATCH_SIZE + 1}: ${batch.length} sendt`);
    }
  }

  console.log(`\n📋 Oppsummering: ${sent} sendt, ${failed} feilet, ${contacts.length} totalt`);
}

main().catch((err) => {
  console.error("❌ Uventet feil:", err);
  process.exit(1);
});
