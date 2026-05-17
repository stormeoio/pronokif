import { motion } from "framer-motion";
import { Calculator } from "lucide-react";
import { SectionHeader } from "./MenuHelpers";

export function ScoringContent() {
  const mainScoring = [
    {
      category: "Qualifications",
      items: [
        { label: "Pole Position exacte", points: "+5 pts" },
        { label: "Pilote dans le Top 10 (bonne position)", points: "+3 pts" },
        { label: "Pilote dans le Top 10 (mauvaise position)", points: "+1 pt" },
      ],
    },
    {
      category: "Course",
      items: [
        { label: "Vainqueur exact", points: "+5 pts" },
        { label: "Pilote dans le Top 10 (bonne position)", points: "+3 pts" },
        { label: "Pilote dans le Top 10 (mauvaise position)", points: "+1 pt" },
      ],
    },
  ];
  const bonusScoring = [
    { label: "Safety Car (bonne réponse)", points: "+3 pts" },
    { label: "Meilleur tour exact", points: "+5 pts" },
    { label: "Leader 1er virage exact", points: "+5 pts" },
    { label: "Abandon correct (par pilote)", points: "+3 pts" },
    { label: '"Pas de DNF" correct', points: "+5 pts" },
  ];
  const specialScoring = [
    { label: "Top 10 Qualifs parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Top 10 Course parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Meilleur score mini-jeu de la ligue", points: "+2 pts" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Calculator}
        title="Barème des points"
        subtitle="Comment sont calculés les points"
        color="from-purple-500 to-purple-700"
      />
      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {mainScoring.map((section, idx) => (
          <motion.div
            key={idx}
            className="bg-gray-800/50 rounded-lg p-3 border border-purple-500/20"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            <h4 className="font-heading text-sm text-purple-400 mb-3">{section.category}</h4>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-body text-xs text-gray-300">{item.label}</span>
                  <span className="font-data text-sm text-cyan-400 font-semibold">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        <motion.div
          className="bg-gray-800/50 rounded-lg p-3 border border-yellow-500/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-heading text-sm text-yellow-400 mb-3">Paris Bonus</h4>
          <div className="space-y-2">
            {bonusScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-xs text-gray-300">{item.label}</span>
                <span className="font-data text-sm text-yellow-400 font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-lg p-3 border border-cyan-500/30"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-heading text-sm text-cyan-400 mb-3">Bonus Spéciaux</h4>
          <div className="space-y-2">
            {specialScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-body text-xs text-gray-300">{item.label}</span>
                <span className="font-data text-sm text-green-400 font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <p className="font-body text-xs text-gray-400">
            <span className="text-orange-400 font-semibold">Weekend Sprint :</span> Le même barème
            s'applique pour les pronostics Sprint (Sprint Qualifs + Sprint Race + Bonus Sprint).
          </p>
        </motion.div>
        <motion.div
          className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg p-3 border border-yellow-500/30"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-heading text-sm text-yellow-400 mb-2">
            Points maximum par GP (course classique)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-400">Qualifs (Pole + Top 10 parfait)</div>
            <div className="text-right text-cyan-400 font-semibold">45 pts</div>
            <div className="text-gray-400">Course (Winner + Top 10 parfait)</div>
            <div className="text-right text-cyan-400 font-semibold">45 pts</div>
            <div className="text-gray-400">Bonus (SC + FL + T1 + DNF)</div>
            <div className="text-right text-yellow-400 font-semibold">~20 pts</div>
            <div className="text-gray-400 font-semibold border-t border-gray-700 pt-1">
              Total possible
            </div>
            <div className="text-right text-green-400 font-bold border-t border-gray-700 pt-1">
              ~110 pts
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
