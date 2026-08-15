import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { EmailWatermark } from "@/components/EmailWatermark";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  const status = (session.user as any).status;

  if (status !== "approved") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 20 }}>{status === "blocked" ? "Access blocked" : "Access pending approval"}</h1>
        <p>
          {status === "blocked"
            ? "An admin has blocked your access to this data."
            : "An admin needs to approve your account before you can view any sheets."}
        </p>
      </main>
    );
  }

  const { data: sheets } = await supabaseAdmin
    .from("sheets")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  return (
    <main style={{ padding: "2rem", position: "relative" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Available sheets</h1>

      {(!sheets || sheets.length === 0) && <p>No sheets have been configured yet.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {sheets?.map((sheet) => (
          <li key={sheet.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
            <Link href={`/sheets/${sheet.id}`}>{sheet.display_name}</Link>
          </li>
        ))}
      </ul>

      <EmailWatermark />
    </main>
  );
}
