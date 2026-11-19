import { withBasePath } from "@/lib/base-path"

// The Maple Key lockup (samara over the wordmark) in one flat colour. The PNG
// is alpha only, used as a mask over currentColor, so the logo takes whatever
// text colour it sits in: --foreground on the top bar, dark in light mode and
// light in dark mode. Height comes from `className`; width follows the ratio.
const LOCKUP = { src: "/maple-key-lockup.png", ratio: 360 / 306 }

export default function MapleKeyLogo({ className = "" }: { className?: string }) {
  const url = `url(${withBasePath(LOCKUP.src)})`
  return (
    <span
      className={`block flex-shrink-0 bg-current ${className}`}
      style={{
        aspectRatio: LOCKUP.ratio,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      aria-hidden="true"
    />
  )
}
