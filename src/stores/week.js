import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api'

export const useWeekStore = defineStore('week', () => {
  const weeks = ref([])
  const currentWeek = ref(null)

  async function load() {
    const res = await api.config.weeks()
    if (res.success) weeks.value = res.data
    const cur = await api.config.current()
    if (cur.success) currentWeek.value = cur.data
  }

  async function switchWeek(id) {
    await api.config.switchWeek(id)
    const cur = await api.config.current()
    if (cur.success) currentWeek.value = cur.data
  }

  async function createWeek(data = {}) {
    // 确保日期为纯字符串
    if (data.startDate) data.startDate = String(data.startDate).substring(0, 10)
    if (data.endDate) data.endDate = String(data.endDate).substring(0, 10)
    const res = await api.config.addWeek(data)
    if (res.success) {
      // 返回数据也清洗
      if (res.data.startDate) res.data.startDate = String(res.data.startDate).substring(0, 10)
      if (res.data.endDate) res.data.endDate = String(res.data.endDate).substring(0, 10)
      weeks.value.push(res.data)
      currentWeek.value = res.data
    }
    return res
  }

  async function updateWeek(id, data) {
    if (data.startDate) data.startDate = String(data.startDate).substring(0, 10)
    if (data.endDate) data.endDate = String(data.endDate).substring(0, 10)
    const res = await api.config.updateWeek(id, data)
    if (res.success) {
      if (res.data.startDate) res.data.startDate = String(res.data.startDate).substring(0, 10)
      if (res.data.endDate) res.data.endDate = String(res.data.endDate).substring(0, 10)
      currentWeek.value = res.data
      const idx = weeks.value.findIndex(w => w.id === id)
      if (idx >= 0) weeks.value[idx] = res.data
    }
    return res
  }

  async function deleteWeek(id) {
    const res = await api.config.deleteWeek(id)
    if (res.success) {
      // 软删除 — 从列表中移除但不从服务器删除
      const idx = weeks.value.findIndex(w => w.id === id)
      if (idx >= 0) weeks.value[idx] = { ...weeks.value[idx], hidden: true }
      if (currentWeek.value?.id === id) {
        const visible = weeks.value.filter(w => !w.hidden)
        currentWeek.value = visible.length > 0 ? visible[visible.length - 1] : null
        if (currentWeek.value) await switchWeek(currentWeek.value.id)
      }
    }
    return res
  }

  async function restoreWeek(id) {
    const res = await api.config.restoreWeek(id)
    if (res.success) {
      const idx = weeks.value.findIndex(w => w.id === id)
      if (idx >= 0) weeks.value[idx] = { ...weeks.value[idx], hidden: false }
      currentWeek.value = weeks.value[idx]
    }
    return res
  }

  return { weeks, currentWeek, load, switchWeek, createWeek, updateWeek, deleteWeek, restoreWeek }
})
