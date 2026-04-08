type Reducer<S, A> = (state: S | undefined, action: A) => S;

type ReducersMapObject = Record<string, Reducer<unknown, unknown>>;

type StateFromReducersMapObject<R extends ReducersMapObject> = {
  [K in keyof R]: R[K] extends Reducer<infer S, unknown> ? S : never;
};

type ActionFromReducersMapObject<R extends ReducersMapObject> = R[keyof R] extends Reducer<unknown, infer A>
  ? A
  : never;

export type Store<S, A> = {
  getState: () => S;
  dispatch: (action: A) => A;
  subscribe: (listener: () => void) => () => void;
};

export function combineReducers<R extends ReducersMapObject>(reducers: R) {
  type State = StateFromReducersMapObject<R>;
  type Action = ActionFromReducersMapObject<R>;

  return function rootReducer(state: State | undefined, action: Action): State {
    const nextState = {} as State;

    (Object.keys(reducers) as Array<keyof R>).forEach((key) => {
      const reducer = reducers[key] as Reducer<unknown, Action>;
      const previousStateForKey = state?.[key] as unknown;
      (nextState as Record<string, unknown>)[key as string] = reducer(previousStateForKey, action);
    });

    return nextState;
  };
}

export function createStore<S, A>(reducer: Reducer<S, A>): Store<S, A> {
  let currentState = reducer(undefined, { type: "@@INIT" } as A);
  const listeners = new Set<() => void>();

  const getState = () => currentState;

  const dispatch = (action: A) => {
    currentState = reducer(currentState, action);
    listeners.forEach((listener) => listener());
    return action;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getState,
    dispatch,
    subscribe,
  };
}
