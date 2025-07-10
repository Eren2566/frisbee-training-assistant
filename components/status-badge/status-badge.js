// components/status-badge/status-badge.js
Component({
  properties: {
    // 状态值
    status: {
      type: String,
      value: ''
    },
    // 状态类型：event, registration
    type: {
      type: String,
      value: 'registration'
    },
    // 尺寸：small, medium, large
    size: {
      type: String,
      value: 'medium'
    },
    // 自定义文本
    text: {
      type: String,
      value: ''
    }
  },

  data: {
    statusConfig: {
      // 活动状态配置
      event: {
        'registering': { text: '报名中', class: 'registering', color: '#1AAD19' },
        'finished': { text: '已结束', class: 'finished', color: '#666' }
      },
      // 报名状态配置
      registration: {
        'signed_up': { text: '已报名', class: 'signed-up', color: '#1976d2' },
        'leave_requested': { text: '已请假', class: 'leave-requested', color: '#f57c00' },
        'present': { text: '已出勤', class: 'present', color: '#1AAD19' },
        'absent': { text: '缺勤', class: 'absent', color: '#d32f2f' }
      }
    }
  },

  computed: {
    statusInfo() {
      const config = this.data.statusConfig[this.properties.type] || {}
      const info = config[this.properties.status] || { 
        text: '未知', 
        class: 'unknown', 
        color: '#999' 
      }
      
      return {
        ...info,
        text: this.properties.text || info.text
      }
    }
  },

  methods: {
    // 获取状态信息
    getStatusInfo() {
      const config = this.data.statusConfig[this.properties.type] || {}
      const info = config[this.properties.status] || { 
        text: '未知', 
        class: 'unknown', 
        color: '#999' 
      }
      
      return {
        ...info,
        text: this.properties.text || info.text
      }
    }
  },

  lifetimes: {
    attached() {
      // 组件实例进入页面节点树时执行
      this.setData({
        currentStatusInfo: this.getStatusInfo()
      })
    }
  },

  observers: {
    'status, type, text': function(status, type, text) {
      this.setData({
        currentStatusInfo: this.getStatusInfo()
      })
    }
  }
})
