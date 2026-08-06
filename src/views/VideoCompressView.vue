<template>
  <div class="video-compress-page">

    <div class="top-section">
      <!-- 上传卡 -->
      <div
        class="upload-card"
        :class="{ 'drag-in': dragOver, 'compact': selectedFile }"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <template v-if="!selectedFile">
          <div class="up-icon"><el-icon :size="44"><VideoCameraFilled /></el-icon></div>
          <h2 class="up-heading">视频压缩</h2>
          <p class="up-desc">智能压缩视频体积，保持画质清晰</p>
          <input ref="fileInputRef" type="file" accept="video/*" hidden @change="onFileSelect" />
          <el-button type="primary" size="large" round @click="fileInputRef?.click()">
            <el-icon><FolderAdd /></el-icon> 选择视频
          </el-button>
          <p class="up-note">支持拖拽上传 · 单文件 ≤ 1GB · MP4/MOV/AVI/MKV/WebM</p>
        </template>

        <template v-else>
          <div class="up-compact">
            <div class="up-summary">
              <span class="badge" :title="selectedFile.name">{{ selectedFile.name }}</span>
              <span class="size">{{ formatSize(selectedFile.size) }}</span>
            </div>
            <div class="up-actions">
              <input ref="fileInputRef" type="file" accept="video/*" hidden @change="onFileSelect" />
              <el-button size="default" round @click="fileInputRef?.click()">更换</el-button>
              <el-button size="default" round type="danger" plain @click="clearFile">清空</el-button>
            </div>
          </div>
        </template>
      </div>

      <!-- 选中后的视频预览 — 独立于上传卡 -->
      <div v-if="selectedFile && !result" class="preview-video-section">
        <div class="pv-label">视频预览</div>
        <div class="pv-wrap">
          <video :src="originalVideoUrl" controls preload="metadata" class="pv-el"></video>
        </div>
        <div class="pv-meta">{{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</div>
      </div>

      <!-- 设置栏 -->
      <div v-if="selectedFile" class="settings-card">
        <!-- 画质 -->
        <div class="sc-section">
          <div class="sc-header">
            <span class="sc-title"><el-icon :size="16"><Switch /></el-icon> 画质</span>
            <span class="sc-val" :style="{ color: qualityColor }">CRF {{ crf }} · {{ qualityLabel }}</span>
          </div>
          <div class="q-presets">
            <button type="button" v-for="p in qualityPresets" :key="p.value"
              :class="{ on: crf === p.value }" @click="crf = p.value">{{ p.label }}</button>
          </div>
          <div class="q-range">
            <span class="q-end">好</span>
            <el-slider v-model="crf" :min="18" :max="40" :show-tooltip="false" size="small" style="flex:1" />
            <span class="q-end">小</span>
          </div>
          <p class="sc-hint">
            <template v-if="crf <= 20">画质几乎无损，适合需要最高质量的场景</template>
            <template v-else-if="crf <= 25">视觉无损，肉眼无法分辨差异，<b>推荐日常使用</b></template>
            <template v-else-if="crf <= 30">画质良好，文件明显减小</template>
            <template v-else>体积大幅减小，画质有轻微损失</template>
          </p>
        </div>

        <!-- 编码格式 -->
        <div class="sc-section">
          <span class="sc-title">🎬 编码格式</span>
          <div class="codec-cards">
            <label v-for="c in codecs" :key="c.value" class="codec-card" :class="{ sel: codec === c.value }">
              <input type="radio" :value="c.value" v-model="codec" />
              <span class="codec-name">{{ c.name }}</span>
              <span class="codec-speed">{{ c.speed }}</span>
              <span class="codec-desc">{{ c.desc }}</span>
            </label>
          </div>
        </div>

        <!-- 按钮 -->
        <el-button type="primary" size="large" round :loading="compressing" :disabled="compressing" @click="doCompress" class="sc-btn">
          <el-icon v-if="!compressing"><Scissor /></el-icon>
          {{ compressing ? '压缩中...' : '开始压缩' }}
        </el-button>
      </div>
    </div>

    <!-- 内联进度条 -->
    <div v-if="compressing" class="progress-inline">
      <div class="pi-bar-track">
        <div class="pi-bar-fill" :style="{ width: progress.percent + '%' }"></div>
      </div>
      <div class="pi-info">
        <span class="pi-pct">{{ progress.percent }}%</span>
        <span v-if="progress.fps" class="pi-fps">{{ progress.fps }} fps</span>
        <span class="pi-eta">剩余 {{ progress.eta }}</span>
      </div>
    </div>

    <!-- 结果区 -->
    <div v-if="result" class="results-section" ref="resultsRef">
      <div class="result-strip" :class="{ 'no-save': !result.results[0].wasOptimized }">
        <template v-if="result.results[0].wasOptimized">
          <span class="strip-saved">节省 {{ result.totalRatio }}</span>
          <span class="strip-detail">{{ formatSize(result.totalOriginalSize) }} → {{ formatSize(result.totalCompressedSize) }}</span>
        </template>
        <template v-else>
          <span class="strip-saved" style="color:#6b7280;">已是最优</span>
          <span class="strip-detail">小文件无需压缩，已保留原画质</span>
        </template>
        <div class="strip-gap"></div>
        <el-button round @click="saveToVideoLibrary">{{ result.results[0]._saved ? '已保存' : '保存到视频库' }}</el-button>
        <el-button round type="primary" @click="downloadOne(result.results[0])">
          <el-icon><Download /></el-icon> 下载
        </el-button>
      </div>

      <div class="result-card-single">
        <!-- 双视频播放器 -->
        <div class="rc-players">
          <div class="rc-player-box">
            <span class="rc-player-label">压缩前 · {{ formatSize(result.results[0].originalSize) }}</span>
            <video :src="originalVideoUrl" controls preload="metadata" class="rc-video"></video>
          </div>
          <div class="rc-player-box">
            <span class="rc-player-label">
              压缩后 · {{ formatSize(result.results[0].compressedSize) }}
              <i v-if="!result.results[0].wasOptimized">（已是最优，保留原画质）</i>
            </span>
            <video :src="authUrl(result.results[0].downloadUrl)" controls preload="metadata" class="rc-video"></video>
          </div>
        </div>

        <!-- 信息网格 -->
        <div class="rc-info-grid">
          <div class="rc-item">
            <span class="rc-label">文件名</span>
            <span class="rc-value" :title="result.results[0].originalName">{{ result.results[0].originalName }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">时长</span>
            <span class="rc-value">{{ formatDuration(result.results[0].duration) }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">分辨率</span>
            <span class="rc-value">{{ result.results[0].width }} × {{ result.results[0].height }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">编码</span>
            <span class="rc-value">{{ result.results[0].codec.toUpperCase() }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">原始大小</span>
            <span class="rc-value rc-old">{{ formatSize(result.results[0].originalSize) }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">压缩后</span>
            <span class="rc-value rc-new">{{ formatSize(result.results[0].compressedSize) }}</span>
          </div>
          <div class="rc-item">
            <span class="rc-label">压缩比</span>
            <span class="rc-value"><span class="ratio-badge" :class="ratioClass(result.results[0].ratio)">{{ result.results[0].ratio }}</span></span>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:16px;">
        <el-button round @click="reset">重新压缩</el-button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { formatSize, authUrl } from '../api'

const fileInputRef = ref(null)
const resultsRef = ref(null)
const selectedFile = ref(null)
const originalVideoUrl = ref('')
const dragOver = ref(false)
const crf = ref(23)
const codec = ref('h264')
const compressing = ref(false)
const result = ref(null)
const progress = ref({ percent: 0, fps: 0, eta: '准备...' })
let progressTimer = null

const qualityPresets = [
  { value: 18, label: '极致' }, { value: 23, label: '高品质' },
  { value: 28, label: '均衡' }, { value: 33, label: '高压缩' }, { value: 38, label: '极限' },
]
const codecs = [
  { value: 'h264', name: 'H.264', speed: '快', desc: '兼容性最好，所有设备和平台都能播放，压缩速度快' },
  { value: 'hevc', name: 'H.265', speed: '慢', desc: '新一代编码，同画质下体积比H.264小约一半，部分老旧设备不支持' },
]

const qualityLabel = computed(() => {
  const v = crf.value
  if (v <= 20) return '极佳'; if (v <= 25) return '良好'
  if (v <= 30) return '中等'; if (v <= 35) return '较低'; return '最低'
})
// CRF 越高画质越差 — 反比
const qualityColor = computed(() => {
  const v = crf.value
  if (v <= 20) return '#10b981'; if (v <= 25) return '#22c55e'
  if (v <= 30) return '#f59e0b'; if (v <= 35) return '#f97316'; return '#ef4444'
})

function ratioClass(s) { const v = parseFloat(s); return v >= 70 ? 'tag-g' : v >= 30 ? 'tag-y' : 'tag-n' }

function formatDuration(sec) {
  if (!sec) return '--'
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60)
  return m + '分' + s + '秒'
}

function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer.files[0]
  if (f?.type.startsWith('video/')) selectVideo(f)
}
function onFileSelect(e) {
  if (e.target.files[0]) selectVideo(e.target.files[0])
  e.target.value = ''
}
function selectVideo(f) {
  if (f.size > 1024 * 1024 * 1024) { ElMessage.warning('文件不能超过1GB'); return }
  if (originalVideoUrl.value) URL.revokeObjectURL(originalVideoUrl.value)
  selectedFile.value = f
  originalVideoUrl.value = URL.createObjectURL(f)
}
function clearFile() {
  selectedFile.value = null; result.value = null
  if (originalVideoUrl.value) { URL.revokeObjectURL(originalVideoUrl.value); originalVideoUrl.value = '' }
}

async function doCompress() {
  if (!selectedFile.value) return
  compressing.value = true; result.value = null
  progress.value = { percent: 0, fps: 0, eta: '准备...' }

  const pollSid = 'vid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
  const token = localStorage.getItem('pan_token') || ''

  // 轮询进度
  progressTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/tools/video-progress/' + pollSid, { headers: { 'X-Auth-Token': token } })
      const json = await res.json()
      if (json.success && json.data) {
        const p = json.data
        progress.value = { percent: p.percent || 0, fps: p.fps || 0, eta: p.eta || '计算中...' }
        if (p.status === 'done' || p.status === 'error') clearInterval(progressTimer)
      }
    } catch {}
  }, 600)

  try {
    const fd = new FormData()
    fd.append('file', selectedFile.value)
    fd.append('quality', String(crf.value))
    fd.append('codec', codec.value)
    fd.append('audioBitrate', '128k')
    fd.append('sid', pollSid)
    const res = await fetch('/api/tools/compress-video', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const json = await res.json()
    clearInterval(progressTimer)
    if (json.success) {
      progress.value = { percent: 100, fps: 0, eta: '完成' }
      result.value = json.data
      ElMessage.success(`压缩完成！节省 ${json.data.totalRatio}`)
      await nextTick(); resultsRef.value?.scrollIntoView({ behavior: 'smooth' })
    } else ElMessage.error(json.error || '压缩失败')
  } catch (e) { clearInterval(progressTimer); ElMessage.error('压缩失败') }
  finally { compressing.value = false }
}

async function saveToVideoLibrary() {
  if (!result.value?.results?.[0]) return
  const r = result.value.results[0]
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/tools/save-video', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ ...r, purpose: 'normal' })
    })
    const json = await res.json()
    if (json.success) { ElMessage.success('已保存到工厂展厅视频'); r._saved = true }
    else ElMessage.error(json.error || '保存失败')
  } catch { ElMessage.error('保存失败') }
}

