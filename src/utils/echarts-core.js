// ECharts 按需注册 — 全站统一入口（替代 import * as echarts from 'echarts' 全量引入）
// 新图表类型/组件时在此补充注册
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart, BarChart, PieChart,
  TooltipComponent, LegendComponent, GridComponent,
  CanvasRenderer,
])

export default echarts
export { echarts }
