let dmPollInterval = null;
let currentUsers = [];
let conversations = [];
let selectedUserId = null;
let unreadTotal = 0;

function startChatPolling() {
    stopChatPolling();
    dmPollInterval = setInterval(pollDM, 3000);
}

function stopChatPolling() {
    if (dmPollInterval) { clearInterval(dmPollInterval); dmPollInterval = null; }
}

async function chatPageOpened() {
    startChatPolling();
    await loadConversationsAndUsers();
    if (selectedUserId) {
        loadDMConversation(selectedUserId);
    }
    updateChatHeight();
}

function updateChatHeight() {
    var container = document.getElementById('chat-container');
    if (!container) return;
    var page = document.getElementById('page-livechat');
    if (!page || !page.classList.contains('active')) return;
    var mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    var paddingBottom = parseFloat(getComputedStyle(mainContent).paddingBottom) || 0;
    var header = page.querySelector('.page-header');
    var headerHeight = header ? header.offsetHeight + 24 : 0;
    var announcements = document.querySelector('.announcements-bar:not(.hidden)');
    var annHeight = announcements ? announcements.offsetHeight : 0;
    var pageTop = page.getBoundingClientRect().top;
    var available = window.innerHeight - pageTop - paddingBottom - headerHeight - annHeight;
    if (available > 200) {
        container.style.height = available + 'px';
    }
}

async function loadConversationsAndUsers() {
    try {
        var data = await apiRequest('/direct-messages');
        conversations = data.conversations || [];
        currentUsers = data.all_users || [];
        renderUserList(currentUsers);
        updateUnreadBadge();
    } catch (e) {}
}

async function pollDM() {
    try {
        var data = await apiRequest('/direct-messages');
        var newConvs = data.conversations || [];
        var oldUnread = unreadTotal;
        unreadTotal = 0;
        for (var i = 0; i < newConvs.length; i++) {
            unreadTotal += parseInt(newConvs[i].unread || 0);
        }
        if (unreadTotal > oldUnread) {
            var newest = newConvs.reduce(function(a, b) { return a.last_time > b.last_time ? a : b; });
            showToast('New message from ' + (newest.other_name || 'someone'), '');
        }
        conversations = newConvs;
        currentUsers = data.all_users || currentUsers;
        renderUserList(currentUsers);
        updateUnreadBadge();

        if (selectedUserId) {
            var conv = newConvs.find(function(c) { return c.other_id == selectedUserId; });
            if (conv && conv.unread > 0) {
                loadDMConversation(selectedUserId);
            }
        }
    } catch (e) {}
}

function updateUnreadBadge() {
    var link = document.querySelector('.side-link[data-page="livechat"]');
    if (!link) return;
    var badge = link.querySelector('.chat-nav-badge');
    if (unreadTotal > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'chat-nav-badge';
            link.appendChild(badge);
        }
        badge.textContent = unreadTotal > 99 ? '99+' : unreadTotal;
    } else {
        if (badge) badge.remove();
    }
}

function renderUserList(users) {
    var container = document.getElementById('chat-user-items');
    if (!container) return;
    var isVictim = currentUser && currentUser.role === 'victim';
    var filter = (document.getElementById('chat-user-filter')?.value || '').toLowerCase();
    var filtered = users.filter(function(u) {
        if (isVictim && u.role === 'victim') return false;
        return u.display_name.toLowerCase().indexOf(filter) !== -1 || u.role.indexOf(filter) !== -1;
    });
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding:12px;font-size:12px;">No users found.</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var u = filtered[i];
        var conv = conversations.find(function(c) { return c.other_id == u.id; });
        var isSelected = selectedUserId == u.id;
        var unread = conv ? parseInt(conv.unread || 0) : 0;
        var lastMsg = conv ? (conv.last_message || '') : '';
        var lastTime = conv ? conv.last_time : null;
        html += '<div class="chat-user-item' + (isSelected ? ' active' : '') + '" onclick="selectUser(' + u.id + ')">';
        html += '<div class="chat-user-avatar">' + getInitials(u.display_name) + '</div>';
        html += '<div class="chat-user-info">';
        html += '<div class="chat-user-name">' + escapeHtml(u.display_name) + ' <span class="chat-user-role-tag">' + u.role + '</span></div>';
        if (lastMsg) html += '<div class="chat-user-preview">' + escapeHtml(lastMsg.substring(0, 40)) + (lastMsg.length > 40 ? '...' : '') + '</div>';
        html += '</div>';
        if (unread > 0) html += '<span class="chat-user-unread">' + unread + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

async function selectUser(userId) {
    selectedUserId = userId;
    renderUserList(currentUsers);
    await loadDMConversation(userId);
    document.getElementById('chat-input-area').classList.remove('hidden');
    document.getElementById('chat-input').focus();
}

async function loadDMConversation(userId) {
    try {
        var data = await apiRequest('/direct-messages?user_id=' + userId);
        var messages = data.messages || [];
        var container = document.getElementById('chat-messages');
        container.innerHTML = '';
        var userRow = currentUsers.find(function(u) { return u.id == userId; }) || conversations.find(function(c) { return c.other_id == userId; });
        var name = userRow ? (userRow.display_name || userRow.other_name) : 'User';
        document.getElementById('chat-conversation-name').textContent = 'Chat with ' + name;
        if (messages.length === 0) {
            container.innerHTML = '<p class="empty-state">No messages yet. Say hello!</p>';
            return;
        }
        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isMine = msg.sender_id == currentUser.id;
            var div = document.createElement('div');
            div.className = 'dm-msg' + (isMine ? ' dm-msg-mine' : '');
            div.setAttribute('data-msg-id', msg.id);
            var sender = isMine ? 'You' : (msg.sender_name || 'User');
            var time = formatDate(msg.created_at);
            div.innerHTML = '<div class="dm-msg-header"><span class="dm-msg-sender">' + escapeHtml(sender) + '</span><span class="dm-msg-time">' + time + '</span></div><div class="dm-msg-content">' + escapeHtml(msg.content) + '</div>';
            container.appendChild(div);
        }
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        document.getElementById('chat-messages').innerHTML = '<p class="empty-state">Failed to load conversation.</p>';
    }
}

var chatResizeTimer = null;
function onChatResize() {
    if (chatResizeTimer) clearTimeout(chatResizeTimer);
    chatResizeTimer = setTimeout(updateChatHeight, 100);
}

if (typeof window !== 'undefined') {
    window.addEventListener('resize', onChatResize);
    document.addEventListener('transitionend', function(e) {
        if (e.target.classList && e.target.classList.contains('sidebar')) {
            updateChatHeight();
        }
    });
}

async function sendChatMessage() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    var content = input.value.trim();
    if (!content || !selectedUserId) return;
    input.value = '';
    input.style.height = 'auto';
    try {
        await apiRequest('/direct-messages', { method: 'POST', body: JSON.stringify({ recipient_id: selectedUserId, content: content }) });
        await loadConversationsAndUsers();
        await loadDMConversation(selectedUserId);
    } catch (err) {
        showToast('Failed to send: ' + err.message, 'error');
    }
}
