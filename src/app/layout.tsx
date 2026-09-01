import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "lib-kit-components";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

const APP_NAME = "Crossfit team";

/**
 * Splash screens de iOS: en standalone, Safari sólo usa la imagen cuyo `media`
 * coincide **exacto** con el dispositivo (ancho, alto y densidad en px CSS).
 * Los PNG los genera `npm run gen-icons` a partir de `assets/logo.png`.
 */
const IOS_SPLASH: Array<[w: number, h: number, dw: number, dh: number, dpr: number]> = [
  [1290, 2796, 430, 932, 3], // 15/16 Pro Max, 14 Pro Max
  [1179, 2556, 393, 852, 3], // 15/16 Pro, 14 Pro
  [1284, 2778, 428, 926, 3], // 12/13 Pro Max, 14 Plus
  [1170, 2532, 390, 844, 3], // 12/13/14
  [1125, 2436, 375, 812, 3], // X, XS, 11 Pro, 13 mini
  [1242, 2688, 414, 896, 3], // XS Max, 11 Pro Max
  [828, 1792, 414, 896, 2], // XR, 11
  [750, 1334, 375, 667, 2], // SE 2/3, 8
  [1536, 2048, 768, 1024, 2], // iPad 9.7"
  [1668, 2388, 834, 1194, 2], // iPad Pro 11"
];

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Box de Crossfit team — reservá tu WOD, seguí tu progreso y no te pierdas ningún aviso.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
    startupImage: IOS_SPLASH.map(([w, h, dw, dh, dpr]) => ({
      url: `/splash/${w}x${h}.png`,
      media: `(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
  icons: {
    // El .ico vive en `public/` (y no como `app/favicon.ico`) porque el file
    // convention de Next pisaría esta lista completa.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dc2626" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
