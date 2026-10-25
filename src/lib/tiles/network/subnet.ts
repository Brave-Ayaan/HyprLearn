export interface SubnetInfo {
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
}

export function ipToInt(ip: string): number {
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error("Invalid IPv4 address");
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function subnetInfo(ip: string, prefix: number): SubnetInfo {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Prefix must be an integer 0-32");
  const ipInt = ipToInt(ip);
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & maskInt) >>> 0;
  const wildcard = ~maskInt >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(totalHosts - 2, 0);
  const firstUsable = prefix >= 31 ? network : network + 1;
  const lastUsable = prefix >= 31 ? broadcast : broadcast - 1;
  return {
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    mask: intToIp(maskInt),
    wildcard: intToIp(wildcard),
    firstUsable: intToIp(firstUsable),
    lastUsable: intToIp(lastUsable),
    totalHosts,
    usableHosts,
  };
}
