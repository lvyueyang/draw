<template>
  <div class="operate-menu">
    <div>
      <LeftOutlined class="item back"/>
      <input v-model="title" class="title" placeholder="请输入名称"/>
      <a-dropdown :trigger="['click']" placement="bottomCenter">
        <MoreOutlined class="item more"/>
        <template #overlay>
          <a-menu>
            <a-menu-item>
              <a href="javascript:;">1st menu item</a>
            </a-menu-item>
            <a-menu-item>
              <a href="javascript:;">2nd menu item</a>
            </a-menu-item>
            <a-menu-item>
              <a href="javascript:;">3rd menu item</a>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-button class="btn" :disabled="!menu.canUndo" size="small" @click="undoHandle">撤销</a-button>
      <a-button class="btn" :disabled="!menu.canRedo" size="small" @click="redoHandle">前进</a-button>
      <a-button class="btn" size="small">格式刷</a-button>
      <a-button class="btn" size="small">概要</a-button>
      <a-button class="btn" size="small">主题</a-button>
      <a-button class="btn" size="small">结构</a-button>
      <a-button class="btn" size="small" @click="toJSONHandle">获取JSON</a-button>
      <span class="info-text">所有更改已保存</span>
    </div>
    <div>
      <a-dropdown :trigger="['click']" placement="bottomCenter">
        <DownloadOutlined class="item"/>
        <template #overlay>
          <a-menu>
            <a-menu-item>
              导出 PNG
            </a-menu-item>
            <a-menu-item>
              导出 JPG
            </a-menu-item>
            <a-menu-item>
              导出 SVG
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <ShareAltOutlined class="item"/>
    </div>
  </div>
  <div ref="EditorWrap" class="editor-wrap">
    <div ref="container"/>
  </div>
  <!--  <div class="minimap-wrap" ref="minimapContainer"></div>-->
</template>
<script>
import MindEditor from '@/plugin/MindEditor'
import '@/plugin/MindEditor/index.less'

export default {
  name: 'Home',
  data () {
    return {
      editor: null,
      title: '未命名文件',
      menu: {
        canUndo: true,
        canRedo: true
      }
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init () {
      if (this.editor) return
      const { width, height } = this.$refs.EditorWrap.getBoundingClientRect()
      const container = this.$refs.container
      this.editor = new MindEditor({
        container,
        width,
        height
      })
      this.initHistoryState()
      this.event()
      window.addEventListener('resize', () => {
        const { width, height } = this.$refs.EditorWrap.getBoundingClientRect()
        this.editor.graph.resize(width, height)
        this.editor.graph.resizeGraph(width, height)
      })
    },
    // 事件监听
    event () {
      const { graph } = this.editor
      graph.history.on('change', e => {
        this.initHistoryState()
      })
    },
    // 历史记录状态
    initHistoryState () {
      const { canRedo, canUndo } = this.editor.getHistoryState()
      this.menu.canRedo = canRedo
      this.menu.canUndo = canUndo
    },
    // 撤销
    undoHandle () {
      this.editor.history.undo()
    },
    // 前进
    redoHandle () {
      this.editor.history.redo()
    },
    toJSONHandle () {
      const json = this.editor.graph.toJSON()
      console.log(json)
    }
  },
  unmounted () {
    this.editor.graph.dispose()
    this.editor = null
  }
}
</script>
<style lang="less">
* {
  box-sizing: border-box;
}

.operate-menu {
  height: 45px;
  border-bottom: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 10px;
  font-size: 12px;

  .btn {
    font-size: 12px;
    margin-right: 5px;
  }

  .item {
    height: 35px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 3px;

    &:hover {
      background-color: #f7f7f7;
    }
  }

  & > div {
    display: flex;
    align-items: center;
  }

  .title {
    width: 200px;
    height: 35px;
    border: none;
    outline: none;
    font-size: 16px;
    border-bottom: 1px solid transparent;

    &:focus {
      border-bottom: 1px solid #f7f7f7;
    }
  }

  .anticon {
    font-size: 14px;
  }

  .more {
    font-size: 20px;
  }

  .info-text {
    color: #ccc;
    margin-left: 10px;
  }
}

.editor-wrap {
  width: 100%;
  display: block;
  height: calc(100vh - 50px);
}

.minimap-wrap {
  position: fixed;
  bottom: 10px;
  left: 10px;
  width: 200px;
  height: 160px;
  border: 1px solid #ccc;
  box-shadow: 0 10px 10px #ccc;
}
</style>
