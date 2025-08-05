--- a/app/confirm/page.tsx
+++ b/app/confirm/page.tsx
@@ -6,10 +6,20 @@
   const params = useSearchParams()
   const supabase = useSupabaseClient()
   const [status, setStatus] = useState<'working' | 'error'>('working')
+
+  // pull the "code" param from the magic-link redirect
+  const code = params.get('code')

   useEffect(() => {
     async function finishSignIn() {
-      const { data, error } = await supabase.auth.exchangeCodeForSession()
+      // 1) fail fast if we have no code
+      if (!code) {
+        console.error('[confirm] no code in URL')
+        setStatus('error')
+        return
+      }
+
+      // 2) pass the code into exchangeCodeForSession
+      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
       if (error) {
         console.error('[confirm] exchange error:', error)
         setStatus('error')
@@ -19,6 +29,7 @@ export default function ConfirmPage() {
     }
     finishSignIn()
   }, [supabase, router, params])
+
   // ...
 }
