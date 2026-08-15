"use client";
import { useSession } from "next-auth/react";

export function EmailWatermark() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  if (!email) return null;

  const tile2 = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='280'>
       <text x='10' y='150' font-size='26' fill='rgba(0,0,0,0.08)'
         transform='rotate(-28 280 140)'>${email}</text>
     </svg>`
  );
  const tile = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>
     <text x='4' y='54' font-size='20' fill='rgba(0,0,0,0.08)'
       transform='rotate(-28 100 50)'>${email}</text>
   </svg>`
  );

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
        backgroundImage: `url("data:image/svg+xml,${tile}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}
