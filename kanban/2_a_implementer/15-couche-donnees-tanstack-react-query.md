---
id: 15
title: Couche données @tanstack/react-query
feature: project
type: refactor
priority: haute
depends: [14]
---

## Objectif
un hook par ressource IPC (`useRosters`, `useRoster`, `useOverride`, `usePacks`, …) et des mutations avec invalidation ; fin des refetch par onglet.

## Conception
Voir `docs/ux-research.md` (carte #15) et la section de la feature concernée.

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [ ] `QueryClientProvider` (staleTime adaptés, pas de refetchOnWindowFocus)
- [ ] `shared/api/queries.ts` + `mutations.ts` ; supprimer cache module de `rosters.ts`
- [ ] `useActivePackGuard` → lit `usePacks()` (plus d'IPC par mutation)
- [ ] Mutations branchées sur `notify.undoable`
- [ ] skill(s) concerné(s) mis à jour
- [ ] `npm run verify` OK
