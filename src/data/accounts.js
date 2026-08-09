// 广告账号共享配置 — 所有页面统一使用
export const ACCOUNTS = [
  { id: 'lisa-office', name: '莉莎办公家具' },
  { id: 'zhenshan-office', name: '甄珊办公家具' },
  { id: 'xiege-office', name: '谢哥办公家具' },
]

export function getAccountLabel(id) {
  if (id === 'all') return '全部账号'
  return ACCOUNTS.find(a => a.id === id)?.name || ''
}
