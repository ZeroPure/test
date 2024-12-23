const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const path = require('path');
const pool = require(path.join(__dirname, '../config/db.ts'));
const fs = require('fs').promises;
const mime = require('mime-types');

const app = express();

// 配置 CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 添加 JSON 解析中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 执行数据库更新
async function updateDatabase() {
    try {
        // 更新用户表 - 添加头像字段
        const alterUsersSql = await fs.readFile(path.join(__dirname, '../../sql/alter_users_avatar.sql'), 'utf8');
        await pool.query(alterUsersSql);
        console.log('用户表更新成功（头像字段）');


        // 更新资源表
        const alterResourcesSql = await fs.readFile(path.join(__dirname, '../../sql/alter_resources.sql'), 'utf8');
        await pool.query(alterResourcesSql);
        console.log('资源表更新成功');

        // 检查是否存在管理员账户
        const [adminUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            ['admin']
        );

        if (adminUsers.length === 0) {
            // 创建管理员账户
            const adminId = uuidv4();
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (id, username, password, email, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [adminId, 'admin', hashedPassword, 'admin@example.com', '管理员', 'admin']
            );
            console.log('管理员账户创建成功');
        } else {
            // 更新管理员密码（如果是明文密码）
            const admin = adminUsers[0];
            if (admin.password === 'admin123') {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await pool.query(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashedPassword, admin.id]
                );
                console.log('管理员密码已更新为加密形式');
            }
        }
    } catch (error) {
        console.error('数据库更新失败:', error);
        // 不中断服务器启动
    }
}

// 启动服务器时更新数据库
updateDatabase();

// 辅助函数：检查展示时间冲突
async function checkPresentationTimeConflict(pool, groupId, startTime, endTime, excludeId = null) {
    const [conflictRows] = await pool.query(
        `SELECT id, project_name, start_time, end_time FROM presentations 
        WHERE group_id = ? 
        ${excludeId ? 'AND id != ?' : ''} 
        AND (
            (? BETWEEN start_time AND end_time) OR 
            (? BETWEEN start_time AND end_time) OR
            (start_time BETWEEN ? AND ?) OR
            (end_time BETWEEN ? AND ?)
        )`,
        excludeId 
            ? [groupId, excludeId, startTime, endTime, startTime, endTime, startTime, endTime]
            : [groupId, startTime, endTime, startTime, endTime, startTime, endTime]
    );

    if (conflictRows.length > 0) {
        return {
            hasConflict: true,
            details: conflictRows.map(row => ({
                projectName: row.project_name,
                startTime: new Date(row.start_time).toLocaleString(),
                endTime: new Date(row.end_time).toLocaleString()
            }))
        };
    }

    return { hasConflict: false, details: [] };
}

// 用户注册接口
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, name, role = 'student' } = req.body;
        console.log('收到注册请求:', { username, email, name, role });

        // 检查用户名是否已存在
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        console.log('检查用户名是否存在:', existingUsers);

        if (existingUsers.length > 0) {
            console.log('用户名已存在');
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        console.log('准备插入新用户，userId:', userId);

        // 插入新用户
        const [result] = await pool.query(
            'INSERT INTO users (id, username, password, email, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [userId, username, hashedPassword, email, name, role]
        );
        console.log('插入结果:', result);

        res.status(201).json({
            message: '注册成功',
            user: {
                id: userId,
                username,
                email,
                name,
                role
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

// 测试数据库连接
app.get('/api/test-db', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1');
        res.json({ message: '数据库连接成功', result });
    } catch (error) {
        console.error('数据库连接错误:', error);
        res.status(500).json({ error: '数据库连接失败' });
    }
});

// 获取所有小组
app.get('/api/groups', async (req, res) => {
    try {
        console.log('尝试获取小组列表');
        const [groups] = await pool.query('SELECT * FROM `groups` ORDER BY created_at DESC');
        console.log('获取到的小组列表:', groups);
        res.json(groups);
    } catch (error) {
        console.error('获取小组列表失败:', error);
        res.status(500).json({ error: '获取小组列表失败' });
    }
});

// 添加新小组
app.post('/api/groups', async (req, res) => {
    try {
        const { name } = req.body;
        console.log('尝试创建新小组:', name);
        
        // 检查小组名是否已存在
        const [existingGroups] = await pool.query(
            'SELECT * FROM `groups` WHERE name = ?',
            [name]
        );
        console.log('检查小组名是否存在:', existingGroups);

        if (existingGroups.length > 0) {
            console.log('小组名已存在');
            return res.status(400).json({ error: '小组名已存在' });
        }

        const groupId = uuidv4();
        console.log('生成新小组ID:', groupId);
        
        // 插入新小组
        await pool.query(
            'INSERT INTO `groups` (id, name) VALUES (?, ?)',
            [groupId, name]
        );
        console.log('小组创建成功');

        const [newGroup] = await pool.query(
            'SELECT * FROM `groups` WHERE id = ?',
            [groupId]
        );
        console.log('新创建的小组信息:', newGroup[0]);

        res.status(201).json({
            message: '小组创建成功',
            group: newGroup[0]
        });
    } catch (error) {
        console.error('创建小组失败:', error);
        res.status(500).json({ error: '创建小组失败' });
    }
});

// 更新小组
app.put('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        console.log('尝试更新小组:', { id, name });

        // 检查小组是否存在
        const [existingGroups] = await pool.query(
            'SELECT * FROM `groups` WHERE id = ?',
            [id]
        );
        console.log('检查小组是否存在:', existingGroups);

        if (existingGroups.length === 0) {
            console.log('小组不存在');
            return res.status(404).json({ error: '小组不存在' });
        }

        // 检查新名称是否与其他小组重复
        const [duplicateGroups] = await pool.query(
            'SELECT * FROM `groups` WHERE name = ? AND id != ?',
            [name, id]
        );
        console.log('检查名称是否重复:', duplicateGroups);

        if (duplicateGroups.length > 0) {
            console.log('小组名已存在');
            return res.status(400).json({ error: '小组名已存在' });
        }

        // 更新小组名称
        await pool.query(
            'UPDATE `groups` SET name = ? WHERE id = ?',
            [name, id]
        );
        console.log('小组名称更新成功');

        const [updatedGroup] = await pool.query(
            'SELECT * FROM `groups` WHERE id = ?',
            [id]
        );
        console.log('更新后的小组信息:', updatedGroup[0]);

        res.json({
            message: '小组更新成功',
            group: updatedGroup[0]
        });
    } catch (error) {
        console.error('更新小组失败:', error);
        res.status(500).json({ error: '更新小组失败' });
    }
});

