async function main() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-trade`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
