import { render, RenderOptions } from "@testing-library/react";
import { ReactNode } from "react";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";
import { authReducer, loginSucceeded, setCurrentOrg } from "@/store/slices/auth-slice";
import { agendaValidationReducer } from "@/store/slices/agenda-validation-slice";
import { I18nProvider } from "@/features/i18n/providers/i18n-provider";
import type { AuthState } from "@/store/slices/auth-slice";

function buildRootReducer() {
  return combineReducers({
    auth: authReducer,
    agendaValidation: agendaValidationReducer,
  });
}

export function createTestStore(auth?: Partial<AuthState>) {
  const store = createStore(buildRootReducer());

  if (auth?.isAuthenticated) {
    store.dispatch(
      loginSucceeded({
        role: auth.role ?? "org_user",
        username: auth.username ?? "testuser",
        memberships: auth.memberships ?? [],
        activeOrganizationId: auth.currentOrgId ?? null,
      }),
    );
  }

  if (auth?.currentOrgId !== undefined && !auth?.isAuthenticated) {
    store.dispatch(setCurrentOrg(auth.currentOrgId));
  }

  return store;
}

type RenderWithStoreOptions = RenderOptions & {
  auth?: Partial<AuthState>;
};

export function renderWithStore(ui: ReactNode, options?: RenderWithStoreOptions) {
  const store = createTestStore(options?.auth);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );

  const { auth: _auth, ...renderOptions } = options ?? {};
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
}

export function renderHookWithStore<R>(
  hook: () => R,
  options?: { auth?: Partial<AuthState> },
) {
  const store = createTestStore(options?.auth);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );

  return { store, wrapper };
}
