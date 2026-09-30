import { getLocale, getTranslator } from "@/i18n/server";
import { addDays, todayIn } from "@/lib/dates";
import { myTasks, type MyTask } from "@/modules/space/queries";
import { PageFrame } from "@/ui/shell/page-frame";
import { MyTasksList } from "@/ui/space/my-tasks";
import { pageTitle, requireOrg } from "../../shell";

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = ({ params }: Props) => pageTitle(params, "nav.myTasks");

export type Section = "overdue" | "today" | "week" | "later" | "noDue" | "done";

/** Due sections (PRD-06 §6.3); "today" follows the organization timezone until PRD-12 preferences land. */
function sectionOf(task: MyTask, today: string): Section {
  if (task.done) return "done";
  if (!task.dueDate) return "noDue";
  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) return "today";
  if (task.dueDate <= addDays(today, 7)) return "week";
  return "later";
}

export default async function MyTasksPage({ params }: Props) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [tasks, locale, t] = await Promise.all([myTasks(page.ctx), getLocale(), getTranslator()]);
  const today = todayIn(page.tz);
  const open = tasks.filter((x) => !x.done);
  const overdue = open.filter((x) => x.dueDate && x.dueDate < today).length;
  const rows = tasks
    .map((x) => ({ ...x, section: sectionOf(x, today) }))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.title.localeCompare(b.title));
  return (
    <PageFrame title={t("nav.myTasks")} description={t("mytasks.summary", String(open.length), String(overdue))}>
      <MyTasksList slug={slug} locale={locale} today={today} tasks={rows} />
    </PageFrame>
  );
}