// 删除小组
app.delete('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('尝试删除小组:', id);

        // 检查小组是否存在
        const [existingGroups] = await pool.query(
            'SELECT * FROM `groups` WHERE id = ?',
            [id]
        );
        console.log('检查小组是否存在:', existingGroups);

        if (existingGroups.length === 0) {
            console.log('小组不存在');
            return res.status(404).json({ error: '小组不存在' });
        }

        // 删除小组
        await pool.query('DELETE FROM `groups` WHERE id = ?', [id]);
        console.log('小组删除成功');

        res.json({ message: '小组删除成功' });
    } catch (error) {
        console.error('删除小组失败:', error);
        res.status(500).json({ error: '删除小组失败' });
    }
});

// 获取所有用户列表接口
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT u.id, u.username, u.email, u.name, u.role, u.group_id, ' +
            'u.created_at, u.last_login, g.name as group_name ' +
            'FROM users u ' +
            'LEFT JOIN `groups` g ON u.group_id = g.id'
        );
        console.log('获取用户列表:', users);
        res.json(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 删除用户接口
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('删除用户:', id);

        // 检查是否为管理员账户
        const [user] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [id]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        if (user[0].role === 'admin') {
            return res.status(403).json({ error: '不能删除管理员账户' });
        }

        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 登录接口
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('收到登录请求:', { username });

        // 查找用户
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        console.log('查找用户结果:', { found: users.length > 0 });

        if (users.length === 0) {
            console.log('用户不存在:', username);
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = users[0];
        console.log('用户密码信息:', { 
            hasPassword: !!user.password,
            passwordLength: user.password ? user.password.length : 0
        });

        // 验证密码
        try {
            const isValidPassword = await bcrypt.compare(password, user.password);
            console.log('密码验证结果:', { isValidPassword });

            if (!isValidPassword) {
                console.log('密码验证失败');
                return res.status(401).json({ error: '用户名或密码错误' });
            }
        } catch (error) {
            console.error('密码验证出错:', error);
            // 如果是因为密码格式问题导致的错误，可能是密码未加密
            // 尝试直接比较（用于处理旧的未加密密码）
            if (password === user.password) {
                console.log('使用明文密码匹配成功，将为用户更新为加密密码');
                // 更新为加密密码
                const hashedPassword = await bcrypt.hash(password, 10);
                await pool.query(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );
            } else {
                console.log('密码不匹配');
                return res.status(401).json({ error: '用户名或密码错误' });
            }
        }

        // 更新最后登录时间
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // 处理头像数据
        if (user.avatar) {
            user.avatar = `data:image/jpeg;base64,${user.avatar.toString('base64')}`;
        }

        // 返回用户信息（不包含密码）
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: '登录成功',
            user: {
                ...userWithoutPassword,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// 修改用户信息接口
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role, email, name, group_id, group_name } = req.body;
        console.log('收到更新用户请求:', { id, username, role, email, name, group_id, group_name });

        // 构建更新字段
        const updates = [];
        const values = [];
        
        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }
        if (role) {
            updates.push('role = ?');
            values.push(role);
        }
        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        // 添加分组信息的更新
        if (group_id !== undefined) {
            updates.push('group_id = ?');
            values.push(group_id);
        }
        if (group_name !== undefined) {
            updates.push('group_name = ?');
            values.push(group_name);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '没有提供要更新的字段' });
        }

        // 添加 ID 到值数组
        values.push(id);

        const updateQuery = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;

        console.log('执行更新查询:', updateQuery, values);
        const [result] = await pool.query(updateQuery, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 获取更新后的用户数据
        const [updatedUser] = await pool.query(
            'SELECT id, username, email, name, role, group_id, group_name, created_at, last_login FROM users WHERE id = ?',
            [id]
        );

        res.json({
            user: {
                ...updatedUser[0],
                createdAt: updatedUser[0].created_at,
                lastLogin: updatedUser[0].last_login
            }
        });
    } catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 修改密码
