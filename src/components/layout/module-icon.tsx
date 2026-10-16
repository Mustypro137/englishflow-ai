import {
  BookOpen,
  BookText,
  CalendarDays,
  ChartLine,
  CircleAlert,
  Ear,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  Puzzle,
  Repeat,
  Route,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { ModuleIcon as ModuleIconName } from "@/lib/modules";

export const MODULE_ICONS: Record<ModuleIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  roadmap: Route,
  grammar: BookText,
  vocabulary: Languages,
  review: Repeat,
  listening: Ear,
  pronunciation: Mic,
  reading: BookOpen,
  writing: PenLine,
  sentences: Puzzle,
  conversation: MessagesSquare,
  tutor: Sparkles,
  challenges: Trophy,
  notebook: NotebookPen,
  mistakes: CircleAlert,
  progress: ChartLine,
  calendar: CalendarDays,
  settings: Settings,
};

export function ModuleIcon({ name, className }: { name: ModuleIconName; className?: string }) {
  const Icon = MODULE_ICONS[name];
  return <Icon aria-hidden className={className} />;
}
