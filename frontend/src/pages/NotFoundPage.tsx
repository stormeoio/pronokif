import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

/**
 * 404 page with arcade-themed design.
 * Shows when the user navigates to an unknown route.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-app-main">
      <motion.div
        className="max-w-sm w-full text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Animated 404 */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        >
          <div className="text-8xl font-heading text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 select-none">
            404
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Flag className="w-8 h-8 text-red-400" />
          </motion.div>
        </motion.div>

        <div className="space-y-2">
          <h1 className="font-heading text-xl text-white uppercase">
            Hors piste !
          </h1>
          <p className="font-body text-sm text-gray-400">
            Cette page n'existe pas ou a ete deplacee. Retourne sur le circuit !
          </p>
        </div>

        {/* Kerb stripe */}
        <div className="w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500 opacity-50 rounded" />

        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => { haptic("light"); navigate(-1); }}
            variant="outline"
            className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button
            onClick={() => { haptic("light"); navigate("/"); }}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
