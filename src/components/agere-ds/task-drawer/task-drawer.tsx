"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ================================================================== */
/* Root — controlled open state is required for exit animations        */
/* ================================================================== */

interface TaskDrawerContextValue {
  open: boolean;
}
const TaskDrawerContext = React.createContext<TaskDrawerContextValue>({ open: false });

export interface TaskDrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function TaskDrawer({ open: openProp, defaultOpen = false, onOpenChange, children }: TaskDrawerProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };
  return (
    <TaskDrawerContext.Provider value={{ open }}>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </DialogPrimitive.Root>
    </TaskDrawerContext.Provider>
  );
}

export const TaskDrawerTrigger = DialogPrimitive.Trigger;
export const TaskDrawerClose = DialogPrimitive.Close;

/* ================================================================== */
/* Content — portal + blurred overlay + sliding panel                  */
/* ================================================================== */

export interface TaskDrawerContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Panel width on ≥md screens. Full-width below. */
  width?: number | string;
  /** Screen-reader description of the drawer's purpose. */
  description?: string;
}

export const TaskDrawerContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, TaskDrawerContentProps>(
  ({ width = 880, description = "Task details. Press Escape to close.", className, children, ...props }, ref) => {
    const { open } = React.useContext(TaskDrawerContext);
    const reduce = useReducedMotion();
    const panel = reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
      : {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%" },
          transition: { type: "spring", stiffness: 420, damping: 42, mass: 0.9 },
        };

    return (
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-overlay/50 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0.01 : 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content ref={ref} asChild forceMount {...props}>
              <motion.div
                {...panel}
                style={{ maxWidth: "100vw", width: typeof width === "number" ? `${width}px` : width }}
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex flex-col border-l bg-card text-card-foreground shadow-2xl outline-none",
                  "max-md:!w-full",
                  className
                )}
              >
                <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    );
  }
);
TaskDrawerContent.displayName = "TaskDrawerContent";

/* ================================================================== */
/* Header / Body / Main / Aside                                        */
/* ================================================================== */

export interface TaskDrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Breadcrumb, e.g. "agere org / Hiring pipeline". */
  context?: React.ReactNode;
  actions?: React.ReactNode;
}

export const TaskDrawerHeader = React.forwardRef<HTMLDivElement, TaskDrawerHeaderProps>(
  ({ context, actions, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-12 shrink-0 items-center gap-2 border-b px-4", className)} {...props}>
      <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{context}</div>
      {children}
      {actions}
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Close task">
          <X aria-hidden />
        </Button>
      </DialogPrimitive.Close>
    </div>
  )
);
TaskDrawerHeader.displayName = "TaskDrawerHeader";

export const TaskDrawerBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_296px] md:overflow-hidden", className)}
      {...props}
    />
  )
);
TaskDrawerBody.displayName = "TaskDrawerBody";

export const TaskDrawerMain = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex min-w-0 flex-col gap-6 px-6 py-5 md:overflow-y-auto", className)} {...props} />
  )
);
TaskDrawerMain.displayName = "TaskDrawerMain";

export const TaskDrawerAside = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      aria-label="Task properties"
      className={cn("order-first border-b bg-background/40 px-4 py-4 md:order-none md:overflow-y-auto md:border-b-0 md:border-l", className)}
      {...props}
    />
  )
);
TaskDrawerAside.displayName = "TaskDrawerAside";

/* ================================================================== */
/* Title — editable, still announced as the dialog title               */
/* ================================================================== */

export interface TaskDrawerTitleProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onValueChange?: (value: string) => void;
}

export const TaskDrawerTitle = React.forwardRef<HTMLTextAreaElement, TaskDrawerTitleProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [draft, setDraft] = React.useState(value);
    React.useEffect(() => setDraft(value), [value]);
    const areaRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => areaRef.current as HTMLTextAreaElement);
    React.useLayoutEffect(() => {
      const el = areaRef.current;
      if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
    }, [draft]);

    return (
      <div>
        <DialogPrimitive.Title className="sr-only">{value || "Untitled task"}</DialogPrimitive.Title>
        <textarea
          ref={areaRef}
          rows={1}
          value={draft}
          readOnly={!onValueChange}
          aria-label="Task title"
          placeholder="Untitled"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== value && onValueChange?.(draft.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
          }}
          className={cn(
            "-mx-2 w-[calc(100%+1rem)] resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 text-xl font-semibold leading-8 text-foreground",
            "placeholder:text-muted-foreground/60 hover:bg-foreground/[0.03] focus-ring",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
TaskDrawerTitle.displayName = "TaskDrawerTitle";

/* ================================================================== */
/* Section — labelled block inside Main                                */
/* ================================================================== */

export interface TaskDrawerSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
}

export const TaskDrawerSection = React.forwardRef<HTMLElement, TaskDrawerSectionProps>(
  ({ title, icon, meta, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <section ref={ref} aria-labelledby={id} className={cn("flex flex-col gap-2", className)} {...props}>
        <div className="flex items-center gap-2 text-muted-foreground [&_svg]:size-3.5">
          {icon}
          <h3 id={id} className="text-xs font-semibold text-foreground/80">{title}</h3>
          {meta && <span className="ml-auto text-2xs">{meta}</span>}
        </div>
        {children}
      </section>
    );
  }
);
TaskDrawerSection.displayName = "TaskDrawerSection";
