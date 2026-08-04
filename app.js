const API_BASE = 'https://discord.com/api/v10';

let running = false;
let stopFlag = false;
let pollCount = 0;

const statusDiv = document.getElementById('status');
const logDiv = document.getElementById('log');

function setStatus(msg, isError = false) {
  if (!statusDiv) return;
  statusDiv.textContent = msg;
  statusDiv.style.borderColor = isError ? '#4a1a1a' : '#1a2a3a';
  statusDiv.style.color = isError ? '#ff6a6a' : '#7a8a9a';
}

function log(msg, type = 'info') {
  if (!logDiv) return;
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function parseList(text) {
  if (!text) return [];
  return text.split(/[, \n]+/).map(s => s.trim()).filter(Boolean);
}

function getTokens() {
  const el = document.getElementById('spamTokens');
  return el ? parseList(el.value) : [];
}

function getChannelIds() {
  const el = document.getElementById('channelIds');
  return el ? parseList(el.value) : [];
}

async function apiCall(token, endpoint, method = 'GET', body = null) {
  const headers = {
    'Authorization': token,
    'Content-Type': 'application/json',
    'User-Agent': 'SSPC-WebTools (https://github.com, 1.0)',
    'Accept': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE}${endpoint}`;
  log(`📡 ${method} ${endpoint}`, 'info');

  try {
    const res = await fetch(url, options);
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errMsg = isJson ? JSON.stringify(data) : data;
      log(`❌ APIエラー: HTTP ${res.status} - ${errMsg}`, 'error');
      throw new Error(`HTTP ${res.status}: ${errMsg}`);
    }

    log(`✅ ${method} ${endpoint} 成功 (${res.status})`, 'success');
    return data;
  } catch (e) {
    if (!e.message.startsWith('HTTP')) {
      log(`❌ ネットワークエラー: ${e.message}`, 'error');
    }
    throw e;
  }
}

function generateRandomString() {
  const length = Math.floor(Math.random() * 5) + 3;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomizeText(text) {
  let result = text || '';
  const num = Math.floor(Math.random() * 9999);
  const names = ['Zero', 'Alpha', 'Omega', 'Strike', 'Viper', 'Ghost', 'Shadow', 'Blade'];
  const name = names[Math.floor(Math.random() * names.length)];
  result = result.replace(/{num}/g, num).replace(/{name}/g, name);
  const randStr = generateRandomString();
  result = result + ' ' + randStr;
  log(`ランダム文字列: ${randStr}`, 'info');
  return result;
}

async function sendMessage(token, channelId, content) {
  return apiCall(token, `/channels/${channelId}/messages`, 'POST', { content });
}

// ===== タブ切り替え =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(this.dataset.tab).classList.add('active');
  });
});

// ===== アコーディオン =====
document.querySelectorAll('.accordion-header').forEach(header => {
  header.addEventListener('click', function() {
    const targetId = this.dataset.target;
    const body = document.getElementById(targetId);
    if (body) {
      body.classList.toggle('open');
    }
  });
});

// ===== 目玉ボタン（トークン表示切替） =====
document.querySelectorAll('.toggle-visibility').forEach(btn => {
  btn.addEventListener('click', function() {
    const targetId = this.dataset.target;
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    if (this.classList.contains('hidden')) {
      this.classList.remove('hidden');
      textarea.style.webkitTextSecurity = 'none';
      this.textContent = '👁️';
    } else {
      this.classList.add('hidden');
      textarea.style.webkitTextSecurity = 'disc';
      this.textContent = '🔒';
    }
  });
});

// ============================================================
// Token Checker
// ============================================================
document.getElementById('checkTokensBtn').addEventListener('click', async function() {
  const tokens = parseList(document.getElementById('checkTokens').value);
  const resultDiv = document.getElementById('tokenCheckResult');

  if (!tokens.length) {
    resultDiv.innerHTML = '<div style="color:#ff6a6a;padding:8px;">⚠ トークンを入力してください</div>';
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

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-token-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = 'トークンをコピー';
    copyBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      navigator.clipboard.writeText(token).then(() => {
        this.textContent = '✅';
        setTimeout(() => { this.textContent = '📋'; }, 1500);
      }).catch(() => {
        this.textContent = '❌';
        setTimeout(() => { this.textContent = '📋'; }, 1500);
      });
    });

    entry.appendChild(preview);
    entry.appendChild(badge);
    entry.appendChild(copyBtn);
    resultDiv.appendChild(entry);

    try {
      const data = await apiCall(token, '/users/@me');
      badge.className = 'status-badge valid';
      badge.textContent = `✅ ${data.username}`;
      valid++;
    } catch (error) {
      if (error.message.includes('401')) {
        badge.className = 'status-badge invalid';
        badge.textContent = '❌ 無効';
        invalid++;
      } else if (error.message.includes('403')) {
        badge.className = 'status-badge locked';
        badge.textContent = '📱 電話制限';
        locked++;
      } else {
        badge.className = 'status-badge invalid';
        badge.textContent = '❌ エラー';
        invalid++;
      }
    }
  }

  document.getElementById('validCount').textContent = valid;
  document.getElementById('lockedCount').textContent = locked;
  document.getElementById('invalidCount').textContent = invalid;

  log(`チェック完了: 有効${valid} / 電話制限${locked} / 無効${invalid}`, 'info');
});

// ============================================================
// Spam Tool
// ============================================================

// ----- チャンネル自動取得（強化版） -----
document.getElementById('autoChannel').addEventListener('click', async function() {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!guildId) return setStatus('⚠ サーバーIDがありません', true);

  try {
    setStatus('📡 チャンネル取得中...');
    log(`📡 チャンネル取得: /guilds/${guildId}/channels`, 'info');
    const data = await apiCall(tokens[0], `/guilds/${guildId}/channels`);
    if (!Array.isArray(data)) {
      throw new Error('APIが配列を返しませんでした: ' + JSON.stringify(data));
    }
    const textChannels = data.filter(c => c.type === 0).map(c => c.id);
    document.getElementById('channelIds').value = textChannels.join(', ');
    setStatus(`✅ ${textChannels.length}個のチャンネルを取得`);
    log(`${textChannels.length}個のテキストチャンネルを取得: ${textChannels.join(', ')}`, 'success');
  } catch (e) {
    setStatus('❌ チャンネル取得失敗', true);
    log(`チャンネル取得エラー: ${e.message}`, 'error');
  }
});

// ----- サーバー退出（強化版） -----
document.getElementById('leaveBtn').addEventListener('click', async function() {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!guildId) return setStatus('⚠ サーバーIDがありません', true);

  setStatus('🚪 退出処理中...');
  log(`🚪 サーバー退出開始: ${tokens.length}個のトークン, サーバーID: ${guildId}`, 'info');

  let ok = 0, fail = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenPreview = token.slice(0, 10) + '...';
    log(`🚪 退出試行 ${i+1}/${tokens.length}: ${tokenPreview}`, 'info');

    try {
      const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'User-Agent': 'SSPC-WebTools (https://github.com, 1.0)',
          'Accept': 'application/json',
        }
      });

      const responseText = await res.text();
      log(`📡 退出レスポンス: HTTP ${res.status} - ${responseText || '（空）'}`, 'info');

      if (res.ok) {
        ok++;
        log(`✅ 退出成功 (${i+1}/${tokens.length})`, 'success');
      } else if (res.status === 400) {
        fail++;
        log(`❌ 退出失敗: HTTP 400 - サーバーIDが間違っているか、このサーバーに所属していません (${tokenPreview})`, 'error');
        log(`💡 確認: サーバーID「${guildId}」が正しいか、このトークンでそのサーバーに参加しているか確認してください`, 'error');
      } else if (res.status === 401) {
        fail++;
        log(`❌ 退出失敗: HTTP 401 - トークンが無効です (${tokenPreview})`, 'error');
      } else if (res.status === 403) {
        fail++;
        log(`❌ 退出失敗: HTTP 403 - 権限がありません (${tokenPreview})`, 'error');
      } else {
        fail++;
        log(`❌ 退出失敗: HTTP ${res.status} - ${responseText || '原因不明'} (${tokenPreview})`, 'error');
      }
    } catch (e) {
      fail++;
      log(`❌ 退出失敗: ネットワークエラー - ${e.message} (${tokenPreview})`, 'error');
    }
  }

  setStatus(`✅ 退出処理完了: 成功${ok} / 失敗${fail}`);
  log(`🚪 退出処理完了: 成功${ok} / 失敗${fail}`, 'info');
});

// ----- メッセージ送信（強化版） -----
document.getElementById('startBtn').addEventListener('click', async function() {
  if (running) return setStatus('⚠ 実行中です', true);

  const tokens = getTokens();
  const channelIds = getChannelIds();
  const baseMessage = document.getElementById('message').value.trim();
  const mentionEveryone = document.getElementById('mentionEveryone').checked;
  const randomize = document.getElementById('randomize').checked;

  const settingsEnabled = document.getElementById('settingsEnabled').checked;
  const interval = settingsEnabled ? parseInt(document.getElementById('sendInterval').value) || 1000 : 1000;
  const messageDelay = settingsEnabled ? parseInt(document.getElementById('messageDelay').value) || 500 : 500;
  const rateLimitRetry = settingsEnabled ? parseInt(document.getElementById('rateLimitRetry').value) || 3 : 3;
  const limit = settingsEnabled ? parseInt(document.getElementById('limit').value) || 0 : 0;

  const mentionEnabled = document.getElementById('mentionEnabled').checked;
  const userIds = mentionEnabled ? parseList(document.getElementById('userIds').value) : [];
  const mentionsPerMsg = mentionEnabled ? parseInt(document.getElementById('mentionsPerMessage').value) || 1 : 1;

  const replyEnabled = document.getElementById('replyEnabled').checked;
  const replyHistoryLimit = replyEnabled ? parseInt(document.getElementById('replyHistoryLimit').value) || 50 : 50;

  const pollEnabled = document.getElementById('pollEnabled').checked;
  const pollItems = pollEnabled ? document.querySelectorAll('.poll-item') : [];

  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDがありません', true);
  if (!baseMessage) return setStatus('⚠ メッセージがありません', true);

  running = true;
  stopFlag = false;
  let totalSent = 0;
  let errors = 0;

  const msgBase = mentionEveryone ? '@everyone ' + baseMessage : baseMessage;

  setStatus(`⚡ 実行中 (${tokens.length}トークン × ${channelIds.length}チャンネル)`);
  log(`🚀 開始: トークン${tokens.length}個, チャンネル${channelIds.length}個, 上限${limit || '無制限'}`, 'info');

  try {
    while (!stopFlag) {
      if (limit > 0 && totalSent >= limit) break;

      for (const token of tokens) {
        if (stopFlag) break;
        for (const channelId of channelIds) {
          if (stopFlag) break;
          if (limit > 0 && totalSent >= limit) break;

          // ===== 1. 通常メッセージ =====
          let content = msgBase;
          if (randomize) content = randomizeText(content);

          let retries = 0;
          let success = false;
          while (retries < rateLimitRetry && !success) {
            try {
              await sendMessage(token, channelId, content);
              totalSent++;
              success = true;
              log(`✅ メッセージ送信成功 (${totalSent}回目)`, 'success');
              setStatus(`⚡ ${totalSent}回送信完了`);
            } catch (e) {
              retries++;
              if (e.message.includes('429')) {
                const waitTime = 5000 * retries;
                log(`⚠ レート制限: ${waitTime}ms待機 (リトライ${retries}/${rateLimitRetry})`, 'info');
                await new Promise(r => setTimeout(r, waitTime));
              } else {
                errors++;
                log(`❌ メッセージ送信失敗: ${e.message}`, 'error');
                break;
              }
            }
          }

          if (messageDelay > 0 && !stopFlag) {
            await new Promise(r => setTimeout(r, messageDelay));
          }
          if (stopFlag) break;

          // ===== 2. ユーザーメンション =====
          if (mentionEnabled && userIds.length > 0) {
            let replyMessages = [];
            if (replyEnabled) {
              try {
                const msgs = await apiCall(token, `/channels/${channelId}/messages?limit=${Math.min(replyHistoryLimit, 100)}`);
                replyMessages = msgs.filter(m => m.author.id !== '自分');
                log(`📜 リプライ用メッセージ: ${replyMessages.length}件取得`, 'info');
              } catch (e) {
                log(`⚠ リプライ用メッセージ取得失敗: ${e.message}`, 'error');
              }
            }

            const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
            for (let i = 0; i < shuffledUsers.length; i += mentionsPerMsg) {
              if (stopFlag) break;
              const batch = shuffledUsers.slice(i, i + mentionsPerMsg);
              let mentionContent = baseMessage;
              if (randomize) mentionContent = randomizeText(mentionContent);

              mentionContent = batch.map(id => `<@${id}>`).join(' ') + ' ' + mentionContent;

              if (replyEnabled && replyMessages.length > 0) {
                const replyTarget = replyMessages[Math.floor(Math.random() * replyMessages.length)];
                mentionContent = `> ${replyTarget.content.slice(0, 50)}\n${mentionContent}`;
              }

              retries = 0;
              success = false;
              while (retries < rateLimitRetry && !success) {
                try {
                  await sendMessage(token, channelId, mentionContent);
                  totalSent++;
                  success = true;
                  log(`✅ メンション送信成功 (${totalSent}回目)`, 'success');
                  setStatus(`⚡ ${totalSent}回送信完了`);
                } catch (e) {
                  retries++;
                  if (e.message.includes('429')) {
                    const waitTime = 5000 * retries;
                    log(`⚠ レート制限: ${waitTime}ms待機 (リトライ${retries}/${rateLimitRetry})`, 'info');
                    await new Promise(r => setTimeout(r, waitTime));
                  } else {
                    errors++;
                    log(`❌ メンション送信失敗: ${e.message}`, 'error');
                    break;
                  }
                }
              }

              if (messageDelay > 0 && !stopFlag) {
                await new Promise(r => setTimeout(r, messageDelay));
              }
              if (stopFlag) break;
            }
          }

          if (stopFlag) break;

          // ===== 3. 投票 =====
          if (pollEnabled && pollItems.length > 0) {
            for (const pollEl of pollItems) {
              if (stopFlag) break;
              const question = pollEl.querySelector('.poll-question')?.value || '投票';
              const optionsText = pollEl.querySelector('.poll-options')?.value || '';
              const options = parseList(optionsText);
              const multi = pollEl.querySelector('.poll-multi')?.checked || false;

              if (!options.length) {
                log(`⚠ 投票「${question}」に選択肢がありません`, 'error');
                continue;
              }

              let pollContent = `📊 **${question}**\n`;
              if (multi) pollContent += '（複数選択可）\n';
              options.forEach((opt, idx) => {
                pollContent += `${idx + 1}. ${opt}\n`;
              });
              pollContent += '\n🔄 リアクションで投票してください！';

              retries = 0;
              success = false;
              while (retries < rateLimitRetry && !success) {
                try {
                  await sendMessage(token, channelId, pollContent);
                  totalSent++;
                  success = true;
                  log(`✅ 投票送信成功 (${totalSent}回目)`, 'success');
                  setStatus(`⚡ ${totalSent}回送信完了`);
                } catch (e) {
                  retries++;
                  if (e.message.includes('429')) {
                    const waitTime = 5000 * retries;
                    log(`⚠ レート制限: ${waitTime}ms待機 (リトライ${retries}/${rateLimitRetry})`, 'info');
                    await new Promise(r => setTimeout(r, waitTime));
                  } else {
                    errors++;
                    log(`❌ 投票送信失敗: ${e.message}`, 'error');
                    break;
                  }
                }
              }

              if (messageDelay > 0 && !stopFlag) {
                await new Promise(r => setTimeout(r, messageDelay));
              }
              if (stopFlag) break;
            }
          }

          if (stopFlag) break;
        }
      }

      if (interval > 0 && !stopFlag) {
        await new Promise(r => setTimeout(r, interval));
      }
    }
  } catch (e) {
    setStatus('❌ エラー', true);
    log(`予期せぬエラー: ${e.message}`, 'error');
  } finally {
    running = false;
    setStatus(`⏹ 停止: ${totalSent}成功 / ${errors}エラー`);
    log(`⏹ 停止: ${totalSent}成功, ${errors}エラー`, 'info');
  }
});

// ----- スパム停止 -----
document.getElementById('stopBtn').addEventListener('click', function() {
  if (running) {
    stopFlag = true;
    setStatus('⛔ 停止リクエスト送信');
    log('停止リクエストを受信', 'info');
  } else {
    setStatus('⚠ 実行中ではありません', true);
  }
});

// ----- ユーザーID自動取得（強化版） -----
document.getElementById('autoUsers').addEventListener('click', async function() {
  const tokens = getTokens();
  const channelIds = getChannelIds();
  const limit = parseInt(document.getElementById('messageLimit').value) || 100;

  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDがありません', true);

  try {
    setStatus('👥 ユーザー取得中...');
    log(`👥 ユーザー取得: /channels/${channelIds[0]}/messages?limit=${Math.min(limit, 100)}`, 'info');
    const data = await apiCall(tokens[0], `/channels/${channelIds[0]}/messages?limit=${Math.min(limit, 100)}`);
    if (!Array.isArray(data)) {
      throw new Error('APIが配列を返しませんでした');
    }
    const userIds = [...new Set(data.map(m => m.author.id))];
    document.getElementById('userIds').value = userIds.join('\n');
    setStatus(`✅ ${userIds.length}人のユーザーを取得`);
    log(`${userIds.length}人のユーザーIDを取得: ${userIds.join(', ')}`, 'success');
  } catch (e) {
    setStatus('❌ ユーザー取得失敗', true);
    log(`ユーザー取得エラー: ${e.message}`, 'error');
  }
});

// ----- 投票追加 -----
document.getElementById('addPollBtn').addEventListener('click', function() {
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

  poll.querySelector('.remove-poll').addEventListener('click', function() {
    poll.remove();
  });
});

// ============================================================
// 初期化
// ============================================================

setStatus('⚠ トークンを入力してください');
log('SSPC Web Tools ロード完了 (API v10)', 'info');
log('⚠ このツールはDiscordの利用規約に違反します。自己責任で使用してください', 'error');
