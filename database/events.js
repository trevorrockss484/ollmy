// 进程内事件总线 — 用于跨连接广播数据变更（SSE 实时更新）
const { EventEmitter } = require('events');
module.exports = new EventEmitter();
