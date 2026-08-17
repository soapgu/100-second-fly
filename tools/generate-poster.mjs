/**
 * 程序化像素海报生成器：16-bit 街机封面风
 * 构图：正面飞机（座舱内带表情驾驶员）+ 枪林弹雨弹幕 + 太空堡垒剪影 + 深空背景
 * 纯 Node 实现（zlib + 手写 PNG chunk），零外部依赖。
 * 用法：node tools/generate-poster.mjs [输出路径]（默认 public/og-cartoon.png）
 */
import zlib from 'node:zlib'
import { writeFileSync } from 'node:fs'

/* ================= 画布参数 ================= */
const W = 346 // 逻辑像素宽
const H = 182 // 逻辑像素高
const SCALE = 5 // 最近邻放大倍数 → 1730×910

/* ================= PNG 编码 ================= */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(h * (1 + w * 4))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0 // filter: none
    rgba.copy
      ? rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4)
      : Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (1 + w * 4) + 1)
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/* ================= 像素画布 ================= */
const buf = new Uint8ClampedArray(W * H * 4)

function blend(x, y, r, g, b, a) {
  x |= 0
  y |= 0
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return
  const i = (y * W + x) * 4
  const ia = 1 - a
  buf[i] = buf[i] * ia + r * a
  buf[i + 1] = buf[i + 1] * ia + g * a
  buf[i + 2] = buf[i + 2] * ia + b * a
  buf[i + 3] = 255
}

/** c = [r,g,b] 或 [r,g,b,a]（a: 0~1） */
function px(x, y, c) {
  blend(x, y, c[0], c[1], c[2], c.length > 3 ? c[3] : 1)
}

function rect(x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c)
}

/** w 可为负（自动换算），便于对称绘制 */
function rectDir(x0, y0, w, h, c) {
  const x = w < 0 ? x0 + w : x0
  rect(x, y0, Math.abs(w), h, c)
}

function disc(cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(x, y, c)
    }
}

/** 椭圆填充，rx/ry 半径 */
function ellipse(cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(x, y, c)
    }
}

/** 径向光晕：中心亮，向边缘按 (1-d/r)^2 衰减 */
function glow(cx, cy, r, c, maxA = 0.5) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= r) {
        const a = maxA * (1 - d / r) ** 2
        blend(x, y, c[0], c[1], c[2], a * (c.length > 3 ? c[3] : 1))
      }
    }
}

function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  let x = x0
  let y = y0
  for (;;) {
    px(x, y, c)
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}
function lerpC(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
}

/* 固定 seed 的 LCG，保证每次生成一致 */
let seed = 42
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}

const CX = W >> 1 // 173，画面中轴

/* ================= 1. 深空背景 ================= */
function drawBackground() {
  const top = [8, 6, 28]
  const mid = [16, 12, 44]
  const bot = [24, 9, 26]
  for (let y = 0; y < H; y++) {
    const t = y / H
    const c = t < 0.55 ? lerpC(top, mid, t / 0.55) : lerpC(mid, bot, (t - 0.55) / 0.45)
    rect(0, y, W, 1, c)
  }
  // 远处星云
  glow(60, 60, 46, [64, 32, 96], 0.32)
  glow(300, 48, 40, [32, 48, 110], 0.3)
  glow(200, 130, 52, [80, 24, 64], 0.22)
}

/* ================= 2. 星星 ================= */
function drawStars() {
  for (let i = 0; i < 130; i++) {
    const x = rnd() * W
    const y = rnd() * H * 0.9
    const b = 0.25 + rnd() * 0.6
    px(x, y, [200, 220, 255, b])
    if (rnd() < 0.12) {
      // 十字闪星
      px(x - 1, y, [200, 220, 255, b * 0.5])
      px(x + 1, y, [200, 220, 255, b * 0.5])
      px(x, y - 1, [200, 220, 255, b * 0.5])
      px(x, y + 1, [200, 220, 255, b * 0.5])
    }
  }
}

/* ================= 3. 太空堡垒剪影 ================= */
const HULL = [26, 24, 48]
const HULL_HI = [58, 56, 100]
const HULL_EDGE = [74, 72, 120]
const WIN = [255, 209, 102]
const ALERT = [255, 48, 80]
const HANGAR = [255, 176, 84]

