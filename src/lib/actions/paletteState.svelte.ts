class PaletteState {
  open: boolean = $state(false);

  show() {
    this.open = true;
  }

  hide() {
    this.open = false;
  }

  toggle() {
    this.open = !this.open;
  }
}

export const paletteState = new PaletteState();
