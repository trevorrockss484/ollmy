// 按需注册 Element Plus 图标 — 只引入全站实际使用的图标（替代全量注册 ~300 个）
// 新增图标时在下方 ICONS 数组补充即可
import {
  Plus, Check, Close, Download, Delete, Edit, Document, DocumentCopy, Search,
  ArrowRight, ArrowLeft, ArrowDown, Top, Bottom,
  Warning, WarningFilled, InfoFilled, CircleCheck,
  View, Hide, Lock, Unlock,
  Picture, PictureFilled, VideoPlay, VideoCamera, VideoCameraFilled, Film, Microphone,
  Monitor, Odometer, DataBoard, DataAnalysis, TrendCharts, Notebook, Calendar, Clock,
  User, UserFilled, OfficeBuilding, Key, Setting, Bell, Money, Link, List, Files,
  Upload, UploadFilled, FolderAdd, FolderOpened, Box, Rank, ChatDotRound,
  Refresh, RefreshLeft, Scissor, Loading, Expand, Fold, Switch, SwitchButton,
  Sunny, Moon
} from '@element-plus/icons-vue'

const ICONS = [
  Plus, Check, Close, Download, Delete, Edit, Document, DocumentCopy, Search,
  ArrowRight, ArrowLeft, ArrowDown, Top, Bottom,
  Warning, WarningFilled, InfoFilled, CircleCheck,
  View, Hide, Lock, Unlock,
  Picture, PictureFilled, VideoPlay, VideoCamera, VideoCameraFilled, Film, Microphone,
  Monitor, Odometer, DataBoard, DataAnalysis, TrendCharts, Notebook, Calendar, Clock,
  User, UserFilled, OfficeBuilding, Key, Setting, Bell, Money, Link, List, Files,
  Upload, UploadFilled, FolderAdd, FolderOpened, Box, Rank, ChatDotRound,
  Refresh, RefreshLeft, Scissor, Loading, Expand, Fold, Switch, SwitchButton,
  Sunny, Moon
]

export function setupIcons(app) {
  for (const icon of ICONS) app.component(icon.name, icon)
}
