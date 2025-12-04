# SprintSync Code Style Conventions

## TypeScript & React Patterns
- **Strict TypeScript**: All code uses TypeScript with proper type definitions
- **React Hooks**: Functional components with hooks (useState, useEffect, useCallback)
- **Custom Hooks**: Reusable logic encapsulated in custom hooks (usePeerService, useMotionService)
- **Client Components**: All components marked with 'use client' directive

## Naming Conventions
- **Components**: PascalCase (HostView, GateView)
- **Hooks**: camelCase with 'use' prefix (usePeerService, useMotionService)
- **Variables/Functions**: camelCase (isArmed, motionDetected, startCamera)
- **Constants**: UPPER_SNAKE_CASE for configuration values (roiSize, threshold)
- **Types**: PascalCase for interfaces and types (AppMode, PeerData, ConnectedPeer)

## Code Organization
- **File Structure**: 
  - `/app` - Next.js app router pages
  - `/components` - React components
  - `/lib` - Custom hooks and utilities
- **Import Order**: React imports first, then custom components, then utilities
- **Export Strategy**: Named exports for utilities, default export for components

## Styling Conventions
- **CSS Framework**: Tailwind CSS with utility classes
- **Responsive Design**: Mobile-first approach with responsive utilities
- **Color Scheme**: Dark theme with slate color palette
- **Component Styling**: Consistent spacing, rounded corners, and shadows

## Error Handling
- **Try-Catch Blocks**: Async operations wrapped in try-catch
- **User Feedback**: Alert messages for user-facing errors
- **Console Logging**: Development logging with meaningful messages

## Performance Considerations
- **useCallback**: Memoized functions to prevent unnecessary re-renders
- **useRef**: References for DOM elements and persistent values
- **RequestAnimationFrame**: Efficient motion detection loop
- **Cleanup**: Proper resource cleanup in useEffect return functions