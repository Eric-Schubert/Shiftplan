export type MemberProfile = {
  id: number;
  name: string;
  shortCode: string | null;
  hasPin: boolean;
};

/**
 * Personal sign-in in the browser (Kürzel + PIN or the planner's QR code). The session lives in
 * an HttpOnly cookie; the browser adds the Origin header that the server checks on writes.
 */
export function useMember() {
  const member = useState<MemberProfile | null>("member", () => null);
  const loaded = useState<boolean>("member-loaded", () => false);
  const requestFetch = useRequestFetch();

  async function load(): Promise<MemberProfile | null> {
    try {
      const response = await requestFetch<{ staff: MemberProfile }>("/api/member/me");
      member.value = response.staff;
    } catch {
      member.value = null;
    }
    loaded.value = true;
    return member.value;
  }

  async function login(shortCode: string, pin: string): Promise<MemberProfile> {
    const response = await $fetch<{ staff: MemberProfile }>("/api/member/login", {
      method: "POST",
      body: { shortCode, pin, client: "web", deviceName: deviceName() },
    });
    member.value = response.staff;
    return response.staff;
  }

  async function redeem(code: string): Promise<MemberProfile> {
    const response = await $fetch<{ staff: MemberProfile }>("/api/member/redeem", {
      method: "POST",
      body: { code, client: "web", deviceName: deviceName() },
    });
    member.value = response.staff;
    return response.staff;
  }

  async function setPin(pin: string, currentPin?: string): Promise<void> {
    await $fetch("/api/member/pin", { method: "PUT", body: { pin, currentPin } });
    if (member.value) member.value = { ...member.value, hasPin: true };
  }

  async function logout(): Promise<void> {
    await $fetch("/api/member/logout", { method: "POST" });
    member.value = null;
  }

  return { member, loaded, load, login, redeem, setPin, logout };
}

/** "Firefox auf macOS", shown in the planner's device list. */
function deviceName(): string {
  if (import.meta.server) return "Browser";
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const system = /iPhone|iPad/.test(agent)
    ? "iOS"
    : /Android/.test(agent)
      ? "Android"
      : /Mac OS X/.test(agent)
        ? "macOS"
        : /Windows/.test(agent)
          ? "Windows"
          : /Linux/.test(agent)
            ? "Linux"
            : "";
  return system ? `${browser} auf ${system}` : browser;
}
