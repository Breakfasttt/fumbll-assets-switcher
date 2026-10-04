---
id: 17
title: Mémorisation de navigation + onboarding conditionnel
feature: config
type: ux
priority: haute
depends: [16]
---

## Objectif
rouvrir sur le dernier onglet/roster/position ; Config uniquement si cache absent/invalide.

## Conception
Voir `docs/ux-research.md` (carte #17) et la section de la feature concernée.

## Réalisé
`AppConfig.ui` (`UiMemory` : lastTab, lastRosterId, showSpecialRosters, lastPositionName, lastPitchKey) + hook
`useUiMemory` (au lieu d'un `NavigationContext` : la config en cache react-query suffit). App : rien
n'est rendu avant config + vérification du cache (plus de flash de Config) ; onboarding tant que le
cache est absent ou invalide (`useCacheValid`), onglets verrouillés ; sinon rouvre le dernier onglet.
Roster, case spéciaux et position restaurés ; bug corrigé : `PlayerEditor` gardait la position d'un
autre roster après #15 (`key={roster.id}`). Terrain mémorisé (`lastPitchKey`) : branché avec #22/#27
(PitchView en cours de refonte). Validé : e2e `navigation-memory` (relances sur le même bac à sable).

## Hors périmètre
À préciser au passage en `2_a_implementer`.

## Checklist
- [x] `AppConfig.ui` (lastTab, lastRosterId, lastPosition, lastPitchKey) + `NavigationContext`
- [x] Validation du cache au démarrage → onboarding sinon dernier onglet
- [x] Onglets désactivés + tooltip tant que non configuré
- [x] skill(s) concerné(s) mis à jour
- [x] `npm run verify` OK
