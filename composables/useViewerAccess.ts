export type ViewerStatus = {
  codeRequired: boolean;
  hasAccess: boolean;
  pushPublicKey: string | null;
};

export function useViewerAccess() {
  const status = useState<ViewerStatus | null>("viewer-status", () => null);
  const requestFetch = useRequestFetch();

  async function load(): Promise<ViewerStatus> {
    status.value = await requestFetch<ViewerStatus>("/api/viewer/status");
    return status.value;
  }

  async function login(code: string): Promise<void> {
    await $fetch("/api/viewer/login", { method: "POST", body: { code } });
    await load();
  }

  return { status, load, login };
}
