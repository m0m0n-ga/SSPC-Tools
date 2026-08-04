// ============================================================
// SSPC Web Tools - 全機能（2カラム + アコーディオン）
// 注意: Discord利用規約に違反します。自己責任で使用してください。
// ============================================================

const API_BASE = 'https://discord.com/api/v9';

let running = false;
let stopFlag = false;
let pollCount = 0;

const statusDiv = document.getElementById('status');
const logDiv = document.getElementById('log');

// ============================================================
// ユーティリティ
// ============================================================

function setStatus(msg, isError = false) {
  statusDiv.textContent = msg;
  statusDiv.style.borderColor = isError ? '#4a1a1a' : '#1a2a3a';
  statusDiv.style.color = isError ? '#ff6a6a' : '#7a8a9a';
}

function log(msg, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function parseList(text) {
  return text.split(/[, \n]+/).map(s => s.trim()).filter(Boolean);
}

function getTokens() {
  return parseList(document.getElementById('tokens').value);
}

function getChannelIds() {
  return parseList(document.getElementById('channelIds').value);
}

async function apiCall(token, endpoint, method = 'GET', body = null) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function generateRandomString(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomizeText(text) {
  const num = Math.floor(Math.random() * 9999);
  const names = ['Zero', 'Alpha', 'Omega', 'Strike', 'Viper', 'Ghost', 'Shadow', 'Blade'];
  const name = names[Math.floor(Math.random() * names.length)];
  return text.replace(/{num}/g, num).replace(/{name}/g, name);
}

async function sendMessage(token, channelId, content) {
  return apiCall(token, `/channels/${channelId}/messages`, 'POST', { content });
}

// ============================================================
// アコーディオン
// ============================================================

document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', () => {
    const targetId = header.dataset.target;
    const body = document.getElementById(targetId);
    const arrow = header.querySelector('.accordion-arrow');
    
    body.classList.toggle('open');
    header.classList.toggle('active');
    
    if (body.classList.contains('open')) {
      arrow.textContent = '▼';
    } else {
      arrow.textContent = '▶';
    }
  });
});

// ============================================================
// 🔍 トークンチェッカー
// ============================================================

document.getElementById('checkTokensBtn').addEventListener('click', async () => {
  const tokens = parseList(document.getElementById('checkTokens').value);
  const resultDiv = document.getElementById('tokenCheckResult');
  
  if (!tokens.length) {
    resultDiv.innerHTML = '<div class="token-entry" style="color:#ff6a6a;">⚠ チェックするトークンを入力してください</div>';
    resultDiv.classList.add('show');
    return;
  }

  resultDiv.innerHTML = '';
  resultDiv.classList.add('show');
  
  let valid = 0, locked = 0, invalid = 0;

  for (const token of tokens) {
    const entry = document.createElement('div');
    entry.className = 'token-entry';
    
    const preview = document.createElement('span');
    preview.className = 'token-preview';
    preview.textContent = token.slice(0, 18) + '...' + token.slice(-6);
    
    const badge = document.createElement('span');
    badge.className = 'status-badge checking';
    badge.textContent = '🔍 チェック中...';
    
    entry.appendChild(preview);
    entry.appendChild(badge);
    resultDiv.appendChild(entry);

    try {
      const data = await apiCall(token, '/users/@me');
      badge.className = 'status-badge valid';
      badge.textContent = `✅ ${data.username}#${data.discriminator || '0'}`;
      valid++;
    } catch (error) {
      const status = error.message;
      if (status.includes('401')) {
        badge.className = 'status-badge invalid';
        badge.textContent = '❌ 無効';
        invalid++;
      } else if (status.includes('403')) {
        badge.className = 'status-badge locked';
        badge.textContent = '📱 電話制限';
        locked++;
      } else {
        badge.className = 'status-badge invalid';
        badge.textContent = `❌ ${status}`;
        invalid++;
      }
    }
  }

  document.getElementById('validCount').textContent = valid;
  document.getElementById('lockedCount').textContent = locked;
  document.getElementById('invalidCount').textContent = invalid;

  log(`✅ トークンチェック完了: 有効${valid} / 電話制限${locked} / 無効${invalid}`, 'success');
});

