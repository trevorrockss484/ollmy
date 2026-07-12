<template>
  <div class="assets-page">
    <!-- 页头 + Tab -->
    <div class="page-header">
      <div class="page-header-top">
        <div>
          <h2><el-icon :size="24"><PictureFilled /></el-icon> AI资产管理</h2>
          <p class="sub">{{ tab === 'assets' ? '上传 · 预览 · 下载 · 批量管理AI资产' : tab === 'library' ? '文档管理 · 上传下载 · 分类查阅' : '按流程步骤查看 · 一键复制 · 在线编辑 · 步骤可自定义' }}</p>
        </div>
      </div>
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: tab === 'assets' }" @click="tab = 'assets'">
          <span class="tab-icon">🎨</span> AI资产
          <span class="tab-n">{{ assets.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'library' }" @click="tab = 'library'">
          <span class="tab-icon">📁</span> 资料库
          <span class="tab-n">{{ libItems.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'prompts' }" @click="tab = 'prompts'">
          <span class="tab-icon">📝</span> AI提示词
          <span class="tab-n">{{ prompts.length }}</span>
        </button>
      </div>
    </div>

    <!-- ==================== AI资产 Tab ==================== -->
    <template v-if="tab === 'assets'">
      <!-- 工具栏 -->
      <div class="assets-toolbar">
        <div class="toolbar-left">
          <el-button type="primary" class="tb-btn-primary" @click="openUpload">
            <el-icon :size="16"><Plus /></el-icon> 上传资产
          </el-button>
          <span class="tb-count">{{ assets.length }} 项</span>
        </div>
        <div class="toolbar-center">
          <div class="assets-pills">
            <button v-for="t in typeTabs" :key="t.key" class="assets-pill" :class="{ active: activeType === t.key }" @click="activeType = t.key">
              <span class="pill-dot" :style="{ background: t.color || '#6366f1' }"></span>
              {{ t.label }}
              <span class="pill-n">{{ countByType(t.key) }}</span>
            </button>
          </div>
        </div>
        <div class="toolbar-right">
          <div class="assets-search-box">
            <el-icon :size="15" class="search-icon"><Search /></el-icon>
            <input v-model="searchText" class="search-input" placeholder="搜索名称、标签..." />
            <span v-if="searchText" class="search-clear" @click="searchText = ''"><el-icon :size="13"><Close /></el-icon></span>
          </div>
        </div>
      </div>

      <!-- 批量操作栏 -->
      <transition name="slide-down">
        <div v-if="selectedIds.size > 0" class="batch-bar">
          <span class="batch-info">已选 <strong>{{ selectedIds.size }}</strong> 项</span>
          <el-button type="primary" round size="default" @click="batchDownload">
            <el-icon :size="15"><Download /></el-icon> 一键下载 ({{ selectedIds.size }})
          </el-button>
          <el-button type="danger" round size="default" plain @click="batchDelete">
            <el-icon :size="15"><Delete /></el-icon> 一键删除 ({{ selectedIds.size }})
          </el-button>
          <el-button round size="default" @click="selectAll">全选</el-button>
          <el-button round size="default" @click="selectedIds.clear()">取消选择</el-button>
        </div>
      </transition>

      <!-- 空状态 -->
      <div v-if="!filteredList.length" class="empty-state">
        <div class="empty-icon"><el-icon :size="56"><PictureFilled /></el-icon></div>
        <p class="empty-text">{{ assets.length ? '无匹配结果' : '暂无资产，点击"上传资产"开始' }}</p>
      </div>

      <!-- 资产卡片网格 -->
      <div v-else class="asset-grid">
        <div v-for="a in filteredList" :key="a.id"
          :class="['asset-card', { selected: selectedIds.has(a.id) }]"
          @click.ctrl="toggleSelect(a.id)"
          @click.meta="toggleSelect(a.id)">
          <!-- 选择框 -->
          <div class="card-check" @click.stop="toggleSelect(a.id)">
            <div class="check-box" :class="{ checked: selectedIds.has(a.id) }">
              <el-icon v-if="selectedIds.has(a.id)" :size="12"><Check /></el-icon>
            </div>
          </div>
          <!-- 媒体区 -->
          <div class="card-img-wrap" @click="preview(a)">
            <!-- 视频 -->
            <template v-if="isVideo(a)">
              <video :src="assetUrl(a)" class="card-img" preload="metadata" />
              <div class="card-play-overlay"><el-icon :size="32"><VideoPlay /></el-icon></div>
            </template>
            <!-- 音频 -->
            <template v-else-if="isAudio(a)">
              <div class="card-audio-placeholder" :style="{ background: typeColor(a.type) }">
                <el-icon :size="36"><Microphone /></el-icon>
                <span class="card-audio-label">配音</span>
              </div>
            </template>
            <!-- 图片 -->
            <img v-else :src="assetUrl(a)" :alt="a.name" class="card-img" loading="lazy" referrerpolicy="no-referrer" />
            <div class="card-type-badge" :style="{ background: typeColor(a.type) }">
              {{ typeLabelShort(a.type) }}
            </div>
          </div>
          <!-- 信息区 -->
          <div class="card-info">
            <div class="card-name" :title="a.name">{{ a.name }}</div>
            <div class="card-tags-row">
              <span v-if="a.tags && a.tags.length" class="card-tags">
                <span v-for="t in a.tags.slice(0, 3)" :key="t" class="card-tag">{{ t }}</span>
              </span>
              <span class="card-size">{{ formatSize(a.fileSize) }}</span>
            </div>
          </div>
          <!-- 操作 -->
          <div class="card-footer">
            <button class="card-btn" title="查看" @click="preview(a)"><el-icon :size="16"><View /></el-icon></button>
            <a :href="authUrl(api.assets.downloadUrl(a.id))" class="card-btn card-btn-dl" title="下载" @click.stop>
              <el-icon :size="16"><Download /></el-icon>
            </a>
            <button class="card-btn" title="编辑" @click="openEdit(a)"><el-icon :size="16"><Edit /></el-icon></button>
            <button class="card-btn card-btn-del" title="删除" @click.stop="doDelete(a)"><el-icon :size="16"><Delete /></el-icon></button>
          </div>
        </div>
      </div>

      <!-- 资产 Lightbox -->
      <teleport to="body">
        <transition name="lightbox">
          <div v-if="previewAsset" class="lightbox-overlay" @click="closePreview">
            <div class="lightbox-toolbar" @click.stop>
              <span class="lb-name">{{ previewAsset.name }}</span>
              <span class="lb-meta">{{ typeLabel(previewAsset.type) }} · {{ formatSize(previewAsset.fileSize) }}</span>
              <div style="flex:1;" />
              <a :href="authUrl(api.assets.downloadUrl(previewAsset.id))">
                <el-button size="small" type="primary"><el-icon :size="14"><Download /></el-icon> 下载{{ isVideo(previewAsset) ? '视频' : isAudio(previewAsset) ? '音频' : '原图' }}</el-button>
              </a>
              <el-button circle size="small" @click="closePreview"><el-icon :size="15"><Close /></el-icon></el-button>
            </div>
            <div class="lightbox-img-wrap" @click.stop>
              <template v-if="isVideo(previewAsset)">
                <video :src="assetUrl(previewAsset)" class="lightbox-video" controls autoplay />
              </template>
              <template v-else-if="isAudio(previewAsset)">
                <div class="lightbox-audio-wrap">
                  <div class="lightbox-audio-icon" :style="{ color: typeColor(previewAsset.type) }">
                    <el-icon :size="64"><Microphone /></el-icon>
                  </div>
                  <p class="lightbox-audio-name">{{ previewAsset.name }}</p>
                  <audio :src="assetUrl(previewAsset)" class="lightbox-audio" controls autoplay />
                </div>
              </template>
              <img v-else :src="assetUrl(previewAsset)" :alt="previewAsset.name" class="lightbox-img" referrerpolicy="no-referrer" />
            </div>
          </div>
        </transition>
      </teleport>

      <!-- 上传弹窗 -->
      <el-dialog v-model="uploadOpen" title="上传资产" width="620px" destroy-on-close>
        <div class="drop-zone" :class="{ dragover: dragOver }"
          @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop">
          <div class="drop-icon"><el-icon :size="40"><Upload /></el-icon></div>
          <p class="drop-text">拖拽文件到此处</p>
          <el-button size="small" @click.stop="triggerFileInput">或点击选择文件</el-button>
          <p class="drop-hint">支持图片 / 视频 / 音频，单个文件最大 200MB</p>
        </div>
        <input ref="fileInput" type="file" multiple accept="image/*,video/*,audio/*" style="display:none" @change="onFileSelect" />
        <div v-if="uploadFiles.length" class="file-list">
          <div v-for="(item, i) in uploadPreviews" :key="i" class="file-item">
            <template v-if="item.file.type.startsWith('video/')">
              <video :src="item.url" class="file-thumb" preload="metadata" />
            </template>
            <template v-else-if="item.file.type.startsWith('audio/')">
              <span class="file-icon">🎙️</span>
            </template>
            <img v-else :src="item.url" class="file-thumb" />
            <div class="file-info">
              <span class="file-name">{{ item.file.name }}</span>
              <span class="file-size">{{ formatSize(item.file.size) }}</span>
            </div>
            <el-button size="small" circle text @click="removeFile(i)"><el-icon :size="14"><Close /></el-icon></el-button>
          </div>
        </div>
        <el-form label-width="80px" size="default" style="margin-top:16px;">
          <el-form-item label="资产名称">
            <el-input v-model="uploadForm.name" placeholder="例如：陈凡人物图" size="large" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="uploadForm.type" size="large" style="width:100%;">
              <el-option v-for="t in assetTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="uploadForm.tagsStr" placeholder="逗号分隔，如: 男主, 欧美" size="large" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="uploadOpen = false">取消</el-button>
          <el-button type="primary" @click="doUpload" :disabled="!uploadFiles.length" :loading="uploading">
            <el-icon :size="14"><Upload /></el-icon> 上传 ({{ uploadFiles.length }})
          </el-button>
        </template>
      </el-dialog>

      <!-- 编辑弹窗 -->
      <el-dialog v-model="editOpen" title="编辑资产" width="520px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="名称"><el-input v-model="editForm.name" size="large" /></el-form-item>
          <el-form-item label="类型">
            <el-select v-model="editForm.type" size="large" style="width:100%;">
              <el-option v-for="t in assetTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签"><el-input v-model="editForm.tagsStr" placeholder="逗号分隔" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editOpen = false">取消</el-button>
          <el-button type="primary" @click="doUpdate"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </template>

    <!-- ==================== 资料库 Tab ==================== -->
    <template v-if="tab === 'library'">
      <div class="library-toolbar">
        <div class="toolbar-left">
          <el-button type="primary" class="tb-btn-primary" @click="libUploadOpen = true">
            <el-icon :size="16"><Plus /></el-icon> 上传文件
          </el-button>
          <span class="tb-count">{{ libItems.length }} 项</span>
        </div>
        <div class="toolbar-right">
          <div class="assets-search-box">
            <el-icon :size="15" class="search-icon"><Search /></el-icon>
            <input v-model="libSearch" class="search-input" placeholder="搜索文件名或标签..." />
            <span v-if="libSearch" class="search-clear" @click="libSearch = ''"><el-icon :size="13"><Close /></el-icon></span>
          </div>
        </div>
      </div>

      <div v-if="!filteredLib.length" class="empty-state">
        <div class="empty-icon"><el-icon :size="56"><Folder /></el-icon></div>
        <p class="empty-text">{{ libItems.length ? '无匹配结果' : '暂无资料，点击"上传文件"开始' }}</p>
      </div>

      <!-- 资料库卡片网格 -->
      <div v-else class="lib-grid">
        <div v-for="d in filteredLib" :key="d.id"
          :class="['lib-card', { 'lib-card-done': d.status === 'done' }]"
          @dblclick="libOpenReader(d)">
          <!-- 已完成标记 -->
          <div v-if="d.status === 'done'" class="lib-done-badge" title="已完成">✅</div>
          <!-- 文件图标区 -->
          <div class="lib-card-icon" :style="{ background: libIconBg(d.fileName), color: libIconColor(d.fileName) }">
            <span class="lib-card-ext">{{ libExt(d.fileName) }}</span>
          </div>
          <!-- 信息 -->
          <div class="lib-card-info">
            <div class="lib-card-name" :title="d.name">{{ d.name }}</div>
            <!-- 阅读进度条 -->
            <div v-if="d.status !== 'done' && libGetProgress(d.id) > 0" class="lib-progress-bar">
              <div class="lib-progress-fill" :style="{ width: libGetProgress(d.id) + '%' }"></div>
            </div>
            <div class="lib-card-meta">
              <span>{{ formatSize(d.fileSize) }}</span>
              <span v-if="libGetProgress(d.id) > 0 && d.status !== 'done'" class="lib-progress-text">{{ libGetProgress(d.id) }}%</span>
              <span v-if="d.tags && d.tags.length" class="lib-card-tags">
                <span v-for="t in d.tags.slice(0, 2)" :key="t" class="lib-card-tag">{{ t }}</span>
              </span>
            </div>
          </div>
          <!-- 操作 -->
          <div class="lib-card-actions">
            <el-button size="small" type="primary" round @click="libOpenReader(d)">
              <el-icon :size="14"><View /></el-icon>
              {{ libGetProgress(d.id) > 0 && d.status !== 'done' ? '继续' : '查看' }}
            </el-button>
            <a :href="authUrl(api.library.downloadUrl(d.id))" class="lib-dl-link">
              <el-button size="small" round><el-icon :size="14"><Download /></el-icon> 下载</el-button>
            </a>
            <el-button size="small" round @click="libOpenEdit(d)"><el-icon :size="14"><Edit /></el-icon></el-button>
            <el-button size="small" round type="danger" plain @click.stop="libDoDelete(d)"><el-icon :size="14"><Delete /></el-icon></el-button>
          </div>
        </div>
      </div>

      <!-- 资料库上传弹窗 -->
      <el-dialog v-model="libUploadOpen" title="上传文件" width="560px" destroy-on-close>
        <div class="drop-zone" :class="{ dragover: libDragOver }"
          @dragover.prevent="libDragOver = true" @dragleave="libDragOver = false" @drop.prevent="libOnDrop">
          <div class="drop-icon"><el-icon :size="40"><Upload /></el-icon></div>
          <p class="drop-text">拖拽文件到此处</p>
          <el-button size="small" @click.stop="libFileInput?.click()">或点击选择文件</el-button>
          <p class="drop-hint">支持 doc / docx / pdf / txt / xlsx / pptx / zip，最大100MB</p>
        </div>
        <input ref="libFileInput" type="file" multiple
          accept=".doc,.docx,.pdf,.txt,.xlsx,.xls,.pptx,.ppt,.zip,.rar,.7z"
          style="display:none" @change="libOnFileSelect" />
        <div v-if="libUploadFiles.length" class="file-list">
          <div v-for="(f, i) in libUploadFiles" :key="i" class="file-item">
            <span class="file-icon">{{ libIcon(f.name) }}</span>
            <span class="file-name">{{ f.name }}</span>
            <span class="file-size">{{ formatSize(f.size) }}</span>
            <el-button size="small" circle text @click="libUploadFiles.splice(i,1)" title="移除"><el-icon :size="14"><Close /></el-icon></el-button>
          </div>
        </div>
        <el-form label-width="80px" size="default" style="margin-top:16px;">
          <el-form-item label="文件名称"><el-input v-model="libUploadForm.name" placeholder="留空使用原文件名" size="large" /></el-form-item>
          <el-form-item label="标签"><el-input v-model="libUploadForm.tagsStr" placeholder="逗号分隔" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="libUploadOpen = false">取消</el-button>
          <el-button type="primary" @click="libDoUpload" :disabled="!libUploadFiles.length" :loading="libUploading">
            <el-icon :size="14"><Upload /></el-icon> 上传 ({{ libUploadFiles.length }})
          </el-button>
        </template>
      </el-dialog>

      <!-- 文档阅读器 -->
      <teleport to="body">
        <transition name="reader-fade">
          <div v-if="libReaderItem" :class="['reader-overlay', 'reader-theme-' + libTheme]" @click="libCloseReader">
            <!-- 顶部进度条 -->
            <div class="reader-top-progress">
              <div class="reader-top-progress-fill" :style="{ width: libReaderPercent + '%' }"></div>
            </div>
            <!-- 工具栏 -->
            <div class="reader-toolbar" @click.stop>
              <div class="reader-tb-left">
                <span class="reader-tb-title">{{ libReaderItem.name }}</span>
                <span class="reader-tb-percent">{{ libReaderPercent }}%</span>
              </div>
              <div class="reader-tb-right">
                <el-button size="small" round @click="libTheme = libTheme === 'light' ? 'dark' : 'light'">
                  <el-icon :size="14"><Moon v-if="libTheme === 'light'" /><Sunny v-else /></el-icon>
                  {{ libTheme === 'light' ? '护眼' : '亮色' }}
                </el-button>
                <el-button
                  size="small"
                  :type="libReaderItem.status === 'done' ? 'success' : 'default'"
                  round
                  @click="libToggleDone(libReaderItem)">
                  <el-icon :size="14"><Check /></el-icon>
                  {{ libReaderItem.status === 'done' ? '已完成' : '标记完成' }}
                </el-button>
                <a :href="authUrl(api.library.downloadUrl(libReaderItem.id))">
                  <el-button size="small" type="primary" round><el-icon :size="14"><Download /></el-icon> 下载</el-button>
                </a>
                <el-button size="small" round @click="libCloseReader"><el-icon :size="15"><Close /></el-icon> 关闭</el-button>
              </div>
            </div>
            <!-- 阅读内容区 -->
            <div class="reader-body" @click.stop ref="libReaderEl" @scroll="libOnScroll">
              <div class="reader-content" v-if="libReaderLoading">
                <div style="text-align:center;padding:60px;color:#9ca3af;"><el-icon :size="32"><Loading /></el-icon><p>加载中...</p></div>
              </div>
              <div class="reader-content" v-else-if="libReaderType === 'iframe'">
                <iframe :src="authUrl(libReaderUrl)" class="reader-iframe" frameborder="0" sandbox="allow-same-origin" />
              </div>
              <div class="reader-content" v-else v-html="libReaderHtml"></div>
            </div>
          </div>
        </transition>
      </teleport>

      <!-- 资料库编辑弹窗 -->
      <el-dialog v-model="libEditOpen" title="编辑文件" width="480px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="名称"><el-input v-model="libEditForm.name" size="large" /></el-form-item>
          <el-form-item label="标签"><el-input v-model="libEditForm.tagsStr" placeholder="逗号分隔" size="large" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="libEditOpen = false">取消</el-button>
          <el-button type="primary" @click="libDoUpdate"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>
    </template>

    <!-- ==================== AI提示词 Tab ==================== -->
    <template v-if="tab === 'prompts'">
      <div class="prompts-layout">
        <!-- 左侧步骤导航 -->
        <aside class="prompts-sidebar">
          <div class="sidebar-header">
            <h3>流程步骤</h3>
            <el-button size="small" text @click="pmtOpenStepManager">
              <el-icon :size="14"><Setting /></el-icon> 管理
            </el-button>
          </div>
          <div class="sidebar-list">
            <div v-for="(st, i) in pmtSteps" :key="st.key"
              :class="['sidebar-step', { active: pmtActiveStep === st.key }]"
              :style="{ '--st-color': st.color }"
              @click="pmtActiveStep = st.key">
              <span class="sidebar-step-dot" :style="{ background: st.color }">{{ i + 1 }}</span>
              <span class="sidebar-step-label">{{ st.label }}</span>
              <span class="sidebar-step-n">{{ pmtCountByStep(st.key) }}</span>
            </div>
          </div>
        </aside>

        <!-- 右侧内容 -->
        <div class="prompts-main">
          <!-- 顶部操作栏 -->
          <div class="prompts-topbar">
            <div class="toolbar-left">
              <el-button type="primary" class="tb-btn-primary" @click="pmtOpenAdd">
                <el-icon :size="16"><Plus /></el-icon> 新增模板
              </el-button>
              <span class="tb-count">{{ pmtFiltered.length }} 条</span>
            </div>
            <div class="toolbar-right">
              <div class="assets-search-box">
                <el-icon :size="15" class="search-icon"><Search /></el-icon>
                <input v-model="pmtSearch" class="search-input" placeholder="搜索标题或标签..." />
                <span v-if="pmtSearch" class="search-clear" @click="pmtSearch = ''"><el-icon :size="13"><Close /></el-icon></span>
              </div>
              <el-select v-model="pmtSortBy" size="default" style="width:120px;" @change="pmtSortChange">
                <el-option label="默认排序" value="default" />
                <el-option label="标题 A-Z" value="title-asc" />
                <el-option label="最新创建" value="date-desc" />
                <el-option label="最早创建" value="date-asc" />
              </el-select>
            </div>
          </div>

          <!-- 卡片列表 -->
          <div v-if="!pmtFiltered.length" class="empty-state" style="padding:40px;">
            <div class="empty-icon"><el-icon :size="48"><Document /></el-icon></div>
            <p class="empty-text">暂无提示词模板</p>
            <el-button type="primary" round @click="pmtOpenAdd">创建第一个模板</el-button>
          </div>

          <div v-else class="pmt-card-list" ref="pmtListRef">
            <div v-for="(p, idx) in pmtFiltered" :key="p.id"
              :class="['pmt-card', { expanded: pmtExpandedId === p.id }]"
              :style="{ '--st-color': pmtStepColor(p.step) }"
              draggable="true"
              @dragstart="pmtDragStart($event, idx)"
              @dragover.prevent="pmtDragOver($event, idx)"
              @dragleave="pmtDragLeave($event)"
              @drop="pmtDrop($event, idx)"
              @dragend="pmtDragEnd">
              <div class="pmt-card-drag" title="拖拽排序">
                <el-icon :size="16"><Rank /></el-icon>
              </div>
              <div class="pmt-collapsed" @click="pmtToggleExpand(p.id)">
                <div class="pmt-accent" :style="{ background: pmtStepColor(p.step) }"></div>
                <div class="pmt-body">
                  <div class="pmt-header">
                    <h3 class="pmt-title">{{ p.title }}</h3>
                    <span v-if="p.tags && p.tags.length" class="pmt-tags">
                      <span v-for="t in p.tags" :key="t" class="pmt-tag">{{ t }}</span>
                    </span>
                  </div>
                  <p class="pmt-preview">{{ pmtPreview(p.content) }}</p>
                </div>
                <div class="pmt-chevron">
                  <el-icon :size="18"><ArrowDown v-if="pmtExpandedId !== p.id" /><ArrowUp v-else /></el-icon>
                </div>
              </div>
              <div class="pmt-actions-row" @click.stop>
                <el-button size="small" round @click="pmtDoCopy(p)">
                  <el-icon><DocumentCopy /></el-icon> 复制
                </el-button>
                <el-button size="small" round @click="pmtOpenEdit(p)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button size="small" round type="danger" plain @click="pmtDeleteCard(p)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <transition name="slide">
                <div v-if="pmtExpandedId === p.id" class="pmt-expanded">
                  <div class="pmt-exp-toolbar">
                    <span class="pmt-exp-title">{{ p.title }}</span>
                    <el-button type="primary" round size="small" @click="pmtDoCopy(p)">
                      <el-icon><DocumentCopy /></el-icon> 一键复制全文
                    </el-button>
                  </div>
                  <pre class="pmt-exp-content">{{ p.content }}</pre>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示词编辑弹窗 -->
      <el-dialog v-model="pmtDialogOpen" :title="pmtIsEditing ? '编辑模板' : '新增模板'" width="720px" destroy-on-close>
        <el-form label-width="80px" size="default">
          <el-form-item label="标题">
            <el-input v-model="pmtForm.title" placeholder="输入模板名称..." size="large" />
          </el-form-item>
          <el-form-item label="步骤分类">
            <el-select v-model="pmtForm.step" size="large" style="width:100%;">
              <el-option v-for="st in pmtSteps" :key="st.key" :label="st.label" :value="st.key" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="pmtForm.tagsStr" placeholder="逗号分隔" size="large" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input v-model="pmtForm.content" type="textarea" :rows="18" placeholder="粘贴提示词内容..." />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button v-if="pmtIsEditing" type="danger" @click="pmtDoDelete" style="margin-right:auto;">
            <el-icon :size="14"><Delete /></el-icon> 删除
          </el-button>
          <el-button @click="pmtDialogOpen = false">取消</el-button>
          <el-button type="primary" @click="pmtDoSave"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>

      <!-- 步骤管理弹窗 -->
      <el-dialog v-model="pmtStepDialog" title="管理流程步骤" width="560px" destroy-on-close>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">自定义步骤名称、颜色和顺序。提示词中引用的步骤将自动更新。</p>
        <div class="step-manage-list">
          <div v-for="(st, i) in pmtStepsDraft" :key="i"
            class="step-manage-item"
            draggable="true"
            @dragstart="stepDragStart($event, i)"
            @dragover.prevent="stepDragOver($event, i)"
            @dragleave="stepDragLeave($event)"
            @drop="stepDrop($event, i)"
            @dragend="stepDragEnd">
            <div class="step-manage-drag">
              <el-icon :size="16"><Rank /></el-icon>
            </div>
            <span class="step-manage-idx">{{ i + 1 }}</span>
            <input v-model="st.label" class="step-manage-input" placeholder="显示名称" />
            <el-color-picker v-model="st.color" size="small" style="flex-shrink:0;" />
            <el-button size="small" circle text type="danger" @click="pmtStepsDraft.splice(i, 1)" :disabled="pmtStepsDraft.length <= 1">
              <el-icon :size="14"><Close /></el-icon>
            </el-button>
          </div>
        </div>
        <el-button style="margin-top:12px;" size="small" @click="pmtStepsDraft.push({ key: '', label: '新步骤', color: '#6366f1' })">
          <el-icon :size="14"><Plus /></el-icon> 添加步骤
        </el-button>
        <template #footer>
          <el-button @click="pmtStepDialog = false">取消</el-button>
          <el-button type="primary" @click="pmtSaveSteps">保存步骤配置</el-button>
        </template>
      </el-dialog>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, formatSize, authUrl } from '../api'

// ===== Tab =====
const tab = ref('assets')
watch(tab, () => { closePreview(); libCloseReader() })

// ===== AI资产 =====
const assetTypes = [
  { value: 'character', label: '人物', color: '#a78bfa' },
  { value: 'voice', label: '配音', color: '#10b981' },
  { value: 'video', label: '视频', color: '#ef4444' },
  { value: 'scene', label: '场景', color: '#22d3ee' },
  { value: 'prop', label: '道具', color: '#fb923c' },
]
const typeTabs = [
  { key: '', label: '全部', color: '#6366f1' },
  { key: 'character', label: '人物', color: '#a78bfa' },
  { key: 'voice', label: '配音', color: '#10b981' },
  { key: 'video', label: '视频', color: '#ef4444' },
  { key: 'scene', label: '场景', color: '#22d3ee' },
  { key: 'prop', label: '道具', color: '#fb923c' },
]
function typeLabel(type) { return assetTypes.find(t => t.value === type)?.label || type }
function typeLabelShort(type) { return ({ character: '人物', voice: '配音', video: '视频', scene: '场景', prop: '道具' })[type] || type }
function typeColor(type) { return assetTypes.find(t => t.value === type)?.color || '#6366f1' }
function isVideo(a) { return a.mediaType === 'video' }
function isAudio(a) { return a.mediaType === 'audio' }
function isImage(a) { return !a.mediaType || a.mediaType === 'image' }
function mediaIcon(a) { return isVideo(a) ? '🎬' : isAudio(a) ? '🎙️' : null }

const assets = ref([])
const activeType = ref('')
const searchText = ref('')
const selectedIds = ref(new Set())
const uploadOpen = ref(false)
const editOpen = ref(false)
const dragOver = ref(false)
const uploading = ref(false)
const uploadFiles = ref([])
const seenFiles = new Set()
const fileInput = ref(null)
const previewCache = new Map()
const previewAsset = ref(null)

const uploadPreviews = computed(() =>
  uploadFiles.value.map(f => {
    if (!previewCache.has(f)) previewCache.set(f, URL.createObjectURL(f))
    return { file: f, url: previewCache.get(f) }
  })
)
function removeFile(i) {
  const f = uploadFiles.value[i]
  if (previewCache.has(f)) { URL.revokeObjectURL(previewCache.get(f)); previewCache.delete(f) }
  uploadFiles.value.splice(i, 1)
}
const uploadForm = reactive({ name: '', type: 'character', tagsStr: '' })
const editForm = reactive({ name: '', type: 'character', tagsStr: '' })
const editingId = ref(null)

const filteredList = computed(() => {
  let list = assets.value
  if (activeType.value) list = list.filter(a => a.type === activeType.value)
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    list = list.filter(a => (a.name || '').toLowerCase().includes(kw) || (a.tags || []).some(t => t.toLowerCase().includes(kw)))
  }
  return list
})
function countByType(key) { return key ? assets.value.filter(a => a.type === key).length : assets.value.length }
function assetUrl(a) { return api.assets.getUrl(a.fileName) }

