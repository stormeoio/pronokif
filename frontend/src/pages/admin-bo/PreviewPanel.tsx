/**
 * App Preview Panel — resizable iframe showing the public app in mobile format.
 * Useful for development assistance and beta phase monitoring.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
  Wifi,
  WifiOff,
} from "lucide-react";

interface PreviewPanelProps {
  open: boolean;
  onClose: () => void;
}

type DeviceMode = "mobile" | "tablet" | "desktop";

const DEVICE_SIZES: Record<DeviceMode, { width: number; height: number; label: string }> = {
  mobile: { width: 375, height: 812, label: "iPhone 13" },
  tablet: { width: 768, height: 1024, label: "iPad" },
  desktop: { width: 1280, height: 800, label: "Bureau" },
};

export default function PreviewPanel({ open, onClose }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceMode>("mobile");
  const [currentPath, setCurrentPath] = useState("/");
  const [iframeKey, setIframeKey] = useState(0);

  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const previewUrl = `${frontendUrl}${currentPath}`;

  const handleRefresh = () => setIframeKey((k) => k + 1);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setIframeKey((k) => k + 1);
  };

  const quickLinks = [
    { path: "/", label: "Tableau de bord" },
    { path: "/auth", label: "Connexion" },
    { path: "/predictions", label: "Pronostics" },
    { path: "/leaderboard", label: "Classement" },
    { path: "/championship", label: "Championnat" },
    { path: "/profile", label: "Profil" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-screen w-[380px] bg-[#0a0f1a] border-l border-gray-800 z-30 flex flex-col"
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="font-heading text-xs text-white uppercase">Aperçu</span>
              <span className="font-body text-[10px] text-gray-500">
                {DEVICE_SIZES[device].label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDevice("mobile")}
                className={`p-1.5 rounded ${device === "mobile" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDevice("tablet")}
                className={`p-1.5 rounded ${device === "tablet" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Tablette"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDevice("desktop")}
                className={`p-1.5 rounded ${device === "desktop" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-gray-700 mx-1" />
              <button
                onClick={handleRefresh}
                className="p-1.5 text-gray-500 hover:text-white rounded"
                title="Rafraîchir"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-500 hover:text-white rounded"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-red-400 rounded"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick nav */}
          <div className="px-3 py-2 border-b border-gray-800/50 flex gap-1 overflow-x-auto no-scrollbar">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavigate(link.path)}
                className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-body transition-all ${
                  currentPath === link.path
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* URL bar */}
          <div className="px-3 py-1.5 border-b border-gray-800/50">
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-2 py-1">
              <Wifi className="w-3 h-3 text-green-400 flex-shrink-0" />
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRefresh()}
                className="flex-1 bg-transparent text-xs text-gray-300 font-mono outline-none"
                placeholder="/"
              />
            </div>
          </div>

          {/* Iframe container */}
          <div className="flex-1 overflow-hidden flex items-start justify-center p-2 bg-[#050a14]">
            <div
              className="relative rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl"
              style={{
                width: device === "desktop" ? "100%" : `min(${DEVICE_SIZES[device].width}px, 100%)`,
                height:
                  device === "desktop"
                    ? "100%"
                    : `min(${DEVICE_SIZES[device].height}px, calc(100vh - 160px))`,
                transform:
                  device === "tablet"
                    ? "scale(0.48)"
                    : device === "desktop"
                      ? "none"
                      : "scale(0.95)",
                transformOrigin: "top center",
              }}
            >
              {/* Device frame notch (mobile only) */}
              {device === "mobile" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-10" />
              )}
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="w-full h-full bg-white"
                style={{
                  width: DEVICE_SIZES[device].width,
                  height: DEVICE_SIZES[device].height,
                  transform: device === "tablet" ? "scale(1)" : undefined,
                }}
                title="Aperçu de l'app"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </div>

          {/* Status bar */}
          <div className="px-3 py-1.5 border-t border-gray-800 flex items-center justify-between">
            <span className="font-body text-[10px] text-gray-600">
              {DEVICE_SIZES[device].width} x {DEVICE_SIZES[device].height}
            </span>
            <span className="font-body text-[10px] text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              En direct
            </span>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
