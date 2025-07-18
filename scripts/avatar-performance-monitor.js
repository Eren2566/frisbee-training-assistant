// 头像功能性能监控脚本
// 用于监控头像上传的性能指标

class AvatarPerformanceMonitor {
  constructor() {
    this.metrics = []
    this.isMonitoring = false
  }

  // 开始监控
  startMonitoring() {
    this.isMonitoring = true
    this.metrics = []
    console.log('🔍 开始监控头像功能性能...')
  }

  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false
    console.log('⏹️ 停止性能监控')
  }

  // 记录性能指标
  recordMetric(operation, startTime, endTime, success, fileSize = null, error = null) {
    if (!this.isMonitoring) return

    const duration = endTime - startTime
    const metric = {
      operation: operation,
      duration: duration,
      success: success,
      fileSize: fileSize,
      error: error,
      timestamp: new Date().toISOString()
    }

    this.metrics.push(metric)
    
    const status = success ? '✅' : '❌'
    console.log(`${status} ${operation}: ${duration}ms ${fileSize ? `(${this.formatFileSize(fileSize)})` : ''}`)
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 包装头像选择函数
  wrapChooseAvatar(originalFunction, pageContext) {
    return function() {
      const monitor = window.avatarPerformanceMonitor
      if (!monitor.isMonitoring) {
        return originalFunction.call(pageContext)
      }

      console.log('📸 开始头像选择流程...')
      const startTime = Date.now()

      // 包装原始的wx.chooseImage
      const originalChooseImage = wx.chooseImage
      wx.chooseImage = function(options) {
        const wrappedSuccess = options.success
        const wrappedFail = options.fail

        options.success = function(res) {
          const chooseEndTime = Date.now()
          monitor.recordMetric('图片选择', startTime, chooseEndTime, true)
          
          if (wrappedSuccess) {
            wrappedSuccess(res)
          }
        }

        options.fail = function(error) {
          const chooseEndTime = Date.now()
          monitor.recordMetric('图片选择', startTime, chooseEndTime, false, null, error)
          
          if (wrappedFail) {
            wrappedFail(error)
          }
        }

        return originalChooseImage(options)
      }

      // 调用原始函数
      const result = originalFunction.call(pageContext)

      // 恢复原始函数
      setTimeout(() => {
        wx.chooseImage = originalChooseImage
      }, 100)

      return result
    }
  }

  // 包装头像上传函数
  wrapUploadAvatar(originalFunction, pageContext) {
    return function(tempFilePath) {
      const monitor = window.avatarPerformanceMonitor
      if (!monitor.isMonitoring) {
        return originalFunction.call(pageContext, tempFilePath)
      }

      console.log('📤 开始头像上传流程...')
      const uploadStartTime = Date.now()

      // 获取文件信息
      wx.getFileInfo({
        filePath: tempFilePath,
        success: (fileInfo) => {
          console.log(`📁 文件大小: ${monitor.formatFileSize(fileInfo.size)}`)
          
          // 包装云存储上传
          const originalUploadFile = wx.cloud.uploadFile
          wx.cloud.uploadFile = function(options) {
            const uploadOptions = { ...options }
            const originalSuccess = uploadOptions.success
            const originalFail = uploadOptions.fail

            uploadOptions.success = function(res) {
              const uploadEndTime = Date.now()
              monitor.recordMetric('云存储上传', uploadStartTime, uploadEndTime, true, fileInfo.size)
              
              if (originalSuccess) {
                originalSuccess(res)
              }
            }

            uploadOptions.fail = function(error) {
              const uploadEndTime = Date.now()
              monitor.recordMetric('云存储上传', uploadStartTime, uploadEndTime, false, fileInfo.size, error)
              
              if (originalFail) {
                originalFail(error)
              }
            }

            return originalUploadFile(uploadOptions)
          }

          // 包装云函数调用
          const originalCallFunction = wx.cloud.callFunction
          wx.cloud.callFunction = function(options) {
            if (options.name === 'user_service' && options.data.action === 'updateAvatar') {
              const apiStartTime = Date.now()
              const callOptions = { ...options }
              const originalSuccess = callOptions.success
              const originalFail = callOptions.fail

              callOptions.success = function(res) {
                const apiEndTime = Date.now()
                monitor.recordMetric('API调用', apiStartTime, apiEndTime, res.result.success)
                
                if (originalSuccess) {
                  originalSuccess(res)
                }
              }

              callOptions.fail = function(error) {
                const apiEndTime = Date.now()
                monitor.recordMetric('API调用', apiStartTime, apiEndTime, false, null, error)
                
                if (originalFail) {
                  originalFail(error)
                }
              }

              return originalCallFunction(callOptions)
            }
            
            return originalCallFunction(options)
          }

          // 调用原始上传函数
          const result = originalFunction.call(pageContext, tempFilePath)

          // 恢复原始函数
          setTimeout(() => {
            wx.cloud.uploadFile = originalUploadFile
            wx.cloud.callFunction = originalCallFunction
          }, 100)

          return result
        }
      })
    }
  }

  // 安装性能监控
  install() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    
    if (currentPage && currentPage.route === 'pages/my-profile/my-profile') {
      // 包装头像相关函数
      if (typeof currentPage.chooseAvatar === 'function') {
        currentPage.chooseAvatar = this.wrapChooseAvatar(currentPage.chooseAvatar, currentPage)
        console.log('✅ 头像选择函数已包装')
      }
      
      if (typeof currentPage.uploadAvatar === 'function') {
        currentPage.uploadAvatar = this.wrapUploadAvatar(currentPage.uploadAvatar, currentPage)
        console.log('✅ 头像上传函数已包装')
      }
      
      console.log('🔧 性能监控已安装')
      return true
    } else {
      console.log('❌ 请在个人中心页面安装性能监控')
      return false
    }
  }

  // 生成性能报告
  generateReport() {
    if (this.metrics.length === 0) {
      console.log('📊 暂无性能数据')
      return null
    }

    const report = {
      totalOperations: this.metrics.length,
      successRate: (this.metrics.filter(m => m.success).length / this.metrics.length * 100).toFixed(2),
      averageDuration: (this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length).toFixed(2),
      operations: {}
    }

    // 按操作类型分组统计
    const operationTypes = [...new Set(this.metrics.map(m => m.operation))]
    
    operationTypes.forEach(type => {
      const typeMetrics = this.metrics.filter(m => m.operation === type)
      const successCount = typeMetrics.filter(m => m.success).length
      
      report.operations[type] = {
        count: typeMetrics.length,
        successCount: successCount,
        successRate: (successCount / typeMetrics.length * 100).toFixed(2),
        averageDuration: (typeMetrics.reduce((sum, m) => sum + m.duration, 0) / typeMetrics.length).toFixed(2),
        minDuration: Math.min(...typeMetrics.map(m => m.duration)),
        maxDuration: Math.max(...typeMetrics.map(m => m.duration))
      }
    })

    console.log('📊 性能报告:')
    console.log('=' * 40)
    console.log(`总操作数: ${report.totalOperations}`)
    console.log(`总成功率: ${report.successRate}%`)
    console.log(`平均耗时: ${report.averageDuration}ms`)
    console.log('\n各操作详情:')
    
    Object.entries(report.operations).forEach(([type, stats]) => {
      console.log(`\n${type}:`)
      console.log(`  次数: ${stats.count}`)
      console.log(`  成功率: ${stats.successRate}%`)
      console.log(`  平均耗时: ${stats.averageDuration}ms`)
      console.log(`  耗时范围: ${stats.minDuration}ms - ${stats.maxDuration}ms`)
    })

    return report
  }

  // 清除数据
  clearMetrics() {
    this.metrics = []
    console.log('🗑️ 性能数据已清除')
  }
}

// 创建全局实例
const avatarPerformanceMonitor = new AvatarPerformanceMonitor()

// 导出到全局
if (typeof window !== 'undefined') {
  window.avatarPerformanceMonitor = avatarPerformanceMonitor
}

console.log('头像性能监控器已加载')
console.log('使用方法:')
console.log('1. avatarPerformanceMonitor.install() - 安装监控')
console.log('2. avatarPerformanceMonitor.startMonitoring() - 开始监控')
console.log('3. 进行头像上传操作')
console.log('4. avatarPerformanceMonitor.generateReport() - 查看报告')
console.log('5. avatarPerformanceMonitor.stopMonitoring() - 停止监控')
