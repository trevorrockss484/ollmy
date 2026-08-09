// ECharts 暗色主题 — 与 CSS 变量 dark mode 同步
const DARK = {
  textStyle: { color: '#9090a8' },
  axisLine: { lineStyle: { color: '#24243a' } },
  splitLine: { lineStyle: { color: '#1a1a30', type: 'dashed' } },
  axisLabel: { color: '#606078', fontSize: 10 },
  tooltip: { backgroundColor: '#1c1c2e', borderColor: '#30304a', textStyle: { color: '#e4e4ef' } },
  legend: { textStyle: { color: '#9090a8' } },
  grid: { left: 5, right: 15, top: 10, bottom: 0, containLabel: true },
}

const LIGHT = {
  textStyle: { color: '#475569' },
  axisLine: { lineStyle: { color: '#e2e8f0' } },
  splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
  axisLabel: { color: '#94a3b8', fontSize: 10 },
  tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', textStyle: { color: '#0f172a' } },
  legend: { textStyle: { color: '#475569' } },
  grid: { left: 5, right: 15, top: 10, bottom: 0, containLabel: true },
}

/** 返回当前主题的 ECharts 配置片段 */
export function echartsTheme() {
  return document.documentElement.classList.contains('dark') ? { ...DARK } : { ...LIGHT }
}

/** 返回当前主题的坐标轴配置 */
export function axisTheme() {
  return document.documentElement.classList.contains('dark')
    ? {
        axisLine: { lineStyle: { color: '#24243a' } },
        splitLine: { lineStyle: { color: '#1a1a30', type: 'dashed' } },
        axisLabel: { color: '#606078', fontSize: 10 },
        nameTextStyle: { color: '#606078', fontSize: 10 },
      }
    : {
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
      }
}
