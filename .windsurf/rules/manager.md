# PKour Manager — Angular 21 Rules

## Stack
- **Angular 21.2.x** — standalone components only, no NgModules
- **Signals** — prefer `signal()`, `computed()`, `effect()` over RxJS observables where possible
- **RxJS** — use only for HTTP streams or complex async chains; unsubscribe via `takeUntilDestroyed()`
- **TailwindCSS** — utility-first, no custom CSS unless strictly necessary
- **`@lucide/angular`** — all icons via Lucide, never Material icon font
- **`@angular/cdk`** — overlays, dialogs, drag; never `@angular/material` components
- **i18n** — `@angular/localize`, all user-facing strings via `$localize` or `i18n` attribute
  - Default locale: `it`, also support `en`
  - Translation files: `src/locales/messages.it.xlf`, `src/locales/messages.en.xlf`

## Architecture

### File structure
```
src/app/
  core/
    auth/          # AuthService, AuthGuard, AuthInterceptor
    api/           # Per-domain API services (AdminApiService, TricksApiService…)
    layout/        # AppShellComponent, SidebarComponent, HeaderComponent
  features/
    dashboard/     # DashboardComponent (lazy)
    tricks/        # TricksListComponent, TrickFormComponent (lazy)
    spots/         # SpotsModerationComponent, SpotDetailDrawerComponent (lazy)
    reviews/       # ReviewsModerationComponent (lazy)
    reports/       # ReportsModerationComponent (lazy)
    photos/        # PhotosModerationComponent (lazy)
  shared/
    components/    # StatusBadge, ConfirmDialog, TablePaginator, Toast, LoadingOverlay…
    pipes/
    models/        # TypeScript interfaces (no classes)
```

### Naming
- Components: `feature-name.component.ts` → selector `app-feature-name`
- Services: `feature-name.service.ts`
- Guards: `feature-name.guard.ts`
- Models/interfaces: `feature-name.model.ts`
- No barrel `index.ts` unless a folder has >4 exports

### Components
- Always `standalone: true`
- Use `ChangeDetectionStrategy.OnPush` on every component
- Inject with `inject()` function, never constructor injection
- Use `input()` / `output()` signal-based API (Angular 17+), not `@Input()` / `@Output()`
- Keep templates < 150 lines; extract sub-components when larger
- No business logic in templates — move to component class or service

### Services (core/api)
- Each domain has its own API service (e.g. `SpotsApiService`)
- Return `Observable<T>` from HTTP calls
- Handle errors with `catchError` — never swallow silently
- No `subscribe()` inside services — return observables to consumers

### Auth
- `AuthService` exposes: `currentUser = signal<AdminUser | null>(null)`, `isLoggedIn = computed(…)`
- `AuthGuard` is a functional guard using `inject(AuthService)`
- `AuthInterceptor` adds `withCredentials: true` to all requests via `HttpClient`

### Routing
- All feature routes are **lazy loaded** via `loadComponent`
- Route guards applied at feature route level
- Use `Router` via `inject(Router)` in services only

### State management
- Use signals for local/shared UI state
- No NgRx — overkill for this app
- `AuthService` is the single source of truth for auth state

### HTTP
- Use `HttpClient` via `inject(HttpClient)`, never fetch()
- Base URL from `environment.apiBaseUrl`
- All requests go through `AuthInterceptor` (withCredentials)
- API services live in `core/api/`

### i18n
- Every user-visible string must use `$localize` or `i18n` attribute
- Never hardcode Italian or English strings directly in templates without localization

### Loading & errors
- Show `LoadingOverlay` or skeleton for every async operation
- Show toast notification (success/error) for every admin action
- Never leave the user without feedback

### Mobile-first
- All pages must work on 375px wide screens
- Sidebar collapses to bottom navigation bar on mobile
- Touch targets minimum 44px
- Swipe gestures for approve/reject on moderation cards

### Code style
- No `any` types — use proper interfaces
- No `console.log` in production code (use only during development)
- Prefer `readonly` on injected services
- Max file length: 300 lines; split if larger

## Backend contract
- Auth: `POST /api/admin/login` (email+password) → session cookie
- Logout: `POST /api/admin/logout`
- Session check: `GET /api/admin/session`
- All manager endpoints: `/api/manager/*` (requireAdminSession)
- All admin spot endpoints: `/api/admin/spots/*` (existing)
- `withCredentials: true` on every request

## DO NOT
- Use NgModules
- Use `@angular/material` UI components
- Use `any` types
- Hardcode API URLs (use `environment.apiBaseUrl`)
- Put business logic in templates
- Use `subscribe()` inside services
- Use constructor injection (use `inject()`)
- Add comments or documentation unless asked
