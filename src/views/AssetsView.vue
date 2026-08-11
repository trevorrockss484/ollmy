<template>
  <div class="assets-page enterprise-page enterprise-page--wide">
    <!-- 页头 + Tab -->
    <div class="page-header">
      <div class="page-header-top">
        <div>
          <h2><el-icon :size="24"><PictureFilled /></el-icon> AI资产管理</h2>
          <p class="sub">{{ tab === 'assets' ? '上传 · 预览 · 下载 · 批量管理AI资产' : tab === 'library' ? '按剧集管理剧本与分镜 · 在线编辑 · 自动保存' : '按流程步骤查看 · 一键复制 · 在线编辑 · 步骤可自定义' }}</p>
        </div>
      </div>
      <div class="tab-bar">
        <button v-if="authStore.canAccessTab('prompts')" class="tab-btn" :class="{ active: tab === 'prompts' }" @click="switchTab('prompts')">
          <el-icon :size="16"><Document /></el-icon> AI提示词
          <span class="tab-n">{{ prompts.length }}</span>
        </button>
        <button v-if="authStore.canAccessTab('scripts')" class="tab-btn" :class="{ active: tab === 'library' }" @click="switchTab('library')">
          <el-icon :size="16"><Film /></el-icon> 剧本与分镜
          <span class="tab-n">{{ showScripts.length }}</span>
        </button>
        <button v-if="authStore.canAccessTab('assets')" class="tab-btn" :class="{ active: tab === 'assets' }" @click="switchTab('assets')">
          <el-icon :size="16"><PictureFilled /></el-icon> AI资产
          <span class="tab-n">{{ assets.length }}</span>
        </button>
      </div>
    </div>

    <!-- ==================== AI资产 Tab ==================== -->
    <div class="tab-body" v-show="tab === 'assets'">
      <!-- 工具栏 -->
      <div class="assets-toolbar">
        <div class="toolbar-left">
          <el-button v-if="authStore.canAdd(PAGE)" type="primary" class="tb-btn-primary" @click="openUpload">
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
          <el-select v-model="sortBy" size="small" style="width:110px;" class="sort-select">
            <el-option label="最新优先" value="date-desc" />
            <el-option label="最早优先" value="date-asc" />
            <el-option label="名称 A-Z" value="name-asc" />
            <el-option label="名称 Z-A" value="name-desc" />
            <el-option label="文件最大" value="size-desc" />
            <el-option label="文件最小" value="size-asc" />
            <el-option label="按分类" value="type-asc" />
          </el-select>
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
          <el-button v-if="authStore.canDelete(PAGE)" type="danger" round size="default" plain @click="batchDelete">
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
                <span v-for="t in a.tags.slice(0, 3)" :key="t" class="card-tag" @click.stop="searchText = t">{{ t }}</span>
              </span>
              <span class="card-size">{{ formatSize(a.fileSize) }}</span>
            </div>
            <span v-if="authStore.isAdmin() && a.userId && a.userId !== 'admin'" class="card-owner-tag" :title="'创建者: ' + a.userId">{{ a.userId }}</span>
          </div>
          <!-- 操作 -->
          <div class="card-footer">
            <button class="card-btn" title="查看" @click="preview(a)"><el-icon :size="16"><View /></el-icon></button>
            <a :href="authUrl(api.assets.downloadUrl(a.id))" class="card-btn card-btn-dl" title="下载" @click.stop>
              <el-icon :size="16"><Download /></el-icon>
            </a>
            <button v-if="authStore.canEdit(PAGE)" class="card-btn" title="编辑" @click="openEdit(a)"><el-icon :size="16"><Edit /></el-icon></button>
            <button v-if="authStore.canDelete(PAGE)" class="card-btn card-btn-del" title="删除" @click.stop="doDelete(a)"><el-icon :size="16"><Delete /></el-icon></button>
          </div>
        </div>
      </div>

      <!-- 资产 Lightbox -->
      <teleport to="body">
        <transition name="lightbox">
          <div v-if="previewAsset" class="lightbox-overlay" @click="closePreview">
            <!-- 左右切换箭头 -->
            <button v-if="filteredList.length > 1" class="lightbox-arrow lightbox-arrow--left"
              @click.stop="navigateAsset(-1)" title="上一个 (←)">
              <el-icon :size="28"><ArrowLeft /></el-icon>
            </button>
            <button v-if="filteredList.length > 1" class="lightbox-arrow lightbox-arrow--right"
              @click.stop="navigateAsset(1)" title="下一个 (→)">
              <el-icon :size="28"><ArrowRight /></el-icon>
            </button>
            <div class="lightbox-toolbar" @click.stop>
              <span class="lb-name">{{ previewAsset.name }}</span>
              <span class="lb-meta">{{ previewAsset.idx !== undefined ? (previewAsset.idx + 1) + ' / ' + filteredList.length + ' · ' : '' }}{{ typeLabel(previewAsset.type) }} · {{ formatSize(previewAsset.fileSize) }}</span>
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
      <el-dialog v-model="uploadOpen" title="上传资产" width="620px" top="4vh" class="asset-dialog" destroy-on-close>
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
              <span class="file-icon"><el-icon :size="20"><Microphone /></el-icon></span>
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
      <el-dialog v-model="editOpen" title="编辑资产" width="520px" top="4vh" class="asset-dialog" destroy-on-close>
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
    </div>

    <!-- ==================== 剧本与分镜 Tab ==================== -->
    <div class="tab-body" v-show="tab === 'library'">
      <!-- 剧集选择栏 -->
      <div class="scripts-toolbar">
        <div class="scripts-shows-bar">
          <div v-for="show in showList" :key="show" class="show-pill"
            :class="{ active: activeShow === show }"
            :title="showEditTimes[show] ? '最后编辑：' + showEditTimes[show] : '暂无编辑记录'"
            @click="selectShow(show)">
            <el-icon :size="14"><VideoCamera /></el-icon>
            <span>{{ show }}</span>
            <span v-if="authStore.canDelete(PAGE)" class="show-pill-del" @click.stop="confirmDeleteShow(show)"><el-icon :size="12"><Close /></el-icon></span>
          </div>
          <span v-if="authStore.canAdd(PAGE)" class="show-pill show-pill--add" @click="openCreateShowDialog">
            <el-icon :size="16"><Plus /></el-icon> 新增剧集
          </span>
        </div>
        <div class="scripts-toolbar-right">
          <span class="scripts-save-status" v-if="saveStatus">
            <span class="save-dot" :class="{ saved: saveStatus === 'saved', saving: saveStatus === 'saving' }"></span>
            {{ saveStatus === 'saving' ? '保存中...' : '已保存' }}
          </span>
        </div>
      </div>

      <!-- 新增剧集弹窗（可附加上传文件） -->
      <el-dialog v-model="showAddDialog" title="新增剧集" width="560px" top="4vh" class="asset-dialog" destroy-on-close
        @opened="onShowDialogOpened" @closed="onShowDialogClosed">
        <el-input v-model="newShowName" placeholder="输入剧集名称，如：庆余年、甄嬛传"
          @keyup.enter="addShow" ref="showNameInput" :disabled="showAdding" size="large" />
        <div style="margin-top:14px;">
          <el-button size="small" link @click="showFileDrop = !showFileDrop" style="padding:0;font-size:12px;">
            <el-icon :size="14"><Plus /></el-icon> {{ showFileDrop ? '取消上传文件' : '附加上传 .doc / .docx / .txt 文件' }}
          </el-button>
        </div>
        <template v-if="showFileDrop">
          <div class="upload-two-cols">
            <!-- 剧本文件 -->
            <div class="upload-slot" @click="uploadSlotClick('script')">
              <div class="drop-zone drop-zone-sm" :class="{ dragover: dragOverSlot === 'script' }"
                @dragover.prevent="dragOverSlot = 'script'" @dragleave="dragOverSlot = ''"
                @drop.prevent="onSlotDrop($event, 'script')">
                <template v-if="newShowFiles.script">
                  <div class="slot-file">
                    <span>📄</span>
                    <div class="slot-file-info">
                      <p>{{ newShowFiles.script.name }}</p>
                      <span>{{ formatSize(newShowFiles.script.size) }} · {{ (newShowFiles.script.name).split('.').pop().toUpperCase() }}</span>
                    </div>
                    <el-button size="small" circle text @click.stop="newShowFiles.script = null"><el-icon :size="14"><Close /></el-icon></el-button>
                  </div>
                </template>
                <template v-else>
                  <el-icon :size="22"><Upload /></el-icon>
                  <p>剧本文件</p>
                </template>
              </div>
            </div>
            <!-- 分镜文件 -->
            <div class="upload-slot" @click="uploadSlotClick('storyboard')">
              <div class="drop-zone drop-zone-sm" :class="{ dragover: dragOverSlot === 'storyboard' }"
                @dragover.prevent="dragOverSlot = 'storyboard'" @dragleave="dragOverSlot = ''"
                @drop.prevent="onSlotDrop($event, 'storyboard')">
                <template v-if="newShowFiles.storyboard">
                  <div class="slot-file">
                    <span>📄</span>
                    <div class="slot-file-info">
                      <p>{{ newShowFiles.storyboard.name }}</p>
                      <span>{{ formatSize(newShowFiles.storyboard.size) }} · {{ (newShowFiles.storyboard.name).split('.').pop().toUpperCase() }}</span>
                    </div>
                    <el-button size="small" circle text @click.stop="newShowFiles.storyboard = null"><el-icon :size="14"><Close /></el-icon></el-button>
                  </div>
                </template>
                <template v-else>
                  <el-icon :size="22"><Upload /></el-icon>
                  <p>分镜文件</p>
                </template>
              </div>
            </div>
          </div>
          <input ref="fileDropInput" type="file" accept=".doc,.docx,.txt" style="display:none"
            @change="onSlotFileChange" />
        </template>
        <template #footer>
          <el-button @click="showAddDialog = false" :disabled="showAdding">取消</el-button>
          <el-button v-if="authStore.canAdd(PAGE)" type="primary" @click="addShow" :disabled="!newShowName.trim() || showAdding" :loading="showAdding">
            <el-icon :size="14"><Plus /></el-icon>
            {{ hasAnyFile ? '创建并提取内容' : '创建空剧集' }}
          </el-button>
        </template>
      </el-dialog>

      <!-- 删除确认弹窗 -->
      <el-dialog v-model="showDeleteDialog" title="删除剧集" width="420px" top="4vh" class="asset-dialog" destroy-on-close>
        <p style="color:#6b7280;font-size:14px;">确定要删除 <b style="color:#1f2937;">{{ deletingShow }}</b> 吗？</p>
        <p style="color:#9ca3af;font-size:12px;">该剧的剧本和分镜将被永久删除，无法恢复</p>
        <template #footer>
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button v-if="authStore.canDelete(PAGE)" type="danger" @click="deleteShow(deletingShow)">
            <el-icon :size="14"><Delete /></el-icon> 确认删除
          </el-button>
        </template>
      </el-dialog>

      <!-- 空状态 -->
      <div v-if="!activeShow" class="empty-state" style="padding:80px 20px;">
        <div class="empty-icon"><el-icon :size="56"><Film /></el-icon></div>
        <p class="empty-text">选择或新增一部剧集开始</p>
        <el-button type="primary" round @click="showAddDialog = true" style="margin-top:12px;">
          <el-icon :size="16"><Plus /></el-icon> 新增剧集
        </el-button>
      </div>

      <!-- 双栏编辑区 -->
      <div v-else class="scripts-edit-panels">
        <!-- 左：剧本 -->
        <div class="script-panel">
          <div class="panel-header">
            <div class="panel-title">
              <el-icon :size="18"><Document /></el-icon> 剧本
              <span class="panel-word-count">{{ scriptStats }}</span>
            </div>
            <div class="panel-actions">
              <el-button size="small" round @click="scriptPreview = !scriptPreview">
                <el-icon :size="13"><View /></el-icon> {{ scriptPreview ? '编辑' : '预览' }}
              </el-button>
              <el-button v-if="authStore.canEdit(PAGE)" size="small" round @click="downloadScript('script')">
                <el-icon :size="13"><Download /></el-icon> 下载
              </el-button>
            </div>
          </div>
          <div class="script-edit-body">
            <pre class="script-line-nums">{{ scriptLineNums }}</pre>
            <textarea v-show="!scriptPreview"
              v-model="scriptDraft"
              class="script-native-textarea"
              placeholder="在此编写或粘贴剧本内容..."
              @scroll.passive="onScriptScroll('script', $event)"
              @input="onScriptEdit('script', $event.target.value)"
              ref="scriptTextareaRef"
              :disabled="!authStore.canEdit(PAGE)"
            ></textarea>
            <div v-show="scriptPreview" class="script-preview-content" v-html="renderedScript || fallbackPreviewHtml"
              @scroll="onPreviewScroll('script', $event)"></div>
          </div>
        </div>

        <!-- 右：分镜 -->
        <div class="script-panel">
          <div class="panel-header">
            <div class="panel-title">
              <el-icon :size="18"><PictureFilled /></el-icon> 分镜
              <span class="panel-word-count">{{ storyboardStats }}</span>
            </div>
            <div class="panel-actions">
              <el-button size="small" round @click="storyboardPreview = !storyboardPreview">
                <el-icon :size="13"><View /></el-icon> {{ storyboardPreview ? '编辑' : '预览' }}
              </el-button>
              <el-button v-if="authStore.canEdit(PAGE)" size="small" round @click="downloadScript('storyboard')">
                <el-icon :size="13"><Download /></el-icon> 下载
              </el-button>
            </div>
          </div>
          <div class="script-edit-body">
            <pre class="script-line-nums">{{ storyboardLineNums }}</pre>
            <textarea v-show="!storyboardPreview"
              v-model="storyboardDraft"
              class="script-native-textarea"
              placeholder="在此编写或粘贴分镜内容..."
              @scroll.passive="onScriptScroll('storyboard', $event)"
              @input="onScriptEdit('storyboard', $event.target.value)"
              ref="storyboardTextareaRef"
          :disabled="!authStore.canEdit(PAGE)"
          ></textarea>
          <div v-show="storyboardPreview" class="script-preview-content" v-html="renderedStoryboard || fallbackPreviewHtml"
            @scroll="onPreviewScroll('storyboard', $event)"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- ==================== AI提示词 Tab ==================== -->
    <div class="tab-body" v-show="tab === 'prompts'">
      <div class="prompts-layout">
        <!-- 左侧步骤导航 -->
        <aside class="prompts-sidebar">
          <div class="sidebar-header">
            <h3>流程步骤</h3>
            <el-button v-if="authStore.canEdit(PAGE)" size="small" text @click="pmtOpenStepManager">
              <el-icon :size="14"><Setting /></el-icon> 管理
            </el-button>
          </div>
          <div class="sidebar-list">
            <div class="sidebar-step sidebar-step-all" :class="{ active: pmtActiveStep === '' }"
              @click="pmtActiveStep = ''">
              <span class="sidebar-step-dot" style="background:#6366f1">全</span>
              <span class="sidebar-step-label">全部模板</span>
              <span class="sidebar-step-n">{{ prompts.length }}</span>
            </div>
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

        <!-- 右侧内容：列表+阅读双栏 -->
        <div class="prompts-main">
          <!-- 顶部操作栏 -->
          <div class="prompts-topbar">
            <div class="toolbar-left">
              <el-button v-if="authStore.canAdd(PAGE)" type="primary" class="tb-btn-primary" @click="pmtOpenAdd">
                <el-icon :size="16"><Plus /></el-icon> 新增模板
              </el-button>
              <span class="tb-count">{{ pmtFiltered.length }} 条</span>
            </div>
            <div class="toolbar-right">
              <el-button size="small" @click="pmtExport">导出</el-button>
              <el-button v-if="authStore.canAdd(PAGE)" size="small" @click="pmtImportInput?.click()">导入</el-button>
              <input ref="pmtImportInput" type="file" accept=".json" style="display:none" @change="pmtImport" />
              <div class="assets-search-box">
                <el-icon :size="15" class="search-icon"><Search /></el-icon>
                <input v-model="pmtSearch" class="search-input" placeholder="搜索标题或标签..." />
                <span v-if="pmtSearch" class="search-clear" @click="pmtSearch = ''"><el-icon :size="13"><Close /></el-icon></span>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!pmtFiltered.length" class="empty-state" style="padding:40px;">
            <div class="empty-icon"><el-icon :size="48"><Document /></el-icon></div>
            <p class="empty-text">暂无提示词模板</p>
            <el-button type="primary" round @click="pmtOpenAdd">创建第一个模板</el-button>
          </div>

          <!-- 双栏：左侧列表 + 右侧阅读 -->
          <div v-else class="pmt-split-layout" ref="pmtListRef">
            <!-- 左侧：卡片列表 -->
            <div class="pmt-list-panel">
              <div v-for="(p, idx) in pmtFiltered" :key="p.id"
                :class="['pmt-item', { active: pmtActiveId === p.id }]"
                :style="{ '--st-color': pmtStepColor(p.step) }"
                draggable="true"
                @dragstart="pmtDragStart($event, idx)"
                @dragover.prevent="pmtDragOver($event, idx)"
                @dragleave="pmtDragLeave($event)"
                @drop="pmtDrop($event, idx)"
                @dragend="pmtDragEnd"
                @click="pmtActiveId = p.id">
                <div class="pmt-item-body">
                  <div class="pmt-item-top">
                    <span class="pmt-item-step-badge" :style="{ background: pmtStepColor(p.step) }">{{ pmtStepLabel(p.step) }}</span>
                    <span class="pmt-item-drag" @click.stop title="拖拽排序"><el-icon :size="12"><Rank /></el-icon></span>
                  </div>
                  <div class="pmt-item-title">{{ p.title }}</div>
                  <div class="pmt-item-preview">{{ pmtPreview(p.content) }}</div>
                  <div class="pmt-item-meta" v-if="p.tags && p.tags.length">
                    <span v-for="t in p.tags.slice(0,2)" :key="t" class="pmt-item-tag">{{ t }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：阅读面板 -->
            <div class="pmt-reader-panel" v-if="pmtActiveItem">
              <div class="pmt-reader-toolbar">
                <div class="pmt-reader-title">{{ pmtActiveItem.title }}</div>
                <div class="pmt-reader-actions">
                  <el-button type="primary" size="small" round @click="pmtDoCopy(pmtActiveItem)">
                    <el-icon><DocumentCopy /></el-icon> 复制全文
                  </el-button>
                  <el-button v-if="authStore.canEdit(PAGE)" size="small" round @click="pmtOpenEdit(pmtActiveItem)">
                    <el-icon><Edit /></el-icon> 编辑
                  </el-button>
                  <el-button v-if="authStore.canDelete(PAGE)" size="small" round type="danger" plain @click="pmtDeleteCard(pmtActiveItem)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <div class="pmt-reader-tags" v-if="pmtActiveItem.tags && pmtActiveItem.tags.length">
                <el-tag v-for="t in pmtActiveItem.tags" :key="t" size="small" effect="plain" round>{{ t }}</el-tag>
              </div>
              <div class="pmt-reader-content-wrap">
                <div class="pmt-reader-content" v-html="pmtRenderedHtml || fallbackHtml"></div>
              </div>
            </div>
            <div v-else class="pmt-reader-empty">
              <el-icon :size="48"><View /></el-icon>
              <p>点击左侧模板查看内容</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示词编辑弹窗 -->
      <el-dialog v-model="pmtDialogOpen" :title="pmtIsEditing ? '编辑模板' : '新增模板'" width="720px" top="4vh" class="asset-dialog" destroy-on-close>
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
            <el-input v-model="pmtForm.content" type="textarea" :autosize="{ minRows: 8, maxRows: 16 }" placeholder="粘贴提示词内容..." />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button v-if="pmtIsEditing && authStore.canDelete(PAGE)" type="danger" @click="pmtDoDelete" style="margin-right:auto;">
            <el-icon :size="14"><Delete /></el-icon> 删除
          </el-button>
          <el-button @click="pmtDialogOpen = false">取消</el-button>
          <el-button v-if="authStore.canEdit(PAGE)" type="primary" @click="pmtDoSave"><el-icon :size="14"><Check /></el-icon> 保存</el-button>
        </template>
      </el-dialog>

      <!-- 步骤管理弹窗 -->
      <el-dialog v-model="pmtStepDialog" title="管理流程步骤" width="560px" top="4vh" class="asset-dialog" destroy-on-close>
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
          <el-button v-if="authStore.canEdit(PAGE)" type="primary" @click="pmtSaveSteps">保存步骤配置</el-button>
        </template>
      </el-dialog>
    </div>

    <!-- ==================== 全局搜索 Cmd+K ==================== -->
    <teleport to="body">
      <el-dialog v-model="globalSearchOpen" title="全局搜索" width="560px" top="4vh" class="asset-dialog" destroy-on-close draggable
        @opened="onGlobalSearchOpened" @closed="globalSearchQ = ''">
        <el-input v-model="globalSearchQ" placeholder="输入关键词搜索所有AI资产、剧本、提示词..."
          size="large" ref="globalSearchInput" clearable @input="onGlobalSearchInput">
          <template #prefix><el-icon :size="18"><Search /></el-icon></template>
        </el-input>
        <div v-if="globalSearchQ" style="margin-top:12px;max-height:360px;overflow-y:auto;">
          <p style="font-size:12px;color:#9ca3af;margin-bottom:8px;">{{ globalSearchTotal }} 条结果</p>
          <div v-for="r in globalResults" :key="r.id"
            class="gs-item" @click="globalNavigateTo(r)">
            <span class="gs-badge" :style="{background:r._color||'#6366f1'}">{{ r._source }}</span>
            <span class="gs-title">{{ r._label }}</span>
            <span class="gs-detail" v-if="r._detail">{{ r._detail }}</span>
          </div>
          <div v-if="!globalResults.length" style="text-align:center;padding:24px;color:#9ca3af;">
            <p>无匹配结果</p>
          </div>
        </div>
        <div v-else style="text-align:center;padding:32px;color:#c7d2fe;">
          <el-icon :size="40" style="margin-bottom:8px;"><Search /></el-icon>
          <p style="font-size:13px;">输入关键词开始搜索…</p>
          <p style="font-size:11px;color:#e0e7ff;">跨 AI资产 · 剧本 · 分镜 · 提示词</p>
        </div>
      </el-dialog>
    </teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt({ breaks: true, linkify: true })
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { api, formatSize, authUrl } from '../api'

const authStore = useAuthStore()
const PAGE = '/assets'

// ===== Tab =====
const tab = ref('assets')
// 初始化：选择第一个有权限的 Tab
function getDefaultTab() {
  if (authStore.canAccessTab('prompts')) return 'prompts'
  if (authStore.canAccessTab('scripts')) return 'library'
  if (authStore.canAccessTab('assets')) return 'assets'
  return 'prompts'
}
tab.value = getDefaultTab()
async function switchTab(newTab) {
  if (newTab === tab.value) return
  // 离开剧本Tab时检查未保存内容
  if (tab.value === 'library' && pendingSaveDirty && activeShow.value) {
    try {
      await ElMessageBox.confirm('当前剧集有未保存的修改，是否保存后切换？', '提示', {
        confirmButtonText: '保存并切换', cancelButtonText: '取消', type: 'warning'
      })
      await flushPendingSave()
      ElMessage.success('已保存')
    } catch { return }
  }
  if (tab.value === 'library') { saveScrollPositions(); localStorage.setItem('script_activeShow', activeShow.value || '') }
  closePreview()
  tab.value = newTab
  if (newTab === 'library' && activeShow.value) {
    nextTick(() => { nextTick(() => { setTimeout(() => { restoreScrollPositions() }, 300) }) })
  }
}
watch(tab, () => {}) // 保留 watch 占位，实际逻辑已在 switchTab

// ===== 全局搜索 =====
const globalSearchOpen = ref(false)
const globalSearchQ = ref('')
const globalSearchInput = ref(null)
const debounceTimer = ref(null)
const globalResults = ref([])
const globalSearchTotal = computed(() => globalResults.value.length)

function onGlobalSearchOpened() { nextTick(() => globalSearchInput.value?.focus()) }
function onGlobalSearchInput() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => doGlobalSearch(), 200)
}
function doGlobalSearch() {
  const q = globalSearchQ.value.toLowerCase().trim()
  if (!q) { globalResults.value = []; return }
  const results = []
  // AI资产
  for (const a of assets.value) {
    if ((a.name || '').toLowerCase().includes(q) || (a.tags || []).some(t => t.toLowerCase().includes(q))) {
      results.push({ id: 'asset_' + a.id, _source: '资产', _color: '#a78bfa', _label: a.name, _detail: typeLabel(a.type) + ' · ' + formatSize(a.fileSize), _tab: 'assets', _assetId: a.id })
    }
  }
  // 剧本与分镜 - 按内容搜
  for (const s of showScripts.value) {
    if ((s.content || '').toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q) || (s.showName || '').toLowerCase().includes(q)) {
      const excerpt = (s.content || '').substring(Math.max(0, (s.content || '').toLowerCase().indexOf(q) - 30), (s.content || '').toLowerCase().indexOf(q) + q.length + 30).replace(/\n/g, ' ')
      results.push({ id: 'script_' + s.id, _source: s.type === 'script' ? '剧本' : '分镜', _color: s.type === 'script' ? '#6366f1' : '#f59e0b', _label: s.showName + ' · ' + s.title, _detail: '…' + excerpt + '…', _tab: 'library', _showName: s.showName })
    }
  }
  // 提示词
  for (const p of prompts.value) {
    if ((p.title || '').toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))) {
      const stepLabel = pmtSteps.value.find(st => st.key === p.step)?.label || p.step
      results.push({ id: 'prompt_' + p.id, _source: '提示词', _color: '#10b981', _label: p.title, _detail: stepLabel + ' · ' + pmtPreview(p.content), _tab: 'prompts', _promptId: p.id })
    }
  }
  globalResults.value = results.slice(0, 50)
}
async function globalNavigateTo(r) {
  globalSearchOpen.value = false
  globalSearchQ.value = ''
  await switchTab(r._tab)
  if (r._tab === 'assets' && r._assetId) {
    const a = assets.value.find(x => x.id === r._assetId)
    if (a) preview(a)
  } else if (r._tab === 'library' && r._showName) {
    selectShow(r._showName)
  } else if (r._tab === 'prompts' && r._promptId) {
    pmtActiveStep.value = prompts.value.find(p => p.id === r._promptId)?.step || pmtSteps.value[0]?.key
    await nextTick()
    pmtActiveId.value = r._promptId
  }
}

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
const TYPE_ORDER = { character: 0, voice: 1, video: 2, scene: 3, prop: 4 }
function typeColor(type) { return assetTypes.find(t => t.value === type)?.color || '#6366f1' }
function isVideo(a) { return a.mediaType === 'video' }
function isAudio(a) { return a.mediaType === 'audio' }
function isImage(a) { return !a.mediaType || a.mediaType === 'image' }
function mediaIcon(a) { return isVideo(a) ? 'VideoCamera' : isAudio(a) ? 'Microphone' : null }

