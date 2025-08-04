-'use client'
+ 'use client'

-import { useState, useEffect } from 'react'
-import { useRouter } from 'next/navigation'
-import { supabaseBrowser } from '@/lib/supabaseBrowser'
+import { useState, useEffect } from 'react'
+import { useRouter } from 'next/navigation'
+import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'

 export default function LoginPage() {
-  const router = useRouter()
-  const [loading, setLoading] = useState(false)
-  const [message, setMessage] = useState<string | null>(null)
+  const router = useRouter()
+  const supabase = useSupabaseClient()
+  const session = useSession()
+  const [loading, setLoading] = useState(false)
+  const [message, setMessage] = useState<string | null>(null)

   // Auto-redirect if already signed in
   useEffect(() => {
-    supabaseBrowser.auth.getSession().then(({ data }) => {
-      if (data.session) router.replace('/create')
-    })
+    if (session) {
+      router.replace('/create')
+    }
   }, [router, session])

   async function submit(e: React.FormEvent<HTMLFormElement>) {
     e.preventDefault()
     setLoading(true)
     setMessage(null)

     const email = (new FormData(e.currentTarget).get('email') as string).trim()

-    const { error } = await supabaseBrowser.auth.signInWithOtp({
-      email,
-      options: { redirectTo: `${window.location.origin}/confirm` }, // PKCE uses redirectTo
-    })
+    const { error } = await supabase.signInWithOtp({
+      email,
+      options: { redirectTo: `${window.location.origin}/confirm` },
+    })

     setMessage(error ? `❌ ${error.message}` : '✅ Check your inbox for the magic link!')
     setLoading(false)
   }

   return (
     <section className="container max-w-md py-16">
       <h1>Sign in with your email</h1>
       <p className="muted">No passwords. We’ll send a one-time link.</p>
       <form onSubmit={submit} className="space-y-4">
         <input name="email" type="email" required placeholder="you@business.co.uk" className="block w-full px-4 py-2 border rounded" disabled={loading} />
         <button type="submit" className="btn btn-primary" disabled={loading}>
           {loading ? 'Sending…' : 'Send magic link'}
         </button>
       </form>
       {message && <p className="tiny muted mt-4">{message}</p>}
     </section>
   )
 }
