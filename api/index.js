import axios from 'axios';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ТВОИ ДАННЫЕ - ВСЁ РАБОЧЕЕ!
const BIN_ID = '698cb60043b1c97be97737c8';  // НОВЫЙ бинар с {"bots":[]}
const MASTER_KEY = '$2a$10$QHXRScaYbQN5OSwoxz1kHOgi2cd6/QVOp.MgcwRgHJ5bVqT8Q2zNe';
const ACCESS_KEY = '$2a$10$LQLWRveSyBCPOlWvqdbeaOFa93X8DSfuHNafyqSruxcnvJqK/cwkK';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const path = req.query.path || '';

  // GETBOT - рандомный юзернейм
  if (path === 'getbot') {
    try {
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 
          'X-Master-Key': ACCESS_KEY,
          'X-Bin-Meta': false
        }
      });

      let bots = response.data.bots || [];
      
      if (bots.length === 0) {
        res.writeHead(404, headers);
        res.end(JSON.stringify({ 
          error: 'No bots available',
          success: false 
        }));
        return;
      }

      const randomBot = bots[Math.floor(Math.random() * bots.length)];

      res.writeHead(200, headers);
      res.end(JSON.stringify({
        success: true,
        username: randomBot.username,
        total_bots: bots.length
      }));
      return;

    } catch (error) {
      console.error('GetBot error:', error.message);
      res.writeHead(500, headers);
      res.end(JSON.stringify({ 
        error: 'Failed to fetch bots',
        success: false 
      }));
      return;
    }
  }

  // ENTER - добавить бота
  if (path === 'enter') {
    const token = req.method === 'GET' ? req.query.token : req.body?.token;

    if (!token) {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ 
        error: 'Token is required',
        success: false 
      }));
      return;
    }

    try {
      // Проверка через Telegram API
      const tgRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
      
      if (!tgRes.data.ok) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ 
          error: 'Invalid bot token',
          success: false 
        }));
        return;
      }

      const botInfo = tgRes.data.result;
      const username = botInfo.username;

      // Получаем текущие данные
      const getRes = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 
          'X-Master-Key': ACCESS_KEY,
          'X-Bin-Meta': false
        }
      });

      let bots = getRes.data.bots || [];

      // Проверяем существование
      if (bots.find(b => b.username === username)) {
        res.writeHead(409, headers);
        res.end(JSON.stringify({ 
          error: 'Bot already exists',
          username: username,
          success: false 
        }));
        return;
      }

      // Добавляем нового бота
      bots.push({
        token: token,
        username: username,
        first_name: botInfo.first_name || null,
        addedAt: new Date().toISOString()
      });

      // Сохраняем
      await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, 
        { bots: bots },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': MASTER_KEY,
            'X-Bin-Versioning': false
          }
        }
      );

      res.writeHead(201, headers);
      res.end(JSON.stringify({
        success: true,
        username: username,
        total_bots: bots.length,
        message: 'Bot added successfully'
      }));
      return;

    } catch (error) {
      console.error('Enter error:', error.message);
      res.writeHead(500, headers);
      res.end(JSON.stringify({ 
        error: 'Failed to add bot',
        success: false 
      }));
      return;
    }
  }

  // Все остальные пути - 404
  res.writeHead(404, headers);
  res.end(JSON.stringify({ 
    error: 'This page is not available',
    success: false,
    code: 404
  }));
        }
