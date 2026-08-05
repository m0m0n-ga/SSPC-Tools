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
  result = result + ' ' + generateRandomString();
  return result;
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

// ===== 目玉ボタン =====
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

// ===== 投票文字数カウント =====
const pollQuestionInput = document.getElementById('pollQuestion');
if (pollQuestionInput) {
  pollQuestionInput.addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('pollCharCount').textContent = `${count} / 300`;
  });
}

// ===== Token Checker =====
let lastCheckResult = { valid: [], locked: [], invalid: [] };

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

  let valid = [], locked = [], invalid = [];

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
      badge.textContent = `✅ ${data.username}`;
      valid.push(token);
    } catch (error) {
      if (error.message.includes('401')) {
        badge.className = 'status-badge invalid';
        badge.textContent = '❌ 無効';
        invalid.push(token);
      } else if (error.message.includes('403')) {
        badge.className = 'status-badge locked';
        badge.textContent = '📱 電話制限';
        locked.push(token);
      } else {
        badge.className = 'status-badge invalid';
        badge.textContent = '❌ エラー';
        invalid.push(token);
      }
    }
  }

  lastCheckResult = { valid, locked, invalid };

  document.getElementById('validCount').textContent = valid.length;
  document.getElementById('lockedCount').textContent = locked.length;
  document.getElementById('invalidCount').textContent = invalid.length;

  log(`チェック完了: 有効${valid.length} / 電話制限${locked.length} / 無効${invalid.length}`, 'info');
});

// ===== 有効なトークンをコピー =====
document.getElementById('copyValidBtn').addEventListener('click', function() {
  const validTokens = lastCheckResult.valid;
  if (!validTokens.length) {
    setStatus('⚠ 有効なトークンがありません', true);
    return;
  }
  const text = validTokens.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    setStatus(`✅ ${validTokens.length}個の有効なトークンをコピーしました`);
    log(`${validTokens.length}個の有効なトークンをコピー`, 'success');
  }).catch(() => {
    setStatus('❌ コピーに失敗しました', true);
  });
});

// ===== 無効なトークンを削除 =====
document.getElementById('removeInvalidBtn').addEventListener('click', function() {
  const invalidTokens = lastCheckResult.invalid;
  if (!invalidTokens.length) {
    setStatus('⚠ 無効なトークンがありません', true);
    return;
  }

  const input = document.getElementById('checkTokens');
  const allTokens = parseList(input.value);
  const validTokens = allTokens.filter(t => !invalidTokens.includes(t));
  input.value = validTokens.join('\n');

  const resultDiv = document.getElementById('tokenCheckResult');
  resultDiv.innerHTML = '';
  resultDiv.classList.remove('show');

  document.getElementById('validCount').textContent = validTokens.length;
  document.getElementById('lockedCount').textContent = 0;
  document.getElementById('invalidCount').textContent = 0;
  lastCheckResult = { valid: [], locked: [], invalid: [] };

  setStatus(`🗑 ${invalidTokens.length}個の無効なトークンを削除しました`);
  log(`${invalidTokens.length}個の無効なトークンを削除`, 'success');
});

// ===== Spam Tool =====
document.getElementById('autoChannel').addEventListener('click', async function() {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!guildId) return setStatus('⚠ サーバーIDがありません', true);

  try {
    setStatus('📡 取得中...');
    const data = await apiCall(tokens[0], `/guilds/${guildId}/channels`);
    const textChannels = data.filter(c => c.type === 0).map(c => c.id);
    document.getElementById('channelIds').value = textChannels.join(', ');
    setStatus(`✅ ${textChannels.length}個のチャンネルを取得`);
    log(`${textChannels.length}個のチャンネルを取得`, 'success');
  } catch (e) {
    setStatus('❌ 取得失敗', true);
    log('チャンネル取得エラー: ' + e.message, 'error');
  }
});

