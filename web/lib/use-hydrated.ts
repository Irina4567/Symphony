import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Возвращает false при серверном рендере и первом клиентском проходе (до гидратации),
// затем true. Стандартная замена паттерну "useEffect(() => setMounted(true), [])".
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
