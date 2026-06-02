import type { AppointmentServiceQuestionTree, AppointmentType } from '@/types/appointment'

export const APPOINTMENT_SERVICE_CATALOG: AppointmentType[] = [
  {
    id: 'new-tires',
    name: 'New Tires',
    duration: 60,
    icon: 'Tire',
    description: 'New tire replacement, balancing, and setup',
  },
  {
    id: 'new-wheels',
    name: 'New Wheels',
    duration: 60,
    icon: 'CircleDot',
    description: 'Wheel replacement, fitment, and installation',
  },
  {
    id: 'tire-repair',
    name: 'Tire Repair',
    duration: 45,
    icon: 'WarningCircle',
    description: 'Flat repair, puncture checks, and leak fixes',
  },
  {
    id: 'tire-rotation',
    name: 'Tire Rotation',
    duration: 30,
    icon: 'RotateCw',
    description: 'Rotation service for more even tire wear',
  },
  {
    id: 'battery-replacement',
    name: 'Battery Replacement',
    duration: 30,
    icon: 'CarBattery',
    description: 'Battery testing, replacement, and charging checks',
  },
  {
    id: 'oil-change',
    name: 'Oil Change',
    duration: 45,
    icon: 'Droplet',
    description: 'Oil and filter replacement with fluid checks',
  },
  {
    id: 'state-inspection',
    name: 'State Inspection',
    duration: 45,
    icon: 'ClipboardCheck',
    description: 'State and emissions inspection requirements',
  },
  {
    id: 'alignment',
    name: 'Alignment',
    duration: 45,
    icon: 'SteeringWheel',
    description: 'Steering pull, alignment angle, and tire-wear concerns',
  },
  {
    id: 'brake-service',
    name: 'Brake Service',
    duration: 120,
    icon: 'Disc',
    description: 'Brake noise, vibration, pad, rotor, and fluid concerns',
  },
  {
    id: 'general-repair',
    name: 'General Repair',
    duration: 180,
    icon: 'Engine',
    description: 'Engine, drivability, warning light, and repair concerns',
  },
  {
    id: 'preventative-maintenance',
    name: 'Preventative Maintenance',
    duration: 120,
    icon: 'Wrench',
    description: 'Factory maintenance intervals and tune-up services',
  },
  {
    id: 'diagnose-problem',
    name: 'Diagnose Problem',
    duration: 120,
    icon: 'Search',
    description: 'Intermittent issues, warning lights, or unknown concerns',
  },
  {
    id: 'other',
    name: 'Other',
    duration: 60,
    icon: 'Settings',
    description: 'Describe another service or concern not listed',
  },
]

