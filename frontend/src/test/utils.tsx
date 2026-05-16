/**
 * Test utilities — shared wrappers, mocks, and helpers.
 *
 * Every component test should import `renderWithProviders` from here
 * instead of raw `render()` — it wraps the tree with Router + AuthProvider
 * + QueryClientProvider to match production.
 */
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { AuthContext, type User } from "@/lib/auth";

// --------------------------------------------------------- mock user ---

export const mockUser: User = {
  id: "user-1",
  email: "max@redbull.com",
  username: "max33",
  current_league_id: "league-1",
  avatar_id: "1",
  is_admin: false,
};

export const mockAdminUser: User = {
  ...mockUser,
  id: "admin-1",
  email: "admin@pronokif.com",
  username: "admin",
  is_admin: true,
};

// --------------------------------------------------- query client ---

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------- mock auth value ---

export function mockAuthValue(user: User | null = mockUser) {
  return {
    user,
    loading: false,
    login: vi.fn().mockResolvedValue(user),
    register: vi.fn().mockResolvedValue(user),
    logout: vi.fn(),
    setUsername: vi.fn().mockResolvedValue(user),
    updateUser: vi.fn(),
  };
}

// ------------------------------------------------ all providers ---

interface ProvidersProps {
  children: ReactNode;
  user?: User | null;
  routerProps?: MemoryRouterProps;
}

function AllProviders({ children, user = mockUser, routerProps }: ProvidersProps) {
  const queryClient = createTestQueryClient();
  const auth = mockAuthValue(user);

  return (
    <MemoryRouter {...routerProps}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

// ----------------------------------------------- render helper ---

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  user?: User | null;
  routerProps?: MemoryRouterProps;
}

export function renderWithProviders(
  ui: ReactElement,
  { user, routerProps, ...options }: ExtendedRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders user={user} routerProps={routerProps}>
        {children}
      </AllProviders>
    ),
    ...options,
  });
}

// re-export everything from @testing-library for convenience
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
