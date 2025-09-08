# Developer Guide: Working with State Machines

## Quick Start

### Understanding the Architecture

The Lottie Sync App uses a hierarchical state machine architecture with XState. Here's what you need to know:

1. **Enhanced Application Machine** - Main orchestrator
2. **Specialized Machines** - Handle specific concerns (files, players, sync)
3. **Event-Driven Communication** - Machines communicate via events
4. **Actor Model** - Child machines are spawned and managed automatically

### Development Workflow

#### 1. Adding New Events

```typescript
// 1. Define event type
export type MyEvent = { type: 'MY_EVENT'; data: string };

// 2. Add to machine events union
export type MachineEvent = ExistingEvent | MyEvent;

// 3. Add event handler
on: {
  MY_EVENT: {
    target: 'newState',
    actions: 'handleMyEvent',
    guard: 'canHandleEvent'
  }
}

// 4. Implement action
actions: {
  handleMyEvent: assign({
    someProperty: ({ event }) => event.data
  })
}
```

#### 2. Adding New States

```typescript
// Add state to machine definition
states: {
  newState: {
    entry: 'onEnterNewState',
    exit: 'onExitNewState',
    on: {
      NEXT_EVENT: 'anotherState'
    }
  }
}
```

#### 3. Creating New Guards

```typescript
guards: {
  canPerformAction: ({ context, event }) => {
    // Return boolean condition
    return context.someValue > threshold;
  };
}
```

### Common Patterns

#### Pattern 1: Async Operations with Services

```typescript
// Define the service
const myAsyncService = fromPromise(async ({ input }) => {
  const result = await performAsyncOperation(input);
  return result;
});

// Use in state machine
someState: {
  invoke: {
    id: 'myAsyncOperation',
    src: myAsyncService,
    input: ({ event }) => ({ data: event.data }),
    onDone: {
      target: 'success',
      actions: 'handleSuccess'
    },
    onError: {
      target: 'error',
      actions: 'handleError'
    }
  }
}
```

#### Pattern 2: Parent-Child Communication

```typescript
// Parent spawning child
actions: {
  spawnChild: assign({
    childRef: ({ spawn }) =>
      spawn(childMachine, {
        input: { config: 'value' },
        id: 'child-id',
      }),
  });
}

// Child sending to parent
actions: {
  notifyParent: sendParent({
    type: 'CHILD_READY',
    data: 'some data',
  });
}
```

#### Pattern 3: Event Broadcasting

```typescript
actions: {
  broadcastToChildren: ({ context }) => {
    context.childRefs.forEach((childRef) => {
      childRef.send({ type: 'BROADCAST_EVENT' });
    });
  };
}
```

## Testing State Machines

### Unit Testing States and Transitions

```typescript
import { describe, test, expect } from 'vitest';
import { myMachine } from './myMachine';

describe('MyMachine', () => {
  test('should transition from idle to loading on LOAD event', () => {
    const nextState = myMachine.transition('idle', { type: 'LOAD' });
    expect(nextState.value).toBe('loading');
  });

  test('should not transition if guard fails', () => {
    const state = myMachine.getInitialState({
      // context that makes guard fail
    });
    const nextState = myMachine.transition(state, { type: 'LOAD' });
    expect(nextState.changed).toBe(false);
  });
});
```

### Integration Testing with Actors

```typescript
import { createActor } from 'xstate';

test('should handle complete workflow', async () => {
  const actor = createActor(myMachine).start();

  // Send events
  actor.send({ type: 'START' });

  // Wait for state change
  await waitFor(() => {
    expect(actor.getSnapshot().value).toBe('running');
  });

  // Verify context
  expect(actor.getSnapshot().context.someValue).toBe(expectedValue);

  actor.stop();
});
```

### Mocking Services

```typescript
const mockService = fromPromise(async () => {
  return { mocked: true };
});

const testMachine = myMachine.provide({
  actors: {
    myAsyncService: mockService,
  },
});
```

## Performance Best Practices

### 1. Efficient Context Updates

```typescript
// ❌ Inefficient - creates new objects unnecessarily
assign({
  items: ({ context }) => [...context.items], // No change!
});

// ✅ Efficient - only update when needed
assign({
  items: ({ context, event }) => {
    if (event.type === 'ADD_ITEM') {
      return [...context.items, event.item];
    }
    return context.items; // Return same reference
  },
});
```

### 2. Throttling Frequent Events

```typescript
// Throttle frame updates
updateFrame: assign({
  currentFrame: ({ context, event }) => {
    const now = Date.now();
    if (now - context.lastUpdate < 16.67) {
      // 60fps
      return context.currentFrame;
    }
    return event.frame;
  },
  lastUpdate: () => Date.now(),
});
```

