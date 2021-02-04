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
  const portsGroups = {
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
  }
  const traverse = (data) => {
    // console.log(data)
    if (data) {
      if (data.isRoot) {
        model.nodes.push({
          id: `${data.id}`,
          x: data.x,
          y: data.y,
          shape: 'html',
          html: 'mindNode',
          data: {
            root: true,
            value: data.value,
            className: 'x6-mind-root-node'
          },
          ports: {
            groups: {
              RC: cloneDeep(portsGroups.RC)
            },
            items: [
              {
                group: 'RC'
              }
            ]
          }
        })
      } else {
        model.nodes.push({
          id: `${data.id}`,
          x: data.x,
          y: data.y,
          shape: 'html',
          html: 'mindNode',
          data: {
            value: data.value
          },
          ports: {
            groups: cloneDeep(portsGroups),
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
      }
    }
    if (data.children) {
      data.children.forEach((item) => {
        model.edges.push({
          source: `${data.id}`,
          target: `${item.id}`,
          connector: {
            name: 'jumpover'
          },
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
