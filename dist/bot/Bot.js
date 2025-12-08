import TelegramBot, {} from "node-telegram-bot-api";
import { WGCore } from "../components/wgcore.js";
import { Admins } from "../components/Admins.js";
const scenesOn = {
    "home": function (bot, chatId) {
    }
};
export default class {
    bot;
    wgcore;
    admins;
    tokens = {};
    state = {};
    constructor(TOKEN) {
        this.wgcore = new WGCore();
        this.admins = new Admins();
        this.bot = new TelegramBot(TOKEN, {
            polling: {
                interval: 300,
                autoStart: true
            }
        });
        this.bot.on("polling_error", err => console.error(err));
        this.bot.on("text", async (msg) => {
            if (!this.admins.check(msg.chat.id)) {
                this.bot.sendMessage(msg.chat.id, "У вас нет прав на использование бота.");
                return;
            }
            if (msg.text?.startsWith('/start')) {
                this.enterScene(msg.chat.id, "home");
                console.log(msg.text);
                if (msg.text.split(' ').length == 2) {
                    const str = msg.text.split(' ')[1] || "";
                    const token = str.split("_")[0] || "";
                    const ownerId = Number(str.split("_")[1]) || 1;
                    if (this.tokens[token]) {
                        this.admins.create(msg.from?.id || 1, msg.from?.username || "");
                        this.bot.sendMessage(ownerId, `Пользователь ${msg.from?.username} назначен администратором.`);
                        delete this.tokens[token];
                    }
                }
            }
            else if (this.state[String(msg.chat.id)]) {
                const state = this.state[String(msg.chat.id)];
                if (/get_param.*/.test(state.scene)) {
                    const sceneName = state.scene.split("?")[0];
                    const sceneParamsString = state.scene.split("?")[1] || "";
                    const sceneParamsStringArray = sceneParamsString?.split("&");
                    let sceneParams = {};
                    sceneParamsStringArray?.forEach((paramString) => {
                        const paramName = paramString.split('=')[0] || "bag";
                        const paramValue = paramString.split('=')[1];
                        sceneParams[paramName] = paramValue;
                    });
                    Object.keys(sceneParams).forEach(paramName => {
                        if (sceneParams[paramName] === "get") {
                            this.enterScene(msg.chat.id, `${state?.scene.replace("get_param", sceneParams.scene)}&${paramName}=${msg.text}`);
                        }
                    });
                }
                else {
                    this.enterScene(msg.chat.id, state.scene);
                }
            }
            else {
                this.enterScene(msg.chat.id, "home");
            }
        });
        this.bot.on('callback_query', async (ctx) => {
            try {
                if (ctx.data) {
                    const command = ctx.data?.split(":");
                    const chatId = ctx.message?.chat.id || 1;
                    if (command[0] == "ENTER") {
                        this.enterScene(chatId, command[1]);
                        this.bot.answerCallbackQuery(ctx.id);
                    }
                }
            }
            catch (error) {
                console.log(error);
            }
        });
        console.log("Bot started.");
    }
    async enterScene(chatId, sceneString) {
        // console.log(sceneString)
        const sceneName = sceneString.split("?")[0];
        const sceneParamsString = sceneString.split("?")[1] || "";
        const sceneParamsStringArray = sceneParamsString?.split("&");
        let sceneParams = {};
        sceneParamsStringArray?.forEach(paramString => {
            const paramName = paramString.split('=')[0] || "bag";
            const paramValue = paramString.split('=')[1];
            sceneParams[paramName] = paramValue;
        });
        if (!this.state[String(chatId)]) {
            this.state[String(chatId)] = { scene: sceneString };
        }
        else {
            this.state[String(chatId)].scene = sceneString;
        }
        switch (sceneName) {
            case "home":
                await this.bot.sendMessage(chatId, "Выберите действие:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Пользователи', callback_data: 'ENTER:clients' }],
                            [{ text: 'Администраторы', callback_data: 'ENTER:admins' }]
                        ]
                    }
                });
                break;
            case "clients":
                await this.bot.sendMessage(chatId, "Выберите действие:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Список пользователей', callback_data: 'ENTER:get_clients' }],
                            [{ text: 'Создать пользователя', callback_data: 'ENTER:create_client' }],
                            [{ text: 'Назад', callback_data: 'ENTER:home' }]
                        ]
                    }
                });
                break;
            case "create_client":
                if (!sceneParams.name) {
                    this.enterScene(chatId, "get_param?name=get&msg=Введите имя пользователя:&scene=create_client");
                }
                else if (!sceneParams.lifetime) {
                    await this.bot.sendMessage(chatId, "Выберите время жизни пользователя:", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '1 День', callback_data: `ENTER:create_client?name=${sceneParams.name}&lifetime=86400000` }],
                                [{ text: '7 Дней', callback_data: `ENTER:create_client?name=${sceneParams.name}&lifetime=604800000` }],
                                [{ text: '30 Дней', callback_data: `ENTER:create_client?name=${sceneParams.name}&lifetime=2592000000` }],
                                [{ text: '1 Год', callback_data: `ENTER:create_client?name=${sceneParams.name}&lifetime=31536000000` }],
                                [{ text: 'Вечно', callback_data: `ENTER:create_client?name=${sceneParams.name}&lifetime=315360000000` }]
                            ]
                        }
                    });
                }
                else {
                    const newPeer = this.wgcore.createPeer(sceneParams.name, sceneParams.lifetime);
                    const connectConfig = await this.wgcore.genPeerConnectConfig(newPeer);
                    this.bot.sendMessage(chatId, `Пользователь ${sceneParams.name} создан.`);
                    await this.bot.sendPhoto(chatId, connectConfig.pathQRFile);
                    await this.bot.sendDocument(chatId, connectConfig.pathConfFile);
                    this.enterScene(chatId, "clients");
                }
                break;
            case "get_clients":
                const clients = this.wgcore.getPeers();
                let keyboard = [];
                Object.keys(clients).forEach((clientId) => {
                    keyboard.push([{ text: clients[clientId].name, callback_data: "ENTER:client_info?clientId=" + clientId }]);
                });
                if (keyboard.length == 0) {
                    keyboard.push([{ text: "Пользователей не найдено", callback_data: "pass" }]);
                }
                await this.bot.sendMessage(chatId, "Выберите пользователя:", {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboard,
                            [{ text: 'Назад', callback_data: 'ENTER:clients' }]
                        ]
                    }
                });
                break;
            case "admins":
                await this.bot.sendMessage(chatId, "Выберите действие:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Список администраторов', callback_data: 'ENTER:get_admins' }],
                            [{ text: 'Создать администратора', callback_data: 'ENTER:create_admin' }],
                            [{ text: 'Назад', callback_data: 'ENTER:home' }]
                        ]
                    }
                });
                break;
            case "get_admins":
                const admins = this.admins.getAdminsJSON();
                let keyboard1 = [];
                admins.forEach(admin => {
                    keyboard1.push([{ text: admin.nickname, callback_data: "ENTER:admin_info?adminId=" + admin.id }]);
                });
                await this.bot.sendMessage(chatId, "Выберите администратора:", {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboard1,
                            [{ text: 'Назад', callback_data: 'ENTER:admins' }]
                        ]
                    }
                });
                break;
            case "admin_info":
                if (sceneParams.adminId === 716371215) {
                    await this.bot.sendMessage(chatId, "Вы не можете взаимодействовать ROOT.");
                    this.enterScene(chatId, "get_admins");
                }
                else {
                    const adminInfo = this.admins.getAdmin(sceneParams.adminId);
                    await this.bot.sendMessage(chatId, `Администратор ${adminInfo.nickname}`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Удалить', callback_data: 'ENTER:remove_admin?adminId=' + adminInfo.id }],
                                [{ text: 'Назад', callback_data: 'ENTER:get_admins' }]
                            ]
                        }
                    });
                }
                break;
            case "remove_admin":
                {
                    console.log(sceneParams.adminId);
                    if (sceneParams.access === "true") {
                        const adminInfo = this.admins.getAdmin(sceneParams.adminId);
                        this.admins.removeAdmin(sceneParams.adminId);
                        await this.bot.sendMessage(chatId, `Администратор ${adminInfo.nickname} удален.`);
                        this.enterScene(chatId, "get_admins");
                    }
                    else if (sceneParams.access === "false") {
                        this.enterScene(chatId, "get_admins");
                    }
                    else {
                        const adminInfo = this.admins.getAdmin(sceneParams.adminId);
                        this.enterScene(chatId, `y_n?scene=remove_admin&adminId=${adminInfo.id}&msg=Вы уверены что хотите удалить администратора ${adminInfo.nickname}?`);
                    }
                }
                break;
            case "create_admin":
                const me = await this.bot.getMe();
                const newToken = this.genNewToken();
                this.bot.sendMessage(chatId, `Перешлите пользователю эту одноразовую ссылку: https://t.me/${me.username}?start=${newToken}_${chatId}`);
                break;
            case "client_info":
                const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                let banOrUnbanButton;
                if (clientInfo.banned) {
                    banOrUnbanButton = { text: "Разблокировать", callback_data: "ENTER:unban_client?clientId=" + clientInfo.id };
                }
                else {
                    banOrUnbanButton = { text: "Заблокировать", callback_data: "ENTER:ban_client?clientId=" + clientInfo.id };
                }
                await this.bot.sendMessage(chatId, `Пользователь: ${clientInfo.name}\n\
                    \nIP:${clientInfo.AllowedIPs.split(",")[0]}\
                    \nЗаблокирован: ${this.getBoolToString(clientInfo.banned)}\
                    \nВремя жизни: до ${this.getDateString(clientInfo.lifetime)}\
                    \nАктивен: ${this.getBoolToString(this.checkLifetime(clientInfo.lifetime))}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Изменить', callback_data: 'ENTER:change_client?clientId=' + clientInfo.id }],
                            [banOrUnbanButton],
                            [{ text: 'Удалить', callback_data: 'ENTER:remove_client?clientId=' + clientInfo.id }],
                            [{ text: 'Назад', callback_data: 'ENTER:clients' }]
                        ]
                    }
                });
                break;
            case "change_client":
                this.bot.sendMessage(chatId, "Выберите то, что хотите изменить:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Имя пользователя', callback_data: 'ENTER:change_client_name?clientId=' + sceneParams.clientId }],
                            [{ text: 'Время жизни', callback_data: 'ENTER:change_client_lifetime?clientId=' + sceneParams.clientId }],
                            [{ text: 'Назад', callback_data: 'ENTER:client_info?clientId=' + sceneParams.clientId }],
                        ]
                    }
                });
                break;
            case "change_client_name":
                const oldClient = this.wgcore.getPeer(sceneParams.clientId);
                if (!sceneParams.name) {
                    this.enterScene(chatId, "get_param?name=get&msg=Введите имя пользователя:&scene=change_client_name&" + sceneParamsString);
                }
                else {
                    this.wgcore.updatePeer(sceneParams.clientId, { name: sceneParams.name });
                    await this.bot.sendMessage(chatId, `Имя пользователя ${oldClient.name} изменено на ${sceneParams.name}`);
                    this.enterScene(chatId, "client_info?clientId=" + sceneParams.clientId);
                }
                break;
            case "change_client_lifetime":
                if (!sceneParams.lifetime) {
                    await this.bot.sendMessage(chatId, "Выберите время на которое продлить время жизни пользователя:", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '1 День', callback_data: `ENTER:change_client_lifetime?clientId=${sceneParams.clientId}&lifetime=86400000` }],
                                [{ text: '7 Дней', callback_data: `ENTER:change_client_lifetime?clientId=${sceneParams.clientId}&lifetime=604800000` }],
                                [{ text: '30 Дней', callback_data: `ENTER:change_client_lifetime?clientId=${sceneParams.clientId}&lifetime=2592000000` }],
                                [{ text: '1 Год', callback_data: `ENTER:change_client_lifetime?clientId=${sceneParams.clientId}&lifetime=31536000000` }],
                                [{ text: 'Вечно', callback_data: `ENTER:change_client_lifetime?clientId=${sceneParams.clientId}&lifetime=315360000000` }],
                                [{ text: 'Назад', callback_data: 'ENTER:client_info?clientId=' + sceneParams.clientId }],
                            ]
                        }
                    });
                }
                else {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    const newLifetime = clientInfo.lifetime + Number(sceneParams.lifetime);
                    this.wgcore.updatePeer(clientInfo.id, { lifetime: newLifetime });
                    await this.bot.sendMessage(chatId, `Время жизни пользователя ${clientInfo.name} изменено`);
                    this.enterScene(chatId, "client_info?clientId=" + sceneParams.clientId);
                }
                break;
            case "get_param":
                await this.bot.sendMessage(chatId, sceneParams.msg);
                break;
            case "remove_client":
                if (sceneParams.access === "true") {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.wgcore.removePeer(clientInfo.id);
                    await this.bot.sendMessage(chatId, `Пользователь ${clientInfo.name} удален.`);
                    this.enterScene(chatId, "clients");
                }
                else if (sceneParams.access === "false") {
                    this.enterScene(chatId, 'client_info?clientId=' + sceneParams.clientId);
                }
                else {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.enterScene(chatId, `y_n?scene=remove_client&clientId=${clientInfo.id}&msg=Вы уверены что хотите удалить пользователя ${clientInfo.name}?`);
                }
                break;
            case "ban_client":
                if (sceneParams.access === "true") {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.wgcore.updatePeer(clientInfo.id, { banned: true });
                    await this.bot.sendMessage(chatId, `Пользователь ${clientInfo.name} заблокирован.`);
                    this.enterScene(chatId, 'client_info?clientId=' + sceneParams.clientId);
                }
                else if (sceneParams.access === "false") {
                    this.enterScene(chatId, 'client_info?clientId=' + sceneParams.clientId);
                }
                else {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.enterScene(chatId, `y_n?scene=ban_client&clientId=${clientInfo.id}&msg=Вы уверены что хотите заблокировать пользователя ${clientInfo.name}?`);
                }
                break;
            case "unban_client":
                if (sceneParams.access === "true") {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.wgcore.updatePeer(clientInfo.id, { banned: false });
                    await this.bot.sendMessage(chatId, `Пользователь ${clientInfo.name} разблокирован.`);
                    this.enterScene(chatId, 'client_info?clientId=' + sceneParams.clientId);
                }
                else if (sceneParams.access === "false") {
                    this.enterScene(chatId, 'client_info?clientId=' + sceneParams.clientId);
                }
                else {
                    const clientInfo = this.wgcore.getPeer(sceneParams.clientId);
                    this.enterScene(chatId, `y_n?scene=unban_client&clientId=${clientInfo.id}&msg=Вы уверены что хотите разблокировать пользователя ${clientInfo.name}?`);
                }
                break;
            case "y_n":
                await this.bot.sendMessage(chatId, sceneParams.msg, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Да', callback_data: `ENTER:${sceneParams.scene}?access=true&clientId=${sceneParams.clientId || "1"}&adminId=${sceneParams.adminId || "1"}` },
                                { text: 'Нет', callback_data: `ENTER:${sceneParams.scene}?access=false&clientId=${sceneParams.clientId || "1"}&adminId=${sceneParams.adminId || "1"}` }],
                        ]
                    }
                });
        }
    }
    checkLifetime(lifetime) {
        if (Date.now() > lifetime)
            return false;
        return true;
    }
    getDateString(dateInt) {
        const date = new Date(dateInt);
        return `${date.getDate() || "1"}.${date.getMonth() || "1"}.${date.getFullYear()}`;
    }
    getBoolToString(bool) {
        if (bool)
            return "Да";
        return "Нет";
    }
    genNewToken() {
        const token = crypto.randomUUID();
        this.tokens[token] = 1;
        return token;
    }
}
//# sourceMappingURL=Bot.js.map