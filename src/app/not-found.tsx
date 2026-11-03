import Link from "next/link";
import { ShieldAlert, Home } from "lucide-react";
import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="kn">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-md p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-[#1b4332] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8 text-[#1b4332]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Error 404
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              ಪುಟ ಕಂಡುಬಂದಿಲ್ಲ / Page Not Found
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              PaddyTrace — Digital Procurement Transparency Platform
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/kn"
              className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ (Go to Portal)</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