// ============================================================
// チャンネル自動取得
// ============================================================

document.getElementById('autoChannel').addEventListener('click', async () => {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンを入力', true), log('トークンがありません', 'error');
  if (!guildId) return setStatus('⚠ サーバーIDを入力', true), log('サーバーIDがありません', 'error');

  try {
    setStatus('📡 取得中...');
    const data = await apiCall(tokens[0], `/guilds/${guildId}/channels`);
    const textChannels = data.filter(c => c.type === 0).map(c => c.id);
    document.getElementById('channelIds').value = textChannels.join(', ');
    setStatus(`✅ ${textChannels.length}個のチャンネルを取得`);
    log(`${textChannels.length}個のテキストチャンネルを取得`, 'success');
  } catch (e) {
    setStatus('❌ 取得失敗', true);
    log('チャンネル取得エラー: ' + e.message, 'error');
  }
});

// ============================================================
// サーバー退出
// ============================================================

document.getElementById('leaveBtn').addEventListener('click', async () => {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンを入力', true);
  if (!guildId) return setStatus('⚠ サーバーIDを入力', true);

  setStatus('🚪 退出処理中...');
  let ok = 0, fail = 0;
  for (const token of tokens) {
    try {
      await apiCall(token, `/users/@me/guilds/${guildId}`, 'DELETE');
      ok++;
      log(`退出成功 (${token.slice(0,10)}...)`, 'success');
    } catch (e) {
      fail++;
      log(`退出失敗: ${e.message}`, 'error');
    }
  }
  setStatus(`✅ 完了: 成功${ok} / 失敗${fail}`);
});

// ============================================================
// メッセージ一括送信
// ============================================================

