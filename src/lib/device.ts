/**
 * Identificador único do navegador/dispositivo.
 * Persistido em localStorage; permanece o mesmo enquanto o usuário não limpar os dados.
 */
const STORAGE_KEY = "pm.mapaforca.deviceId";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
              .toString(16)
              .slice(2)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
