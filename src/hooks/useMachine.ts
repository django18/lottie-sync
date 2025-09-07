import { useMachine as useXStateMachine } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import type { ActorRefFrom, AnyStateMachine } from 'xstate';

export function useMachine(
  machine: AnyStateMachine,
  options?: Parameters<typeof useXStateMachine<AnyStateMachine>>[1]
) {
  const [state, send, actorRef] = useXStateMachine(machine, options);

  const sendSafe = useCallback(
    (event: Parameters<typeof send>[0]) => {
      try {
        send(event);
      } catch (error) {
        console.error('Error sending event to machine:', error, event);
      }
    },
    [send]
  );

  const contextSelector = useCallback(
    <T>(selector: (context: any) => T): T => {
      return selector(state.context);
    },
    [state.context]
  );

  const machineHelpers = useMemo(
    () => ({
      canTransition: (event: string): boolean => {
        return state.can({ type: event });
      },
      hasTag: (tag: string): boolean => {
        return state.hasTag(tag);
      },
      matches: (stateValue: string): boolean => {
        return state.matches(stateValue);
      },
      getCurrentStateName: (): string => {
        return state.value as string;
      },
    }),
    [state]
  );

  return {
    state,
    send: sendSafe,
    actorRef,
    context: state.context,
    contextSelector,
    ...machineHelpers,
  };
}

export function useActor<TActor extends ActorRefFrom<any>>(actorRef: TActor) {
  const [state, send] = useXStateMachine(actorRef as any);

  const sendSafe = useCallback(
    (event: Parameters<typeof send>[0]) => {
      try {
        send(event);
      } catch (error) {
        console.error('Error sending event to actor:', error, event);
      }
    },
    [send]
  );

  return {
    state,
    send: sendSafe,
    context: state.context,
  };
}