document.getElementById('startBtn').addEventListener('click', async () => {
  if (running) return setStatus('⚠ 実行中', true), log('既に実行中です', 'error');

  const tokens = getTokens();
  const channelIds = getChannelIds();
  const message = document.getElementById('message').value.trim();
  const interval = parseInt(document.getElementById('sendInterval').value) || 1000;
  const messageDelay = parseInt(document.getElementById('messageDelay').value) || 500;
  const limit = parseInt(document.getElementById('limit').value) || 0;
  const mentionEveryone = document.getElementById('mentionEveryone').checked;
  const randomize = document.getElementById('randomize').checked;
  const randomString = document.getElementById('randomString').checked;
  const rateLimitRetry = parseInt(document.getElementById('rateLimitRetry').value) || 3;

  if (!tokens.length) return setStatus('⚠ トークンを入力', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDを入力', true);
  if (!message) return setStatus('⚠ メッセージを入力', true);

  running = true;
  stopFlag = false;
  let count = 0;
  let errors = 0;

  const baseMessage = mentionEveryone ? '@everyone ' + message : message;

  setStatus(`⚡ 実行中 (${tokens.length}トークン × ${channelIds.length}チャンネル)`);
  log(`🚀 開始: 間隔${interval}ms, 遅延${messageDelay}ms, 上限${limit || '無制限'}`, 'info');

  try {
    while (!stopFlag) {
      if (limit > 0 && count >= limit) break;

      for (const token of tokens) {
        if (stopFlag) break;
        for (const channelId of channelIds) {
          if (stopFlag) break;
          if (limit > 0 && count >= limit) break;

          let content = baseMessage;
          if (randomize) content = randomizeText(content);
          if (randomString) content += ' ' + generateRandomString(16);

          let retries = 0;
          let success = false;
          while (retries < rateLimitRetry && !success) {
            try {
              await sendMessage(token, channelId, content);
              count++;
              success = true;
              log(`✅ 送信成功 (${count})`, 'success');
              setStatus(`⚡ ${count}回送信完了`);
            } catch (e) {
              retries++;
              if (e.message.includes('429')) {
                log(`⚠ レート制限 (リトライ${retries}/${rateLimitRetry})`, 'info');
                await new Promise(r => setTimeout(r, 5000 * retries));
              } else {
                errors++;
                log(`❌ 送信失敗: ${e.message}`, 'error');
                break;
              }
            }
          }

          if (messageDelay > 0 && !stopFlag) {
            await new Promise(r => setTimeout(r, messageDelay));
          }
        }
      }
      if (interval > 0 && !stopFlag) {
        await new Promise(r => setTimeout(r, interval));
      }
    }
  } catch (e) {
    setStatus('❌ エラー', true);
    log('予期せぬエラー: ' + e.message, 'error');
  } finally {
    running = false;
    setStatus(`⏹ 停止: ${count}成功 / ${errors}エラー`);
    log(`⏹ 停止: ${count}成功, ${errors}エラー`, 'info');
  }
});

document.getElementById('stopBtn').addEventListener('click', () => {
  if (running) {
    stopFlag = true;
    setStatus('⛔ 停止リクエスト送信');
    log('停止リクエスト受信', 'info');
  } else {
    setStatus('⚠ 実行中ではありません', true);
  }
});

// ============================================================
// ユーザーメンション
// ============================================================

document.getElementById('autoUsers').addEventListener('click', async () => {
  const tokens = getTokens();
  const channelIds = getChannelIds();
  const limit = parseInt(document.getElementById('messageLimit').value) || 100;

  if (!tokens.length) return setStatus('⚠ トークンを入力', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDを入力', true);

  try {
    setStatus('👥 ユーザー取得中...');
    const data = await apiCall(tokens[0], `/channels/${channelIds[0]}/messages?limit=${Math.min(limit, 100)}`);
    const userIds = [...new Set(data.map(m => m.author.id))];
    document.getElementById('userIds').value = userIds.join('\n');
    setStatus(`✅ ${userIds.length}人のユーザーを取得`);
    log(`${userIds.length}人のユーザーIDを取得`, 'success');
  } catch (e) {
    setStatus('❌ 取得失敗', true);
    log('ユーザー取得エラー: ' + e.message, 'error');
  }
});

document.getElementById('mentionStartBtn').addEventListener('click', async () => {
  if (running) return setStatus('⚠ 実行中', true);

  const tokens = getTokens();
  const channelIds = getChannelIds();
  const userIds = parseList(document.getElementById('userIds').value);
  const message = document.getElementById('message').value.trim() || 'メンション';
  const mentionsPerMsg = parseInt(document.getElementById('mentionsPerMessage').value) || 1;
  const randomReply = document.getElementById('randomReply').checked;
  const randomMention = document.getElementById('randomMention').checked;
  const randomString = document.getElementById('randomStringMention').checked;
  const historyLimit = parseInt(document.getElementById('replyHistoryLimit').value) || 50;

  if (!tokens.length) return setStatus('⚠ トークンを入力', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDを入力', true);
  if (!userIds.length) return setStatus('⚠ USER IDを入力', true);

  running = true;
  stopFlag = false;
  let count = 0;

  setStatus('👥 メンション実行中...');
  log(`👥 メンション開始: ${userIds.length}ユーザー`, 'info');

  try {
    for (const token of tokens) {
      if (stopFlag) break;
      for (const channelId of channelIds) {
        if (stopFlag) break;

        let replyMessages = [];
        if (randomReply) {
          try {
            const msgs = await apiCall(token, `/channels/${channelId}/messages?limit=${Math.min(historyLimit, 100)}`);
            replyMessages = msgs.filter(m => m.author.id !== '自分');
          } catch (e) {
            log('リプライ用メッセージ取得失敗', 'error');
          }
        }

        const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffledUsers.length; i += mentionsPerMsg) {
          if (stopFlag) break;
          const batch = shuffledUsers.slice(i, i + mentionsPerMsg);
          let content = message;
          if (randomMention) {
            const randomUser = batch[Math.floor(Math.random() * batch.length)];
            content = `<@${randomUser}> ` + content;
          } else {
            content = batch.map(id => `<@${id}>`).join(' ') + ' ' + content;
          }
          if (randomString) content += ' ' + generateRandomString(16);

          if (randomReply && replyMessages.length > 0) {
            const replyTarget = replyMessages[Math.floor(Math.random() * replyMessages.length)];
            content = `> ${replyTarget.content.slice(0, 50)}\n${content}`;
          }

          try {
            await sendMessage(token, channelId, content);
            count++;
            log(`✅ メンション送信 (${count})`, 'success');
            setStatus(`👥 ${count}回送信`);
          } catch (e) {
            log(`❌ メンション失敗: ${e.message}`, 'error');
          }

          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  } catch (e) {
    log('エラー: ' + e.message, 'error');
  } finally {
    running = false;
    setStatus(`⏹ メンション完了: ${count}回`);
    log(`⏹ メンション完了: ${count}回`, 'info');
  }
});

// ============================================================
// 投票
// ============================================================

document.getElementById('addPollBtn').addEventListener('click', () => {
  pollCount++;
  const container = document.getElementById('pollContainer');
  const poll = document.createElement('div');
  poll.className = 'poll-item';
  poll.dataset.pollId = pollCount;
  poll.innerHTML = `
    <div class="field">
      <label>❓ 質問</label>
      <input class="poll-question" value="質問 ${pollCount}">
    </div>
    <div class="field">
      <label>📝 選択肢（改行区切り）</label>
      <textarea class="poll-options" rows="3">選択肢1&#10;選択肢2</textarea>
    </div>
    <div class="checkbox-group">
      <label><input type="checkbox" class="poll-multi"> 複数選択可</label>
    </div>
    <button class="btn-secondary remove-poll" data-id="${pollCount}">🗑 削除</button>
  `;
  container.appendChild(poll);

  poll.querySelector('.remove-poll').addEventListener('click', () => {
    poll.remove();
  });
});

document.getElementById('pollStartBtn').addEventListener('click', async () => {
  if (running) return setStatus('⚠ 実行中', true);

  const tokens = getTokens();
  const channelIds = getChannelIds();
  const polls = document.querySelectorAll('.poll-item');

  if (!tokens.length) return setStatus('⚠ トークンを入力', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDを入力', true);
  if (!polls.length) return setStatus('⚠ 投票を追加してください', true);

  running = true;
  stopFlag = false;
  let count = 0;

  setStatus('📊 投票実行中...');

  try {
    for (const pollEl of polls) {
      if (stopFlag) break;
      const question = pollEl.querySelector('.poll-question').value || '投票';
      const optionsText = pollEl.querySelector('.poll-options').value;
      const options = parseList(optionsText);
      const multi = pollEl.querySelector('.poll-multi').checked;

      if (!options.length) {
        log(`投票「${question}」に選択肢がありません`, 'error');
        continue;
      }

      let content = `📊 **${question}**\n`;
      if (multi) content += '（複数選択可）\n';
      options.forEach((opt, idx) => {
        content += `${idx + 1}. ${opt}\n`;
      });
      content += '\n🔄 リアクションで投票してください！';

      for (const token of tokens) {
        if (stopFlag) break;
        for (const channelId of channelIds) {
          if (stopFlag) break;
          try {
            await sendMessage(token, channelId, content);
            count++;
            log(`✅ 投票送信: ${question}`, 'success');
            setStatus(`📊 ${count}件送信`);
          } catch (e) {
            log(`❌ 投票送信失敗: ${e.message}`, 'error');
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  } catch (e) {
    log('エラー: ' + e.message, 'error');
  } finally {
    running = false;
    setStatus(`📊 投票完了: ${count}件`);
    log(`📊 投票完了: ${count}件`, 'info');
  }
});

// ============================================================
// 初期化
// ============================================================

setStatus('⚠ トークンとサーバーIDを入力してください');
log('SSPC Web Tools ロード完了', 'info');
log('⚠ このツールはDiscordの利用規約に違反します。自己責任で使用してください', 'error');
