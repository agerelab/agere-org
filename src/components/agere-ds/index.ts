/**
 * Agere Design System v4 — public entry.
 *
 *   import { Button, Dialog, DataTable, Logo, toast } from "@/components/agere-ds";
 *
 * Primitives live in /components/ui (shadcn-owned source, `npx shadcn add` compatible) and are
 * re-exported here. v3 `Agere*` aliases remain for one major version (see MIGRATION.md).
 */

/* ---- Atoms ----------------------------------------------------------- */
export { Button, IconButton, ButtonGroup, buttonVariants, type ButtonProps, type IconButtonProps, type ButtonGroupProps, type ButtonVariant } from "@/components/ui/button";
export { Badge, badgeVariants, type BadgeProps, type BadgeVariant } from "@/components/ui/badge";
export { Input, PasswordInput, SearchInput, fieldVariants, type InputProps, type PasswordInputProps, type SearchInputProps } from "@/components/ui/input";
export { Textarea, type TextareaProps } from "@/components/ui/textarea";
export { Label, type LabelProps } from "@/components/ui/label";
export { Checkbox, type CheckboxProps } from "@/components/ui/checkbox";
export { RadioGroup, RadioGroupItem, RadioCard } from "@/components/ui/radio-group";
export { Switch, type SwitchProps } from "@/components/ui/switch";
export { Slider, type SliderProps } from "@/components/ui/slider";
export { Avatar, AvatarGroup, type AvatarProps, type AvatarGroupProps } from "@/components/ui/avatar";
export { Spinner, Loader, type SpinnerProps } from "@/components/ui/spinner";
export { Kbd } from "@/components/ui/kbd";
export { Separator } from "@/components/ui/separator";
export { Progress, type ProgressProps } from "@/components/ui/progress";
export { Skeleton, SkeletonText, SkeletonRegion } from "@/components/ui/skeleton";
export { Icon, ICON_SIZES, AGERE_ICONS, LaunchIcon, ValidateIcon, PivotIcon, SquadIcon, MilestoneIcon, PortfolioIcon, type IconProps, type IconSize } from "@/icons";

