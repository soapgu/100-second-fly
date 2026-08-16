/** 圆-圆碰撞（子弹 vs 玩家判定点） */
export function circlesHit(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const r = ar + br
  return dx * dx + dy * dy <= r * r
}

/**
 * 擦弹判定：子弹进入玩家近旁环带、但尚未命中判定点。
 * bandR 指"子弹中心到玩家中心"的外圈距离阈值。
 */
export function grazeCheck(
  bulletX: number,
  bulletY: number,
  bulletR: number,
  playerX: number,
  playerY: number,
  playerHitR: number,
  bandR: number,
): boolean {
  const dx = bulletX - playerX
  const dy = bulletY - playerY
  const dist2 = dx * dx + dy * dy
  if (dist2 > bandR * bandR) return false
  return !circlesHit(bulletX, bulletY, bulletR, playerX, playerY, playerHitR)
}
