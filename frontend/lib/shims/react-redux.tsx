"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type BasicStore = {
  getState: () => unknown;
  dispatch: (action: unknown) => unknown;
  subscribe: (listener: () => void) => () => void;
};

const StoreContext = createContext<BasicStore | null>(null);

type ProviderProps = {
  store: BasicStore;
  children: ReactNode;
};

export function Provider({ store, children }: ProviderProps) {
  const value = useMemo(() => store, [store]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDispatch<TDispatch = (action: unknown) => unknown>() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("Store is not provided.");
  }
  return store.dispatch as TDispatch;
}

export function useSelector<TSelected>(selector: (state: any) => TSelected): TSelected {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("Store is not provided.");
  }

  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export type TypedUseSelectorHook<TState> = <TSelected>(selector: (state: TState) => TSelected) => TSelected;