app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        console.log('修改密码:', { id });

        // 检查用户是否存在
        const [users] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 更新密码
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
});

// 更新用户账户信息接口
app.put('/api/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;
        console.log('收到更新账户请求:', { id, username, role });

        // 检查用户是否存在
        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        console.log('查询到的现有用户:', existingUser[0]);

        if (existingUser.length === 0) {
            console.log('用户不存在:', id);
            return res.status(404).json({ error: '用户不存在' });
        }

        // 如果是管理员账户，不允许修改角色
        if (existingUser[0].role === 'admin' && role !== 'admin') {
            return res.status(400).json({ error: '不能修改管理员的角色' });
        }

        // 如果提供了新用户名，检查是否与其他用户重复
        if (username) {
            const [existingUsername] = await pool.query(
                'SELECT * FROM users WHERE username = ? AND id != ?',
                [username, id]
            );

            if (existingUsername.length > 0) {
                return res.status(400).json({ error: '用户名已存在' });
            }
        }

        // 准备更新语句
        const updates = [];
        const values = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }

        if (password) {
            // 加密新密码
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        if (role) {
            updates.push('role = ?');
            values.push(role);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: '没有提供要更新的信息' });
        }

        // 添加 id 到 values 数组
        values.push(id);

        // 执行更新
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // 获取更新后的用户信息
        const [updatedUser] = await pool.query(
            'SELECT id, username, role, name, email, group_id, created_at, last_login FROM users WHERE id = ?',
            [id]
        );

        res.json({
            message: '账户信息更新成功',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('更新账户信息失败:', error);
        res.status(500).json({ error: '更新账户信息失败' });
    }
});

// 获取所有项目
app.get('/api/projects', async (req, res) => {
    try {
        const [projects] = await pool.query(
            'SELECT p.id, p.name, p.description, p.git_repo as gitRepo, p.group_id as groupId, ' +
            'p.created_at as createdAt, g.name as groupName ' +
            'FROM projects p ' +
            'LEFT JOIN `groups` g ON p.group_id = g.id ' +
            'ORDER BY p.created_at DESC'
        );
        console.log('获取到的项目列表:', projects);
        res.json(Array.isArray(projects) ? projects : []);
    } catch (error) {
        console.error('获取项目列表失败:', error);
        res.status(500).json({ error: '获取项目列表失败' });
    }
});

// 创建新项目
app.post('/api/projects', async (req, res) => {
    try {
        const { name, description, gitRepo, groupId } = req.body;
        console.log('创建项目:', { name, description, gitRepo, groupId });

        // 检查项目名是否已存在
        const [existingProjects] = await pool.query(
            'SELECT * FROM projects WHERE name = ?',
            [name]
        );

        if (existingProjects.length > 0) {
            return res.status(400).json({ error: '项目名已存在' });
        }

        // 检查组别是否存在
        const [existingGroups] = await pool.query(
            'SELECT * FROM `groups` WHERE id = ?',
            [groupId]
        );

        if (existingGroups.length === 0) {
            return res.status(400).json({ error: '指定的组别不存在' });
        }

        const projectId = uuidv4();
        const [result] = await pool.query(
            'INSERT INTO projects (id, name, description, git_repo, group_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [projectId, name, description, gitRepo, groupId]
        );

        const [newProject] = await pool.query(
            'SELECT id, name, description, git_repo as gitRepo, group_id as groupId, created_at as createdAt FROM projects WHERE id = ?',
            [projectId]
        );

        res.status(201).json(newProject[0]);
    } catch (error) {
        console.error('创建项目失败:', error);
        res.status(500).json({ error: '创建项目失败' });
    }
});