const assets = ref([])
const activeType = ref('')
const searchText = ref('')
const sortBy = ref('date-desc')
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
  // 排序
  list = [...list].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc': return (a.name || '').localeCompare(b.name || '')
      case 'name-desc': return (b.name || '').localeCompare(a.name || '')
      case 'size-desc': return (b.fileSize || 0) - (a.fileSize || 0)
      case 'size-asc': return (a.fileSize || 0) - (b.fileSize || 0)
      case 'date-asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      case 'type-asc': return (TYPE_ORDER[a.type] || 99) - (TYPE_ORDER[b.type] || 99) || (a.name || '').localeCompare(b.name || '')
      case 'date-desc': default: return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    }
  })
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

function preview(a) {
  const idx = filteredList.value.findIndex(item => item.id === a.id)
  previewAsset.value = { ...a, idx }
}
function closePreview() { previewAsset.value = null }
function navigateAsset(dir) {
  if (!previewAsset.value) return
  const list = filteredList.value; if (!list.length) return
  let idx = list.findIndex(a => a.id === previewAsset.value.id)
  if (idx < 0) { idx = 0 } else { idx += dir; if (idx < 0) idx = list.length - 1; if (idx >= list.length) idx = 0 }
  previewAsset.value = { ...list[idx], idx }
}
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
  // Ctrl+K / Cmd+K：全局搜索
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault(); globalSearchOpen.value = true; return
  }
  // Ctrl+S：强制保存剧本/分镜
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (tab.value === 'library' && activeShow.value && pendingSaveDirty) {
      e.preventDefault(); flushPendingSave(); ElMessage.success('已保存')
    }
    return
  }
  if (e.key === 'Escape') {
    if (previewAsset.value) closePreview()
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (previewAsset.value) { navigateAsset(e.key === 'ArrowLeft' ? -1 : 1) }
  }
}
async function loadAssets() { const res = await api.assets.list(); if (res.success) assets.value = res.data }

