import { useCallback } from "react";
import type { UiMemory } from "@common/types";
import { useConfig } from "@/shared/api/queries";
import { useSaveConfig } from "@/shared/api/mutations";

const EMPTY: UiMemory = {};

/**
 * Navigation memory persisted in config.json (`AppConfig.ui`): last tab,
 * roster, position, pitch… Read it for initial state, `remember` on change.
 * The app only renders views once the config is loaded, so `ui` is ready at mount.
 */
export function useUiMemory() {
  const ui = useConfig().data?.ui ?? EMPTY;
  const { mutate } = useSaveConfig();
  const remember = useCallback((patch: UiMemory) => mutate({ ui: patch }), [mutate]);
  return { ui, remember };
}
