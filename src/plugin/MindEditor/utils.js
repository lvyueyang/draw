const createUUID = () => {
  let num = 0
  return () => {
    num += 1
    return num
  }
}
// 使用计数的方式创建 uuid
export const uuid = createUUID()

/**
 * 脑图数据转换为 x6 能识别的数据
 * @param {Object} result 脑图数据
 * @returns {Object}
 * */
export const mindDataFormat = (result) => {
  const model = {
    nodes: [],
    edges: []
  }
  const traverse = (data) => {
    if (!data) return
    const { width, height, x, y, id, children, data: { isRoot, value }, vgap, hgap } = data
    const commonOption = {
      id: `${id}`,
      x,
      y,
      width: width - (hgap * 2),
      height: height - (vgap * 2),
      shape: 'html',
      html: 'mindNode'
    }
    if (isRoot) {
      model.nodes.push({
        ...commonOption,
        data: {
          root: true,
          value: value,
          className: 'x6-mind-root-node'
        }
      })
    } else {
      model.nodes.push({
        ...commonOption,
        data: {
          value: value
        }
      })
    }
    if (children) {
      children.forEach((item) => {
        model.edges.push({
          source: `${id}`,
          target: `${item.id}`,
          attrs: {
            line: {
              sourceMarker: false,
              targetMarker: false
            }
          }
        })
        traverse(item)
      })
    }
  }
  traverse(result)
  return model
}

// 创建用于计算节点宽度的容器
export const createHtmlNodeBody = () => {
  const id = 'MindEditorHtmlNodeWrap'
  const style = `
    position: absolute;
    left: -9999;
    top: -9999;
    visibility: hidden;
  `
  if (document.querySelector(`#${id}`)) {
    return document.querySelector(`#${id}`)
  }
  const nodeBody = document.createElement('div')
  nodeBody.setAttribute('id', id)
  nodeBody.setAttribute('style', style)
  document.body.appendChild(nodeBody)
  return nodeBody
}

// 计算节点尺寸
export const computedElementSize = (element) => {
  const htmlNodeWrap = createHtmlNodeBody()
  const copyElement = element.cloneNode(true)
  htmlNodeWrap.appendChild(copyElement)
  const width = copyElement.offsetWidth
  const height = copyElement.offsetHeight
  htmlNodeWrap.removeChild(copyElement)
  return {
    width,
    height
  }
}

// 计算 value 内容尺寸
export const htmlStringSize = (str, className) => {
  const wrap = document.createElement('div')
  wrap.setAttribute('class', `x6-mind-node ${className}`)
  wrap.innerHTML = str
  return computedElementSize(wrap)
}

// 系统类型
const getOSName = () => {
  const { platform } = navigator
  const isMac = platform.includes('Mac')
  const isWin = platform.includes('Win')
  if (isMac) return 'Mac'
  if (isWin) return 'Win'
  return 'other'
}

export const OSType = getOSName()

// 挂载富文本编辑器
export const createInput = () => {
  let input = document.querySelector('#MindEditorInput')
  if (input) return input
  input = document.createElement('div')
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
