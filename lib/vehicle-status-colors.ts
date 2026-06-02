/**
 * Tailwind classes for vehicle status badges. Shared by Tickets page and WIP board.
 */
export function getVehicleStatusColor(status: string): string {
  switch (status) {
    case 'Not Started':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'Online Appointment':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'Not Here Yet':
      return 'bg-slate-200 text-slate-700 border-slate-300'
    case 'Check In':
      return 'bg-blue-300 text-blue-800 border-blue-400'
    case 'On Lot':
      return 'bg-blue-700 text-blue-100 border-blue-800'
    case 'In Shop':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'Inspection Complete':
      return 'bg-teal-100 text-teal-800 border-teal-200'
    case 'Awaiting Callback':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Awaiting Parts':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'Out For Sublet':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Ready':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
