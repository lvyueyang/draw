import { Graph, Shape, Addon } from '@antv/x6'
import Hierarchy from '@antv/hierarchy'
import { get } from 'lodash'
import {
  uuid,
  htmlStringSize,
  mindDataFormat,
  createHtmlNodeBody,
  computedElementSize,
  createInput,
  OSType
} from './utils'
import { BATCH, HIGHLIGHTER } from './constant'

// 对 mac 的操作做单独优化
const isMAC = OSType === 'Mac'
class MindEditor {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container 容器节点
   * */
  constructor (options) {
    console.clear()
    console.log(OSType)
    // 参数格式化
    this.registerOptions(options)
    // 主题
    this.theme = {}
    // 挂载富文本输入框
    this.editorInput = createInput()
    // 挂载计算节点宽度的容器
    createHtmlNodeBody()
    // 注册自定义节点
    this.registerNode()
    // 注册自定义高亮
    this.registerHighlighter()
    this.graph = this.initEditor()
    this.init()
    console.log(this.graph)
  }

  defaultTheme () {
    return {
    }
  }

  setTheme () {

  }

  init () {
    const { graph } = this
    // 为挂载节点添加默认类名
    graph.container.classList.add('x6-mind-draw', 'drag-meta')
    // 添加初始数据并执行布局
    const data = this.layout(this.initData())
    graph.fromJSON(data)
    this.updateEdgeLayout()
    // 添加节点关系
    this.nodeRelation()
    // 居中布局
    graph.centerContent()
    // 启用历史记录
    graph.enableHistory()
    // 添加键盘事件
    this.keyboardEvent()
    // 添加事件监听
    this.event()
    // 注册节点拖动
    this.registerDnd()
  }

  // 注册参数
  registerOptions (options) {
    this.options = options
    const defaultOptions = {
      layout: {
        rankdir: 'LR', // LR RL TB BT
        ...options.layoutOptions
      }
    }
    this.defaultOptions = defaultOptions
    return defaultOptions
  }

  // 注册高亮
  registerHighlighter () {
    try {
      Graph.registerHighlighter(HIGHLIGHTER.APPEND_CHILDREN, {
        highlight (cellView, magnet) {
          magnet.classList.add('x6-mind-node-can-append')
        },

        unhighlight (cellView, magnet) {
          magnet.classList.remove('x6-mind-node-can-append')
        }
      })
    } catch (e) {
    }
  }

  // 注册拖拽
  registerDnd () {
    const { graph } = this
    const dnd = new Addon.Dnd({
      target: graph,
      validateNode: (node, options) => {
        console.log(node, options)
        return false
      }
      // getDropNode: (node, option) => {
      //   console.log(node)
      // }
    })
    this.dnd = dnd
  }

  initEditor () {
    const { container, width, height } = this.options
    const graph = new Graph({
      container,
      width,
      height,
      embedding: {
        enabled: false
      },
      highlighting: {},
      // 快捷键
      keyboard: {
        enabled: true,
        global: false
      },
      // 选中
      selecting: {
        enabled: true,
        rubberband: true // 启用框选
      },
      showNodeSelectionBox: false,
      showEdgeSelectionBox: false,
      // 多选
      multiple: true,
      // 连线
      connecting: {
        anchor: 'midSide',
        connector: {
          name: 'rounded',
          args: {
            radius: 0.1
          }
        }
      },
      grid: {
        size: 1
      },
      // 剪切板
      clipboard: {
        enabled: true
      },
      // 调节节点大小
      resizing: {
        enabled: false
      },
      // 滚轮缩放
      // mousewheel: {
      //   enabled: true
      //   // modifiers: ['ctrl', 'meta']
      // }
      // 滚动画布。
      scroller: {
        enabled: true,
        pannable: true,
        modifiers: isMAC ? 'meta' : 'ctrl',
        pageVisible: false,
        pageBreak: false,
        autoResize: true
      },
      // 节点和边的交互行为
      interacting: (view) => {
        // 不允许移动节点
        const nodeMovable = graph.isRootNode(view.cell) || graph.isSelected(view.cell)
        return {
          nodeMovable
        }
      }
    })
    return graph
  }

  initData () {
    const data = {
      isRoot: true,
      id: 'Root',
      value: '根节点',
      children: [
        {
          id: 'SubTreeNode1',
          value: '节点1',
          children: [
            {
              id: 'SubTreeNode1.1',
              value: '节点1.1'
            },
            {
              id: 'SubTreeNode1.2',
              value: '节点1.2'
            }
          ]
        },
        {
          id: 'SubTreeNode2',
          value: '节点2',
          children: [
            {
              id: 'SubTreeNode2.1',
              value: '节点2.1'
            },
            {
              id: 'SubTreeNode2.2',
              value: '节点2.2'
            }
          ]
        }
      ]
    }
    return data
  }

