import { NextRequest, NextResponse } from "next/server";

/**
 * Basic 認証。
 * BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が両方設定されている場合のみ有効。
 * (ローカル開発では未設定にして無効化できる)
 */
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="repz", charset="UTF-8"' },
  });
}

export const config = {
  // 静的アセットと Next 内部リクエストは除外
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
