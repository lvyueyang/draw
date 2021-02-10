import { Graph, Shape } from '@antv/x6'
import { maxBy } from 'lodash'
import dagre from 'dagre'
import {
  uuid,
  mindDataFormat,
  createHtmlNodeBody,
  computedElementSize
} from '@/plugin/MindEditor/utils'

const NODE_H_SPACING = 100 // 节点间水平间距
const NODE_V_SPACING = 30 // 节点间垂直间距

class MindEditor {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container 容器节点
   * */
  constructor (options) {
    console.clear()
    this.registerOptions(options)
    this.options.container.classList.add('x6-mind-draw')
    this.editorInput = null
    createHtmlNodeBody()
    this.registerNode()
    this.graph = this.initEditor()
    this.init()
    console.log(this.graph)
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

  initEditor () {
    const { container, width, height } = this.options
    const graph = new Graph({
      container,
      width,
      height,
      keyboard: {
        enabled: true,
        global: false
      },
      // 选中
      selecting: {
        enabled: true,
        rubberband: true // 启用框选
      },
      showNodeSelectionBox: true,
      showEdgeSelectionBox: true,
      multiple: true, // 多选
      connecting: {
        anchor: 'midSide',
        connector: {
          name: 'rounded'
        }
      },
      grid: {
        size: 1
      },
      panning: {
        enabled: true,
        modifiers: 'alt'
      },
      // 剪切板
      clipboard: {
        enabled: true
      },
      // 调节节点大小
      resizing: {
        enabled: false
      },
      // // 滚轮缩放
      // mousewheel: {
      //   enabled: true
      // },
      scroller: {
        enabled: true
        // pannable: true,
        // pageVisible: true,
        // pageBreak: false,
      }
      // mousewheel: {
      //   enabled: false,
      //   modifiers: ['ctrl', 'meta'],
      // },
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
          value: `节点${uuid()}`,
          children: [
            {
              id: 'SubTreeNode1.1',
              value: `节点${uuid()}`
            },
            {
              id: 'SubTreeNode1.2',
              value: `节点${uuid()}`
            }
          ]
        },
        {
          id: 'SubTreeNode2',
          value: `节点${uuid()}`
        }
      ]
    }
    return mindDataFormat(data)
  }

  init () {
    const { graph } = this
    const data = this.initData()
    graph.fromJSON(data)
    this.nodeRelation()
    // 添加根节点
    // this.createRootNode()
    this.editorInput = this.createInput()
    // 居中布局
    graph.centerContent()
    // 启用历史记录
    graph.enableHistory()
    // 添加键盘事件
    this.keyboardEvent()
    // 添加事件监听
    this.event()
    this.layout()
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

  // 布局
  layout () {
    const { graph } = this
    const { layout } = this.defaultOptions
    const { rankdir } = layout
    const rootNodes = graph.getRootNodes()
    const edges = graph.getEdges()
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir
      // nodesep: 40,
      // ranksep: 80,
      // edgesep: 40,
      // marginx: 20,
      // marginy: 40,
      // ranker: 'network-simplex'
    })
    g.setDefaultEdgeLabel(() => ({}))
    const setNode = (source) => {
      const { width, height } = source.size()
      g.setNode(source.id, { width, height })
      source.eachChild(node => {
        if (node.isNode()) {
          setNode(node)
          // 连线
          g.setEdge(source.id, node.id)
        }
      })
    }
    rootNodes.forEach(node => {
      setNode(node)
    })
    // edges.forEach(edge => {
    //   const source = edge.getSource()
    //   const target = edge.getTarget()
    //   g.setEdge(source.cell, target.cell)
    // })
    dagre.layout(g)

    graph.freeze()

    g.nodes().forEach(id => {
      console.log(id)
      const node = graph.getCell(id)
      if (node) {
        const pos = g.node(id)
        console.log(pos)
        node.position(pos.x, pos.y)
      }
    })

