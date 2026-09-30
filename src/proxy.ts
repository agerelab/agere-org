// Proxy (TECH-01 §2): cookie present? else /masuk?redirect_to=… — no database access here.
// The session row itself is checked on every request by the page (PRD-01 US-6).
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = /^\/(?:$|masuk|daftar|lupa-kata-sandi|reset-kata-sandi|verifikasi|cek-email|api\/|_next\/|favicon|icon)/;

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.test(pathname) || req.cookies.has("agere_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/masuk";
  url.search = `?redirect_to=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)"],
};
