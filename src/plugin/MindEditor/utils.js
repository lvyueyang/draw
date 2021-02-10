import { cloneDeep } from 'lodash'

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
    if (data) {
      let width = data.width
      let height = data.height
      const { x, y, id } = data
      // 计算宽高
      if (!width || !height) {
        const {
          width: w,
          height: h
        } = htmlStringSize(data.value, data.isRoot ? 'x6-mind-root-node' : '')
        width = width || w
        height = height || h
      }
      const commonOption = {
        id: `${id}`,
        x,
        y,
        width,
        height,
        shape: 'html',
        html: 'mindNode'
      }
      if (data.isRoot) {
        model.nodes.push({
          ...commonOption,
          data: {
            root: true,
            value: data.value,
            className: 'x6-mind-root-node'
          }
        })
      } else {
        model.nodes.push({
          ...commonOption,
          data: {
            value: data.value
          }
        })
      }
    }
    if (data.children) {
      data.children.forEach((item) => {
        model.edges.push({
          source: `${data.id}`,
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