// ===== 剧本与分镜 =====
const showScripts = ref([])
const activeShow = ref('')
const showList = computed(() => [...new Set(showScripts.value.map(s => s.showName).filter(Boolean))])
const saveStatus = ref('')
let saveTimer = null
let autoSaveSeq = 0
const showAddDialog = ref(false)
const showAdding = ref(false)
const showDeleteDialog = ref(false)
const deletingShow = ref('')
const newShowName = ref('')
const showNameInput = ref(null)
const showFileDrop = ref(false)
const newShowFiles = reactive({ script: null, storyboard: null })
const uploadSlotTarget = ref('script')
const fileDropInput = ref(null)
const dragOverSlot = ref('')
const hasAnyFile = computed(() => newShowFiles.script || newShowFiles.storyboard)
const scriptTextareaRef = ref(null)
const storyboardTextareaRef = ref(null)

// 本地草稿（用于textarea v-model，避免computed set问题）
const scriptDraft = ref('')
const storyboardDraft = ref('')
const showEditTimes = reactive({})  // { showName: 'HH:mm:ss' }
let pendingSaveDirty = false   // 标记是否有未保存的编辑
let scriptScrollRestored = false
let storyboardScrollRestored = false

const scriptRecord = computed(() => showScripts.value.find(s => s.showName === activeShow.value && s.type === 'script'))
const storyboardRecord = computed(() => showScripts.value.find(s => s.showName === activeShow.value && s.type === 'storyboard'))
const scriptStats = computed(() => {
  const t = scriptDraft.value || ''; const lines = t.split('\n').length
  return t.length + ' 字 · ' + lines + ' 行'
})
const storyboardStats = computed(() => {
  const t = storyboardDraft.value || ''; const lines = t.split('\n').length
  return t.length + ' 字 · ' + lines + ' 行'
})
const scriptLineNums = computed(() => {
  const lines = (scriptDraft.value || '').split('\n')
  return lines.map((_, i) => i + 1).join('\n')
})
const storyboardLineNums = computed(() => {
  const lines = (storyboardDraft.value || '').split('\n')
  return lines.map((_, i) => i + 1).join('\n')
})