// 更新项目信息
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, gitRepo, groupId } = req.body;
        console.log('更新项目:', { id, name, description, gitRepo, groupId });

        // 检查项目是否存在
        const [existingProject] = await pool.query(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );

        if (existingProject.length === 0) {
            return res.status(404).json({ error: '项目不存在' });
        }

        // 如果更改了项目名，检查新名称是否已被使用
        if (name !== existingProject[0].name) {
            const [existingName] = await pool.query(
                'SELECT * FROM projects WHERE name = ? AND id != ?',
                [name, id]
            );

            if (existingName.length > 0) {
                return res.status(400).json({ error: '项目名已被使用' });
            }
        }

        // 如果指定了新的组别，检查组别是否存在
        if (groupId && groupId !== existingProject[0].group_id) {
            const [existingGroup] = await pool.query(
                'SELECT * FROM `groups` WHERE id = ?',
                [groupId]
            );

            if (existingGroup.length === 0) {
                return res.status(400).json({ error: '指定的组别不存在' });
            }
        }

        // 准备更新数据
        const updates = [];
        const params = [];
        
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        
        if (description) {
            updates.push('description = ?');
            params.push(description);
        }
        
        if (gitRepo !== undefined) {
            updates.push('git_repo = ?');
            params.push(gitRepo);
        }
        
        if (groupId) {
            updates.push('group_id = ?');
            params.push(groupId);
        }
        
        if (updates.length === 0) {
            return res.json({
                message: '无需更新',
                project: {
                    ...existingProject[0],
                    gitRepo: existingProject[0].git_repo,
                    groupId: existingProject[0].group_id,
                    createdAt: existingProject[0].created_at
                }
            });
        }

        // 添加 id 到参数数组
        params.push(id);

        // 构建更新语句
        const updateQuery = `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`;
        console.log('执行更新查询:', { query: updateQuery, params });

        const [result] = await pool.query(updateQuery, params);

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: '更新失败' });
        }

        // 如果更新了组别，同步更新相关展示的组别
        if (groupId && groupId !== existingProject[0].group_id) {
            await pool.query(
                'UPDATE presentations SET group_id = ? WHERE project_id = ?',
                [groupId, id]
            );
        }

        // 获取更新后的项目信息
        const [updatedProject] = await pool.query(
            `SELECT p.*, g.name as group_name 
             FROM projects p
             LEFT JOIN \`groups\` g ON p.group_id = g.id 
             WHERE p.id = ?`,
            [id]
        );

        const project = {
            ...updatedProject[0],
            gitRepo: updatedProject[0].git_repo,
            groupId: updatedProject[0].group_id,
            createdAt: updatedProject[0].created_at
        };

        res.json({
            message: '更新成功',
            project
        });
    } catch (error) {
        console.error('更新项目失败:', error);
        res.status(500).json({ error: '更新项目失败' });
    }
});

// 删除项目
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('删除项目:', id);

        // 检查项目是否存在
        const [existingProject] = await pool.query(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );

        if (existingProject.length === 0) {
            return res.status(404).json({ error: '项目不存在' });
        }

        // 删除项目
        const [result] = await pool.query(
            'DELETE FROM projects WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: '删除失败' });
        }

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除项目失败:', error);
        res.status(500).json({ error: '删除项目失败' });
    }
});

// 添加用户接口
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role, name, email } = req.body;
        console.log('添加用户:', { username, role, name, email });

        // 检查用户名是否已存在
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        const [result] = await pool.query(
            'INSERT INTO users (id, username, password, role, name, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), username, hashedPassword, role, name, email, new Date()]
        );

        res.json({ 
            message: '用户添加成功',
            user: {
                id: result.insertId,
                username,
                role,
                name,
                email,
                createdAt: new Date(),
                lastLogin: null
            }
        });
    } catch (error) {
        console.error('添加用户失败:', error);
        res.status(500).json({ error: '添加用户失败' });
    }
});

// 更新用户头像
app.put('/api/users/:id/avatar', async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar } = req.body;
        console.log('更新用户头像:', { id });

        // 检查用户是否存在
        const [users] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 更新头像
        if (avatar) {
            // 移除 base64 前缀
            const base64Data = avatar.replace(/^data:image\/\w+;base64,/, '');
            // 将 base64 转换为 Buffer
            const buffer = Buffer.from(base64Data, 'base64');

            try {
                // 使用 sharp 压缩图片
                const compressedBuffer = await sharp(buffer)
                    .resize(300, 300, { // 限制最大尺寸
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ // 转换为 JPEG 格式并压缩
                        quality: 80,
                        progressive: true
                    })
                    .toBuffer();

                await pool.query(
                    'UPDATE users SET avatar = ? WHERE id = ?',
                    [compressedBuffer, id]
                );
            } catch (error) {
                console.error('图片处理失败:', error);
                return res.status(400).json({ error: '图片处理失败' });
            }
        } else {
            // 如果没有头像，则设置为 NULL
            await pool.query(
                'UPDATE users SET avatar = NULL WHERE id = ?',
                [id]
            );
        }

        // 获取更新后的用户信息
        const [updatedUsers] = await pool.query(
            'SELECT id, username, email, name, role, avatar, created_at, last_login FROM users WHERE id = ?',
            [id]
        );

        // 如果有头像，将 Buffer 转换回 base64
        const user = updatedUsers[0];
        if (user.avatar) {
            user.avatar = `data:image/jpeg;base64,${user.avatar.toString('base64')}`;
        }

        res.json({ 
            message: '头像更新成功',
            user
        });
    } catch (error) {
        console.error('更新头像失败:', error);
        res.status(500).json({ error: '更新头像失败' });
    }
});