    edges.forEach(edge => {
      const source = edge.getSourceNode()
      const target = edge.getTargetNode()
      const sourceBBox = source.getBBox()
      const targetBBox = target.getBBox()
      source.addChild(target)
      if (
        (rankdir === 'LR' || rankdir === 'RL') &&
        sourceBBox.y !== targetBBox.y
      ) {
        const gap =
          rankdir === 'LR'
            ? targetBBox.x - sourceBBox.x - sourceBBox.width
            : -sourceBBox.x + targetBBox.x + targetBBox.width
        const fix = rankdir === 'LR' ? sourceBBox.width : 0
        const x = sourceBBox.x + fix + gap / 2
        edge.setVertices([
          { x, y: sourceBBox.center.y },
          { x, y: targetBBox.center.y }
        ])
      } else if (
        (rankdir === 'TB' || rankdir === 'BT') &&
        sourceBBox.x !== targetBBox.x
      ) {
        const gap =
          rankdir === 'TB'
            ? targetBBox.y - sourceBBox.y - sourceBBox.height
            : -sourceBBox.y + targetBBox.y + targetBBox.height
        const fix = rankdir === 'TB' ? sourceBBox.height : 0
        const y = sourceBBox.y + fix + gap / 2
        edge.setVertices([
          { x: sourceBBox.center.x, y },
          { x: targetBBox.center.x, y }
        ])
      } else {
        edge.setVertices([])
      }
    })

    graph.unfreeze()
  }

  // 创建输入框
  createInput () {
    const input = document.createElement('div')
    input.setAttribute('id', 'MindEditorInput')
    input.setAttribute('contenteditable', 'true')
    input.classList.add('x6-mind-input')
    document.body.appendChild(input)
    input.show = ({ x, y, width, height, value, onBlur }) => {
      input.classList.remove('hide')
      input.style.left = x + 'px'
      input.style.top = y + 'px'
      input.style.minWidth = width + 'px'
      input.style.minHeight = height + 'px'
      input.classList.add('show')
      input.innerHTML = value
      input.focus()
      input.onblur = e => {
        if (typeof onBlur === 'function') onBlur(e)
      }
    }
    input.hide = () => {
      input.classList.remove('show')
      input.classList.add('hide')
    }
    return input
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
    parent.insertChild(children, index)
    graph.resetSelection(children)
    // 添加连线
    const newEdge = this.createEdge({
      source: parent,
      target: children
    })
    graph.addEdge(newEdge)
    // 布局
    this.layout()
  }

  // 添加子节点
  appendChildren () {
    const selectNode = this.getSelectLastNode()
    if (!selectNode) return
    const { x, y } = selectNode.getBBox()
    // 创建新节点
    const newNode = this.createNode(`节点 ${uuid()}`, { x, y })
    // 添加
    this.appendNode(selectNode, newNode)
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
    // 创建新节点
    const newNode = this.createNode(`节点 ${uuid()}`)
    // 获取选中节点索引
    const index = parentNode.getChildIndex(selectNode)
    // 添加
    this.appendNode(parentNode, newNode, index + 1)
    console.log(parentNode.getChildren().map(item => (item.data ? item.data.value : '')))
  }

  // 删除选中节点
  removeSelectNodes () {
    const { graph } = this
    const cells = graph
      .getSelectedCells()
      .filter(item => !graph.isRootNode(item))
    graph.removeCells(cells)
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
        this.layout()
      }
    })
  }

  // 事件监听
  event () {
    const { graph } = this
    // 双击编辑
    graph.on('node:dblclick', options => {
      const { e, node } = options
      console.log(node.size())
      const wrap = e.target
      this.nodeShowEditorInput(node, wrap)
    })
  }

  // 键盘事件
  keyboardEvent () {
    const { graph } = this
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
    graph.bindKey('ctrl+c', () => {
      this.copySelectNodes()
      return false
    })
    // 剪切
    graph.bindKey('ctrl+x', () => {
      this.cutSelectNodes()
      return false
    })
    // 粘贴节点
    graph.bindKey('ctrl+v', () => {
      this.pasteNodes()
      return false
    })
    // 后退
    graph.bindKey('ctrl+z', () => {
      graph.history.undo()
      return false
    })
    // 前进
    graph.bindKey('ctrl+shift+z', () => {
      graph.history.redo()
      return false
    })
    // 全选
    graph.bindKey('ctrl+a', () => {
      graph.select(graph.getCells())
      return false
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
