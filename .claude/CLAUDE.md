# fumbbl-assets-switcher

**Charger le skill `project-map` en premier**, avant toute exploration du code. Il donne la carte du
projet et indique quel skill `feature-*` / `shared-ui` / `main-ipc` charger ensuite. Ne pas explorer
le repo à l'aveugle : les skills listent tous les fichiers (vérifié par `npm run check-arch`).

- Suivi du travail : `kanban/` (voir `kanban/README.md`, CLI `npm run kanban`).
- Avant de passer une carte en `4_a_valider` : `npm run verify` doit passer.
- Toute modification de fichiers d'une feature → mettre à jour son skill dans la même carte.
- Direction UX/UI et libs : `docs/ux-research.md`.
- Pas de commit sans demande explicite.
- **Projet PERSO** : avant tout commit/push, `npm run check-identity`. Compte pro (ludicius/succubus/yannsucc) détecté → s'arrêter et demander à l'utilisateur de basculer (`gh auth switch --user Breakfasttt`). Jamais `--no-verify`.
