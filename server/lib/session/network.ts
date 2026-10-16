/**
 * The part of a client address that one client controls, as rate-limit key. An IPv6 user
 * usually gets a whole /64, so counting single addresses would hand out a fresh allowance
 * for every address in it.
 */
export function networkOf(ip: string): string {
  const address = (ip.split("%")[0] ?? ip).toLowerCase();
  if (!address.includes(":")) return address;

  const mappedIPv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mappedIPv4) return mappedIPv4[1]!;

  const [head = "", tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array<string>(Math.max(8 - left.length - right.length, 0)).fill("0"), ...right];
  const prefix = groups.slice(0, 4).map((group) => (Number.parseInt(group, 16) || 0).toString(16));
  return `${prefix.join(":")}::/64`;
}
