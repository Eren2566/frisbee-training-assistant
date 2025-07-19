/**
 * 数据库清理云函数
 * 用于清理测试数据，解决小程序端权限限制问题
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, collections } = event;
  
  try {
    switch (action) {
      case 'preview':
        return await previewCleanup(collections);
      case 'cleanup':
        return await executeCleanup(collections);
      case 'verify':
        return await verifyCleanup(collections);
      case 'status':
        return await checkDatabaseStatus();
      default:
        return {
          success: false,
          message: '不支持的操作类型',
          data: null
        };
    }
  } catch (error) {
    console.error('数据库清理云函数执行失败:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
};

// 安全地获取集合计数
async function safeGetCollectionCount(collectionName) {
  try {
    const result = await db.collection(collectionName).count();
    return result.total;
  } catch (error) {
    if (error.errCode === -502005) {
      // 集合不存在
      return 0;
    } else {
      console.error(`检查集合 ${collectionName} 失败:`, error);
      return -1;
    }
  }
}

// 安全地获取集合数据
async function safeGetCollectionData(collectionName) {
  try {
    const result = await db.collection(collectionName).get();
    return result.data;
  } catch (error) {
    if (error.errCode === -502005) {
      // 集合不存在
      return [];
    } else {
      console.error(`获取集合 ${collectionName} 数据失败:`, error);
      throw error;
    }
  }
}

// 预览清理数据
async function previewCleanup(targetCollections) {
  const collections = targetCollections || [
    { name: 'Events', displayName: 'Events (训练记录)' },
    { name: 'Registrations', displayName: 'Registrations (报名记录)' },
    { name: 'Notifications', displayName: 'Notifications (通知记录)' },
    { name: 'EventLogs', displayName: 'EventLogs (事件日志)' }
  ];
  
  const results = {};
  let totalRecords = 0;
  
  for (const collection of collections) {
    const count = await safeGetCollectionCount(collection.name);
    if (count >= 0) {
      results[collection.name.toLowerCase()] = count;
      totalRecords += count;
    } else {
      results[collection.name.toLowerCase()] = 0;
    }
  }
  
  return {
    success: true,
    message: `预览完成，共找到 ${totalRecords} 条记录`,
    data: {
      ...results,
      total: totalRecords,
      collections: collections.map(col => ({
        name: col.name,
        displayName: col.displayName,
        count: results[col.name.toLowerCase()]
      }))
    }
  };
}

// 执行清理
async function executeCleanup(targetCollections) {
  const collections = targetCollections || [
    { name: 'Events', displayName: 'Events (训练记录)' },
    { name: 'Registrations', displayName: 'Registrations (报名记录)' },
    { name: 'Notifications', displayName: 'Notifications (通知记录)' },
    { name: 'EventLogs', displayName: 'EventLogs (事件日志)' }
  ];
  
  const results = [];
  let totalDeleted = 0;
  let totalFailed = 0;
  
  for (const collection of collections) {
    console.log(`开始清理 ${collection.displayName}...`);
    
    try {
      const data = await safeGetCollectionData(collection.name);
      
      if (data.length === 0) {
        results.push({
          collection: collection.name,
          displayName: collection.displayName,
          deleted: 0,
          failed: 0,
          message: '没有数据需要清理'
        });
        continue;
      }
      
      console.log(`找到 ${data.length} 条记录`);
      
      let deleted = 0;
      let failed = 0;
      
      // 批量删除，每次最多20条
      const batchSize = 20;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            await db.collection(collection.name).doc(item._id).remove();
            deleted++;
          } catch (error) {
            failed++;
            console.error(`删除记录 ${item._id} 失败:`, error);
          }
        }
        
        // 批次间延迟
        if (i + batchSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      results.push({
        collection: collection.name,
        displayName: collection.displayName,
        deleted: deleted,
        failed: failed,
        message: `删除 ${deleted} 条，失败 ${failed} 条`
      });
      
      totalDeleted += deleted;
      totalFailed += failed;
      
      console.log(`${collection.displayName} 清理完成: 删除 ${deleted} 条，失败 ${failed} 条`);
      
    } catch (error) {
      console.error(`清理 ${collection.displayName} 失败:`, error);
      results.push({
        collection: collection.name,
        displayName: collection.displayName,
        deleted: 0,
        failed: 1,
        message: `清理失败: ${error.message}`
      });
      totalFailed++;
    }
  }
  
  return {
    success: totalFailed === 0,
    message: `清理完成，删除 ${totalDeleted} 条记录，失败 ${totalFailed} 条`,
    data: {
      totalDeleted: totalDeleted,
      totalFailed: totalFailed,
      results: results
    }
  };
}

// 验证清理结果
async function verifyCleanup(targetCollections) {
  const collections = targetCollections || ['Events', 'Registrations', 'Notifications', 'EventLogs'];
  
  const results = {};
  let totalRemaining = 0;
  
  for (const collectionName of collections) {
    const count = await safeGetCollectionCount(collectionName);
    if (count >= 0) {
      results[collectionName.toLowerCase()] = count;
      totalRemaining += count;
    } else {
      results[collectionName.toLowerCase()] = -1;
    }
  }
  
  return {
    success: totalRemaining === 0,
    message: totalRemaining === 0 ? '清理验证成功：所有相关数据已完全删除' : `清理不完整：仍有 ${totalRemaining} 条记录残留`,
    data: {
      ...results,
      total: totalRemaining,
      collections: collections.map(name => ({
        name: name,
        count: results[name.toLowerCase()]
      }))
    }
  };
}

// 检查数据库状态
async function checkDatabaseStatus() {
  const collections = [
    { name: 'Users', displayName: '用户集合' },
    { name: 'Events', displayName: '训练集合' },
    { name: 'Registrations', displayName: '报名集合' },
    { name: 'Notifications', displayName: '通知集合' },
    { name: 'EventLogs', displayName: '日志集合' }
  ];
  
  const results = [];
  
  for (const collection of collections) {
    const count = await safeGetCollectionCount(collection.name);
    const status = count > 0 ? '有数据' : count === 0 ? '空集合' : '不存在';
    
    results.push({
      name: collection.name,
      displayName: collection.displayName,
      count: count >= 0 ? count : 0,
      status: status,
      exists: count >= 0
    });
  }
  
  return {
    success: true,
    message: '数据库状态检查完成',
    data: {
      collections: results,
      timestamp: new Date().toISOString()
    }
  };
}