// 预览模式
const scriptPreview = ref(false)
const storyboardPreview = ref(false)
const renderedScript = computed(() => scriptDraft.value ? md.render(scriptDraft.value) : '')
const renderedStoryboard = computed(() => storyboardDraft.value ? md.render(storyboardDraft.value) : '')
const fallbackPreviewHtml = '<span style="color:#9ca3af">(空内容)</span>'

function selectShow(name) {
  flushPendingSave()        // 切剧集前先保存当前草稿
  saveScrollPositions()
  activeShow.value = name
  localStorage.setItem('script_activeShow', name)
  saveStatus.value = ''
  pendingSaveDirty = false
  scriptPreview.value = false; storyboardPreview.value = false
  scriptScrollRestored = false; storyboardScrollRestored = false
  nextTick(() => {
    scriptDraft.value = scriptRecord.value?.content || ''
    storyboardDraft.value = storyboardRecord.value?.content || ''
    nextTick(() => { setTimeout(() => { restoreScrollPositions() }, 200) })
  })
}

function onShowDialogOpened() { nextTick(() => { showNameInput.value?.focus() }); showFileDrop.value = false; newShowFiles.script = null; newShowFiles.storyboard = null }
function onShowDialogClosed() { newShowFiles.script = null; newShowFiles.storyboard = null }