// 资源上传接口
app.post('/api/resources', async (req, res) => {
    try {
        const { title, type, url, fileData, description, groupId } = req.body;
        console.log('收到资源上传请求:', { title, type, groupId });

        const resourceId = uuidv4();
        let fileSize = null;
        let fileType = null;
        let fileName = null;

        // 处理文件类型资源
        if (type === 'file' && fileData) {
            // 从base64数据中提取文件信息
            const matches = fileData.match(/^data:(.+);base64,/);
            if (matches) {
                // 提取MIME类型
                const mimeType = matches[1];
                // 从文件名中提取扩展名
                const extension = url.split('.').pop()?.toLowerCase();
                fileType = extension || mimeType.split('/').pop();
            }
            // 计算文件大小（base64解码后的实际大小）
            const base64Data = fileData.replace(/^data:.*?;base64,/, '');
            fileSize = Math.round((base64Data.length * 3) / 4);
            fileName = url; // 使用传入的文件名
        }

        // 插入资源记录
        const [result] = await pool.query(
            `INSERT INTO resources 
            (id, title, type, url, file_data, file_size, file_type, file_name, description, group_id, uploaded_by, uploaded_at, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')`,
            [resourceId, title, type, url, fileData, fileSize, fileType, fileName, description, groupId, req.user?.id || null]
        );

        // 记录活动
        await pool.query(
            `INSERT INTO activities (id, type, action, target_id, target_name, user_id, path, created_at)
            VALUES (?, 'resource', 'create', ?, ?, ?, '/resources', NOW())`,
            [uuidv4(), resourceId, title, req.user?.id || null]
        );

        // 获取组名
        const [groupResult] = await pool.query(
            'SELECT name FROM `groups` WHERE id = ?',
            [groupId]
        );
        const groupName = groupResult[0]?.name;

        res.status(201).json({
            message: '资源上传成功',
            resource: {
                id: resourceId,
                title,
                type,
                url,
                description,
                groupId,
                group_name: groupName,
                uploadedAt: new Date(),
                status: 'active'
            }
        });
    } catch (error) {
        console.error('资源上传失败:', error);
        res.status(500).json({ 
            error: '资源上传失败',
            details: error instanceof Error ? error.message : '未知错误'
        });
    }
});

// 获取资源列表接口
app.get('/api/resources', async (req, res) => {
    try {
        const [resources] = await pool.query(
            `SELECT 
                r.*, 
                u.username as uploader_name, 
                gr.name as group_name,
                DATE_FORMAT(r.uploaded_at, '%Y-%m-%dT%H:%i:%s.%fZ') as uploaded_at
            FROM resources r 
            LEFT JOIN users u ON r.uploaded_by = u.id 
            LEFT JOIN \`groups\` gr ON r.group_id = gr.id 
            WHERE r.status = 'active'
            ORDER BY r.uploaded_at DESC`
        );

        res.json(resources);
    } catch (error) {
        console.error('获取资源列表失败:', error);
        res.status(500).json({ error: '获取资源列表失败' });
    }
});

// 删除资源接口（真实删除）
app.delete('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('收到删除资源请求:', { id });

        // 检查资源是否存在
        const [existingResources] = await pool.query(
            'SELECT * FROM resources WHERE id = ?',
            [id]
        );

        if (!existingResources.length) {
            return res.status(404).json({ error: '资源不存在' });
        }

        const resource = existingResources[0];

        // 开启事务
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 删除资源记录
            await connection.query(
                'DELETE FROM resources WHERE id = ?',
                [id]
            );

            // 记录活动
            await connection.query(
                `INSERT INTO activities (id, type, action, target_id, target_name, user_id, path, created_at)
                VALUES (?, 'resource', 'update', ?, ?, ?, '/resources', NOW())`,
                [uuidv4(), id, resource.title, req.user?.id || null]
            );

            // 提交事务
            await connection.commit();

            res.json({
                message: '资源删除成功',
                resource: { id }
            });
        } catch (error) {
            // 如果出错，回滚事务
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('删除资源失败:', error);
        res.status(500).json({ 
            error: '删除资源失败',
            details: error instanceof Error ? error.message : '未知错误'
        });
    }
});

