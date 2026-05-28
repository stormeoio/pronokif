/**
 * Roadmap Tab -- audit results as checklist + Gantt chart + phase management.
 * Tracks refactoring and development improvements over time.
 *
 * Data is persisted in localStorage for now (can be moved to backend later).
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  GanttChart,
  Layers,
  ListChecks,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  CATEGORY_CONFIG,
  DEFAULT_PHASES,
  DEFAULT_TASKS,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  STORAGE_KEY,
  type Phase,
  type RoadmapTask,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
  type ViewMode,
} from "./roadmap-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Main component ──────────────────────────────────────────────────────────

export default function RoadmapTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("checklist");
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(DEFAULT_PHASES.map((p) => p.id)),
  );
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setTasks(data.tasks || DEFAULT_TASKS);
      setPhases(data.phases || DEFAULT_PHASES);
    } else {
      setTasks(DEFAULT_TASKS);
      setPhases(DEFAULT_PHASES);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (tasks.length > 0 || phases.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, phases }));
    }
  }, [tasks, phases]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    return {
      total,
      done,
      inProgress,
      blocked,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filterStatus === "all") return tasks;
    return tasks.filter((t) => t.status === filterStatus);
  }, [tasks, filterStatus]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const cycleStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const order: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];
        const idx = order.indexOf(t.status);
        const next = order[(idx + 1) % order.length]!;
        return {
          ...t,
          status: next,
          completedAt: next === "done" ? new Date().toISOString().split("T")[0] : undefined,
        };
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const saveTask = (task: RoadmapTask) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = task;
        return next;
      }
      return [...prev, task];
    });
    setEditingTask(null);
    setShowAddTask(false);
  };

  return (
    <div>
      {/* Header + stats */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">
          Feuille de route
        </h2>
        <Button
          onClick={() => {
            setShowAddTask(true);
            setEditingTask(null);
          }}
          size="sm"
          className="btn-racing text-xs"
        >
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Progress bar */}
      <div className="card-arcade p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-sm text-gray-400">Progression globale</span>
          <span className="font-data text-sm text-white">{stats.progress}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs font-body">
          <span className="text-green-400">{stats.done} terminees</span>
          <span className="text-blue-400">{stats.inProgress} en cours</span>
          <span className="text-red-400">{stats.blocked} bloquees</span>
          <span className="text-gray-500">
            {stats.total - stats.done - stats.inProgress - stats.blocked} restantes
          </span>
        </div>
      </div>

      {/* View mode tabs + filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(
            [
              { key: "checklist", icon: ListChecks, label: "Checklist" },
              { key: "gantt", icon: GanttChart, label: "Gantt" },
              { key: "phases", icon: Layers, label: "Phases" },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all ${
                viewMode === key
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "todo", "in_progress", "done", "blocked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 rounded text-[10px] font-body transition-all ${
                filterStatus === s ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Task editor modal */}
      {(showAddTask || editingTask) && (
        <TaskEditor
          task={editingTask}
          phases={phases}
          onSave={saveTask}
          onCancel={() => {
            setShowAddTask(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Views */}
      {viewMode === "checklist" && (
        <ChecklistView
          tasks={filteredTasks}
          phases={phases}
          expandedPhases={expandedPhases}
          togglePhase={togglePhase}
          cycleStatus={cycleStatus}
          deleteTask={deleteTask}
          editTask={setEditingTask}
        />
      )}
      {viewMode === "gantt" && <GanttView tasks={filteredTasks} phases={phases} />}
      {viewMode === "phases" && <PhasesView phases={phases} tasks={tasks} setPhases={setPhases} />}
    </div>
  );
}

// ── Checklist View ───────────────────────────────────────────────────────────

function ChecklistView({
  tasks,
  phases,
  expandedPhases,
  togglePhase,
  cycleStatus,
  deleteTask,
  editTask,
}: {
  tasks: RoadmapTask[];
  phases: Phase[];
  expandedPhases: Set<string>;
  togglePhase: (id: string) => void;
  cycleStatus: (id: string) => void;
  deleteTask: (id: string) => void;
  editTask: (t: RoadmapTask) => void;
}) {
  return (
    <div className="space-y-3">
      {phases
        .sort((a, b) => a.order - b.order)
        .map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase === phase.id);
          if (phaseTasks.length === 0) return null;
          const doneCount = phaseTasks.filter((t) => t.status === "done").length;
          const isExpanded = expandedPhases.has(phase.id);

          return (
            <div key={phase.id} className="card-arcade overflow-hidden">
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                  <span className="font-heading text-sm text-white uppercase">{phase.name}</span>
                </div>
                <span className="font-data text-xs text-gray-500">
                  {doneCount}/{phaseTasks.length}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800/50">
                  {phaseTasks.map((task) => {
                    const StatusIcon = STATUS_CONFIG[task.status].icon;
                    const CatConfig = CATEGORY_CONFIG[task.category];
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/30 last:border-0 hover:bg-white/5 group"
                      >
                        <button onClick={() => cycleStatus(task.id)} className="flex-shrink-0">
                          <StatusIcon className={`w-4 h-4 ${STATUS_CONFIG[task.status].color}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-body text-sm ${task.status === "done" ? "text-gray-500 line-through" : "text-white"}`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="font-body text-xs text-gray-600 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_CONFIG[task.priority].color}`}
                        >
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                        <span className={`text-[10px] ${CatConfig.color}`}>{CatConfig.label}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => editTask(task)}
                            className="p-1 text-gray-500 hover:text-cyan-400"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── Gantt View ───────────────────────────────────────────────────────────────

function GanttView({ tasks, phases }: { tasks: RoadmapTask[]; phases: Phase[] }) {
  const allDates = phases.flatMap((p) => [p.startDate, p.endDate]).filter(Boolean) as string[];
  const minDate =
    allDates.length > 0
      ? new Date(Math.min(...allDates.map((d) => new Date(d).getTime())))
      : new Date();
  const maxDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => new Date(d).getTime())))
      : new Date();
  const totalDays = Math.max(
    1,
    Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const getPosition = (date: string | undefined) => {
    if (!date) return 0;
    const d = new Date(date);
    return Math.max(0, Math.ceil((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getWidth = (start: string | undefined, end: string | undefined) => {
    const s = getPosition(start);
    const e = getPosition(end);
    return Math.max(1, e - s);
  };

  // Generate month markers
  const months: { label: string; position: number }[] = [];
  const cursor = new Date(minDate);
  cursor.setDate(1);
  while (cursor <= maxDate) {
    months.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      position: getPosition(cursor.toISOString().split("T")[0]),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayPos = getPosition(new Date().toISOString().split("T")[0]);

  return (
    <div className="card-arcade overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Month headers */}
          <div className="flex border-b border-gray-800 relative h-8">
            {months.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center"
                style={{ left: `${(m.position / totalDays) * 100}%` }}
              >
                <span className="font-body text-[10px] text-gray-500 px-1">{m.label}</span>
                <div className="absolute top-0 left-0 w-px h-screen bg-gray-800/50" />
              </div>
            ))}
            <div
              className="absolute top-0 h-screen w-px bg-orange-500/50 z-10"
              style={{ left: `${(todayPos / totalDays) * 100}%` }}
            />
          </div>

          {/* Phase bars */}
          <div className="py-2">
            {phases
              .sort((a, b) => a.order - b.order)
              .map((phase) => {
                const left = (getPosition(phase.startDate) / totalDays) * 100;
                const width = (getWidth(phase.startDate, phase.endDate) / totalDays) * 100;
                const phaseTasks = tasks.filter((t) => t.phase === phase.id);
                const doneCount = phaseTasks.filter((t) => t.status === "done").length;
                const progress = phaseTasks.length > 0 ? (doneCount / phaseTasks.length) * 100 : 0;

                return (
                  <div key={phase.id} className="relative h-10 mb-1 flex items-center">
                    <div className="absolute left-0 w-[140px] flex items-center gap-2 pl-2 z-10">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: phase.color }}
                      />
                      <span className="font-body text-xs text-gray-300 truncate">{phase.name}</span>
                    </div>
                    <div
                      className="absolute h-6 rounded-md overflow-hidden opacity-80"
                      style={{
                        left: `max(145px, ${left}%)`,
                        width: `${width}%`,
                        backgroundColor: `${phase.color}20`,
                        border: `1px solid ${phase.color}50`,
                      }}
                    >
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${progress}%`, backgroundColor: `${phase.color}60` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-800 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 bg-orange-500" />
          <span className="font-body text-[10px] text-gray-500">Aujourd'hui</span>
        </div>
        <span className="font-body text-[10px] text-gray-600">
          {minDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} ---{" "}
          {maxDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ── Phases View ──────────────────────────────────────────────────────────────

function PhasesView({
  phases,
  tasks,
  setPhases,
}: {
  phases: Phase[];
  tasks: RoadmapTask[];
  setPhases: (p: Phase[]) => void;
}) {
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [newPhase, setNewPhase] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#8b5cf6", startDate: "", endDate: "" });

  const handleSavePhase = () => {
    if (!form.name) return;
    if (editingPhase) {
      setPhases(phases.map((p) => (p.id === editingPhase.id ? { ...p, ...form } : p)));
    } else {
      const newP: Phase = {
        id: `phase_${Date.now()}`,
        name: form.name,
        color: form.color,
        order: phases.length,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      setPhases([...phases, newP]);
    }
    setEditingPhase(null);
    setNewPhase(false);
    setForm({ name: "", color: "#8b5cf6", startDate: "", endDate: "" });
  };

  const handleDeletePhase = (id: string) => {
    if (!confirm("Supprimer cette phase ? Les tâches associées ne seront pas supprimées.")) return;
    setPhases(phases.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      {(newPhase || editingPhase) && (
        <div className="card-arcade p-4 border border-purple-500/30 space-y-3">
          <h3 className="font-heading text-xs text-purple-400 uppercase">
            {editingPhase ? "Modifier la phase" : "Nouvelle phase"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de la phase"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white flex-1"
              />
            </div>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="Debut"
            />
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="Fin"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSavePhase} className="btn-racing text-xs">
              <Save className="w-3.5 h-3.5 mr-1" /> Enregistrer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNewPhase(false);
                setEditingPhase(null);
              }}
              className="text-gray-400 text-xs"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setNewPhase(true);
            setEditingPhase(null);
            setForm({ name: "", color: "#8b5cf6", startDate: "", endDate: "" });
          }}
          className="text-xs border-purple-500/30 text-purple-400"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Nouvelle phase
        </Button>
      </div>

      {phases
        .sort((a, b) => a.order - b.order)
        .map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase === phase.id);
          const doneCount = phaseTasks.filter((t) => t.status === "done").length;
          const progress =
            phaseTasks.length > 0 ? Math.round((doneCount / phaseTasks.length) * 100) : 0;

          return (
            <div key={phase.id} className="card-arcade p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: phase.color }} />
                  <div>
                    <h4 className="font-heading text-sm text-white uppercase">{phase.name}</h4>
                    {(phase.startDate || phase.endDate) && (
                      <p className="font-body text-[10px] text-gray-500">
                        {phase.startDate &&
                          new Date(phase.startDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        {phase.startDate && phase.endDate && " --- "}
                        {phase.endDate &&
                          new Date(phase.endDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-data text-xs text-gray-400">{progress}%</span>
                  <button
                    onClick={() => {
                      setEditingPhase(phase);
                      setForm({
                        name: phase.name,
                        color: phase.color,
                        startDate: phase.startDate || "",
                        endDate: phase.endDate || "",
                      });
                    }}
                    className="p-1 text-gray-500 hover:text-cyan-400"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePhase(phase.id)}
                    className="p-1 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, backgroundColor: phase.color }}
                />
              </div>
              <p className="font-body text-xs text-gray-500">
                {doneCount}/{phaseTasks.length} tâches terminées
              </p>
            </div>
          );
        })}
    </div>
  );
}

// ── Task Editor ──────────────────────────────────────────────────────────────

function TaskEditor({
  task,
  phases,
  onSave,
  onCancel,
}: {
  task: RoadmapTask | null;
  phases: Phase[];
  onSave: (t: RoadmapTask) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RoadmapTask>(
    task || {
      id: `task_${Date.now()}`,
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      category: "feature",
      phase: phases[0]?.id || "",
      createdAt: new Date().toISOString().split("T")[0]!,
    },
  );

  return (
    <div className="card-arcade p-4 mb-4 border border-orange-500/30 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm text-orange-400 uppercase">
          {task ? "Modifier la tâche" : "Nouvelle tâche"}
        </h3>
        <button onClick={onCancel} className="p-1 text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Titre de la tâche"
        className="bg-gray-900 border-gray-700 text-white"
        autoFocus
      />
      <Textarea
        value={form.description || ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description (optionnel)"
        rows={2}
        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <select
          value={form.phase}
          onChange={(e) => setForm({ ...form, phase: e.target.value })}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5"
        >
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5"
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5"
        >
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5"
        >
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSave(form)}
          disabled={!form.title}
          className="btn-racing text-xs"
        >
          <Save className="w-3.5 h-3.5 mr-1" /> {task ? "Mettre à jour" : "Créer"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-gray-400 text-xs">
          Annuler
        </Button>
      </div>
    </div>
  );
}