async function addShow() {
  const name = newShowName.value.trim()
  if (!name || showAdding.value) return
  if (showList.value.includes(name) && !hasAnyFile.value) {
    ElMessage.warning(`「${name}」已存在，已自动切换`)
    showAddDialog.value = false; newShowName.value = ''; selectShow(name); return
  }
  showAdding.value = true
  const scriptFile = newShowFiles.script
  const storyFile = newShowFiles.storyboard
  try {
    if (!showList.value.includes(name)) {
      await api.scripts.add({ showName: name, type: 'script', title: '剧本', content: '' })
      await api.scripts.add({ showName: name, type: 'storyboard', title: '分镜', content: '' })
    }
    await loadShowScripts()
    if (scriptFile) {
      const rec = showScripts.value.find(s => s.showName === name && s.type === 'script')
      if (rec) await uploadScriptFileContent(rec.id, scriptFile)
    }
    if (storyFile) {
      const rec = showScripts.value.find(s => s.showName === name && s.type === 'storyboard')
      if (rec) await uploadScriptFileContent(rec.id, storyFile)
    }
    // 重新加载以获取提取后的内容
    await loadShowScripts()
    newShowName.value = ''
    // 先设 activeShow 再关弹窗，避免 onShowDialogClosed 干扰
    activeShow.value = name
    localStorage.setItem('script_activeShow', name)
    scriptDraft.value = scriptRecord.value?.content || ''
    storyboardDraft.value = storyboardRecord.value?.content || ''
    showAddDialog.value = false
    const count = (scriptFile ? 1 : 0) + (storyFile ? 1 : 0)
    ElMessage.success(`「${name}」创建成功` + (count ? `，已提取 ${count} 个文件` : ''))
  } finally {
    showAdding.value = false
  }
}

async function uploadScriptFileContent(recordId, file) {
  const formData = new FormData(); formData.append('file', file)
  const token = localStorage.getItem('pan_token') || ''
  const res = await fetch('/api/scripts/' + recordId + '/upload', {
    method: 'POST', headers: { 'X-Auth-Token': token }, body: formData
  })
  const data = await res.json()
  if (!data.success) { ElMessage.error(data.error || '提取失败') }
}

function uploadSlotClick(type) { uploadSlotTarget.value = type; fileDropInput.value?.click() }
function onSlotDrop(e, type) { dragOverSlot.value = ''; const f = e.dataTransfer.files?.[0]; if (f) newShowFiles[type] = f }
function onSlotFileChange(e) { const f = e.target.files?.[0]; e.target.value = ''; if (f) newShowFiles[uploadSlotTarget.value] = f }

function openCreateShowDialog() {
  showFileDrop.value = false
  newShowFiles.script = null; newShowFiles.storyboard = null
  showAddDialog.value = true
}

function confirmDeleteShow(name) { deletingShow.value = name; showDeleteDialog.value = true }

async function deleteShow(name) {
  const items = showScripts.value.filter(s => s.showName === name)
  for (const item of items) await api.scripts.delete(item.id)
  if (activeShow.value === name) { activeShow.value = ''; scriptDraft.value = ''; storyboardDraft.value = ''; localStorage.removeItem('script_activeShow') }
  clearScrollPos(name)
  showDeleteDialog.value = false
  await loadShowScripts()
}

// 滚动位置记忆
function scrollKey(show, type) { return 'script_scroll_' + show + '_' + type }
function clearScrollPos(show) {
  localStorage.removeItem(scrollKey(show, 'script'))
  localStorage.removeItem(scrollKey(show, 'storyboard'))
}
function onScriptScroll(type, e) {
  syncLineNumScroll(e.target)
  try { localStorage.setItem(scrollKey(activeShow.value, type), JSON.stringify({ top: e.target.scrollTop, ts: Date.now() })) } catch {}
}
function onPreviewScroll(type, e) {
  syncLineNumScroll(e.target)
  try { localStorage.setItem(scrollKey(activeShow.value, type), JSON.stringify({ top: e.target.scrollTop, ts: Date.now() })) } catch {}
}
function syncLineNumScroll(el) {
  const wrap = el.parentElement
  if (wrap) {
    const nums = wrap.querySelector('.script-line-nums')
    if (nums) nums.scrollTop = el.scrollTop
  }
}
function saveScrollPositions() {
  try {
    const scriptEl = scriptTextareaRef.value; const storyEl = storyboardTextareaRef.value
    const show = activeShow.value; if (!show) return
    if (scriptEl && scriptEl.scrollTop > 0) localStorage.setItem(scrollKey(show, 'script'), JSON.stringify({ top: scriptEl.scrollTop, ts: Date.now() }))
    if (storyEl && storyEl.scrollTop > 0) localStorage.setItem(scrollKey(show, 'storyboard'), JSON.stringify({ top: storyEl.scrollTop, ts: Date.now() }))
  } catch {}
}
function restoreScrollPositions(maxRetry = 5) {
  const show = activeShow.value; if (!show) return
  try {
    const sData = JSON.parse(localStorage.getItem(scrollKey(show, 'script')) || '{}')
    const bData = JSON.parse(localStorage.getItem(scrollKey(show, 'storyboard')) || '{}')
    const scriptEl = scriptTextareaRef.value; const storyEl = storyboardTextareaRef.value

    if ((sData.top > 0 && !scriptEl) || (bData.top > 0 && !storyEl)) {
      // DOM 还没渲染完毕，重试
      if (maxRetry > 0) { setTimeout(() => { restoreScrollPositions(maxRetry - 1) }, 100) }
      return
    }
    if (scriptEl && sData.top > 0) { scriptEl.scrollTop = sData.top }
    if (storyEl && bData.top > 0) { storyEl.scrollTop = bData.top }
  } catch {}
}

// 下载
function downloadScript(type) {
  const record = type === 'script' ? scriptRecord.value : storyboardRecord.value
  const content = type === 'script' ? scriptDraft.value : storyboardDraft.value
  if (!record) return
  const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = (activeShow.value || 'script') + '_' + (type === 'script' ? '剧本' : '分镜') + '.txt'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('已下载')
}

