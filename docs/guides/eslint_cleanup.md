# ESLint Cleanup Guide

Based on the analysis of the current codebase (`npm run lint` results), here is an actionable guide to resolve existing warnings and improve code quality.

## 1. Unused Variables Removal

Target specific files where unused variables are cluttering the code.

| File Path                                    | Unused Variables                                        | Action                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/security/secure-auth.ts`            | `PASSWORD_REQUIREMENTS`                                 | Remove if not used, or export if needed elsewhere.                                                                               |
| `src/lib/security/secure-database.ts`        | `table`                                                 | Remove parameter or prefix with `_` if strictly required by signature.                                                           |
| `src/lib/security/secure-token-generator.ts` | `purpose`                                               | Check if this should be part of the token payload.                                                                               |
| `src/lib/services/appointment-service.ts`    | `InstructorAvailability`, `AppointmentType`, `supabase` | Remove unused imports and variables.                                                                                             |
| `src/lib/supabase/client.ts`                 | `_args` (multiple), `_credentials`, `_params`           | Ensure these are actually needed for method signatures (e.g., interface implementation). If so, keep `_` prefix. If not, remove. |
| `src/lib/templates.ts`                       | `ContentBlock`, `MainContentSection`                    | Remove unused type definitions.                                                                                                  |

**General Rule:**

- If a variable is truly unused, **delete it**.
- If it is a function parameter required by an interface/library but unused in the implementation, ensure it starts with `_` (e.g., `_req`).

## 2. Best Practices Refactoring

### `let` vs `const`

- Scan for variables declared with `let` that are never reassigned.
- **Action:** Change them to `const`.
- **Why:** Improves readability and prevents accidental reassignment.

### React Hooks Dependencies

- Errors like `react-hooks/exhaustive-deps`.
- **Action:** Add missing dependencies to the dependency array `[]`.
- **Caution:** If adding a dependency causes infinite loops, use `useCallback` for functions or `useMemo` for values to stabilize references.

## 3. Accessibility (A11y) Improvements

- **Images:** Ensure all `<Image>` and `<img>` tags have meaningful `alt` text.
  - _Bad:_ `alt="image"`
  - _Good:_ `alt="Student dashboard profile picture"`
- **Buttons:** Ensure icon-only buttons have `aria-label`.
  - Example: `<button aria-label="Close menu"><XIcon /></button>`

## 4. Execution Plan

1. Run `npm run lint` to get the latest list.
2. tackle files one by one.
3. Verify with `npm run build` to ensure no build-blocking type errors were introduced.
