const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const STORAGE_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const users = [];
const sessions = [];
const messages = [];
const captchas = {};

const mockAIResponses = [
  '这是一个很好的问题！让我来分析一下...',
  '我理解你的需求，以下是我的建议：',
  '根据我的分析，我认为应该这样做：',
  '好的，我来帮你解答这个问题。',
  '这个话题很有趣，让我们深入探讨一下。',
  '我可以为你提供更多信息，如果你需要的话。',
  '根据你的描述，我建议采取以下步骤：',
  '感谢你的提问，这是一个很有价值的话题。'
];

app.post('/users/register', (req, res) => {
  const { userName, password, nickName, captcha } = req.body;
  
  const existingUser = users.find(u => u.userName === userName);
  if (existingUser) {
    return res.json({ code: 0, msg: '用户名已存在', data: null });
  }
  
  if (!captchas[userName] || captchas[userName] !== captcha) {
    return res.json({ code: 0, msg: '验证码错误', data: null });
  }
  
  const user = {
    id: generateId(),
    userName,
    password,
    nickName,
    token: generateId()
  };
  
  users.push(user);
  delete captchas[userName];
  
  res.json({ code: 1, msg: '注册成功', data: { nickName: user.nickName, token: user.token } });
});

app.get('/users/register-captcha', (req, res) => {
  const { address } = req.query;
  const captcha = Math.floor(100000 + Math.random() * 900000).toString();
  captchas[address] = captcha;
  
  console.log(`验证码已发送到 ${address}: ${captcha}`);
  res.json({ code: 1, msg: '验证码已发送', data: { captcha } });
});

app.post('/users/login', (req, res) => {
  const { userName, password } = req.body;
  
  const user = users.find(u => u.userName === userName && u.password === password);
  
  if (!user) {
    return res.json({ code: 0, msg: '用户名或密码错误', data: null });
  }
  
  res.json({ code: 1, msg: '登录成功', data: { nickName: user.nickName, token: user.token } });
});

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.json({ code: 401, msg: '未登录', data: null });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  const user = users.find(u => u.token === token);
  
  if (!user) {
    return res.json({ code: 401, msg: '登录状态无效', data: null });
  }
  
  req.user = user;
  next();
};

app.post('/chat/createChat', authenticate, (req, res) => {
  const { chatTitle } = req.body;
  
  const session = {
    id: generateId(),
    title: chatTitle || '新会话',
    isActive: true,
    userId: parseInt(req.user.id) || 1,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  };
  
  sessions.push(session);
  
  res.json({ code: 1, msg: '创建成功', data: session });
});

app.get('/chat/userChat', authenticate, (req, res) => {
  const userSessions = sessions.filter(s => s.userId === (parseInt(req.user.id) || 1));
  res.json({ code: 1, msg: null, data: userSessions });
});

app.get('/chat/:id', authenticate, (req, res) => {
  const session = sessions.find(s => s.id === req.params.id);
  
  if (!session) {
    return res.json({ code: 404, msg: '会话不存在', data: null });
  }
  
  res.json({ code: 1, msg: null, data: session });
});

app.post('/chat/updateTitle', authenticate, (req, res) => {
  const { chatId, title } = req.body;
  
  const session = sessions.find(s => s.id === chatId);
  
  if (!session) {
    return res.json({ code: 404, msg: '会话不存在', data: null });
  }
  
  session.title = title;
  session.updateTime = new Date().toISOString();
  
  res.json({ code: 1, msg: '更新成功', data: null });
});

app.get('/chat/deleteChat/:id', authenticate, (req, res) => {
  const index = sessions.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, msg: '会话不存在', data: null });
  }
  
  sessions.splice(index, 1);
  messages = messages.filter(m => m.chatId !== req.params.id);
  
  res.json({ code: 1, msg: '删除成功', data: null });
});

app.get('/chat/messages/:id', authenticate, (req, res) => {
  const chatMessages = messages.filter(m => m.chatId === req.params.id);
  res.json({ code: 1, msg: null, data: chatMessages });
});

app.post('/chat/sendMessage', authenticate, (req, res) => {
  const { id, message } = req.body;
  
  const userMessage = {
    id: generateId(),
    role: 'user',
    content: message,
    chatId: id,
    createdAt: new Date().toISOString(),
    imgUrl: null,
    fileContent: null
  };
  
  messages.push(userMessage);
  
  const aiResponse = {
    id: generateId(),
    role: 'system',
    content: mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)] + '\n\n' + message,
    chatId: id,
    createdAt: new Date().toISOString(),
    imgUrl: null,
    fileContent: null
  };
  
  setTimeout(() => {
    messages.push(aiResponse);
  }, 1000);
  
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.updateTime = new Date().toISOString();
  }
  
  res.json({ code: 1, msg: '发送成功', data: null });
});

app.get('/chat/getChat/:chatId', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  let messageId = 0;
  
  const interval = setInterval(() => {
    const chatMessages = messages.filter(m => m.chatId === req.params.chatId);
    const newMessages = chatMessages.slice(messageId);
    
    if (newMessages.length > 0) {
      newMessages.forEach(msg => {
        res.write(`data: ${JSON.stringify(msg)}\n\n`);
      });
      messageId = chatMessages.length;
    }
  }, 500);
  
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.get('/chat/searchChat', authenticate, (req, res) => {
  const { keyWord } = req.query;
  
  const filteredMessages = messages.filter(m => 
    m.content.includes(keyWord)
  );
  
  res.json({ code: 1, msg: null, data: filteredMessages });
});

app.get('/file/check', authenticate, (req, res) => {
  const { fileId, fileName } = req.query;
  
  res.json({
    code: 1,
    msg: null,
    data: {
      fileStatus: 0,
      isCompleted: false,
      uploaded: [],
      uploadedChunks: 0
    }
  });
});

app.post('/file/upload', authenticate, (req, res) => {
  const chunkHash = generateId();
  res.json({ code: 1, msg: '上传成功', data: { chunkHash } });
});

app.post('/file/merge', authenticate, (req, res) => {
  const { fileName } = req.body;
  
  res.json({
    code: 1,
    msg: '合并成功',
    data: {
      filePath: `/uploads/${fileName}`,
      fileName
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