function toggleSelect(id) {
  const s = selectedIds.value
  const ns = new Set(s)
  if (ns.has(id)) ns.delete(id); else ns.add(id)
  selectedIds.value = ns
}
function selectAll() {
  selectedIds.value = new Set(filteredList.value.map(a => a.id))
}

async function batchDownload() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  // 单个直接下载，多个打包zip
  if (ids.length === 1) {
    const a = assets.value.find(x => x.id === ids[0])
    if (a) {
      const url = authUrl(api.assets.downloadUrl(a.id))
      const link = document.createElement('a'); link.href = url; link.click()
    }
    return
  }
  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/assets/batch-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ ids })
    })
    if (!res.ok) { ElMessage.error('下载失败'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'assets.zip'; link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('已开始下载')
  } catch (e) { ElMessage.error('下载失败: ' + e.message) }
}

async function batchDelete() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try { await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 个资产？此操作不可恢复。`, '批量删除', { type: 'warning', confirmButtonText: '确认删除' }) } catch { return }
  const res = await api.assets.batchDelete(ids)
  if (res.success) { ElMessage.success(`已删除 ${res.data.count} 个资产`); selectedIds.value = new Set(); loadAssets() }
  else ElMessage.error('删除失败')
}

function openUpload() { uploadForm.name = ''; uploadForm.type = 'character'; uploadForm.tagsStr = ''; previewCache.forEach(url => URL.revokeObjectURL(url)); previewCache.clear(); uploadFiles.value = []; seenFiles.clear(); uploadOpen.value = true }
function triggerFileInput() { fileInput.value?.click() }
function addFiles(files) { for (const f of files) { const key = f.name + '|' + f.size + '|' + f.lastModified; if (!seenFiles.has(key)) { seenFiles.add(key); uploadFiles.value.push(f) } }; autoDetectUploadType() }
function onDrop(e) { dragOver.value = false; addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'))) }
function onFileSelect(e) { addFiles(Array.from(e.target.files || [])); e.target.value = '' }
// 根据上传文件自动推断类型
function autoDetectUploadType() {
  const files = uploadFiles.value
  if (!files.length) return
  const allVideo = files.every(f => f.type.startsWith('video/'))
  const allAudio = files.every(f => f.type.startsWith('audio/'))
  if (allVideo) uploadForm.type = 'video'
  else if (allAudio) uploadForm.type = 'voice'
}

async function doUpload() {
  if (!uploadFiles.value.length) return; uploading.value = true
  try {
    const fd = new FormData(); fd.append('name', uploadForm.name); fd.append('type', uploadForm.type)
    fd.append('tags', JSON.stringify(uploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of uploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/assets/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个资产`); uploadOpen.value = false; loadAssets() }
    else ElMessage.error(data.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  uploading.value = false
}

