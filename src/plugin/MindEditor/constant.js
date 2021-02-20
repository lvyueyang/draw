// 事务
export const BATCH = {
  APPEND_CHILDREN_NODE: 'appendChildrenNode', // 添加子节点
  APPEND_CHILDREN: 'appendChildren', // 添加子节点
  DROP_APPEND_CHILDREN: 'dropAppendChildren', // 添加子节点
  APPEND_BROTHER: 'appendBrother', // 添加兄弟节点
  REMOVE_NODES: 'removeNodes', // 删除节点
  UPDATE_LAYOUT: 'update_layout' // 更新布局
}

// 自定义高亮
export const HIGHLIGHTER = {
  APPEND_CHILDREN: 'appendChildren' // 可以添加子节点
}
