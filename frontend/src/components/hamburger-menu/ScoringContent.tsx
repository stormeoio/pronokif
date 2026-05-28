/**
 * ScoringContent — Points system breakdown in the hamburger menu.
 * Broadcast Premium: pk-surface cards, pk-info/amber/emerald accents.
 */
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
    { label: "« Pas de DNF » correct", points: "+5 pts" },
  ];
  const specialScoring = [
    { label: "Top 10 qualif parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Top 10 course parfait (10/10 bonnes positions)", points: "+10 pts BONUS" },
    { label: "Meilleur score mini-jeu de la ligue", points: "+2 pts" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Calculator}
        title="Barème des points"
        subtitle="Comment les points sont calculés"
        color="bg-pk-info"
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
            className="bg-white/[0.04] rounded-lg p-3 border border-pk-info/20"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            <h4 className="font-display text-xs text-pk-info mb-3">{section.category}</h4>
            <div className="space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-pk-piste/80">{item.label}</span>
                  <span className="font-data text-sm text-pk-info font-semibold">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        <motion.div
          className="bg-white/[0.04] rounded-lg p-3 border border-pk-amber/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-amber mb-3">Paris bonus</h4>
          <div className="space-y-2">
            {bonusScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-pk-piste/80">{item.label}</span>
                <span className="font-data text-sm text-pk-amber font-semibold">{item.points}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-pk-emerald/[0.06] rounded-lg p-3 border border-pk-emerald/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-emerald mb-3">Bonus spéciaux</h4>
          <div className="space-y-2">
            {specialScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-pk-piste/80">{item.label}</span>
                <span className="font-data text-sm text-pk-emerald font-semibold">
                  {item.points}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.08]"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <p className="text-xs text-pk-titane">
            <span className="text-pk-amber font-semibold">Week-end Sprint :</span> Le même barème de
            points s'applique aux pronostics Sprint (Sprint Qualifications + Sprint Course + Bonus
            Sprint).
          </p>
        </motion.div>
        <motion.div
          className="bg-pk-amber/[0.06] rounded-lg p-3 border border-pk-amber/20"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          <h4 className="font-display text-xs text-pk-amber mb-2">
            Points maximum par GP (course classique)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-pk-titane">Qualif (Pole + Top 10 parfait)</div>
            <div className="text-right text-pk-info font-semibold">45 pts</div>
            <div className="text-pk-titane">Course (Vainqueur + Top 10 parfait)</div>
            <div className="text-right text-pk-info font-semibold">45 pts</div>
            <div className="text-pk-titane">Bonus (SC + FL + T1 + DNF)</div>
            <div className="text-right text-pk-amber font-semibold">~20 pts</div>
            <div className="text-pk-piste font-semibold border-t border-white/[0.08] pt-1">
              Total max
            </div>
            <div className="text-right text-pk-emerald font-bold border-t border-white/[0.08] pt-1">
              ~110 pts
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
