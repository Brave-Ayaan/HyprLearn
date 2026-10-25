import type { ReferenceEntry } from "../../components/ReferenceBrowser.svelte";

// A static, local-only glossary. Notable CVEs below are fixed historical
// examples for learning, not a live feed -- there is no network access here.
export const cveGlossary: ReferenceEntry[] = [
  { id: "cve-term", title: "CVE", category: "Terminology", body: "Common Vulnerabilities and Exposures. A unique identifier (e.g. CVE-2021-44228) assigned to a publicly disclosed security flaw, maintained by MITRE.", tags: ["terminology"] },
  { id: "cvss", title: "CVSS", category: "Terminology", body: "Common Vulnerability Scoring System. Produces a 0-10 severity score from metrics like attack vector, complexity, privileges required, and impact.", tags: ["terminology"] },
  { id: "0day", title: "Zero-day", category: "Terminology", body: "A vulnerability that is exploited (or disclosed) before the vendor has released a patch.", tags: ["terminology"] },
  { id: "rce", title: "RCE", category: "Terminology", body: "Remote Code Execution. An attacker can run arbitrary code on a target system over the network.", tags: ["terminology"] },
  { id: "xss", title: "XSS", category: "Terminology", body: "Cross-Site Scripting. Injecting malicious script into a web page viewed by other users, executed in their browser session.", tags: ["terminology", "web"] },
  { id: "csrf", title: "CSRF", category: "Terminology", body: "Cross-Site Request Forgery. Tricks a victim's browser into making an unwanted authenticated request to a site they're logged into.", tags: ["terminology", "web"] },
  { id: "sqli", title: "SQL Injection", category: "Terminology", body: "Injecting SQL syntax through unsanitized input to alter a database query's logic.", tags: ["terminology", "web"] },
  { id: "privesc", title: "Privilege Escalation", category: "Terminology", body: "Gaining higher-level access than originally granted -- vertical (user to admin) or horizontal (one user's data to another's).", tags: ["terminology"] },
  { id: "mitm", title: "Man-in-the-Middle (MITM)", category: "Terminology", body: "An attacker secretly intercepts and possibly alters communication between two parties who believe they're talking directly to each other.", tags: ["terminology", "network"] },
  { id: "buffer-overflow", title: "Buffer Overflow", category: "Terminology", body: "Writing more data to a fixed-size buffer than it can hold, overwriting adjacent memory -- a classic route to RCE in unsafe languages.", tags: ["terminology", "memory"] },
  { id: "supply-chain", title: "Supply Chain Attack", category: "Terminology", body: "Compromising a trusted upstream dependency, build tool, or vendor to reach many downstream targets at once.", tags: ["terminology"] },
  { id: "ssrf", title: "SSRF", category: "Terminology", body: "Server-Side Request Forgery. Tricks a server into making requests to internal/unintended destinations on the attacker's behalf.", tags: ["terminology", "web"] },
  { id: "deserialization", title: "Insecure Deserialization", category: "Terminology", body: "Reconstructing objects from untrusted serialized data can trigger unintended code execution if the deserializer isn't carefully restricted.", tags: ["terminology"] },
  { id: "idor", title: "IDOR", category: "Terminology", body: "Insecure Direct Object Reference. An app exposes an internal reference (e.g. a sequential ID) without verifying the requester is authorized to access it.", tags: ["terminology", "web"] },
  { id: "patch-tuesday", title: "Patch Tuesday", category: "Terminology", body: "Microsoft's monthly scheduled release of security updates, the second Tuesday of each month.", tags: ["terminology"] },

  { id: "heartbleed", title: "Heartbleed (CVE-2014-0160)", category: "Notable CVEs", latex: "", body: "A buffer over-read in OpenSSL's TLS heartbeat extension let attackers read up to 64KB of server memory per request -- including private keys and session data. One of the most widely publicized vulnerabilities of its time.", tags: ["cve", "openssl", "2014"] },
  { id: "shellshock", title: "Shellshock (CVE-2014-6271)", category: "Notable CVEs", body: "A flaw in GNU Bash let attackers execute arbitrary commands via specially crafted environment variables, affecting countless CGI scripts and embedded devices.", tags: ["cve", "bash", "2014"] },
  { id: "eternalblue", title: "EternalBlue (CVE-2017-0144)", category: "Notable CVEs", body: "An RCE in Microsoft's SMBv1 implementation, leaked from NSA tooling, became the propagation mechanism for the WannaCry and NotPetya ransomware outbreaks.", tags: ["cve", "smb", "2017"] },
  { id: "log4shell", title: "Log4Shell (CVE-2021-44228)", category: "Notable CVEs", body: "A JNDI lookup in Apache Log4j let attackers achieve RCE simply by getting a string logged, affecting an enormous share of Java server software.", tags: ["cve", "java", "2021"] },
  { id: "spectre", title: "Spectre (CVE-2017-5753 / 5715)", category: "Notable CVEs", body: "A class of CPU speculative-execution side-channel attacks that can leak memory across security boundaries, affecting nearly all modern processors.", tags: ["cve", "hardware", "2017"] },
];