// 更新资源下载计数
app.post('/api/resources/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query(
            'UPDATE resources SET downloads = downloads + 1 WHERE id = ?',
            [id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('更新下载次数失败:', error);
        res.status(500).json({ 
            error: '更新下载次数失败',
            details: error instanceof Error ? error.message : '未知错误'
        });
    }
});

// 更新资源接口
app.put('/api/resources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, groupId, url, fileData } = req.body;
        console.log('收到资源更新请求:', { id, title, description, groupId });

        // 检查资源是否存在
        const [existingResources] = await pool.query(
            'SELECT * FROM resources WHERE id = ?',
            [id]
        );

        if (!existingResources.length) {
            return res.status(404).json({ error: '资源不存在' });
        }

        const existingResource = existingResources[0];

        // 准备更新数据
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }

        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }

        if (groupId !== undefined) {
            updateFields.push('group_id = ?');
            updateValues.push(groupId);
        }

        if (url !== undefined) {
            updateFields.push('url = ?');
            updateValues.push(url);
        }

        if (fileData !== undefined && fileData !== existingResource.file_data) {
            updateFields.push('file_data = ?');
            updateValues.push(fileData);

            // 如果是文件类型，更新文件相关信息
            if (existingResource.type === 'file') {
                // 从base64数据中提取文件信息
                const matches = fileData.match(/^data:(.+);base64,/);
                if (matches) {
                    // 提取MIME类型
                    const mimeType = matches[1];
                    // 从文件名中提取扩展名
                    const extension = url.split('.').pop()?.toLowerCase();
                    const fileType = extension || mimeType.split('/').pop();
                }
                // 计算文件大小
                const base64Data = fileData.replace(/^data:.*?;base64,/, '');
                const fileSize = Math.round((base64Data.length * 3) / 4);
                updateFields.push('file_size = ?');
                updateValues.push(fileSize);
            }
        }

        // 添加更新时间
        updateFields.push('updated_at = NOW()');

        // 如果没有要更新的字段，直接返回成功
        if (updateFields.length === 0) {
            return res.json({
                message: '资源无变化',
                resource: existingResource
            });
        }

        // 构建并执行更新查询
        const updateQuery = `
            UPDATE resources 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;
        console.log('执行的SQL语句:', updateQuery);
        console.log('SQL参数:', [...updateValues, id]);
        const [updateResult] = await pool.query(updateQuery, [...updateValues, id]);
        console.log('更新结果:', updateResult);

        if (updateResult.affectedRows === 0) {
            throw new Error('更新失败：未影响任何行');
        }

        // 获取更新后的资源，包括组名
        const [updatedResources] = await pool.query(
            `SELECT r.*, g.name as group_name 
             FROM resources r 
             LEFT JOIN \`groups\` g ON r.group_id = g.id 
             WHERE r.id = ?`,
            [id]
        );

        if (!updatedResources || updatedResources.length === 0) {
            throw new Error('更新后无法获取最新数据');
        }

        let group_name = null;
        if (groupId) {
            const [groups] = await pool.query(
                'SELECT name FROM `groups` WHERE id = ?',
                [groupId]
            );
            if (groups && groups.length > 0) {
                group_name = groups[0].name;
            }
        }

        const updatedResource = {
            ...updatedResources[0],
            group_name
        };
        
        console.log('更新后的数据:', updatedResource);

        // 记录活动
        await pool.query(
            `INSERT INTO activities (id, type, action, target_id, target_name, user_id, path, created_at)
            VALUES (?, 'resource', 'update', ?, ?, ?, '/resources', NOW())`,
            [uuidv4(), id, title || existingResource.title, req.user?.id || null]
        );

        res.json({
            message: '资源更新成功',
            resource: updatedResource
        });
    } catch (error) {
        console.error('更新资源失败:', error);
        res.status(500).json({ 
            error: '更新资源失败',
            details: error instanceof Error ? error.message : '未知错误'
        });
    }
});