function preview(a) { previewAsset.value = a }
function closePreview() { previewAsset.value = null }
function openEdit(a) { editingId.value = a.id; editForm.name = a.name || ''; editForm.type = a.type || 'character'; editForm.tagsStr = (a.tags || []).join(', '); editOpen.value = true }
async function doUpdate() {
  const res = await api.assets.update(editingId.value, { name: editForm.name, type: editForm.type, tags: editForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) })
  if (res.success) { ElMessage.success('已更新'); editOpen.value = false; if (previewAsset.value?.id === editingId.value) previewAsset.value = { ...previewAsset.value, ...res.data }; loadAssets() }
  else ElMessage.error('更新失败')
}
async function doDelete(a) {
  try { await ElMessageBox.confirm(`确定删除「${a.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  const res = await api.assets.delete(a.id)
  if (res.success) { ElMessage.success('已删除'); selectedIds.value = new Set([...selectedIds.value].filter(id => id !== a.id)); if (previewAsset.value?.id === a.id) closePreview(); loadAssets() }
  else ElMessage.error('删除失败')
}
function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (libReaderItem.value) { libCloseReader(); return }
    if (previewAsset.value) closePreview()
  }
}
async function loadAssets() { const res = await api.assets.list(); if (res.success) assets.value = res.data }

// ===== 资料库 =====
const libItems = ref([])
const libSearch = ref('')
const libUploadOpen = ref(false)
const libEditOpen = ref(false)
const libDragOver = ref(false)
const libUploading = ref(false)
const libUploadFiles = ref([])
const libFileInput = ref(null)
const libUploadForm = reactive({ name: '', tagsStr: '' })
const libEditForm = reactive({ name: '', tagsStr: '' })
const libEditingId = ref(null)

// 阅读器状态
const libReaderItem = ref(null)
const libReaderHtml = ref('')
const libReaderType = ref('')
const libReaderUrl = ref('')
const libReaderLoading = ref(false)
const libReaderPercent = ref(0)
const libReaderEl = ref(null)
const libTheme = ref('light')
let libSaveTimer = null
let libScrollRestored = false

function libExt(name) {
  const ext = (name || '').toLowerCase().split('.').pop()
  return ext ? ext.toUpperCase() : 'FILE'
}
function libIcon(name) {
  const m = { doc: 'DOC', docx: 'DOC', pdf: 'PDF', txt: 'TXT', xls: 'XLS', xlsx: 'XLS', ppt: 'PPT', pptx: 'PPT', zip: 'ZIP', rar: 'RAR', '7z': '7Z' }
  return m[libExt(name).toLowerCase()] || 'FILE'
}
function libIconColor(name) {
  const m = { doc: '#2563eb', docx: '#2563eb', pdf: '#dc2626', txt: '#6b7280', xls: '#16a34a', xlsx: '#16a34a', ppt: '#ea580c', pptx: '#ea580c', zip: '#7c3aed', rar: '#7c3aed', '7z': '#7c3aed' }
  return m[libExt(name).toLowerCase()] || '#6b7280'
}
function libIconBg(name) {
  const m = { doc: '#dbeafe', docx: '#dbeafe', pdf: '#fee2e2', txt: '#f3f4f6', xls: '#dcfce7', xlsx: '#dcfce7', ppt: '#ffedd5', pptx: '#ffedd5', zip: '#ede9fe', rar: '#ede9fe', '7z': '#ede9fe' }
  return m[libExt(name).toLowerCase()] || '#f3f4f6'
}

// 阅读进度 localStorage key
function libPosKey(id) { return 'lib_pos_' + id }
function libGetProgress(id) {
  try {
    const saved = JSON.parse(localStorage.getItem(libPosKey(id)) || '{}')
    return saved.scrollPercent || 0
  } catch { return 0 }
}

const filteredLib = computed(() => {
  if (!libSearch.value) return libItems.value
  const kw = libSearch.value.toLowerCase()
  return libItems.value.filter(d => (d.name || '').toLowerCase().includes(kw) || (d.tags || []).some(t => t.toLowerCase().includes(kw)))
})

// ===== 文档阅读器 =====
async function libOpenReader(d) {
  libReaderItem.value = d
  libReaderLoading.value = true
  libScrollRestored = false
  libReaderPercent.value = libGetProgress(d.id)

  try {
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/library/' + d.id + '/content?' + new URLSearchParams({ token }))
    const data = await res.json()
    if (data.success) {
      if (data.data.type === 'docx' || data.data.type === 'txt') {
        libReaderType.value = 'html'
        libReaderHtml.value = data.data.html
        libReaderUrl.value = ''
      } else {
        // PDF/其他 → iframe 回退
        libReaderType.value = 'iframe'
        libReaderUrl.value = data.data.url || ('/api/library/' + d.id + '/preview')
        libReaderHtml.value = ''
      }
    } else {
      libReaderType.value = 'html'
      libReaderHtml.value = '<p style="text-align:center;color:#999;padding:60px;">加载失败</p>'
    }
  } catch (e) {
    libReaderType.value = 'html'
    libReaderHtml.value = '<p style="text-align:center;color:#999;padding:60px;">加载失败: ' + e.message + '</p>'
  }
  libReaderLoading.value = false

  // 恢复阅读位置
  await nextTick()
  libRestorePosition()
}

function libCloseReader() {
  libSavePosition()
  libReaderItem.value = null
  libReaderHtml.value = ''
  libReaderUrl.value = ''
  libReaderType.value = ''
  libReaderLoading.value = false
}

function libScrollSave() {
  if (!libReaderItem.value) return
  const el = libReaderEl.value
  if (!el) return
  const scrollTop = el.scrollTop
  const maxScroll = el.scrollHeight - el.clientHeight
  const scrollPercent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0
  libReaderPercent.value = scrollPercent
  localStorage.setItem(libPosKey(libReaderItem.value.id), JSON.stringify({
    scrollTop,
    scrollPercent,
    updatedAt: new Date().toISOString()
  }))
}

function libSavePosition() {
  if (libSaveTimer) { clearTimeout(libSaveTimer); libSaveTimer = null }
  libScrollSave()
}

function libRestorePosition() {
  const el = libReaderEl.value
  if (!el || !libReaderItem.value) return
  try {
    const saved = JSON.parse(localStorage.getItem(libPosKey(libReaderItem.value.id)) || '{}')
    if (saved.scrollTop && saved.scrollTop > 0) {
      // 等 v-html 渲染完成后再滚动
      nextTick(() => {
        setTimeout(() => {
          if (libReaderEl.value) {
            libReaderEl.value.scrollTop = saved.scrollTop
            libScrollRestored = true
          }
        }, 200)
      })
    }
  } catch { /* ignore */ }
}

function libOnScroll() {
  if (!libScrollRestored) return // 恢复位置中，不保存
  if (libSaveTimer) clearTimeout(libSaveTimer)
  libSaveTimer = setTimeout(() => libScrollSave(), 1500)
}

async function libToggleDone(d) {
  const newStatus = d.status === 'done' ? null : 'done'
  try {
    const res = await api.library.update(d.id, { status: newStatus })
    if (res.success) {
      d.status = newStatus
      libReaderItem.value = { ...libReaderItem.value, status: newStatus }
      if (newStatus === 'done') {
        // 完成时保存 100% 进度
        localStorage.setItem(libPosKey(d.id), JSON.stringify({
          scrollTop: 999999, scrollPercent: 100, updatedAt: new Date().toISOString()
        }))
        libReaderPercent.value = 100
      }
      ElMessage.success(newStatus === 'done' ? '已标记完成' : '已取消完成标记')
    }
  } catch { ElMessage.error('操作失败') }
}

function libOnDrop(e) { libDragOver.value = false; for (const f of Array.from(e.dataTransfer.files)) libUploadFiles.value.push(f) }
function libOnFileSelect(e) { for (const f of Array.from(e.target.files || [])) libUploadFiles.value.push(f); e.target.value = '' }
function libOpenEdit(d) { libEditingId.value = d.id; libEditForm.name = d.name || ''; libEditForm.tagsStr = (d.tags || []).join(', '); libEditOpen.value = true }

async function libDoUpload() {
  if (!libUploadFiles.value.length) return; libUploading.value = true
  try {
    const fd = new FormData(); fd.append('name', libUploadForm.name)
    fd.append('tags', JSON.stringify(libUploadForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean)))
    for (const f of libUploadFiles.value) fd.append('files', f)
    const token = localStorage.getItem('pan_token') || ''
    const res = await fetch('/api/library/upload', { method: 'POST', headers: { 'X-Auth-Token': token }, body: fd })
    const data = await res.json()
    if (data.success) { ElMessage.success(`已上传 ${data.data.length} 个文件`); libUploadOpen.value = false; loadLib() }
    else ElMessage.error(data.error || '上传失败')
  } catch (e) { ElMessage.error('上传失败: ' + e.message) }
  libUploading.value = false
}
async function libDoUpdate() {
  const res = await api.library.update(libEditingId.value, { name: libEditForm.name, tags: libEditForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) })
  if (res.success) { ElMessage.success('已更新'); libEditOpen.value = false; loadLib() }
  else ElMessage.error('更新失败')
}
async function libDoDelete(d) {
  try { await ElMessageBox.confirm(`确定删除「${d.name}」？`, '确认删除', { type: 'warning', confirmButtonText: '删除' }) } catch { return }
  try { const res = await api.library.delete(d.id); if (res.success) { ElMessage.success('已删除'); localStorage.removeItem(libPosKey(d.id)); loadLib() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}
async function loadLib() { const res = await api.library.list(); if (res.success) libItems.value = res.data }

// ===== AI提示词 =====
const DEFAULT_STEPS = [
  { key: '第一步：剧本', label: '剧本生成', color: '#a78bfa' },
  { key: '第二步：人物 物品 场景的提取', label: '元素提取', color: '#60a5fa' },
  { key: '第三步：生资产', label: '资产生成', color: '#22d3ee' },
  { key: '第四步：分镜提示词', label: '分镜提示词', color: '#fb923c' },
  { key: '第五步：生分镜', label: '分镜生成', color: '#f472b6' },
]

const pmtSteps = ref([...DEFAULT_STEPS])
const prompts = ref([])
const pmtActiveStep = ref('')
const pmtExpandedId = ref(null)
const pmtDialogOpen = ref(false)
const pmtIsEditing = ref(false)
const pmtEditingId = ref(null)
const pmtSearch = ref('')
const pmtSortBy = ref('default')
const pmtStepDialog = ref(false)
const pmtStepsDraft = ref([])
const pmtForm = reactive({ title: '', step: '', tagsStr: '', content: '' })

// 拖拽状态
const pmtDragIdx = ref(-1)
const pmtDragOverIdx = ref(-1)
const stepDragIdx = ref(-1)
const stepDragOverIdx = ref(-1)
const pmtListRef = ref(null)

const pmtFiltered = computed(() => {
  let list = prompts.value.filter(p => p.step === pmtActiveStep.value)
  if (pmtSearch.value) {
    const kw = pmtSearch.value.toLowerCase()
    list = list.filter(p => (p.title || '').toLowerCase().includes(kw) || (p.tags || []).some(t => t.toLowerCase().includes(kw)))
  }
  // 排序
  if (pmtSortBy.value === 'title-asc') {
    list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  } else if (pmtSortBy.value === 'date-desc') {
    list = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  } else if (pmtSortBy.value === 'date-asc') {
    list = [...list].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  }
  return list
})
function pmtCountByStep(key) { return prompts.value.filter(p => p.step === key).length }
function pmtStepColor(key) {
  const found = pmtSteps.value.find(s => s.key === key)
  return found?.color || '#6366f1'
}
function pmtPreview(content) {
  if (!content) return '(空内容)'
  return content.replace(/\n/g, ' ').substring(0, 120) + (content.length > 120 ? '…' : '')
}
function pmtToggleExpand(id) { pmtExpandedId.value = pmtExpandedId.value === id ? null : id }

async function pmtDoCopy(p) {
  try { await navigator.clipboard.writeText(p.content || ''); ElMessage.success('已复制到剪贴板') }
  catch {
    const ta = document.createElement('textarea'); ta.value = p.content || ''
    document.body.appendChild(ta); ta.select(); document.execCommand('copy')
    document.body.removeChild(ta); ElMessage.success('已复制到剪贴板')
  }
}
function pmtOpenAdd() {
  pmtIsEditing.value = false; pmtEditingId.value = null
  pmtForm.title = ''; pmtForm.step = pmtActiveStep.value; pmtForm.tagsStr = ''; pmtForm.content = ''
  pmtDialogOpen.value = true
}
function pmtOpenEdit(p) {
  pmtIsEditing.value = true; pmtEditingId.value = p.id
  pmtForm.title = p.title || ''; pmtForm.step = p.step || pmtActiveStep.value
  pmtForm.tagsStr = (p.tags || []).join(', '); pmtForm.content = p.content || ''
  pmtDialogOpen.value = true
}
async function pmtDoSave() {
  if (!pmtForm.title.trim()) { ElMessage.warning('请输入标题'); return }
  const data = { title: pmtForm.title.trim(), step: pmtForm.step, content: pmtForm.content, tags: pmtForm.tagsStr.split(',').map(t => t.trim()).filter(Boolean) }
  if (pmtIsEditing.value) {
    const res = await api.prompts.update(pmtEditingId.value, data)
    if (res.success) { ElMessage.success('已更新'); pmtDialogOpen.value = false; loadPrompts() }
    else ElMessage.error('更新失败')
  } else {
    const res = await api.prompts.add(data)
    if (res.success) { ElMessage.success('已创建'); pmtDialogOpen.value = false; pmtActiveStep.value = data.step; loadPrompts() }
    else ElMessage.error('创建失败')
  }
}
async function pmtDoDelete() {
  try { await ElMessageBox.confirm('确定删除此模板？', '确认删除', { type: 'warning' }) } catch { return }
  try { const res = await api.prompts.delete(pmtEditingId.value); if (res.success) { ElMessage.success('已删除'); pmtDialogOpen.value = false; loadPrompts() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}
async function pmtDeleteCard(p) {
  try { await ElMessageBox.confirm(`确定删除「${p.title}」？`, '确认删除', { type: 'warning' }) } catch { return }
  try { const res = await api.prompts.delete(p.id); if (res.success) { ElMessage.success('已删除'); loadPrompts() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}

// 拖拽排序
function pmtDragStart(e, idx) { pmtDragIdx.value = idx; e.dataTransfer.effectAllowed = 'move' }
function pmtDragOver(e, idx) { e.dataTransfer.dropEffect = 'move'; pmtDragOverIdx.value = idx }
function pmtDragLeave(e) { pmtDragOverIdx.value = -1 }
async function pmtDrop(e, idx) {
  const from = pmtDragIdx.value
  if (from === idx || from < 0) { pmtDragIdx.value = -1; pmtDragOverIdx.value = -1; return }
  const list = [...pmtFiltered.value]
  const [item] = list.splice(from, 1)
  list.splice(idx, 0, item)
  // 获取当前步骤所有提示词的完整排序
  const allInStep = prompts.value.filter(p => p.step === pmtActiveStep.value)
  // 构建新order：list中的保持新顺序，不在list中的保持原位置
  const reorderedIds = []
  for (const p of list) reorderedIds.push(p.id)
  // 添加其他步骤的（保持原位）
  for (const p of prompts.value) {
    if (p.step !== pmtActiveStep.value) reorderedIds.push(p.id)
  }
  try { await api.prompts.reorder(reorderedIds); loadPrompts() } catch { ElMessage.error('排序失败') }
  pmtDragIdx.value = -1; pmtDragOverIdx.value = -1
}
function pmtDragEnd() { pmtDragIdx.value = -1; pmtDragOverIdx.value = -1 }

function pmtSortChange() { /* computed 自动响应 */ }

// 步骤管理
function pmtOpenStepManager() {
  pmtStepsDraft.value = pmtSteps.value.map(s => ({ ...s }))
  pmtStepDialog.value = true
}
async function pmtSaveSteps() {
  // 自动生成key
  const steps = pmtStepsDraft.value.filter(s => s.label.trim()).map((s, i) => ({
    key: s.key || ('step_' + Date.now() + '_' + i),
    label: s.label.trim(),
    color: s.color || '#6366f1'
  }))
  if (!steps.length) { ElMessage.warning('至少需要一个步骤'); return }
  const res = await api.prompts.saveSteps(steps)
  if (res.success) {
    pmtSteps.value = steps
    ElMessage.success('步骤配置已保存')
    pmtStepDialog.value = false
    // 如果当前activeStep不在新步骤中，切换到第一个
    if (!steps.find(s => s.key === pmtActiveStep.value)) {
      pmtActiveStep.value = steps[0].key
    }
  } else ElMessage.error('保存失败')
}

// 步骤拖拽
function stepDragStart(e, idx) { stepDragIdx.value = idx; e.dataTransfer.effectAllowed = 'move' }
function stepDragOver(e, idx) { e.dataTransfer.dropEffect = 'move'; stepDragOverIdx.value = idx }
function stepDragLeave(e) { stepDragOverIdx.value = -1 }
function stepDrop(e, idx) {
  const from = stepDragIdx.value
  if (from === idx || from < 0) { stepDragIdx.value = -1; stepDragOverIdx.value = -1; return }
  const list = [...pmtStepsDraft.value]
  const [item] = list.splice(from, 1)
  list.splice(idx, 0, item)
  pmtStepsDraft.value = list
  stepDragIdx.value = -1; stepDragOverIdx.value = -1
}
function stepDragEnd() { stepDragIdx.value = -1; stepDragOverIdx.value = -1 }

async function loadPrompts() { const res = await api.prompts.list(); if (res.success) prompts.value = res.data }
async function loadPromptSteps() {
  const res = await api.prompts.getSteps()
  if (res.success && res.data.length) {
    pmtSteps.value = res.data
    pmtActiveStep.value = res.data[0].key
  } else {
    pmtSteps.value = [...DEFAULT_STEPS]
    pmtActiveStep.value = DEFAULT_STEPS[0].key
  }
}

onMounted(() => { loadAssets(); loadLib(); loadPromptSteps().then(() => loadPrompts()); document.addEventListener("keydown", onKeyDown) })
onUnmounted(() => { document.removeEventListener("keydown", onKeyDown) })
</script>

<style scoped>
.assets-page { animation: fadeIn .3s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* ===== 页头 + Tab ===== */
.page-header { margin-bottom:24px; }
.page-header-top { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
.page-header h2 { font-size:22px; font-weight:700; display:flex; align-items:center; gap:8px; margin:0; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

.tab-bar { display: flex; gap: 8px; margin-top: 16px; }
.tab-btn {
  padding: 11px 22px; border-radius: 14px; border: 2px solid #e5e7eb;
  background: #fff; font-size: 14px; font-weight: 700; color: #6b7280; cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.tab-btn:hover { border-color: #a5b4fc; color: #6366f1; transform: translateY(-1px); }
.tab-btn.active { border-color: #6366f1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); color: #4338ca; box-shadow: 0 2px 8px rgba(99,102,241,.15); }
.tab-icon { font-size: 16px; }
.tab-n { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 12px; background: #f3f4f6; color: #6b7280; min-width: 22px; text-align: center; }
.tab-btn.active .tab-n { background: #c7d2fe; color: #4338ca; }

/* ===== 通用工具栏 ===== */
.assets-toolbar, .library-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; padding:12px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); }
.toolbar-left { display:flex; align-items:center; gap:10px; }
.toolbar-center { flex:1; display:flex; justify-content:center; }
.toolbar-right { display:flex; align-items:center; gap:10px; margin-left:auto; }
.tb-btn-primary { display:inline-flex !important; align-items:center; gap:6px; font-weight:700 !important; border-radius:10px !important; padding:9px 18px !important; font-size:14px !important; transition:all 0.2s !important; }
.tb-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.tb-count { font-size:14px; font-weight:700; color:#6366f1; padding:5px 12px; border-radius:8px; background:#eef2ff; white-space:nowrap; }

.assets-pills { display:flex; gap:4px; flex-wrap:wrap; }
.assets-pill { display:inline-flex; align-items:center; gap:5px; padding:7px 15px; border-radius:22px; border:1.5px solid #e5e7eb; background:#fff; font-size:13px; font-weight:600; color:#6b7280; cursor:pointer; transition:all 0.15s; }
.assets-pill:hover { border-color:#a5b4fc; color:#6366f1; }
.assets-pill.active { background:#eef2ff; border-color:#6366f1; color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.1); }
.pill-dot { width:8px; height:8px; border-radius:50%; }
.pill-n { font-size:11px; opacity:.7; }

.assets-search-box { position:relative; display:flex; align-items:center; min-width:200px; }
.search-icon { position:absolute; left:11px; color:#9ca3af; pointer-events:none; z-index:1; }
.search-input { width:100%; height:38px; padding:0 32px 0 34px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:13px; color:#374151; outline:none; transition:all 0.2s; }
.search-input:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.search-input::placeholder { color:#9ca3af; }
.search-clear { position:absolute; right:8px; cursor:pointer; color:#9ca3af; padding:2px; border-radius:4px; z-index:1; }
.search-clear:hover { color:#6b7280; background:#e5e7eb; }

/* ===== 批量操作栏 ===== */
.batch-bar { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:12px 18px; background:linear-gradient(135deg, #eef2ff, #e0e7ff); border:1.5px solid #c7d2fe; border-radius:12px; flex-wrap:wrap; }
.batch-info { font-size:14px; color:#4338ca; }
.batch-info strong { font-size:18px; }
.slide-down-enter-active, .slide-down-leave-active { transition:all .25s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity:0; transform:translateY(-8px); }

/* ===== 空状态 ===== */
.empty-state { text-align:center; padding:60px 20px; }
.empty-icon { margin-bottom:12px; color:#d1d5db; }
.empty-text { color:#9ca3af; font-size:14px; }

/* ===== AI资产卡片 ===== */
.asset-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)); gap:20px; }
.asset-card {
  position:relative; background:#fff; border:1.5px solid #e5e7eb; border-radius:16px;
  overflow:hidden; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.asset-card:hover { border-color:#c7d2fe; box-shadow:0 8px 25px rgba(0,0,0,.08); transform:translateY(-2px); }
.asset-card.selected { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

.card-check { position:absolute; top:10px; left:10px; z-index:5; cursor:pointer; }
.check-box {
  width:22px; height:22px; border-radius:6px; border:2px solid #d1d5db; background:rgba(255,255,255,.85);
  display:flex; align-items:center; justify-content:center; transition:all 0.15s;
}
.check-box.checked { background:#6366f1; border-color:#6366f1; color:#fff; }
.asset-card:hover .check-box { border-color:#6366f1; }

.card-img-wrap { position:relative; width:100%; aspect-ratio:4/3; background:#f3f4f6; overflow:hidden; cursor:pointer; }
.card-img { width:100%; height:100%; object-fit:cover; transition:transform 0.35s; }
.asset-card:hover .card-img { transform:scale(1.06); }
.card-type-badge { position:absolute; top:10px; right:10px; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; color:#fff; letter-spacing:.5px; box-shadow:0 2px 6px rgba(0,0,0,.15); }

.card-info { padding:14px 16px 8px; }
.card-name { font-size:15px; font-weight:700; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3; }
.card-tags-row { display:flex; align-items:center; justify-content:space-between; margin-top:6px; min-height:20px; }
.card-tags { display:flex; gap:4px; flex-wrap:wrap; }
.card-tag { font-size:10px; padding:2px 7px; border-radius:4px; background:#eef2ff; color:#6366f1; font-weight:600; }
.card-size { font-size:11px; color:#9ca3af; white-space:nowrap; }

.card-footer { display:flex; gap:4px; padding:8px 16px 14px; border-top:1px solid #f3f4f6; }
.card-btn { width:34px; height:34px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; color:#6b7280; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
.card-btn:hover { background:#f3f4f6; color:#6366f1; border-color:#c7d2fe; }
.card-btn-dl { text-decoration:none; }
.card-btn-del:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

/* 卡片视频/音频覆盖层 */
.card-play-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.3); pointer-events:none; color:#fff; }
.card-play-overlay .el-icon { filter:drop-shadow(0 2px 6px rgba(0,0,0,.4)); }
.card-audio-placeholder { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:#fff; }
.card-audio-label { font-size:14px; font-weight:700; letter-spacing:1px; }

/* Lightbox */
.lightbox-overlay { position:fixed; inset:0; z-index:10001; background:rgba(0,0,0,.9); display:flex; flex-direction:column; overflow:hidden; }
.lightbox-toolbar { display:flex; align-items:center; gap:12px; padding:12px 24px; background:rgba(0,0,0,.7); flex-shrink:0; backdrop-filter:blur(10px); }
.lb-name { font-size:16px; font-weight:700; color:#fff; }
.lb-meta { font-size:12px; color:#a0a3b1; }
.lightbox-img-wrap { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; padding:24px; overflow:hidden; }
.lightbox-img { max-width:100%; max-height:100%; object-fit:scale-down; border-radius:8px; }
.lightbox-video { max-width:100%; max-height:100%; border-radius:8px; }
.lightbox-audio-wrap { text-align:center; }
.lightbox-audio-icon { margin-bottom:8px; }
.lightbox-audio-name { font-size:18px; font-weight:700; color:#fff; margin:0 0 20px; }
.lightbox-audio { min-width:380px; }
.lightbox-enter-active, .lightbox-leave-active { transition:opacity .2s; }
.lightbox-enter-from, .lightbox-leave-to { opacity:0; }

/* 上传弹窗 */
.drop-zone { border:2px dashed #d1d5db; border-radius:14px; padding:32px 20px; text-align:center; transition:all 0.2s; background:#f9fafb; }
.drop-zone:hover, .drop-zone.dragover { border-color:#6366f1; background:#eef2ff; }
.drop-icon { margin-bottom:8px; color:#9ca3af; }
.drop-text { font-size:14px; color:#6b7280; margin:0 0 8px; }
.drop-hint { font-size:11px; color:#b0b0b0; margin:8px 0 0; }
.file-list { margin-top:12px; max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.file-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:#f9fafb; font-size:13px; }
.file-thumb { width:40px; height:40px; border-radius:6px; object-fit:cover; }
.file-info { flex:1; min-width:0; }
.file-name { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#374151; }
.file-size { font-size:11px; color:#9ca3af; }
.file-icon { font-size:20px; }

/* ===== 资料库 ===== */
.lib-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px; }
.lib-card {
  position:relative; background:#fff; border:1.5px solid #e5e7eb; border-radius:16px; padding:20px;
  transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.03);
  display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px;
  cursor:default;
}
.lib-card:hover { border-color:#c7d2fe; box-shadow:0 8px 25px rgba(0,0,0,.06); transform:translateY(-2px); }
.lib-card.lib-card-done { background:#f0fdf4; border-color:#bbf7d0; }

.lib-done-badge { position:absolute; top:10px; right:10px; font-size:18px; z-index:2; filter:drop-shadow(0 1px 2px rgba(0,0,0,.1)); }

.lib-card-icon { width:72px; height:72px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; letter-spacing:.5px; flex-shrink:0; }
.lib-card-info { flex:1; min-width:0; width:100%; }
.lib-card-name { font-size:15px; font-weight:700; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3; }

.lib-progress-bar { width:100%; height:4px; background:#e5e7eb; border-radius:2px; margin-top:8px; overflow:hidden; }
.lib-progress-fill { height:100%; background:linear-gradient(90deg, #6366f1, #8b5cf6); border-radius:2px; transition:width 0.3s; }

.lib-card-meta { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:6px; font-size:12px; color:#9ca3af; flex-wrap:wrap; }
.lib-progress-text { color:#6366f1; font-weight:700; }
.lib-card-tags { display:flex; gap:4px; }
.lib-card-tag { padding:1px 6px; border-radius:4px; background:#eef2ff; color:#6366f1; font-weight:600; font-size:10px; }
.lib-card-actions { display:flex; gap:4px; flex-wrap:wrap; justify-content:center; width:100%; padding-top:4px; border-top:1px solid #f3f4f6; }
.lib-dl-link { text-decoration:none; }

/* ===== 文档阅读器 ===== */
.reader-overlay { position:fixed; inset:0; z-index:10001; display:flex; flex-direction:column; }

/* 亮色主题 — 背景在最外层，贯穿全屏 */
.reader-theme-light { background:#fefefe; }
.reader-theme-light .reader-toolbar { background:rgba(255,255,255,.9); border-bottom:1px solid #e5e7eb; }
.reader-theme-light .reader-content :deep(p),
.reader-theme-light .reader-content :deep(li),
.reader-theme-light .reader-content :deep(span) { color:#1f2937; }
.reader-theme-light .reader-content :deep(h1),
.reader-theme-light .reader-content :deep(h2),
.reader-theme-light .reader-content :deep(h3) { color:#111827; }
.reader-theme-light .reader-content :deep(td),
.reader-theme-light .reader-content :deep(th) { border-color:#e5e7eb; }
.reader-theme-light .reader-content :deep(pre) { background:#f9fafb; border-color:#e5e7eb; color:#374151; }
.reader-theme-light .reader-tb-title { color:#1f2937; }
.reader-theme-light .reader-top-progress { background:#e5e7eb; }

/* 暗色/护眼主题 */
.reader-theme-dark { background:#222238; }
.reader-theme-dark .reader-toolbar { background:rgba(34,34,56,.9); border-bottom:1px solid #3a3a50; }
.reader-theme-dark .reader-content :deep(p),
.reader-theme-dark .reader-content :deep(li),
.reader-theme-dark .reader-content :deep(span) { color:#c8c8d4; }
.reader-theme-dark .reader-content :deep(h1),
.reader-theme-dark .reader-content :deep(h2),
.reader-theme-dark .reader-content :deep(h3) { color:#e0e0f0; }
.reader-theme-dark .reader-content :deep(td),
.reader-theme-dark .reader-content :deep(th) { border-color:#3a3a50; }
.reader-theme-dark .reader-content :deep(th) { background:#2a2a40; }
.reader-theme-dark .reader-content :deep(pre) { background:#1a1a30; border-color:#3a3a50; color:#b0b0c0; }
.reader-theme-dark .reader-tb-title { color:#e0e0f0; }
.reader-theme-dark .reader-top-progress { background:#3a3a50; }

/* 顶部进度条 */
.reader-top-progress { height:3px; flex-shrink:0; }
.reader-top-progress-fill { height:100%; background:linear-gradient(90deg, #6366f1, #a78bfa); transition:width 0.3s; border-radius:0 1px 1px 0; }

/* 工具栏 */
.reader-toolbar { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; flex-shrink:0; gap:12px; }
.reader-tb-left { display:flex; align-items:baseline; gap:10px; min-width:0; }
.reader-tb-title { font-size:15px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.reader-tb-percent { font-size:13px; font-weight:600; color:#6366f1; white-space:nowrap; }
.reader-tb-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }

/* 阅读区 — 背景继承自 overlay，不单独设色，彻底无缝 */
.reader-body { flex:1; overflow-y:auto; overflow-x:hidden; }
.reader-content {
  width:100%; max-width:860px; margin:0 auto; min-height:100%;
  padding:48px 52px 120px;
}
/* 排版美化 */
.reader-content :deep(p) { margin:0 0 1em; line-height:2; font-size:16px; }
.reader-content :deep(h1),
.reader-content :deep(h2),
.reader-content :deep(h3) { margin:1.2em 0 .5em; line-height:1.4; }
.reader-content :deep(h1) { font-size:24px; }
.reader-content :deep(h2) { font-size:20px; }
.reader-content :deep(h3) { font-size:17px; }
.reader-content :deep(img) { max-width:100%; border-radius:8px; margin:12px 0; }
.reader-content :deep(table) { border-collapse:collapse; width:100%; margin:12px 0; font-size:14px; }
.reader-content :deep(td), .reader-content :deep(th) { padding:10px 14px; text-align:left; }
.reader-content :deep(th) { font-weight:700; }
.reader-content :deep(ul), .reader-content :deep(ol) { padding-left:1.5em; margin-bottom:1em; }
.reader-content :deep(li) { line-height:2; }
.reader-content :deep(pre) { padding:16px 20px; border-radius:10px; font-size:14px; overflow-x:auto; line-height:1.7; margin:12px 0; }

.reader-iframe { width:100%; height:100%; border:none; min-height:80vh; }

.reader-fade-enter-active, .reader-fade-leave-active { transition:opacity 0.25s; }
.reader-fade-enter-from, .reader-fade-leave-to { opacity:0; }

/* ===== AI提示词 ===== */
.prompts-layout { display:flex; gap:20px; min-height:500px; }

/* 左侧导航 */
.prompts-sidebar {
  width:220px; flex-shrink:0; background:#fff; border:1px solid #e5e7eb; border-radius:14px;
  padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.03);
}
.sidebar-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.sidebar-header h3 { margin:0; font-size:14px; font-weight:700; color:#374151; }
.sidebar-list { display:flex; flex-direction:column; gap:4px; }
.sidebar-step {
  display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px;
  cursor:pointer; transition:all 0.15s; font-size:13px; font-weight:600; color:#6b7280;
  border:1px solid transparent;
}
.sidebar-step:hover { background:#f9fafb; color:#374151; }
.sidebar-step.active { background:color-mix(in srgb, var(--st-color) 10%, #fff); border-color:var(--st-color); color:#374151; font-weight:700; }
.sidebar-step-dot { width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff; flex-shrink:0; }
.sidebar-step-label { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sidebar-step-n { font-size:11px; padding:1px 7px; border-radius:8px; background:#f3f4f6; color:#9ca3af; font-weight:700; }
.sidebar-step.active .sidebar-step-n { background:color-mix(in srgb, var(--st-color) 20%, #fff); color:var(--st-color); }

/* 右侧主区域 */
.prompts-main { flex:1; min-width:0; }
.prompts-topbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; padding:12px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); }

/* 提示词卡片 */
.pmt-card-list { display:flex; flex-direction:column; gap:10px; }
.pmt-card {
  background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;
  transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.04);
  display:flex; align-items:stretch;
}
.pmt-card:hover { border-color:#c7d2fe; box-shadow:0 4px 16px rgba(0,0,0,.06); }
.pmt-card.expanded { border-color:var(--st-color); box-shadow:0 0 0 2px color-mix(in srgb, var(--st-color) 15%, transparent); }
.pmt-card.drag-over { border-color:var(--st-color); background:#fafaff; transform:scale(1.01); }

.pmt-card-drag {
  display:flex; align-items:center; padding:0 10px; color:#d1d5db; cursor:grab; flex-shrink:0;
  transition:color 0.15s; border-right:1px solid #f3f4f6;
}
.pmt-card-drag:hover { color:#6366f1; }
.pmt-card-drag:active { cursor:grabbing; }

.pmt-collapsed { display:flex; align-items:stretch; cursor:pointer; flex:1; min-width:0; }
.pmt-accent { width:4px; flex-shrink:0; }
.pmt-body { flex:1; padding:16px 18px; min-width:0; }
.pmt-header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
.pmt-title { font-size:15px; font-weight:700; color:#1f2937; margin:0; }
.pmt-tags { display:flex; gap:6px; flex-wrap:wrap; }
.pmt-tag { font-size:10px; padding:2px 8px; border-radius:5px; background:#eef2ff; color:#6366f1; font-weight:600; }
.pmt-preview { font-size:12px; color:#9ca3af; line-height:1.5; margin:0; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.pmt-chevron { display:flex; align-items:center; padding:0 12px; color:#9ca3af; flex-shrink:0; }
.pmt-actions-row { display:flex; align-items:center; gap:6px; padding:16px 12px 16px 4px; flex-shrink:0; }

.pmt-expanded { border-top:1px solid #e5e7eb; background:#fafafa; width:100%; }
.pmt-exp-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; background:color-mix(in srgb, var(--st-color) 8%, #fff); border-bottom:1px solid #e0e7ff; }
.pmt-exp-title { font-size:14px; font-weight:700; color:#374151; }
.pmt-exp-content { margin:0; padding:20px 24px; font-size:13px; line-height:1.7; color:#374151; font-family:'Courier New','PingFang SC',monospace; white-space:pre-wrap; word-wrap:break-word; max-height:600px; overflow-y:auto; background:#fff; }

.slide-enter-active, .slide-leave-active { transition:all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity:0; max-height:0; }
.slide-enter-to, .slide-leave-from { max-height:800px; }

/* ===== 步骤管理弹窗 ===== */
.step-manage-list { display:flex; flex-direction:column; gap:8px; }
.step-manage-item { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb; transition:all 0.15s; }
.step-manage-item:hover { border-color:#c7d2fe; }
.step-manage-item.drag-over { border-color:#6366f1; background:#eef2ff; }
.step-manage-drag { cursor:grab; color:#d1d5db; }
.step-manage-drag:hover { color:#6366f1; }
.step-manage-idx { font-size:12px; font-weight:800; color:#9ca3af; min-width:20px; text-align:center; }
.step-manage-input { flex:1; height:36px; padding:0 10px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; outline:none; }
.step-manage-input:focus { border-color:#6366f1; }
</style>