/* ---- Molecules: navigation & layout ---------------------------------- */
export {
  SidebarProvider, Sidebar, SidebarTrigger, SidebarRail, SidebarInset, SidebarInput, SidebarHeader, SidebarFooter, SidebarSeparator,
  SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  sidebarMenuButtonVariants, useSidebar,
  AppShell, SidebarSection, SidebarItem,
  type SidebarProps, type SidebarProviderProps, type SidebarMenuButtonProps, type AppShellProps, type SidebarItemProps,
} from "@/components/ui/sidebar";
export { useIsMobile } from "@/hooks/use-mobile";
export { Navbar, type NavbarProps, type NavbarLinkData } from "@/components/ui/navbar";
export { Breadcrumb, BreadcrumbLink, type BreadcrumbProps, type BreadcrumbItemData } from "@/components/ui/breadcrumb";
export { Pagination, PaginationSummary, getPageRange, type PaginationProps } from "@/components/ui/pagination";
export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps } from "@/components/ui/tabs";
export { SegmentedControl, type SegmentedControlProps, type SegmentedControlOption } from "@/components/ui/segmented-control";
export { Toggle, toggleVariants } from "@/components/ui/toggle";
export { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export { Stepper, type StepperProps, type StepperStep } from "@/components/ui/stepper";
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

/* ---- Molecules: feedback & overlay ----------------------------------- */
export { Alert, Banner, type AlertProps } from "@/components/ui/alert";
export { Toaster, toast, useToasts, type ToastOptions, type ToastVariant, type ToasterProps, type ToasterPosition } from "@/components/ui/toast";
export {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription, DialogClose,
  type DialogContentProps,
} from "@/components/ui/dialog";
export { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/alert-dialog";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip } from "@/components/ui/tooltip";
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose } from "@/components/ui/popover";

/* ---- Organisms -------------------------------------------------------- */
export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, CardLink, cardVariants, type CardProps } from "@/components/ui/card";
export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
export {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, useChart, resolveChartColor, chartColor,
  type ChartConfig, type ChartContainerProps,
} from "@/components/ui/chart";
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
export { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";
export { FileUploader, type FileUploaderProps, type UploaderFile } from "@/components/ui/file-uploader";
export { FormField, FormControl, FormSection, FormRow, FormActions, FormErrorSummary, useFormField, type FormFieldProps } from "@/components/ui/form";

/* ---- v6.1 · shadcn parity: date, command, combobox, drawer, OTP, navigation ----
   Two shadcn names collide with existing Agere exports, so the barrel aliases them:
     shadcn Calendar (date grid)   → DateCalendar     (Agere `Calendar` = workspace event calendar)
     shadcn CommandItem (component) → CommandMenuItem (Agere `CommandItem` = CommandPalette item type)
   Copy-pasted shadcn code keeps working: import from "@/components/ui/calendar" / "@/components/ui/command". */
export { Calendar as DateCalendar, CalendarDayButton, type CalendarProps as DateCalendarProps } from "@/components/ui/calendar";
export { DatePicker, DateRangePicker, type DatePickerProps, type DateRangePickerProps, type DateRange } from "@/components/ui/date-picker";
export {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandSeparator, CommandShortcut,
  CommandItem as CommandMenuItem,
} from "@/components/ui/command";
export { Combobox, type ComboboxOption, type ComboboxProps, type ComboboxMultipleProps } from "@/components/ui/combobox";
export { Drawer, DrawerTrigger, DrawerPortal, DrawerClose, DrawerOverlay, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_DIGITS, REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS_AND_CHARS } from "@/components/ui/input-otp";
export {
  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink,
  NavigationMenuIndicator, NavigationMenuViewport, navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

/* ---- v6.2 · shadcn parity: carousel, context menu, menubar, resizable ---- */
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselDots, useCarousel, type CarouselApi, type CarouselProps } from "@/components/ui/carousel";
export {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup,
} from "@/components/ui/context-menu";
export {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarRadioItem, MenubarLabel, MenubarSeparator,
  MenubarShortcut, MenubarGroup, MenubarPortal, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarRadioGroup,
} from "@/components/ui/menubar";
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

/* ---- v6.3 · shadcn parity: field, input group, item ----
   Field's cva is exported as fieldLayoutVariants (fieldVariants is Input's field recipe since v5). */
export {
  FieldSet, FieldLegend, FieldGroup, Field, FieldControl, FieldContent, FieldLabel, FieldTitle, FieldDescription, FieldError, FieldSeparator,
  useField, fieldVariants as fieldLayoutVariants, type FieldProps,
} from "@/components/ui/field";
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
export { Item, ItemGroup, ItemSeparator, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemHeader, ItemFooter, itemVariants } from "@/components/ui/item";
/* v6.4 */
export {
  PageHeader, PageHeaderLeading, PageHeaderContent, PageHeaderBack, PageHeaderTitle, PageHeaderDescription, PageHeaderMeta, PageHeaderActions,
  type PageHeaderAction, type PageHeaderMenuEntry, type PageHeaderActionsProps,
} from "@/components/ui/page-header";
export { SaveBar, type SaveBarProps, type SaveBarState } from "@/components/ui/save-bar";
export { RuleBuilder, RuleBuilderPreview, RuleBuilderRow, type RuleBuilderRowProps } from "@/components/ui/rule-builder";
export { SaveStatus, type SaveStatusProps, type SaveStatusState } from "@/components/ui/save-status";
export { getDropZone, canDrop, moveTreeItem, siblingsOf, type DropZone, type TreeItem, type TreeDropTarget } from "@/lib/tree";
export { devWarn } from "@/lib/dev";
export * from "./cards";

/* ---- Overlays & command (v4.1) ------------------------------------- */
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, type SheetContentProps } from "@/components/ui/sheet";
export { CommandPalette, CommandTrigger, type CommandItem, type CommandPaletteProps } from "@/components/ui/command-palette";

/* ---- Workspace (ClickUp-class) modules (v4.1) ------------------------ */
export * from "./workspace";
export * from "./chat";
export * from "./finance";
export * from "./docs";
export * from "./marketplace";
export * from "@/lib/workspace";

/* ---- Brand ------------------------------------------------------------ */
export * from "@/brand";

/* ---- v3 aliases (deprecated — removed in v5) -------------------------- */
export { Button as AgereButton, buttonVariants as agereButtonVariants, type ButtonProps as AgereButtonProps } from "@/components/ui/button";
export { Badge as AgereBadge, badgeVariants as agereBadgeVariants, type BadgeProps as AgereBadgeProps } from "@/components/ui/badge";
export {
  Card as AgereCard, CardHeader as AgereCardHeader, CardTitle as AgereCardTitle,
  CardDescription as AgereCardDescription, CardContent as AgereCardContent, CardFooter as AgereCardFooter,
  type CardProps as AgereCardProps,
} from "@/components/ui/card";
export { Input as AgereInput, fieldVariants as agereFieldVariants, type InputProps as AgereInputProps } from "@/components/ui/input";
export { Textarea as AgereTextarea, type TextareaProps as AgereTextareaProps } from "@/components/ui/textarea";

/* ---- Shared database vocabulary + feature modules --------------------- */
export * from "./shared";
export * from "./file-explorer";
export * from "./kanban";
export * from "./calendar";
export * from "./data-table";
export * from "./task-drawer";

/* ---- Tokens & theming ------------------------------------------------- */
export * from "@/lib/agere-tokens";
export { setTheme, applyBrandColor, resetBrandColor, contrastRatio, type ThemeMode, type BrandResult } from "@/lib/theme";
export { lightTokens, darkTokens } from "@/tokens";
