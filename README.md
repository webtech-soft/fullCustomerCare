# Customer Care - Vue.js Application

A modern, card-based customer care management system built with Vue.js, TypeScript, and Tailwind CSS.

## Features

- **Card-based Ticket Display**: Modern, responsive ticket cards with all relevant information
- **Real-time Updates**: Editable technician assignments and vehicle status
- **Filtering & Search**: Filter tickets by date, type, status, and search across all fields
- **DVI Editor Integration**: Seamless integration with the DVI Editor project for inspections
- **Cross-project Navigation**: Navigate between Customer Care, DVI Editor, and Check In projects
- **Mobile-friendly**: Responsive design that works on all screen sizes

## Tech Stack

- **Vue.js 3** with Composition API
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Vue Router** for navigation
- **Tailwind CSS** for styling
- **Phosphor Icons** (`@phosphor-icons/vue`) for icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/              # API services (mock data)
├── components/       # Vue components
│   ├── ui/          # Reusable UI components
│   ├── Sidebar.vue  # Sidebar navigation
│   ├── TopNav.vue   # Top navigation bar
│   ├── MainLayout.vue # Main layout wrapper
│   └── TicketCard.vue # Ticket card component
├── lib/             # Utility functions
├── pages/           # Page components
│   └── TicketsPage.vue # Main tickets page
├── types/           # TypeScript type definitions
├── App.vue          # Root component
├── main.ts          # Application entry point
└── style.css        # Global styles
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_DVI_EDITOR_URL=http://localhost:3000
VITE_CHECK_IN_URL=http://localhost:3001
```

For chat/email backend (`sms-server.js`), configure SMTP and SEND_EMAIL behavior:

```env
# SMTP transport (required for email sending)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# Default sender used when FromAddr is omitted
EMAIL_FROM=support@example.com

# Optional default signature used when Signature is omitted
EMAIL_DEFAULT_SIGNATURE=

# Allow caller-provided FromAddr override (true/false)
EMAIL_ALLOW_FROM_OVERRIDE=false
```

## API Integration

Currently, the application uses mock data in `src/api/tickets.ts`. To integrate with a real API:

1. Replace the `fetchTickets` function in `src/api/tickets.ts` with actual API calls
2. Update the `handleUpdate` function in `src/pages/TicketsPage.vue` to send updates to your API

### SEND_EMAIL API

Customer Care now supports a SEND_EMAIL-style backend endpoint:

- **Endpoint**: `POST /email/send`
- **Backend implementation**: `sms-server.js`
- **Frontend typed helper**: `sendEmail()` in `src/api/chat.ts`

Request JSON:

```json
{
  "Subject": "Appointment Confirmation",
  "Body": "Your appointment is confirmed for tomorrow at 10:00 AM.",
  "Signature": "",
  "FromAddr": "",
  "ToAddrs": "customer@example.com",
  "CCAddrs": "",
  "BCCAddrs": ""
}
```

Response JSON:

```json
{
  "EmailId": 123456
}
```

Validation and behavior:

- `Subject`, `Body`, and `ToAddrs` are required and must be non-empty.
- `ToAddrs`, `CCAddrs`, and `BCCAddrs` accept comma-delimited addresses in either `name@example.com` or `Name<name@example.com>` format.
- `Body` and `Signature` are treated as HTML only when wrapped with `<html>...</html>`.
- If `FromAddr` is omitted, sender falls back to `EMAIL_FROM` (or `SMTP_USER`).
- If `FromAddr` is provided while `EMAIL_ALLOW_FROM_OVERRIDE=false`, the request fails with `403`.

## Cross-Project Navigation

The application supports navigation to other projects:

- **DVI Editor**: Opens inspection editor with ticket data
- **Check In**: Opens check-in page with ticket information

Configure project URLs via environment variables (see above).

## Development Notes

- The project uses Vue 3 Composition API with `<script setup>` syntax
- All components are written in TypeScript
- Styling follows the DVI Editor project's design system
- The popover for vehicle status uses Vue's `Teleport` to render outside the card DOM hierarchy

## License

Private project