function downloadOne(r) {
  const a = document.createElement('a'); a.href = authUrl(r.downloadUrl)
  a.download = r.originalName.replace(/\.[^.]+$/, '') + '_压缩.' + (r.format || 'mp4')
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}
function reset() { clearFile() }
onUnmounted(() => {
  clearInterval(progressTimer)
  if (originalVideoUrl.value) URL.revokeObjectURL(originalVideoUrl.value)
})
</script>

<style scoped>
.video-compress-page { max-width: 1160px; margin: 0 auto; }

.top-section { margin-bottom: 24px; }

.upload-card {
  background: #fff; border: 2px dashed #d1d5db; border-radius: 18px;
  padding: 56px 40px; text-align: center;
  transition: border-color 0.2s, background 0.2s;
}
.upload-card.drag-in { border-color: #6366f1; background: #eef2ff; }
.upload-card.compact { border-style: solid; border-color: #e5e7eb; padding: 20px 24px; text-align: left; }

.up-icon { color: #6366f1; margin-bottom: 16px; }
.drag-in .up-icon { transform: scale(1.12); transition: transform 0.2s; }
.up-heading { font-size: 26px; font-weight: 800; color: #111827; margin: 0 0 8px; }
.up-desc { font-size: 16px; color: #6b7280; margin: 0 0 24px; }
.up-note { font-size: 13px; color: #d1d5db; margin: 16px 0 0; }

.up-compact { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.up-summary { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.badge { font-size: 16px; font-weight: 800; color: #6366f1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 360px; }
.size { font-size: 15px; color: #6b7280; font-weight: 600; white-space: nowrap; }
.up-actions { display: flex; gap: 8px; flex-shrink: 0; }

.up-preview-video { margin-top: 12px; background: #111; border-radius: 10px; overflow: hidden; }
.up-preview-el { width: 100%; max-height: 420px; aspect-ratio: auto; display: block; }
.up-preview-el::cue { font-size: 14px; }

/* 独立视频预览区 */
.preview-video-section {
  margin-top: 18px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.pv-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
.pv-wrap {
  width: 100%; max-width: 720px; margin: 0 auto;
  background: #000; border-radius: 12px; overflow: hidden;
}
.pv-el { width: 100%; aspect-ratio: 16/9; object-fit: contain; display: block; }
.pv-meta { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 8px; }

/* 设置卡片 */
.settings-card {
  margin-top: 18px; padding: 24px 28px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
  display: flex; flex-direction: column; gap: 22px;
}
.sc-section { }
.sc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sc-title { font-size: 15px; font-weight: 700; color: #111827; }
.sc-val { font-size: 13px; font-weight: 700; }
.sc-hint { font-size: 13px; color: #6b7280; line-height: 1.6; margin: 10px 0 0; padding: 10px 14px; background: #f9fafb; border-radius: 10px; }

.q-presets { display: flex; gap: 4px; margin-bottom: 12px; }
.q-presets button { padding: 7px 16px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 13px; font-weight: 700; color: #6b7280; cursor: pointer; }
.q-presets button:hover { border-color: #a5b4fc; color: #6366f1; }
.q-presets button.on { border-color: #6366f1; background: #eef2ff; color: #6366f1; }
.q-range { display: flex; align-items: center; gap: 8px; }
.q-end { font-size: 12px; color: #9ca3af; font-weight: 600; }

/* 编码卡片 */
.codec-cards { display: flex; gap: 10px; margin-top: 8px; }
.codec-card {
  flex: 1; padding: 14px 16px; border-radius: 12px; border: 2px solid #e5e7eb;
  background: #fff; cursor: pointer; transition: all 0.15s;
  display: flex; flex-direction: column; gap: 4px;
}
.codec-card:hover { border-color: #a5b4fc; }
.codec-card.sel { border-color: #6366f1; background: #eef2ff; box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
.codec-card input { display: none; }
.codec-name { font-size: 16px; font-weight: 700; color: #1f2937; }
.codec-speed { font-size: 12px; font-weight: 600; color: #fff; background: #6366f1; padding: 2px 8px; border-radius: 6px; display: inline-block; width: fit-content; }
.codec-desc { font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 2px; }

.sc-btn { width: 100%; padding: 14px !important; font-size: 16px !important; font-weight: 700 !important; }

.action-col { margin-left: auto; }

.results-section { margin-bottom: 28px; }

.result-strip {
  display: flex; align-items: center; gap: 16px;
  background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px;
  padding: 18px 24px; margin-bottom: 16px;
}
.result-strip.no-save { background: #f9fafb; border-color: #e5e7eb; }
.strip-saved { font-size: 24px; font-weight: 800; color: #059669; }
.strip-detail { font-size: 15px; color: #374151; font-weight: 500; }
.strip-gap { flex: 1; }

.result-card-single {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.rc-players { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; margin-bottom: 18px; }
.rc-player-box { background: #f9fafb; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
.rc-player-label { display: block; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #374151; background: #fff; border-bottom: 1px solid #e5e7eb; }
.rc-player-label i { font-weight: 400; color: #9ca3af; font-size: 12px; }
.rc-video { width: 100%; aspect-ratio: 16/9; object-fit: contain; display: block; background: #000; }

.rc-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.rc-item { display: flex; flex-direction: column; gap: 4px; }
.rc-label { font-size: 11px; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: .3px; }
.rc-value { font-size: 14px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-old { color: #9ca3af; text-decoration: line-through; }
.rc-new { color: #10b981; }

.ratio-badge { font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }

.tag-g { color: #059669; background: #d1fae5; }
.tag-y { color: #b45309; background: #fef3c7; }
.tag-n { color: #6b7280; background: #f3f4f6; }

/* 内联进度 */
.progress-inline {
  margin-top: 16px; padding: 14px 20px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.pi-bar-track {
  width: 100%; height: 10px; background: #e5e7eb; border-radius: 6px; overflow: hidden;
}
.pi-bar-fill {
  height: 100%; border-radius: 6px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.3s ease;
  animation: piGlow 2s ease-in-out infinite;
}
@keyframes piGlow {
  0%, 100% { opacity: 1; }
  50% { opacity: .85; }
}
.pi-info {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; font-size: 13px;
}
.pi-pct { font-weight: 700; color: #6366f1; min-width: 40px; }
.pi-fps { color: #9ca3af; }
.pi-eta { color: #6b7280; font-weight: 500; }
</style>
