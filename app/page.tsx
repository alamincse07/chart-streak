import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { EmailWatermark } from '@/components/EmailWatermark';
import { SignInButton } from '@/components/SignInButton';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main
        style={{
          padding: '1rem 2rem',
          maxWidth: 560,
          fontSize: 16,
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
       <div style={{fontSize: 14}}>

       <p style={{ color: 'rgb(49, 0, 156)',  lineHeight: 1.6, marginBottom: 18 }}>
        📌 নিয়মিত মার্কেট আপডেট, Smart Money Concepts (SMC), Wyckoff Theory, VSA, VPA, Elliott Wave এবং অ্যাডভান্সড ইন্ডিকেটরের সাহায্যে তৈরি ট্রেড প্ল্যান পেতে আমাদের পেইড ট্রেডিং কমিউনিটিতে যুক্ত হোন
        </p>
        <p> ⚠️ এটি একটি পেইড ট্রেডিং গ্রুপ  (সার্ভিসসমূহ): </p>

      <p>✅ হাই-প্রোবাবিলিটি সেটআপ: চার্ট অ্যানালাইসিস সহ বিস্তারিত ট্রেড সেটআপ।</p>
      <p>✅ পোর্টফোলিও গাইডলাইন </p>
      <p>✅ ট্রেড লজিক: কেন একটি স্টকে এন্ট্রি নিবেন, তার যৌক্তিক ব্যাখ্যা এবং সাথে শেখার সুযোগ।</p>
      <p>✅ মনিটরিং: মার্কেটের যেকোনো অনাকাঙ্ক্ষিত পরিস্থিতিতে গাইডলাইন।</p>
      <p>✅ সাপ্তাহিক জুম মিটিং: মার্কেটের সার্বিক অবস্থা আলোচনা, ট্রেডিং কৌশল শেখানো</p>

        <p>
                  🔹 মান্থলি ফি: ১০১০ টাকা
          
       </p>
        <p>
        🔹 বিকাশ: 01558945495 (Personal - Send Money)
        </p>
       </div>
       
       
        <p style={{ color: '#e52424', fontSize: 13, marginTop: 10 }}>
        সাইন ইন করলে আপনার অ্যাকাউন্ট তৈরি হবে — পেমেন্ট করার পর একজন অ্যাডমিন আপনাকে অনুমোদন দেবেন।
        </p>
        <p>
          Admin: 01558945495
        </p>
      </main>
    );
  }

  const status = (session.user as any).status;

  if (status !== 'approved') {
    return (
      <main style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: 20 }}>
          {status === 'blocked' ? 'Access blocked' : 'Access pending approval'}
        </h1>
        <p>
          {status === 'blocked'
            ? 'An admin has blocked your access to this data.'
            : 'An admin needs to approve your account before you can view any sheets.'}
        </p>
      </main>
    );
  }

  const { data: sheets } = await supabaseAdmin
    .from('sheets')
    .select('id, display_name')
    .order('display_name', { ascending: true });

  return (
    <main style={{ padding: '1rem', position: 'relative' }}>
      <section
        style={{
          background: '#f7f9fc',
          border: '1px solid #e5e9f0',
          borderRadius: 5,
          padding: '5px',
          marginBottom: 18,
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Welcome to Chart Streak</h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        🔹Please see the sheets for entry and watch list. 
        <br/>
        🔹Please don&apos;t share information to outside.
        </p>
      </section>

      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Available sheets</h1>

      {(!sheets || sheets.length === 0) && <p>No sheets have been configured yet.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {sheets?.map((sheet) => (
          <li key={sheet.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <Link href={`/sheets/${sheet.id}`}>{sheet.display_name}</Link>
          </li>
        ))}
      </ul>

      <EmailWatermark />
    </main>
  );
}