function drawFortress() {
  /* ---- 顶部中央大要塞（仰视压顶） ---- */
  rect(CX - 70, 0, 140, 14, HULL)
  rect(CX - 58, 14, 116, 6, HULL)
  rect(CX - 34, 20, 68, 5, HULL)
  // 下缘轮廓光
  rect(CX - 58, 19, 116, 1, HULL_HI)
  rect(CX - 34, 24, 68, 1, HULL_HI)
  // 顶部结构线
  rect(CX - 70, 5, 140, 1, HULL_HI)
  // 机库开口（发光门缝）
  rect(CX - 18, 21, 36, 2, HANGAR)
  glow(CX, 22, 10, HANGAR, 0.35)
  // 炮塔（向下凸起）
  for (const tx of [CX - 48, CX - 12, CX + 24]) {
    rect(tx, 20, 10, 5, HULL)
    rect(tx + 3, 25, 4, 4, HULL)
    px(tx + 4, 29, HULL_EDGE)
    px(tx + 5, 29, HULL_EDGE)
  }
  // 舷窗灯 + 警示灯
  for (let i = 0; i < 9; i++) px(CX - 52 + i * 13, 10, WIN)
  for (let i = 0; i < 5; i++) px(CX - 30 + i * 15, 3, [WIN[0], WIN[1], WIN[2], 0.8])
  px(CX - 20, 6, ALERT)
  px(CX + 20, 6, ALERT)
  glow(CX - 20, 6, 4, ALERT, 0.35)
  glow(CX + 20, 6, 4, ALERT, 0.35)

  /* ---- 左右两艘战舰剪影，炮口斜指中央 ---- */
  for (const s of [0, 1]) {
    const dir = s === 0 ? 1 : -1
    const mx = (x) => (s === 0 ? x : W - 1 - x)
    // 舰体：阶梯收窄 + 尖锐舰艏
    rect(mx(34), 30, 36, 9, HULL)
    rect(mx(22), 39, 38, 7, HULL)
    rectDir(mx(14), 46, dir * 22, 5, HULL)
    rectDir(mx(4), 50, dir * 12, 3, HULL)
    px(mx(2), 51, HULL_EDGE)
    px(mx(3), 52, HULL_HI)
    // 上缘轮廓光
    rect(mx(34), 30, 36, 1, HULL_HI)
    rect(mx(22), 39, 38, 1, HULL_HI)
    // 舰桥塔 + 舷窗
    rect(mx(46), 24, 8, 6, HULL)
    rect(mx(46), 24, 8, 1, HULL_HI)
    px(mx(48), 27, WIN)
    px(mx(51), 27, WIN)
    // 桅杆/天线
    rect(mx(56), 20, 2, 10, HULL)
    px(mx(56), 19, ALERT)
    glow(mx(56), 19, 3, ALERT, 0.3)
    // 主炮（双线加粗，斜指画面中心）
    line(mx(16), 49, mx(40) - dir * 10, 76, HULL_EDGE)
    line(mx(16), 50, mx(40) - dir * 10, 77, HULL)
    // 舷窗
    for (let i = 0; i < 4; i++) px(mx(30 + i * 8), 35, [255, 209, 102, 0.9])
    // 引擎光（舰尾）
    glow(mx(62), 42, 5, [80, 140, 255], 0.5)
    px(mx(61), 42, [160, 210, 255])
  }
}

/* ================= 4. 枪林弹雨 ================= */
const BULLET_M = [255, 45, 120]
const BULLET_R = [255, 70, 70]
const LASER_G = [80, 255, 140]

function bullet(x, y, c) {
  glow(x, y, 4, c, 0.4)
  px(x, y, [255, 255, 255])
  px(x - 1, y, c)
  px(x + 1, y, c)
  px(x, y - 1, c)
  px(x, y + 1, c)
}

