/**
 * Tailwind classes for vehicle status pills (light + `.dark`).
 * Keeps contrast in both themes without large light “patches.”
 */
export function vehicleStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Not Started':
      return 'bg-muted text-foreground border-border'
    case 'Online Appointment':
      return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/55 dark:text-sky-100 dark:border-sky-800'
    case 'Not Here Yet':
      return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600'
    case 'Check In':
      return 'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/55 dark:text-blue-100 dark:border-blue-700'
    case 'On Lot':
      return 'bg-blue-700 text-blue-100 border-blue-800 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800'
    case 'In Shop':
      return 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/55 dark:text-indigo-200 dark:border-indigo-800'
    case 'Inspection Complete':
      return 'bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/55 dark:text-teal-200 dark:border-teal-800'
    case 'Awaiting Callback':
      return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
    case 'Awaiting Parts':
      return 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800'
    case 'Out For Sublet':
      return 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800'
    case 'Ready':
      return 'bg-green-100 text-green-900 border-green-200 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800'
    default:
      return 'bg-muted text-foreground border-border'
  }
}
