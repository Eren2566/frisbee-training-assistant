// components/empty-state/empty-state.js
Component({
  properties: {
    // 图标
    icon: {
      type: String,
      value: '📭'
    },
    // 主标题
    title: {
      type: String,
      value: '暂无数据'
    },
    // 描述文本
    description: {
      type: String,
      value: ''
    },
    // 按钮文本
    buttonText: {
      type: String,
      value: ''
    },
    // 按钮类型
    buttonType: {
      type: String,
      value: 'primary'
    },
    // 是否显示
    show: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    // 按钮点击事件
    onButtonTap() {
      this.triggerEvent('buttonTap')
    }
  }
})