  // 根据边的关系添加节点间父子关系，初始化时和
  nodeRelation () {
    const { graph } = this
    const edges = graph.getEdges()
    for (const edge of edges) {
      const sourceId = edge.getSource().cell
      const targetId = edge.getTarget().cell
      const source = graph.getCell(sourceId)
      const target = graph.getCell(targetId)
      source.addChild(target)
    }
  }

  // 将 node 节点变形为树形
  nodeFromTree () {
    const { graph } = this
    const rootNodes = graph.getRootNodes()
    const data = {
      root: {}
    }
    const setData = (node, data) => {
      const { width, height, x, y } = node.getBBox()
      if (!node.isNode()) return
      const value = get(node.data, 'value')
      const children = node.getChildren()
      const nodeInfo = {
        id: node.id,
        value,
        width,
        height,
        x,
        y
      }
      // 是否有子节点
      if (Array.isArray(children)) {
        nodeInfo.children = []
      }
      // 是否是根节点
      if (!Array.isArray(data)) {
        nodeInfo.isRoot = graph.isRootNode(node)
        data.root = nodeInfo
      } else {
        data.push(nodeInfo)
      }
      if (Array.isArray(children)) {
        children.forEach(node => {
          setData(node, nodeInfo.children)
        })
      }
    }
    setData(rootNodes[0], data)
    return data.root
  }

  // 布局
  layout (data) {
    const layoutData = Hierarchy.mindmap(data, {
      direction: 'H', // H / V / LR / RL / TB / BT
      getId (d) {
        return d.id
      },
      getHeight (d) {
        if (d.height) return d.height
        const { height } = htmlStringSize(d.value, d.isRoot ? 'x6-mind-root-node' : '')
        return height
      },
      getWidth (d) {
        if (d.width) return d.width
        const { width } = htmlStringSize(d.value, d.isRoot ? 'x6-mind-root-node' : '')
        return width
      },
      getHGap () {
        return 40
      },
      getVGap () {
        return 10
      },
      getSide: () => {
        return 'right'
      }
    })
    const model = mindDataFormat(layoutData)

    return model
  }

  // 更新节点布局
  updateNodeLayout () {
    const { graph } = this
    const data = this.nodeFromTree()
    const { nodes } = this.layout(data)
    for (const { id, x, y } of nodes) {
      const node = graph.getCellById(id)
      node.position(x, y)
    }
  }

  // 更新边布局
  updateEdgeLayout () {
    const { graph } = this
    const edges = graph.getEdges()
    const { rankdir: dir } = this.defaultOptions.layout
    edges.forEach((edge) => {
      const source = edge.getSourceNode()
      const target = edge.getTargetNode()
      const sourceBBox = source.getBBox()
      const targetBBox = target.getBBox()
      if ((dir === 'LR' || dir === 'RL') && sourceBBox.y !== targetBBox.y) {
        const gap =
          dir === 'LR'
            ? targetBBox.x - sourceBBox.x - sourceBBox.width
            : -sourceBBox.x + targetBBox.x + targetBBox.width
        const fix = dir === 'LR' ? sourceBBox.width : 0
        const x = sourceBBox.x + fix + gap / 2
        edge.setVertices([
          { x, y: sourceBBox.center.y },
          { x, y: targetBBox.center.y }
        ])
      } else if (
        (dir === 'TB' || dir === 'BT') &&
        sourceBBox.x !== targetBBox.x
      ) {
        const gap =
          dir === 'TB'
            ? targetBBox.y - sourceBBox.y - sourceBBox.height
            : -sourceBBox.y + targetBBox.y + targetBBox.height
        const fix = dir === 'TB' ? sourceBBox.height : 0
        const y = sourceBBox.y + fix + gap / 2
        edge.setVertices([
          { x: sourceBBox.center.x, y },
          { x: targetBBox.center.x, y }
        ])
      } else {
        edge.setVertices([])
      }
    })
  }

  // 更新布局
  updateLayout () {
    const { graph } = this
    graph.startBatch(BATCH.UPDATE_LAYOUT)
    this.updateNodeLayout()
    this.updateEdgeLayout()
    graph.stopBatch(BATCH.UPDATE_LAYOUT)
  }

  // 注册自定义节点
  registerNode () {
    // 重名时是否覆盖
    const overwrite = true
    Graph.registerHTMLComponent(
      'mindNode',
      node => {
        const data = node.getData()
        const { value, className } = data
        const wrap = document.createElement('div')
        wrap.setAttribute('class', `x6-mind-node ${className || ''}`)
        wrap.innerHTML = value
        // 设置节点尺寸
        const { width, height } = computedElementSize(wrap)
        node.resize(width, height)
        return wrap
      },
      overwrite
    )
  }

