import { useState } from "react";
import { Package } from "lucide-react";

// Shows the school logo from public/nu-logo.png.
// The size sets the height. The width adjusts by itself, so the logo is never squeezed.
// If that file is missing, a simple placeholder icon is shown instead.
export default function Logo({ size = 44 }: { size?: number }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-xl bg-nu-gold text-nu-navy"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <Package style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }

  return (
    <img
      src="/nu-logo.png"
      alt="National University logo"
      className="w-auto max-w-[40vw] shrink-0 object-contain"
      style={{ height: size }}
      onError={() => setMissing(true)}
    />
  );
}