function drawBarrage() {
  /* 左右两条弧形弹链，朝中央飞机收拢（飞机周围留出躲避空域） */
  for (const s of [0, 1]) {
    const dir = s === 0 ? 1 : -1
    const x0 = s === 0 ? 8 : W - 8
    for (let i = 0; i < 16; i++) {
      const t = i / 15
      const x = x0 + dir * t * 118
      const y = 58 + Math.sin(t * 2.2 + (s ? 0.9 : 0)) * 16 + t * 44
      if (Math.hypot(x - CX, y - 100) < 52) continue // 飞机周围留空
      bullet(x, y, BULLET_M)
    }
  }
  /* 顶部要塞旋出的螺旋弹幕 */
  for (let i = 0; i < 18; i++) {
    const t = i / 17
    const x = CX + Math.cos(t * 5.2) * (24 + t * 70)
    const y = 32 + t * 64
    if (Math.hypot(x - CX, y - 100) < 52) continue
    bullet(x, y, BULLET_R)
  }
  /* 绿色激光束：从两侧战舰射向飞机附近（不命中），主线 2px + 光晕 */
  for (const [x0, y0, x1, y1] of [
    [16, 48, CX - 48, 120],
    [W - 16, 48, CX + 46, 114],
  ]) {
    const n = 30
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = lerp(x0, x1, t)
      const y = lerp(y0, y1, t)
      blend(x, y, LASER_G[0], LASER_G[1], LASER_G[2], 0.9)
      blend(x, y + 1, LASER_G[0], LASER_G[1], LASER_G[2], 0.7)
      blend(x, y - 1, LASER_G[0], LASER_G[1], LASER_G[2], 0.25)
      blend(x, y + 2, LASER_G[0], LASER_G[1], LASER_G[2], 0.25)
    }
    glow(x0, y0, 6, LASER_G, 0.55)
    glow(x1, y1, 4, LASER_G, 0.3)
  }
  /* 散弹 */
  for (let i = 0; i < 20; i++) {
    const x = rnd() * W
    const y = 30 + rnd() * 110
    if (Math.hypot(x - CX, y - 100) < 48) continue
    bullet(x, y, rnd() < 0.5 ? BULLET_M : BULLET_R)
  }
}

/* ================= 5. 主体飞机（正面） ================= */
const BODY = [200, 208, 224]
const BODY_HI = [240, 246, 255]
const BODY_SH = [96, 108, 138]
const RED = [208, 48, 72]
const GLASS = [70, 160, 220]
const GLASS_HI = [170, 230, 255]

