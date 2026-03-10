const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const OWNER_NUMBER = '213557740724@s.whatsapp.net';
const OWNER_NAME = 'Yuki';

async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState('auth_info');

const sock = makeWASocket({  
    auth: state,  
    browser: ['Yuki Bot', 'Chrome', '1.0']  
});  

// ========== دوال مساعدة ==========  
const isOwner = (jid) => jid === OWNER_NUMBER;  
  
const isAdmin = async (groupId, jid) => {  
    if (isOwner(jid)) return true;  
    try {  
        const groupMeta = await sock.groupMetadata(groupId);  
        const participant = groupMeta.participants.find(p => p.id === jid);  
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';  
    } catch {  
        return false;  
    }  
};  

const getGroupMembers = async (groupId) => {  
    const meta = await sock.groupMetadata(groupId);  
    return meta.participants.map(p => p.id);  
};  

const getSender = (msg) => msg.key.participant || msg.key.remoteJid;  

const reply = async (chatId, text, quoted) => {  
    await sock.sendMessage(chatId, { text }, quoted ? { quoted } : {});  
};  

// ========== معالجة الأوامر ==========  
const handleCommand = async (msg, text, chatId) => {  
    const sender = getSender(msg);  
    const isGroup = chatId.endsWith('@g.us');  
    const args = text.slice(1).trim().split(' ');  
    const command = args[0].toLowerCase();  
    const mention = args[1];  

    switch(command) {  
        case 'اوامر':  
            await reply(chatId,   
                `*📋 قائمة أوامر 𝒀𝒖𝒌𝒊 𝑩𝒐𝒕*\n\n` +  
                `*الأوامر العامة:*\n` +  
                `• *.مالك* - معلومات المالك\n` +  
                `• *.اوامر* - عرض هذه القائمة\n\n` +  
                `*أوامر المجموعات:*\n` +  
                `• *.منشن* - منشن جميع الأعضاء\n` +  
                `• *.مخفي* - منشن مخفي للجميع\n` +  
                `• *.طرد @رقم* - طرد عضو\n` +  
                `• *.ترقية @رقم* - ترقية عضو لمشرف\n` +  
                `• *.اعفاء @رقم* - إعفاء مشرف\n\n` +  
                `*الرد التلقائي:*\n` +  
                `• *كلمة* - يرد بنفس الكلمة\n\n` +  
                `*👑 المالك:* ${OWNER_NAME}`, msg);  
            break;  

        case 'مالك':  
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${OWNER_NAME}\nTEL;waid=${OWNER_NUMBER.split('@')[0]}:+${OWNER_NUMBER.split('@')[0]}\nEND:VCARD`;  
              
            await sock.sendMessage(chatId, {  
                contacts: {  
                    displayName: OWNER_NAME,  
                    contacts: [{ vcard }]  
                }  
            }, { quoted: msg });  
              
            await reply(chatId, `👑 *المالك:* ${OWNER_NAME}\n📱 *الرقم:* wa.me/${OWNER_NUMBER.split('@')[0]}`, msg);  
            break;  

        case 'منشن':  
            if (!isGroup) {  
                await reply(chatId, '❌ يعمل في المجموعات فقط', msg);  
                return;  
            }  
              
            if (!await isAdmin(chatId, sender)) {  
                await reply(chatId, '❌ يحتاج صلاحية مشرف', msg);  
                return;  
            }  

            const members = await getGroupMembers(chatId);  
            let mentionsText = '📢 *منشن للجميع*\n\n';  
              
            for (let i = 0; i < members.length; i++) {  
                mentionsText += `@${members[i].split('@')[0]} `;  
                if ((i + 1) % 5 === 0) mentionsText += '\n';  
            }  

            await sock.sendMessage(chatId, { text: mentionsText, mentions: members });  
            break;  

        case 'مخفي':  
            if (!isGroup) {  
                await reply(chatId, '❌ يعمل في المجموعات فقط', msg);  
                return;  
            }  

            if (!await isAdmin(chatId, sender)) {  
                await reply(chatId, '❌ يحتاج صلاحية مشرف', msg);  
                return;  
            }  

            const allMembers = await getGroupMembers(chatId);  
              
            await sock.sendMessage(chatId, {   
                text: '🔔',  
                mentions: allMembers   
            });  
              
            await reply(chatId, `✅ تم إرسال منشن مخفي لـ ${allMembers.length} عضو`, msg);  
            break;  

        case 'طرد':  
            if (!isGroup) {  
                await reply(chatId, '❌ يعمل في المجموعات فقط', msg);  
                return;  
            }  

            if (!await isAdmin(chatId, sender)) {  
                await reply(chatId, '❌ يحتاج صلاحية مشرف', msg);  
                return;  
            }  

            if (!mention) {  
                await reply(chatId, '❌ استخدام: .طرد @رقم', msg);  
                return;  
            }  

            const kickJid = mention.replace('@', '') + '@s.whatsapp.net';  

            if (isOwner(kickJid)) {  
                await reply(chatId, '❌ لا يمكن طرد المالك', msg);  
                return;  
            }  

            try {  
                await sock.groupParticipantsUpdate(chatId, [kickJid], 'remove');  
                await reply(chatId, `🚫 تم طرد @${kickJid.split('@')[0]}`, msg);  
            } catch {  
                await reply(chatId, '❌ فشل في الطرد', msg);  
            }  
            break;  

        case 'ترقية':  
            if (!isGroup) {  
                await reply(chatId, '❌ يعمل في المجموعات فقط', msg);  
                return;  
            }  

            if (!await isAdmin(chatId, sender)) {  
                await reply(chatId, '❌ يحتاج صلاحية مشرف', msg);  
                return;  
            }  

            if (!mention) {  
                await reply(chatId, '❌ استخدام: .ترقية @رقم', msg);  
                return;  
            }  

            const promoteJid = mention.replace('@', '') + '@s.whatsapp.net';  

            try {  
                await sock.groupParticipantsUpdate(chatId, [promoteJid], 'promote');  
                await reply(chatId, `⬆️ تم ترقية @${promoteJid.split('@')[0]} إلى مشرف`, msg);  
            } catch {  
                await reply(chatId, '❌ فشل في الترقية', msg);  
            }  
            break;  

        case 'اعفاء':  
            if (!isGroup) {  
                await reply(chatId, '❌ يعمل في المجموعات فقط', msg);  
                return;  
            }  

            if (!await isAdmin(chatId, sender)) {  
                await reply(chatId, '❌ يحتاج صلاحية مشرف', msg);  
                return;  
            }  

            if (!mention) {  
                await reply(chatId, '❌ استخدام: .اعفاء @رقم', msg);  
                return;  
            }  

            const demoteJid = mention.replace('@', '') + '@s.whatsapp.net';  

            if (isOwner(demoteJid)) {  
                await reply(chatId, '❌ لا يمكن إعفاء المالك', msg);  
                return;  
            }  

            try {  
                await sock.groupParticipantsUpdate(chatId, [demoteJid], 'demote');  
                await reply(chatId, `⬇️ تم إعفاء @${demoteJid.split('@')[0]} من الإشراف`, msg);  
            } catch {  
                await reply(chatId, '❌ فشل في الإعفاء', msg);  
            }  
            break;  

        default:  
            await reply(chatId, '❌ أمر غير معروف. اكتب *.اوامر* لعرض القائمة', msg);  
            break;  
    }  
};  

// ========== معالجة الأحداث ==========  
sock.ev.on('connection.update', (update) => {  
    const { connection, lastDisconnect, qr } = update;  
      
    if (qr) {  
        console.log('\n==================');  
        console.log('امسح QR Code:');  
        console.log('==================\n');  
        qrcode.generate(qr, { small: true });  
    }  
      
    if (connection === 'close') {  
        const statusCode = lastDisconnect?.error?.output?.statusCode;  
        console.log('⚠️ Connection closed:', statusCode);  
          
        if (statusCode !== DisconnectReason.loggedOut) {  
            console.log('🔄 إعادة الاتصال...');  
            setTimeout(startBot, 5000);  
        } else {  
            console.log('❌ تم تسجيل الخروج. احذف auth_info وحاول مرة أخرى.');  
        }  
    } else if (connection === 'open') {  
        console.log('✅ Yuki Bot شغال 100%!');  
        console.log(`👑 المالك: ${OWNER_NAME}`);  
    }  
});  

sock.ev.on('creds.update', saveCreds);  

sock.ev.on('messages.upsert', async (m) => {  
    const msg = m.messages[0];  
    if (!msg.message || msg.key.fromMe) return;  

    const messageText = msg.message.conversation ||   
                       msg.message.extendedTextMessage?.text ||   
                       msg.message.imageMessage?.caption ||  
                       msg.message.videoMessage?.caption;  

    if (!messageText) return;  

    const chatId = msg.key.remoteJid;  

    if (messageText.startsWith('.')) {  
        await handleCommand(msg, messageText, chatId);  
        return;  
    }  

    const match = messageText.match(/\*(.*?)\*/);  
    if (match) {  
        try {  
            await sock.sendMessage(chatId, { text: match[1] });  
        } catch (err) {  
            console.error('خطأ في الرد:', err);  
        }  
    }  
});

}

startBot().catch(err => {
console.error('❌ خطأ:', err);
process.exit(1);
});
