/**
 * 云函数版数据库清理脚本
 * 通过云函数执行清理操作，解决权限问题
 */

const cloudCleanupScript = {
  // 检查数据库状态
  checkDatabaseStatus: async function() {
    try {
      console.log('🔍 检查数据库状态...');
      console.log('=====================================');
      
      const result = await wx.cloud.callFunction({
        name: 'database_cleanup',
        data: {
          action: 'status'
        }
      });
      
      if (!result.result.success) {
        console.error('❌ 检查数据库状态失败:', result.result.message);
        return false;
      }
      
      const collections = result.result.data.collections;
      
      console.log('📊 数据库连接状态: 正常');
      
      for (const collection of collections) {
        const emoji = collection.count > 0 ? '📋' : collection.count === 0 ? '📄' : '❌';
        const statusText = collection.status;
        const countText = collection.exists ? `(${collection.count} 条)` : '';
        console.log(`${emoji} ${collection.displayName} (${collection.name}): ${statusText} ${countText}`);
      }
      
      console.log('=====================================');
      console.log('💡 状态说明:');
      console.log('📋 有数据 - 集合存在且包含记录');
      console.log('📄 空集合 - 集合存在但没有记录');
      console.log('❌ 不存在 - 集合不存在（正常情况）');
      
      return true;
    } catch (error) {
      console.error('❌ 检查数据库状态失败:', error);
      return false;
    }
  },

  // 预览将要删除的数据
  previewCleanup: async function() {
    try {
      console.log('📊 正在统计将要删除的数据...');
      console.log('=====================================');
      
      const result = await wx.cloud.callFunction({
        name: 'database_cleanup',
        data: {
          action: 'preview'
        }
      });
      
      if (!result.result.success) {
        console.error('❌ 预览清理数据失败:', result.result.message);
        return null;
      }
      
      const data = result.result.data;
      const collections = data.collections;
      
      for (const collection of collections) {
        console.log(`📋 ${collection.displayName}: ${collection.count} 条`);
      }
      
      console.log('=====================================');
      console.log(`📊 总计将删除: ${data.total} 条记录`);
      
      if (data.total === 0) {
        console.log('');
        console.log('ℹ️ 没有找到需要删除的数据');
        console.log('💡 可能的原因:');
        console.log('  - 数据库集合不存在（正常情况）');
        console.log('  - 数据已经被清理过了');
        console.log('  - 数据库连接问题');
        console.log('');
        console.log('如果需要创建测试数据，请先部署并运行重建脚本');
      } else {
        console.log('');
        console.log('如果确认删除，请运行：');
        console.log('cloudCleanupScript.executeCleanup()');
      }
      
      return data;
    } catch (error) {
      console.error('❌ 预览清理数据失败:', error);
      return null;
    }
  },

  // 执行清理
  executeCleanup: async function() {
    try {
      console.log('🚀 开始执行数据库清理...');
      console.log('=====================================');
      
      const startTime = Date.now();
      
      const result = await wx.cloud.callFunction({
        name: 'database_cleanup',
        data: {
          action: 'cleanup'
        }
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (!result.result.success) {
        console.error('❌ 数据库清理失败:', result.result.message);
        return false;
      }
      
      const data = result.result.data;
      const results = data.results;
      
      console.log('📋 清理结果:');
      for (const result of results) {
        const emoji = result.failed === 0 ? '✅' : '⚠️';
        console.log(`${emoji} ${result.displayName}: ${result.message}`);
      }
      
      console.log('\n=====================================');
      console.log('🎯 数据库清理完成！');
      console.log(`⏱️ 总耗时: ${duration.toFixed(1)} 秒`);
      console.log(`✅ 总计删除: ${data.totalDeleted} 条记录`);
      console.log(`❌ 总计失败: ${data.totalFailed} 条记录`);
      
      if (data.totalDeleted === 0 && data.totalFailed === 0) {
        console.log('\n💡 没有找到需要删除的数据');
        console.log('这可能意味着:');
        console.log('  ✅ 数据库已经是干净的');
        console.log('  ✅ 集合不存在（正常情况）');
        console.log('  ✅ 之前的清理已经完成');
      } else if (data.totalFailed === 0) {
        console.log('\n🎉 数据库清理完全成功！');
        console.log('\n💡 现在可以重新创建测试数据验证修复效果');
      } else {
        console.log('\n⚠️ 清理过程中有部分失败，请检查错误信息');
      }
      
      return data.totalFailed === 0;
    } catch (error) {
      console.error('❌ 执行数据库清理失败:', error);
      return false;
    }
  },

  // 验证清理结果
  verifyCleanup: async function() {
    try {
      console.log('🔍 验证清理结果...');
      
      const result = await wx.cloud.callFunction({
        name: 'database_cleanup',
        data: {
          action: 'verify'
        }
      });
      
      if (!result.result.success) {
        console.error('❌ 验证清理结果失败:', result.result.message);
        return false;
      }
      
      const data = result.result.data;
      const collections = data.collections;
      
      console.log('📊 清理后数据统计:');
      
      for (const collection of collections) {
        const emoji = collection.name === 'Events' ? '📅' : 
                     collection.name === 'Registrations' ? '👥' :
                     collection.name === 'Notifications' ? '📬' : '📋';
        console.log(`${emoji} ${collection.name}: ${collection.count} 条`);
      }
      
      if (data.total === 0) {
        console.log('✅ 清理验证成功：所有相关数据已完全删除或集合不存在');
        return true;
      } else {
        console.log(`⚠️ 清理不完整：仍有 ${data.total} 条记录残留`);
        console.log('💡 可以重新运行清理: cloudCleanupScript.executeCleanup()');
        return false;
      }
    } catch (error) {
      console.error('❌ 验证清理结果失败:', error);
      return false;
    }
  },

  // 完整清理流程
  runCompleteCleanup: async function() {
    console.log('🚀 开始完整数据库清理流程...');
    console.log('=====================================');
    
    const steps = [
      { name: '检查数据库状态', fn: this.checkDatabaseStatus },
      { name: '预览清理数据', fn: this.previewCleanup },
      { name: '执行数据清理', fn: this.executeCleanup },
      { name: '验证清理结果', fn: this.verifyCleanup }
    ];
    
    let successCount = 0;
    
    for (const step of steps) {
      console.log(`\n📋 执行步骤: ${step.name}`);
      
      try {
        const success = await step.fn.call(this);
        if (success) {
          successCount++;
          console.log(`✅ ${step.name} 完成`);
        } else {
          console.log(`❌ ${step.name} 失败`);
          break; // 如果某步失败，停止后续步骤
        }
      } catch (error) {
        console.error(`❌ ${step.name} 执行出错:`, error);
        break;
      }
      
      // 步骤间延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=====================================');
    console.log('🎯 完整清理流程结束！');
    console.log(`✅ 成功步骤: ${successCount}/${steps.length}`);
    
    if (successCount === steps.length) {
      console.log('\n🎉 数据库清理完全成功！');
      console.log('💡 现在可以创建新的测试数据验证修复效果');
    } else {
      console.log('\n⚠️ 清理流程未完全成功，请检查错误信息');
    }
    
    return successCount === steps.length;
  }
};

// 使用说明
console.log('📦 云函数版数据库清理脚本已加载');
console.log('');
console.log('⚠️ 使用前请确保已部署 database_cleanup 云函数');
console.log('');
console.log('🔧 使用方法:');
console.log('1. 检查数据库状态: cloudCleanupScript.checkDatabaseStatus()');
console.log('2. 预览数据: cloudCleanupScript.previewCleanup()');
console.log('3. 执行清理: cloudCleanupScript.executeCleanup()');
console.log('4. 验证结果: cloudCleanupScript.verifyCleanup()');
console.log('5. 完整流程: cloudCleanupScript.runCompleteCleanup()');
console.log('');
console.log('💡 这个版本通过云函数执行，解决了权限问题');