function onScriptEdit(type, val) {
  const record = type === 'script' ? scriptRecord.value : storyboardRecord.value
  if (!record) return
  pendingSaveDirty = true
  saveStatus.value = 'saving'
  if (saveTimer) clearTimeout(saveTimer)
  const seq = ++autoSaveSeq
  // 乐观更新本地内存
  const idx = showScripts.value.findIndex(s => s.id === record.id)
  if (idx >= 0) showScripts.value[idx] = { ...record, content: val }
  saveTimer = setTimeout(async () => {
    await api.scripts.update(record.id, { ...record, content: val })
    if (seq === autoSaveSeq) {
      saveStatus.value = 'saved'; pendingSaveDirty = false
      showEditTimes[activeShow.value] = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  }, 1500)
}

// 立即刷新待保存的草稿（切换剧集/关闭页面前调用）
async function flushPendingSave() {
  if (!saveTimer || !pendingSaveDirty) return
  clearTimeout(saveTimer)
  saveTimer = null
  pendingSaveDirty = false
  const scriptRec = scriptRecord.value
  const storyRec = storyboardRecord.value
  if (scriptRec) {
    await api.scripts.update(scriptRec.id, { ...scriptRec, content: scriptDraft.value })
  }
  if (storyRec) {
    await api.scripts.update(storyRec.id, { ...storyRec, content: storyboardDraft.value })
  }
  saveStatus.value = 'saved'
  showEditTimes[activeShow.value] = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadShowScripts() {
  const res = await api.scripts.list()
  if (res.success) {
    showScripts.value = res.data
    const savedShow = localStorage.getItem('script_activeShow')
    if (savedShow && showList.value.includes(savedShow)) {
      activeShow.value = savedShow
    } else if (!activeShow.value || !showList.value.includes(activeShow.value)) {
      activeShow.value = showList.value[0] || ''
    }
    // 恢复内容和滚动位置
    if (activeShow.value) {
      await nextTick()
      scriptDraft.value = scriptRecord.value?.content || ''
      storyboardDraft.value = storyboardRecord.value?.content || ''
      pendingSaveDirty = false
      await nextTick()
      setTimeout(() => { restoreScrollPositions() }, 250)
    }
  }
}

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
const pmtActiveStep = ref('')  // '' = 全部
const pmtActiveId = ref(null)

const pmtActiveItem = computed(() => prompts.value.find(p => p.id === pmtActiveId.value) || null)

// Markdown → HTML（使用 markdown-it）
function renderMarkdown(text) {
  if (!text) return ''
  return md.render(text)
}
const pmtRenderedHtml = computed(() => renderMarkdown(pmtActiveItem.value?.content || ''))
const fallbackHtml = '<span style="color:#9ca3af">(空内容)</span>'

const pmtDialogOpen = ref(false)
const pmtIsEditing = ref(false)
const pmtEditingId = ref(null)
const pmtSearch = ref('')
const pmtSortBy = ref('default')
const pmtStepDialog = ref(false)
const pmtStepsDraft = ref([])
const pmtImportInput = ref(null)
const pmtForm = reactive({ title: '', step: '', tagsStr: '', content: '' })

// 拖拽状态
const pmtDragIdx = ref(-1)
const pmtDragOverIdx = ref(-1)
const stepDragIdx = ref(-1)
const stepDragOverIdx = ref(-1)
const pmtListRef = ref(null)

const pmtFiltered = computed(() => {
  let list = pmtActiveStep.value ? prompts.value.filter(p => p.step === pmtActiveStep.value) : prompts.value
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
function pmtStepLabel(key) {
  const found = pmtSteps.value.find(s => s.key === key)
  return found?.label || '未分类'
}
function pmtPreview(content) {
  if (!content) return '(空内容)'
  return content.replace(/\n/g, '  ')
}

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
  pmtForm.title = ''; pmtForm.step = pmtActiveStep.value || pmtSteps.value[0]?.key || ''; pmtForm.tagsStr = ''; pmtForm.content = ''
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
  try { const res = await api.prompts.delete(p.id); if (res.success) { ElMessage.success('已删除'); if (pmtActiveId.value === p.id) pmtActiveId.value = null; loadPrompts() } else ElMessage.error('删除失败') } catch { ElMessage.error('删除失败') }
}

// 导入导出
function pmtExport() {
  const data = prompts.value.map(p => ({ title: p.title, step: p.step, content: p.content, tags: p.tags || [] }))
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '提示词模板_' + new Date().toISOString().slice(0,10) + '.json'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${data.length} 条模板`)
}
async function pmtImport(e) {
  const file = e.target.files?.[0]; e.target.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const items = JSON.parse(text)
    if (!Array.isArray(items)) { ElMessage.error('格式错误：需要 JSON 数组'); return }
    const supportedSteps = pmtSteps.value.map(s => s.key)
    let added = 0
    for (const item of items) {
      const step = supportedSteps.includes(item.step) ? item.step : supportedSteps[0]
      await api.prompts.add({ title: item.title || '未命名', step, content: item.content || '', tags: Array.isArray(item.tags) ? item.tags : [] })
      added++
    }
    ElMessage.success(`已导入 ${added} 条模板`)
    await loadPrompts()
  } catch (err) { ElMessage.error('导入失败：文件格式错误') }
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

// 选中变化时自动选第一个
watch(() => pmtFiltered.value, (list) => {
  if (list.length && (!pmtActiveId.value || !list.find(p => p.id === pmtActiveId.value))) {
    pmtActiveId.value = list[0]?.id || null
  }
})
watch(pmtActiveStep, () => { pmtActiveId.value = null; nextTick(() => { if (pmtFiltered.value.length) pmtActiveId.value = pmtFiltered.value[0].id }) })

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
  } else {
    pmtSteps.value = [...DEFAULT_STEPS]
  }
}

function onBeforeUnload() { flushPendingSave(); saveScrollPositions(); localStorage.setItem('script_activeShow', activeShow.value || '') }
onMounted(() => { loadAssets(); loadShowScripts(); loadPromptSteps().then(() => loadPrompts()); document.addEventListener("keydown", onKeyDown); window.addEventListener("beforeunload", onBeforeUnload) })
onUnmounted(() => { saveScrollPositions(); localStorage.setItem('script_activeShow', activeShow.value || ''); document.removeEventListener("keydown", onKeyDown); window.removeEventListener("beforeunload", onBeforeUnload) })
</script>

<style scoped>
.assets-page { animation: fadeIn .3s ease; display:flex; flex-direction:column; height:100%; }
.tab-body { flex:1; min-height:0; display:flex; flex-direction:column; }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

/* ===== 页头 + Tab ===== */
.page-header { margin-bottom:24px; flex-shrink:0; }
.page-header-top { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; }
.page-header h2 { font-size:var(--text-2xl); font-weight:800; display:flex; align-items:center; gap:var(--space-3); margin:0; color:var(--text-primary); letter-spacing:-.3px; }
.page-header .sub { font-size:13px; color:#6b7280; margin-top:4px; }

.tab-bar { display: flex; gap: 8px; margin-top: 16px; }
.tab-btn {
  padding: 11px 22px; border-radius: 14px; border: 2px solid #e5e7eb;
  background: var(--surface-card); font-size: 14px; font-weight: 700; color: var(--text-secondary); cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.tab-btn:hover { border-color: #a5b4fc; color: #6366f1; transform: translateY(-1px); }
.tab-btn.active { border-color: #6366f1; background: linear-gradient(135deg, #eef2ff, #e0e7ff); color: #4338ca; box-shadow: 0 2px 8px rgba(99,102,241,.15); }
.tab-icon { font-size: 16px; }
.tab-n { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 12px; background: #f3f4f6; color: #6b7280; min-width: 22px; text-align: center; }
.tab-btn.active .tab-n { background: #c7d2fe; color: #4338ca; }

/* ===== 通用工具栏 ===== */
.assets-toolbar, .library-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; padding:12px 18px; background:var(--surface-card); border-radius:14px; border:1px solid var(--border-default); box-shadow:var(--shadow-xs); flex-shrink:0; }
.toolbar-left, .toolbar-center, .toolbar-right { display:flex; align-items:center; gap:10px; }
.toolbar-center { flex:1; }
.toolbar-left { flex-shrink:0; }
.toolbar-right { flex-shrink:0; }

/* ===== 剧本与分镜 ===== */
.scripts-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:16px; gap:12px; flex-wrap:wrap; flex-shrink:0;
}
.scripts-shows-bar { display:flex; gap:8px; flex-wrap:wrap; flex:1; }
.show-pill {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 16px; border-radius:10px;
  border:1.5px solid var(--border-default); background:var(--surface-card);
  font-size:13px; font-weight:600; color:#374151;
  cursor:pointer; transition:all .15s; user-select:none;
}
.show-pill:hover { border-color:#6366f1; background:#f5f3ff; color:#6366f1; }
.show-pill.active { background:#6366f1; border-color:#6366f1; color:#fff; }
.show-pill.active .show-pill-del { opacity:.6; }
.show-pill.active .show-pill-del:hover { opacity:1; background:rgba(255,255,255,.2); }
.show-pill--add {
  border-style:dashed; color:#6366f1; font-weight:600;
  background:linear-gradient(135deg, #f5f3ff, #eef2ff);
}
.show-pill--add:hover { color:#fff; border-color:#6366f1; background:#6366f1; }
.show-pill-del {
  display:inline-flex; align-items:center; justify-content:center;
  width:18px; height:18px; border-radius:50%; margin-left:2px;
  opacity:0; transition:all .12s;
}
.show-pill:hover .show-pill-del { opacity:.4; }
.show-pill-del:hover { opacity:1 !important; background:#fee2e2; color:#ef4444 !important; }

.scripts-toolbar-right { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.scripts-save-status {
  display:flex; align-items:center; gap:6px;
  font-size:12px; font-weight:600; color:#6b7280;
}
.save-dot { width:7px; height:7px; border-radius:50%; background:#d1d5db; }
.save-dot.saving { background:#f59e0b; animation:pulse 1s infinite; }
.save-dot.saved { background:#10b981; }

.scripts-edit-panels { display:grid; grid-template-columns:1fr 1fr; gap:16px; flex:1; min-height:0; }
.script-panel {
  background:var(--surface-card); border:1px solid var(--border-default); border-radius:14px;
  overflow:hidden; display:flex; flex-direction:column; min-height:0;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
.panel-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; background:var(--surface-hover,#fafafa); border-bottom:1px solid var(--border-subtle,#f3f4f6);
}
.panel-title {
  font-size:14px; font-weight:700; color:#1f2937;
  display:flex; align-items:center; gap:8px;
}
.panel-word-count { font-size:11px; font-weight:500; color:#9ca3af; margin-left:2px; }
.panel-actions { display:flex; gap:6px; }

.script-edit-body {
  flex:1; min-height:0; display:flex;
}
.script-line-nums {
  width:44px; flex-shrink:0; overflow:hidden;
  padding:16px 6px 16px 10px; margin:0;
  font-family:'SF Mono','Fira Code','Cascadia Code',ui-monospace,monospace;
  font-size:12px; line-height:24px; color:#c7d2fe; text-align:right;
  user-select:none; background:var(--surface-hover,#fafafa); border-right:1px solid var(--border-subtle,#f3f4f6);
  white-space:pre; pointer-events:none;
}
.script-native-textarea {
  flex:1; min-height:0;
  border:none; outline:none; resize:none;
  font-size:14px; line-height:24px; padding:16px 18px;
  color:var(--text-primary,#374151); font-family:'PingFang SC','Microsoft YaHei',sans-serif;
  background:var(--surface-card,#fff); overflow-y:auto;
}
.script-native-textarea::placeholder { color:#c7d2fe; }

.script-textarea { flex:1; }
.script-textarea :deep(.el-textarea__inner) {
  border:none !important; border-radius:0 !important;
  min-height:420px !important; resize:vertical;
  font-size:14px; line-height:1.8; padding:16px 18px;
  color:var(--text-primary,#374151); font-family:'PingFang SC','Microsoft YaHei',sans-serif;
  box-shadow:none !important;
}
.script-textarea :deep(.el-textarea__inner):focus { box-shadow:none !important; }

@media (max-width:768px) { .scripts-edit-panels { grid-template-columns:1fr; } }
.toolbar-left { display:flex; align-items:center; gap:10px; }
.toolbar-center { flex:1; display:flex; justify-content:center; }
.toolbar-right { display:flex; align-items:center; gap:10px; margin-left:auto; }
.tb-btn-primary { display:inline-flex !important; align-items:center; gap:6px; font-weight:700 !important; border-radius:10px !important; padding:9px 18px !important; font-size:14px !important; transition:all 0.2s !important; }
.tb-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.tb-count { font-size:14px; font-weight:700; color:#6366f1; padding:5px 12px; border-radius:8px; background:#eef2ff; white-space:nowrap; }

.assets-pills { display:flex; gap:4px; flex-wrap:wrap; }
.assets-pill { display:inline-flex; align-items:center; gap:5px; padding:7px 15px; border-radius:22px; border:1.5px solid var(--border-default); background:var(--surface-card); font-size:13px; font-weight:600; color:var(--text-secondary); cursor:pointer; transition:all 0.15s; }
.assets-pill:hover { border-color:#a5b4fc; color:#6366f1; }
.assets-pill.active { background:#eef2ff; border-color:#6366f1; color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.1); }
.pill-dot { width:8px; height:8px; border-radius:50%; }
.pill-n { font-size:11px; opacity:.7; }

.assets-search-box { position:relative; display:flex; align-items:center; min-width:200px; }
.search-icon { position:absolute; left:11px; color:#9ca3af; pointer-events:none; z-index:1; }
.search-input { width:100%; height:38px; padding:0 32px 0 34px; border:1.5px solid #e5e7eb; border-radius:10px; background:#f9fafb; font-size:13px; color:#374151; outline:none; transition:all 0.2s; }
.search-input:focus { border-color:#6366f1; background:var(--surface-input); box-shadow:0 0 0 3px rgba(99,102,241,.08); }
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
  position:relative; background:var(--surface-card); border:1.5px solid var(--border-default); border-radius:16px;
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
.card-tag { font-size:10px; padding:2px 7px; border-radius:4px; background:#eef2ff; color:#6366f1; font-weight:600; cursor:pointer; }
.card-tag:hover { background:#dbeafe; }
.card-size { font-size:11px; color:#9ca3af; white-space:nowrap; }
.card-owner-tag {
  display: inline-block; margin-top: 4px; padding: 1px 8px;
  border-radius: 4px; font-size: 10px; font-weight: 700;
  color: #6d28d9; background: #f3e8ff;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.card-footer { display:flex; gap:4px; padding:8px 16px 14px; border-top:1px solid #f3f4f6; }
.card-btn { width:34px; height:34px; border-radius:8px; border:1px solid var(--border-default); background:var(--surface-card); color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
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
.lightbox-arrow {
  position:absolute; top:50%; transform:translateY(-50%); z-index:10;
  width:48px; height:48px; border-radius:50%; border:none;
  background:rgba(255,255,255,.12); color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:background .15s; backdrop-filter:blur(4px);
}
.lightbox-arrow:hover { background:rgba(255,255,255,.25); }
.lightbox-arrow--left { left:16px; }
.lightbox-arrow--right { right:16px; }
.lightbox-enter-active, .lightbox-leave-active { transition:opacity .2s; }
.lightbox-enter-from, .lightbox-leave-to { opacity:0; }

/* ===== 弹窗统一样式：固定高度，防止溢出 ===== */
.asset-dialog :deep(.el-dialog) { display:flex; flex-direction:column; max-height:88vh; }
.asset-dialog :deep(.el-dialog__header) { flex-shrink:0; }
.asset-dialog :deep(.el-dialog__body) { flex:1; overflow-y:auto; min-height:0; padding:16px 20px; }
.asset-dialog :deep(.el-dialog__footer) { flex-shrink:0; }

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

.upload-two-cols { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; }
.upload-slot { cursor:pointer; min-width:0; }
.drop-zone-sm { padding:20px 12px !important; text-align:center; transition:all 0.2s; min-width:0; overflow:hidden; }
.drop-zone-sm p { margin:4px 0 0; font-size:12px; color:#9ca3af; }
.drop-zone-sm .el-icon { color:#9ca3af; }
.slot-file { display:flex; align-items:center; gap:6px; min-width:0; }
.slot-file > span { flex-shrink:0; }
.slot-file-info { flex:1; min-width:0; overflow:hidden; }
.slot-file-info p { font-size:11px !important; font-weight:600; color:#374151; margin:0 !important; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.slot-file-info span { font-size:10px; color:#9ca3af; }
.slot-file .el-button { flex-shrink:0; }

/* ===== AI提示词 ===== */
.prompts-layout { display:flex; gap:20px; flex:1; min-height:0; }

/* 左侧导航 */
.prompts-sidebar {
  width:220px; flex-shrink:0; background:var(--surface-card); border:1px solid var(--border-default); border-radius:14px;
  padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.03);
  display:flex; flex-direction:column; overflow:hidden;
}
.sidebar-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-shrink:0; }
.sidebar-header h3 { margin:0; font-size:14px; font-weight:700; color:#374151; }
.sidebar-list { display:flex; flex-direction:column; gap:4px; overflow-y:auto; flex:1; }
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
.sidebar-step-all { margin-bottom:6px; padding-bottom:12px; border-bottom:1px solid #f3f4f6; border-radius:0; }
.sidebar-step-all.active { background:#eef2ff; color:#6366f1; font-weight:700; }

/* 右侧主区域 */
.prompts-main { flex:1; min-width:0; display:flex; flex-direction:column; min-height:0; }
.prompts-topbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; padding:12px 18px; background:#fff; border-radius:14px; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.03); flex-shrink:0; }

/* 提示词双栏布局 */
.pmt-split-layout { display:flex; gap:0; flex:1; min-height:0; }

/* 左侧列表面板 */
.pmt-list-panel {
  width:320px; flex-shrink:0; overflow-y:auto; border-right:1px solid #e5e7eb;
  background:#fff; border-radius:14px 0 0 14px;
  display:flex; flex-direction:column; gap:2px; padding:4px;
}
.pmt-item {
  padding:12px 14px; border-radius:10px; cursor:pointer;
  transition:all .12s; border:1px solid transparent;
}
.pmt-item:hover { background:#f9fafb; border-color:#e5e7eb; }
.pmt-item.active { background:#eef2ff; border-color:#c7d2fe; }
.pmt-item.drag-over { border-color:var(--st-color); background:#fafaff; }

.pmt-item-body { min-width:0; }
.pmt-item-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
.pmt-item-step-badge {
  font-size:10px; font-weight:700; color:#fff; padding:1px 7px;
  border-radius:4px; white-space:nowrap; letter-spacing:.3px;
}
.pmt-item-drag {
  color:#c7d2fe; cursor:grab; flex-shrink:0; line-height:1;
  transition:color .12s;
}
.pmt-item-drag:hover { color:#6366f1; }

.pmt-item-title { font-size:14px; font-weight:700; color:#1f2937; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pmt-item.active .pmt-item-title { color:#4338ca; }
.pmt-item-preview {
  font-size:12px; color:#9ca3af; line-height:1.45; max-height:2.9em;
  overflow:hidden; margin-bottom:4px;
}
.pmt-item-meta { display:flex; gap:4px; flex-wrap:wrap; }
.pmt-item-tag {
  font-size:10px; padding:1px 6px; border-radius:4px; font-weight:600;
  background:#f3f4f6; color:#6b7280; white-space:nowrap;
}

/* 右侧阅读面板 */
.pmt-reader-panel {
  flex:1; min-width:0; display:flex; flex-direction:column;
  background:#fff; border-radius:0 14px 14px 0;
}
.pmt-reader-empty {
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:#fff; border-radius:0 14px 14px 0; color:#d1d5db; gap:12px;
  font-size:14px; color:#9ca3af;
}
.pmt-reader-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 20px; border-bottom:1px solid #f3f4f6;
  gap:12px; flex-wrap:wrap; flex-shrink:0;
}
.pmt-reader-title { font-size:16px; font-weight:700; color:#1f2937; }
.pmt-reader-actions { display:flex; gap:6px; flex-shrink:0; }
.pmt-reader-tags { padding:8px 20px 0; display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0; }
.pmt-reader-content-wrap { flex:1; overflow-y:auto; padding:4px 0; }
.pmt-reader-content {
  margin:0; padding:16px 24px 32px;
  font-size:15px; line-height:1.7; color:#1f2937;
  font-family:'PingFang SC','Microsoft YaHei',sans-serif;
  word-wrap:break-word;
}

/* keep slide transitions for step manager */
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

/* ===== 全局搜索 ===== */
.gs-item {
  display:flex; align-items:center; gap:10px; padding:10px 12px;
  border-radius:8px; cursor:pointer; transition:background .12s;
}
.gs-item:hover { background:#f5f3ff; }
.gs-badge {
  font-size:10px; font-weight:700; color:#fff; padding:2px 8px; border-radius:6px;
  white-space:nowrap; flex-shrink:0;
}
.gs-title { font-size:14px; font-weight:600; color:#1f2937; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.gs-detail { font-size:12px; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-left:auto; }
</style>

<!-- 非 scoped：v-html 注入的 Markdown 内容需要全局样式 -->
<style>
.pmt-reader-content h1 { font-size:22px; font-weight:800; margin:0 0 12px; color:#111827; }
.pmt-reader-content h2 { font-size:19px; font-weight:700; margin:0 0 10px; color:#1f2937; }
.pmt-reader-content h3 { font-size:16px; font-weight:700; margin:0 0 8px; color:#374151; }
.pmt-reader-content h4 { font-size:15px; font-weight:600; margin:0 0 6px; color:#4b5563; }
.pmt-reader-content p  { margin:0 0 8px; }
.pmt-reader-content ul,
.pmt-reader-content ol { padding-left:1.5em; margin:4px 0 8px; }
.pmt-reader-content li { margin:2px 0; }
.pmt-reader-content strong { font-weight:700; color:#1f2937; }
.pmt-reader-content a { color:#6366f1; text-decoration:underline; }
.pmt-reader-content hr { border:none; border-top:1px solid #e5e7eb; margin:16px 0; }
.pmt-reader-content code {
  font-family:'SF Mono',ui-monospace,monospace; font-size:13px;
  background:#f3f4f6; padding:1px 5px; border-radius:4px; color:#e11d48;
}
.pmt-reader-content pre {
  background:#1e1e2e; color:#cdd6f4; padding:16px 20px; border-radius:10px;
  font-size:13px; line-height:1.7; overflow-x:auto; margin:8px 0;
}
.pmt-reader-content pre code { background:none; padding:0; color:inherit; }
.pmt-reader-content blockquote {
  border-left:4px solid #6366f1; padding:8px 16px; margin:8px 0;
  background:#eef2ff; color:#4338ca; border-radius:0 8px 8px 0;
}
.pmt-reader-content img { max-width:100%; border-radius:8px; }
.pmt-reader-content table { border-collapse:collapse; width:100%; margin:8px 0; }
.pmt-reader-content th,
.pmt-reader-content td { border:1px solid #e5e7eb; padding:8px 12px; text-align:left; }
.pmt-reader-content th { background:#f9fafb; font-weight:700; }

/* 剧本与分镜预览区 */
.script-preview-content {
  flex:1; min-height:0; overflow-y:auto; padding:16px 18px;
  font-size:14px; line-height:24px; color:var(--text-primary,#374151);
  font-family:'PingFang SC','Microsoft YaHei',sans-serif;
  word-wrap:break-word; background:var(--surface-card,#fff);
}
.script-preview-content h1 { font-size:22px; font-weight:800; margin:0 0 12px; color:#111827; }
.script-preview-content h2 { font-size:19px; font-weight:700; margin:0 0 10px; color:#1f2937; }
.script-preview-content h3 { font-size:16px; font-weight:700; margin:0 0 8px; color:#374151; }
.script-preview-content h4 { font-size:15px; font-weight:600; margin:0 0 6px; color:#4b5563; }
.script-preview-content p  { margin:0 0 8px; }
.script-preview-content ul,
.script-preview-content ol { padding-left:1.5em; margin:4px 0 8px; }
.script-preview-content li { margin:2px 0; }
.script-preview-content strong { font-weight:700; color:#1f2937; }
.script-preview-content a { color:#6366f1; }
.script-preview-content hr { border:none; border-top:1px solid #e5e7eb; margin:16px 0; }
.script-preview-content code {
  font-family:'SF Mono',ui-monospace,monospace; font-size:13px;
  background:#f3f4f6; padding:1px 5px; border-radius:4px; color:#e11d48;
}
.script-preview-content pre {
  background:#1e1e2e; color:#cdd6f4; padding:16px 20px; border-radius:10px;
  font-size:13px; line-height:1.7; overflow-x:auto; margin:8px 0;
}
.script-preview-content pre code { background:none; padding:0; color:inherit; }
.script-preview-content blockquote {
  border-left:4px solid #6366f1; padding:8px 16px; margin:8px 0;
  background:#eef2ff; color:#4338ca; border-radius:0 8px 8px 0;
}

/* 自定义滚动条 */
::-webkit-scrollbar { width:8px; height:8px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb {
  background:#d1d5db; border-radius:4px;
}
::-webkit-scrollbar-thumb:hover { background:#9ca3af; }
/* 剧本分镜面板 — 更隐形的滚动条 */
.script-edit-body ::-webkit-scrollbar { width:6px; }
.script-edit-body ::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:3px; }
.script-edit-body ::-webkit-scrollbar-thumb:hover { background:#9ca3af; }
/* Firefox 细滚动条 */
* { scrollbar-width:thin; scrollbar-color:#d1d5db transparent; }
</style>