function drawShip() {
  const noseY = 118 // 机头最下端
  const tailY = 64 // 机尾上端

  /* ---- 主翼（后掠梯形，先画翼，机身压其上） ---- */
  for (const s of [0, 1]) {
    const dir = s === 0 ? -1 : 1
    const mx = (dx) => CX + dir * dx
    for (let dx = 10; dx <= 78; dx++) {
      const t = (dx - 10) / 68
      const yC = lerp(96, 80, t) // 翼中心线向后上方掠
      const thick = lerp(14, 3, t)
      const y0 = Math.round(yC - thick / 2)
      const y1 = Math.round(yC + thick / 2)
      for (let y = y0; y <= y1; y++) {
        let c = BODY
        if (y === y0) c = [214, 222, 238] // 前缘受光
        else if (y === y1) c = BODY_SH // 下表面阴影
        px(mx(dx), y, c)
      }
      // 红色翼条纹
      if (dx >= 34 && dx <= 48) {
        px(mx(dx), y0 + 2, RED)
        px(mx(dx), y0 + 3, RED)
      }
    }
    // 翼尖导弹 + 航行灯
    const tipY = Math.round(lerp(96, 80, 1))
    rectDir(mx(76), tipY - 1, dir * 5, 3, BODY_SH)
    px(mx(81), tipY, BODY_HI)
    px(mx(79), tipY - 2, s === 0 ? [255, 60, 60] : [80, 255, 120])
    glow(mx(79), tipY - 2, 3, s === 0 ? [255, 60, 60] : [80, 255, 120], 0.5)
  }

  /* ---- 机身（正面视角：座舱段最宽，向机头/机尾收窄） ---- */
  const halfAt = (y) => {
    if (y <= 70) return 5
    if (y <= 86) return lerp(5, 14, (y - 70) / 16)
    if (y <= 106) return 14
    if (y <= 112) return lerp(14, 7, (y - 106) / 6)
    return lerp(7, 3, Math.min(1, (y - 112) / 6))
  }
  for (let y = tailY; y <= noseY; y++) {
    const half = Math.round(halfAt(y))
    for (let dx = -half; dx <= half; dx++) {
      let c = BODY
      if (dx === -half) c = [214, 222, 238] // 左缘受光
      else if (dx === half) c = BODY_SH // 右缘阴影
      px(CX + dx, y, c)
    }
  }
  // 机头红尖
  px(CX, noseY - 1, RED)
  px(CX, noseY - 2, RED)

  /* ---- 座舱：内衬 → 飞行员 → 玻璃半透明覆盖 → 框 ---- */
  ellipse(CX, 92, 12, 10, [22, 30, 52])
  drawPilot(CX, 93)
  ellipse(CX, 92, 13, 10.5, [70, 160, 220, 0.32]) // 玻璃罩半透明
  // 玻璃反光弧
  for (let dx = -9; dx <= -4; dx++) px(CX + dx, 86, [GLASS_HI[0], GLASS_HI[1], GLASS_HI[2], 0.75])
  px(CX - 10, 87, [GLASS_HI[0], GLASS_HI[1], GLASS_HI[2], 0.45])
  px(CX - 9, 88, [GLASS_HI[0], GLASS_HI[1], GLASS_HI[2], 0.3])
  // 座舱框（外亮内暗两圈）
  for (let dx = -13; dx <= 13; dx++) {
    const dy = Math.round(10.5 * Math.sqrt(Math.max(0, 1 - (dx / 13) ** 2)))
    px(CX + dx, 92 - dy, BODY_SH)
    px(CX + dx, 92 + dy, BODY_SH)
    if (dy > 0) {
      px(CX + dx, 92 - dy + 1, [40, 48, 72])
      px(CX + dx, 92 + dy - 1, [40, 48, 72])
    }
  }

  /* ---- 引擎喷口（贴机身后段两侧，尾焰向后上方） ---- */
  for (const s of [0, 1]) {
    const ex = CX + (s === 0 ? -9 : 9)
    ellipse(ex, 68, 4, 3, [30, 34, 54])
    glow(ex, 61, 6, [90, 160, 255], 0.55)
    px(ex, 63, [190, 230, 255])
    px(ex, 61, [140, 200, 255, 0.8])
  }

  /* ---- 垂尾（机尾上方的小翼） ---- */
  for (let y = 50; y <= 66; y++) {
    const half = Math.round(lerp(3, 6, (y - 50) / 16))
    rect(CX - half, y, half * 2, 1, y === 50 ? BODY_HI : BODY)
  }
  px(CX, 50, RED)
  glow(CX, 50, 3, RED, 0.5)

  /* ---- 机身下洗光（被弹幕照亮的氛围光） ---- */
  glow(CX, 102, 34, [255, 45, 120], 0.1)
}

/* ---- 飞行员（露脸，表情：压眉 + 瞪眼 + 咬牙） ---- */
function drawPilot(hx, hy) {
  const SKIN = [240, 200, 160]
  const SKIN_SH = [200, 152, 112]
  const HAIR = [88, 58, 34]
  const DARK = [42, 28, 20]
  const SUIT = [44, 58, 92]
  const WHITE = [255, 255, 255]

  // 脸轮廓
  ellipse(hx, hy, 7, 7, SKIN)
  // 头顶短发 + 两侧头发
  ellipse(hx, hy - 5, 7, 3, HAIR)
  rect(hx - 7, hy - 4, 2, 5, HAIR)
  rect(hx + 6, hy - 4, 2, 5, HAIR)
  // 通讯耳机
  rect(hx - 8, hy - 1, 2, 4, [70, 76, 96])
  rect(hx + 7, hy - 1, 2, 4, [70, 76, 96])
  px(hx - 8, hy - 1, [110, 118, 140])
  px(hx + 7, hy - 1, [110, 118, 140])

  // 眉毛：内端下压（狠劲）
  px(hx - 5, hy - 3, DARK)
  px(hx - 4, hy - 3, DARK)
  px(hx - 3, hy - 2, DARK)
  px(hx + 3, hy - 2, DARK)
  px(hx + 4, hy - 3, DARK)
  px(hx + 5, hy - 3, DARK)

  // 瞪大的眼睛：3 宽眼白 + 中央瞳孔 + 高光点
  for (const s of [-1, 1]) {
    const ex = hx + s * 3
    px(ex - 1, hy - 1, WHITE)
    px(ex, hy - 1, WHITE)
    px(ex + s, hy - 1, WHITE)
    px(ex - 1, hy, WHITE)
    px(ex, hy, [20, 26, 40]) // 瞳孔
    px(ex + s, hy, WHITE)
    px(ex - 1, hy - 1, [190, 225, 255]) // 高光
  }
  // 鼻梁 + 脸颊阴影
  px(hx, hy + 1, SKIN_SH)
  px(hx, hy + 2, SKIN_SH)
  px(hx - 6, hy + 1, [SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.6])
  px(hx + 6, hy + 1, [SKIN_SH[0], SKIN_SH[1], SKIN_SH[2], 0.6])

  // 咬牙：齿线 + 下唇阴影
  rect(hx - 4, hy + 3, 9, 1, [232, 220, 205])
  rect(hx - 3, hy + 4, 7, 1, [120, 60, 50])
  // 下巴 + 飞行服领口
  rect(hx - 2, hy + 5, 5, 1, SKIN_SH)
  rect(hx - 5, hy + 6, 11, 2, SUIT)
  px(hx - 5, hy + 6, [90, 110, 150])
  px(hx + 5, hy + 6, [90, 110, 150])
}

