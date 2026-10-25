/**
 * Lets the "vault.save" action (Ctrl+K / leader "w" / ":save") reach
 * whichever Vault tile instance is currently focused, without the action
 * registry needing to know about tile instances at all. Each Vault.svelte
 * sets this to its own save function while focused, and clears it on blur
 * or destroy.
 */
export const focusedVaultSave: { current: (() => void | Promise<void>) | null } = {
  current: null,
};

/**
 * Lets "tile.close" ask the focused Vault tile whether it's safe to close
 * right now. Returning false means the Vault has unsaved changes and has
 * taken over showing its own discard-confirmation UI instead - the close
 * is cancelled for this attempt, not silently lost data.
 */
export const focusedVaultCloseGuard: { current: (() => boolean) | null } = {
  current: null,
};
