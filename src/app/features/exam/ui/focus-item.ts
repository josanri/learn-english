/**
 * Moves focus to the control of an item (question fieldset, drop-down or text box) after the view
 * has rendered. When the control sits in the hidden column of a phone layout, the matching tab is
 * opened first.
 */
export function focusItem(itemId: string, switched = false): void {
  const find = () =>
    document.getElementById(`q-${itemId}`) ??
    document.getElementById(`sel-${itemId}`) ??
    document.getElementById(`in-${itemId}`);
  const attempt = (tries: number) => {
    const el = find();
    if (!el) {
      if (tries > 0) setTimeout(() => attempt(tries - 1), 60);
      return;
    }
    const column = el.closest('.col');
    if (column?.classList.contains('off')) {
      if (switched) return;
      const split = column.closest('app-split');
      const radios = split?.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      const target = column === split?.querySelectorAll('.col')[1] ? radios?.[1] : radios?.[0];
      target?.click();
      setTimeout(() => focusItem(itemId, true), 60);
      return;
    }
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
  };
  setTimeout(() => attempt(5), 30);
}