/* ================= 6. 前景 ================= */
function drawForeground() {
  /* 近景大子弹带速度线（左右各一） */
  for (const [bx, by, dir] of [
    [58, 142, 1],
    [W - 62, 136, -1],
  ]) {
    for (let i = 1; i <= 8; i++) blend(bx - dir * i * 2, by - i, 255, 120, 160, 0.5 * (1 - i / 9))
    glow(bx, by, 7, BULLET_M, 0.55)
    disc(bx, by, 3, BULLET_M)
    px(bx, by, [255, 255, 255])
    px(bx - 1, by, [255, 190, 215])
  }
  /* 爆炸火花（右上） */
  const ex = 292
  const ey = 108
  glow(ex, ey, 12, [255, 160, 60], 0.5)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = 3 + (i % 3) * 2
    line(ex, ey, Math.round(ex + Math.cos(a) * r), Math.round(ey + Math.sin(a) * r), [
      255,
      200 - (i % 3) * 40,
      80,
    ])
  }
  px(ex, ey, [255, 255, 230])
  /* 四角暗角 */
  const maxD = Math.hypot(W / 2, H / 2)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - W / 2, y - H / 2) / maxD
      if (d > 0.62) blend(x, y, 4, 3, 10, ((d - 0.62) / 0.38) * 0.5)
    }
}

/* ================= 7. 英文像素小字 ================= */
const FONT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

function drawText(text, y, c) {
  const totalW = text.length * 6 - 1
  let x = Math.round((W - totalW) / 2)
  for (const ch of text) {
    const glyph = FONT[ch] || FONT[' ']
    for (let gy = 0; gy < 7; gy++)
      for (let gx = 0; gx < 5; gx++) if (glyph[gy][gx] === '1') px(x + gx, y + gy, c)
    x += 6
  }
}

/* ================= 主流程 ================= */
function main() {
  drawBackground()
  drawStars()
  drawFortress()
  drawBarrage()
  drawShip()
  drawForeground()
  drawText('100-SECOND FLY', H - 11, [0, 240, 255])
  glow(CX, H - 8, 50, [0, 240, 255], 0.08)

  // 最近邻放大
  const outW = W * SCALE
  const outH = H * SCALE
  const out = new Uint8ClampedArray(outW * outH * 4)
  for (let y = 0; y < outH; y++) {
    const sy = (y / SCALE) | 0
    for (let x = 0; x < outW; x++) {
      const sx = (x / SCALE) | 0
      const si = (sy * W + sx) * 4
      const di = (y * outW + x) * 4
      out[di] = buf[si]
      out[di + 1] = buf[si + 1]
      out[di + 2] = buf[si + 2]
      out[di + 3] = 255
    }
  }

  const outPath = process.argv[2] || 'public/og-cartoon.png'
  writeFileSync(outPath, encodePNG(outW, outH, out))
  console.log(`OK ${outPath} (${outW}x${outH})`)
}

main()
