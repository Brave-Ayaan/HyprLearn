<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { decodeJwt, humanizeTimeFields, verifyHmac, supportedAlg, type DecodedJwt } from "./jwt";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let token = $state(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  );
  let secret = $state("your-256-bit-secret");
  let inputEl: HTMLTextAreaElement | undefined = $state();
  let verifyResult: "unverified" | "valid" | "invalid" | "unsupported" | "error" = $state("unverified");
  let verifyMessage = $state("");

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  const decoded = $derived.by((): { value: DecodedJwt | null; error: string | null } => {
    try {
      return { value: decodeJwt(token), error: null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : "Invalid token" };
    }
  });

  $effect(() => {
    void token;
    void secret;
    verifyResult = "unverified";
    verifyMessage = "";
  });

  async function verify() {
    const d = decoded.value;
    if (!d) return;
    const alg = supportedAlg((d.header as Record<string, unknown>)?.alg);
    if (!alg) {
      verifyResult = "unsupported";
      verifyMessage = `alg "${(d.header as Record<string, unknown>)?.alg}" isn't HMAC - can't verify without the public/private key pair involved`;
      return;
    }
    try {
      const ok = await verifyHmac(d, secret);
      verifyResult = ok ? "valid" : "invalid";
      verifyMessage = ok ? `Signature matches (${alg}, secret as entered)` : `Signature does not match ${alg} with this secret`;
    } catch (err) {
      verifyResult = "error";
      verifyMessage = err instanceof Error ? err.message : "Verification failed";
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="jwt-tile">
  <textarea
    bind:this={inputEl}
    bind:value={token}
    onkeydown={onKeydown}
    onfocus={() => vimState.enterInsert()}
    onblur={() => vimState.enterNormal()}
    spellcheck="false"
    class="token-input"
    placeholder="Paste a JWT (header.payload.signature)..."
  ></textarea>

  {#if decoded.error}
    <div class="error">{decoded.error}</div>
  {:else if decoded.value}
    {@const d = decoded.value}
    <div class="panels">
      <div class="panel">
        <div class="panel-label">Header</div>
        <pre>{JSON.stringify(d.header, null, 2)}</pre>
      </div>
      <div class="panel">
        <div class="panel-label">Payload</div>
        <pre>{JSON.stringify(d.payload, null, 2)}</pre>
        {#each humanizeTimeFields(d.payload) as t (t.field)}
          <div class="time-row"><span class="field">{t.field}</span><span class="mono">{t.iso}</span></div>
        {/each}
      </div>
    </div>

    <div class="verify-row">
      <label>
        secret
        <input bind:value={secret} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
      </label>
      <button type="button" onclick={verify}>Verify HMAC signature</button>
      {#if verifyResult !== "unverified"}
        <span class="verify-status {verifyResult}">{verifyMessage}</span>
      {/if}
    </div>
    <p class="note">Signature verification runs entirely in this window via the Web Crypto API - nothing is sent anywhere, and only HS256/384/512 (HMAC) can be checked without a public key.</p>
  {/if}
</div>

<style>
  .jwt-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.78rem;
    overflow-y: auto;
  }
  .token-input {
    width: 100%;
    min-height: 4rem;
    resize: vertical;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.5rem;
    box-sizing: border-box;
  }
  .error {
    color: var(--error);
    font-size: 0.75rem;
  }
  .panels {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .panel {
    flex: 1;
    min-width: 12rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem;
  }
  .panel-label {
    font-size: 0.68rem;
    opacity: 0.55;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.3rem;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.74rem;
  }
  .time-row {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.3rem;
    font-size: 0.72rem;
    opacity: 0.75;
  }
  .time-row .field {
    opacity: 0.6;
  }
  .verify-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.8;
  }
  input {
    font: inherit;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
    width: 10rem;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .verify-status {
    font-size: 0.72rem;
  }
  .verify-status.valid {
    color: var(--success);
  }
  .verify-status.invalid,
  .verify-status.error {
    color: var(--error);
  }
  .verify-status.unsupported {
    color: var(--warning);
  }
  .note {
    margin: 0;
    opacity: 0.45;
    font-size: 0.68rem;
  }
</style>
