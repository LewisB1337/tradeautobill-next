--- a/app/api/auth/verify/route.ts
+++ b/app/api/auth/verify/route.ts
@@ -17,18 +17,29 @@ export async function GET(req: Request) {
   const { searchParams } = new URL(req.url)
   const email     = searchParams.get('email')
   const tokenHash = searchParams.get('token_hash')
   const token     = searchParams.get('token')

   if (!email || (!tokenHash && !token)) {
     return NextResponse.json(
       { message: 'Missing parameters (email + token_hash or token)' },
       { status: 400 }
     )
   }

-  // 4) Build the correct params object for verifyOtp()
-  const params = tokenHash
-    ? { token_hash: tokenHash, type: 'email' }       // Magic-link flow
-    : { email, token: token!,      type: 'email' }   // OTP flow
-
-  // 5) Verify the OTP/email link with Supabase
-  const { data, error } = await supabase.auth.verifyOtp(params)
+  // 4) Call verifyOtp in each branch so TS can infer exactly one variant
+  let data, error
+
+  if (tokenHash) {
+    // ───── magic-link (token_hash) flow ─────
+    // note: we tag this with 'magiclink' so TS sees
+    // exactly the VerifyTokenHashParams variant
+    ;({ data, error } = await supabase.auth.verifyOtp({
+      token_hash: tokenHash,
+      type: 'magiclink',
+    }))
+  } else {
+    // ───── 6-digit OTP flow ─────
+    // this matches VerifyEmailOtpParams exactly
+    ;({ data, error } = await supabase.auth.verifyOtp({
+      email,
+      token: token!,
+      type: 'email',
+    }))
+  }

   if (error) {
     return NextResponse.json({ message: error.message }, { status: 400 })
   }
