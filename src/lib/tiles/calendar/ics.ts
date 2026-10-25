export interface CalEvent {
  id: number;
  title: string;
  start_secs: number;
  end_secs: number;
  all_day: boolean;
  description: string;
}

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, "0");
}

function toIcsDateTime(secs: number): string {
  const d = new Date(secs * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function toIcsDate(secs: number): string {
  const d = new Date(secs * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function exportIcs(events: CalEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TWM STEM//Calendar//EN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@twm-stem.local`);
    if (e.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(e.start_secs)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(e.end_secs)}`);
    } else {
      lines.push(`DTSTART:${toIcsDateTime(e.start_secs)}`);
      lines.push(`DTEND:${toIcsDateTime(e.end_secs)}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function parseIcsDate(value: string): number {
  // YYYYMMDD or YYYYMMDDTHHMMSS(Z)
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) throw new Error(`Unrecognized ICS date: ${value}`);
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) {
    return Date.UTC(Number(y), Number(mo) - 1, Number(d)) / 1000;
  }
  const date = z
    ? Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
    : new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime();
  return date / 1000;
}

function unescapeIcsText(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export interface ParsedEvent {
  title: string;
  start_secs: number;
  end_secs: number;
  all_day: boolean;
  description: string;
}

export function parseIcs(text: string): ParsedEvent[] {
  // unfold continuation lines (a line starting with a space continues the previous one)
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n").map((l) => l.trim());
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { allDayStart?: boolean } = {};
  let inEvent = false;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = { title: "", description: "", all_day: false };
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && cur.title !== undefined && cur.start_secs !== undefined && cur.end_secs !== undefined) {
        events.push({
          title: cur.title ?? "",
          start_secs: cur.start_secs,
          end_secs: cur.end_secs,
          all_day: !!cur.all_day,
          description: cur.description ?? "",
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyPart = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = keyPart.split(";")[0];
    if (key === "SUMMARY") cur.title = unescapeIcsText(value);
    else if (key === "DESCRIPTION") cur.description = unescapeIcsText(value);
    else if (key === "DTSTART") {
      cur.start_secs = parseIcsDate(value);
      if (keyPart.includes("VALUE=DATE")) cur.all_day = true;
    } else if (key === "DTEND") {
      cur.end_secs = parseIcsDate(value);
    }
  }
  return events;
}
