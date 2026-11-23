export interface TreemapInput<T> {
  item: T;
  value: number;
}

export interface TreemapRect<T> {
  item: T;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Squarified treemap (Bruls, Huizing, van Wijk). Lays out positive values inside a width x height
 * box so that tile areas are proportional to values and tiles stay close to square.
 */
export function squarify<T>(input: TreemapInput<T>[], width: number, height: number): TreemapRect<T>[] {
  const items = input.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (items.length === 0 || total <= 0 || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  const nodes = items.map((i) => ({ ...i, area: i.value * scale }));

  const out: TreemapRect<T>[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let row: typeof nodes = [];

  const worst = (r: typeof nodes, side: number): number => {
    const s = r.reduce((a, n) => a + n.area, 0);
    const max = Math.max(...r.map((n) => n.area));
    const min = Math.min(...r.map((n) => n.area));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };

  const layoutRow = (r: typeof nodes) => {
    const s = r.reduce((a, n) => a + n.area, 0);
    if (w >= h) {
      // lay the row out as a column on the left
      const colW = s / h;
      let cy = y;
      for (const n of r) {
        const nh = n.area / colW;
        out.push({ item: n.item, value: n.value, x, y: cy, w: colW, h: nh });
        cy += nh;
      }
      x += colW;
      w -= colW;
    } else {
      const rowH = s / w;
      let cx = x;
      for (const n of r) {
        const nw = n.area / rowH;
        out.push({ item: n.item, value: n.value, x: cx, y, w: nw, h: rowH });
        cx += nw;
      }
      y += rowH;
      h -= rowH;
    }
  };

  for (const n of nodes) {
    const side = Math.min(w, h);
    if (row.length === 0 || worst([...row, n], side) <= worst(row, side)) {
      row.push(n);
    } else {
      layoutRow(row);
      row = [n];
    }
  }
  if (row.length) layoutRow(row);
  return out;
}
