# Floating Particle Effects

This directory contains reusable particle effect components for the Azuret.me website.

## FloatingParticle Component

A reusable component that creates animated particle effects that float away from a given point.

### Usage

#### As a React Component

```tsx
import { FloatingParticle } from '@/components/floating-particles';

function MyComponent() {
  return (
    <FloatingParticle 
      x={100} 
      y={100} 
      color="#FF6B9D" 
      count={12}
      size={10}
      duration={600}
      spread={80}
    />
  );
}
```

#### As a Utility Function

For quick particle spawning without React components:

```tsx
import { spawnFloatingParticles } from '@/components/floating-particles';

function handleClick(event: MouseEvent) {
  spawnFloatingParticles(
    event.clientX, 
    event.clientY, 
    '#4ECDC4',
    { count: 16, spread: 100 }
  );
}
```

### Props

- `x` (number, required): X position in pixels
- `y` (number, required): Y position in pixels  
- `color` (string, required): Color of particles (any valid CSS color)
- `size` (number, optional): Base size of particles in pixels (default: 8)
- `count` (number, optional): Number of particles to spawn (default: 8)
- `duration` (number, optional): Animation duration in milliseconds (default: 500)
- `spread` (number, optional): Distance particles travel in pixels (default: 60)
- `onComplete` (function, optional): Callback when animation completes

### Examples

Celebrate a successful action:
```tsx
spawnFloatingParticles(x, y, '#FFE66D', { count: 20, spread: 120 });
```

Show a subtle click effect:
```tsx
spawnFloatingParticles(x, y, '#A29BFE', { count: 8, spread: 40, duration: 400 });
```

Dramatic explosion:
```tsx
spawnFloatingParticles(x, y, '#FF6B6B', { count: 30, spread: 150, size: 12, duration: 800 });
```
