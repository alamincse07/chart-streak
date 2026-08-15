import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SheetGrid } from "@/components/SheetGrid";
import { EmailWatermark } from "@/components/EmailWatermark";

export default async function SheetPage({ params }: { params: { sheetId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }

  const status = (session.user as any).status;
  if (status !== "approved") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 20 }}>{status === "blocked" ? "Access blocked" : "Access pending approval"}</h1>
        <p>
          {status === "blocked"
            ? "An admin has blocked your access to this data."
            : "An admin needs to approve your account before you can view this data."}
        </p>
      </main>
    );
  }

  const { data: sheet } = await supabaseAdmin.from("sheets").select("display_name").eq("id", params.sheetId).single();

  if (!sheet) {
    notFound();
  }

  return (
    <main style={{ padding: "0.5rem", position: "relative" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{sheet.display_name}</h1>

      {sheet.display_name === "Next Entry" && (
        <p>
          <h5>এন্টি নেওয়ার জন্য আপনাকে সাজেস্ট করা হচ্ছে। মূলত পরবর্তী ট্রেডিং সেশনে আপনি এগুলোই দেখবেন।</h5>
        </p>
      )}
      <SheetGrid sheetId={params.sheetId} />
      <EmailWatermark />
    </main>
  );
}