### 3. Selective Event Handling

```typescript
// Only process events from master player
guard: ({ context, event }) => {
  return event.playerId === context.masterPlayerId;
};
```

## Debugging Tips

### 1. Use XState DevTools

```typescript
import { createActor } from 'xstate';

const actor = createActor(machine, {
  inspect: (inspectionEvent) => {
    console.log(inspectionEvent);
  },
}).start();
```

### 2. Add Logging Actions

```typescript
actions: {
  logTransition: ({ context, event }) => {
    console.log('Transition:', {
      event: event.type,
      context: context,
      timestamp: Date.now(),
    });
  };
}
```

### 3. State Machine Visualization

```typescript
// Generate state machine visualization
import { machine } from './myMachine';
console.log(machine.getStateNodeByPath('').definition);
```

## Common Pitfalls and Solutions

### Pitfall 1: State Explosion

**Problem**: Too many states for simple conditions

```typescript
// ❌ State explosion
states: {
  loadingWithSpinner: {},
  loadingWithoutSpinner: {},
  loadingFast: {},
  loadingSlow: {}
}
```

**Solution**: Use context and guards

```typescript
// ✅ Use context
states: {
  loading: {
    // Use context.showSpinner, context.speed, etc.
  }
}
```

### Pitfall 2: Circular Dependencies

**Problem**: Machines referencing each other directly

```typescript
// ❌ Circular dependency
import { machineB } from './machineB';
export const machineA = createMachine({
  // references machineB
});
```

**Solution**: Use events for communication

```typescript
// ✅ Event-based communication
actions: {
  notifyOtherMachine: sendParent({
    type: 'NOTIFY_OTHER_MACHINE',
  });
}
```

### Pitfall 3: Memory Leaks

**Problem**: Not cleaning up resources

```typescript
// ❌ Memory leak
invoke: {
  src: 'someService';
  // No cleanup
}
```

**Solution**: Proper cleanup

```typescript
// ✅ Proper cleanup
exit: {
  actions: 'cleanup'
},
actions: {
  cleanup: ({ context }) => {
    if (context.subscription) {
      context.subscription.unsubscribe();
    }
  }
}
```

## Integration with React

### Using State Machines in Components

```typescript
import { useMachine } from '@xstate/react';
import { myMachine } from './machines/myMachine';

function MyComponent() {
  const [state, send] = useMachine(myMachine);

  return (
    <div>
      <p>Current state: {state.value}</p>
      <button onClick={() => send({ type: 'START' })}>
        Start
      </button>
      {state.context.error && (
        <p>Error: {state.context.error}</p>
      )}
    </div>
  );
}
```

### Sharing State Between Components

```typescript
// Create actor at app level
const appActor = createActor(applicationMachine).start();

// Provide via context
const AppContext = createContext(appActor);

// Use in components
function MyComponent() {
  const actor = useContext(AppContext);
  const state = useSelector(actor, state => state.context.someValue);

  return <div>{state}</div>;
}
```

### Performance Optimization

```typescript
// Use selectors to prevent unnecessary re-renders
const isLoading = useSelector(actor, (state) => state.matches('loading'));

const errorMessage = useSelector(actor, (state) => state.context.error);
```

## Advanced Patterns

### Pattern 1: State Machine Composition

```typescript
// Compose machines for complex workflows
const composedMachine = createMachine({
  invoke: [
    { id: 'fileManager', src: fileManagerMachine },
    { id: 'syncCoordinator', src: syncCoordinatorMachine },
  ],
});
```

### Pattern 2: Dynamic State Generation

```typescript
// Generate states dynamically
const createPlayerMachine = (playerId: string) => {
  return createMachine({
    id: `player-${playerId}`,
    // ... machine definition
  });
};
```

### Pattern 3: Middleware Pattern

```typescript
// Add middleware for logging, analytics, etc.
const withLogging = (machine) => {
  return machine.provide({
    actions: {
      ...machine.options.actions,
      '*': [machine.options.actions['*'], 'logAction'],
    },
  });
};
```

## Migration Guide

### From Component State to State Machines

1. **Identify State Variables**

   ```typescript
   // Before
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState(null);
   const [data, setData] = useState(null);
   ```

2. **Model as State Machine**

   ```typescript
   // After
   const machine = createMachine({
     initial: 'idle',
     states: {
       idle: {},
       loading: {},
       success: {},
       error: {},
     },
   });
   ```

3. **Replace useEffect with Services**

   ```typescript
   // Before
   useEffect(() => {
     fetchData();
   }, []);

   // After
   invoke: {
     src: 'fetchDataService';
   }
   ```

This guide provides practical patterns and best practices for working with the state machine architecture. Reference the Architecture Decision Record for understanding the reasoning behind design choices.