// 文件下载接口
app.get('/api/resources/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('收到文件下载请求:', { id });

        // 查询资源信息
        const [resources] = await pool.query(
            'SELECT * FROM resources WHERE id = ?',
            [id]
        );

        if (!resources.length) {
            return res.status(404).json({ error: '资源不存在' });
        }

        const resource = resources[0];
        console.log('找到资源:', { ...resource, file_data: '(已省略)' });
        
        // 检查资源类型是否为文件
        if (resource.type !== 'file') {
            return res.status(400).json({ error: '该资源不是文件类型' });
        }

        // 检查是否有文件数据
        if (!resource.file_data) {
            return res.status(404).json({ error: '文件数据不存在' });
        }

        try {
            // 从 base64 数据中提取实际的文件数据
            const matches = resource.file_data.match(/^data:(.+);base64,(.+)$/);
            if (!matches) {
                throw new Error('无效的文件数据格式');
            }

            const contentType = matches[1];
            const base64Data = matches[2];
            const fileBuffer = Buffer.from(base64Data, 'base64');

            // 设置响应头
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.file_name)}"`);
            res.setHeader('Content-Length', fileBuffer.length);
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            // 更新下载次数
            await pool.query(
                'UPDATE resources SET download_count = download_count + 1 WHERE id = ?',
                [id]
            );

            // 记录下载活动（作为更新操作）
            await pool.query(
                `INSERT INTO activities (id, type, action, target_id, target_name, user_id, path, created_at)
                VALUES (?, 'resource', 'update', ?, ?, ?, '/resources', NOW())`,
                [uuidv4(), id, resource.title, req.user?.id || null]
            );

            // 发送文件数据
            res.send(fileBuffer);

        } catch (error) {
            console.error('处理文件数据失败:', error);
            return res.status(500).json({ 
                error: '文件处理失败',
                details: error instanceof Error ? error.message : '未知错误'
            });
        }

    } catch (error) {
        console.error('文件下载失败:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: '文件下载失败',
                details: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
});

// 获取所有展示
app.get('/api/presentations', async (req, res) => {
    try {
        const [presentations] = await pool.query(
            `SELECT p.*, pr.name as projectName, g.name as group_name 
            FROM presentations p 
            LEFT JOIN projects pr ON p.project_id = pr.id 
            LEFT JOIN \`groups\` g ON p.group_id = g.id 
            ORDER BY p.start_time ASC`
        );
        res.json(presentations);
    } catch (error) {
        console.error('获取展示列表失败:', error);
        res.status(500).json({ error: '获取展示列表失败' });
    }
});

// 创建新展示
app.post('/api/presentations', async (req, res) => {
    try {
        const { projectId, projectName, description, startTime, endTime, groupId } = req.body;
        console.log('创建展示请求数据:', { projectId, projectName, description, startTime, endTime, groupId });

        // 检查必需字段
        if (!projectId || !projectName || !startTime || !endTime || !groupId) {
            console.error('缺少必需字段:', { projectId, projectName, startTime, endTime, groupId });
            return res.status(400).json({ error: '缺少必需字段' });
        }

        // 检查项目是否存在
        const [projectRows] = await pool.query('SELECT id FROM projects WHERE id = ?', [projectId]);
        console.log('项目检查结果:', projectRows);
        if (!projectRows.length) {
            console.error('项目不存在:', projectId);
            return res.status(404).json({ error: '项目不存在' });
        }

        // 检查小组是否存在
        const [groupRows] = await pool.query('SELECT id FROM \`groups\` WHERE id = ?', [groupId]);
        console.log('小组检查结果:', groupRows);
        if (!groupRows.length) {
            console.error('小组不存在:', groupId);
            return res.status(404).json({ error: '小组不存在' });
        }

        // 检查时间冲突
        const conflict = await checkPresentationTimeConflict(pool, groupId, startTime, endTime);
        if (conflict.hasConflict) {
            console.error('时间冲突:', conflict.details);
            return res.status(409).json({ 
                error: 'time_conflict',
                message: '该小组在所选时间段内已有其他展示安排',
                details: conflict.details
            });
        }

        // 转换日期格式
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        // 计算初始状态
        const status = calculatePresentationStatus(startDate, endDate);
        console.log('计算的状态:', status);

        // 生成新的展示 ID
        const presentationId = uuidv4();
        console.log('生成的展示ID:', presentationId);

        // 创建展示记录
        const insertQuery = `
            INSERT INTO presentations (
                id, project_id, project_name, description, 
                start_time, end_time, status, group_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [
            presentationId,
            projectId,
            projectName,
            description,
            startDate,
            endDate,
            status,
            groupId
        ];
        console.log('插入SQL:', insertQuery);
        console.log('插入参数:', insertValues);
        
        await pool.query(insertQuery, insertValues);

        // 获取创建的展示记录
        const [newPresentation] = await pool.query(
            `SELECT p.*, pr.name as projectName, g.name as group_name 
            FROM presentations p 
            LEFT JOIN projects pr ON p.project_id = pr.id 
            LEFT JOIN \`groups\` g ON p.group_id = g.id 
            WHERE p.id = ?`,
            [presentationId]
        );

        res.status(201).json(newPresentation[0]);
    } catch (error) {
        console.error('创建展示失败，详细错误:', error);
        res.status(500).json({ error: '创建展示失败', details: error.message });
    }
});