  // 创建连线
  createEdge ({ source, target }) {
    const edge = new Shape.Edge({
      source: source,
      target: target,
      attrs: {
        line: {
          sourceMarker: false,
          targetMarker: false
        }
      }
    })
    return edge
  }

  // 创建根节点
  createRootNode () {
    this.graph.addNode({
      shape: 'html',
      html: 'mindNode',
      data: {
        root: true,
        value: 'Root',
        className: 'x6-mind-root-node'
      },
      ports: {
        groups: {
          RC: {
            position: 'right',
            attrs: {
              circle: {
                r: 0,
                magnet: true,
                strokeWidth: 0
              }
            }
          }
        },
        items: [
          {
            group: 'RC'
          }
        ]
      }
    })
  }

  // 创建普通节点
  createNode (value, { x, y } = {}) {
    const { graph } = this
    const node = graph.createNode({
      shape: 'html',
      html: 'mindNode',
      x,
      y,
      data: {
        value
      }
    })
    return node
  }

  // 获取选中的节点，多个时返回最后一个
  getSelectLastNode () {
    const { graph } = this
    const cells = graph.getSelectedCells()
    if (!cells.length) return false
    const selectNode = cells[cells.length - 1]
    return selectNode
  }

  // 获取选中节点，父子都存在时移除子节点
  getSelectCell () {
    const { graph } = this
    const cells = graph.getSelectedCells()
    // return cells
    const rootCell = cells.find(cell => graph.isRootNode(cell))
    // 存在根节点的话直接拷贝根节点
    if (rootCell) return [rootCell]
    const newCells = []
    for (const cell of cells) {
      const ancestors = cell
        .getAncestors()
        .filter(item => !graph.isRootNode(item))
      let canPush = true
      for (const ancestor of ancestors) {
        if (cells.map(item => item.id).includes(ancestor.id)) {
          canPush = false
        }
      }
      if (canPush) {
        newCells.push(cell)
      }
    }
    return newCells
  }

  /**
   * 添加节点
   * @param {Node} parent 父节点
   * @param {Node} children 子节点
   * @param {Number} index 父节点位置
   * */
  appendNode (parent, children, index) {
    const { graph } = this
    graph.startBatch(BATCH.APPEND_CHILDREN_NODE)
    parent.insertChild(children, index)
    graph.resetSelection(children)
    // 添加连线
    const newEdge = this.createEdge({
      source: parent,
      target: children
    })
    graph.addEdge(newEdge)
    // 布局
    this.updateLayout()
    graph.stopBatch(BATCH.APPEND_CHILDREN_NODE)
  }

  // 添加子节点
  appendChildren () {
    const { graph } = this
    const selectNode = this.getSelectLastNode()
    if (!selectNode) return
    const { x, y } = selectNode.getBBox()
    graph.startBatch(BATCH.APPEND_CHILDREN)
    // 创建新节点
    const newNode = this.createNode(`节点 ${uuid()}`, { x, y })
    // 添加
    this.appendNode(selectNode, newNode)
    graph.stopBatch(BATCH.APPEND_CHILDREN)
  }

  // 添加兄弟节点
  appendBrother () {
    const { graph } = this
    const selectNode = this.getSelectLastNode()
    if (!selectNode) return
    const isRootNode = graph.isRootNode(selectNode)
    if (isRootNode) return false
    // 获取父节点
    const parentNode = selectNode.getParent()
    // 获取选中节点索引
    const index = parentNode.getChildIndex(selectNode)
    graph.startBatch(BATCH.APPEND_BROTHER)
    // 创建新节点
    const newNode = this.createNode(`节点 ${uuid()}`)
    // 添加
    this.appendNode(parentNode, newNode, index + 1)
    graph.stopBatch(BATCH.APPEND_BROTHER)
  }

  // 删除选中节点
  removeSelectNodes () {
    const { graph } = this
    graph.startBatch(BATCH.REMOVE_NODES)
    const cells = graph
      .getSelectedCells()
      .filter(item => !graph.isRootNode(item))
    graph.removeCells(cells)
    this.updateLayout()
    graph.stopBatch(BATCH.REMOVE_NODES)
  }

  // 复制选中节点
  copySelectNodes () {
    const { graph } = this
    const cells = this.getSelectCell()
    // console.log(cells.map(item => item.data.value))
    if (cells.length) {
      graph.copy(cells, { deep: true })
    }
  }

  // 剪切选中节点
  cutSelectNodes () {
    const { graph } = this
    const cells = graph
      .getSelectedCells()
      .filter(item => !graph.isRootNode(item))
    if (cells.length) {
      graph.cut(cells)
    } else {
      this.copySelectNodes()
    }
  }

