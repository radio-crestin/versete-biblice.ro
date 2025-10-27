# Bible MCP Project Guidelines

## Development
- Do not run pnpm run dev, a server is already running at localhost:3000

## UI Components & Styling

### shadcn/ui
- **Use shadcn/ui components** for all UI elements
- Install new components as needed: `npx shadcn@latest add [component-name]`
- Prefer composition over creating new base components
- Customize components through the `components/ui` directory
- Follow shadcn's component patterns and conventions
- Use Tailwind CSS for styling (shadcn's default)

### Design Style Guidelines

#### Layout & Spacing
- Use consistent spacing scale: `space-{1-12}` or Tailwind's spacing utilities
- Maintain 16px (space-4) minimum padding for mobile
- Use responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- All layouts must be mobile-first and responsive

#### Typography
- Headings: Use semantic HTML (`h1`, `h2`, `h3`) with Tailwind text utilities
- Body: Default to `text-base` with proper line-height (`leading-normal`, `leading-relaxed`)
- Maintain readable line lengths (max-width: 65-75 characters)

#### Colors
- **Primary Color**: Yellow (`#F59E0B` / `amber-500`) for primary actions and accents
- **Color Palette**:
  - Primary: Amber/Yellow shades (`amber-400` to `amber-600`)
  - Secondary: Slate/Gray for text and backgrounds (`slate-50` to `slate-900`)
  - Success: Green (`green-500`)
  - Error: Red (`red-500`)
  - Warning: Orange (`orange-500`)
  - Info: Blue (`blue-500`)
- Use Tailwind's color system or CSS variables for theming
- Ensure sufficient contrast ratios (WCAG AA minimum)
- Support light/dark mode where applicable
- Background: Light mode (`bg-white`, `bg-slate-50`), Dark mode (`bg-slate-900`, `bg-slate-800`)

#### Components
- Keep components small and focused (single responsibility)
- Use shadcn primitives as base (Button, Card, Dialog, etc.)
- Ensure all interactive elements have hover/focus states
- Add loading states for async operations
- Include proper error states and messages

#### Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure proper focus management in modals/dialogs

#### Performance
- Lazy load images and heavy components
- Optimize for mobile networks
- Use proper image formats (WebP with fallbacks)

#### Animations
- **Use smooth, purposeful animations** to enhance UX
- **Transition Utilities**: Leverage Tailwind's transition classes (`transition`, `duration-200`, `ease-in-out`)
- **Common Animations**:
  - Hover effects: `hover:scale-105 transition-transform`
  - Fade in: `animate-in fade-in duration-300`
  - Slide in: `animate-in slide-in-from-bottom duration-500`
  - Loading spinners: Use shadcn's built-in loading states
- **Animation Principles**:
  - Keep animations subtle and fast (150-300ms for most interactions)
  - Use `ease-in-out` for natural feel
  - Reduce motion for users who prefer it: `motion-reduce:transition-none`
  - Animate only transform and opacity for best performance
- **Libraries** (if needed beyond Tailwind):
  - Framer Motion for complex animations
  - Auto-animate for list/layout transitions
- **Examples**:
  - Button hover: `hover:bg-amber-600 hover:shadow-lg transition-all duration-200`
  - Card hover: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
  - Page transitions: Fade in content on load
  - Skeleton loaders: Use for async content loading
