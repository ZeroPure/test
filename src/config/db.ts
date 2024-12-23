const mysql = require('mysql2/promise');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '111111',
    database: 'project',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

console.log('尝试连接数据库，配置:', dbConfig);

const Dpool = mysql.createPool(dbConfig);

// 测试连接
Dpool.getConnection()
    .then(connection => {
        console.log('数据库连接池初始化成功');
        connection.release();
    })
    .catch(err => {
        console.error('数据库连接池初始化失败。错误详情:', err.message);
        console.error('错误代码:', err.code);
        console.error('SQL状态:', err.sqlState);
        console.error('完整错误:', err);
    });

module.exports = Dpool;