  // 粘贴选中节点
  pasteNodes () {
    const { graph } = this
    if (graph.isClipboardEmpty()) return
    const cells = graph.getCellsInClipboard()
    // console.log(cells)
    for (const cell of cells) {
      if (cell.isNode()) {
        this.appendChildren(cell)
      }
    }
    // graph.paste(cells)
    // console.log(cells)
    // graph.cleanSelection()
    // graph.select(cells)
  }

  // 显示输入框编辑器
  nodeShowEditorInput (node, wrap) {
    const { x, y } = wrap.getBoundingClientRect()
    const { width, height } = node.size()
    this.editorInput.show({
      x,
      y,
      width,
      height,
      value: node.data.value,
      onBlur: e => {
        const value = e.target.innerHTML
        node.show()
        node.updateData({
          value
        })
        wrap.innerHTML = value
        const { width, height } = computedElementSize(wrap)
        node.size(width, height)
        node.updateAttrs('width', width)
        node.updateAttrs('height', height)
        this.editorInput.hide()
        this.updateLayout()
      }
    })
  }

  // 拖动节点时添加或者排序节点
  dropNode (opt, appendChildrenHighlightView, unhighlight) {
    const { graph } = this
    const { node, x, y } = opt
    const res = graph.getNodesInArea(x, y, 10, 10).find(item => item.id !== node.id)

    if (res) {
      const view = graph.findViewByCell(res.id)
      const cid = view.cid
      if (!appendChildrenHighlightView[view.cid]) {
        appendChildrenHighlightView[view.cid] = view
        view.highlight(view.container, {
          highlighter: HIGHLIGHTER.APPEND_CHILDREN
        })
      } else {
        unhighlight(cid)
      }
    } else {
      unhighlight()
    }
  }

  // 事件监听
  event () {
    const { graph } = this
    const appendChildrenHighlightView = {}
    // 关闭高亮
    const unhighlight = (id = false) => {
      for (const key of Object.keys(appendChildrenHighlightView)) {
        if (key !== id) {
          const view = appendChildrenHighlightView[key]
          view.unhighlight(view.container, {
            highlighter: HIGHLIGHTER.APPEND_CHILDREN
          })
          delete appendChildrenHighlightView[key]
        }
      }
    }
    // 双击编辑
    graph.on('node:dblclick', options => {
      const { e, node } = options
      const wrap = e.target
      this.nodeShowEditorInput(node, wrap)
    })
    // 节点拖动操作， 添加节点，排序
    graph.on('node:move', opt => {
      graph.startBatch(BATCH.DROP_APPEND_CHILDREN)
    })
    graph.on('node:moving', opt => {
      this.dropNode(opt, appendChildrenHighlightView, unhighlight)
    })
    graph.on('node:moved', opt => {
      const views = Object.values(appendChildrenHighlightView)
      views.forEach(view => {
        this.getSelectCell().forEach(node => {
          // 将此节点在原来的父节点中移除
          const newNode = node.clone({ deep: true })
          node.remove()
          this.appendNode(view.cell, newNode)
        })
      })
      unhighlight()
      this.updateLayout()
      graph.stopBatch(BATCH.DROP_APPEND_CHILDREN)
    })
    graph.history.on('batch', (opt) => {
      // code here
    })
  }

  // 键盘事件
  keyboardEvent () {
    const { graph } = this
    const ctrl = isMAC ? 'meta' : 'ctrl'
    // 添加子节点
    graph.bindKey('tab', () => {
      this.appendChildren()
      return false
    })
    // 删除节点
    graph.bindKey('backspace', () => {
      this.removeSelectNodes()
      return false
    })
    // 添加兄弟节点
    graph.bindKey('enter', () => {
      this.appendBrother()
      return false
    })
    // 复制节点
    graph.bindKey(`${ctrl}+c`, () => {
      this.copySelectNodes()
      return false
    })
    // 剪切
    graph.bindKey(`${ctrl}+x`, () => {
      this.cutSelectNodes()
      return false
    })
    // 粘贴节点
    graph.bindKey(`${ctrl}+v`, () => {
      this.pasteNodes()
      return false
    })
    // 后退
    graph.bindKey(`${ctrl}+z`, () => {
      graph.history.undo()
      return false
    })
    // 前进
    graph.bindKey(`${ctrl}+shift+z`, () => {
      graph.history.redo()
      return false
    })
    // 全选
    graph.bindKey(`${ctrl}+a`, () => {
      graph.select(graph.getCells())
      return false
    })
    document.addEventListener('keydown', e => {
      const { key } = e
      if (key === 'Meta') {
        graph.container.classList.remove('drag-meta')
      }
    })
    document.addEventListener('keyup', e => {
      const { key } = e
      if (key === 'Meta') {
        graph.container.classList.add('drag-meta')
      }
    })
  }

  // 历史记录状态
  getHistoryState () {
    const { graph } = this
    return {
      canRedo: graph.history.canRedo(),
      canUndo: graph.history.canUndo()
    }
  }
}

export default MindEditor
