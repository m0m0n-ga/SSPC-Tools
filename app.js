// ============================================================
// SSPC Web Tools - メインロジック
// 注意: このツールはDiscordの利用規約に違反します。
//       使用は自己責任でお願いします。
// ============================================================

const API_BASE = 'https://discord.com/api/v9';
let running = false;
let stopFlag = false;

// --- DOM参照 ---
const statusDiv = document.getElementById('status');

// --- ステータス更新 ---
function setStatus(msg, isError = false) {
  statusDiv.textContent = msg;
  statusDiv.style.borderColor = isError ? '#4a1a1a' : '#1a2a3a';
  statusDiv.style.color = isError ? '#ff6a6a' : '#7a8a9a';
}

// --- テキストを配列にパース（カンマ/改行/スペース区切り） ---
function parseList(text) {
  return text.split(/[, \n]+/).map(s => s.trim()).filter(Boolean);
}

// --- 入力値取得 ---
function getTokens() {
  return parseList(document.getElementById('tokens').value);
}

function getChannelIds() {
  return parseList(document.getElementById('channelIds').value);
}

// --- ログ出力 ---
function log(msg, type = 'info') {
  const logDiv = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${msg}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// --- Discord API呼び出し（共通関数） ---
async function apiCall(token, endpoint, method = 'GET', body = null) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${errorText ? ': ' + errorText : ''}`);
  }

  return response.json();
}

// ============================================================
// 1. チャンネル自動取得
// ============================================================
document.getElementById('autoChannel').addEventListener('click', async () => {
  const tokens = getTokens();
  if (!tokens.length) {
    setStatus('⚠ トークンを入力してください', true);
    log('トークンが入力されていません', 'error');
    return;
  }

  const guildId = document.getElementById('guildId').value.trim();
  if (!guildId) {
    setStatus('⚠ サーバーIDを入力してください', true);
    log('サーバーIDが入力されていません', 'error');
    return;
  }

  try {
    setStatus('📡 チャンネル取得中...');
    const data = await apiCall(tokens[0], `/guilds/${guildId}/channels`);
    
    // type 0 = テキストチャンネル
    const textChannels = data.filter(channel => channel.type === 0);
    const channelIds = textChannels.map(channel => channel.id);
    
    document.getElementById('channelIds').value = channelIds.join(', ');
    setStatus(`✅ ${channelIds.length}個のテキストチャンネルを取得しました`);
    log(`${channelIds.length}個のテキストチャンネルを取得: ${channelIds.join(', ')}`, 'success');
  } catch (error) {
    setStatus('❌ チャンネル取得に失敗しました', true);
    log(`チャンネル取得エラー: ${error.message}`, 'error');
  }
});

// ============================================================
// 2. サーバー退出
// ============================================================
document.getElementById('leaveBtn').addEventListener('click', async () => {
  const tokens = getTokens();
  if (!tokens.length) {
    setStatus('⚠ トークンを入力してください', true);
    log('トークンが入力されていません', 'error');
    return;
  }

  const guildId = document.getElementById('guildId').value.trim();
  if (!guildId) {
    setStatus('⚠ サーバーIDを入力してください', true);
    log('サーバーIDが入力されていません', 'error');
    return;
  }

  setStatus('🚪 サーバー退出処理を開始します...');
  let successCount = 0;
  let failCount = 0;

  for (const token of tokens) {
    try {
      await apiCall(token, `/users/@me/guilds/${guildId}`, 'DELETE');
      successCount++;
      log(`退出成功: ${token.slice(0, 10)}...`, 'success');
    } catch (error) {
      failCount++;
      log(`退出失敗 (${token.slice(0, 10)}...): ${error.message}`, 'error');
    }
  }

  setStatus(`✅ 退出完了: 成功${successCount} / 失敗${failCount}`);
  log(`サーバー退出処理完了: 成功${successCount}件, 失敗${failCount}件`, 'info');
});

// ============================================================
// 3. メッセージ送信（コア機能）
// ============================================================
async function sendMessage(token, channelId, content) {
  return apiCall(token, `/channels/${channelId}/messages`, 'POST', { content });
}

// --- ランダマイズ処理 ---
function randomizeText(text) {
  const num = Math.floor(Math.random() * 9999);
  const names = ['Zero', 'Alpha', 'Omega', 'Strike', 'Viper', 'Ghost', 'Shadow', 'Blade'];
  const name = names[Math.floor(Math.random() * names.length)];
  return text.replace(/{num}/g, num).replace(/{name}/g, name);
}

// --- 実行ボタン ---
document.getElementById('startBtn').addEventListener('click', async () => {
  // 既に実行中ならエラー
  if (running) {
    setStatus('⚠ 既に実行中です', true);
    log('実行中に再実行しようとしました', 'error');
    return;
  }

  // --- 入力値の取得 ---
  const tokens = getTokens();
  const channelIds = getChannelIds();
  const message = document.getElementById('message').value.trim();
  const interval = parseInt(document.getElementById('interval').value) || 0;
  const limit = parseInt(document.getElementById('limit').value) || 0;
  const mentionEveryone = document.getElementById('mentionEveryone').checked;
  const randomize = document.getElementById('randomize').checked;

  // --- バリデーション ---
  if (!tokens.length) {
    setStatus('⚠ トークンを入力してください', true);
    log('トークンが入力されていません', 'error');
    return;
  }
  if (!channelIds.length) {
    setStatus('⚠ チャンネルIDを入力してください', true);
    log('チャンネルIDが入力されていません', 'error');
    return;
  }
  if (!message) {
    setStatus('⚠ メッセージを入力してください', true);
    log('メッセージが入力されていません', 'error');
    return;
  }

  // --- 実行準備 ---
  const finalMessage = mentionEveryone ? '@everyone ' + message : message;
  running = true;
  stopFlag = false;
  let count = 0;
  let totalErrors = 0;

  setStatus(`⚡ 実行中... (トークン: ${tokens.length} / チャンネル: ${channelIds.length})`);
  log(`🚀 開始: トークン${tokens.length}個, チャンネル${channelIds.length}個, 間隔${interval}秒, 上限${limit === 0 ? '無制限' : limit}回`, 'info');

  // --- メインループ ---
  try {
    while (!stopFlag) {
      // 上限チェック
      if (limit > 0 && count >= limit) {
        log(`上限（${limit}回）に達しました`, 'info');
        break;
      }

      // 全トークン × 全チャンネル で送信
      for (const token of tokens) {
        if (stopFlag) break;
        for (const channelId of channelIds) {
          if (stopFlag) break;

          // 上限チェック（内側でも）
          if (limit > 0 && count >= limit) break;

          let content = finalMessage;
          if (randomize) content = randomizeText(content);

          try {
            await sendMessage(token, channelId, content);
            count++;
            log(`✅ 送信成功 (${count}回目)`, 'success');
            setStatus(`⚡ 送信中... ${count}回送信完了`);
          } catch (error) {
            totalErrors++;
            log(`❌ 送信失敗 (${error.message})`, 'error');
            // 429（レート制限）の場合は少し待機
            if (error.message.includes('429')) {
              log('レート制限が発生しました。5秒待機します...', 'info');
              await new Promise(r => setTimeout(r, 5000));
            }
          }

          // 間隔待機（0の場合は待たない）
          if (interval > 0 && !stopFlag) {
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
          }
        }
      }
    }
  } catch (error) {
    setStatus('❌ 重大なエラーが発生しました', true);
    log(`予期せぬエラー: ${error.message}`, 'error');
  } finally {
    running = false;
    const statusMsg = `⏹ 停止: ${count}回送信成功 / ${totalErrors}回エラー`;
    setStatus(statusMsg);
    log(statusMsg, 'info');
  }
});

// --- 停止ボタン ---
document.getElementById('stopBtn').addEventListener('click', () => {
  if (running) {
    stopFlag = true;
    setStatus('⛔ 停止リクエストを送信しました');
    log('停止リクエストを受信しました。処理を中断します...', 'info');
  } else {
    setStatus('⚠ 実行中ではありません', true);
    log('停止ボタンが押されましたが、実行中ではありません', 'error');
  }
});

// --- 初期ステータス ---
setStatus('⚠ トークンとサーバーIDを入力してください');
log('SSPC Web Tools がロードされました', 'info');
log('⚠ このツールはDiscordの利用規約に違反します。自己責任で使用してください', 'error');