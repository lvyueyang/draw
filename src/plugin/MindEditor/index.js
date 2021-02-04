import { Graph, Shape } from '@antv/x6'
import { maxBy } from 'lodash'
import dagre from 'dagre'
import { uuid, mindDataFormat, createHtmlNodeBody, computedElementSize } from '@/plugin/MindEditor/utils'

const NODE_H_SPACING = 100 // 节点间水平间距
const NODE_V_SPACING = 30 // 节点间垂直间距

class MindEditor {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container 容器节点
   * */
  constructor (options) {
    console.clear()
    this.options = options
    this.layoutOptions = {
      rankdir: 'LR', // LR RL TB BT
      ...options.layoutOptions
    }
    this.options.container.classList.add('x6-mind-draw')
    this.editorInput = null
    createHtmlNodeBody()
    this.registerNode()
    this.graph = this.initEditor()

    this.init()
    console.log(this.graph)
  }

  initEditor () {
    const {
      container,
      width,
      height
    } = this.options
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
      // 滚轮缩放
      mousewheel: {
        enabled: true
      }
    })
    return graph
  }

  initData () {
    const data = {
      isRoot: true,
      id: 'Root',
      value: 'Root',
      children: [
        {
          id: 'SubTreeNode1',
          value: 'SubTreeNode1',
          children: [
            {
              id: 'SubTreeNode1.1',
              value: 'SubTreeNode1.1'
            },
            {
              id: 'SubTreeNode1.2',
              value: 'SubTreeNode1.2'
            }
          ]
        },
        {
          id: 'SubTreeNode2',
          value: 'SubTreeNode2'
        }
      ]
    }
    return mindDataFormat(data)
  }

  init () {
    const { graph } = this
    // const dagre = new Layout({
    //   type: 'dagre',
    //   rankdir: 'LR',
    //   align: 'UL',
    //   ranksep: 30,
    //   nodesep: 15,
    //   controlPoints: true
    // })
    const data = this.initData()
    // console.log('data：', data)
    graph.fromJSON(data)
    // 添加根节点
    // this.createRootNode()
    this.editorInput = this.createInput()
    this.layout()
    // 居中布局
    graph.centerContent()
    // 启用历史记录
    graph.enableHistory()
    // 添加键盘事件
    this.keyboardEvent()
    // 添加事件监听
    this.event()

    // const allNodes = graph.getNodes()
    // for (const node of allNodes) {
    //   console.log(node.size())
    //   const { width, height } = node.size()
    //   node.resize(width, height)
    // }
  }

  layout () {
    const { graph, layoutOptions } = this
    const { rankdir } = layoutOptions
    const nodes = graph.getNodes()
    const edges = graph.getEdges()
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir, nodesep: 40, ranksep: 40 })
    g.setDefaultEdgeLabel(() => ({}))
    nodes.forEach((node) => {
      const { width, height } = node.size()
      g.setNode(node.id, { width, height })
    })

    edges.forEach((edge) => {
      const source = edge.getSource()
      const target = edge.getTarget()
      g.setEdge(source.cell, target.cell)
    })

    dagre.layout(g)

    graph.freeze()

    g.nodes().forEach((id) => {
      const node = graph.getCell(id)
      if (node) {
        const pos = g.node(id)
        node.position(pos.x, pos.y)
      }
    })

    edges.forEach((edge) => {
      const source = edge.getSourceNode()
      const target = edge.getTargetNode()
      const sourceBBox = source.getBBox()
      const targetBBox = target.getBBox()

      console.log(sourceBBox, targetBBox)
      if ((rankdir === 'LR' || rankdir === 'RL') && sourceBBox.y !== targetBBox.y) {
        const gap = rankdir === 'LR'
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
    input.show = ({
      x,
      y,
      width,
      height,
      value,
      onBlur
    }) => {
      input.classList.remove('hide')
      input.style.left = x + 'px'
      input.style.top = y + 'px'
      input.style.minWidth = width + 'px'
      input.style.minHeight = height + 'px'
      input.classList.add('show')
      input.innerHTML = value
      input.focus()
      input.onblur = (e) => {
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
    Graph.registerHTMLComponent('mindNode', (node) => {
      const data = node.getData()
      const {
        value,
        className
      } = data
      const wrap = document.createElement('div')
      wrap.setAttribute('class', `x6-mind-node ${className || ''}`)
      wrap.innerHTML = value
      // 设置节点尺寸
      const {
        width,
        height
      } = computedElementSize(wrap)
      node.resize(width, height)
      return wrap
    }, overwrite)
  }

  // 创建连线
  createEdge ({
    source,
    target
  }) {
    const edge = new Shape.Edge({
      source: source,
      target: target,
      connector: {
        name: 'rounded'
      },
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
  createNode ({
    x,
    y
  }, value) {
    const node = this.graph.createNode({
      shape: 'html',
      html: 'mindNode',
      x,
      y,
      data: {
        value
      },
      ports: {
        groups: {
          LC: {
            position: 'left',
            attrs: {
              circle: {
                r: 0,
                magnet: true,
                strokeWidth: 0
              }
            }
          },
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
            group: 'LC'
          },
          {
            group: 'RC'
          }
        ]
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
      const ancestors = cell.getAncestors().filter(item => !graph.isRootNode(item))
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

  // 添加子节点
  appendChildren (node) {
    const { graph } = this
    const selectNode = this.getSelectLastNode()
    if (!selectNode) return

    // 获取子节点
    const children = selectNode.filterChild(item => item.isNode())

    // 是否为根节点
    const isRootNode = graph.isRootNode(selectNode)

    // 父节点位置与尺寸
    const {
      x,
      y
    } = selectNode.position()
    const {
      width,
      height
    } = selectNode.size()

    let resultX = x + width + NODE_H_SPACING

    // 设置子节点位置
    const newNode = node || this.createNode(
      {},
      `节点 ${uuid()}`
    )

    // 添加子节点
    selectNode.addChild(newNode)
    graph.resetSelection(newNode)

    // 设置子节点位置
    let resultY = null
    if (children.length) {
      // 有子节点
      const maxNode = maxBy(children, (item) => item.position().y)
      resultY = maxNode.position().y + NODE_V_SPACING + maxNode.size().height
      resultX = maxNode.position().x
    } else {
      // 没有子节点
      resultY = y + ((height - newNode.size().height) / 2)
    }
    newNode.position(resultX, resultY)

    // 添加连线
    graph.addEdge(this.createEdge({
      source: {
        cell: selectNode.id,
        port: selectNode.port.ports[isRootNode ? 0 : 1].id
      },
      target: {
        cell: newNode.id,
        port: newNode.port.ports[0].id
      }
    }))
  }

  // 删除选中节点
  removeSelectNodes () {
    const { graph } = this
    const cells = graph.getSelectedCells().filter(item => !graph.isRootNode(item))
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
    const cells = graph.getSelectedCells().filter(item => !graph.isRootNode(item))
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

  // 添加兄弟节点
  appendBrother () {
    const { graph } = this
    const selectNode = this.getSelectLastNode()
    if (!selectNode) return
    const isRootNode = graph.isRootNode(selectNode)
    if (isRootNode) return false
    const parentNode = selectNode.getParent()
    const {
      x,
      y
    } = selectNode.position()
    const { height } = selectNode.size()
    const newNode = this.createNode({
      x,
      y: y + height + NODE_H_SPACING
    }, `节点 ${uuid()}`)
    parentNode.addChild(newNode)
    graph.resetSelection(newNode)
    // 添加连线
    graph.addEdge(this.createEdge({
      source: {
        cell: parentNode.id,
        port: parentNode.port.ports[graph.isRootNode(parentNode) ? 0 : 1].id
      },
      target: {
        cell: newNode.id,
        port: newNode.port.ports[0].id
      }
    }))
  }

  // 显示输入框编辑器
  nodeShowEditorInput (node, wrap) {
    const {
      x,
      y
    } = wrap.getBoundingClientRect()
    const {
      width,
      height
    } = node.size()
    this.editorInput.show({
      x,
      y,
      width,
      height,
      value: node.data.value,
      onBlur: (e) => {
        const value = e.target.innerHTML
        node.show()
        node.updateData({
          value
        })
        wrap.innerHTML = value
        const {
          width,
          height
        } = computedElementSize(wrap)
        node.size(width, height)
        this.editorInput.hide()
      }
    })
  }

  // 事件监听
  event () {
    const { graph } = this
    // 双击编辑
    graph.on('node:dblclick', (options) => {
      const {
        e,
        node
      } = options
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
