// pages/event-list/event-list.js
const app = getApp()
const { TimeUtils } = require('../../utils/common.js')

Page({
  data: {
    eventList: [],
    filteredEventList: [],
    isLoading: false,
    isFiltering: false,
    userInfo: null,
    isAdmin: false,
    // 筛选器状态
    statusFilter: 'all', // 'registering', 'ongoing', 'finished', 'all'
    sortOrder: 'asc' // 'asc', 'desc'
  },

  onLoad() {
    this.loadFilterSettings()
    this.checkLoginAndLoadData()
  },

  onShow() {
    this.checkLoginAndLoadData()
  },

  // 检查登录状态并加载数据
  checkLoginAndLoadData() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo._openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }
      })
      return
    }

    this.setData({
      userInfo: userInfo,
      isAdmin: userInfo.role === 'admin'
    })

    this.loadEventList()
  },

  // 加载训练列表
  loadEventList() {
    if (this.data.isLoading) return

    this.setData({
      isLoading: true
    })

    wx.cloud.callFunction({
      name: 'event_service',
      data: {
        action: 'getList'
      },
      success: (res) => {
        console.log('获取训练列表成功:', res)
        
        if (res.result.success) {
          // 格式化时间显示
          const eventList = res.result.data.map(event => ({
            ...event,
            formattedTime: TimeUtils.formatEventTime(event.eventTime)
          }))

          this.setData({
            eventList: eventList
          })

          // 应用筛选和排序
          this.applyFilters()
        } else {
          app.showError(res.result.message || '获取训练列表失败')
          // 即使加载失败也要初始化筛选器
          this.setData({
            filteredEventList: []
          })
        }
      },
      fail: (err) => {
        console.error('获取训练列表失败:', err)
        app.showError('获取训练列表失败')
        // 即使加载失败也要初始化筛选器
        this.setData({
          filteredEventList: []
        })
      },
      complete: () => {
        this.setData({
          isLoading: false
        })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadEventList()
  },

  // 跳转到训练详情
  goToEventDetail(e) {
    const eventId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${eventId}`
    })
  },

  // 跳转到创建训练页面（仅管理员）
  goToCreateEvent() {
    if (!this.data.isAdmin) {
      app.showError('权限不足')
      return
    }
    
    wx.navigateTo({
      url: '/pages/admin/create-event/create-event'
    })
  },

  // 格式化时间显示
  formatTime(timeStr) {
    const date = new Date(timeStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'registering': '报名中',
      'ongoing': '进行中',
      'finished': '已结束'
    }
    return statusMap[status] || '未知状态'
  },

  // 加载筛选器设置
  loadFilterSettings() {
    try {
      const savedStatusFilter = wx.getStorageSync('eventList_statusFilter')
      const savedSortOrder = wx.getStorageSync('eventList_sortOrder')

      this.setData({
        statusFilter: savedStatusFilter || 'all',
        sortOrder: savedSortOrder || 'asc'
      })
    } catch (error) {
      console.error('加载筛选器设置失败:', error)
    }
  },

  // 保存筛选器设置
  saveFilterSettings() {
    try {
      wx.setStorageSync('eventList_statusFilter', this.data.statusFilter)
      wx.setStorageSync('eventList_sortOrder', this.data.sortOrder)
    } catch (error) {
      console.error('保存筛选器设置失败:', error)
    }
  },

  // 状态筛选器变更
  onStatusFilterChange(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.statusFilter) return

    this.setData({
      statusFilter: status,
      isFiltering: true
    })

    this.saveFilterSettings()

    // 延迟应用筛选，显示加载效果
    setTimeout(() => {
      this.applyFilters()
    }, 300)
  },

  // 排序方式变更
  onSortOrderChange(e) {
    const order = e.currentTarget.dataset.order
    if (order === this.data.sortOrder) return

    this.setData({
      sortOrder: order,
      isFiltering: true
    })

    this.saveFilterSettings()

    // 延迟应用筛选，显示加载效果
    setTimeout(() => {
      this.applyFilters()
    }, 300)
  },

  // 应用筛选和排序
  applyFilters() {
    let filteredList = [...this.data.eventList]

    // 状态筛选
    if (this.data.statusFilter !== 'all') {
      // 特定状态筛选
      filteredList = filteredList.filter(event =>
        event.status === this.data.statusFilter
      )
    }

    // 时间排序
    filteredList.sort((a, b) => {
      const timeA = new Date(a.eventTime).getTime()
      const timeB = new Date(b.eventTime).getTime()

      if (this.data.sortOrder === 'asc') {
        return timeA - timeB // 正序：早的在前
      } else {
        return timeB - timeA // 倒序：晚的在前
      }
    })

    this.setData({
      filteredEventList: filteredList,
      isFiltering: false
    })
  },

  // 重置筛选器
  resetFilters() {
    this.setData({
      statusFilter: 'active',
      sortOrder: 'asc',
      isFiltering: true
    })

    this.saveFilterSettings()

    setTimeout(() => {
      this.applyFilters()
    }, 300)
  }
})
