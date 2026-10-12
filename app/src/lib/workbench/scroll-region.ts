// WebKit does not consistently scroll focused noninteractive regions on arrow keys.
// Handle only unmodified keys on the region itself, preserving child controls and
// allowing normal ancestor scrolling when this region is already at its boundary.
export function scrollRegion(event: KeyboardEvent) {
  if (
    event.target !== event.currentTarget ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const element = event.currentTarget as HTMLElement;
  const maxX = Math.max(0, element.scrollWidth - element.clientWidth);
  const maxY = Math.max(0, element.scrollHeight - element.clientHeight);
  let x = element.scrollLeft,
    y = element.scrollTop;
  switch (event.key) {
    case "ArrowLeft":
      x -= 40;
      break;
    case "ArrowRight":
      x += 40;
      break;
    case "ArrowUp":
      y -= 40;
      break;
    case "ArrowDown":
      y += 40;
      break;
    case "PageUp":
      y -= element.clientHeight;
      break;
    case "PageDown":
      y += element.clientHeight;
      break;
    case "Home":
      if (maxY > 0) y = 0;
      else x = 0;
      break;
    case "End":
      if (maxY > 0) y = maxY;
      else x = maxX;
      break;
    default:
      return;
  }
  x = Math.max(0, Math.min(maxX, x));
  y = Math.max(0, Math.min(maxY, y));
  if (x === element.scrollLeft && y === element.scrollTop) return;
  event.preventDefault();
  element.scrollLeft = x;
  element.scrollTop = y;
}
