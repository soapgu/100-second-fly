/**
 * 全部界面文案集中定义（仿原版风格改写，非逐字复制原 Flash）。
 * 想调整"味道"只改这里。
 */
export const COPY = {
  title: '极限飞行',
  /** 拉丁装饰小字（像素街机风点缀） */
  titleEn: '100-SECOND FLY',
  /** CRT 屏幕卡片底部标签 */
  insertCoin: 'INSERT COIN · PRESS START',
  subtitle: '—— 弹幕躲避 · 生存挑战 ——',
  instructions: [
    '控制小飞机移动，躲避袭来的弹幕。',
    '弹幕会越来越多，撑的时间越久越厉害哦！',
  ],
  controls: '操作：方向键 / WASD 移动 · 按住 Shift 减速精走',
  hotkeys: 'P 暂停 · R 重开 · M 静音',
  /** 触屏设备（手机/平板）文案 */
  controlsTouch: '操作：手指按住画面拖动移动 · 第二根手指按住减速精走',
  hotkeysTouch: '点 ⏸ 暂停 · 切后台自动暂停',
  start: '开始挑战',
  again: '再来一次',
  backToMenu: '返回菜单',
  winTitle: '通关！',
  deadTitle: '中弹！',
  survivedLabel: '坚持时间',
  grazeLabel: '擦弹',
  bestLabel: '历史最佳',
  winsLabel: '通关次数',
  paused: '已暂停',
  pausedHint: '按 P 或点击画面继续',
  pausedHintTouch: '点击画面继续',
  statusElapsed: '已坚持',
  statusTarget: '目标 100s',
  statusIntensity: '弹幕强度',
} as const

/** 结算评价语：按坚持秒数分档 */
export function verdictFor(seconds: number): string {
  if (seconds >= 100) return '是男人就坚持100秒——你做到了！'
  if (seconds >= 90) return '惜败！就差一点！'
  if (seconds >= 60) return '真正的猛士！'
  if (seconds >= 30) return '有点男人样了'
  if (seconds >= 10) return '还差得远呢'
  return '这也叫男人？'
}
