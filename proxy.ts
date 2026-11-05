import { NextResponse, type NextRequest } from "next/server";

/** Every HTML document gets its own script authority, including Next's runtime. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    // Meshopt decodes the room's GLBs in WebAssembly; this does not allow JS eval.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
    // Room colours and React's per-element styles use style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // RPC and Wallet Standard/MWA may use secure remote or loopback transports.
    "connect-src 'self' blob: https: wss: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "frame-src 'self' solana-wallet:",
    "form-action 'self'",
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  // Never trust a caller-supplied nonce or policy.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/|3d/|images/|favicon|icon|apple-icon|manifest|robots|sitemap|\\.well-known/).*)"],
};