// 辅助函数：转换ISO日期时间字符串为MySQL格式
function convertToMySQLDateTime(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 更新展示信息
app.put('/api/presentations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { projectId, projectName, description, startTime, endTime, groupId } = req.body;
        console.log('更新展示完整请求数据:', {
            id,
            body: req.body,
            projectId, 
            projectName, 
            description, 
            startTime, 
            endTime, 
            groupId 
        });

        // 检查展示是否存在
        const [existingPresentation] = await pool.query(
            'SELECT * FROM presentations WHERE id = ?',
            [id]
        );

        console.log('现有展示数据:', existingPresentation);

        if (existingPresentation.length === 0) {
            return res.status(404).json({ error: '展示不存在' });
        }

        // 如果更改了小组，检查新小组是否存在
        if (groupId && groupId !== existingPresentation[0].group_id) {
            const [existingGroup] = await pool.query(
                'SELECT * FROM \`groups\` WHERE id = ?',
                [groupId]
            );

            if (existingGroup.length === 0) {
                return res.status(400).json({ error: '指定的小组不存在' });
            }
        }

        // 转换日期时间格式
        const mysqlStartTime = startTime ? convertToMySQLDateTime(startTime) : null;
        const mysqlEndTime = endTime ? convertToMySQLDateTime(endTime) : null;

        // 如果更改了时间，检查时间冲突
        if (mysqlStartTime || mysqlEndTime) {
            const conflict = await checkPresentationTimeConflict(
                pool,
                groupId || existingPresentation[0].group_id,
                mysqlStartTime || existingPresentation[0].start_time,
                mysqlEndTime || existingPresentation[0].end_time,
                id
            );

            if (conflict.hasConflict) {
                console.error('时间冲突:', conflict.details);
                return res.status(409).json({ 
                    error: 'time_conflict',
                    message: '该小组在所选时间段内已有其他展示安排',
                    details: conflict.details
                });
            }
        }

        // 构建更新字段和参数
        const updates = [];
        const params = [];
        
        if (projectId) {
            updates.push('project_id = ?');
            params.push(projectId);
        }
        if (projectName) {
            updates.push('project_name = ?');
            params.push(projectName);
        }
        if (description) {
            updates.push('description = ?');
            params.push(description);
        }
        if (mysqlStartTime) {
            updates.push('start_time = ?');
            params.push(mysqlStartTime);
        }
        if (mysqlEndTime) {
            updates.push('end_time = ?');
            params.push(mysqlEndTime);
        }
        if (groupId) {
            updates.push('group_id = ?');
            params.push(groupId);
        }

        // 更新状态
        const status = calculatePresentationStatus(
            mysqlStartTime || existingPresentation[0].start_time,
            mysqlEndTime || existingPresentation[0].end_time
        );
        updates.push('status = ?');
        params.push(status);

        // 添加id作为WHERE条件的参数
        params.push(id);

        // 构建更新语句
        const updateQuery = `UPDATE presentations SET ${updates.join(', ')} WHERE id = ?`;
        console.log('执行的SQL语句:', updateQuery);
        console.log('SQL参数:', params);

        const [updateResult] = await pool.query(updateQuery, params);
        console.log('更新结果:', updateResult);

        if (updateResult.affectedRows === 0) {
            throw new Error('更新失败：未影响任何行');
        }

        const [updatedPresentation] = await pool.query(
            `SELECT p.*, g.name as group_name 
             FROM presentations p 
             LEFT JOIN \`groups\` g ON p.group_id = g.id 
             WHERE p.id = ?`,
            [id]
        );

        if (!updatedPresentation || updatedPresentation.length === 0) {
            throw new Error('更新后无法获取最新数据');
        }

        console.log('更新后的数据:', updatedPresentation[0]);

        res.json({
            message: '更新成功',
            presentation: updatedPresentation[0]
        });
    } catch (error) {
        console.error('更新展示失败:', error);
        res.status(500).json({ error: '更新展示失败' });
    }
});

// 删除展示
app.delete('/api/presentations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('删除展示:', id);

        // 检查展示是否存在
        const [existingPresentation] = await pool.query(
            'SELECT * FROM presentations WHERE id = ?',
            [id]
        );

        if (existingPresentation.length === 0) {
            return res.status(404).json({ error: '展示不存在' });
        }

        // 删除展示
        const [result] = await pool.query(
            'DELETE FROM presentations WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: '删除失败' });
        }

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除展示失败:', error);
        res.status(500).json({ error: '删除展示失败' });
    }
});

// 辅助函数：计算展示状态
function calculatePresentationStatus(startTime, endTime) {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (now < start) {
        return 'upcoming';
    } else if (now > end) {
        return 'completed';
    } else {
        return 'ongoing';
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器启动在端口 ${PORT}`);
    // 测试数据库连接
    pool.query('SELECT 1')
        .then(() => console.log('数据库连接成功'))
        .catch((err) => console.error('数据库连接失败:', err));
});

module.exports = app;