document.getElementById('leaveBtn').addEventListener('click', async function() {
  const tokens = getTokens();
  const guildId = document.getElementById('guildId').value.trim();
  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!guildId) return setStatus('⚠ サーバーIDがありません', true);

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

document.getElementById('startBtn').addEventListener('click', async function() {
  if (running) return setStatus('⚠ 実行中です', true);

  const tokens = getTokens();
  const channelIds = getChannelIds();
  const guildId = document.getElementById('guildId').value.trim();
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
  const pollQuestion = document.getElementById('pollQuestion').value.trim();
  const pollAnswersText = document.getElementById('pollAnswers').value;
  const pollAnswers = parseList(pollAnswersText);
  const pollDuration = parseInt(document.getElementById('pollDuration').value) || 24;
  const pollMulti = document.getElementById('pollMulti').checked;

  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDがありません', true);
  if (!baseMessage) return setStatus('⚠ メッセージがありません', true);

  if (pollEnabled && pollAnswers.length < 2) {
    return setStatus('⚠ 投票には2つ以上の選択肢が必要です', true);
  }

  running = true;
  stopFlag = false;
  let totalSent = 0;
  let errors = 0;

  setStatus(`⚡ 実行中 (${tokens.length}トークン × ${channelIds.length}チャンネル)`);
  log(`🚀 開始`, 'info');

  try {
    while (!stopFlag) {
      if (limit > 0 && totalSent >= limit) break;

      for (const token of tokens) {
        if (stopFlag) break;
        for (const channelId of channelIds) {
          if (stopFlag) break;
          if (limit > 0 && totalSent >= limit) break;

          let content = baseMessage;
          if (mentionEveryone) content = '@everyone ' + content;
          if (randomize) content = randomizeText(content);

          if (mentionEnabled && userIds.length > 0) {
            const shuffled = [...userIds].sort(() => Math.random() - 0.5);
            const batch = shuffled.slice(0, mentionsPerMsg);
            content = batch.map(id => `<@${id}>`).join(' ') + ' ' + content;
          }

          let replyTarget = null;
          if (replyEnabled) {
            try {
              const msgs = await apiCall(token, `/channels/${channelId}/messages?limit=${Math.min(replyHistoryLimit, 100)}`);
              const replyMessages = msgs.filter(m => m.author.id !== '自分');
              if (replyMessages.length > 0) {
                replyTarget = replyMessages[Math.floor(Math.random() * replyMessages.length)];
              }
            } catch (e) {
              log('リプライ用メッセージ取得失敗', 'error');
            }
          }

          let retries = 0;
          let success = false;
          while (retries < rateLimitRetry && !success) {
            try {
              let payload = { content };

              if (replyTarget) {
                payload.message_reference = {
                  message_id: replyTarget.id,
                  channel_id: channelId,
                  guild_id: guildId
                };
              }

              if (pollEnabled && pollAnswers.length >= 2) {
                payload.poll = {
                  question: { text: pollQuestion || "投票" },
                  answers: pollAnswers.map((text, i) => ({
                    answer_id: i + 1,
                    poll_media: { text: text.trim() }
                  })),
                  duration: Math.min(Math.max(pollDuration, 1), 336),
                  allow_multiselect: pollMulti,
                  layout_type: 1
                };
              }

              const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);

              totalSent++;
              success = true;
              log(`✅ 送信完了`, 'success');
              setStatus(`⚡ ${totalSent}回送信完了`);

            } catch (e) {
              retries++;
              if (e.message.includes('429')) {
                log(`⚠ レート制限 (リトライ${retries}/${rateLimitRetry})`, 'info');
                await new Promise(r => setTimeout(r, 5000 * retries));
              } else if (e.message.includes('403') && pollEnabled) {
                log(`❌ 投票失敗: ユーザートークンではPollが作成できない可能性があります`, 'error');
                break;
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
          if (stopFlag) break;
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
    setStatus(`⏹ 停止: ${totalSent}成功 / ${errors}エラー`);
    log(`⏹ 停止`, 'info');
  }
});

document.getElementById('stopBtn').addEventListener('click', function() {
  if (running) {
    stopFlag = true;
    setStatus('⛔ 停止');
    log('停止', 'info');
  } else {
    setStatus('⚠ 実行中ではありません', true);
  }
});

document.getElementById('autoUsers').addEventListener('click', async function() {
  const tokens = getTokens();
  const channelIds = getChannelIds();
  const limit = parseInt(document.getElementById('messageLimit').value) || 100;

  if (!tokens.length) return setStatus('⚠ トークンがありません', true);
  if (!channelIds.length) return setStatus('⚠ チャンネルIDがありません', true);

  try {
    setStatus('👥 取得中...');
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

setStatus('⚠ トークンを入力してください');
log('SSPC Web Tools ロード完了', 'info');
log('⚠ このツールはDiscordの利用規約に違反します。自己責任で使用してください', 'error');
