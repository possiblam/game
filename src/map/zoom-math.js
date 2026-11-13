export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 3.5;

export function clampZoom(scale, min = MIN_MAP_ZOOM, max = MAX_MAP_ZOOM) {
  if (!Number.isFinite(scale)) return min;
  return Math.min(max, Math.max(min, scale));
}

export function clampPan({ tx, ty, scale, boardW, boardH, viewW, viewH }) {
  const safeScale = clampZoom(scale);
  const maxTx = Math.max(0, (boardW * safeScale - viewW) / 2);
  const maxTy = Math.max(0, (boardH * safeScale - viewH) / 2);

  return {
    tx: Math.min(maxTx, Math.max(-maxTx, Number.isFinite(tx) ? tx : 0)) || 0,
    ty: Math.min(maxTy, Math.max(-maxTy, Number.isFinite(ty) ? ty : 0)) || 0,
  };
}

export function computeZoomAroundPoint({
  tx,
  ty,
  oldScale,
  newScale,
  pointX,
  pointY,
  viewCenterX,
  viewCenterY,
  boardW,
  boardH,
  viewW,
  viewH,
}) {
  const safeOld = clampZoom(oldScale);
  const safeNew = clampZoom(newScale);

  const px = pointX - viewCenterX;
  const py = pointY - viewCenterY;

  const localX = (px - tx) / safeOld;
  const localY = (py - ty) / safeOld;

  const rawTx = px - localX * safeNew;
  const rawTy = py - localY * safeNew;

  const clamped = clampPan({
    tx: rawTx,
    ty: rawTy,
    scale: safeNew,
    boardW,
    boardH,
    viewW,
    viewH,
  });

  return {
    scale: safeNew,
    tx: clamped.tx,
    ty: clamped.ty,
  };
}

export function computePercentFocusTransform({
  pctX,
  pctY,
  targetScale,
  boardW,
  boardH,
  viewW,
  viewH,
}) {
  const safeScale = clampZoom(targetScale);
  const localX = (pctX / 100 - 0.5) * boardW;
  const localY = (pctY / 100 - 0.5) * boardH;

  const clamped = clampPan({
    tx: -localX * safeScale,
    ty: -localY * safeScale,
    scale: safeScale,
    boardW,
    boardH,
    viewW,
    viewH,
  });

  return {
    scale: safeScale,
    tx: clamped.tx,
    ty: clamped.ty,
  };
}
