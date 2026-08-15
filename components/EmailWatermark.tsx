"use client";
import { useSession } from "next-auth/react";

export function EmailWatermark() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  if (!email) return null;
  const [namePart, domainPart] = email.split("@");
  const line1 = "Chart Streak";
  const line2 = namePart;

  const tile = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>
       <text x='4' y='44' font-size='18' fill='rgba(0,0,0,0.090)'
         transform='rotate(-28 100 50)'>${line1}</text>
       <text x='8' y='60' font-size='18' fill='rgba(0,0,0,0.090)'
         transform='rotate(-28 100 50)'>${line2}</text>
     </svg>`
  );

  return (
    <div
      aria-hidden="true"
      style={{
        // 'absolute' (not 'fixed') so this only covers the nearest
        // positioned ancestor — the page's <main style={{position:'relative'}}>
        // — rather than the whole viewport. That keeps it off the sticky
        // header (and any footer), scoped to just the sheet body content.
        position: "absolute",
        inset: 100,
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
        backgroundImage: `url("data:image/svg+xml,${tile}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}
