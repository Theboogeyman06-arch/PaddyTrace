import Link from "next/link";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-6">
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
          ನೀವು ವಿನಂತಿಸಿದ ಪುಟ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/kn"
          className="bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold px-5 py-3 rounded-xl shadow transition flex items-center justify-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>ಮುಖಪುಟಕ್ಕೆ ಹೋಗಿ (Home)</span>
        </Link>
        <Link
          href="/kn/qr-lab"
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-3 rounded-xl transition flex items-center justify-center space-x-2"
        >
          <span>ಕ್ಯೂಆರ್ & ಹ್ಯಾಶ್ ಲ್ಯಾಬ್ (QR Lab)</span>
        </Link>
      </div>
    </div>
  );
}

