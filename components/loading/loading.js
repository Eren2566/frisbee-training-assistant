// components/loading/loading.js
Component({
  properties: {
    // 是否显示加载状态
    show: {
      type: Boolean,
      value: false
    },
    // 加载文本
    text: {
      type: String,
      value: '加载中...'
    },
    // 加载类型：spinner, dots, pulse
    type: {
      type: String,
      value: 'spinner'
    },
    // 尺寸：small, medium, large
    size: {
      type: String,
      value: 'medium'
    },
    // 是否显示遮罩
    mask: {
      type: Boolean,
      value: false
    }
  },

  data: {
    
  },

  methods: {
    // 点击遮罩
    onMaskTap() {
      // 阻止事件冒泡
    }
  }
})