export const APPOINTMENT_SERVICE_QUESTION_TREES: Record<string, AppointmentServiceQuestionTree> = {
  'new-tires': {
    serviceId: 'new-tires',
    issueQuestion: {
      id: 'tire_goal',
      prompt: 'What are you looking for with your new tires?',
      options: [
        { id: 'replace_worn', label: 'Replace worn tires' },
        { id: 'seasonal_swap', label: 'Seasonal tire swap' },
        { id: 'upgrade_performance', label: 'Upgrade ride/performance' },
        { id: 'road_hazard', label: 'Replace damaged tire(s)' },
      ],
    },
    followupQuestions: [
      {
        id: 'tire_position',
        prompt: 'Which tires are you replacing?',
        options: [
          { id: 'front_pair', label: 'Front pair' },
          { id: 'rear_pair', label: 'Rear pair' },
          { id: 'all_four', label: 'All four tires' },
          { id: 'unsure', label: 'Not sure yet' },
        ],
      },
      {
        id: 'tire_brand_pref',
        prompt: 'Do you have tire brand or budget preferences?',
        options: [
          { id: 'brand_specific', label: 'Yes, I have a specific preference' },
          { id: 'budget_range', label: 'Yes, based on budget' },
          { id: 'recommendation', label: 'No, please recommend options' },
        ],
      },
    ],
  },
  'new-wheels': {
    serviceId: 'new-wheels',
    issueQuestion: {
      id: 'wheel_goal',
      prompt: 'What best describes your wheel service?',
      options: [
        { id: 'replace_damaged', label: 'Replace a damaged wheel' },
        { id: 'upgrade_style', label: 'Upgrade wheel style/size' },
        { id: 'winter_set', label: 'Set up a second wheel set' },
        { id: 'fitment_help', label: 'Need help with fitment' },
      ],
    },
    followupQuestions: [
      {
        id: 'wheel_count',
        prompt: 'How many wheels are involved?',
        options: [
          { id: 'one', label: 'One wheel' },
          { id: 'two', label: 'Two wheels' },
          { id: 'four', label: 'Full set of four' },
        ],
      },
      {
        id: 'wheel_size_known',
        prompt: 'Do you know your target wheel size?',
        options: [
          { id: 'yes', label: 'Yes, I know the exact size' },
          { id: 'partially', label: 'I have an idea but need confirmation' },
          { id: 'no', label: 'No, I need recommendations' },
        ],
      },
    ],
  },
  'tire-repair': {
    serviceId: 'tire-repair',
    issueQuestion: {
      id: 'tire_issue',
      prompt: 'What issue are you having with the tire?',
      options: [
        { id: 'flat', label: 'Flat tire' },
        { id: 'slow_leak', label: 'Slow leak' },
        { id: 'nail_or_object', label: 'Nail/object in tire' },
        { id: 'sidewall_damage', label: 'Sidewall damage/bulge' },
      ],
    },
    followupQuestions: [
      {
        id: 'tire_location',
        prompt: 'Where is the affected tire located?',
        options: [
          { id: 'front_driver', label: 'Front driver side' },
          { id: 'front_passenger', label: 'Front passenger side' },
          { id: 'rear_driver', label: 'Rear driver side' },
          { id: 'rear_passenger', label: 'Rear passenger side' },
          { id: 'unknown', label: 'Not sure' },
        ],
      },
      {
        id: 'can_drive',
        prompt: 'Can the vehicle be driven safely right now?',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'limited', label: 'Only short distance' },
          { id: 'no', label: 'No, it needs immediate attention' },
        ],
      },
    ],
  },
  'tire-rotation': {
    serviceId: 'tire-rotation',
    issueQuestion: {
      id: 'rotation_reason',
      prompt: 'Why are you scheduling a tire rotation today?',
      options: [
        { id: 'routine', label: 'Routine maintenance interval' },
        { id: 'uneven_wear', label: 'Uneven tire wear' },
        { id: 'post_repair', label: 'After tire or suspension work' },
      ],
    },
    followupQuestions: [
      {
        id: 'last_rotation',
        prompt: 'About how long ago was your last rotation?',
        options: [
          { id: 'under_5k', label: 'Under 5,000 miles' },
          { id: '5k_10k', label: '5,000-10,000 miles' },
          { id: 'over_10k', label: 'Over 10,000 miles' },
          { id: 'unknown', label: "I'm not sure" },
        ],
      },
      {
        id: 'alignment_concern',
        prompt: 'Are you noticing steering pull or vibration as well?',
        options: [
          { id: 'none', label: 'No, just rotation' },
          { id: 'pull', label: 'Steering pull' },
          { id: 'vibration', label: 'Vibration or noise' },
        ],
      },
    ],
  },
  'battery-replacement': {
    serviceId: 'battery-replacement',
    issueQuestion: {
      id: 'battery_symptom',
      prompt: 'What battery-related symptom are you seeing?',
      options: [
        { id: 'no_start', label: 'Vehicle will not start' },
        { id: 'slow_crank', label: 'Slow cranking at start' },
        { id: 'jump_starts', label: 'Needs frequent jump starts' },
        { id: 'replace_preventive', label: 'Preventive replacement' },
      ],
    },
    followupQuestions: [
      {
        id: 'electrical_issues',
        prompt: 'Any other electrical symptoms?',
        options: [
          { id: 'none', label: 'No additional symptoms' },
          { id: 'lights_dim', label: 'Lights are dim/flicker' },
          { id: 'warning_lights', label: 'Battery/charging warning light' },
          { id: 'multiple', label: 'Multiple electrical issues' },
        ],
      },
      {
        id: 'start_condition',
        prompt: 'When is the issue worst?',
        options: [
          { id: 'cold_morning', label: 'Cold starts / mornings' },
          { id: 'after_sitting', label: 'After sitting for a while' },
          { id: 'random', label: 'Randomly' },
          { id: 'always', label: 'Every start attempt' },
        ],
      },
    ],
  },
  'oil-change': {
    serviceId: 'oil-change',
    issueQuestion: {
      id: 'oil_service_type',
      prompt: 'What oil service do you need?',
      options: [
        { id: 'routine_change', label: 'Routine oil change' },
        { id: 'overdue_change', label: 'Overdue oil change' },
        { id: 'after_warning', label: 'Oil life/warning reminder' },
        { id: 'pre_trip', label: 'Before a trip' },
      ],
    },
    followupQuestions: [
      {
        id: 'oil_type_preference',
        prompt: 'Do you have an oil type preference?',
        options: [
          { id: 'synthetic', label: 'Full synthetic' },
          { id: 'blend', label: 'Synthetic blend' },
          { id: 'conventional', label: 'Conventional' },
          { id: 'recommend', label: 'Use shop recommendation' },
        ],
      },
      {
        id: 'additional_fluid_check',
        prompt: 'Would you like a fluid/top-off check during service?',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
          { id: 'if_needed', label: 'Only if something is low' },
        ],
      },
    ],
  },
  'state-inspection': {
    serviceId: 'state-inspection',
    issueQuestion: {
      id: 'inspection_reason',
      prompt: 'Which inspection are you here for?',
      options: [
        { id: 'annual_state', label: 'Annual state inspection' },
        { id: 'emissions', label: 'Emissions inspection' },
        { id: 'reinspection', label: 'Reinspection after failed check' },
      ],
    },
    followupQuestions: [
      {
        id: 'inspection_deadline',
        prompt: 'How soon is your inspection deadline?',
        options: [
          { id: 'this_week', label: 'Within this week' },
          { id: 'this_month', label: 'Within this month' },
          { id: 'later', label: 'More than one month out' },
        ],
      },
      {
        id: 'inspection_concerns',
        prompt: 'Any known issues that may affect inspection?',
        options: [
          { id: 'none', label: 'No known concerns' },
          { id: 'warning_light', label: 'Warning light on' },
          { id: 'recent_fail', label: 'Recently failed inspection' },
          { id: 'not_sure', label: 'Not sure' },
        ],
      },
    ],
  },
  alignment: {
    serviceId: 'alignment',
    issueQuestion: {
      id: 'alignment_symptom',
      prompt: 'What alignment symptom are you noticing?',
      options: [
        { id: 'pulling', label: 'Vehicle pulls to one side' },
        { id: 'off_center', label: 'Steering wheel off-center' },
        { id: 'uneven_tires', label: 'Uneven tire wear' },
        { id: 'post_suspension', label: 'After suspension/tire work' },
      ],
    },
    followupQuestions: [
      {
        id: 'alignment_speed',
        prompt: 'When is it most noticeable?',
        options: [
          { id: 'city', label: 'At lower city speeds' },
          { id: 'highway', label: 'At highway speeds' },
          { id: 'braking', label: 'During braking' },
          { id: 'always', label: 'All the time' },
        ],
      },
      {
        id: 'impact_history',
        prompt: 'Have you recently hit a pothole or curb?',
        options: [
          { id: 'yes_recent', label: 'Yes, recently' },
          { id: 'yes_older', label: 'Yes, but not recently' },
          { id: 'no', label: 'No' },
          { id: 'unknown', label: 'Not sure' },
        ],
      },
    ],
  },
  'brake-service': {
    serviceId: 'brake-service',
    issueQuestion: {
      id: 'brake_symptom',
      prompt: 'What brake issue are you experiencing?',
      options: [
        { id: 'squeal_noise', label: 'Squeal or grinding noise' },
        { id: 'pedal_pulsation', label: 'Pulsation when braking' },
        { id: 'soft_pedal', label: 'Soft or low brake pedal' },
        { id: 'warning_light', label: 'Brake warning light' },
      ],
    },
    followupQuestions: [
      {
        id: 'brake_location',
        prompt: 'Where do you notice it most?',
        options: [
          { id: 'front', label: 'Front brakes' },
          { id: 'rear', label: 'Rear brakes' },
          { id: 'both', label: 'Both front and rear' },
          { id: 'unsure', label: 'Not sure' },
        ],
      },
      {
        id: 'brake_severity',
        prompt: 'How severe is the issue currently?',
        options: [
          { id: 'minor', label: 'Minor, still drivable' },
          { id: 'moderate', label: 'Moderate, worsening' },
          { id: 'severe', label: 'Severe, urgent attention needed' },
        ],
      },
    ],
  },
  'general-repair': {
    serviceId: 'general-repair',
    issueQuestion: {
      id: 'repair_category',
      prompt: 'Which area best matches your concern?',
      options: [
        { id: 'engine', label: 'Engine or performance issue' },
        { id: 'electrical', label: 'Electrical issue' },
        { id: 'suspension', label: 'Steering/suspension issue' },
        { id: 'drivetrain', label: 'Transmission/drivetrain issue' },
      ],
    },
    followupQuestions: [
      {
        id: 'repair_when',
        prompt: 'When does the issue happen?',
        options: [
          { id: 'startup', label: 'At startup' },
          { id: 'driving', label: 'While driving' },
          { id: 'idling', label: 'At idle/stop' },
          { id: 'intermittent', label: 'Intermittently' },
        ],
      },
      {
        id: 'repair_warning_light',
        prompt: 'Are any warning lights on?',
        options: [
          { id: 'none', label: 'No warning lights' },
          { id: 'check_engine', label: 'Check engine light' },
          { id: 'multiple', label: 'Multiple lights on' },
          { id: 'unknown', label: 'Not sure' },
        ],
      },
    ],
  },
  'preventative-maintenance': {
    serviceId: 'preventative-maintenance',
    issueQuestion: {
      id: 'maintenance_goal',
      prompt: 'What maintenance are you planning?',
      options: [
        { id: 'mile_interval', label: 'Mileage-based maintenance' },
        { id: 'seasonal', label: 'Seasonal maintenance' },
        { id: 'pre_trip', label: 'Pre-trip checkup' },
        { id: 'full_inspection', label: 'General preventive inspection' },
      ],
    },
    followupQuestions: [
      {
        id: 'maintenance_history',
        prompt: 'Do you have recent service history available?',
        options: [
          { id: 'yes_records', label: 'Yes, I can provide records' },
          { id: 'some_history', label: 'Some, but not complete' },
          { id: 'none', label: 'No recent records' },
        ],
      },
      {
        id: 'maintenance_priority',
        prompt: 'What is your highest priority today?',
        options: [
          { id: 'reliability', label: 'Reliability' },
          { id: 'safety', label: 'Safety checks' },
          { id: 'cost_control', label: 'Cost control and planning' },
        ],
      },
    ],
  },
  'diagnose-problem': {
    serviceId: 'diagnose-problem',
    issueQuestion: {
      id: 'diagnose_symptom',
      prompt: 'What type of issue are you trying to diagnose?',
      options: [
        { id: 'noise', label: 'Unusual noise' },
        { id: 'vibration', label: 'Vibration/shaking' },
        { id: 'warning_light', label: 'Warning light' },
        { id: 'driveability', label: 'Performance or drivability' },
      ],
    },
    followupQuestions: [
      {
        id: 'diagnose_frequency',
        prompt: 'How often does the issue occur?',
        options: [
          { id: 'always', label: 'Every drive' },
          { id: 'frequent', label: 'Frequently' },
          { id: 'intermittent', label: 'Intermittently' },
          { id: 'rare', label: 'Rarely' },
        ],
      },
      {
        id: 'diagnose_condition',
        prompt: 'What conditions usually trigger it?',
        options: [
          { id: 'cold_start', label: 'Cold start' },
          { id: 'highway', label: 'Highway speed' },
          { id: 'stop_go', label: 'Stop-and-go traffic' },
          { id: 'unknown', label: 'No clear pattern' },
        ],
      },
    ],
  },
  other: {
    serviceId: 'other',
    issueQuestion: {
      id: 'other_category',
      prompt: 'What kind of service do you need?',
      options: [
        { id: 'repair', label: 'Repair concern' },
        { id: 'maintenance', label: 'Maintenance concern' },
        { id: 'inspection', label: 'Inspection/check concern' },
        { id: 'consultation', label: 'Need service guidance first' },
      ],
    },
    followupQuestions: [
      {
        id: 'other_driveable',
        prompt: 'Is the vehicle currently drivable?',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'limited', label: 'Limited use only' },
          { id: 'no', label: 'No' },
        ],
      },
      {
        id: 'other_urgency',
        prompt: 'How urgent is this request?',
        options: [
          { id: 'today', label: 'Need help today' },
          { id: 'this_week', label: 'Within this week' },
          { id: 'flexible', label: 'Flexible scheduling' },
        ],
      },
    ],
  },
}

export function getServiceQuestionTree(serviceId: string): AppointmentServiceQuestionTree | null {
  return APPOINTMENT_SERVICE_QUESTION_TREES[serviceId] || null
}

